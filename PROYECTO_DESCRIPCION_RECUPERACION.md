# Descripcion completa del proyecto y recuperacion de trabajo

Fecha: 2026-05-16
Proyecto: SQLInventarioElecFP

## 1. Objetivo

Migrar el inventario del departamento de Electricidad y Electronica del IES El Bosco desde una arquitectura basada en Google Apps Script + Google Sheets hacia:

- Cloudflare Pages para hosting.
- Cloudflare Pages Functions para backend.
- Cloudflare D1 para base de datos.
- Google Drive API con OAuth de usuario real para documentos adjuntos.

Objetivos principales:

- Reducir tiempos de carga.
- Evitar dependencia de Google Sheets como base de datos.
- Mantener despliegue automatico desde GitHub.
- Mantener una app sencilla sin frameworks frontend.
- Conservar compatibilidad con documentos ya guardados en Drive.

## 2. Estado actual

### Implementado

- Frontend SPA en `index.html`.
- Modulos JS separados en `js/`.
- Backend en `functions/api/`.
- D1 remoto `inventario-departamento`.
- Login y autorizacion por tabla `usuarios`.
- Inventario, aulas, categorias, ciclos y modulos.
- Prestamos y devoluciones.
- Profesores prestatarios.
- Usuarios de la app, incluyendo roles, modulos asignados y reset de contrasena desde administracion.
- Perfil de usuario.
- Recuperacion de contrasena por correo con pantalla dedicada `#reset/<token>`.
- Documentos adjuntos en Google Drive.
- OAuth de Drive con cuenta real.
- QR por item.
- PWA con service worker.
- Importacion/exportacion.

### Decisiones importantes

- R2 fue probado como opcion para documentos, pero se revirtio porque Cloudflare exige tarjeta bancaria para activarlo.
- Service account de Google Drive queda como fallback tecnico, pero no es la via principal por el problema de cuota.
- La via principal de documentos es OAuth con una cuenta real de Drive.
- `/api/*` no debe cachearse en service worker.
- Las categorias se derivan tambien desde `inventario.cat` para tolerar migraciones incompletas de tabla `categorias`.

## 3. Repositorio

Repositorio:

```text
https://github.com/sebantonio/SQLInventarioElecFP.git
```

Rama principal:

```text
main
```

Deploy:

```text
git push -> Cloudflare Pages
```

## 4. Archivos clave

### Documentacion

- `README.md`
  - Vision general y puesta en marcha.

- `SUBIDA_DOCS_MEMORIA.md`
  - Detalle completo de documentos adjuntos y OAuth Drive.

- `PROYECTO_DESCRIPCION_RECUPERACION.md`
  - Este documento.

- `MIGRACION_CLOUDFLARE_D1.md`
  - Migracion desde Google Sheets/backup.

- `claude.md`
  - Nota operativa: trabajar contra D1 remoto.

### Backend

- `functions/api/_middleware.js`
  - Autenticacion comun.

- `functions/api/docs.js`
  - Documentos adjuntos.

- `functions/api/oauth/start.js`
  - Inicio OAuth Google.

- `functions/api/oauth/callback.js`
  - Callback OAuth y obtencion de refresh token.

- `functions/api/item.js`
  - Alta/edicion/borrado/importacion de items.

- `functions/api/meta.js`
  - Metadatos ligeros.

- `functions/api/list.js`
  - Inventario y datos pesados.

### Frontend

- `js/api.js`
  - `apiGet` y `apiPost`.

- `js/auth.js`
  - Login y carga en dos fases.

- `js/docs.js`
  - UI de adjuntos, compresion de imagenes y subida.

- `js/modal-cats.js`
  - Gestion de categorias.

- `js/modal-item.js`
  - Crear/editar items.

### Datos

- `migrations/0001_schema.sql`
  - Schema D1.

- `wrangler.toml`
  - Binding D1.

## 5. Recuperar proyecto en otro ordenador

### 5.1 Clonar

```bash
git clone https://github.com/sebantonio/SQLInventarioElecFP.git
cd SQLInventarioElecFP
git checkout main
```

### 5.2 Instalar herramientas

```bash
npm install -g wrangler
wrangler login
```

### 5.3 Revisar configuracion

`wrangler.toml` debe contener:

```toml
name = "sql-inventario-elec-fp"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "inventario-departamento"
database_id = "..."
```

### 5.4 Crear o vincular D1

Si la base no existe:

```bash
wrangler d1 create inventario-departamento
wrangler d1 execute inventario-departamento --file=migrations/0001_schema.sql
```

Si ya existe, comprobar que `database_id` coincide.

### 5.5 Crear usuario inicial

```bash
wrangler d1 execute inventario-departamento --command="INSERT INTO usuarios (usuario,password,nombre,rol,email) VALUES ('Admin','Admin','Administrador','Jefe Departamento','')"
```

Despues cambiar la contrasena desde la app.

### 5.6 Configurar Cloudflare Pages

En Cloudflare:

```text
Workers & Pages -> Create -> conectar repositorio GitHub
Settings -> Functions -> D1 database bindings
```

Binding:

```text
Variable: DB
Database: inventario-departamento
```

### 5.7 Configurar secretos Google Drive OAuth

En Cloudflare Pages, entorno `Production`:

```text
GOOGLE_OAUTH_CLIENT_ID
GOOGLE_OAUTH_CLIENT_SECRET
GOOGLE_OAUTH_REFRESH_TOKEN
GOOGLE_DRIVE_ROOT_FOLDER_ID
RESEND_API_KEY
MAIL_FROM
```

Opcional fallback antiguo:

```text
GOOGLE_SERVICE_ACCOUNT
```

No es obligatorio si OAuth ya funciona.

### 5.8 Generar refresh token si falta

1. Crear cliente OAuth en Google Cloud.
2. Configurar callback:

```text
https://TU_DOMINIO/api/oauth/callback
```

3. Guardar `GOOGLE_OAUTH_CLIENT_ID` y `GOOGLE_OAUTH_CLIENT_SECRET` en Cloudflare.
4. Redeploy.
5. Abrir:

```text
https://TU_DOMINIO/api/oauth/start?u=USUARIO_APP&p=PASSWORD_APP
```

6. Autorizar con la cuenta real de Drive.
7. Copiar token mostrado.
8. Guardarlo como:

```text
GOOGLE_OAUTH_REFRESH_TOKEN
```

9. Redeploy.

## 6. Migrar datos desde proyecto anterior

Ver documento:

```text
MIGRACION_CLOUDFLARE_D1.md
```

Resumen:

1. Exportar backup JSON desde la app original.
2. Guardar como `backup.json` en raiz.
3. Ejecutar script de migracion si se usa.
4. Cargar `migration.sql` en D1.

Archivos `backup.json`, `migration.sql` y `migrate.js` estan ignorados por Git.

## 7. Documentos adjuntos

Estado:

- Suben a Google Drive mediante OAuth.
- Se guardan en subcarpetas por aula.
- D1 guarda `driveId` y `driveUrl`.
- Los documentos antiguos de Drive siguen siendo validos.

No usar R2 salvo que la organizacion decida activarlo con facturacion propia.

Mas detalle:

```text
SUBIDA_DOCS_MEMORIA.md
```

## 8. Service worker

El service worker cachea shell estatico, pero no debe cachear API.

Regla importante en `sw.js`:

```text
/api/* -> red siempre
```

Si se cambia JS/CSS importante, subir `VERSION` en `sw.js`.

## 9. Seguridad

No subir secretos.

Ignorados:

```text
client_secret*.json
credentials*.json
backup.json
migration.sql
migrate.js
.wrangler/
```

Si aparece un archivo local `client_secret_...json`, no commitearlo.

Si se filtra:

1. Revocar en Google Cloud.
2. Crear nuevo.
3. Actualizar Cloudflare.
4. Redeploy.

## 10. Problemas conocidos resueltos

### Error 500 al crear items/categorias/profesores

Causa probable: fallo en tabla `log`.

Solucion implementada:

- `auditLog` crea `log` si falta.
- Fallos de auditoria no bloquean la accion principal.

### Categorias importadas no visibles

Causa: items con `cat`, pero filas faltantes en tabla `categorias`.

Solucion:

- `/api/meta` y `/api/list` derivan categorias usadas en inventario.

### Service worker mostrando datos antiguos

Causa: posible cache de `/api/meta` o `/api/list`.

Solucion:

- `sw.js` excluye `/api/*`.

### Drive service account sin cuota

Causa: cuenta de servicio sin almacenamiento propio.

Solucion:

- OAuth de usuario real.

## 11. Commits relevantes

```text
c71036b Fix D1 write audit failures
8965306 Derive missing categories from inventory
3c3cb73 Support shared drives for document uploads
29bc0b6 Revert "Use R2 for new document uploads"
d9dc653 Add Google Drive OAuth setup flow
b227d58 Remove OAuth environment diagnostics
```

## 12. Despliegue

Cada push a `main` dispara Cloudflare Pages.

Forzar redeploy sin cambios:

```bash
git commit --allow-empty -m "Trigger Cloudflare redeploy"
git push
```

## 13. Verificacion tras recuperar

1. Login en app.
2. Carga home.
3. Revisar categorias.
4. Crear item de prueba.
5. Subir documento pequeno.
6. Abrir documento desde la app.
7. Borrar documento de prueba.
8. Revisar Cloudflare logs si algo falla.
