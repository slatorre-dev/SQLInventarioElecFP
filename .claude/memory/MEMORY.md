# Memory Index

## CSS & Móvil
- [Modal grid móvil](feedback_mobile_modal_grid.md) — Las .m-section tienen su propio grid que hay que resetear en móvil; backdrop-filter rompe position:fixed en hijos

## Arquitectura
- [Ciclos sobreescritos por BD](project_ciclos_bd_override.md) — CICLOS/AULAS/CATS de config.js se reemplazan con datos de D1 al login; usar mapas por id para props fijas

## Feedback & Workflow
- [Bump SW siempre](feedback_sw_bump.md) — Incrementar versión sw.js y hacer commit+push en cada sesión de cambios
- [Session workflow](feedback_session_workflow.md) — Estructura de memoria para features, commits atómicos, actualizar memory.md
- [GitHub always save](feedback_github_always.md) — Guardar SIEMPRE en GitHub (commit+push) al final de cada sesión
- [Commit+push auto](feedback_commit_push_auto.md) — Commit y push automáticos sin preguntar, a los DOS repos (sebantonio + slatorre-dev)

## Project & Features
- [SQLInventarioElecFP](project_sqlinventario.md) — Migración inventario IES El Bosco a Cloudflare D1 + Drive OAuth
- [Features Mayo 2026](features_session_may2026.md) — Tags management, búsqueda mejorada, modal items, modales impresión, cambios sin guardar
- [Ideas Pendientes](ideas_pendientes.md) — Mejoras de gestión y optimizaciones sugeridas pero no implementadas
- [Sesión 17/05/2026 Parte 1](session_mayo_20260517.md) — Correcciones finales, feature cambios sin guardar (v139→v147)
- [Sesión 17/05/2026 Parte 2](session_mayo_20260517_parte2.md) — Historial de cambios, auditoría, bulk actions (v147→v158)
- [Auditoría de Datos](feature_auditoria_datos.md) — Modal para limpiar items con campos incompletos (v159→v166)
- [Mejoras Auditoría UX](feature_auditoria_mejoras.md) — Propuestas de mejoras: indicador progreso, estadísticas, filtros AND/OR, exportar reporte
- [Documentación Completa](DEVELOPMENT.md#sesión-mayo-2026--sesión-5) — TODO implementado en auditoría: fixes, agrupaciones, filtrados, integración bulk edit
- [Responsive UI v176](feature_responsive_ui_v176.md) — Mejoras móvil/tablet: botones 44px, inputs 16px, grillas adaptables
- [Sesión 21/05/2026](session_mayo_20260521.md) — Agente Volt, formulario préstamo inline, fix historial 403, roles (v224→v238)
- [Sesión 22/05/2026](session_mayo_20260522.md) — Filtros clickeables en Aula, rol Admin con visibilidad privada (v244→v246)
- [Sesión 22/05/2026 Parte 3](session_mayo_20260522_parte3.md) — Intentó privado en usuarios (cancelado), rollback a v244, filtros clickeables v245
- [Sesión 22/05/2026 Parte 4](session_mayo_20260522_parte4.md) — Rol SuperAdmin invisible, corona 👑 solo para Seba (v245→v249)
- [Sesión 22/05/2026 Parte 5](session_mayo_20260522_parte5.md) — Ocultar items, QR config, breadcrumb visual, pill eliminada (v249→v260)
- [Bug modales invisibles → reset v318](incident_reset_v321j_oauth.md) — Modales .mbg abiertos+invisibles tapaban clicks; reset final a v318 (21b92b3), backup OAuth en backup/oauth-pre-reset-v327 (85f85f0)
- [Sesión 23/05/2026](session_mayo_20260523.md) — Ciclo PC full-width, vista tabla/cards, SET-/CONT- contenedores, bulk delete 5s, agente Volt expandido + voz (v317→v338)
- [Sesión 24/05/2026](session_mayo_20260524.md) — Backup D1, Volt backend D1, fix voz/scroll/flicker, chips filtros, badge préstamos vencidos (v352→v374)
- [Sesión 25/05/2026](session_mayo_20260525.md) — Fixes tablet/móvil, mantener filtros al editar, mejoras NLP Volt, fix voz duplicada (v379→v390)

## Entorno & Ops
- [Wrangler red corporativa](feedback_wrangler_red_corporativa.md) — NODE_TLS_REJECT_UNAUTHORIZED=0 antes de wrangler; login previo en terminal interactiva
