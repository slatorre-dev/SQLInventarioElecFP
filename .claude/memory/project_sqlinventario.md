---
name: project-sqlinventario
description: SQLInventarioElecFP — migración de inventario IES El Bosco a Cloudflare + D1 + Google Drive OAuth
metadata: 
  node_type: memory
  type: project
  originSessionId: 31d6730b-a718-44d3-aa37-c63cd1fa73c3
---

## Objetivo
Migrar inventario del departamento de Electricidad y Electrónica del IES El Bosco desde Google Apps Script + Sheets a:
- Cloudflare Pages (frontend)
- Cloudflare D1 (base de datos remota)
- Cloudflare Pages Functions (backend)
- Google Drive API con OAuth real (documentos adjuntos)

## Stack técnico
- Frontend: SPA vanilla JS (sin frameworks)
- Backend: Pages Functions (`/api/*`)
- BD: Cloudflare D1 remoto (`inventario-departamento`)
- Docs: Google Drive OAuth (usuario real, no service account)
- Deploy: `git push` → Cloudflare Pages automático
- PWA: Service worker con shell cache estático

## Características implementadas
- Login y autorización por tabla `usuarios` con roles
- Inventario, aulas, categorías, ciclos y módulos
- Diferenciación `tipo_material`: consumibles vs. inventariables
- Cajas/contenedores con `es_contenedor=1` y `parent_id`
- Campo `proveedor` para reposición
- Ubicaciones sugeridas editable en tabla `ubicaciones`
- Modal alta/edición con rejilla 3 columnas en escritorio
- Tabla optimizada con fotos, stock, utilidad truncada
- Categorías alfabéticas, creables por usuarios con `categories.manage`
- Tags libres por item (búsqueda, importación, exportación, backup)
- Ficha rápida flotante al pasar/pulsar sobre item
- Normalización de categorías con botón en Gestionar
- Préstamos y devoluciones
- Profesores prestatarios
- Perfil de usuario
- Recuperación de contraseña por correo
- Documentos adjuntos en Google Drive
- QR por item
- Importación/exportación

## Decisiones arquitectónicas
- **D1 remoto es el único origen de verdad** (no instancia local)
- R2 fue descartado: requiere tarjeta bancaria de Cloudflare
- Service account de Google Drive es fallback técnico, no via principal
- **OAuth Drive con cuenta real es la via principal**
- `/api/*` NO debe cachearse en service worker (siempre por red)
- Categorías se derivan también desde `inventario.cat` (migración tolerante)
- `tipo_material` separa stock: consumible en alertas, inventariable en trazabilidad/ubicación/préstamos
- Contenedores no son tipo_material, siguen siendo `es_contenedor=1`

## Archivos clave
### Documentación
- `README.md` — visión general
- `SUBIDA_DOCS_MEMORIA.md` — documentos adjuntos + OAuth Drive
- `PROYECTO_DESCRIPCION_RECUPERACION.md` — este documento (recuperación)
- `MIGRACION_CLOUDFLARE_D1.md` — migración desde Google Sheets/backup
- `CLAUDE.md` — trabajar contra D1 remoto

### Backend
- `functions/api/_middleware.js` — autenticación
- `functions/api/docs.js` — documentos adjuntos
- `functions/api/oauth/start.js`, `callback.js` — flujo OAuth Google
- `functions/api/item.js` — alta/edición/borrado/importación
- `functions/api/meta.js` — metadatos ligeros
- `functions/api/list.js` — inventario pesado

### Frontend
- `js/api.js` — `apiGet`, `apiPost`
- `js/auth.js` — login, carga dos fases
- `js/docs.js` — UI adjuntos, compresión, subida
- `js/modal-cats.js` — gestión categorías
- `js/modal-item.js` — crear/editar items

### Datos
- `migrations/0001_schema.sql` — schema D1
- `wrangler.toml` — binding D1

## Seguridad
**NUNCA subir secretos:**
- `client_secret*.json`
- `credentials*.json`
- `backup.json`
- `migration.sql`
- `migrate.js`
- `.wrangler/`

Si se filtra secreto de Google: revocar → crear nuevo → actualizar Cloudflare → redeploy

## Verificación tras recuperar proyecto
1. Login en app
2. Carga home
3. Revisar categorías
4. Crear item de prueba
5. Subir documento pequeño
6. Abrir documento desde la app
7. Borrar documento de prueba
8. Revisar Cloudflare logs si algo falla

## Problemas conocidos + soluciones
- **Error 500 crear items/categorías/profesores:** `auditLog` crea tabla `log` si falta, fallos de auditoría no bloquean
- **Categorías importadas no visibles:** `/api/meta` y `/api/list` derivan categorías usadas
- **Service worker con datos antiguos:** `sw.js` excluye `/api/*`
- **Drive service account sin cuota:** usar OAuth de usuario real
