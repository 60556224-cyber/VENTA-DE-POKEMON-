import { once } from 'node:events';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { crearServidor } from './servidor.mjs';
import { conChrome } from './chrome.mjs';
const base = new URL('../', import.meta.url);
const productos = JSON.parse(await readFile(new URL('productos.json', base)));
const manifiesto = JSON.parse(await readFile(new URL('datos/tcgdex/cartas.json', base)));
const servidor = crearServidor();
servidor.listen(0, '127.0.0.1');
await once(servidor, 'listening');
await mkdir(new URL('artifacts/', base), { recursive: true });
try {
    await conChrome(async (cdp) => {
        await cdp.enviar('Page.navigate', { url: `http://127.0.0.1:${servidor.address().port}/` });
        await cdp.esperar("document.querySelectorAll('#catalogo-items .item').length === 24");
        console.log('Catálogo cargado; comprobando las 150 imágenes.');
        const dimensiones = await cdp.evaluar(`(async () => {
            window.cartasRevision = await Promise.all(${JSON.stringify(productos)}.map(producto => new Promise((resolve, reject) => {
                const imagen = new Image(); const espera = setTimeout(() => reject(new Error('Imagen sin respuesta: ' + producto.imagen)), 10000); imagen.onload = () => { clearTimeout(espera); resolve({ producto, imagen }); }; imagen.onerror = () => reject(new Error(producto.imagen)); imagen.src = producto.imagen;
            })));
            return window.cartasRevision.map(({ producto, imagen }) => ({ id: producto.id, ancho: imagen.naturalWidth, alto: imagen.naturalHeight }));
        })()`);
        for (const dimension of dimensiones) {
            const carta = manifiesto.cartas.find((c) => c.pokemonId === dimension.id);
            assert.equal(dimension.ancho, carta.ancho);
            assert.equal(dimension.alto, carta.alto);
        }
        console.log('Las 150 imágenes se decodificaron correctamente.');
        await cdp.enviar('Emulation.setDeviceMetricsOverride', { width: 1280, height: 844, deviceScaleFactor: 1, mobile: false });
        for (let pagina = 0; pagina < 15; pagina++) {
            await cdp.evaluar(`(async () => {
                document.body.replaceChildren();
                const estilos = document.createElement('style');
                estilos.textContent = 'html, body { margin: 0; padding: 0; background: white; } .revision { display: grid; grid-template-columns: repeat(5, 245px); } .revision article { height: 377px; } .revision img { display: block; width: 245px; height: 337px; object-fit: contain; } .revision p { font: 14px Arial; margin: 4px 5px; color: black; }';
                document.head.append(estilos);
                const hoja = document.createElement('section'); hoja.className = 'revision';
                for (const { producto, imagen } of window.cartasRevision.slice(${pagina * 10}, ${pagina * 10 + 10})) {
                    const tarjeta = document.createElement('article');
                    const nombre = document.createElement('p'); nombre.textContent = '#' + String(producto.id).padStart(3, '0') + ' ' + producto.nombre;
                    const fuente = document.createElement('p'); fuente.textContent = producto.carta.id;
                    tarjeta.append(imagen, nombre, fuente); hoja.append(tarjeta);
                }
                document.body.append(hoja);
                // La captura CDP fuerza el renderizado, incluso fuera del área visible del escritorio.
                return true;
            })()`);
            const { data } = await cdp.enviar('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
            await writeFile(new URL(`artifacts/tcg-hoja-${pagina + 1}.png`, base), Buffer.from(data, 'base64'));
            console.log(`Hoja de contacto ${pagina + 1}/15 guardada.`);
        }
        await writeFile(new URL('artifacts/verificacion-tcg.json', base), JSON.stringify({ decodificadas: dimensiones.length, dimensiones, hojas: 15 }, null, 2) + '\n');
        console.log(`Chrome decodificó ${dimensiones.length} cartas con sus dimensiones verificadas; se generaron quince hojas de contacto.`);
    });
} finally {
    servidor.closeAllConnections();
    await new Promise((resolve) => servidor.close(resolve));
}
