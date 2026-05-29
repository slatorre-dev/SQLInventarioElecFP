---
name: feature-auditoria-datos
description: "Modal \"Auditoría de datos\" para limpiar items con campos faltantes (v159)"
metadata: 
  node_type: memory
  type: project
  originSessionId: f6cf9507-b703-456c-bf7b-de293edd12ac
---

## Feature: Auditoría de Datos (v159)

**Introducción:** Modal para identificar y limpiar items del inventario que tengan campos incompletos.

## Archivos afectados
- `index.html` — botón en menú Departamento + HTML del modal
- `js/modal-auditoria.js` — lógica de la auditoría (nuevo)
- `sw.js` — bump v159→v161 (dos iteraciones)

## Cómo funciona

### Ubicación en UI
- **Menú:** Departamento → "🔍 Auditoría de datos" (debajo de "Historial de acciones")
- **Permisos:** Solo admin/jefe (protegido por `data-perm="config.manage"`)

### Modal
**ID:** `mAuditoria`

**Componentes:**
1. **Botones de filtro:** Todos, Sin categoría, Sin módulo, Sin aula, Sin referencia, Sin ubicación, Sin proveedor
   - Cada botón muestra contador: "Sin módulo (18)"
   - Click actualiza el filtro y tabla
   
2. **Información:** "32 items con campos faltantes" o "(de 32 total)" cuando hay filtro

3. **Tabla:** Columnas: ☑ (checkbox), Ref, Nombre, Aula, Campos faltantes, Acción
   - Checkbox en cada fila para seleccionar items
   - Badge con campos que faltan: "Categoría, Módulo"
   - Botón ✏️ Editar individual → abre `openModal(itemId)` (no cierra auditoría)

4. **Edición en lote:**
   - Botón "☐ Seleccionar todos" — toggle select all
   - Botón "✏️ Editar seleccionados" (solo aparece si hay items seleccionados)
   - Click llama `openBulkEditModal(ids)` de inventory.js

4. **Estado vacío:** "No se encontraron problemas ✓"

### Campos auditados

**Críticos (prioritarios):**
- `cat` → Categoría
- `mod` → Módulo/Ciclo
- `aula` → Aula

**Secundarios:**
- `ref` → Referencia
- `loc` → Ubicación
- `proveedor` → Proveedor

### Lógica

**Variables globales (en modal-auditoria.js):**
```js
const CAMPOS_CRITICOS = [...]
const CAMPOS_SECUNDARIOS = [...]
let auditoriaData = []  // items con problemas
let auditoriaFiltroActual = 'all'  // filtro activo
```

**Funciones principales:**
- `openAuditoriaModal()` — abre modal, carga auditoría
- `closeAuditoriaModal()` — cierra modal
- `cargarAuditoria()` — analiza `items`, llena `auditoriaData`, limpia seleccionados
- `getItemProblemas(item)` — retorna array de campos faltantes
- `renderAuditoria(filtro)` — renderiza tabla según filtro, con checkboxes y contador de seleccionados
- `filtrarAuditoria(filtro)` — cambia filtro y re-renderiza
- `updateFiltroButtons()` — actualiza contadores en botones de filtro
- `toggleAuditoriaItem(itemId)` — checkbox individual, muestra/oculta botón de edición en lote
- `abrirItemParaEditar(itemId)` — llama `openModal(itemId)` para editar individual
- `editarSeleccionados()` — llama `openBulkEditModal(ids)` para edición en lote
- `seleccionarTodos()` — toggle de "Seleccionar todos"

**Sin nuevo endpoint API:** usa `items` cargado en memoria desde `apiGet('list')` (eficiencia).

## v161 — Checkboxes y edición en lote
- Checkboxes en cada fila
- Botones: "☐ Seleccionar todos" + "✏️ Editar seleccionados"
- Contador de seleccionados en info

## v162 — Fix z-index y bulk edit
- Modal de edición ahora aparece encima de auditoría
- Bulk edit integrado con `bulkSelected` de inventory.js

## v163 — Agrupación por categoría/aula
- Toggle "Agrupar por: Sin agrupar / Categoría / Aula" en barra de filtros
- **Vista agrupada:** grupos colapsables con:
  - Cabecera: "Aula 35 — 12 items" | "Categoría Componentes — 45 items"
  - Toggle ▼/▶ para expandir/colapsar grupo
  - Checkbox de grupo → selecciona todos los items del grupo de una vez
  - Grupos ordenados de más a menos items (los problemáticos primero)
- **Combinable con filtros:** "Sin módulo" agrupado por "Aula" muestra grupos con solo items de ese problema
- Mantiene estado de colapso al cambiar filtros
- Funciones nuevas:
  - `agruparAuditoria(modo)` — cambia modo de agrupación
  - `getGrupos(items)` — agrupa y ordena items
  - `renderAuditoriaFilas()` — renderiza vista normal
  - `renderAuditoriaAgrupada()` — renderiza vista agrupada con headers
  - `toggleGrupoAuditoria(key)` — expandir/colapsar grupo
  - `seleccionarGrupo(key)` — selecciona/deselecciona todos del grupo

## Testing
1. Login como admin → abrir Departamento → ver botón "🔍 Auditoría de datos"
2. Click → modal se abre, muestra items con campos vacíos
3. Probar filtros → actualiza tabla y contadores
4. Click "✏️ Editar" → se abre modal del item (sin cerrar auditoría)
5. Login como profesor → botón NO aparece (permisos correctos)

## Notas
- Si no hay problemas, tabla vacía + "No se encontraron problemas ✓"
- Contadores incluyen todos los items (no solo filtrados en pantalla)
- Los cambios de permisos se aplican automáticamente al reload (applyRoleUI)
