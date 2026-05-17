# Desarrollo — SQLInventarioElecFP

Registro de desarrollo y mejoras implementadas en la aplicación.

## Sesiones de trabajo

### Sesión Mayo 2026 — Sesión 1 (v128→v133)

#### 1. Gestión de Tags (v129)
- Nueva variable `TAGS` para gestionar tags dinámicos
- Modal de categorías mejorado con sección de tags
- Autocompletado con dropdown real (no solo datalist)
- Tags se detectan automáticamente al escribir

#### 2. Permisos y Roles Fix (v130)
- Agregado `ubicacionesSync` a ACTION_PERMISSIONS
- Expandidos alias de roles ('jefe', 'professor')

#### 3. Búsqueda e Inventario Mejorada (v131)
- Búsqueda ampliada: ref, tags, proveedor, ubicación
- Nuevo filtro por tipo_material (Consumibles/Inventariables)

#### 4. Modal de Items — Tags (v131)
- Dropdown de tags con 8 sugerencias
- Validación: `cleanTag()` (sin espacios dobles, sin caracteres especiales)
- Detección automática de nuevos tags

#### 5. Modal de Items — Foto Mejorada (v131)
- Preview aumentado a 120px
- Viewer fullscreen al hacer click

#### 6. Mejora de Impresión (v132)
- Etiquetas QR: grid de 2→4 columnas
- Tamaño: 52mm→40mm altura, QR 30mm→20mm
- Modal con dos opciones: Etiquetas completas + Códigos QR solo

#### 7. Fix Modal de Impresión (v133)
- `openPrintModal()` usa `getFiltered()` sin depender de contexto
- Funciona desde home, aula, categoría, etc.

### Sesión Mayo 2026 — Sesión 2 (v134→v139)

#### 8. Separación de Modales de Impresión (v134→v137)
- Modal `mPrint` para inventario (checkboxes de columnas)
- Modal `mPrintQr` para QR (opciones de formato)
- Botón "Imprimir QR" abre el modal QR
- Botón "🖨️ Imprimir" abre modal de inventario

#### 9. Actualización Placeholder de Búsqueda (v138)
- Texto: "Buscar por nombre, ref, tags, ubicación, proveedor…"

#### 10. Indicador de Cambios Sin Guardar (v139)
- Puntito rojo (●) en título cuando hay cambios
- Confirmación "¿Descartar cambios?" al cerrar
- Detecta cambios en todos los campos
- Se resetea al guardar o cerrar

### Sesión Mayo 2026 — Sesión 3 (17/05/2026, v139→v147)

**Features sin documentar en commit inicial:**
- Función `showHistorialButton()` en roles.js (muestra botón de historial)

### Sesión Mayo 2026 — Sesión 4 (Continuación, v147→v158)

#### 11. Sistema de Auditoría e Historial de Cambios (v147→v156)
**Archivos nuevos:** `functions/api/historial.js`, `js/modal-historial.js`, `js/audit-log.js`

**Funcionalidad:**
- Endpoint `/api/historial` para obtener registro de cambios de items
- Modal para visualizar quién cambió qué y cuándo
- Campos registrados: usuario, item_id, campo modificado, valor anterior, valor nuevo, fecha
- Auditoría resiliente: no bloquea si falla el logging
- Control de acceso: visible solo a admins/jefes (inicialmente restrictivo, luego relajado)

**Notas técnicas:**
- `logItemAction()` registra cambios desde cliente
- Se llama automáticamente al guardar item
- Tabla `log` en BD almacena historial
- Ordenado por fecha (cambios más recientes primero)

#### 12. Fixes en Modal de Item (v155)
- **Cierre forzado:** Modal se cierra automáticamente después de guardar
- **Prompt evitado:** Resetea `modalHasChanges` tras guardado exitoso
- Evita confirmaciones innecesarias y modal desincronizado

#### 13. Mejoras en Control de Acceso (v153)
- Relajado: inicialmente solo jefe departamento, ahora más usuarios pueden ver historial
- Basado en roles y permisos existentes

#### 14. Bulk Inventory Actions (v158)
**Archivos:** `js/inventory.js`, `js/modal-item.js`, `index.html`

- Acciones en lote sobre múltiples items
- Probables acciones: cambiar estado, categoría, cantidad en bulk
- UI para seleccionar múltiples items
- Registra cambios en auditoría

#### 15. Easter Egg: Pac-Man Game (v150)
- Juego de Pac-Man del departamento (feature decorativa)

#### Estado actual
- **Versión SW:** v158
- **Nuevos archivos:** 3 (historial API + modals)
- **Nuevas tablas BD:** log (auditoría)

## Mejoras Implementadas

### Funcionalidad ✅
- [x] Historial de cambios — Auditoría completa (v147→v156)
- [x] Bulk inventory actions — Acciones en lote (v158)
- [x] Indicador de cambios sin guardar (v139)
- [x] Mejora de búsqueda con tags, ubicación, proveedor (v131)
- [x] Gestión de tags dinámica (v129)

## Mejoras Pendientes

### Funcionalidad
- [ ] Alertas de stock bajo — Banner/notificación más visible
- [ ] Filtro por mantenimiento pendiente — Botón rápido
- [ ] Búsqueda avanzada con filtros combinados
- [ ] Reporte de stock por categoría/aula
- [ ] Notificaciones en tiempo real
- [ ] Merge/consolidar items duplicados
- [ ] Control de acceso por aula (restringir a aula específica)

### Optimización
- [ ] Lazy loading de imágenes
- [ ] Caché inteligente
- [ ] Compresión de imágenes automática
- [ ] Paginación en listados >1000 items
- [ ] Indexación/búsqueda rápida
- [ ] Code splitting
- [ ] Debounce en búsqueda
- [ ] Web Workers para operaciones pesadas

## Notas Técnicas

### Arquitectura
- Service Worker con estrategia cache-first para SHELL
- D1 (Cloudflare) como base de datos
- Google Sheets para algunos datos (profesores, ubicaciones)
- PWA con manifest.json

### Campos detectados en item
```
ref, aula, item, foto, qty, min, tipo_material, cat, ciclo, mod, loc, 
est, util, proveedor, tags, fecha, mant, mantFecha, mantEstado, mantResp, 
mantNota, obs, es_contenedor, parent_id
```

### Tags
- Almacenados en memoria en variable `TAGS`
- Se cargan desde items al iniciar app
- Validación: máx 50 caracteres, sin caracteres especiales, acentos españoles preservados

### Búsqueda
- Campos incluidos: nombre, ref, tags, ubicación, proveedor, aula
- Búsqueda en tiempo real (sin debounce actualmente)

## Commits Recientes

**Sesión 2 (v134→v139):**
```
76145f9 — Add unsaved changes indicator in item modal (v138→v139)
6b95c3f — Update search placeholder to show all searchable fields (v137→v138)
bae6c39 — Fix: Remove duplicate openPrintModal/closePrintModal (v136→v137)
be4f995 — Fix: Imprimir QR button opens QR print modal (v135→v136)
8fd7454 — Separate print inventory and print QR modals (v134→v135)
```

**Sesión 4 (v147→v158):**
```
edb9817 — Add simple bulk inventory actions (v157→v158)
a880dbe — Include actor and item details in audit log (v156→v157)
13305b5 — Log item actions from client (v155→v156)
422ac4f — Make item audit logging resilient (v154→v155)
13856aa — Force close item modal after save (v154→v155)
f62cc3f — Avoid unsaved prompt after item save (v154→v155)
2e6fa5d — Include item actions in history (v153→v154)
1b1c577 — Improve history modal usability (v152→v153)
10320bf — Relax history access check (v151→v152)
193b15e — Fix audit history viewer (v150→v151)
45418d0 — Add department Pac-Man game (v149→v150)
```

## Estado Actual (v158)

**Completado en esta sesión:**
✅ Auditoría e historial de cambios (una de las mejoras sugeridas)
✅ Bulk inventory actions (acciones en lote)
✅ Mejoras en UX (cierre automático de modal, prompt mejorado)
✅ Control de acceso al historial (relajado inicialmente)

**Próximos Pasos:**

1. **Performance & Auditoría:**
   - Considerar índices en tabla `log` si crece (campos: item_id, fecha, actor)
   - Limpieza de logs antiguos si es necesario
   - Paginación en historial si hay muchos cambios por item

2. **Bulk Actions:**
   - Completar UI para selección múltiple
   - Pruebas de rendimiento con muchos items
   - Feedback visual durante acciones en bulk

3. **Mejoras Sugeridas Pendientes:**
   - Alertas de stock bajo (banner en home)
   - Filtro por mantenimiento pendiente
   - Búsqueda avanzada con filtros combinados
   - Lazy loading de imágenes

4. **Documentación:**
   - Actualizar documentación de API (endpoints nuevos)
   - Documentar tabla `log` en schema
   - Guía de uso del historial para usuarios
