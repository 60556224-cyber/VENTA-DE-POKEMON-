# Catálogo de 150 Pokémon: uso y sustentación

Esta funcionalidad implementa R3 (datos JSON) y la generación del catálogo para R5. El catálogo contiene exactamente los números nacionales 1–150: Bulbasaur hasta Mewtwo. Mew (#151) no forma parte de los datos, pero su imagen original se conserva.

## Cómo abrir la tienda

Requisito: Node.js 22 o superior. No se necesitan paquetes npm.

Desde la raíz del repositorio:

```powershell
node scripts/servidor.mjs
```

Abre http://127.0.0.1:8080 y detén el servidor con Ctrl+C. Utiliza el servidor porque `fetch()` necesita cargar el JSON mediante HTTP; abrir `index.html` con doble clic puede bloquear la lectura.

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
  "imagen": "imagenes/pokemon/001.png",
  "datos_demo": true
}
```

- `id`: número único de la Pokédex nacional. También identifica el producto en el carrito.
- `nombre`: nombre oficial en español obtenido de PokéAPI.
- `categoria`: primer tipo del Pokémon, según el orden de la fuente.
- `tipos`: todos sus tipos actuales; el filtro también contempla el tipo secundario.
- `precio`: número utilizado para calcular los totales. La pantalla conserva el símbolo `$` de la tienda.
- `stock`: cantidad máxima de demostración que se puede añadir al carrito; cero bloquea la compra.
- `imagen`: ruta relativa a un archivo PNG local.
- `datos_demo`: indica que los valores comerciales son ficticios.

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

Las 147 ilustraciones nuevas se descargaron de [PokeAPI/sprites](https://github.com/PokeAPI/sprites). Se conservaron las rutas y precios de Pikachu, Alakazam y Eevee. La imagen de Mew permanece intacta.

`datos/pokeapi/fuente.json` registra las revisiones exactas de ambos repositorios, las URL de origen y los hashes SHA-256. Los cuatro CSV originales están guardados para comprobar todos los nombres y tipos sin consultar Internet. `.gitattributes` conserva los bytes de esos CSV en Windows para que sus hashes no cambien al clonar.

Todos los precios y stocks son ficticios, incluso los precios heredados de la demostración anterior. Las ilustraciones de Pokémon no representan necesariamente cartas físicas ofrecidas. Para una venta real faltaría confirmar las cartas concretas, sus ediciones, sus fotografías, precios e inventario. No se implementaron pagos reales.

La tienda funciona con archivos locales servidos por HTTP y no consulta PokéAPI al navegar. `scripts/generar-productos.mjs` es una herramienta de preparación: necesita Internet y regenera los datos, fuentes e imágenes desde las versiones de PokéAPI vigentes al ejecutarla. No es necesario ejecutarla para abrir la tienda ni para las pruebas normales.

## Pruebas reproducibles

```powershell
node --test tests/datos.test.mjs tests/navegador.test.mjs
node --check catalogo.js
node --check carrito.js
git diff --check
```

Las pruebas de navegador requieren Google Chrome. La ruta predeterminada es `C:/Program Files/Google/Chrome/Application/chrome.exe`; puede cambiarse con la variable `CHROME_PATH`. Chrome se ejecuta sin ventana, con un perfil temporal propio que se elimina al terminar.

Resultado de esta entrega: **19 pruebas aprobadas, 0 fallidas y 0 omitidas**. Se verificaron el esquema JSON, la secuencia 1–150, nombres y tipos contra los CSV, hashes y archivos PNG, decodificación de las 150 imágenes en Chrome, búsqueda, los 17 filtros, paginación, carrito, límites de stock, errores HTTP/JSON, IDs duplicados, imágenes fallidas y recuperación.

Se comprobaron anchos de **320, 360, 390, 768 y 1280 píxeles**, sin desbordamiento horizontal, y la interacción del botón del carrito en la vista móvil. Se generaron y revisaron `artifacts/catalogo-390.png` y `artifacts/catalogo-1280.png`; son capturas locales excluidas de Git. La comprobación móvil usa emulación en Chrome, no un teléfono físico. No se ejecutaron pruebas en otros navegadores.

Los commits están separados en datos, generación del catálogo e integración/pruebas. No se modificaron `docs/`, `main`, la etiqueta `v0.3` ni las ramas anteriores. No se realizó push, merge ni despliegue.
