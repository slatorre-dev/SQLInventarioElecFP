---
name: ideas-pendientes
description: Ideas de mejoras sugeridas pero aún no implementadas
metadata: 
  node_type: memory
  type: project
  originSessionId: 31d6730b-a718-44d3-aa37-c63cd1fa73c3
---

## Mejoras de Gestión de Inventario (Propuestas)

### Funcionalidad
- [ ] Alertas de stock bajo — Banner/notificación más visible cuando items < mínimo
- [ ] Filtro por mantenimiento pendiente — Botón rápido para ver items que necesitan mantenimiento
- [ ] Historial de cambios — Auditoría: quién cambió qué y cuándo
- [ ] Búsqueda avanzada con filtros combinados — Ej: "Consumibles en Aula 35 con stock bajo"
- [ ] Reporte de stock por categoría/aula — Resumen visual de distribución
- [ ] Notificaciones en tiempo real — Avisar si otro usuario actualiza item que estás viendo
- [ ] Merge/consolidar items duplicados — Fusionar items accidentalmente duplicados
- [ ] Control de acceso por aula — Profesores solo ven/editan items de su aula

## Optimizaciones Propuestas

### Performance
- [ ] Lazy loading de imágenes — Cargar fotos solo cuando se vean
- [ ] Caché inteligente — Más selectivo (no cachear datos tiempo real)
- [ ] Compresión de imágenes — Optimizar automáticamente al subir
- [ ] Paginación en listados grandes — Si >1000 items, cargar 50 en 50
- [ ] Indexación/búsqueda rápida — Índices en ref, tags, nombre
- [ ] Code splitting — Dividir JS en módulos más pequeños
- [ ] Debounce en búsqueda — Esperar a que pare de escribir
- [ ] Web Workers — Para operaciones pesadas con datos grandes

## Notas
- Usuario decidió dejar de momento el desarrollo de nuevas features
- Enfoque actual: correcciones de bugs y features pequeñas
- Próxima sesión: decidir si continuar con optimizaciones o nuevas features
