---
name: feedback-mobile-modal-grid
description: CSS móvil — las m-section dentro del modal item tienen su propio grid que hay que resetear explícitamente en media queries
metadata: 
  node_type: memory
  type: feedback
  originSessionId: e3bf5473-fd1c-4fdc-9e0c-c677e50c1891
---

Al hacer el modal #mItem fullscreen en móvil, el contenido se desbordaba horizontalmente aunque .fg tuviera grid-template-columns:1fr.

**Por qué:** Cada .m-section tiene su propio grid-template-columns (2 columnas, o 4 columnas para clasificación). Estos no se heredan ni se resetean automáticamente cuando el padre cambia a 1 columna. El desbordamiento se veía como contenido cortado por la izquierda.

**How to apply:** En el media query móvil (<640px), además de resetear .fg, hay que resetear explícitamente cada .m-section:

```css
#mItem .m-section { grid-template-columns: 1fr !important; }
#mItem .m-section:has(#f_cat) { grid-template-columns: 1fr 1fr !important; }
#mItem .m-section:has(#f_util) { grid-template-columns: 1fr !important; }
```

También: backdrop-filter en .mbg impide que position:fixed funcione correctamente en hijos (crea nuevo stacking context). Usar width:100% + align-items:stretch en el flex container en lugar de position:fixed;inset:0 en el modal.
