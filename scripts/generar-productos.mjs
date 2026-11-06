import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

// Solo se ejecuta para preparar los datos. La tienda no consulta servicios externos.
const base = new URL('../', import.meta.url);
const ruta = (nombre) => new URL(nombre, base);
const existentes = JSON.parse(await readFile(ruta('productos.json')));
if (existentes.some((producto) => producto.imagen.startsWith('img/cartas/'))) {
    throw new Error('Este generador histórico produce ilustraciones. Para conservar las cartas TCG, usa scripts/importar-cartas.mjs. No se modificó ningún archivo.');
}
const headers = { 'User-Agent': 'catalogo-pokemon-universitario', Accept: 'application/vnd.github+json' };
async function descargar(url) {
    const respuesta = await fetch(url, { headers, signal: AbortSignal.timeout(30000) });
    if (!respuesta.ok) throw new Error(`${respuesta.status}: ${url}`);
    return Buffer.from(await respuesta.arrayBuffer());
}
async function commit(repo) {
    return JSON.parse(await descargar(`https://api.github.com/repos/PokeAPI/${repo}/commits/master`)).sha;
}
function csv(texto) {
    const filas = texto.trim().split(/\r?\n/);
    const campos = filas.shift().split(',');
    return filas.map((fila) => Object.fromEntries(fila.split(',').map((valor, i) => [campos[i], valor])));
}
const [revisionDatos, revisionImagenes] = await Promise.all([commit('pokeapi'), commit('sprites')]);
const archivos = ['pokemon.csv', 'pokemon_species_names.csv', 'pokemon_types.csv', 'type_names.csv'];
const tablas = {};
const fuentes = [];
await mkdir(ruta('datos/pokeapi/'), { recursive: true });
await mkdir(ruta('imagenes/pokemon/'), { recursive: true });
for (const archivo of archivos) {
    const url = `https://raw.githubusercontent.com/PokeAPI/pokeapi/${revisionDatos}/data/v2/csv/${archivo}`;
    const contenido = await descargar(url);
    await writeFile(ruta(`datos/pokeapi/${archivo}`), contenido);
    tablas[archivo] = csv(contenido.toString('utf8'));
    fuentes.push({ archivo, url, sha256: createHash('sha256').update(contenido).digest('hex') });
}
const nombres = new Map(tablas['pokemon_species_names.csv']
    .filter((fila) => fila.local_language_id === '7').map((fila) => [Number(fila.pokemon_species_id), fila.name]));
const tipos = new Map(tablas['type_names.csv']
    .filter((fila) => fila.local_language_id === '7').map((fila) => [fila.type_id, fila.name]));
const originales = {
    25: { precio: 100, imagen: 'SV8PT5_PIkachu_28.png' },
    65: { precio: 35, imagen: 'SV3pt5_ES_65 alcazan.png' },
    133: { precio: 50, imagen: 'SV8pt5_ES_75 eve.png' }
};
const productos = tablas['pokemon.csv'].filter((fila) => Number(fila.id) >= 1 && Number(fila.id) <= 150)
    .map((fila) => {
        const id = Number(fila.id);
        const tiposPokemon = tablas['pokemon_types.csv'].filter((tipo) => Number(tipo.pokemon_id) === id)
            .sort((a, b) => Number(a.slot) - Number(b.slot)).map((tipo) => tipos.get(tipo.type_id));
        assert.ok(nombres.get(id) && tiposPokemon.length && tiposPokemon.every(Boolean));
        return {
            id, nombre: nombres.get(id), categoria: tiposPokemon[0], tipos: tiposPokemon,
            precio: originales[id]?.precio ?? 10 + (id * 7) % 91 + 0.5,
            stock: id % 13 === 0 ? 0 : 3 + id % 6,
            imagen: originales[id]?.imagen ?? `imagenes/pokemon/${String(id).padStart(3, '0')}.png`,
            datos_demo: true
        };
    });
assert.equal(productos.length, 150);
assert.deepEqual(productos.map((p) => p.id), Array.from({ length: 150 }, (_, i) => i + 1));
const pendientes = productos.filter((p) => !originales[p.id]);
const imagenes = [];
let siguiente = 0;
async function descargarImagenes() {
    while (siguiente < pendientes.length) {
        const producto = pendientes[siguiente++];
        const url = `https://raw.githubusercontent.com/PokeAPI/sprites/${revisionImagenes}/sprites/pokemon/other/official-artwork/${producto.id}.png`;
        const bytes = await descargar(url);
        assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
        await writeFile(ruta(producto.imagen), bytes);
        imagenes.push({ id: producto.id, archivo: producto.imagen, url, sha256: createHash('sha256').update(bytes).digest('hex') });
        if (imagenes.length % 25 === 0) console.log(`Imágenes descargadas: ${imagenes.length}/${pendientes.length}`);
    }
}
await Promise.all(Array.from({ length: 6 }, descargarImagenes));
for (const producto of productos.filter((p) => originales[p.id])) {
    const bytes = await readFile(ruta(producto.imagen));
    imagenes.push({ id: producto.id, archivo: producto.imagen, origen: 'Imagen existente en origin/main', sha256: createHash('sha256').update(bytes).digest('hex') });
}
await writeFile(ruta('productos.json'), JSON.stringify(productos, null, 2) + '\n');
await writeFile(ruta('datos/pokeapi/fuente.json'), JSON.stringify({
    proveedor: 'PokéAPI', documentacion: 'https://pokeapi.co/docs/v2/',
    revisionDatos, revisionImagenes, idioma: 'es (local_language_id=7)',
    criterio: 'Pokédex nacional 1–150; tipos actuales, en orden de slot; categoria = tipo principal.',
    demostracion: 'Todos los precios y stocks son ficticios. Las ilustraciones no acreditan cartas ni inventario real.',
    fuentes, imagenes: imagenes.sort((a, b) => a.id - b.id)
}, null, 2) + '\n');
console.log(JSON.stringify({ productos: productos.length, categoriasPrincipales: new Set(productos.map((p) => p.categoria)).size, tipos: new Set(productos.flatMap((p) => p.tipos)).size, revisionDatos, revisionImagenes }));