# Nota de Trabajo - SQLInventarioElecFP

**Estado:** v390 | Mayo 2026

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

## Agente Volt — Estado actual (v390)

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

### NLP (v388)
- `normalize(s)`: lowercase + quitar tildes + trim — usar SIEMPRE para comparar texto del usuario contra datos BD
- `detectarIntencion(q)`: sin LLM, reglas de puntuación
- `SINONIMOS`: tabla de 17 entradas del taller (multímetro=polímetro, osci=osciloscopio, fuente=fuente de alimentación…)
- `applySinonimos(words)`: expande keywords con formas canónicas y alias
- `extractKeywords(q)`: pasa por `textToNumber()` — "dos osciloscopios" = "2 osciloscopios"
- `searchInventoryCandidates()`: fuzzy por prefijo común ≥4 chars + sinónimos
- `extraerNombreItem(q)`: corta en verbos de acción y preposiciones de ubicación
- `extraerAulaDeFrase(q)`: regex "aula/clase N" + comprueba contra array AULAS
- Búsqueda de items usa `normalize()` en ambos lados

### Voz (v390)
- Botón `#ag-mic`, Web Speech API `es-ES`
- `continuous:false` + auto-session restart — evita texto basura en Android
- Pausa de 2s de silencio antes de enviar (`silenceTimer`)
- `sessionCommitted`: captura resultado final en closure propio (fix duplicado v390)
- `_voiceSent`: flag de un solo envío — evita condición de carrera timer+onend en Android
- `startSession()`: crea nueva instancia SpeechRecognition; `onend` reinicia si timer activo

### Historial chat persistente (v366)
- `HISTORY_KEY = 'volt_chat_history_v1'`, máx 40 mensajes en localStorage
- `saveHistory()` llamado en `appendMsg()` y `appendMsgHtml()`
- `restoreHistory()` en primer `renderChatReady()` con separador "— conversación anterior —"
- `limpiarPantallaChat()` borra localStorage

### Formulario préstamo (v388)
- Aviso `ag-loan-stock-warn` en tiempo real al cambiar cantidad: "⚠ Quedarán N uds. (mínimo: M)"
- Solo aparece si `qty - cantidad < min`

---

## Contenedores (v320-v325)
- Prefijo `SET-` → padre `SET-XXX-00`, hijos `SET-XXX-01..N`
- Prefijo `CONT-` → contenedor físico
- Funciones: `toggleGenerarUnidades()`, `saveGenerarUnidades()` en `modal-item.js`

---

## Sesión 25/05/2026 — Completado (v379→v390)

1. ✅ Fix vista tabla tablet: `getInvRenderMode()` + override CSS `@media(pointer:coarse) and (min-width:640px)`
2. ✅ Toast préstamos vencidos: 2.5s, más pequeño (11px) y translúcido (0.82)
3. ✅ Icono logout: SVG inline (U+23FB tenía mal soporte Android)
4. ✅ Banner loan-banner oculto en táctil (toast ya cubre el aviso)
5. ✅ Botón Imprimir topbar → `openPrintChoiceModal()` (normal + QR)
6. ✅ Al editar ítem: mantiene filtros y página del inventario (`renderInv()` en vez de `openSub()`)
7. ✅ Volt NLP: sinónimos taller, fuzzy search, `textToNumber` en keywords
8. ✅ Volt préstamo: aviso stock en tiempo real en formulario
9. ✅ Volt voz: fix duplicado Android — `_voiceSent` + `sessionCommitted`

## Sesión 24/05/2026 — Completado (v352→v374)

1. ✅ Backup D1 → `backup_20260524_1426.sql` (3.86 MB)
2. ✅ Tabla `intent_learning` creada en D1
3. ✅ Backend aprendizaje Volt: `functions/api/intent-learning.js` (GET/POST/DELETE/clear/bulk-import)
4. ✅ Frontend Volt: usa backend D1 en lugar de localStorage, migración automática
5. ✅ Fix búsqueda Volt: `normalize()` en comparación items (tildes/mayúsculas)
6. ✅ Fix voz Volt: `continuous:false` + session restart + pausa 2s silencio
7. ✅ Fix scroll panel móvil Volt: `min-height:0` + `100dvh`
8. ✅ Historial chat persistente: localStorage `volt_chat_history_v1`, máx 40 msgs
9. ✅ Foto desde cámara: botón "📷 Subir" en modal-item + Volt form con `capture="environment"`
10. ✅ Fix login flicker: inline CSS `.page:not(.active){display:none}` en `<head>`
11. ✅ Filtros activos como chips bajo barra de búsqueda (`renderActiveFilters()`)
12. ✅ Badge préstamos vencidos en navbar (`#presVencBadge`, rojo, count)

## Sesión 23/05/2026 — Completado (v317→v338)

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
- Swipe en cards móvil (préstamo/editar deslizando) — ya funciona en móvil, falta tablet
- QR directo en cada card sin abrir ítem
- Historial de cambios por ítem en modal edición
- Modo oscuro (variables CSS ya preparadas)
- Aulas ordenadas por uso reciente en home
- Búsqueda con historial de términos recientes
- Volt: sugerencias contextuales tras acción ("¿prestar otro al mismo profesor?")
- Volt: comando "¿qué está prestado ahora?" (resumen global activos)

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
| v352 | Base sesión 24/05 | 24/05/2026 |
| v353 | Backend aprendizaje Volt en D1 | 24/05/2026 |
| v354 | Fix normalize tildes/mayúsculas búsqueda Volt | 24/05/2026 |
| v355-v364 | Fixes intermedios voz/scroll | 24/05/2026 |
| v365 | Fix voz: continuous:false + session restart + 2s pause | 24/05/2026 |
| v366 | Historial chat persistente localStorage | 24/05/2026 |
| v367-v368 | Foto cámara modal-item + Volt form | 24/05/2026 |
| v372 | Fix login flicker inline CSS :not(.active) | 24/05/2026 |
| v373 | Filter chips + fix display:none!important | 24/05/2026 |
| v374 | Badge préstamos vencidos navbar | 24/05/2026 |
| v375-v379 | Easter egg robot, FAB solo icono móvil, fix scroll tablet | 25/05/2026 |
| v380 | Fix getInvRenderMode tablet (list/table) | 25/05/2026 |
| v381 | Fix CSS tabla táctil ≥640px | 25/05/2026 |
| v382 | Toast warn más discreto (2.5s, 11px, 0.82 opacity) | 25/05/2026 |
| v383 | Logout botón más visible en táctil | 25/05/2026 |
| v384 | Logout SVG inline (fix U+23FB Android) | 25/05/2026 |
| v385 | Imprimir topbar → openPrintChoiceModal | 25/05/2026 |
| v386 | loan-banner oculto en táctil | 25/05/2026 |
| v387 | Editar ítem mantiene filtros y página | 25/05/2026 |
| v388 | Volt: sinónimos, fuzzy, textToNumber, aviso stock préstamo | 25/05/2026 |
| v389-v390 | Fix voz Volt: duplicado Android (_voiceSent, sessionCommitted) | 25/05/2026 |

---

## Documentación en GitHub (`docs/`)
- `docs/DEVELOPMENT.md` — registro de sesiones de desarrollo
- `docs/ARCHITECTURE.md` — arquitectura técnica
- `docs/API.md` — endpoints del backend
- `docs/ROADMAP.md` — hoja de ruta
- `docs/SECURITY.md` — seguridad pendiente
- `docs/IDEAS.md` — ideas implementadas y pendientes
- `docs/BACKEND_APRENDIZAJE_INTENCIONES.md` — diseño sistema aprendizaje Volt
- `docs/CONTEXT.md` — contexto general del proyecto
- `.claude/memory/` — memorias de sesiones para Claude (sincronizadas con git)
- Ver: https://github.com/sebantonio/SQLInventarioElecFP
