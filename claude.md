# Nota de Trabajo - SQLInventarioElecFP

**Estado:** v354 | Mayo 2026

---

## Contexto Actual

### Modo de Operación
- Base de datos: **Cloudflare D1 remota** (no local, ID: `5e996989-1972-481e-a43a-136e25380906`)
- Deployment: Git push → Cloudflare Pages auto-deploya
- Frontend: Vanilla JS + HTML5 + CSS3 (sin frameworks)
- Backend: Cloudflare Workers serverless (`functions/api/`)

### Workflow Estándar
1. Editar código localmente
2. Cambiar `VERSION` en `sw.js` (vXXX → vXXX+1)
3. `git add` archivos concretos + `git commit -m "..."`
4. `git push origin main`
5. Cloudflare Pages despliega automáticamente
6. Usuarios reciben actualización (SW cache-bust)

### Entorno
- **Terminal:** PowerShell en VS Code
- **Node TLS (red corporativa):** `$env:NODE_TLS_REJECT_UNAUTHORIZED="0"` antes de comandos wrangler
- **Wrangler:** `npx wrangler` (instalado global en npm)
- **Git remotes:** `origin` → sebantonio/SQLInventarioElecFP (principal)
- **D1 backup:** `npx wrangler d1 export inventario-departamento --remote --output backup_FECHA.sql`

---

## Arquitectura de archivos clave

```
functions/api/          — Cloudflare Pages Functions (backend)
  _middleware.js        — Auth: lee u+p o u+token de query params, pasa user via data.user
  intent-learning.js    — NUEVO: aprendizaje Volt en D1
  prestar.js, item.js, list.js, historial.js, usuarios.js...

js/
  agente-widget.js      — Agente Volt (NLP, chat, voz, aprendizaje)
  inventory.js          — Inventario principal, filtros, vistas
  modal-item.js         — Modal edición/creación items, contenedores SET-/CONT-
  roles.js              — Permisos por rol
  config.js             — CICLOS, AULAS, CATS (se sobreescriben con datos D1 al login)
  state.js              — Estado global SESSION

sw.js                   — Service Worker, VERSION aquí
migrations/             — SQL de migraciones D1
  intent_learning.sql   — Tabla aprendizaje Volt
```

---

## Auth actual (CRÍTICO pendiente)
- Credenciales van en query params `?u=usuario&p=password` — visible en logs/historial
- `_middleware.js` valida contra D1 y pasa `data.user` al handler
- **No usar `request.user`** — es inmutable en Workers, siempre leer de `data.user`

---

## Agente Volt — Estado actual (v354)

### Archivos
- `js/agente-widget.js` — todo el widget (NLP, chat, voz, aprendizaje)

### Aprendizaje de intenciones (backend D1)
- Tabla `intent_learning` en D1 (creada 24/05/2026)
- Endpoint `functions/api/intent-learning.js`: GET / POST / DELETE / clear / bulk-import
- Al abrir panel: carga desde backend, migra localStorage automáticamente una vez (flag `volt_intents_migrated_v1`)
- UI optimista: actualiza estado en memoria antes de confirmar backend
- Fallback: localStorage si backend falla

### Intenciones válidas (whitelist)
`prestamo | devolver | stock | estado | mantenimiento | buscar | resumen_aula | quien_tiene | stock_bajo | lista_mantenimiento`

### NLP
- `normalize(s)`: lowercase + quitar tildes + trim — usar SIEMPRE para comparar texto del usuario contra datos BD
- `detectarIntencion(q)`: sin LLM, reglas de puntuación
- `extraerNombreItem(q)`: corta en verbos de acción y preposiciones de ubicación
- `extraerAulaDeFrase(q)`: regex "aula/clase N" + comprueba contra array AULAS
- `extraerUbicacionDeFrase(q)`: regex armario/estantería/vitrina + busca en `state.inventario`
- Búsqueda de items usa `normalize()` en ambos lados (fix v354 — antes solo `.toLowerCase()`)

### Voz
- Botón `#ag-mic`, Web Speech API `es-ES`, auto-envía al resultado final

---

## Contenedores (v320-v325)
- Prefijo `SET-` → padre `SET-XXX-00`, hijos `SET-XXX-01..N`
- Prefijo `CONT-` → contenedor físico
- Funciones: `toggleGenerarUnidades()`, `saveGenerarUnidades()` en `modal-item.js`

---

## Sesión 24/05/2026 — Completado

1. ✅ Backup D1 → `backup_20260524_1426.sql` (3.86 MB)
2. ✅ Tabla `intent_learning` creada en D1
3. ✅ Backend aprendizaje Volt: `functions/api/intent-learning.js` (GET/POST/DELETE/clear/bulk-import)
4. ✅ Frontend Volt: usa backend D1 en lugar de localStorage, migración automática
5. ✅ Fix búsqueda Volt: `normalize()` en comparación items (tildes/mayúsculas)

## Sesión 23/05/2026 — Completado

1. ✅ Ciclo/Módulo full-width en PC, alias en móvil
2. ✅ Vista tabla/cards toggle (PC) — móvil siempre cards
3. ✅ Contenedores SET-XXX-00 + hijos en un paso
4. ✅ Bulk delete doble confirmación + cuenta atrás 5s
5. ✅ Agente Volt expandido: devolver, stock, estado, mantenimiento, consultas NL
6. ✅ Reconocimiento de voz (micrófono, Web Speech API es-ES)

---

## Pendiente (Próximas sesiones)
- FASE 1 seguridad: Bearer tokens, password hashing, rate-limiting
- Crear branch `feature/security-refactor`

---

## Modo Ahorro de Tokens
- Respuestas cortas y directas (100-200 tokens por defecto)
- Solo archivos indicados, sin exploración automática
- Solo bloques modificados, no archivos completos
- Sin explicaciones salvo que se pidan

---

## Versionado reciente

| Versión | Cambios | Fecha |
|---------|---------|-------|
| v338 | Reconocimiento de voz (micrófono) | 23/05/2026 |
| v339-v351 | (intermedias) | 23-24/05/2026 |
| v352 | (base sesión 24/05) | 24/05/2026 |
| v353 | Backend aprendizaje Volt en D1 | 24/05/2026 |
| v354 | Fix normalize tildes/mayúsculas en búsqueda Volt | 24/05/2026 |

---

## Documentación en GitHub
- DEVELOPMENT.md, ARCHITECTURE.md, API.md, ROADMAP.md, SECURITY.md
- BACKEND_APRENDIZAJE_INTENCIONES.md — diseño del sistema de aprendizaje Volt
- Ver: https://github.com/sebantonio/SQLInventarioElecFP
