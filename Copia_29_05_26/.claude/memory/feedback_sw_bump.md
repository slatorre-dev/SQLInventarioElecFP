---
name: feedback-sw-bump
description: Siempre actualizar la versión del SW y hacer commit+push al final de cada sesión de cambios
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 205bfcbf-10ff-4b36-b943-161470635f8f
---

**Rule:** Siempre bumpar `sw.js` después de cualquier cambio en CSS/JS y hacer commit+push.

**Why:** Sin bumpar el service worker, los clientes no descargan los cambios nuevos — siguen usando la versión cacheada. El usuario lo pidió explícitamente.

**How to apply:** 
- Después de hacer cambios principales, editar `sw.js`: cambiar `const VERSION = 'vXXX';` al siguiente número
- Hacer commit: `git commit -m "Bump sw.js vXXX→vYYY"`
- Hacer push: `git push`
- Esto va SIEMPRE, aunque el usuario no lo pida
