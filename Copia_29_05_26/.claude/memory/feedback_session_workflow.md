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

## Sincronización entre PCs con Junction (desde 25/05/2026)
Una sola carpeta — junction Windows hace que Claude y el repo lean del mismo sitio.

**Cómo está configurado en este PC:**
```
C:\Users\PC\.claude\projects\...\memory\  →  (junction)  →  .claude\memory\ del repo
```
Git push/pull sincroniza todo automáticamente. No hay que copiar nada.

**Al empezar en un PC NUEVO (hacerlo una sola vez):**
```powershell
# 1. Clonar o pullear el repo
git clone https://github.com/sebantonio/SQLInventarioElecFP
# (o git pull si ya existe)

# 2. Crear la carpeta del proyecto en Claude si no existe
$proj = "C:\Users\TU_USUARIO\.claude\projects\d--OneDrive---Consejer-a-de-Educaci-n--Cultura-y-Deportes-Castilla-La-Mancha-Github-SQLInventarioElecFP"
New-Item -ItemType Directory -Force $proj

# 3. Crear junction (ajustar ruta del repo)
$repoMemory = "RUTA_AL_REPO\.claude\memory"
New-Item -ItemType Junction -Path "$proj\memory" -Target $repoMemory
```

**Al terminar cada sesión:** solo `git add .claude/memory/ && git commit && git push` — las memorias ya están en el repo.

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
