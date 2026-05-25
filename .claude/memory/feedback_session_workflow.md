---
name: feedback-session-workflow
description: "Workflow y approach efectivo para sesiones de desarrollo — priorizar memoria, commits atómicos, SW bumps"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 31d6730b-a718-44d3-aa37-c63cd1fa73c3
---

## Workflow efectivo para sesiones de desarrollo

**Rule:** Siempre actualizar memory.md al final de la sesión. Cada feature implementada debe tener:
1. Archivo de memory con detalles técnicos
2. Entrada en MEMORY.md index
3. Commits atómicos (una feature = un/varios commits lógicos)
4. SW version bump + push con cada set de cambios
5. **Sincronizar memorias al repo**: copiar `C:\Users\PC\.claude\projects\...\memory\*.md` → `.claude/memory/` del repo y hacer commit — permite trabajar en otro PC con contexto completo

## Sincronización entre PCs (desde 25/05/2026)
Las memorias viven en DOS sitios que hay que mantener sincronizados:
- **Local Claude**: `C:\Users\PC\.claude\projects\...\memory\` — las usa Claude automáticamente
- **Repo Git**: `.claude/memory/` — se sincronizan con git push/pull

**Al empezar en un PC nuevo:**
1. `git pull origin main`
2. Copiar `.claude/memory/*.md` → `C:\Users\PC\.claude\projects\...\memory\`

**Al terminar sesión:**
1. Crear/actualizar archivos en `C:\Users\PC\.claude\projects\...\memory\`
2. Copiar todos al repo: `Copy-Item "C:\Users\PC\.claude\projects\...\memory\*.md" ".claude\memory\" -Force`
3. `git add .claude/memory/ && git commit -m "docs: sync memorias" && git push`

**Why:** La memoria ayuda a recordar en futuras sesiones:
- Qué se implementó y dónde
- Decisiones técnicas y por qué
- Cómo está organizado el código
- Sin necesidad de leer git history completo

**How to apply:** 
- Al terminar cambios importantes, crear archivo memory
- Actualizar MEMORY.md inmediatamente (no dejar para después)
- Antes de terminar sesión: verificar que memory está actualizada
- Esto hace rápido empezar siguiente sesión sin "qué se hizo aquí?"

## Estructura de features en memory
Incluir siempre:
- Qué archivos se modificaron
- Qué funciones se crearon/modificaron
- Cambios en HTML/CSS
- Notas técnicas importantes
- Lista de commits de esa sesión

## Priorización de mejoras
Cuando hay múltiples mejoras sugeridas:
1. Primero agrupar por area (búsqueda, modal, etc)
2. Implementar en orden de impacto
3. Hacer commits separados por feature
4. Cada commit = una feature completa (no a mitad)
5. SW bump + push después de cada feature o grupo coherente
