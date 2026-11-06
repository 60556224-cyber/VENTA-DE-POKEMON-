import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const base = new URL('../', import.meta.url);
const leer = (ruta) => readFile(new URL(ruta, base));
const productos = JSON.parse(await leer('productos.json'));
const fuente = JSON.parse(await leer('datos/pokeapi/fuente.json'));
function filasCSV(bytes) {
    const [cabecera, ...filas] = bytes.toString('utf8').trim().split(/\r?\n/);
    return filas.map((fila) => Object.fromEntries(cabecera.split(',').map((clave, i) => [clave, fila.split(',')[i]])));
}
const tablas = {};
for (const archivo of fuente.fuentes) tablas[archivo.archivo] = filasCSV(await leer(`datos/pokeapi/${archivo.archivo}`));

test('JSON: exactamente 150 IDs consecutivos, únicos, sin Mew', () => {
    assert.equal(productos.length, 150);
    assert.deepEqual(productos.map((p) => p.id).sort((a, b) => a - b), Array.from({ length: 150 }, (_, i) => i + 1));
    assert.equal(productos[0].nombre, 'Bulbasaur');
    assert.equal(productos.at(-1).nombre, 'Mewtwo');
    assert.ok(!productos.some((p) => p.nombre === 'Mew'));
    assert.equal(new Set(productos.map((p) => p.nombre)).size, 150);
});
test('Esquema: propiedades obligatorias, números válidos y datos marcados como ficticios', () => {
    for (const p of productos) {
        for (const clave of ['id', 'nombre', 'categoria', 'precio', 'stock', 'imagen']) assert.ok(Object.hasOwn(p, clave), `${p.id}: ${clave}`);
        assert.ok(Number.isFinite(p.precio) && p.precio > 0);
        assert.ok(Number.isInteger(p.stock) && p.stock >= 0);
        assert.equal(p.datos_demo, true);
        assert.ok(p.tipos.length >= 1 && p.tipos.length <= 2);
        assert.equal(p.categoria, p.tipos[0]);
    }
    assert.ok(new Set(productos.map((p) => p.categoria)).size >= 3);
});
test('Los 150 nombres y todos los tipos coinciden con la fuente oficial guardada', () => {
    for (const p of productos) {
        const pokemon = tablas['pokemon.csv'].find((fila) => Number(fila.id) === p.id);
        assert.equal(Number(pokemon.species_id), p.id);
        const especie = tablas['pokemon_species_names.csv'].find((fila) => Number(fila.pokemon_species_id) === p.id && fila.local_language_id === '7');
        assert.equal(p.nombre, especie.name);
        const tipos = tablas['pokemon_types.csv'].filter((fila) => Number(fila.pokemon_id) === p.id).sort((a, b) => Number(a.slot) - Number(b.slot))
            .map((tipo) => tablas['type_names.csv'].find((fila) => fila.type_id === tipo.type_id && fila.local_language_id === '7').name);
        assert.deepEqual(p.tipos, tipos, `Tipos incorrectos: ${p.nombre}`);
    }
    assert.deepEqual(productos.find((p) => p.id === 1).tipos, ['Planta', 'Veneno']);
    assert.deepEqual(productos.find((p) => p.id === 81).tipos, ['Eléctrico', 'Acero']);
    assert.deepEqual(productos.find((p) => p.id === 35).tipos, ['Hada']);
});
test('Fuentes e imágenes locales: SHA-256, firma PNG y dimensiones válidas en los 150 archivos', async () => {
    for (const origen of [...fuente.fuentes.map((f) => ({ ...f, archivo: `datos/pokeapi/${f.archivo}` })), ...fuente.imagenes]) {
        const bytes = await leer(origen.archivo);
        assert.equal(createHash('sha256').update(bytes).digest('hex'), origen.sha256, origen.archivo);
    }
    assert.equal(fuente.imagenes.length, 150);
    for (const p of productos) {
        assert.ok(!p.imagen.includes('..') && !p.imagen.includes('://'));
        const bytes = await leer(p.imagen);
        assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', p.imagen);
        assert.ok(bytes.readUInt32BE(16) > 0 && bytes.readUInt32BE(20) > 0);
        assert.equal(fuente.imagenes.find((imagen) => imagen.id === p.id).archivo, p.imagen);
    }
});
test('Conserva las tres cartas del catálogo anterior y la imagen existente de Mew', async () => {
    for (const [id, precio, imagen] of [[25, 100, 'SV8PT5_PIkachu_28.png'], [65, 35, 'SV3pt5_ES_65 alcazan.png'], [133, 50, 'SV8pt5_ES_75 eve.png']]) {
        const p = productos.find((p) => p.id === id);
        assert.equal(p.precio, precio);
        assert.equal(p.imagen, imagen);
    }
    assert.ok((await leer('SV3pt5_LA_151 enow.png')).length > 0);
});