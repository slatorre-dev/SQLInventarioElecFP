---
name: auditoria_mejoras_ux
description: Mejoras de UX para auditoría de datos — historial y priorización de opciones
metadata: 
  node_type: memory
  type: project
  originSessionId: f6cf9507-b703-456c-bf7b-de293edd12ac
---

## Mejoras propuestas para Auditoría de Datos

Estado: **En backlog** — usuario evaluará cuál implementar primero.

### 1. Indicador visual de progreso
**Descripción:** Mostrar contador de items completados mientras se editan.
- Display: "5/243 items completados" o barra de progreso
- Ubicación: En la barra de bulk actions o en un panel flotante
- Beneficio: El usuario sabe cuántos items quedan sin arreglar

### 2. Botón "Marcar grupo como completado"
**Descripción:** Una vez arreglados todos los items de un grupo (ej. Aula 35), marcarlo visualmente.
- Opciones: Mostrar como ✓ hecho, cambiar color, mover a sección "completados"
- Beneficio: Evita revisitar los mismos grupos, reduce confusión

### 3. Vista estadística inicial
**Descripción:** Panel de resumen antes de entrar al trabajo.
- Contenido: "969 items con problemas: 250 sin módulo, 180 sin aula, 200 sin categoría..."
- Ubicación: Encima de la tabla de auditoría
- Beneficio: El usuario ve dónde enfocarse primero (10 min vs. 2 horas)

### 4. Combinación inteligente de filtros
**Descripción:** Pasar de filtros exclusivos a lógica AND/OR.
- Actual: "Sin módulo" O "Sin aula" (uno a uno)
- Propuesto: "Sin módulo Y sin aula" para ver items que necesitan ambos
- Beneficio: Mayor granularidad en auditoría

### 5. Exportar reporte
**Descripción:** Generar CSV o PDF con items problemáticos.
- Formato: Items agrupados por aula/categoría
- Beneficio: El coordinador puede revisar offline o compartir resultados

---

## Pendiente usuario
Indicar cuál de estas es prioritaria o si hay otras mejoras específicas del flujo de trabajo que desee implementar primero.
