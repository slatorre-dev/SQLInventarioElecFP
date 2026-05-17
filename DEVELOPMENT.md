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

#### Estado actual
- **Versión SW:** v147
- **Cambios detectados no documentados:**
  - Función `showHistorialButton()` en roles.js (muestra botón de historial solo a usuario 'seba')
  - Posibles otras mejoras entre v139 y v147 (investigar)

## Mejoras Pendientes

### Funcionalidad
- [ ] Alertas de stock bajo — Banner/notificación más visible
- [ ] Filtro por mantenimiento pendiente — Botón rápido
- [ ] Historial de cambios — Auditoría de cambios
- [ ] Búsqueda avanzada con filtros combinados
- [ ] Reporte de stock por categoría/aula
- [ ] Notificaciones en tiempo real
- [ ] Merge/consolidar items duplicados
- [ ] Control de acceso por aula

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

```
76145f9 — Add unsaved changes indicator in item modal (v138→v139)
6b95c3f — Update search placeholder to show all searchable fields (v137→v138)
bae6c39 — Fix: Remove duplicate openPrintModal/closePrintModal (v136→v137)
be4f995 — Fix: Imprimir QR button opens QR print modal (v135→v136)
8fd7454 — Separate print inventory and print QR modals (v134→v135)
```

## Próximos Pasos

1. Investigar cambios entre v139 y v147
2. Validar feature de cambios sin guardar en producción
3. Considerar implementar mejoras de optimización
4. Revisar y planificar nuevas features de gestión
