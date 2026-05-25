---
name: session_mayo_20260524
description: "Sesión 24/05/2026 — backup D1, intent_learning, Volt backend, fix normalize, voz, historial chat, foto cámara, login flicker, filter chips, badge préstamos vencidos (v352→v374)"
metadata:
  node_type: memory
  type: project
  originSessionId: sesion-20260524
---

## Sesión 24/05/2026 (v352→v354)

### 1. Backup D1 antes de migrar
- Comando: `$env:NODE_TLS_REJECT_UNAUTHORIZED="0"; npx wrangler d1 export inventario-departamento --remote --output "backup_FECHA.sql"`
- Necesario porque red corporativa tiene proxy con CA propio (error UNABLE_TO_VERIFY_LEAF_SIGNATURE)
- Wrangler necesita `wrangler login` previo (abre navegador — no funciona desde Claude)
- Backup generado: `backup_20260524_1426.sql` (3.86 MB, schema + datos completos)

### 2. Tabla intent_learning en D1 (v352 área)
- Migración: `migrations/intent_learning.sql`
- Ejecutada con: `npx wrangler d1 execute inventario-departamento --remote --file migrations/intent_learning.sql`
- 5 queries: tabla + 4 índices. BD pasó de 13 a 14 tablas.
- Índice UNIQUE(user_id, phrase_norm, intent) — permite upsert sin duplicados

### 3. Backend aprendizaje Volt (v353)
- Archivo: `functions/api/intent-learning.js`
- Endpoints: GET / POST / DELETE /:id / POST /clear / POST /bulk-import
- user_id derivado de `data.user` (middleware) — nunca del body del cliente
- Whitelist de intents: prestamo, devolver, stock, estado, mantenimiento, buscar, resumen_aula, quien_tiene, stock_bajo, lista_mantenimiento
- Límite 300 registros/usuario — borra el de menor weight si se supera
- Normalización de frases: lowercase + sin tildes + trim + solo alfanumérico

### 4. Frontend aprendizaje Volt (v353)
- `cargarAprendizajes(callback)`: ahora asíncrono, carga desde backend, fallback localStorage
- `guardarAprendizaje()`: UI optimista + POST backend, fallback localStorage si falla
- `borrarAprendizajesGuardados()`: llama POST /clear en backend
- `deshacerUltimaEnsenanza()`: llama DELETE /:id si tiene id del backend
- Al abrir panel (`openPanel()`): llama `cargarAprendizajes()` si no está cargado (flag `LEARN_LOADED`)
- Migración automática desde localStorage: bulk-import una sola vez (flag `volt_intents_migrated_v1`)

### 5. Fix búsqueda Volt — normalize tildes/mayúsculas (v354)
- Problema: búsqueda usaba `.toLowerCase()` pero no quitaba tildes
- "mantenimiento electronico" no encontraba "Mantenimiento Electrónico"
- Fix: usar `normalize()` en lugar de `.toLowerCase()` en filtro principal de items y en sugerencias autocomplete
- `normalize(s)` = lowercase + NFD + quitar diacríticos + trim

**Why:** La búsqueda fallaba con nombres reales del inventario que tienen tildes o mayúsculas.
**How to apply:** Siempre usar `normalize()` para comparar texto de usuario contra datos de BD en el agente Volt.

---

## Sesión 24/05/2026 — Parte 2 (v355→v374)

### 6. Fix voz Volt — pausa 2s + session restart (v365 área)
- Problema: `continuous:true` con `interimResults:true` generaba texto basura en Android
- Fix: `continuous:false` + auto-session restart acumulando transcripts entre sesiones
- Patrón: `startSession()` crea nueva instancia SpeechRecognition; `onend` reinicia si hay silenceTimer activo
- `silenceTimer` de 2s: al parar de hablar espera 2s antes de enviar

### 7. Scroll panel móvil Volt (v365 área)
- Problema: panel no hacía scroll en móvil — `min-height:0` faltaba en flex children
- Fix CSS: `.ag-body`, `.ag-panel`, `.ag-messages` con `min-height:0` + `overflow-y:auto`
- `#ag-tab-chat { overflow:hidden }`, elementos fijos con `flex-shrink:0`
- `#agente-panel` usa `height:100dvh; max-height:100dvh`
- Formulario nuevo ítem: `overflow:visible` sin max-height (scroll lo gestiona `.ag-messages`)

### 8. Historial de chat persistente Volt (v366 área)
- `HISTORY_KEY = 'volt_chat_history_v1'`, máx 40 mensajes en localStorage
- `saveHistory(role, content)`: guarda en localStorage, recorta a 40
- `restoreHistory()`: restaura mensajes con separador "— conversación anterior —"
- Flag `_historyRestored` evita doble restauración
- `limpiarPantallaChat()` borra `HISTORY_KEY` del localStorage

### 9. Foto desde cámara en modal-item y Volt (v367-v368 área)
- `index.html`: input file oculto + botón "📷 Subir" visible en item-stock-strip (siempre visible, no en photo-col)
- `modal-item.js`: `fotoFileChanged(input)` → `setMainPhotoFromFile()`; `fotoPreviewClick()` → ver foto o abrir picker
- Volt form: botón estilizado `.ag-new-item-foto-btn` + input oculto `.ag-new-item-foto` con `capture="environment"`

### 10. Fix login flicker — inline CSS crítico (v372)
- Problema: form de login visible ~2s antes del overlay
- Fix: `<style>.page:not(.active){display:none}</style>` en `<head>` de index.html
- IMPORTANTE: usar `:not(.active)` NO `!important` — el `!important` rompe `.page.active{display:block}`
- El bug del blank screen de v373 fue causado por haber usado `display:none!important` que sobreescribía `.page.active`

### 11. Filtros activos como chips (v373)
- `#activeFiltersBar` div en index.html entre toolbar y bulkbar
- `renderActiveFilters()` en inventory.js: chips para texto búsqueda, categoría, tipo, estado
- Cada chip tiene × para quitar filtro individual; "✕ Limpiar todo" si hay >1
- CSS: `.filter-chip`, `.filter-chip-x`, `.filter-chip-clear` (light + dark mode)
- Llamada al inicio de `renderInv()`

### 12. Badge préstamos vencidos en navbar (v374)
- `#presVencBadge` span en botón `#btnPres` de topbar (posición absolute, top-right)
- `updatePresVencBadge()` en prestamos.js: muestra count rojo, oculto si 0
- Llamado en: carga de datos (`auth.js` tras asignar `prestamos`), inicio de `renderPrestamos()`

### Versiones sesión 24/05 parte 2
| Versión | Cambios |
|---------|---------|
| v355-v364 | (intermedias — fixes menores voz/scroll) |
| v365 | Fix voz 2s pause + session restart |
| v366 | Historial chat persistente localStorage |
| v367-v368 | Foto cámara modal-item + Volt form |
| v372 | Fix login flicker inline CSS crítico |
| v373 | Filter chips + fix display:none!important |
| v374 | Badge préstamos vencidos navbar |
