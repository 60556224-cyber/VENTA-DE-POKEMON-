(() => {
    const botonCarrito = document.querySelector("#btn-carrito");
    const panelCarrito = document.querySelector("#carrito");
    const botonCerrar = document.querySelector("#cerrar-carrito");
    const botonVaciar = document.querySelector("#vaciar");
    const listaCarrito = document.querySelector("#carrito-items");
    const contador = document.querySelector("#contador");
    const total = document.querySelector("#total");
    const productos = new Map();

    const formatoSoles = new Intl.NumberFormat("es-PE", {
        style: "currency",
        currency: "PEN",
        minimumFractionDigits: 2
    });

    function mostrarCarrito(abierto) {
        panelCarrito.classList.toggle("abierto", abierto);
        panelCarrito.setAttribute("aria-hidden", String(!abierto));
        botonCarrito.setAttribute("aria-expanded", String(abierto));
    }

    function crearBoton(texto, etiqueta, accion, id, clase = "") {
        const boton = document.createElement("button");
        boton.type = "button";
        boton.textContent = texto;
        boton.setAttribute("aria-label", etiqueta);
        boton.dataset.accion = accion;
        boton.dataset.id = id;
        if (clase) boton.className = clase;
        return boton;
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

            const info = document.createElement("div");
            info.className = "info";
            const nombre = document.createElement("strong");
            nombre.textContent = producto.nombre;
            const detalle = document.createElement("p");
            detalle.textContent = `${formatoSoles.format(producto.precio)} c/u · ${formatoSoles.format(producto.precio * producto.cantidad)}`;
            info.append(nombre, detalle);

            const controles = document.createElement("div");
            controles.className = "carrito-item-controles";
            controles.append(
                crearBoton("−", `Quitar una unidad de ${producto.nombre}`, "disminuir", id),
                document.createTextNode(String(producto.cantidad)),
                crearBoton("+", `Agregar una unidad de ${producto.nombre}`, "aumentar", id)
            );

            const botonQuitar = crearBoton("Quitar", `Quitar ${producto.nombre} del carrito`, "quitar", id, "carrito-quitar");
            fila.append(info, controles, botonQuitar);
            listaCarrito.append(fila);
        }

        contador.textContent = String(cantidadTotal);
        total.textContent = formatoSoles.format(precioTotal);
    }

    document.querySelectorAll("[data-agregar]").forEach((boton) => {
        boton.addEventListener("click", () => {
            const tarjeta = boton.closest(".item");
            const nombre = tarjeta.querySelector(".titulo-item").textContent.trim();
            const precioTexto = tarjeta.querySelector(".precio-item").textContent;
            const precio = Number(precioTexto.replace(/[^\d.]/g, ""));

            if (!nombre || !Number.isFinite(precio) || precio < 0) return;

            const id = nombre;
            const producto = productos.get(id) ?? { nombre, precio, cantidad: 0 };
            producto.cantidad += 1;
            productos.set(id, producto);
            renderizarCarrito();
        });
    });

    listaCarrito.addEventListener("click", (evento) => {
        const boton = evento.target.closest("button[data-accion]");
        if (!boton) return;

        const producto = productos.get(boton.dataset.id);
        if (!producto) return;

        switch (boton.dataset.accion) {
            case "aumentar":
                producto.cantidad += 1;
                break;
            case "disminuir":
                producto.cantidad -= 1;
                if (producto.cantidad <= 0) productos.delete(boton.dataset.id);
                break;
            case "quitar":
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
        renderizarCarrito();
    });
    document.addEventListener("keydown", (evento) => {
        if (evento.key === "Escape") mostrarCarrito(false);
    });

    renderizarCarrito();
})();
