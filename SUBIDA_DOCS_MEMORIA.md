# Memoria de configuracion de documentos adjuntos

Fecha: 2026-05-16
Proyecto: SQLInventarioElecFP
Estado actual: Google Drive con OAuth de usuario real como via principal.

## 1. Resumen ejecutivo

La aplicacion permite adjuntar documentos a los items del inventario. Los metadatos se guardan en Cloudflare D1 y los archivos se guardan en Google Drive.

La arquitectura actual es:

```text
Navegador
  -> /api/docs (Cloudflare Pages Functions)
  -> Google Drive API con OAuth de usuario real
  -> D1 tabla documentos para guardar metadatos
```

Se descarto Cloudflare R2 como almacenamiento principal porque su activacion exige tarjeta bancaria en Cloudflare, y este proyecto no debe depender de una tarjeta personal.

Tambien se descarto usar solo service account para Drive porque Google Drive no concede cuota de almacenamiento propia a las cuentas de servicio. Ese metodo solo funciona bien si se usa una Unidad compartida de Google Workspace o delegacion de dominio.

Por tanto, la solucion estable elegida es:

- Subir a Drive usando OAuth de una cuenta real.
- Usar la cuota de Drive de esa cuenta real.
- Mantener los documentos antiguos ya guardados en Drive.
- Guardar en D1 los `driveId` y `driveUrl` de cada archivo.

## 2. Archivos implicados

### Backend

- `functions/api/docs.js`
  - Gestiona `getDocs`, `uploadDoc` y `deleteDoc`.
  - Obtiene tokens de Google.
  - Crea/busca subcarpetas por aula.
  - Sube archivos a Drive.
  - Guarda metadatos en D1.

- `functions/api/oauth/start.js`
  - Inicia el flujo OAuth con Google.
  - Redirige al usuario a la pantalla de consentimiento.
  - Requiere usuario/contraseña de la app mediante `u` y `p`.

- `functions/api/oauth/callback.js`
  - Recibe el `code` de Google.
  - Lo intercambia por tokens.
  - Muestra el `refresh_token` para guardarlo como secreto en Cloudflare.

- `functions/api/_middleware.js`
  - Autentica las rutas `/api/*`.
  - Deja publico `/api/oauth/callback` porque Google redirige sin `u`/`p`.
  - `/api/oauth/start` sigue protegido por usuario y password de la app.

### Frontend

- `js/docs.js`
  - Gestiona documentos pendientes.
  - Convierte imagenes grandes a JPG comprimido antes de subir.
  - Llama a `apiPost({ action: 'uploadDoc', ... })`.
  - Muestra los documentos existentes y permite eliminarlos.

### Base de datos

- `migrations/0001_schema.sql`
  - Define tabla `documentos`.

Tabla relevante:

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

## 3. Secretos y variables de Cloudflare

Configurar en Cloudflare Pages, entorno `Production`:

```text
GOOGLE_OAUTH_CLIENT_ID
GOOGLE_OAUTH_CLIENT_SECRET
GOOGLE_OAUTH_REFRESH_TOKEN
GOOGLE_DRIVE_ROOT_FOLDER_ID
```

### GOOGLE_OAUTH_CLIENT_ID

ID del cliente OAuth 2.0 de Google Cloud.

Formato aproximado:

```text
374986567801-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com
```

### GOOGLE_OAUTH_CLIENT_SECRET

Secreto del cliente OAuth 2.0.

Debe tratarse como secreto. No debe subirse al repositorio ni compartirse.

### GOOGLE_OAUTH_REFRESH_TOKEN

Token persistente que permite a Cloudflare obtener access tokens nuevos sin pedir autorizacion cada vez.

Se obtiene abriendo:

```text
https://TU_DOMINIO/api/oauth/start?u=USUARIO_APP&p=PASSWORD_APP
```

Ese endpoint redirige a Google. Tras aceptar permisos, `/api/oauth/callback` muestra el refresh token.

### GOOGLE_DRIVE_ROOT_FOLDER_ID

ID de la carpeta raiz de Drive donde se guardaran documentos.

Ejemplo:

```text
https://drive.google.com/drive/folders/1Ld7IhlJ1cmihza6CMskMSxHty0Qujbg
```

Valor que hay que guardar:

```text
1Ld7IhlJ1cmihza6CMskMSxHty0Qujbg
```

## 4. Configuracion en Google Cloud

### 4.1 Habilitar Drive API

1. Abrir Google Cloud Console.
2. Seleccionar el proyecto del inventario.
3. Ir a `APIs y servicios` -> `Biblioteca`.
4. Buscar `Google Drive API`.
5. Habilitarla.

### 4.2 Pantalla de consentimiento OAuth

1. Ir a `APIs y servicios` -> `Pantalla de consentimiento de OAuth`.
2. Configurar la app.
3. Nombre recomendado:

```text
Inventario Taller FP
```

4. Scope recomendado:

```text
https://www.googleapis.com/auth/drive.file
```

Este scope permite que la aplicacion cree y gestione archivos que ella misma crea. Es mas limitado que acceso completo a Drive.

### 4.3 Cliente OAuth

1. Ir a `APIs y servicios` -> `Credenciales`.
2. `Crear credenciales` -> `ID de cliente de OAuth`.
3. Tipo:

```text
Aplicacion web
```

4. URI de redireccion autorizada:

```text
https://TU_DOMINIO/api/oauth/callback
```

Ejemplo real:

```text
https://inventarioelecfp.pages.dev/api/oauth/callback
```

La URI debe coincidir exactamente con la URL que usa la app.

## 5. Flujo OAuth paso a paso

### Paso 1: Guardar client id y secret

En Cloudflare Pages, entorno `Production`, crear:

```text
GOOGLE_OAUTH_CLIENT_ID
GOOGLE_OAUTH_CLIENT_SECRET
GOOGLE_DRIVE_ROOT_FOLDER_ID
```

### Paso 2: Desplegar

Las variables de Cloudflare Pages solo se aplican en el siguiente deployment.

Formas de redeploy:

```bash
git commit --allow-empty -m "Trigger Cloudflare redeploy"
git push
```

o desde Cloudflare:

```text
Deployments -> ultimo deployment -> Retry deployment / Redeploy
```

### Paso 3: Generar refresh token

Abrir:

```text
https://TU_DOMINIO/api/oauth/start?u=USUARIO_APP&p=PASSWORD_APP
```

Importante:

- `USUARIO_APP` y `PASSWORD_APP` son credenciales de la aplicacion, no de Google.
- Deben existir en la tabla `usuarios`.
- Si la password tiene caracteres especiales, debe ir codificada en URL.

### Paso 4: Autorizar en Google

Aceptar permisos con la cuenta real que debe almacenar los documentos en Drive.

### Paso 5: Guardar refresh token

El callback muestra un token largo. Guardarlo en Cloudflare:

```text
GOOGLE_OAUTH_REFRESH_TOKEN
```

Volver a redeploy.

## 6. Funcionamiento interno del backend

### 6.1 getGoogleAccessToken(env)

El backend usa esta prioridad:

1. Si existe `GOOGLE_OAUTH_REFRESH_TOKEN`, usa OAuth de usuario real.
2. Si no existe, intenta usar el metodo antiguo de service account con `GOOGLE_SERVICE_ACCOUNT`.

El metodo principal actual es OAuth.

Con OAuth:

```text
refresh_token -> https://oauth2.googleapis.com/token -> access_token
```

Ese `access_token` se usa para llamar a Drive API.

### 6.2 findOrCreateDriveFolder

Busca una subcarpeta dentro de `GOOGLE_DRIVE_ROOT_FOLDER_ID` con el nombre del aula.

Ejemplo:

```text
Documentos Inventario/
  Aula 35/
  Aula 36/
  Departamento/
```

Si la carpeta de aula no existe, la crea.

### 6.3 uploadFileToDrive

Sube el archivo con multipart upload a:

```text
https://www.googleapis.com/upload/drive/v3/files
```

Guarda:

- `driveId`
- `driveUrl`

### 6.4 deleteDoc

Cuando se elimina un documento:

1. Intenta borrar el archivo en Drive si tiene `driveId`.
2. Aunque Drive falle, elimina el metadato en D1.

Esto evita que la app quede bloqueada por un fallo puntual de Drive.

## 7. Endpoints

### POST /api/docs

Usa `action` en el body.

#### getDocs

Entrada:

```json
{
  "action": "getDocs",
  "itemId": 123
}
```

Respuesta:

```json
{
  "ok": true,
  "docs": []
}
```

#### uploadDoc

Entrada:

```json
{
  "action": "uploadDoc",
  "itemId": 123,
  "itemNombre": "Fuente alimentacion",
  "aulaId": "aula35",
  "aulaName": "Aula 35",
  "fileName": "manual.pdf",
  "mimeType": "application/pdf",
  "data": "BASE64..."
}
```

Respuesta:

```json
{
  "ok": true,
  "doc": {
    "id": 1,
    "driveId": "...",
    "driveUrl": "..."
  }
}
```

#### deleteDoc

Entrada:

```json
{
  "action": "deleteDoc",
  "docId": 1,
  "driveId": "..."
}
```

## 8. Service account: estado y motivo del cambio

El proyecto conserva codigo de service account como fallback, pero no es la via recomendada.

Problema encontrado:

```text
Service Accounts do not have storage quota
```

Causa:

- La cuenta de servicio no tiene almacenamiento propio en Drive.
- Compartir una carpeta normal de "Mi unidad" no siempre resuelve el problema.

Soluciones posibles:

1. Unidad compartida de Google Workspace.
2. Delegacion de dominio.
3. OAuth de usuario real.

Se eligio OAuth de usuario real porque:

- No requiere tarjeta bancaria.
- Usa el almacenamiento de la cuenta real.
- Funciona con carpetas normales de Drive.
- Encaja con Cloudflare Pages Functions.

## 9. R2: decision tomada

Se implemento y revirtio una version de subida a Cloudflare R2.

Motivo del revert:

- Activar R2 exige tarjeta bancaria en Cloudflare.
- El proyecto es para el centro/empresa y no debe depender de una tarjeta personal.

Commit revertido:

```text
29bc0b6 Revert "Use R2 for new document uploads"
```

## 10. Seguridad

No subir nunca al repositorio:

- `client_secret*.json`
- `credentials*.json`
- JSON de service account
- refresh tokens
- client secrets

`.gitignore` incluye:

```text
client_secret*.json
credentials*.json
```

Si se filtra un secreto:

1. Revocarlo en Google Cloud o Google Account.
2. Generar uno nuevo.
3. Actualizar Cloudflare.
4. Redeploy.

## 11. Errores comunes

### `No autorizado`

La URL `/api/oauth/start` usa credenciales de la app:

```text
?u=USUARIO_APP&p=PASSWORD_APP
```

No son credenciales de Google.

### `Falta GOOGLE_OAUTH_CLIENT_ID`

La variable no esta disponible en el deployment actual.

Revisar:

- Esta en entorno `Production`.
- Nombre exacto.
- Se hizo redeploy despues de crearla.

### `redirect_uri_mismatch`

La URL configurada en Google Cloud no coincide con:

```text
https://TU_DOMINIO/api/oauth/callback
```

Debe coincidir protocolo, dominio y ruta.

### Google no devuelve refresh_token

Puede pasar si ya se autorizo antes.

Soluciones:

- Revocar acceso de la app desde la cuenta Google.
- Volver a abrir `/api/oauth/start`.
- El endpoint usa `prompt=consent` y `access_type=offline`.

### Error de cuota de service account

Significa que no se esta usando OAuth o falta `GOOGLE_OAUTH_REFRESH_TOKEN`, por lo que el backend cae al fallback antiguo.

Configurar el refresh token y redeploy.

## 12. Estado final verificado

- OAuth autorizado correctamente.
- `GOOGLE_OAUTH_REFRESH_TOKEN` configurado en Cloudflare.
- Subida a Drive funcionando.
- Diagnosticos temporales de variables eliminados.
- R2 revertido.
- Documentos antiguos de Drive compatibles.
