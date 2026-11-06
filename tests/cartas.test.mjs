import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const base = new URL('../', import.meta.url);
const leer = (archivo) => readFile(new URL(archivo, base));
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const productos = JSON.parse(await leer('productos.json'));
const manifiesto = JSON.parse(await leer('datos/tcgdex/cartas.json'));
const normalizar = (texto) => texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ ex$/i, '').replace(/[’']/g, '').toLowerCase();

test('150 cartas TCG verificadas: sin pendientes ni ilustraciones en productos.json', () => {
    assert.equal(manifiesto.verificadas, 150);
    assert.deepEqual(manifiesto.pendientes, []);
    assert.deepEqual(manifiesto.cartas.map((c) => c.pokemonId), productos.map((p) => p.id));
    assert.equal(new Set(manifiesto.cartas.map((c) => c.cartaId)).size, 150);
    for (const p of productos) {
        const carta = manifiesto.cartas.find((c) => c.pokemonId === p.id);
        assert.equal(p.imagen, `img/cartas/${String(p.id).padStart(3, '0')}.webp`);
        assert.equal(p.imagen, carta.archivo);
        assert.equal(p.carta.id, carta.cartaId);
        assert.equal(p.carta.nombre, carta.nombreCarta);
        assert.equal(p.carta.conjunto, carta.conjunto.nombre);
        assert.equal(p.carta.fuente, carta.fuente);
    }
});
test('Correspondencia de las 150 cartas con respuestas TCGdex: nombre, dexId, colección y características TCG', async () => {
    for (const registro of manifiesto.cartas) {
        const bytes = await leer(registro.metadatos);
        assert.equal(hash(bytes), registro.sha256Metadatos);
        const carta = JSON.parse(bytes);
        assert.equal(carta.id, registro.cartaId);
        assert.deepEqual(carta.dexId, [registro.pokemonId]);
        assert.equal(normalizar(carta.name), normalizar(registro.nombrePokemon));
        assert.equal(carta.name, registro.nombreCarta);
        assert.equal(carta.localId, registro.numeroCarta);
        assert.equal(carta.set.id, registro.conjunto.id);
        assert.equal(carta.set.name, registro.conjunto.nombre);
        assert.ok(['Pokemon', 'Pokémon'].includes(carta.category));
        assert.ok(carta.hp > 0 && carta.attacks.length > 0);
        assert.equal(registro.fuente, `https://api.tcgdex.net/v2/es/cards/${carta.id}`);
        assert.equal(registro.urlImagen, `${carta.image}/low.webp`);
    }
});
test('WebP locales: hashes, tamaños de carta vertical y peso total menor que 5 MB', async () => {
    let total = 0;
    for (const registro of manifiesto.cartas) {
        const bytes = await leer(registro.archivo);
        assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
        assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
        assert.equal(hash(bytes), registro.sha256);
        assert.equal(bytes.length, registro.bytes);
        assert.ok(bytes.length < 150000);
        assert.ok(registro.ancho >= 240 && registro.alto >= 330);
        assert.ok(registro.ancho / registro.alto > 0.69 && registro.ancho / registro.alto < 0.75);
        total += bytes.length;
    }
    assert.ok(total < 5000000);
});
test('Pikachu, Alakazam y Eevee provienen de los originales sin recortes; Mew sigue intacto', async () => {
    for (const [id, cartaId, archivo] of [[25, 'sv08.5-028', 'SV8PT5_PIkachu_28.png'], [65, 'sv03.5-065', 'SV3pt5_ES_65 alcazan.png'], [133, 'sv08.5-075', 'SV8pt5_ES_75 eve.png']]) {
        const carta = manifiesto.cartas.find((c) => c.pokemonId === id);
        assert.equal(carta.cartaId, cartaId);
        assert.equal(carta.origenImagen, 'original-proyecto');
        assert.equal(carta.original.archivo, archivo);
        const original = await leer(archivo);
        assert.equal(hash(original), carta.original.sha256);
        assert.equal(carta.ancho, original.readUInt32BE(16));
        assert.equal(carta.alto, original.readUInt32BE(20));
    }
    assert.ok((await leer('SV3pt5_LA_151 enow.png')).length > 0);
});
test('Licencia MIT de datos y atribución de TCGdex/Pokémon conservadas', async () => {
    assert.ok((await leer('datos/tcgdex/LICENSE')).toString().includes('Copyright (c) 2021 TCGdex'));
    const html = (await leer('index.html')).toString();
    assert.ok(html.includes('https://tcgdex.dev/'));
    assert.ok(html.includes('GAME FREAK'));
});

test('La revisión visual de las 150 cartas corresponde al manifiesto y archivos actuales', async () => {
    const revision = JSON.parse(await leer('datos/tcgdex/revision-visual.json'));
    assert.equal(revision.totalRevisadas, 150);
    assert.deepEqual(revision.pendientes, []);
    assert.equal(revision.sha256Manifiesto, hash(await leer('datos/tcgdex/cartas.json')));
    assert.equal(revision.cartas.length, 150);
    for (const carta of manifiesto.cartas) {
        const revisada = revision.cartas.find((registro) => registro.pokemonId === carta.pokemonId);
        assert.equal(revisada.cartaId, carta.cartaId);
        assert.equal(revisada.sha256, hash(await leer(carta.archivo)));
    }
});
