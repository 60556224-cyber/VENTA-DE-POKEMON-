import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import { crearServidor } from './servidor.mjs';
import { conChrome } from './chrome.mjs';

const raiz = new URL('../', import.meta.url);
const ruta = (archivo) => new URL(archivo, raiz);
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const normalizar = (nombre) => nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ ex$/i, '').replace(/[’']/g, '').toLowerCase();
const originales = {
    25: { archivo: 'SV8PT5_PIkachu_28.png', cartaId: 'sv08.5-028' },
    65: { archivo: 'SV3pt5_ES_65 alcazan.png', cartaId: 'sv03.5-065' },
    133: { archivo: 'SV8pt5_ES_75 eve.png', cartaId: 'sv08.5-075' }
};
async function descargar(url) {
    let ultimoError;
    for (let intento = 0; intento < 3; intento++) {
        try {
            const respuesta = await fetch(url, { signal: AbortSignal.timeout(20000) });
            if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}: ${url}`);
            return Buffer.from(await respuesta.arrayBuffer());
        } catch (error) { ultimoError = error; }
    }
    throw ultimoError;
}
function dimensionesWebp(bytes) {
    assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
    assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
    if (bytes.toString('ascii', 12, 16) === 'VP8X') return { ancho: bytes.readUIntLE(24, 3) + 1, alto: bytes.readUIntLE(27, 3) + 1 };
    if (bytes.toString('ascii', 12, 16) === 'VP8 ') return { ancho: bytes.readUInt16LE(26) & 0x3fff, alto: bytes.readUInt16LE(28) & 0x3fff };
    throw new Error('Formato WebP inesperado');
}
const productos = JSON.parse(await readFile(ruta('productos.json')));
assert.equal(productos.length, 150);
await mkdir(ruta('img/cartas/'), { recursive: true });
await mkdir(ruta('datos/tcgdex/cartas/'), { recursive: true });
const cartas = [];
const pendientes = [];
let siguiente = 0;
async function importar() {
    while (siguiente < productos.length) {
        const producto = productos[siguiente++];
        const original = originales[producto.id];
        const cartaId = original?.cartaId ?? `sv03.5-${String(producto.id).padStart(3, '0')}`;
        const fuente = `https://api.tcgdex.net/v2/es/cards/${cartaId}`;
        try {
            const bytesMetadatos = await descargar(fuente);
            const carta = JSON.parse(bytesMetadatos);
            assert.equal(carta.id, cartaId);
            assert.deepEqual(carta.dexId, [producto.id], `Pokédex incorrecta: ${cartaId}`);
            assert.equal(normalizar(carta.name), normalizar(producto.nombre), `Nombre incorrecto: ${carta.name}`);
            assert.ok(['Pokemon', 'Pokémon'].includes(carta.category));
            assert.ok(carta.attacks?.length && carta.hp > 0 && carta.set?.id && carta.localId);
            assert.ok(carta.image?.startsWith('https://assets.tcgdex.net/es/'));
            const archivo = `img/cartas/${String(producto.id).padStart(3, '0')}.webp`;
            const urlImagen = `${carta.image}/low.webp`;
            const registro = {
                pokemonId: producto.id, nombrePokemon: producto.nombre, cartaId: carta.id,
                nombreCarta: carta.name, numeroCarta: carta.localId,
                conjunto: { id: carta.set.id, nombre: carta.set.name }, idioma: 'es',
                pokedex: carta.dexId, artista: carta.illustrator ?? null,
                fuente, urlImagen, archivo,
                metadatos: `datos/tcgdex/cartas/${cartaId}.json`, sha256Metadatos: hash(bytesMetadatos),
                origenImagen: original ? 'original-proyecto' : 'TCGdex'
            };
            await writeFile(ruta(registro.metadatos), bytesMetadatos);
            if (original) {
                const bytes = await readFile(ruta(original.archivo));
                registro.original = { archivo: original.archivo, sha256: hash(bytes) };
            } else {
                const bytes = await descargar(urlImagen);
                Object.assign(registro, dimensionesWebp(bytes), { bytes: bytes.length, sha256: hash(bytes), optimizacion: 'WebP low original de TCGdex; sin recorte ni alteración' });
                assert.ok(registro.ancho >= 240 && registro.alto >= 330 && registro.ancho / registro.alto > 0.69 && registro.ancho / registro.alto < 0.75);
                await writeFile(ruta(archivo), bytes);
            }
            cartas.push(registro);
            if (cartas.length % 25 === 0) console.log(`Cartas verificadas: ${cartas.length}/150`);
        } catch (error) {
            pendientes.push({ id: producto.id, nombre: producto.nombre, cartaId, motivo: error.message });
        }
    }
}
await Promise.all(Array.from({ length: 4 }, importar));
// Se comprime la carta original completa, manteniendo sus dimensiones y transparencia.
const servidor = crearServidor();
servidor.listen(0, '127.0.0.1');
await once(servidor, 'listening');
try {
    await conChrome(async (cdp) => {
        await cdp.enviar('Page.navigate', { url: `http://127.0.0.1:${servidor.address().port}/` });
        await cdp.esperar("document.readyState === 'complete'");
        for (const registro of cartas.filter((carta) => carta.original)) {
            const convertido = await cdp.evaluar(`(async () => {
                const respuesta = await fetch(${JSON.stringify(registro.original.archivo)});
                const imagen = await createImageBitmap(await respuesta.blob());
                const canvas = new OffscreenCanvas(imagen.width, imagen.height);
                canvas.getContext('2d').drawImage(imagen, 0, 0);
                const blob = await canvas.convertToBlob({ type: 'image/webp', quality: 0.92 });
                const bytes = new Uint8Array(await blob.arrayBuffer());
                let cadena = ''; for (const byte of bytes) cadena += String.fromCharCode(byte);
                return { base64: btoa(cadena), ancho: imagen.width, alto: imagen.height };
            })()`);
            const bytes = Buffer.from(convertido.base64, 'base64');
            Object.assign(registro, dimensionesWebp(bytes), { bytes: bytes.length, sha256: hash(bytes), optimizacion: 'PNG original completo a WebP calidad 0.92; mismas dimensiones, sin recorte' });
            assert.equal(registro.ancho, convertido.ancho);
            assert.equal(registro.alto, convertido.alto);
            await writeFile(ruta(registro.archivo), bytes);
        }
    });
} finally {
    servidor.closeAllConnections();
    await new Promise((resolve) => servidor.close(resolve));
}
cartas.sort((a, b) => a.pokemonId - b.pokemonId);
const manifiesto = {
    proveedor: 'TCGdex', documentacion: 'https://tcgdex.dev/assets',
    licenciaDatos: 'MIT; ver datos/tcgdex/LICENSE',
    derechosImagenes: 'Pokémon © Nintendo / Creatures Inc. / GAME FREAK inc. No se afirma que las ilustraciones estén bajo MIT.',
    uso: 'Demostración académica local; precios y existencias ficticios. Fuentes conservadas y sin recorte de las cartas.',
    criterio: 'Nombre coincidente y dexId exacto, categoría Pokémon, ataques y PS; colección 151 en español salvo Pikachu y Eevee originales de Evoluciones Prismáticas.',
    verificadas: cartas.length, pendientes, cartas
};
await writeFile(ruta('datos/tcgdex/cartas.json'), JSON.stringify(manifiesto, null, 2) + '\n');
await writeFile(ruta('datos/tcgdex/LICENSE'), await descargar('https://raw.githubusercontent.com/tcgdex/cards-database/master/LICENSE'));
if (pendientes.length) {
    console.error(JSON.stringify(pendientes, null, 2));
    throw new Error('Hay cartas pendientes. Se conserva productos.json sin sustituir por imágenes no verificadas.');
}
for (const producto of productos) {
    const carta = cartas.find((c) => c.pokemonId === producto.id);
    producto.imagen = carta.archivo;
    producto.carta = { id: carta.cartaId, nombre: carta.nombreCarta, conjunto: carta.conjunto.nombre, conjuntoId: carta.conjunto.id, idioma: carta.idioma, fuente: carta.fuente };
}
await writeFile(ruta('productos.json'), JSON.stringify(productos, null, 2) + '\n');
console.log(JSON.stringify({ verificadas: cartas.length, pendientes: pendientes.length, bytes: cartas.reduce((suma, carta) => suma + carta.bytes, 0) }));
