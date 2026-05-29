---
name: features-may2026-session
description: "Features implementadas en sesión de mayo 2026 — tags management, búsqueda mejorada, modal de items"
metadata: 
  node_type: memory
  type: project
  originSessionId: 31d6730b-a718-44d3-aa37-c63cd1fa73c3
---

## Sesión Mayo 2026 — Mejoras de UX y funcionalidad

### 1. Gestión de Tags (v129)
**Archivos:** `js/config.js`, `js/modal-cats.js`, `js/modal-item.js`, `index.html`, `css/styles.css`

- **TAGS variable**: Nueva variable global para gestionar tags dinámicos (antes solo TAGS_DEFAULT)
- **Modal de categorías mejorado**:
  - Nueva sección "🏷️ Tags disponibles" en el modal de gestión de categorías
  - Input + botón "＋ Añadir" para crear tags nuevos
  - Lista de tags mostrada como badges con botones 🗑️ para eliminar
  - Confirmación si el tag se usa en ítems (muestra cuántos)
- **Autocompletado de tags**:
  - `fillTagSuggestions()` actualizado para usar TAGS + sugerencias de items
  - Al guardar item, se actualizan automáticamente las sugerencias
  - Tags se ordenan alfabéticamente

### 2. Permisos y Roles Fix (v130)
**Archivo:** `js/roles.js`

- Agregado `ubicacionesSync` a ACTION_PERMISSIONS
- Expandidos alias de roles:
  - Agregado 'jefe' como alias de admin
  - Agregado 'professor' como alias de 'profesor'
- Soluciona error "No tienes permisos para realizar esta acción" en Gestionar ubicaciones

### 3. Búsqueda e Inventario Mejorada (v131)
**Archivos:** `js/inventory.js`, `index.html`

**Búsqueda:**
- Ya buscaba en ref, tags, proveedor, ubicación pero placeholder actualizado
- Nuevo placeholder: "Buscar por nombre, ref, tags, ubicación, proveedor..."

**Nuevo filtro por tipo_material:**
- Select visible en la barra de herramientas junto a categoría y estado
- Opciones: "Todos los tipos", "Consumibles", "Inventariables"
- Integrado en `getFiltered()` — filtrado en tiempo real
- Afecta a `getPageSig()` para que las páginas se mantengan correctamente

### 4. Modal de Items — Campo Tags (v131)
**Archivos:** `js/modal-item.js`, `index.html`, `css/styles.css`

**Dropdown real de tags (no datalist):**
- `showTagsDropdown()` — muestra dropdown con 8 sugerencias
- `hideTagsDropdown()` — oculta dropdown
- `addTagFromDropdown(tag)` — agregar tag desde dropdown
- Dropdown aparece al focus/input del campo
- Se oculta al blur con delay para permitir click
- Filtra sugerencias según lo que escriba el usuario

**Validación de tags (`cleanTag()`):**
- Elimina espacios dobles
- Elimina caracteres especiales (mantiene acentos españoles)
- Limita a 50 caracteres
- Se aplica al blur del campo

**Detección automática de nuevos tags:**
- Al hacer blur del campo, detecta tags nuevos (no en TAGS)
- Los agrega automáticamente a TAGS
- Los ordena alfabéticamente
- Refresca las sugerencias

**Prevención de enter:**
- Tecla Enter no hace nada (no envía formulario)

### 5. Modal de Items — Foto Mejorada (v131)
**Archivos:** `js/modal-item.js`, `index.html`, `css/styles.css`

**Foto más grande:**
- Foto preview en modal aumentada de 92px a 120px
- Más visible y fácil de ver

**Viewer fullscreen:**
- `viewPhotoModal()` — abre modal fullscreen
- `closePhotoModal()` — cierra modal
- Click en foto abre viewer fullscreen
- Fondo oscuro semitransparente
- Botón ✕ en esquina superior derecha
- Responsive (max-height 80vh)

### 6. Mejora de Impresión (v132)
**Archivos:** `js/modal-item.js`, `index.html`, `js/roles.js`

**Etiquetas QR más pequeñas:**
- Grid cambiado de 2 a 4 columnas
- Tamaño reducido: 52mm → 40mm altura
- QR reducido: 30mm → 20mm
- Layout flex column (imagen arriba, texto abajo, centrado)
- Gaps más pequeños: 6mm → 3mm
- Fuentes ajustadas para formato compacto
- Resultado: 4 etiquetas por fila en A4

**Nuevo modal de impresión:**
- Botón "🖨️ Imprimir" visible en topbar para todos
- Modal con dos opciones:
  1. "Etiquetas QR por item" — 4 columnas con detalles completos
  2. "Solo Códigos QR" — 5 columnas formato compacto (solo QR + código)
- Funciones:
  - `openPrintModal()` / `closePrintModal()`
  - `printFromModal(type)` — routing según tipo
  - `printBulkQrLabels()` — formato compacto 5 columnas
- Modal styling coherente con otros modales

### 7. Fix Modal de Impresión (v133)
**Archivo:** `js/modal-item.js`

**Problemas solucionados:**
- Botón imprimir en home no abría modal (cf era null)
- Modal se abría pero no ejecutaba impresión

**Cambios:**
- `openPrintModal()` ahora usa `getFiltered()` sin depender de `cf`
- Valida que hay datos antes de abrir modal
- `printFromModal()` valida datos antes de imprimir
- Ambas funciones de impresión ya usaban datos correctos

**Resultado:** Botón de imprimir funciona desde cualquier contexto (home, aula, categoría, etc)

## Commits de esta sesión
**Sesión 1:**
1. `2bdbdee` — Add tags management and autocomplete (v128→v129)
2. `76f98f1` — Add ubicacionesSync to ACTION_PERMISSIONS (v129)
3. `005454c` — Bump SW to v130
4. `6c24dc7` — Improve search and item modal UX (v130→v131)
5. `aaec1c1` — Bump SW to v131
6. `95e61dd` — Improve QR label printing and add print modal (v131→v132)
7. `1d96eab` — Bump SW to v132
8. `29df937` — Fix print modal data handling (v132→v133)
9. `c614fbf` — Bump SW to v133
10. `29eed30` — Remove duplicate print modal (v133→v134)

**Sesión 2:**
11. `8fd7454` — Separate print inventory and print QR modals (v134→v135)
12. `be4f995` — Fix: Imprimir QR button opens QR print modal (v135→v136)
13. `bae6c39` — Fix: Remove duplicate openPrintModal/closePrintModal (v136→v137)
14. `6b95c3f` — Update search placeholder to show all searchable fields (v137→v138)
15. `76145f9` — Add unsaved changes indicator in item modal (v138→v139)

## Notas técnicas
- TAGS se guarda en memoria (no persiste en BD) — se recarga desde items al recargar app
- Tags dropdown usa datalist como fallback (navegadores antiguos)
- `cleanTag()` preserva acentos españoles (á, é, í, ó, ú, ñ)
- Foto fullscreen modal tiene `background:transparent` para que se vea solo la imagen
- Todos los cambios son progresivos — no rompen navegadores antiguos

## Session 2 — Correcciones y mejoras (v134→v139)

### 8. Fix: Modales de impresión separados (v134)
- **Problema:** Dos modales de impresión con mismo ID causaban conflicto
- **Solución:** 
  - Modal `mPrint` para impresión de inventario (con checkboxes de columnas)
  - Modal `mPrintQr` para impresión de etiquetas QR (con opciones de formato)
  - Botón "Imprimir QR" en toolbar de aula abre `openPrintQrModal()`
  - Botón "🖨️ Imprimir" abre modal de inventario con checkboxes

### 9. Fix: Duplicado de funciones openPrintModal/closePrintModal (v137)
- **Problema:** Funciones duplicadas en modal-item.js sobrescribían las de inventory.js
- **Solución:** Eliminadas las duplicadas, se usan las de inventory.js
- **Impacto:** Modal de inventario ahora funciona correctamente con lista de checkboxes

### 10. Mejora: Placeholder de búsqueda (v138)
- Actualizado placeholder del input global de búsqueda
- Nuevo texto: "Buscar por nombre, ref, tags, ubicación, proveedor…"
- Indica al usuario qué campos se buscan

### 11. Feature: Indicador de cambios sin guardar (v139)
**Archivos:** `js/modal-item.js`

**Funcionalidad:**
- Variable `modalHasChanges` rastrea si hay cambios pendientes
- Puntito rojo (●) aparece en título cuando hay cambios
- Detecta cambios en: ref, aula, nombre, cantidad, min, tipo_material, categoría, ciclo, módulo, ubicación, estado, utilidad, proveedor, tags, fecha, mantenimiento, observaciones, contenedor, parent_id
- Confirmación al cerrar: "¿Descartar cambios?" si hay cambios sin guardar
- Funciones:
  - `markModalAsChanged()` — marca como cambiado
  - `updateModalIndicator()` — actualiza el puntito rojo
  - `captureModalOriginalValues()` — guarda valores iniciales
  - `attachModalChangeListeners()` — añade listeners a campos
  - `checkModalForChanges()` — verifica si hay cambios
  - `closeM()` — mejorado con confirmación
- Resetea automáticamente al guardar o cerrar
