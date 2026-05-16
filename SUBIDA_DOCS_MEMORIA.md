# Memoria de configuración de subida de documentos a Google Drive

Fecha: 2026-05-16
Proyecto: SQLInventarioElecFP

## 1. Qué se ha hecho

Se ha modificado `functions/api/docs.js` para que la aplicación pueda subir documentos adjuntos a Google Drive desde Cloudflare Pages/Workers.

También se documentó en `README.md` la necesidad de configurar dos secretos en Cloudflare:
- `GOOGLE_SERVICE_ACCOUNT`
- `GOOGLE_DRIVE_ROOT_FOLDER_ID`

## 2. Secretos necesarios en Cloudflare

### 2.1 `GOOGLE_SERVICE_ACCOUNT`

Este valor debe ser el JSON completo del service account de Google Cloud.

Ejemplo de datos que contiene:
- `type`
- `project_id`
- `private_key_id`
- `private_key`
- `client_email`
- `token_uri`
- `auth_provider_x509_cert_url`
- `client_x509_cert_url`

En el código se utiliza como `env.GOOGLE_SERVICE_ACCOUNT`.

### 2.2 `GOOGLE_DRIVE_ROOT_FOLDER_ID`

Este valor debe ser el ID de la carpeta de Google Drive donde se almacenarán los documentos.

Cómo obtenerlo:
- Abre Google Drive.
- Entra en la carpeta que quieres usar como raíz.
- Copia la parte de la URL que aparece tras `/folders/`.

Ejemplo:
- URL: `https://drive.google.com/drive/folders/1aBcD_efGHijkLmNoPqRsTuvWxYz`
- ID: `1aBcD_efGHijkLmNoPqRsTuvWxYz`

No se guarda la URL completa; solo el ID.

## 3. Permisos y usuario de servicio

El service account es una cuenta técnica de Google Cloud, no un usuario humano.

En el JSON del service account, el campo `client_email` es el correo exacto que debe tener permisos en Drive.

Ejemplo:
- `inventarioelec@inventarioelec.iam.gserviceaccount.com`

Ese correo debe añadirse como colaborador a la carpeta de Drive y debe tener permiso de `Editor`.

## 4. Cómo funciona el código en `functions/api/docs.js`

### 4.1 `getGoogleAccessToken(env)`

- Lee `GOOGLE_SERVICE_ACCOUNT` desde `env`.
- Parse el JSON del service account.
- Genera un JWT firmado con la clave privada (`private_key`).
- Solicita un token de acceso a `https://oauth2.googleapis.com/token` con scope `https://www.googleapis.com/auth/drive`.

### 4.2 `findOrCreateDriveFolder(env, parentFolderId, folderName)`

- Usa el token de acceso para buscar una subcarpeta con el nombre del aula dentro de la carpeta raíz.
- Si existe, devuelve su ID.
- Si no existe, crea la carpeta y devuelve el nuevo ID.

### 4.3 `uploadFileToDrive(env, folderId, fileName, mimeType, base64Data)`

- Sube el archivo a Drive usando multipart upload.
- Intenta aplicar permiso de lectura pública (`anyone` reader), pero si falla no detiene la lógica principal.
- Devuelve `driveId` y `driveUrl`.

### 4.4 `onRequestPost({ request, env })`

Maneja tres acciones principales:
- `getDocs`: lista documentos de un item.
- `deleteDoc`: borra los metadatos y, si existe `driveId`, intenta borrar el archivo en Drive.
- `uploadDoc`: sube el documento a Drive, guarda los metadatos en D1 y registra auditoría.

## 5. Configuración adicional en Cloudflare

Además de los secretos, hay que tener el binding D1 configurado:
- Variable: `DB`
- Base de datos: `inventario-departamento`

## 6. Errores más comunes

- `Google Drive no configurado`
  - Falta `GOOGLE_SERVICE_ACCOUNT`.

- `Drive root folder no configurado`
  - Falta `GOOGLE_DRIVE_ROOT_FOLDER_ID` (o `DRIVE_FOLDER_ID` si se usa viejo nombre).

- `No se pudo crear la carpeta de aula en Drive`
  - El service account no tiene acceso a la carpeta raíz o la API de Drive no responde.

- `No se pudo subir el archivo a Drive`
  - Problema en la subida a la API de Google Drive.

## 7. Recomendación final

Después de configurar los secretos y permisos:
1. Despliega el proyecto en Cloudflare Pages.
2. Prueba subir un documento desde la app.
3. Si hay fallo, revisa los logs de Cloudflare Functions y el mensaje de error que devuelve la aplicación.

## 8. Notas de seguridad

- Nunca compartas el JSON del service account en GitHub.
- El JSON debe guardarse solo como secreto en Cloudflare.
- Si el JSON se ha expuesto, reemplaza la clave privada en Google Cloud y genera una nueva.
