# Catálogo de 150 Pokémon: uso y sustentación

Esta funcionalidad implementa R3 (datos JSON) y la generación del catálogo para R5. El catálogo contiene exactamente los números nacionales 1–150: Bulbasaur hasta Mewtwo. Mew (#151) no forma parte de los datos, pero su imagen original se conserva.

## Cómo abrir la tienda

Requisito: Node.js 22 o superior. No se necesitan paquetes npm.

Desde la raíz del repositorio:

```powershell
node scripts/servidor.mjs
```

Abre http://127.0.0.1:8080 y detén el servidor con Ctrl+C. Si ya estaba ejecutándose una versión anterior del servidor, reinícialo para activar el soporte de WebP. Utiliza el servidor porque `fetch()` necesita cargar el JSON mediante HTTP; abrir `index.html` con doble clic puede bloquear la lectura.

## Cómo explicar productos.json

JSON es un formato de texto para guardar datos estructurados. No contiene funciones ni ejecuta instrucciones. En este proyecto guarda la lista de productos de la tienda.

Los corchetes `[]` representan la lista de 150 productos. Cada producto está entre llaves `{}` y tiene propiedades con un nombre y un valor. Por ejemplo, este es el primer registro:

```json
{
  "id": 1,
  "nombre": "Bulbasaur",
  "categoria": "Planta",
  "tipos": ["Planta", "Veneno"],
  "precio": 17.5,
  "stock": 4,
  "imagen": "img/cartas/001.webp",
  "datos_demo": true,
  "carta": {
    "id": "sv03.5-001",
    "nombre": "Bulbasaur",
    "conjunto": "151",
    "conjuntoId": "sv03.5",
    "idioma": "es",
    "fuente": "https://api.tcgdex.net/v2/es/cards/sv03.5-001"
  }
}
```

- `id`: número único de la Pokédex nacional. También identifica el producto en el carrito.
- `nombre`: nombre oficial en español obtenido de PokéAPI.
- `categoria`: primer tipo del Pokémon, según el orden de la fuente.
- `tipos`: todos sus tipos actuales; el filtro también contempla el tipo secundario.
- `precio`: número utilizado para calcular los totales. La pantalla conserva el símbolo `$` de la tienda.
- `stock`: cantidad máxima de demostración que se puede añadir al carrito; cero bloquea la compra.
- `imagen`: ruta relativa a una imagen WebP local de la carta completa.
- `datos_demo`: indica que los valores comerciales son ficticios.
- `carta`: nombre impreso, ID, colección, idioma y fuente verificable de la carta TCG.

Los textos llevan comillas dobles; los números y `true` se escriben sin comillas. Los decimales usan punto. JSON no admite comentarios ni una coma después del último campo.

Puedes explicarlo así ante el profesor:

> Separé los datos de la presentación. productos.json guarda la información de los 150 Pokémon. cargarCatalogo() lee ese archivo con fetch(), convierte la respuesta mediante response.json() en objetos JavaScript y recorre la lista para crear las tarjetas en el DOM. Por eso no escribí 150 tarjetas en HTML. El buscador y los filtros trabajan con esa lista en memoria. El carrito utiliza el id y comprueba el stock antes de aumentar la cantidad.

Si se cambia un precio en el JSON y se recarga la página, la tarjeta y los cálculos del carrito utilizan el nuevo valor, sin editar el HTML. Conserva siempre los IDs 1–150 y los nombres y tipos verificados para mantener los requisitos de esta entrega.

## Catálogo e integración

- 24 tarjetas iniciales y botón «Ver más Pokémon» hasta mostrar las 150.
- Búsqueda por nombre sin distinguir mayúsculas ni tildes y con eliminación de espacios exteriores.
- 15 categorías principales y 17 tipos disponibles en el filtro. Por ejemplo, Magnemite aparece al filtrar por Acero aunque su categoría principal sea Eléctrico.
- Nombre, número, imagen, tipos, precio y stock visibles.
- Imágenes locales con `loading="lazy"` y decodificación asíncrona.
- Mensajes para búsqueda sin coincidencias, errores de carga y reintento.
- Si una imagen falla, aparece un aviso y se bloquea el botón de esa tarjeta.
- Diseño de una a cuatro columnas, según el ancho de pantalla.
- El carrito conserva abrir/cerrar, Escape, contador, total, aumentar, disminuir, eliminar y vaciar.
- Los botones se atienden mediante un único listener en el contenedor del catálogo: los clics suben hasta ese contenedor aunque las tarjetas se hayan creado después de cargar la página. Eso es delegación de eventos.
- El carrito recibe los productos mediante `catalogo:cargado`; `catalogo:renderizado` actualiza los botones tras filtrar o paginar. Los datos comerciales se toman del catálogo validado, sin extraer números del texto de las tarjetas.
- Se comprueba el stock tanto al agregar desde la tarjeta como al pulsar «+». Volver a filtrar no reinicia las cantidades.

## Fuentes y datos ficticios

Los nombres, números y tipos provienen de los CSV del [repositorio oficial de PokéAPI](https://github.com/PokeAPI/pokeapi/tree/master/data/v2/csv), siguiendo su [documentación](https://pokeapi.co/docs/v2/). Se utilizan los tipos actuales, incluidos Hada y Acero, no los tipos históricos de los juegos originales.

Las 150 imágenes actuales representan cartas TCG reales completas en español. Se descargaron 147 cartas de [TCGdex](https://tcgdex.dev/assets), de la colección «151». Para Pikachu, Eevee y Alakazam se priorizaron las cartas originales de la tienda, verificadas con sus IDs de TCGdex. Se conservan los cuatro PNG originales, incluido Mew, y las ilustraciones históricas, aunque estas últimas ya no se usan en productos.json.

`datos/tcgdex/cartas.json` registra el ID de cada carta, colección, nombre impreso, número de Pokédex, URL de metadatos, URL de imagen, archivo local, dimensiones y hashes SHA-256. Las respuestas de la API se conservan en `datos/tcgdex/cartas/`. Los WebP de `img/cartas/` ocupan 2.943.788 bytes en conjunto. Se usan los archivos low de TCGdex (245 × 337 px); las tres originales se convierten a WebP de calidad 0.92, sin recorte ni cambio de dimensiones. El CSS usa `object-fit: contain` para mostrar los bordes completos.

`datos/pokeapi/fuente.json` conserva las fuentes originales de nombres y tipos y el inventario histórico de ilustraciones. Las fuentes visuales vigentes están en `datos/tcgdex/cartas.json`. `.gitattributes` evita que Windows altere los bytes de las fuentes verificadas por hash.

Los datos de TCGdex conservan su licencia MIT en `datos/tcgdex/LICENSE`. Los derechos de las imágenes y marcas Pokémon siguen perteneciendo a sus titulares; no se afirma que las ilustraciones estén bajo MIT. Véase [ATRIBUCION-CARTAS.md](ATRIBUCION-CARTAS.md). La atribución también aparece en la tienda.

Todos los precios y stocks son ficticios, incluidos los heredados. Mostrar una carta real no confirma que exista inventario disponible. No se implementaron pagos reales.

La tienda funciona con archivos locales servidos por HTTP y no consulta PokéAPI ni TCGdex al navegar. `scripts/importar-cartas.mjs` permite repetir la importación con acceso a Internet: valida nombre, dexId, PS y ataques antes de actualizar los productos. Si una carta no se verifica, registra el pendiente y deja productos.json intacto. El generador histórico `scripts/generar-productos.mjs` se bloquea antes de escribir cuando detecta cartas TCG para evitar sustituirlas accidentalmente por ilustraciones.

## Pruebas reproducibles

```powershell
node --test tests/datos.test.mjs tests/cartas.test.mjs tests/navegador.test.mjs
node --check catalogo.js
node --check carrito.js
git diff --check
```

Las pruebas de navegador requieren Google Chrome. La ruta predeterminada es `C:/Program Files/Google/Chrome/Application/chrome.exe`; puede cambiarse con la variable `CHROME_PATH`. Chrome se ejecuta sin ventana, con un perfil temporal propio que se elimina al terminar.

Resultado de esta entrega: **25 pruebas aprobadas, 0 fallidas y 0 omitidas**. Se verificaron el esquema JSON, la secuencia 1–150, nombres y tipos contra los CSV, hashes, archivos originales y cartas WebP, decodificación de las 150 imágenes en Chrome, búsqueda, los 17 filtros, paginación, carrito, límites de stock, errores HTTP/JSON, IDs duplicados, imágenes fallidas y recuperación.

Se comprobaron anchos de **320, 360, 390, 768 y 1280 píxeles**, sin desbordamiento horizontal, y la interacción del botón del carrito en la vista móvil. Se generaron y revisaron `artifacts/catalogo-390.png` y `artifacts/catalogo-1280.png`; son capturas locales excluidas de Git. La comprobación móvil usa emulación en Chrome, no un teléfono físico. No se ejecutaron pruebas en otros navegadores.

Los commits están separados en datos, generación del catálogo e integración/pruebas. No se modificaron `docs/`, `main`, la etiqueta `v0.3` ni las ramas anteriores. No se realizó push, merge ni despliegue.

La revisión visual de las 150 cartas se registra en datos/tcgdex/revision-visual.json y se vincula al hash del manifiesto. Se inspeccionaron quince hojas de contacto (diez cartas por hoja), incluidos ambos Nidoran, cartas ex, las tres originales y Mewtwo. No quedaron imágenes pendientes.
