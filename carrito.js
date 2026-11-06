(() => {
    class Carrito {
        constructor(clave = "carrito-pokemon") {
            this.clave = clave;
            this.productos = this.cargar();
        }

        cargar() {
            try {
                const datos = localStorage.getItem(this.clave);
                const productos = datos ? JSON.parse(datos) : [];
                return Array.isArray(productos)
                ? productos.map((producto) => ({
                        ...producto,
                        stock: Number.isInteger(producto.stock) ? producto.stock : 99
                    }))
                    : [];
            } catch (error) {
                console.error("No se pudo recuperar el carrito:", error);
                return [];
            }
        }

        guardar() {
            localStorage.setItem(this.clave, JSON.stringify(this.productos));
        }

        agregarProducto(producto) {
            const existente = this.productos.find(
                (item) => item.nombre === producto.nombre
            );

             if (existente) {
                if (existente.cantidad >= existente.stock) return false;
                existente.cantidad += 1;
            } else {
                this.productos.push({
                    nombre: producto.nombre,
                    precio: producto.precio,
                    cantidad: 1
                });
            }

            this.guardar();
            return true;
        }

        aumentarProducto(nombre) {
            const producto = this.productos.find(
                (item) => item.nombre === nombre
            );

            if (!producto || producto.cantidad >= producto.stock) return false;
            producto.cantidad += 1;
            this.guardar();
            return true;
        }

        disminuirProducto(nombre) {
            const producto = this.productos.find(
                (item) => item.nombre === nombre
            );

            if (!producto) return;

            producto.cantidad -= 1;
            if (producto.cantidad <= 0) {
                this.eliminarProducto(nombre);
            } else {
                this.guardar();
            }
        }

        eliminarProducto(nombre) {
            this.productos = this.productos.filter(
                (item) => item.nombre !== nombre
            );
            this.guardar();
        }

        vaciar() {
            this.productos = [];
            this.guardar();
        }

        obtenerCantidadTotal() {
            return this.productos.reduce(
                (total, producto) => total + producto.cantidad,
                0
            );
        }

        calcularSubtotal() {
            return this.productos.reduce(
                (total, producto) => total + producto.precio * producto.cantidad,
                0
            );
        }
        
        calcularIGV() {
            return this.calcularSubtotal() * 0.18;
        }

        calcularEnvio() {
            const subtotal = this.calcularSubtotal();
            if (subtotal === 0 || subtotal >= 150) return 0;
            return 10;
        }

        calcularDescuento(cupon) {
            if (cupon.trim().toUpperCase() === "POKE10") {
                return this.calcularSubtotal() * 0.10;
            }
            return 0;
        }

        calcularTotal(cupon = "") {
            return this.calcularSubtotal()
                + this.calcularIGV()
                + this.calcularEnvio()
                - this.calcularDescuento(cupon);
        }
    }

    const carrito = new Carrito();
    const botonCarrito = document.querySelector("#btn-carrito");
    const panelCarrito = document.querySelector("#carrito");
    const botonCerrar = document.querySelector("#cerrar-carrito");
    const botonVaciar = document.querySelector("#vaciar");
    const listaCarrito = document.querySelector("#carrito-items");
    const contador = document.querySelector("#contador");
    const total = document.querySelector("#total");

    const subtotalElemento = document.querySelector("#subtotal");
    const igvElemento = document.querySelector("#igv");
    const envioElemento = document.querySelector("#envio");
    const descuentoElemento = document.querySelector("#descuento");
    const cuponInput = document.querySelector("#cupon");
    const botonCupon = document.querySelector("#aplicar-cupon");
    const mensajeCupon = document.querySelector("#mensaje-cupon");
    let cuponActual = "";

    function formatearPrecio(precio) {
        return `${precio.toFixed(2)}$`;
    }

    function crearBoton(texto, etiqueta, accion, nombre, clase = "") {
        const boton = document.createElement("button");
        boton.type = "button";
        boton.textContent = texto;
        boton.setAttribute("aria-label", etiqueta);
        boton.dataset.accion = accion;
        boton.dataset.nombre = nombre;
        if (clase) boton.className = clase;
        return boton;
    }

    function mostrarCarrito(abierto) {
        panelCarrito.classList.toggle("abierto", abierto);
        panelCarrito.setAttribute("aria-hidden", String(!abierto));
        botonCarrito.setAttribute("aria-expanded", String(abierto));
    }

    function actualizarResumen() {
        const subtotal = carrito.calcularSubtotal();
        const igv = carrito.calcularIGV();
        const envio = carrito.calcularEnvio();
        const descuento = carrito.calcularDescuento(cuponActual);
        const totalFinal = carrito.calcularTotal(cuponActual);

        subtotalElemento.textContent = formatearPrecio(subtotal);
        igvElemento.textContent = formatearPrecio(igv);
        envioElemento.textContent = formatearPrecio(envio);
        descuentoElemento.textContent = formatearPrecio(descuento);
        total.textContent = formatearPrecio(totalFinal);

    function renderizarCarrito() {
        listaCarrito.replaceChildren();

        if (carrito.productos.length === 0) {
            const mensaje = document.createElement("p");
            mensaje.className = "carrito-vacio";
            mensaje.textContent = "Tu carrito está vacío.";
            listaCarrito.append(mensaje);
        }

        carrito.productos.forEach((producto) => {
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
                crearBoton("−", `Quitar una unidad de ${producto.nombre}`, "disminuir", producto.nombre),
                document.createTextNode(String(producto.cantidad)),
                crearBoton("+", `Agregar una unidad de ${producto.nombre}`, "aumentar", producto.nombre)
            );

            const quitar = crearBoton(
                "Quitar",
                `Quitar ${producto.nombre} del carrito`,
                "eliminar",
                producto.nombre,
                "carrito-quitar"
            );

            fila.append(informacion, controles, quitar);
            listaCarrito.append(fila);
        });

        contador.textContent = String(carrito.obtenerCantidadTotal());
        total.textContent = formatearPrecio(carrito.obtenerTotal());
    }

    document.querySelectorAll("[data-agregar]").forEach((boton) => {
        boton.addEventListener("click", () => {
            const tarjeta = boton.closest(".item");
            const nombre = tarjeta.querySelector(".titulo-item").textContent.trim();
            const precioTexto = tarjeta.querySelector(".precio-item").textContent;
            const precio = Number(precioTexto.replace(/[^\d.]/g, ""));

            if (!nombre || !Number.isFinite(precio) || precio <= 0) return;

            carrito.agregarProducto({ nombre, precio });
            renderizarCarrito();
        });
    });

    listaCarrito.addEventListener("click", (evento) => {
        const boton = evento.target.closest("button[data-accion]");
        if (!boton) return;

        const nombre = boton.dataset.nombre;

        switch (boton.dataset.accion) {
            case "aumentar":
                carrito.aumentarProducto(nombre);
                break;
            case "disminuir":
                carrito.disminuirProducto(nombre);
                break;
            case "eliminar":
                carrito.eliminarProducto(nombre);
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
        carrito.vaciar();
        renderizarCarrito();
    });

    document.addEventListener("keydown", (evento) => {
        if (evento.key === "Escape") mostrarCarrito(false);
    });

    renderizarCarrito();
})();
