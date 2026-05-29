---
name: session_mayo_20260525
description: "Sesión 25/05/2026 — fixes tablet, usabilidad inventario, mejoras Volt (v379→v390)"
metadata: 
  node_type: memory
  type: project
  originSessionId: 0def6041-5f0f-4d4f-8a62-5d4c6a66d71b
---

# Sesión 25/05/2026 — v379 → v390

## Fixes tablet/móvil
- **v380**: `getInvRenderMode()` devolvía siempre 'cards' en tablet con view='list' — corregido para respetar view='list' y view='table'
- **v381**: `.tw{display:none!important}` en `@media(hover:none),(pointer:coarse)` ocultaba la tabla en tablets táctiles — añadido override `@media(hover:none) and (min-width:640px)` para mostrarla
- **v382**: Toast de préstamos vencidos al inicio reducido a 2.5s, más pequeño (11px) y translúcido (0.82)
- **v383**: Icono cerrar sesión `⏻` (U+23FB, mal soporte Android) reemplazado por SVG inline. Tamaño 20px en táctil con `color:var(--text)`
- **v386**: Banner loan-banner oculto en móvil y tablet táctil con `display:none!important` — el toast ya cubre ese aviso

## Mejoras inventario
- **v385**: Botón Imprimir del topbar llamaba a `openPrintModal()` directamente — ahora llama a `openPrintChoiceModal()` (normal + QR), igual que en aulas
- **v387**: Al guardar edición de ítem, ya no llama `openSub()` (que reseteaba filtros y página) — ahora solo `renderInv()` + `renderSubStats()`. Los filtros y la página del inventario se mantienen tras editar.

## Mejoras agente Volt
- **v388**: 4 mejoras NLP:
  1. Tabla `SINONIMOS` con 17 entradas del taller (multímetro=polímetro, osci=osciloscopio, fuente=fuente de alimentación, etc.)
  2. `extractKeywords()` pasa por `textToNumber()` — "dos osciloscopios" funciona igual que "2 osciloscopios"
  3. `applySinonimos()` expande keywords con formas canónicas y alias antes de buscar
  4. Fuzzy matching en `searchInventoryCandidates()` — prefijo común ≥4 chars suma puntuación
  5. Aviso stock en formulario préstamo: `ag-loan-stock-warn` muestra "⚠ Quedarán N uds. (mínimo: M)" en tiempo real al cambiar cantidad
- **v389**: Flag `_voiceSent` para evitar envío doble (condición de carrera timer+onend en Android)
- **v390**: Reescritura acumulación texto voz — `sessionCommitted` captura resultado final en closure propio; `onend` no acumula si `_voiceSent`; `silenceTimer=null` al disparar evita que `onend` lo vea como activo

## Versiones
v379 → v380 → v381 → v382 → v383 → v384 → v385 → v386 → v387 → v388 → v389 → v390

**Why:** Sesión de fixes de usabilidad tablet/móvil + mejoras NLP Volt basadas en uso real
**How to apply:** Ver [[feedback_sw_bump]] y [[feedback_commit_push_auto]] para workflow de commits
