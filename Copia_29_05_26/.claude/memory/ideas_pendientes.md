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
- [x] Filtro por mantenimiento pendiente — Ya implementado
- [ ] Historial de cambios — Auditoría: quién cambió qué y cuándo
- [ ] Búsqueda avanzada con filtros combinados — Ej: "Consumibles en Aula 35 con stock bajo"
- [ ] Reporte de stock por categoría/aula — Resumen visual de distribución
- [ ] Notificaciones en tiempo real — Avisar si otro usuario actualiza item que estás viendo
- [ ] Merge/consolidar items duplicados — Fusionar items accidentalmente duplicados
- [ ] Control de acceso por aula — Profesores solo ven/editan items de su aula
- [x] Duplicar item — Ya implementado
- [x] Exportar a CSV — Ya implementado

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

## Implementado en sesión 23/05/2026 (v317→v338)
- [x] Vista tabla/tarjetas toggle — PC alterna tabla↔cards; móvil siempre cards
- [x] Contenedores SET-/CONT- con generación hijos en un paso
- [x] Bulk delete con doble confirmación + 5s countdown
- [x] Agente Volt expandido: devolver, stock, estado, mantenimiento, consultas NL
- [x] Voz para agente (micrófono Web Speech API, es-ES)

## Implementado en sesión 24/05/2026 parte 2 (v355→v374)
- [x] Fix voz Volt — pausa 2s + session restart (sin texto basura en Android)
- [x] Scroll panel móvil Volt — min-height:0 flex fix + 100dvh
- [x] Historial chat persistente (localStorage, max 40 msgs)
- [x] Foto desde cámara en modal-item y Volt form
- [x] Fix login flicker — inline CSS :not(.active)
- [x] Filtros activos como chips bajo barra búsqueda
- [x] Badge préstamos vencidos en navbar (punto rojo con count)

## Pendiente (confirmado no implementado a 24/05/2026)
- [ ] **Bulk actions: añadir/cambiar referencia** — En acciones por lotes, permitir asignar o modificar el campo `ref` a los items seleccionados (similar a como ya funciona el bulk edit de aula/ciclo/categoría)
- [ ] Swipe en cards móvil (préstamo/editar deslizando)
- [ ] QR directo en cada card sin abrir ítem
- [ ] Historial de cambios por ítem en modal edición
- [ ] Aviso préstamos vencidos al hacer login (toast)
- [ ] FASE 1 seguridad: Bearer tokens, password hashing, rate-limiting

## Seguridad — Agujero OAuth (detectado 25/05/2026)
- [ ] **CRÍTICO:** Cualquier cuenta Google que pase la validación OAuth obtiene acceso completo a la app aunque no tenga usuario registrado en D1. El middleware acepta el token OAuth como autenticación suficiente, sin verificar que el email exista en la tabla `usuarios`. Fix pendiente: en `_middleware.js`, tras validar el token OAuth, comprobar que el email del token existe en `usuarios` — si no existe, devolver 401/403 y bloquear el acceso por completo, igual que si la contraseña fuera incorrecta.

## Notas
- Duplicar item, filtro mantenimiento y exportar CSV ya estaban (confirmado 23/05/2026)
- Agente usa NLP local (no LLM) para acciones; LLM (gpt-4o-mini) solo para respuestas conversacionales
- EAN barcode lookup descartado: UPCitemdb sin cobertura para equipos B2B (osciloscopios, routers)
- Las ref de ítems se generan automáticamente — no vienen de EAN externos
