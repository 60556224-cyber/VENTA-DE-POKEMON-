import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, sep, join } from 'node:path';
import assert from 'node:assert/strict';

export class CDP {
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
            const timer = setTimeout(() => { this.pendientes.delete(id); reject(new Error(`Tiempo agotado: ${method}`)); }, 30000);
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

// Se comparte entre pruebas e importación para no instalar un conversor de imágenes.
export async function conChrome(accion) {
    const perfil = await mkdtemp(join(tmpdir(), 'catalogo-chrome-'));
    const chrome = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
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
        await cdp.enviar('Page.bringToFront');
        await cdp.enviar('Runtime.enable');
        await cdp.enviar('Network.enable');
        return await accion(cdp);
    } finally {
        if (cdp) { await cdp.enviar('Browser.close').catch(() => {}); cdp.socket.close(); }
        if (proceso.exitCode === null) { const fin = once(proceso, 'exit'); proceso.kill(); await fin; }
        assert.ok(resolve(perfil).startsWith(resolve(tmpdir()) + sep) && perfil.split(sep).at(-1).startsWith('catalogo-chrome-'));
        await rm(perfil, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    }
}
