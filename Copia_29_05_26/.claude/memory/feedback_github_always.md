---
name: github_always_save
description: Siempre guardar cambios en GitHub al final de cada sesión
metadata: 
  node_type: memory
  type: feedback
  originSessionId: c40cce15-20c6-44dd-8a86-a7ccee0b90a6
---

**Regla:** Al final de CADA sesión, guardar TODOS los cambios en GitHub (commit + push).

**Why:** El usuario quiere poder trabajar desde otro PC y tener acceso a:
- Código (ya estaba en GitHub)
- Memoria de desarrollo (.claude/memory/)
- Historial de cambios

**How to apply:** 
- Después de hacer cambios significativos, siempre:
  1. `git add -A`
  2. `git commit -m "mensaje descriptivo"`
  3. `git push`
- NO dejar cambios sin commitear al final de la sesión
- La memoria local en `C:\Users\PC\.claude\projects\...\memory\` se sincroniza con `.claude/memory/` en GitHub

**Workflow:**
1. Hacer cambios en código/memoria local
2. Antes de terminar: push a GitHub
3. Próxima sesión en otro PC: pull del repo, memoria automáticamente disponible
