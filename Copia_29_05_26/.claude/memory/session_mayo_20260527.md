---
name: session_mayo_20260527
description: "Sesión 27/05/2026 — Historial visual con timeline, botón en home, click navega a ítem, limpieza topbar (v417→v423)"
metadata: 
  node_type: memory
  type: project
  originSessionId: 20c73f39-0544-4fa0-9011-50fdc8583db0
---

# Sesión 27/05/2026 — v417 → v423

## Página historial visual
- **v420**: Nueva página `pHistorialPage` accesible desde botón "📋 Historial" en panel acciones rápidas home (solo admin/superadmin/seba via `canAccessHistorial()`)
- Timeline agrupado por día ("Hoy", "Ayer", fecha completa). Avatar circular de color por tipo de acción. Frase natural: "Juan editó **Multímetro #3**". Hora a la derecha. Barra búsqueda + filtro por tipo.
- **v421**: Filas con itemId clicables → `openItemRoute(itemId)`. Hover: fondo azul + flecha `→`. Préstamos/devoluciones/importaciones NO son clicables.
- **v417-v419**: Feed chips en home — descartado (estéticamente no encajaba), reemplazado por la página completa.

## Limpieza topbar
- **v422**: `conn-status` reducido a solo punto de color. Texto pasa a `el.title` (tooltip). `#connTxt` eliminado del HTML. Botón QR topbar eliminado (ya está en buscador, era duplicado). `btnQr` eliminado de la lista en `roles.js`.
- **v423**: Botón recargar 🔄 (`#btnReload`) eliminado — F5 cumple la función.

## Archivos modificados
- `index.html` — nueva página pHistorialPage, botón historial en acciones rápidas, conn-status sin texto, sin btnQr, sin btnReload
- `js/modal-historial.js` — funciones `goHistorialPage()`, `hpRender()`, `hpFilter()`, helpers `_hpClass/_hpIcon/_hpVerb/_hpDayLabel/_hpTime`
- `js/roles.js` — `showHistorialButton()` muestra también `btnGoHistorial`; eliminado `btnQr` de rules
- `js/state.js` — `setConn()` usa `el.title` en vez de `#connTxt`
- `js/home.js` — eliminado feed de actividad (código chips), `renderHome()` limpio
- `css/styles.css` — estilos `.hp-*` para página historial; `.conn-status` simplificado a solo punto

**Why:** El feed de chips en home no era informativo ni estético. La página completa con timeline es más útil y coherente con el diseño.
**How to apply:** Ver [[feedback_sw_bump]] y [[feedback_commit_push_auto]] para workflow.
