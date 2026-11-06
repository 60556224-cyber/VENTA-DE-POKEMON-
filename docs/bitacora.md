# Bitácora del avance del 30%

- **Proyecto:** catálogo de cartas Pokémon
- **Rama de trabajo:** `feat/avance-luis`
- **Fecha de las actividades registradas:** 5 de noviembre de 2026

## Actividades técnicas

1. **Correcciones HTML.** Se estableció el idioma español y se corrigió la estructura semántica del catálogo. Se actualizaron los nombres a Eevee ex, Mew ex, Alakazam ex y Pikachu ex, junto con sus textos alternativos y la estructura del carrito. Se conservaron las cuatro imágenes existentes.
2. **Mejoras CSS.** Se reorganizaron los estilos para adaptar la cuadrícula del catálogo y el panel del carrito a pantallas de escritorio y móviles. Se añadieron estilos de foco visible y soporte para movimiento reducido.
3. **Carrito JavaScript.** Se implementó agregar cartas, aumentar o reducir unidades, quitar una carta y vaciar el carrito. El contador refleja las unidades y el total se calcula en soles. El panel incluye controles de apertura y cierre, incluida la tecla Escape.

## Pruebas y comprobaciones

- **HTML:** comprobación con Node.js del idioma, la estructura básica, el título, los cuatro nombres, los botones de agregar y la existencia de los archivos de imagen.
- **CSS:** comprobación de las reglas para cuadrícula adaptable, puntos de quiebre móviles, panel, foco visible y movimiento reducido.
- **JavaScript:** `node --check carrito.js` y prueba funcional con DOM simulado para agregar cartas, cambiar cantidades, quitar, vaciar y verificar contador, total y apertura/cierre del panel.
- **Cambios:** `git diff --check` sin errores de whitespace.

La prueba funcional del carrito se ejecutó con DOM simulado; no se realizó una revisión visual en navegador.

## Commits de implementación

- `5f52246` — Corrige HTML y nombres de cartas.
- `23c3622` — Mejora estilos responsive del catálogo.
- `a06daf5` — Implementa carrito básico de cartas.

## Alcance

El avance comprende un catálogo local y un carrito básico. No incluye pagos ni conexión a bases de datos.
