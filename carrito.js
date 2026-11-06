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
                    stock: producto.stock,
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

    function crearBoton(texto, etiqueta, accion, nombre, clase = "") {
        const boton = document.createElement("button");
        boton.type = "button";
        boton.textContent = texto;
        boton.setAttribute("aria-label", etiqueta);
        boton.dataset.accion = accion;
        boton.dataset.nombre = nombre;
        if (clase) boton.className = clase;
        if (accion === 'aumentar') boton.disabled = productos.get(id).cantidad >= productos.get(id).stock;
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
    }
    
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

            const stock = document.createElement("small");
            stock.textContent = `Cantidad: ${producto.cantidad} de ${producto.stock}`;
            informacion.append(nombre, precio, stock);

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

        const nombre = boton.dataset.nombre;

        switch (boton.dataset.accion) {
            case "aumentar":
                if (producto.cantidad >= producto.stock) {
                    estadoCarrito.textContent = `Stock máximo de demostración para ${producto.nombre}.`;
                    return;
                }
                producto.cantidad += 1;
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
        productos.clear();
        estadoCarrito.textContent = 'Carrito vaciado.';
        renderizarCarrito();
    });

     // aplica el cupón y vuelve a calcular el total.
    botonCupon.addEventListener("click", () => {
        cuponActual = cuponInput.value.trim();
        const esValido = cuponActual.toUpperCase() === "POKE10";
        mensajeCupon.textContent = esValido
            ? "Cupón aplicado: 10% de descuento."
            : "Cupón no válido. Usa POKE10.";
        mensajeCupon.classList.toggle("valido", esValido);
        actualizarResumen();
    });


    document.addEventListener("keydown", (evento) => {
        if (evento.key === "Escape") mostrarCarrito(false);
    });

    renderizarCarrito();
})();
