# Memoria de configuración de documentos

Fecha: 2026-05-16
Proyecto: SQLInventarioElecFP

## 1. Estado actual

La aplicación usa un modelo híbrido:

- Las nuevas subidas se guardan en Cloudflare R2.
- Los documentos antiguos que ya tienen `driveUrl` se conservan en Google Drive y siguen funcionando.
- D1 guarda solo los metadatos: item, aula, nombre, proveedor, clave R2 o URL de Drive.

## 2. Configuración R2

Crear un bucket R2:

```text
inventario-documentos
```

En Cloudflare Pages → Settings → Functions → R2 bucket bindings:

```text
Variable name: DOCS_BUCKET
Bucket: inventario-documentos
```

También queda declarado en `wrangler.toml`:

```toml
[[r2_buckets]]
binding = "DOCS_BUCKET"
bucket_name = "inventario-documentos"
```

## 3. D1

La tabla `documentos` mantiene las columnas antiguas de Drive y añade columnas para R2:

```sql
provider TEXT DEFAULT 'drive'
r2Key TEXT DEFAULT ''
mimeType TEXT DEFAULT ''
size INTEGER DEFAULT 0
driveSyncStatus TEXT DEFAULT ''
```

El endpoint `functions/api/docs.js` intenta crear esas columnas automáticamente si faltan. También existe la migración `migrations/0002_documentos_r2.sql`.

## 4. Funcionamiento

- `uploadDoc`: guarda nuevas subidas en R2 y registra `provider='r2'`.
- `getDocs`: devuelve documentos antiguos y nuevos.
- `viewDoc`: si el documento es R2, lo sirve desde el bucket privado; si es Drive, redirige a `driveUrl`.
- `deleteDoc`: borra el objeto de R2 o intenta borrar el archivo de Drive según corresponda, y elimina el metadato de D1.

## 5. Drive antiguo

Los campos `driveId` y `driveUrl` se mantienen para no romper documentos ya existentes.

Google Drive ya no es necesario para nuevas subidas. Si en el futuro se quiere sincronizar también a Drive, se puede usar `driveSyncStatus` para marcar `pending`, `ok` o `error`.
