---
name: commit-push-auto
description: Hacer commit y push automáticamente (a los dos repos) sin pedir confirmación
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 1646936c-a684-49b1-b67e-b1b972667855
---

Al terminar cualquier cambio de código, hacer **commit y push siempre, sin preguntar**. El push debe llegar a **los dos repos** (sebantonio y slatorre-dev).

**Why:** El usuario lo pidió explícitamente para agilizar el flujo y porque ambos repos deben quedar siempre idénticos. Ver [[feedback_github_always]] y [[feedback_sw_bump]].

**How to apply:**
- `origin` ya tiene doble URL de push configurada, así que un `git push` normal sube a ambos repos a la vez. Verificar con `git remote -v` si hay dudas.
- Seguir bumpeando `sw.js` antes del commit cuando el cambio afecta a la app (no para cambios solo-docs como CONTEXT.md).
- No hace falta pedir "¿hago commit+push?" — hacerlo directamente al cerrar cada cambio.
- **Guardar solo en GitHub, nunca quedarse en local.** Si hay cambios sin push, el trabajo no está guardado.
