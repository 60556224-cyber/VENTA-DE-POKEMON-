// checkout.js
// Requiere que Bootstrap (bundle JS) se cargue ANTES que este archivo.

const modal = new bootstrap.Modal(document.getElementById('modalCheckout'));

// 1. Al presionar "Comprar": copia el total y abre el modal
document.getElementById('comprar').addEventListener('click', () => {
  const total = document.getElementById('total').textContent;

  if (parseFloat(total) <= 0) {
    alert('Tu carrito está vacío');
    return;
  }

  document.getElementById('checkout-total').textContent = total;
  modal.show();
});

// 2. Al presionar "Confirmar compra": valida y finaliza
document.getElementById('confirmar').addEventListener('click', () => {
  const nombre = document.getElementById('nombre').value.trim();
  const telefono = document.getElementById('telefono').value.trim();
  const direccion = document.getElementById('direccion').value.trim();

  if (!nombre || !direccion || telefono.length !== 9) {
    alert('Completa todos los campos (teléfono de 9 dígitos)');
    return;
  }

  alert('¡Gracias por tu compra, ' + nombre + '!');

  // Limpia el formulario
  document.getElementById('nombre').value = '';
  document.getElementById('telefono').value = '';
  document.getElementById('direccion').value = '';

  document.getElementById('vaciar').click(); // reutiliza el vaciar de carrito.js
  modal.hide();
});
