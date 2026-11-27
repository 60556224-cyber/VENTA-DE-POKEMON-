// Datos de la compra
const compra = JSON.parse(
    sessionStorage.getItem("checkout-pokemon") || "null"
);

const formulario = document.getElementById("checkout");
const pasos = document.querySelectorAll("[data-paso]");
const resultado = document.getElementById("resultado");

// Mostrar el paso seleccionado
function mostrarPaso(numero) {
    pasos.forEach(paso => {
        paso.hidden = Number(paso.dataset.paso) !== numero;
    });
}

// Validar los campos
function validarPaso(numero) {
    const campos = numero === 1
        ? ["nombre", "celular", "direccion", "distrito"]
        : ["entrega", "pago"];

    let valido = true;

    campos.forEach(id => {
        const campo = document.getElementById(id);

        const correcto = id === "celular"
            ? /^\d{9}$/.test(campo.value.trim())
            : campo.value.trim() !== "";

        campo.classList.toggle("is-invalid", !correcto);

        document.getElementById("error-" + id).textContent =
            correcto ? "" : "Completa correctamente este campo.";

        if (!correcto) valido = false;
    });

    return valido;
}

// Mostrar el resumen de compra
function mostrarResumen() {
    const envio = document.getElementById("entrega").value === "recojo"
        ? 0 : compra.envio;

    const total = compra.subtotal + compra.igv
        + envio - compra.descuento;

    const resumen = document.getElementById("resumen");

    resumen.style.whiteSpace = "pre-line";

    resumen.textContent = compra.productos.map(p =>
        `${p.nombre} x${p.cantidad} — ${(p.precio * p.cantidad).toFixed(2)}$`
    ).join("\n") +
        `\n\nSubtotal: ${compra.subtotal.toFixed(2)}$` +
        `\nIGV: ${compra.igv.toFixed(2)}$` +
        `\nEnvío: ${envio.toFixed(2)}$` +
        `\nDescuento: ${compra.descuento.toFixed(2)}$` +
        `\nTotal: ${total.toFixed(2)}$`;
}

// Botones Continuar y Atrás
document.querySelectorAll("[data-ir]").forEach(boton => {
    boton.addEventListener("click", () => {
        if (!compra || !compra.productos.length) return;

        const destino = Number(boton.dataset.ir);
        const actual = Number(boton.closest("[data-paso]").dataset.paso);

        if (boton.hasAttribute("data-validar")) {
            if (!validarPaso(actual)) return;
        }

        if (destino === 3) mostrarResumen();

        mostrarPaso(destino);
    });
});

// Confirmar el pedido
formulario.addEventListener("submit", evento => {
    evento.preventDefault();

    if (!compra || !compra.productos.length) return;
    if (document.querySelector('[data-paso="3"]').hidden) return;
    if (!validarPaso(1) || !validarPaso(2)) return;

    localStorage.removeItem("carrito-pokemon");
    sessionStorage.removeItem("checkout-pokemon");

    formulario.hidden = true;

    resultado.textContent = "¡Gracias por tu compra! Pedido simulado confirmado.";
    resultado.className = "alert alert-success";
});

// Comprobar que existen productos
if (!compra || !compra.productos.length) {
    formulario.hidden = true;
    resultado.textContent = "Tu carrito está vacío. Regresa a la tienda.";
    resultado.className = "alert alert-warning";
} else {
    mostrarPaso(1);
}
