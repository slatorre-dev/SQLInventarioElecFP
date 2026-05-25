---
name: project-ciclos-bd-override
description: AULAS/CICLOS/CATS/UBICACIONES definidos en config.js se sobreescriben con datos de la BD remota al hacer login
metadata: 
  node_type: memory
  type: project
  originSessionId: e3bf5473-fd1c-4fdc-9e0c-c677e50c1891
---

Las constantes globales `CICLOS`, `AULAS`, `UBICACIONES` y categorías están definidas en js/config.js, PERO se sobreescriben con datos de la base de datos D1 remota tras el login (ver js/auth.js, función que procesa `meta`: `if(meta.ciclos && meta.ciclos.length) CICLOS = meta.ciclos`).

**Por qué importa:** Si añades un campo nuevo a un objeto en config.js (ej. `alias` en un ciclo), ese campo NO existirá en runtime porque la versión de la BD remota lo reemplaza y no lo tiene.

**How to apply:** Para propiedades derivadas/fijas que deben sobrevivir al override de la BD, usa un mapa indexado por `id` (el id sí es estable entre config y BD) en lugar de añadir el campo al objeto. Ejemplo: `CICLO_ALIAS = {gm_telecom:'IT', gm_electric:'IEA', gs_mantelec:'ME', gs_sea:'SEA'}` con helper `cicloAlias(c)` en config.js. El value interno de los módulos sigue el formato `cicloId__codigo` — no cambiarlo al editar el texto visible, o se rompen los datos guardados.
