// Los datos se cargan una vez; búsqueda, filtros y paginación trabajan en memoria.
const TAMANO_PAGINA = 24;
const contenedorCatalogo = document.querySelector('#catalogo-items');
const buscadorCatalogo = document.querySelector('#buscar-pokemon');
const filtroCatalogo = document.querySelector('#categoria-pokemon');
const estadoCatalogo = document.querySelector('#estado-catalogo');
const botonVerMas = document.querySelector('#ver-mas');
const botonReintentar = document.querySelector('#reintentar-catalogo');
let productosCatalogo = [];
let limiteCatalogo = TAMANO_PAGINA;

function normalizarTexto(texto) {
    return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').trim();
}

function validarProductos(datos) {
    if (!Array.isArray(datos) || datos.length !== 150) throw new Error('Se esperaban 150 productos.');
    const ids = new Set();
    for (const producto of datos) {
        if (!producto || !Number.isInteger(producto.id) || producto.id < 1 || producto.id > 150 || ids.has(producto.id)
            || typeof producto.nombre !== 'string' || !producto.nombre.trim()
            || typeof producto.categoria !== 'string' || !producto.categoria.trim()
            || !Array.isArray(producto.tipos) || !producto.tipos.length
            || !producto.tipos.every((tipo) => typeof tipo === 'string' && tipo.trim())
            || producto.categoria !== producto.tipos[0]
            || !Number.isFinite(producto.precio) || producto.precio <= 0
            || !Number.isInteger(producto.stock) || producto.stock < 0
            || typeof producto.imagen !== 'string' || !producto.imagen.endsWith('.png')
            || producto.imagen.includes('..') || /[:\\]/.test(producto.imagen) || producto.imagen.startsWith('/')) {
            throw new Error('El catálogo contiene un producto inválido o un ID repetido.');
        }
        ids.add(producto.id);
    }
    return datos.sort((a, b) => a.id - b.id);
}

function crearTarjeta(producto) {
    const tarjeta = document.createElement('article');
    tarjeta.className = 'item';
    tarjeta.dataset.id = String(producto.id);

    const numero = document.createElement('span');
    numero.className = 'numero-item';
    numero.textContent = `#${String(producto.id).padStart(3, '0')}`;
    const nombre = document.createElement('h3');
    nombre.className = 'titulo-item';
    nombre.textContent = `Carta de ${producto.nombre}`;
    const imagen = document.createElement('img');
    imagen.className = 'img-item';
    imagen.alt = `Imagen de ${producto.nombre}`;
    imagen.loading = 'lazy';
    imagen.decoding = 'async';
    imagen.width = 475;
    imagen.height = 475;
    const categoria = document.createElement('p');
    categoria.className = 'categoria-item';
    categoria.textContent = `Categoría: ${producto.tipos.join(' / ')}`;
    const precio = document.createElement('span');
    precio.className = 'precio-item';
    precio.textContent = `${producto.precio.toFixed(2)}$`;
    const stock = document.createElement('p');
    stock.className = 'stock-item';
    stock.textContent = `Stock de demostración: ${producto.stock}`;
    const boton = document.createElement('button');
    boton.className = 'boton-item';
    boton.type = 'button';
    boton.dataset.agregar = '';
    boton.dataset.id = String(producto.id);
    boton.disabled = producto.stock === 0;
    boton.textContent = producto.stock > 0 ? 'Agregar al carrito' : 'Sin stock';
    imagen.addEventListener('error', () => {
        const aviso = document.createElement('p');
        aviso.textContent = 'Imagen no disponible.';
        imagen.replaceWith(aviso);
        boton.dataset.imagenInvalida = 'true';
        boton.disabled = true;
        boton.textContent = 'Imagen pendiente';
    }, { once: true });
    imagen.src = producto.imagen;
    tarjeta.append(numero, nombre, imagen, categoria, precio, stock, boton);
    return tarjeta;
}

function mostrarProductos() {
    const busqueda = normalizarTexto(buscadorCatalogo.value);
    const categoria = filtroCatalogo.value;
    const filtrados = productosCatalogo.filter((producto) => normalizarTexto(producto.nombre).includes(busqueda)
        && (!categoria || producto.tipos.includes(categoria)));
    const visibles = filtrados.slice(0, limiteCatalogo);
    const fragmento = document.createDocumentFragment();
    visibles.forEach((producto) => fragmento.append(crearTarjeta(producto)));
    contenedorCatalogo.replaceChildren(fragmento);
    estadoCatalogo.textContent = filtrados.length
        ? `Mostrando ${visibles.length} de ${filtrados.length} Pokémon.`
        : 'No encontramos Pokémon con esa búsqueda y categoría.';
    botonVerMas.hidden = visibles.length >= filtrados.length;
    document.dispatchEvent(new CustomEvent('catalogo:renderizado'));
}

async function cargarCatalogo() {
    buscadorCatalogo.disabled = true;
    filtroCatalogo.disabled = true;
    botonReintentar.hidden = true;
    botonVerMas.hidden = true;
    contenedorCatalogo.setAttribute('aria-busy', 'true');
    estadoCatalogo.textContent = 'Cargando catálogo…';
    try {
        const respuesta = await fetch('./productos.json', { signal: AbortSignal.timeout(10000) });
        if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
        productosCatalogo = validarProductos(await respuesta.json());
        const categorias = [...new Set(productosCatalogo.flatMap((producto) => producto.tipos))].sort((a, b) => a.localeCompare(b, 'es'));
        filtroCatalogo.replaceChildren(new Option('Todas las categorías', ''), ...categorias.map((categoria) => new Option(categoria, categoria)));
        buscadorCatalogo.disabled = false;
        filtroCatalogo.disabled = false;
        limiteCatalogo = TAMANO_PAGINA;
        document.dispatchEvent(new CustomEvent('catalogo:cargado', { detail: productosCatalogo }));
        mostrarProductos();
    } catch (error) {
        productosCatalogo = [];
        contenedorCatalogo.replaceChildren();
        document.dispatchEvent(new CustomEvent('catalogo:cargado', { detail: [] }));
        estadoCatalogo.textContent = location.protocol === 'file:'
            ? 'Abre la tienda con un servidor local: node scripts/servidor.mjs.'
            : 'No se pudo cargar el catálogo. Comprueba el archivo productos.json e inténtalo nuevamente.';
        botonReintentar.hidden = false;
        console.warn('No se pudo cargar el catálogo:', error.message);
    } finally {
        contenedorCatalogo.setAttribute('aria-busy', 'false');
    }
}

function reiniciarPagina() {
    limiteCatalogo = TAMANO_PAGINA;
    mostrarProductos();
}
buscadorCatalogo.addEventListener('input', reiniciarPagina);
filtroCatalogo.addEventListener('change', reiniciarPagina);
document.querySelector('#controles-catalogo').addEventListener('submit', (evento) => evento.preventDefault());
botonVerMas.addEventListener('click', () => {
    limiteCatalogo += TAMANO_PAGINA;
    mostrarProductos();
});
botonReintentar.addEventListener('click', cargarCatalogo);
cargarCatalogo();