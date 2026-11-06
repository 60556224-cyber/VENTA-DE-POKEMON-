# Bitácora del primer avance

**Alcance:** avance académico del 30% para el catálogo de cartas. Esta bitácora registra el trabajo realizado en la rama `feat/avance-luis` el 5 de noviembre de 2026.

## Etapas realizadas

1. **HTML y catálogo.** Se corrigió el idioma y la estructura semántica del documento, los nombres de Eevee ex, Mew ex, Alakazam ex y Pikachu ex, sus textos alternativos y los elementos del carrito. Se conservaron las cuatro imágenes existentes.
2. **Estilos responsive.** Se reorganizó la hoja CSS para adaptar el catálogo a pantallas amplias y móviles, y para hacer utilizable el panel del carrito en pantallas pequeñas. Se añadieron estados visibles de foco y respeto por movimiento reducido.
3. **Carrito básico.** Se implementaron las acciones para agregar cartas, subir o bajar unidades, quitar una carta y vaciar el carrito. El contador muestra unidades y el total se calcula en soles. El panel se abre y cierra con controles accesibles y con la tecla Escape.
4. **Documentación.** Se añadieron esta bitácora y `docs/uso-ia.md`.

## Comprobaciones realizadas

- **Etapa 1:** comprobación con Node.js de la estructura básica del HTML, el idioma, la presencia de un solo título de página, los cuatro nombres, los cuatro botones de agregar y la existencia de los cuatro archivos de imagen.
- **Etapa 2:** comprobación de reglas CSS para cuadrícula adaptable, puntos de quiebre móvil, ancho del panel, foco visible y movimiento reducido.
- **Etapa 3:** `node --check carrito.js` y prueba funcional con un DOM simulado en Node.js para agregar, reducir unidades, quitar, vaciar, recalcular el total y abrir/cerrar el panel.
- **Todas las etapas:** `git diff --check` sin errores de whitespace.

La prueba funcional usa un DOM simulado; no se realizó una comprobación visual en un navegador.

## Historial de commits de este avance

- `5f52246` — Corrige HTML y nombres de cartas.
- `23c3622` — Mejora estilos responsive del catálogo.
- `a06daf5` — Implementa carrito básico de cartas.

Los documentos de esta bitácora se agregan en un commit independiente al finalizar esta etapa.

## Límites del avance

El proyecto mantiene un catálogo local y un carrito básico. No se implementaron pagos ni conexión a bases de datos.
