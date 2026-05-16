# Descripción completa del proyecto y recuperación de trabajo

Fecha: 2026-05-16
Proyecto: SQLInventarioElecFP

## Objetivo del proyecto

Migrar el inventario del departamento de Electricidad y Electrónica del IES El Bosco desde Google Apps Script + Google Sheets a una arquitectura moderna con Cloudflare Pages, Cloudflare Workers y Cloudflare D1 (SQLite).

El objetivo principal es mejorar:
- tiempo de carga
- velocidad de respuesta
- mantenimiento del backend
- despliegue automático desde GitHub

## Qué se ha realizado hasta ahora

1. Se mantuvo el frontend como una SPA en `index.html` con JavaScript vanilla.
2. Se organizó el backend en Cloudflare Workers bajo `functions/api/`.
3. Se migró el almacenamiento de datos a Cloudflare D1 con `inventario-departamento`.
4. Se añadió soporte para documentos adjuntos en `functions/api/docs.js`, con subida a Google Drive desde el backend.
5. Se documentó la configuración necesaria en `README.md`.
6. Se creó el archivo de memoria `SUBIDA_DOCS_MEMORIA.md` con detalles de la configuración de subida a Drive.
7. Se eliminó de la historia de Git cualquier commit que incluyera un archivo de credenciales expuesto.

## Estado actual del proyecto

### Funcionalidades implementadas
- Inventario de material técnico
- Gestión de aulas, categorías, ciclos y módulos
- Préstamos y devoluciones
- Usuarios con roles y permisos
- Documentos adjuntos subidos a Google Drive
- PWA instalable con cache offline
- Configuración de Cloudflare Pages y D1

### Funcionalidades pendientes
- Migrar documentos adjuntos de Google Drive a Cloudflare R2 (pendiente)
- Envío de emails desde backend (pendiente)
- Mejora de la gestión de contraseñas y recuperación de cuentas

## Repositorio y archivos importantes

- `README.md`: descripción general y primeros pasos.
- `PROYECTO_DESCRIPCION_RECUPERACION.md`: documento completo de explicación y recuperación.
- `SUBIDA_DOCS_MEMORIA.md`: memoria específica de la subida de documentos a Google Drive.
- `functions/api/docs.js`: implementación de subida y eliminación de documentos en Drive.
- `migrations/0001_schema.sql`: definición de las tablas D1.
- `wrangler.toml`: configuración de Cloudflare Pages y D1.
- `MIGRACION_CLOUDFLARE_D1.md`: instrucciones de migración de datos desde el proyecto anterior.

## Cómo recuperar el trabajo en otro ordenador

### 1. Clonar el repositorio

```bash
git clone https://github.com/sebantonio/SQLInventarioElecFP.git
cd SQLInventarioElecFP
git checkout main
```

### 2. Leer la documentación del proyecto

- `README.md`
- `PROYECTO_DESCRIPCION_RECUPERACION.md`
- `SUBIDA_DOCS_MEMORIA.md`
- `MIGRACION_CLOUDFLARE_D1.md`

### 3. Instalar dependencias y herramientas

- Instalar `wrangler` si no está instalado:

```bash
npm install -g wrangler
wrangler login
```

### 4. Configurar Cloudflare D1

- Crear la base de datos D1 `inventario-departamento` si no existe.
- Ejecutar el schema desde `migrations/0001_schema.sql`.

```bash
wrangler d1 create inventario-departamento
wrangler d1 execute inventario-departamento --file=migrations/0001_schema.sql
```

### 5. Migrar datos desde el proyecto anterior

Si necesitas restaurar datos reales del proyecto original:
- Obtener el backup JSON del proyecto anterior.
- Guardarlo en la raíz del repositorio como `backup.json`.
- Seguir las instrucciones en `MIGRACION_CLOUDFLARE_D1.md`.

### 6. Configurar secretos en Cloudflare

Crear los secretos necesarios en Cloudflare Pages (`Settings` → `Functions` / `Environment Variables`):

- `GOOGLE_SERVICE_ACCOUNT`
  - Valor: JSON completo del service account de Google Cloud.
  - Debe incluir `private_key`, `client_email`, `token_uri`, etc.
- `GOOGLE_DRIVE_ROOT_FOLDER_ID`
  - Valor: ID de la carpeta raíz de Google Drive donde se guardarán los documentos.

### 7. Compartir la carpeta de Drive con el service account

El service account debe tener permiso de Editor en la carpeta de Drive raíz.

- `client_email` del service account: `inventarioelec@inventarioelec.iam.gserviceaccount.com`

### 8. Configurar el binding D1 en Cloudflare Pages

En Cloudflare Pages:
- `Settings` → `Functions` → `D1 database bindings`
- Agregar:
  - Variable: `DB`
  - Base de datos: `inventario-departamento`

### 9. Probar localmente

```bash
wrangler pages dev . --d1=DB=inventario-departamento
```

Abrir `http://localhost:8788`.

### 10. Desplegar y verificar

- Hacer `git push origin main`.
- Revisar desplegados en Cloudflare Pages.
- Probar la subida de documentos desde la app.

## Qué hacer si hay un error de secreto en GitHub

Si GitHub bloquea el push por un secreto expuesto:
1. Eliminar el archivo de credenciales de la rama.
2. Reescribir el historial para quitar el commit que lo contenía.
3. Volver a hacer push.

Este escenario ya se ha manejado en el repositorio actual: se eliminó el commit local con el archivo de credenciales y se dejó la rama `main` limpia.

## Puntos clave para recordar

- No subir nunca el JSON del service account al repositorio.
- Guardar los secretos solo en Cloudflare.
- `GOOGLE_SERVICE_ACCOUNT` y `GOOGLE_DRIVE_ROOT_FOLDER_ID` son indispensables para la subida de docs.
- El correo del service account es el usuario técnico que debe tener acceso a Drive.
- Si cambias de ordenador, clona el repo, instala `wrangler`, crea o vincula la base de datos D1, y configura los secretos en Cloudflare.

## Enlaces directos

- `README.md`
- `PROYECTO_DESCRIPCION_RECUPERACION.md`
- `SUBIDA_DOCS_MEMORIA.md`
- `MIGRACION_CLOUDFLARE_D1.md`
