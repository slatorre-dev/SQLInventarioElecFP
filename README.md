# SQLInventarioElecFP

Inventario web del departamento de Electricidad y Electronica del IES El Bosco.

Este repositorio contiene la migracion del proyecto original basado en Google Apps Script + Google Sheets hacia una arquitectura con Cloudflare Pages, Cloudflare Pages Functions y Cloudflare D1.

## 1. Estado actual

Estado a 2026-05-16:

- Frontend: SPA en HTML, CSS y JavaScript vanilla.
- Hosting: Cloudflare Pages.
- Backend: Cloudflare Pages Functions en `functions/api/`.
- Base de datos: Cloudflare D1, base `inventario-departamento`.
- Documentos adjuntos: Google Drive mediante OAuth de usuario real.
- Despliegue: automatico al hacer `git push` a `main`.
- Service worker: activo para cachear shell estatico; `/api/*` no se cachea.

## 2. Origen del proyecto

El proyecto original funcionaba asi:

```text
Navegador -> Google Apps Script -> Google Sheets
```

Ese enfoque funciona, pero la carga inicial puede tardar mucho porque Apps Script tiene latencia alta y leer varias hojas de Sheets secuencialmente es costoso.

El nuevo enfoque es:

```text
Navegador
  -> Cloudflare Pages
  -> /api/* Cloudflare Pages Functions
  -> Cloudflare D1
  -> Google Drive API para documentos adjuntos
```

## 3. Funcionalidades implementadas

- Inventario de material tecnico.
- Organizacion por aulas.
- Organizacion por ciclos y modulos.
- Categorias personalizables.
- Prestamos y devoluciones.
- Profesores prestatarios.
- Usuarios de la app con roles.
- Perfil de usuario.
- Mantenimiento/reparacion de items.
- Adjuntos/documentos por item.
- Fotos comprimidas antes de subir.
- Codigos QR por item.
- Escaneo QR con camara.
- Importacion CSV.
- Exportacion CSV y backup JSON.
- PWA instalable.
- Cache offline del shell de la aplicacion.

## 4. Stack tecnico

| Capa | Tecnologia | Archivos |
|---|---|---|
| Frontend | HTML/CSS/JS vanilla | `index.html`, `css/`, `js/` |
| Backend | Cloudflare Pages Functions | `functions/api/` |
| Base de datos | Cloudflare D1 | `migrations/0001_schema.sql` |
| Documentos | Google Drive OAuth | `functions/api/docs.js`, `functions/api/oauth/` |
| Hosting | Cloudflare Pages | GitHub `main` |
| PWA | Service Worker | `sw.js`, `manifest.json` |

## 5. Estructura del repositorio

```text
SQLInventarioElecFP/
  index.html
  manifest.json
  sw.js
  wrangler.toml
  README.md
  SUBIDA_DOCS_MEMORIA.md
  PROYECTO_DESCRIPCION_RECUPERACION.md
  MIGRACION_CLOUDFLARE_D1.md

  css/
    styles.css

  js/
    api.js
    auth.js
    config.js
    docs.js
    docs-dpto.js
    home.js
    import.js
    inventory.js
    modal-aulas.js
    modal-cats.js
    modal-ciclos.js
    modal-item.js
    nav.js
    prestamos.js
    profile.js
    pwa.js
    qr-scanner.js
    reset.js
    roles.js
    search.js
    state.js

  functions/
    api/
      _middleware.js
      auth.js
      config.js
      docs.js
      item.js
      list.js
      meta.js
      perfil.js
      prestar.js
      profesores.js
      usuarios.js
      oauth/
        start.js
        callback.js

  migrations/
    0001_schema.sql

  icons/
```

## 6. Backend API

Las funciones viven en `functions/api/`.

### Autenticacion

`functions/api/_middleware.js` protege las rutas `/api/*`.

El frontend envia credenciales de la app en query params:

```text
?u=usuario&p=password
```

El middleware consulta la tabla `usuarios` en D1. Si no coinciden, devuelve 401.

Rutas publicas:

- `/api/auth` para login y recuperacion de contrasena.
- `/api/oauth/callback` porque Google redirige sin credenciales de la app.

`/api/oauth/start` no es publica: requiere `u` y `p`.

### Endpoints principales

| Endpoint | Metodo | Uso |
|---|---|---|
| `/api/auth` | GET/POST | Login y recuperacion de contrasena |
| `/api/meta` | GET | Aulas, categorias, ciclos, usuario |
| `/api/list` | GET | Inventario, prestamos, profesores |
| `/api/item` | POST | Add/update/delete/bulkImport |
| `/api/config` | POST | Aulas, categorias, ciclos |
| `/api/prestar` | POST | Prestamos y devoluciones |
| `/api/profesores` | POST | Gestion profesores prestatarios |
| `/api/usuarios` | POST | Gestion usuarios app, roles, modulos y reset de contrasena; el reset acepta `newPassword` y `password` por compatibilidad |
| `/api/perfil` | POST | Perfil y contrasena |
| `/api/docs` | POST | Documentos adjuntos |
| `/api/oauth/start` | GET | Iniciar OAuth Drive |
| `/api/oauth/callback` | GET | Recibir codigo OAuth |

## 7. Base de datos D1

Base remota:

```text
inventario-departamento
```

Binding en Cloudflare:

```text
DB
```

Tablas:

| Tabla | Contenido |
|---|---|
| `inventario` | Items de inventario, incluyendo `tipo_material` (`consumible` o `inventariable`) y `proveedor` |
| `usuarios` | Usuarios de la app |
| `profesores` | Profesores prestatarios adicionales; la app tambien incluye usuarios como prestatarios por defecto |
| `prestamos` | Prestamos y devoluciones |
| `aulas` | Aulas configurables |
| `categorias` | Categorias configurables |
| `ubicaciones` | Ubicaciones sugeridas/editables para los items |
| `ciclos` | Ciclos y modulos en filas planas; responsables por modulo identificado como `cicloId__modCod` |
| `modulos` | Tabla heredada/auxiliar de modulos |
| `documentos` | Metadatos de adjuntos de Drive |
| `log` | Auditoria |
| `reset_tokens` | Tokens de recuperacion |
| `app_meta` | Marcas internas de migraciones automaticas |

Schema:

```bash
wrangler d1 execute inventario-departamento --file=migrations/0001_schema.sql
```

En este proyecto se trabaja preferentemente con la base remota. Ver `claude.md`.

## 8. Carga de datos

`js/auth.js` carga datos en dos fases:

1. `/api/meta`
   - Aulas.
   - Categorias.
   - Ciclos.
   - Usuario.
   - Permite mostrar home rapidamente.

2. `/api/list`
   - Items.
   - Prestamos.
   - Profesores.
   - Datos pesados en segundo paso.

Los items se devuelven comprimidos:

```json
{
  "itemsH": ["id", "ref", "..."],
  "itemsC": [[1, "REF", "..."]]
}
```

El frontend los reconstruye como objetos.

## 9. Categorias

Las categorias se guardan en la tabla `categorias`.

Durante la migracion se detecto que algunos items tenian `inventario.cat`, pero faltaban filas en `categorias`. Para evitar que desaparezcan tarjetas de categoria al recargar:

- `/api/meta` mezcla categorias declaradas con categorias usadas por inventario.
- `/api/list` hace lo mismo.
- Las categorias faltantes se muestran con estilo generado.
- Al editarlas desde la app y guardar, pasan a quedar registradas en `categorias`.

Los iconos de categorias se cambian desde:

```text
Departamento -> Gestionar categorias
```

## 10. Documentos adjuntos en Drive

El sistema actual usa Google Drive con OAuth de usuario real.

Motivo:

- R2 se descarto porque Cloudflare pide tarjeta bancaria.
- Service account de Google Drive falla si no hay Unidad compartida, porque no tiene cuota propia.
- OAuth permite usar el almacenamiento de una cuenta real.

Documentacion completa:

```text
SUBIDA_DOCS_MEMORIA.md
```

### Secretos necesarios

En Cloudflare Pages, entorno `Production`:

```text
GOOGLE_OAUTH_CLIENT_ID
GOOGLE_OAUTH_CLIENT_SECRET
GOOGLE_OAUTH_REFRESH_TOKEN
GOOGLE_DRIVE_ROOT_FOLDER_ID
RESEND_API_KEY
MAIL_FROM
```

Fallback heredado:

```text
GOOGLE_SERVICE_ACCOUNT
```

Si `GOOGLE_OAUTH_REFRESH_TOKEN` existe, el backend usa OAuth. Si no existe, intenta service account.

### OAuth

Endpoints:

```text
/api/oauth/start
/api/oauth/callback
```

Para generar refresh token:

```text
https://TU_DOMINIO/api/oauth/start?u=USUARIO_APP&p=PASSWORD_APP
```

### Drive root folder

`GOOGLE_DRIVE_ROOT_FOLDER_ID` es solo el ID de la carpeta.

Ejemplo:

```text
https://drive.google.com/drive/folders/1Ld7IhlJ1cmihza6CMskMSxHty0Qujbg
```

Valor:

```text
1Ld7IhlJ1cmihza6CMskMSxHty0Qujbg
```

## 11. Service worker

Archivo:

```text
sw.js
```

Puntos importantes:

- Cachea shell estatico.
- No cachea peticiones no GET.
- No cachea `/api/*`.
- Para forzar actualizacion se cambia `VERSION`.
- Cambios visuales de HTML/CSS/JS deben subir `VERSION`; el modal de items usa rejilla de 3 columnas en escritorio, QR compacto y campos agrupados desde `v120`. La tabla de inventario usa placeholder de foto reducido, utilidad truncada y nombre clicable desde `v122`. Las categorias se ordenan alfabeticamente y pueden crearse desde el selector del item desde `v123`; el rol profesor puede gestionarlas desde `v124`.

Esto es importante porque cachear `/api/meta` o `/api/list` produjo problemas de datos antiguos durante la migracion.

## 12. Variables y secretos Cloudflare

### D1 binding

```text
Variable: DB
Database: inventario-departamento
```

### Environment variables / secrets

```text
GOOGLE_OAUTH_CLIENT_ID
GOOGLE_OAUTH_CLIENT_SECRET
GOOGLE_OAUTH_REFRESH_TOKEN
GOOGLE_DRIVE_ROOT_FOLDER_ID
GOOGLE_SERVICE_ACCOUNT  (fallback opcional)
RESEND_API_KEY          (recuperacion de contrasena)
MAIL_FROM               (remitente verificado; opcional)
```

Despues de modificar variables en Cloudflare Pages hay que redeplegar.

Redeploy por Git:

```bash
git commit --allow-empty -m "Trigger Cloudflare redeploy"
git push
```

## 13. Seguridad

No subir nunca:

- `client_secret*.json`
- `credentials*.json`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `GOOGLE_OAUTH_REFRESH_TOKEN`
- JSON de service account
- `backup.json`
- `migration.sql`

`.gitignore` incluye patrones para evitar subir credenciales locales.

Si se filtra un secreto:

1. Revocar en Google Cloud o cuenta Google.
2. Generar nuevo.
3. Actualizar Cloudflare.
4. Redeploy.

## 14. Puesta en marcha desde cero

### 14.1 Clonar repo

```bash
git clone https://github.com/sebantonio/SQLInventarioElecFP.git
cd SQLInventarioElecFP
git checkout main
```

### 14.2 Instalar Wrangler

```bash
npm install -g wrangler
wrangler login
```

### 14.3 Crear D1

```bash
wrangler d1 create inventario-departamento
```

Copiar `database_id` a `wrangler.toml`.

### 14.4 Aplicar schema

```bash
wrangler d1 execute inventario-departamento --file=migrations/0001_schema.sql
```

### 14.5 Configurar Pages

En Cloudflare:

```text
Workers & Pages -> Create -> conectar GitHub repo
Settings -> Functions -> D1 database bindings -> DB
Settings -> Environment variables -> secretos Google
```

### 14.6 Crear usuario inicial

```bash
wrangler d1 execute inventario-departamento --command="INSERT INTO usuarios (usuario,password,nombre,rol,email) VALUES ('Admin','Admin','Administrador','Jefe Departamento','')"
```

Cambiar esa contrasena despues.

### 14.7 Migrar datos

Ver:

```text
MIGRACION_CLOUDFLARE_D1.md
```

## 15. Flujo de trabajo diario

1. Editar codigo local.
2. Probar sintaxis si procede:

```bash
node --check functions/api/docs.js
```

3. Commit.
4. Push.
5. Cloudflare Pages despliega.

## 16. Commits relevantes recientes

```text
c71036b Fix D1 write audit failures
8965306 Derive missing categories from inventory
3c3cb73 Support shared drives for document uploads
29bc0b6 Revert "Use R2 for new document uploads"
d9dc653 Add Google Drive OAuth setup flow
b227d58 Remove OAuth environment diagnostics
```

## 17. Documentacion adicional

- `SUBIDA_DOCS_MEMORIA.md`: documentos adjuntos y OAuth Drive.
- `PROYECTO_DESCRIPCION_RECUPERACION.md`: recuperacion completa del proyecto.
- `MIGRACION_CLOUDFLARE_D1.md`: migracion desde Google Sheets.
- `claude.md`: notas de trabajo con D1 remoto.
