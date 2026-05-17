# Ideas de Mejoras — SQLInventarioElecFP

Registro de ideas y mejoras sugeridas para futuras sesiones.

## Mejoras de Gestión de Inventario

### 1. Alertas de Stock Bajo
**Descripción:** Banner o notificación más visible cuando hay items por debajo del mínimo.

**Implementación sugerida:**
- Banner en la parte superior del inventario si hay items con stock bajo
- Número de items afectados
- Link para ver lista filtrada

**Prioridad:** Media

### 2. Filtro por Mantenimiento Pendiente
**Descripción:** Botón rápido para ver solo items que necesitan mantenimiento.

**Implementación sugerida:**
- Botón en toolbar junto a filtros de categoría/estado
- Muestra items donde `mant = '1'`
- Contador de items pendientes

**Prioridad:** Media

### 3. Historial de Cambios ✅ IMPLEMENTADO
**Descripción:** Auditoría de quién cambió qué y cuándo.

**Implementado en v147→v156:**
- Tabla `log` en BD (id, actor, item_id, campo, valor_anterior, valor_nuevo, fecha, detalles)
- Endpoint `/api/historial` para obtener registro
- Modal de historial con detalles de cambios
- Botón "Historial" en modal de item (solo si hay cambios)
- Vista con cambios ordenados por fecha (más recientes primero)
- Control de acceso: visible a admins/jefes

**Status:** ✅ COMPLETADO

### 4. Búsqueda Avanzada
**Descripción:** Filtros combinados avanzados.

**Ejemplo:** "Consumibles en Aula 35 con stock bajo"

**Implementación sugerida:**
- Interfaz de filtros expandible
- Soportar: tipo_material, aula, categoría, estado, stock bajo, mantenimiento
- Guardar búsquedas frecuentes

**Prioridad:** Baja

### 5. Reporte de Stock por Categoría/Aula
**Descripción:** Resumen visual de cómo está distribuido el inventario.

**Implementación sugerida:**
- Gráficos de distribución (pie chart, bar chart)
- Exportable a PDF
- Vista por categoría y por aula

**Prioridad:** Baja

### 6. Notificaciones en Tiempo Real
**Descripción:** Si otro usuario actualiza un item mientras lo estás viendo, avisarte.

**Implementación sugerida:**
- WebSocket o polling cada 30s
- Toast o modal de actualización
- Opción de recargar

**Prioridad:** Baja

### 7. Merge/Consolidar Items Duplicados
**Descripción:** Fusionar dos items iguales accidentalmente.

**Implementación sugerida:**
- Detectar posibles duplicados (mismo nombre, misma referencia)
- Interfaz para seleccionar items a fusionar
- Opción de mantener imagen de uno de ellos
- Consolidar cantidad

**Prioridad:** Media

### 8. Bulk Inventory Actions ✅ IMPLEMENTADO
**Descripción:** Acciones en lote sobre múltiples items.

**Implementado en v158:**
- UI para seleccionar múltiples items
- Acciones en lote: cambiar estado, categoría, cantidad, etc.
- Cambios registrados en auditoría automáticamente
- Integrado con modal de item

**Status:** ✅ COMPLETADO

### 8. Control de Acceso por Aula
**Descripción:** Profesores solo ven y editan items de su aula.

**Implementación sugerida:**
- Nueva columna en tabla Usuarios: aula_default
- Filtrar items por aula en renderizado
- Permisos: solo editar items de propia aula (excepto admin)

**Prioridad:** Media-Alta

## Optimizaciones de Performance

### 1. Lazy Loading de Imágenes
**Descripción:** Cargar fotos solo cuando se necesitan.

**Implementación sugerida:**
- Usar `loading="lazy"` en `<img>` tags
- Para modales: cargar al abrir
- Para listados: cargar al scroll cerca

**Prioridad:** Media
**Impacto:** Reducir uso de datos/ancho de banda

### 2. Caché Inteligente
**Descripción:** Caché más selectivo en Service Worker.

**Cambios sugeridos:**
- Cachear datos que cambian poco (categorías, aulas, ciclos)
- No cachear datos tiempo real (items, stock)
- Borrar caché más agresivamente

**Prioridad:** Media
**Impacto:** Mejor experiencia offline

### 3. Compresión de Imágenes Automática
**Descripción:** Optimizar fotos al subirlas.

**Implementación sugerida:**
- Usar ImageMagick o similar en servidor
- Reducir a máximo 1000x1000px
- Comprimir JPEG a 80% calidad
- Almacenar thumbnail 200x200px

**Prioridad:** Media
**Impacto:** Reducir tamaño BD y tiempo carga

### 4. Paginación en Listados Grandes
**Descripción:** Si hay >1000 items, cargar de 50 en 50.

**Implementación sugerida:**
- Implementar en `renderInv()`
- Botones "Siguiente/Anterior" o scroll infinito
- Mantener estado de página al cambiar filtros

**Prioridad:** Baja (depende de crecer el inventario)
**Impacto:** Mejor performance con muchos items

### 5. Indexación/Búsqueda Rápida
**Descripción:** Crear índices en D1 para campos que se buscan.

**Campos a indexar:**
```sql
CREATE INDEX idx_items_ref ON items(ref);
CREATE INDEX idx_items_name ON items(item);
CREATE INDEX idx_items_tags ON items(tags);
CREATE INDEX idx_items_aula ON items(aula);
```

**Prioridad:** Alta
**Impacto:** Búsqueda más rápida

### 6. Code Splitting
**Descripción:** Dividir JS en módulos más pequeños.

**Modulos sugeridos:**
- `core.js` — funciones comunes
- `inventory.js` — gestión de inventario
- `modals.js` — lógica de modales
- `print.js` — impresión
- `search.js` — búsqueda

**Prioridad:** Baja
**Impacto:** Carga inicial más rápida

### 7. Debounce en Búsqueda
**Descripción:** Esperar a que pare de escribir antes de buscar.

**Implementación sugerida:**
- Esperar 300ms sin input
- Reduce cálculos innecesarios
- Ya existe `debounce()` en algunas partes

**Prioridad:** Media
**Impacto:** Mejor responsividad UI

### 8. Web Workers para Operaciones Pesadas
**Descripción:** Movimientos de datos grandes a thread separado.

**Casos de uso:**
- Filtrado de 10000 items
- Exportación a CSV
- Procesamiento de búsqueda

**Prioridad:** Baja
**Impacto:** UI más responsiva con muchos datos

## Priorización Sugerida

### ✅ COMPLETADOS
1. ✅ Historial de cambios (v147→v156)
2. ✅ Bulk inventory actions (v158)

### Hacer Ahora (Próximas 2 sesiones)
1. Indexación de BD (búsqueda rápida) — URGENTE si log table crece
2. Lazy loading de imágenes
3. Alertas de stock bajo (mejor UX)
4. Filtro por mantenimiento pendiente

### Hacer Después (Próximas 4-8 sesiones)
5. Consolidar items duplicados (workflow)
6. Control acceso por aula (seguridad)
7. Búsqueda avanzada con filtros
8. Paginación en listados grandes

### Hacer Luego (Backlog)
9. Reporte visual de stock (nice to have)
10. Notificaciones tiempo real (infraestructura)
11. Code splitting (optimización)
12. Web Workers (optimización extrema)
13. Compresión de imágenes automática

## Estado

- **Última actualización:** 17/05/2026 (Sesión 4)
- **Versión actual:** v158
- **Ideas implementadas en esta sesión:** 2 (Historial, Bulk Actions)
- **Ideas pendientes de review:** Resto de la lista
