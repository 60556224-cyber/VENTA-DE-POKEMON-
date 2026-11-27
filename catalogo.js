async function cargarProductos() {
    const contenedor = document.querySelector(".contenedor-items");

    try {
        const respuesta = await fetch("productos.json");

        if (!respuesta.ok) throw new Error("No se pudo cargar productos.json");

        const productos = await respuesta.json();

        contenedor.innerHTML = productos.map(p => `
            <div class="item">
                <span class="titulo-item">Carta de ${p.carta.nombre}</span>

                <img src="${p.imagen}"
                     alt="Carta de ${p.carta.nombre}"
                     class="img-item" loading="lazy">

                <span class="precio-item">${p.precio.toFixed(2)}$</span>

                <small class="stock-item">Stock: ${p.stock}</small>

                <button class="boton-item" type="button"
                        data-agregar data-stock="${p.stock}"
                        ${p.stock === 0 ? "disabled" : ""}>
                    Agregar al carrito
                </button>
            </div>
        `).join("");

    } catch (error) {
        contenedor.textContent = "No se pudo cargar el catálogo.";
        console.error(error);
    }
}

cargarProductos();
