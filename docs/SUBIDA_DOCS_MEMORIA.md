# Memoria completa: configuración de documentos adjuntos y OAuth de Google

Fecha: 2026-05-19
Proyecto: SQLInventarioElecFP
Estado actual: Google Drive con OAuth de usuario real como vía principal para documentos adjuntos, más envío de correo con Gmail API para restablecimiento de contraseña y notificaciones de préstamos.

## 1. Resumen ejecutivo

Esta memoria describe el funcionamiento actual del módulo de documentos adjuntos en el proyecto `SQLInventarioElecFP`.

- Los metadatos de los documentos se guardan en la base de datos remota Cloudflare D1 (`DB` binding).
- Los archivos binarios se suben a Google Drive.
- El backend usa Cloudflare Pages Functions.
- El acceso a Google Drive se logra mediante OAuth de usuario real con `refresh_token`.
- Existe un fallback heredado con cuenta de servicio (`service account`), pero no es la opción recomendada.
- El mismo OAuth también soporta envío de correo mediante Gmail API para recuperación de contraseña y avisos de préstamo.

## 2. Arquitectura general

```
Navegador
  -> /api/docs (Cloudflare Pages Function)
  -> Google Drive API
  -> D1 tabla documentos
```

Adicionalmente:

- `/api/auth` usa Gmail API para restablecer contraseñas.
- `/api/prestar` puede enviar notificaciones por correo a responsables de módulos.
- `/api/backup` también puede usar OAuth para operaciones de copia de seguridad a Drive.

## 3. Componentes implicados

### 3.1 Backend

- `functions/api/docs.js`
  - `getDocs`: lee documentos asociados a un `itemId`.
  - `uploadDoc`: sube un archivo a Drive, crea la carpeta de aula si hace falta y guarda metadatos en D1.
  - `deleteDoc`: elimina el archivo de Drive (cuando es posible) y borra el metadato.
  - `getGoogleAccessToken`: obtiene el token de acceso con OAuth o, en fallback, con service account.
  - `findOrCreateDriveFolder`: localiza o crea carpetas de aula dentro de la carpeta raíz de Drive.
  - `uploadFileToDrive`: hace un multipart upload a Google Drive y trata de fijar permisos de lectura pública si es posible.

- `functions/api/oauth/start.js`
  - Inicia el flujo OAuth.
  - Crea la URL de autorización de Google con los scopes necesarios.
  - Redirige a Google para que el usuario real acepte permisos.

- `functions/api/oauth/callback.js`
  - Recibe el código de Google.
  - Intercambia el `code` por tokens y muestra el `refresh_token` para copiarlo a Cloudflare.

- `functions/api/_middleware.js`
  - Controla el acceso a las rutas `/api/*`.
  - Exime las rutas públicas: `/api/auth`, `/api/oauth/callback`, `/api/oauth/start`, `/api/backup`.
  - Para el resto de rutas espera credenciales de app `u` / `p` en query params.

- `functions/api/auth.js`
  - Gestiona login y solicitud de restablecimiento de contraseña.
  - Envía correos usando Gmail API si están configurados los secretos.

- `functions/api/prestar.js`
  - Gestiona préstamos y devoluciones.
  - Puede enviar notificaciones de préstamo al responsable de módulo usando Gmail API.

- `functions/api/backup.js`
  - Realiza copias de seguridad a Drive.
  - Usa un `DRIVE_FOLDER_ID` interno distinto del root de documentos adjuntos.

### 3.2 Frontend

- `js/docs.js`
  - Gestiona selección y envío de archivos.
  - Convierte imágenes grandes a JPG comprimido antes de subir.
  - Llama a `/api/docs` con `action: 'uploadDoc'`, `getDocs` y `deleteDoc`.

### 3.3 Base de datos / D1

Tabla principal en `migrations/0001_schema.sql`:

```sql
CREATE TABLE IF NOT EXISTS documentos (
  id         INTEGER PRIMARY KEY,
  itemId     INTEGER DEFAULT 0,
  itemNombre TEXT DEFAULT '',
  aulaId     TEXT DEFAULT '',
  fileName   TEXT DEFAULT '',
  driveId    TEXT DEFAULT '',
  driveUrl   TEXT DEFAULT '',
  fecha      TEXT DEFAULT ''
);
```

Otras tablas relacionadas:

- `usuarios`: autenticación de la app.
- `reset_tokens`: tokens de restablecimiento de contraseña generados por `/api/auth`.
- `prestamos`: registros de préstamos que pueden activar correos.

## 4. Flujo actual de documentos adjuntos

1. El frontend pide documentos de un item con `getDocs`.
2. El usuario selecciona un archivo y `js/docs.js` envía `uploadDoc` con:
   - `itemId`
   - `itemNombre`
   - `aulaId`
   - `aulaName`
   - `fileName`
   - `mimeType`
   - `data` (base64)
3. El backend valida parámetros y obtiene la carpeta raíz de Drive.
4. Busca o crea la carpeta de aula dentro de la raíz.
5. Sube el archivo a Drive con un multipart upload.
6. Intenta fijar permiso `reader` tipo `anyone`.
7. Guarda metadatos en D1.

### Resultado guardado

- `itemId` y `itemNombre` para referencia del inventario.
- `aulaId` y `fileName`.
- `driveId` y `driveUrl` para acceso web.
- `fecha` en formato ISO.

## 5. Flujo OAuth completo

### 5.1 Generación del refresh token

1. Configurar `GOOGLE_OAUTH_CLIENT_ID` y `GOOGLE_OAUTH_CLIENT_SECRET` en Cloudflare Pages.
2. Desplegar para que las variables estén disponibles.
3. Abrir:

```text
https://TU_DOMINIO/api/oauth/start
```

4. Google redirige a `/api/oauth/callback`.
5. El callback muestra el `refresh_token`.
6. Guardar el token como secreto `GOOGLE_OAUTH_REFRESH_TOKEN` en Cloudflare.
7. Redeploy.

> Nota: en el código actual `/api/oauth/start` no valida `u`/`p`; la ruta es accesible públicamente. El permiso real lo controla Google mediante el consent screen y la cuenta usada para autorizar.

### 5.2 Scopes usados

El endpoint `oauth/start.js` solicita:

- `https://www.googleapis.com/auth/drive.file`
- `https://www.googleapis.com/auth/gmail.send`

Esto es necesario porque:

- `drive.file` permite subir y gestionar archivos creados por la app.
- `gmail.send` permite enviar correos desde Gmail para recuperación de contraseña y notificaciones.

### 5.3 Obtención del access token

El backend usa `refresh_token` para llamar a:

```text
https://oauth2.googleapis.com/token
```

y recibe un `access_token` que luego sirve para Drive y Gmail.

## 6. Variables de entorno y secretos

### Variables de Drive / OAuth

- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `GOOGLE_OAUTH_REFRESH_TOKEN`
- `GOOGLE_DRIVE_ROOT_FOLDER_ID`

### Variables opcionales y fallback

- `GOOGLE_SERVICE_ACCOUNT`: fallback heredado con cuenta de servicio.
- `DRIVE_FOLDER_ID`: fallback en `functions/api/docs.js` si no existe `GOOGLE_DRIVE_ROOT_FOLDER_ID`.
- `MAIL_FROM`: remitente usado en correos; si no está, usa `inventarioelec@iesjuanbosco.es`.
- `RESEND_API_KEY`: aparece referenciada en el README para servicios de correo externos.

### Recomendación de configuración

- Guardar todos los secretos en Cloudflare Pages `Production`.
- Siempre redeploy tras cambiar variables.
- No subir `client_secret*.json`, `credentials*.json`, `GOOGLE_OAUTH_REFRESH_TOKEN` ni JSON de service account al repositorio.

## 7. Comportamiento de Google Drive

### Carpeta raíz

- `GOOGLE_DRIVE_ROOT_FOLDER_ID` debe ser el ID de la carpeta donde se guardan los documentos.
- No debe incluir la URL completa, solo el ID.

Ejemplo:

```text
1Ld7IhlJ1cmihza6CMskMSxHty0Qujbg
```

### Estructura de carpetas

El backend crea o usa subcarpetas dentro de esa raíz según `aulaName`.

Ejemplo:

```
Drive root
  +- Aula 35
  +- Aula 36
  +- Aulas generales
```

### Normalización de nombres

- Si `aulaName` está vacío, usa `Aula`.
- El nombre se limpia para evitar comillas simples en la consulta de Drive.

### Permisos del archivo

- Tras subir el archivo, el backend intenta otorgar lectura pública (`anyone` reader).
- Si ese paso falla, la subida continúa y el documento se guarda con el URL de Drive.
- Esto evita que una falla en la configuración de permisos bloquee la operación.

### Fallback de carpeta raíz

`functions/api/docs.js` usa:

```js
const rootFolderId = env.GOOGLE_DRIVE_ROOT_FOLDER_ID || env.DRIVE_FOLDER_ID;
```

Por tanto, `DRIVE_FOLDER_ID` funciona como respaldo si se usa una configuración heredada.

## 8. Gmail / notificaciones por correo

El proyecto usa los mismos credenciales OAuth para Gmail cuando existen:

- `functions/api/auth.js`: envío de correo de restablecimiento de contraseña.
- `functions/api/prestar.js`: envío de notificación a responsables de módulo cuando hay préstamos.

### Importante

- Si no se configura `GOOGLE_OAUTH_REFRESH_TOKEN`, las funciones de correo fallarán.
- El scope `gmail.send` debe estar autorizado junto con `drive.file`.

## 9. Fallback de service account

El código aún incluye un fallback con `GOOGLE_SERVICE_ACCOUNT`:

- Usa JWT OAuth con `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer`.
- Scope: `https://www.googleapis.com/auth/drive`.

### Limitaciones

- Las cuentas de servicio no tienen almacenamiento personal de Drive.
- Por eso el proyecto recomienda no usar este fallback salvo con:
  - Unidad compartida de Google Workspace.
  - Cuenta de servicio añadida como Editor / Gestor de contenido.

### Mensaje de error específico

Si falla, el backend devuelve un mensaje explicando que la cuenta de servicio no tiene cuota propia y recomienda usar una carpeta en una Unidad compartida.

## 10. Endpoints y comportamiento

### `/api/docs` (POST)

Acciones:

- `getDocs`
- `uploadDoc`
- `deleteDoc`

#### `getDocs`

- Parámetro requerido: `itemId`
- Devuelve todos los documentos asociados a ese item.

#### `uploadDoc`

- Parámetros obligatorios: `itemId`, `fileName`, `data`.
- Usa `aulaName` o `aulaId` para crear/seleccionar carpeta.
- Inserta el registro en `documentos` y devuelve el objeto completo.

#### `deleteDoc`

- Parámetro obligatorio: `docId`.
- Si llega `driveId`, intenta borrar el archivo en Drive.
- Borra el registro de la tabla aunque la eliminación en Drive falle.

### `/api/oauth/start` (GET)

- Inicia el flujo OAuth.
- Redirige a Google con los scopes necesarios.
- Actualmente la ruta es pública.

### `/api/oauth/callback` (GET)

- Recibe `code` de Google.
- Intercambia el código por `access_token` y `refresh_token`.
- Muestra el `refresh_token` en pantalla para copiarlo.

### `/api/auth` (GET/POST)

- Gestiona login y solicitud de restablecimiento.
- Envía correos con Gmail.
- Exenta del middleware de autenticación.

### `/api/backup` (GET/POST)

- Realiza copias de seguridad a Drive.
- Exenta del middleware de autenticación.

## 11. Seguridad y autenticación

### Middleware

`functions/api/_middleware.js` aplica:

- Rutas públicas: `/api/auth`, `/api/oauth/callback`, `/api/oauth/start`, `/api/backup`.
- Resto de rutas exigirá `u` y `p` en la query string y los validará contra la tabla `usuarios`.

### Notas para revisiones

- Verificar que los endpoints expuestos públicamente no acceden a datos sensibles sin protección.
- `oauth/start` es parte del flujo de autorización y puede dejarse pública si se acepta que Google valide la cuenta.
- Si se desea endurecer, se puede proteger `oauth/start` con autenticación adicional.

## 12. Despliegue y D1 remota

### D1 remota

- El proyecto usa Cloudflare D1 remota.
- No usar `wrangler pages dev` para pruebas de base de datos remota.
- Usar `wrangler d1 ... --remote` para comandos SQL con la base remota.

### Redeploy

Tras cambiar variables de entorno:

```bash
git commit --allow-empty -m "Trigger Cloudflare redeploy"
git push
```

O desde Cloudflare Pages: `Deployments -> Retry deployment`.

## 13. Errores comunes y solución

### `No autorizado`

- La ruta `/api/oauth/start` no necesita `u`/`p`.
- El resto de `/api/docs` sí necesita credenciales de aplicación en query params.
- Comprueba que estás llamando a la ruta correcta.

### `Falta GOOGLE_OAUTH_CLIENT_ID`

- El secreto no está configurado en el entorno de Cloudflare.
- Revisar `Production` y redeploy.

### `redirect_uri_mismatch`

- El URI autorizado en Google Cloud debe ser exactamente:

```text
https://TU_DOMINIO/api/oauth/callback
```

- Coincidir protocolo, dominio y ruta.

### `Google no devolvió refresh_token`

- Ocurre si la app ya estaba autorizada y Google no fuerza la renovación.
- Revocar acceso de la app desde la cuenta Google.
- Abrir nuevamente `/api/oauth/start`.
- El endpoint ya usa `prompt=consent` y `access_type=offline`.

### `Service Accounts do not have storage quota`

- Significa que se está usando el fallback de service account.
- El backend debería preferir `GOOGLE_OAUTH_REFRESH_TOKEN`.
- Configura el refresh token y redeploy.
- Si se mantiene service account, pon la carpeta raíz dentro de una Unidad compartida y da permisos a la cuenta de servicio.

## 14. Recomendaciones para revisiones futuras

- Confirmar que `GOOGLE_OAUTH_REFRESH_TOKEN` está en uso y que `GOOGLE_SERVICE_ACCOUNT` no es la ruta principal.
- Revisar el `scope` de OAuth antes de cambiarlo: `drive.file` + `gmail.send`.
- Verificar en Cloudflare Pages que los secretos están en `Production` y no en otro entorno.
- Probar la subida de documentos con varios tipos de archivos y nombres con espacios.
- Comprobar que la carpeta de aula se crea correctamente y los `driveUrl` funcionan.
- Revisar si `/api/oauth/start` debería protegerse en el futuro.

## 15. Documentación relacionada

- `README.md` sección "Documentos adjuntos en Drive"
- `functions/api/docs.js`
- `functions/api/oauth/start.js`
- `functions/api/oauth/callback.js`
- `functions/api/_middleware.js`
- `functions/api/auth.js`
- `functions/api/prestar.js`
- `functions/api/backup.js`
- `migrations/0001_schema.sql`

## 16. Resumen de variables críticas

- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `GOOGLE_OAUTH_REFRESH_TOKEN`
- `GOOGLE_DRIVE_ROOT_FOLDER_ID`
- `DRIVE_FOLDER_ID` (fallback)
- `GOOGLE_SERVICE_ACCOUNT` (fallback opcional)
- `MAIL_FROM` (opcional)
- `RESEND_API_KEY` (según README para correo)
