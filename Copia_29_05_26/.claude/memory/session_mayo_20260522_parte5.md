---
name: session_mayo_20260522_parte5
description: "SuperAdmin ocultar items, QR config, UI breadcrumb visual, pill eliminada (v249→v260)"
metadata: 
  node_type: memory
  type: project
  originSessionId: 1646936c-a684-49b1-b67e-b1b972667855
---

Sesión 22/05/2026 (continuación larga, v249→v260).

**Funcionalidades implementadas:**

1. **SuperAdmin: ocultar items** (v249→v252)
   - Permiso `visibility.manage` en `SUPERADMIN_ONLY` — excluido del wildcard `['*']`
   - Botón ojo por fila solo visible para superadmin
   - `list.js` y `item.js`: columna `oculto`, filtro para no-superadmin, acción `toggleOculto`
   - Fix crítico: `data?.user || request.user` en Cloudflare Pages Functions (request es inmutable)
   - Clase `.item-oculto` con overlay visual (gradient + badge)

2. **Stat card "ocultos"** en home (SuperAdmin only)

3. **Hash routing** `#ocultos` → `goOcultos()`

4. **Protección rol SuperAdmin en usuarios.js**: evitar sobreescribir con label enmascarada

5. **QR print mejorado** (v252→v256)
   - Modal config campo-selección + filtro Consumible/Inventariable, 5 columnas
   - "Solo QR" imprime directo 6 columnas sin config
   - Botón "Etiquetas QR por ítem" abre modal; "Solo Códigos QR" imprime directo

6. **UI sub-header** (v256→v260)
   - Eliminado botón "Inicio" del topbar (redundante con brand logo)
   - Breadcrumb `#subBc` en sub-header: "Inicio › Aula › Aula 35"
   - Botones action-strip compactos con `!important`
   - Eliminada pill `sub-tag` (AULA/CATEGORÍA) — redundante con breadcrumb
   - Breadcrumb visual: fuente 14px, links con fondo pill, separador sutil, bc-current bold 800

**Why:** Progresión normal de features de la sesión.
**How to apply:** v260 es el estado actual. Próximas features: ocultar aulas/ciclos/módulos.
