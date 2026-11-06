# Procedencia y atribución de las cartas Pokémon TCG

## Selección y verificación

El catálogo mantiene exactamente los Pokémon nacionales 1–150. Cada carta se identifica mediante una respuesta de la API pública de TCGdex en español: se comprueban el nombre (admitiendo el sufijo «ex»), el `dexId` exacto, la categoría Pokémon, los PS, los ataques, el ID y la colección. No se sustituyen Pokémon por cartas con nombres parecidos ni se generan imágenes.

- 147 imágenes proceden de la colección «151», ID de conjunto `sv03.5`.
- Alakazam utiliza la carta original `sv03.5-065`, «Alakazam ex», colección «151».
- Pikachu utiliza la original `sv08.5-028`, «Pikachu ex», colección «Evoluciones Prismáticas».
- Eevee utiliza la original `sv08.5-075`, «Eevee ex», colección «Evoluciones Prismáticas».
- Mew (#151) queda fuera del catálogo. Su PNG original no se modifica.

La procedencia de los tres PNG originales se registra como «archivo existente en el proyecto»; las URL TCGdex correspondientes verifican su identidad y edición, sin atribuir a TCGdex la descarga histórica de esos PNG.

El registro completo está en [datos/tcgdex/cartas.json](datos/tcgdex/cartas.json). Incluye las URL exactas, ID y nombre de carta y colección, ilustrador cuando está disponible, archivos, dimensiones, tamaño y SHA-256. Las 150 respuestas de la API se guardan en `datos/tcgdex/cartas/`, con sus hashes, para verificar la selección sin conexión.

## Descarga y optimización

Se utiliza la [interfaz de imágenes documentada de TCGdex](https://tcgdex.dev/assets), con formato WebP y calidad low. Esta conserva el frente completo, bordes, nombre, PS, ataques y texto inferior de las cartas. No se extrae la ilustración ni se recorta la tarjeta. Las [preguntas frecuentes de TCGdex](https://tcgdex.dev/faq) recomiendan guardar localmente las respuestas para las consultas masivas; se descargan con cuatro solicitudes concurrentes, sin claves ni servicios de pago.

Las 147 descargas se guardan sin modificar sus bytes. Las tres cartas originales se recomprimen mediante el codificador WebP de Chrome a calidad 0.92 conservando dimensiones y transparencia. Los PNG originales permanecen intactos. Los 150 archivos optimizados de `img/cartas/` suman 2.943.788 bytes.

## Créditos y condiciones

- Fuente de datos e imágenes descargadas: [TCGdex](https://tcgdex.dev/).
- Base de datos: Copyright (c) 2021 TCGdex, licencia MIT. Se conserva el texto completo en [datos/tcgdex/LICENSE](datos/tcgdex/LICENSE).
- Pokémon y sus imágenes de cartas: © Nintendo / Creatures Inc. / GAME FREAK inc.; derechos de sus respectivos titulares. Se conservan los avisos impresos en las cartas y se añade la atribución visible en la tienda.
- La licencia MIT de la base de datos no se presenta como una cesión de los derechos de las ilustraciones ni de las marcas. Este proyecto académico no está afiliado ni respaldado oficialmente por TCGdex o los titulares de Pokémon.
- Alcance de esta entrega: demostración académica local, sin publicación, pagos reales ni afirmaciones de inventario. La disponibilidad pública de las imágenes no equivale a una autorización general de redistribución comercial.

## Repetir las comprobaciones

```powershell
node --test tests/datos.test.mjs tests/cartas.test.mjs tests/navegador.test.mjs
node scripts/revisar-cartas.mjs
```

El segundo comando decodifica las 150 imágenes, contrasta sus dimensiones con el manifiesto y genera quince hojas de contacto en `artifacts/tcg-hoja-1.png` a `artifacts/tcg-hoja-15.png`. Las capturas locales quedan excluidas de Git. La importación completa se puede repetir con `node scripts/importar-cartas.mjs` y requiere Internet y Chrome.

Resultado de la revisión: 150 cartas completas inspeccionadas y 0 pendientes. El registro en datos/tcgdex/revision-visual.json conserva los IDs, hashes y hojas correspondientes. La revisión no acredita inventario físico ni autenticidad de un ejemplar material en venta.
