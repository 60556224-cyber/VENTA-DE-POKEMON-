import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, sep, join } from 'node:path';
import { crearServidor } from '../scripts/servidor.mjs';

const productos = JSON.parse(await readFile(new URL('../productos.json', import.meta.url)));
const chrome = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const artefactos = new URL('../artifacts/', import.meta.url);

class CDP {
    constructor(socket) {
        this.socket = socket;
        this.id = 0;
        this.pendientes = new Map();
        this.errores = [];
        this.solicitudes = [];
        socket.addEventListener('message', ({ data }) => {
            const mensaje = JSON.parse(data);
            if (mensaje.id) {
                const pendiente = this.pendientes.get(mensaje.id);
                if (!pendiente) return;
                clearTimeout(pendiente.timer);
                this.pendientes.delete(mensaje.id);
                mensaje.error ? pendiente.reject(new Error(JSON.stringify(mensaje.error))) : pendiente.resolve(mensaje.result);
            }
            if (mensaje.method === 'Runtime.exceptionThrown') this.errores.push(mensaje.params.exceptionDetails);
            if (mensaje.method === 'Network.requestWillBeSent') this.solicitudes.push(mensaje.params.request.url);
        });
    }
    enviar(method, params = {}, sessionId = this.sesion) {
        const id = ++this.id;
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => { this.pendientes.delete(id); reject(new Error(`Tiempo agotado: ${method}`)); }, 20000);
            this.pendientes.set(id, { resolve, reject, timer });
            this.socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
        });
    }
    async evaluar(expression) {
        const resultado = await this.enviar('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
        if (resultado.exceptionDetails) throw new Error(JSON.stringify(resultado.exceptionDetails));
        return resultado.result.value;
    }
    esperar(condicion) {
        return this.evaluar(`new Promise((resolve, reject) => { const inicio = Date.now(); const revisar = () => { if (${condicion}) return resolve(true); if (Date.now() - inicio > 12000) return reject(new Error('Condición no cumplida')); setTimeout(revisar, 25); }; revisar(); })`);
    }
}

test('Catálogo y carrito en Chrome real, con vista móvil', { timeout: 180000 }, async (t) => {
    const servidor = crearServidor();
    servidor.listen(0, '127.0.0.1');
    await once(servidor, 'listening');
    const url = `http://127.0.0.1:${servidor.address().port}`;
    const perfil = await mkdtemp(join(tmpdir(), 'catalogo-chrome-'));
    const proceso = spawn(chrome, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${perfil}`, 'about:blank'], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
    let cdp;
    try {
        const direccion = await new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error('Chrome no inició su protocolo de pruebas')), 20000);
            let salida = '';
            proceso.stderr.on('data', (trozo) => {
                salida += trozo;
                const coincidencia = salida.match(/DevTools listening on (ws:\/\/[^\s]+)/);
                if (coincidencia) { clearTimeout(timer); resolve(coincidencia[1]); }
            });
            proceso.once('error', (error) => { clearTimeout(timer); reject(error); });
            proceso.once('exit', (codigo) => { clearTimeout(timer); reject(new Error(`Chrome terminó: ${codigo}`)); });
        });
        const socket = new WebSocket(direccion);
        await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
        cdp = new CDP(socket);
        const { targetId } = await cdp.enviar('Target.createTarget', { url: 'about:blank' });
        cdp.sesion = (await cdp.enviar('Target.attachToTarget', { targetId, flatten: true })).sessionId;
        await cdp.enviar('Page.enable');
        await cdp.enviar('Runtime.enable');
        await cdp.enviar('Network.enable');
        await cdp.enviar('Page.navigate', { url });
        await cdp.esperar("document.querySelectorAll('#catalogo-items .item').length === 24 && document.querySelector('#catalogo-items').getAttribute('aria-busy') === 'false'");
        await cdp.evaluar('window.fetchOriginal = window.fetch');

        await t.test('Carga fetch, 24 tarjetas iniciales, 17 filtros y lazy loading', async () => {
            assert.equal(await cdp.evaluar("document.querySelectorAll('#categoria-pokemon option').length"), 18);
            assert.equal(await cdp.evaluar("document.querySelector('.titulo-item').textContent"), 'Carta de Bulbasaur');
            assert.ok(await cdp.evaluar("[...document.querySelectorAll('.img-item')].every(img => img.loading === 'lazy')"));
            assert.ok(await cdp.evaluar("document.querySelector('.aviso-demo').textContent.includes('ficticios')"));
        });
        await t.test('Búsqueda por nombre, mayúsculas, espacios y sin coincidencias', async () => {
            await cdp.evaluar("document.querySelector('#buscar-pokemon').value = '  PIKACHU  '; document.querySelector('#buscar-pokemon').dispatchEvent(new Event('input'))");
            assert.deepEqual(await cdp.evaluar("[...document.querySelectorAll('#catalogo-items .item')].map(p => Number(p.dataset.id))"), [25]);
            await cdp.evaluar("document.querySelector('#buscar-pokemon').value = 'pokemon-inexistente'; document.querySelector('#buscar-pokemon').dispatchEvent(new Event('input'))");
            assert.equal(await cdp.evaluar("document.querySelectorAll('#catalogo-items .item').length"), 0);
            assert.ok(await cdp.evaluar("document.querySelector('#estado-catalogo').textContent.includes('No encontramos')"));
            assert.equal(await cdp.evaluar("document.querySelector('#ver-mas').hidden"), true);
        });
        await t.test('Los 17 filtros incluyen tipos secundarios y se combinan con la búsqueda', async () => {
            await cdp.evaluar("document.querySelector('#buscar-pokemon').value = ''");
            for (const tipo of new Set(productos.flatMap((p) => p.tipos))) {
                await cdp.evaluar(`document.querySelector('#categoria-pokemon').value = ${JSON.stringify(tipo)}; document.querySelector('#categoria-pokemon').dispatchEvent(new Event('change'))`);
                const esperados = productos.filter((p) => p.tipos.includes(tipo));
                assert.deepEqual(await cdp.evaluar("[...document.querySelectorAll('#catalogo-items .item')].map(p => Number(p.dataset.id))"), esperados.slice(0, 24).map((p) => p.id));
            }
            await cdp.evaluar("document.querySelector('#categoria-pokemon').value = 'Acero'; document.querySelector('#categoria-pokemon').dispatchEvent(new Event('change'))");
            assert.deepEqual(await cdp.evaluar("[...document.querySelectorAll('#catalogo-items .item')].map(p => Number(p.dataset.id))"), [81, 82]);
            await cdp.evaluar("document.querySelector('#buscar-pokemon').value = 'magneton'; document.querySelector('#buscar-pokemon').dispatchEvent(new Event('input'))");
            assert.deepEqual(await cdp.evaluar("[...document.querySelectorAll('#catalogo-items .item')].map(p => Number(p.dataset.id))"), [82]);
        });
        await t.test('Ver más recorre 1–150 sin duplicados y se reinicia al filtrar', async () => {
            await cdp.evaluar("document.querySelector('#buscar-pokemon').value = ''; document.querySelector('#categoria-pokemon').value = ''; document.querySelector('#categoria-pokemon').dispatchEvent(new Event('change'))");
            for (const cantidad of [48, 72, 96, 120, 144, 150]) {
                await cdp.evaluar("document.querySelector('#ver-mas').click()");
                assert.equal(await cdp.evaluar("document.querySelectorAll('#catalogo-items .item').length"), cantidad);
            }
            assert.deepEqual(await cdp.evaluar("[...document.querySelectorAll('#catalogo-items .item')].map(p => Number(p.dataset.id))"), productos.map((p) => p.id));
            assert.equal(await cdp.evaluar("document.querySelector('#ver-mas').hidden"), true);
            await cdp.evaluar("document.querySelector('#buscar-pokemon').dispatchEvent(new Event('input'))");
            assert.equal(await cdp.evaluar("document.querySelectorAll('#catalogo-items .item').length"), 24);
        });
        await t.test('Las 150 imágenes se sirven por HTTP y Chrome las decodifica', async () => {
            const cantidad = await cdp.evaluar(`Promise.all(${JSON.stringify(productos.map((p) => p.imagen))}.map(src => new Promise((resolve, reject) => { const img = new Image(); img.onload = () => img.naturalWidth > 0 ? resolve(src) : reject(src); img.onerror = () => reject(new Error(src)); img.src = src; }))).then(imagenes => imagenes.length)`);
            assert.equal(cantidad, 150);
        });
        await t.test('Delegación: agregar después de paginar y filtrar, total y contador', async () => {
            await cdp.evaluar("document.querySelector('#ver-mas').click(); document.querySelector('button[data-agregar][data-id=\"25\"]').click()");
            assert.equal(await cdp.evaluar("document.querySelector('#contador').textContent"), '1');
            assert.equal(await cdp.evaluar("document.querySelector('#total').textContent"), '100.00$');
            await cdp.evaluar("document.querySelector('#buscar-pokemon').value = 'Pikachu'; document.querySelector('#buscar-pokemon').dispatchEvent(new Event('input')); document.querySelector('[data-agregar]').click()");
            assert.equal(await cdp.evaluar("document.querySelector('#total').textContent"), '200.00$');
            await cdp.evaluar("document.querySelector('#vaciar').click(); document.querySelector('#buscar-pokemon').value = ''; document.querySelector('#buscar-pokemon').dispatchEvent(new Event('input'))");
        });
        await t.test('Límite de stock en tarjetas y botón +, incluso tras volver a generar tarjetas', async () => {
            const stock = productos[0].stock;
            await cdp.evaluar("for (let i = 0; i < 20; i++) document.querySelector('button[data-agregar][data-id=\"1\"]').click()");
            assert.equal(await cdp.evaluar("document.querySelector('#contador').textContent"), String(stock));
            assert.equal(await cdp.evaluar("document.querySelector('button[data-agregar][data-id=\"1\"]').disabled"), true);
            await cdp.evaluar("const agregar = document.querySelector('button[data-agregar][data-id=\"1\"]'); agregar.disabled = false; agregar.click(); const mas = document.querySelector('[data-accion=\"aumentar\"]'); mas.disabled = false; mas.click()");
            assert.equal(await cdp.evaluar("document.querySelector('#contador').textContent"), String(stock));
            await cdp.evaluar("document.querySelector('#buscar-pokemon').dispatchEvent(new Event('input'))");
            assert.equal(await cdp.evaluar("document.querySelector('button[data-agregar][data-id=\"1\"]').disabled"), true);
            await cdp.evaluar("document.querySelector('[data-accion=\"disminuir\"]').click()");
            assert.equal(await cdp.evaluar("document.querySelector('#contador').textContent"), String(stock - 1));
            assert.equal(await cdp.evaluar("document.querySelector('button[data-agregar][data-id=\"1\"]').disabled"), false);
            await cdp.evaluar("document.querySelector('[data-accion=\"aumentar\"]').click()");
            assert.equal(await cdp.evaluar("document.querySelector('#contador').textContent"), String(stock));
        });
        await t.test('Stock cero, eliminar, disminuir a cero, vaciar y suma de productos', async () => {
            await cdp.evaluar("document.querySelector('#vaciar').click(); const sinStock = document.querySelector('button[data-agregar][data-id=\"13\"]'); sinStock.disabled = false; sinStock.click()");
            assert.equal(await cdp.evaluar("document.querySelector('#contador').textContent"), '0');
            await cdp.evaluar("document.querySelector('button[data-agregar][data-id=\"1\"]').click(); document.querySelector('[data-accion=\"disminuir\"]').click()");
            assert.equal(await cdp.evaluar("document.querySelectorAll('.carrito-item').length"), 0);
            await cdp.evaluar("document.querySelector('button[data-agregar][data-id=\"1\"]').click(); document.querySelector('button[data-agregar][data-id=\"2\"]').click()");
            assert.equal(await cdp.evaluar("document.querySelector('#total').textContent"), `${(productos[0].precio + productos[1].precio).toFixed(2)}$`);
            await cdp.evaluar("document.querySelector('[data-accion=\"eliminar\"][data-id=\"1\"]').click()");
            assert.equal(await cdp.evaluar("document.querySelector('#contador').textContent"), '1');
            await cdp.evaluar("document.querySelector('#vaciar').click()");
            assert.equal(await cdp.evaluar("document.querySelector('#total').textContent"), '0.00$');
        });
        await t.test('Abrir, cerrar y Escape conservan el funcionamiento del panel', async () => {
            await cdp.evaluar("document.querySelector('#btn-carrito').click()");
            assert.equal(await cdp.evaluar("document.querySelector('#carrito').getAttribute('aria-hidden')"), 'false');
            await cdp.enviar('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
            assert.equal(await cdp.evaluar("document.querySelector('#carrito').getAttribute('aria-hidden')"), 'true');
            await cdp.evaluar("document.querySelector('#btn-carrito').click(); document.querySelector('#cerrar-carrito').click()");
            assert.equal(await cdp.evaluar("document.querySelector('#btn-carrito').getAttribute('aria-expanded')"), 'false');
        });
        await t.test('Errores HTTP, JSON inválido, IDs duplicados y recuperación con Reintentar', async () => {
            const repetidos = structuredClone(productos);
            repetidos[1].id = repetidos[0].id;
            for (const [cuerpo, estado] of [['No disponible', 503], ['{json roto', 200], [JSON.stringify(repetidos), 200]]) {
                await cdp.evaluar(`window.fetch = async () => new Response(${JSON.stringify(cuerpo)}, { status: ${estado} }); cargarCatalogo()`);
                assert.equal(await cdp.evaluar("document.querySelector('#reintentar-catalogo').hidden"), false);
                assert.equal(await cdp.evaluar("document.querySelectorAll('#catalogo-items .item').length"), 0);
                assert.equal(await cdp.evaluar("document.querySelector('#buscar-pokemon').disabled"), true);
            }
            await cdp.evaluar("window.fetch = window.fetchOriginal; document.querySelector('#reintentar-catalogo').click()");
            await cdp.esperar("document.querySelectorAll('#catalogo-items .item').length === 24");
        });
        await t.test('Imagen fallida: mensaje y botón bloqueado', async () => {
            await cdp.evaluar("document.querySelector('.img-item').src = 'imagen-inexistente-prueba.png'");
            await cdp.esperar("document.querySelector('button[data-agregar]').dataset.imagenInvalida === 'true'");
            assert.equal(await cdp.evaluar("document.querySelector('button[data-agregar]').disabled"), true);
            await cdp.evaluar('cargarCatalogo()');
            await cdp.esperar("document.querySelectorAll('#catalogo-items .item').length === 24");
        });
        await t.test('Responsive: 320, 360, 390, 768 y 1280 px, sin desbordamiento horizontal', async () => {
            await mkdir(artefactos, { recursive: true });
            for (const [width, columnas] of [[320, 1], [360, 1], [390, 2], [768, 3], [1280, 4]]) {
                await cdp.enviar('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 1, mobile: width < 600 });
                await cdp.enviar('Emulation.setTouchEmulationEnabled', { enabled: width < 600 });
                await cdp.evaluar('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
                assert.ok(await cdp.evaluar('document.documentElement.scrollWidth <= window.innerWidth'), `Desbordamiento a ${width}px`);
                assert.equal(await cdp.evaluar("getComputedStyle(document.querySelector('#catalogo-items')).gridTemplateColumns.split(' ').length"), columnas);
                if (width === 390 || width === 1280) {
                    const { data } = await cdp.enviar('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
                    await writeFile(new URL(`catalogo-${width}.png`, artefactos), Buffer.from(data, 'base64'));
                }
                if (width === 390) {
                    const punto = await cdp.evaluar("(() => { const r = document.querySelector('#btn-carrito').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()");
                    await cdp.enviar('Input.dispatchMouseEvent', { type: 'mousePressed', ...punto, button: 'left', clickCount: 1 });
                    await cdp.enviar('Input.dispatchMouseEvent', { type: 'mouseReleased', ...punto, button: 'left', clickCount: 1 });
                    assert.equal(await cdp.evaluar("document.querySelector('#carrito').getAttribute('aria-hidden')"), 'false');
                    await cdp.evaluar("document.querySelector('#cerrar-carrito').click()");
                }
            }
        });
        await t.test('Sin excepciones JavaScript ni dependencias de red externas', () => {
            assert.deepEqual(cdp.errores, []);
            assert.deepEqual(cdp.solicitudes.filter((solicitud) => /^https?:/.test(solicitud) && !solicitud.startsWith(url + '/')), []);
        });
    } finally {
        if (cdp) { await cdp.enviar('Browser.close', {}, undefined).catch(() => {}); cdp.socket.close(); }
        if (proceso.exitCode === null) { const fin = once(proceso, 'exit'); proceso.kill(); await fin; }
        servidor.closeAllConnections();
        await new Promise((resolve) => servidor.close(resolve));
        // La eliminación solo puede afectar el perfil temporal creado por esta prueba.
        assert.ok(resolve(perfil).startsWith(resolve(tmpdir()) + sep) && perfil.split(sep).at(-1).startsWith('catalogo-chrome-'));
        await rm(perfil, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    }
});