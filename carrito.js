(() => {
    const botonCarrito = document.querySelector("#btn-carrito");
    const panelCarrito = document.querySelector("#carrito");
    const botonCerrar = document.querySelector("#cerrar-carrito");
    const botonVaciar = document.querySelector("#vaciar");
    const listaCarrito = document.querySelector("#carrito-items");
    const contador = document.querySelector("#contador");
    const total = document.querySelector("#total");
    const productos = new Map();
    const catalogo = new Map();
    const estadoCarrito = document.querySelector('#estado-carrito');

    function sincronizarBotones() {
        document.querySelectorAll('[data-agregar]').forEach((boton) => {
            const producto = catalogo.get(boton.dataset.id);
            const cantidad = productos.get(boton.dataset.id)?.cantidad ?? 0;
            const imagenInvalida = boton.dataset.imagenInvalida === 'true';
            boton.disabled = !producto || cantidad >= producto.stock || imagenInvalida;
            boton.textContent = imagenInvalida ? 'Imagen pendiente'
                : !producto || producto.stock === 0 ? 'Sin stock'
                : cantidad >= producto.stock ? 'Stock máximo en carrito' : 'Agregar al carrito';
        });
    }

    document.addEventListener('catalogo:cargado', (evento) => {
        catalogo.clear();
        evento.detail.forEach((producto) => catalogo.set(String(producto.id), producto));
        sincronizarBotones();
    });
    document.addEventListener('catalogo:renderizado', sincronizarBotones);

    function formatearPrecio(precio) {
        return `${precio.toFixed(2)}$`;
    }

    function crearBoton(texto, etiqueta, accion, id, clase = "") {
        const boton = document.createElement("button");
        boton.type = "button";
        boton.textContent = texto;
        boton.setAttribute("aria-label", etiqueta);
        boton.dataset.accion = accion;
        boton.dataset.id = id;
        if (clase) boton.className = clase;
        if (accion === 'aumentar') boton.disabled = productos.get(id).cantidad >= productos.get(id).stock;
        return boton;
    }

    function mostrarCarrito(abierto) {
        panelCarrito.classList.toggle("abierto", abierto);
        panelCarrito.setAttribute("aria-hidden", String(!abierto));
        botonCarrito.setAttribute("aria-expanded", String(abierto));
    }

    function renderizarCarrito() {
        listaCarrito.replaceChildren();
        let cantidadTotal = 0;
        let precioTotal = 0;

        if (productos.size === 0) {
            const mensaje = document.createElement("p");
            mensaje.className = "carrito-vacio";
            mensaje.textContent = "Tu carrito está vacío.";
            listaCarrito.append(mensaje);
        }

        for (const [id, producto] of productos) {
            cantidadTotal += producto.cantidad;
            precioTotal += producto.precio * producto.cantidad;

            const fila = document.createElement("article");
            fila.className = "carrito-item";

            const informacion = document.createElement("div");
            informacion.className = "carrito-item-info";
            const nombre = document.createElement("strong");
            nombre.textContent = producto.nombre;
            const precio = document.createElement("p");
            precio.textContent = `${formatearPrecio(producto.precio)} c/u · ${formatearPrecio(producto.precio * producto.cantidad)}`;
            informacion.append(nombre, precio);

            const controles = document.createElement("div");
            controles.className = "carrito-item-controles";
            controles.append(
                crearBoton("−", `Quitar una unidad de ${producto.nombre}`, "disminuir", id),
                document.createTextNode(String(producto.cantidad)),
                crearBoton("+", `Agregar una unidad de ${producto.nombre}`, "aumentar", id)
            );

            const quitar = crearBoton("Quitar", `Quitar ${producto.nombre} del carrito`, "eliminar", id);
            quitar.className = "carrito-quitar";
            fila.append(informacion, controles, quitar);
            listaCarrito.append(fila);
        }

        contador.textContent = String(cantidadTotal);
        total.textContent = formatearPrecio(precioTotal);
        sincronizarBotones();
    }

    // Delegación: el contenedor existe antes de que fetch genere las tarjetas.
    document.querySelector('#catalogo-items').addEventListener('click', (evento) => {
        const boton = evento.target.closest('button[data-agregar]');
        if (!boton || boton.disabled) return;
        const id = boton.dataset.id;
        const datos = catalogo.get(id);
        if (!datos || datos.stock === 0) return;
        const producto = productos.get(id) ?? { ...datos, cantidad: 0 };
        if (producto.cantidad >= producto.stock) {
            estadoCarrito.textContent = `No hay más stock de demostración para ${producto.nombre}.`;
            return;
        }
        producto.cantidad += 1;
        productos.set(id, producto);
        estadoCarrito.textContent = `${producto.nombre} agregado. ${producto.cantidad} de ${producto.stock} unidades de demostración en el carrito.`;
        renderizarCarrito();
    });
    listaCarrito.addEventListener("click", (evento) => {
        const boton = evento.target.closest("button[data-accion]");
        if (!boton) return;

        const producto = productos.get(boton.dataset.id);
        if (!producto) return;

        switch (boton.dataset.accion) {
            case "aumentar":
                if (producto.cantidad >= producto.stock) {
                    estadoCarrito.textContent = `Stock máximo de demostración para ${producto.nombre}.`;
                    return;
                }
                producto.cantidad += 1;
                break;
            case "disminuir":
                producto.cantidad -= 1;
                if (producto.cantidad <= 0) productos.delete(boton.dataset.id);
                break;
            case "eliminar":
                productos.delete(boton.dataset.id);
                break;
            default:
                return;
        }

        renderizarCarrito();
    });

    botonCarrito.addEventListener("click", () => {
        mostrarCarrito(panelCarrito.getAttribute("aria-hidden") === "true");
    });
    botonCerrar.addEventListener("click", () => mostrarCarrito(false));
    botonVaciar.addEventListener("click", () => {
        productos.clear();
        estadoCarrito.textContent = 'Carrito vaciado.';
        renderizarCarrito();
    });
    document.addEventListener("keydown", (evento) => {
        if (evento.key === "Escape") mostrarCarrito(false);
    });

    renderizarCarrito();
})();
