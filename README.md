# SQLInventarioElecFP

Versión 2 del inventario del departamento de Electricidad y Electrónica del IES El Bosco.
Misma app que el proyecto original (`inventarioDepartamentoV2`) pero con backend migrado de Google Apps Script + Google Sheets a **Cloudflare Workers + Cloudflare D1 (SQLite)**.

---

## De dónde viene este proyecto

El proyecto original (`inventarioDepartamentoV2 / inventarioDepartamentoV3`) lleva en producción desde 2025 y funciona así:

```
Navegador → Google Apps Script (backend) → Google Sheets (base de datos)
```

Ese sistema funciona pero tiene un problema grave de rendimiento: la carga inicial puede tardar **20-60 segundos** porque Google Apps Script tiene latencia alta y lee las hojas de Sheets secuencialmente.

Este nuevo proyecto migra el backend a Cloudflare, que ya aloja el frontend, consiguiendo tiempos de respuesta de **< 200ms**.

---

## Stack nuevo

```
Navegador
    │
    ├── HTML/CSS/JS  →  Cloudflare Pages (igual que antes)
    │
    └── GET/POST /api/*  →  Cloudflare Workers (backend JS)
                                    │
                            Cloudflare D1 (SQLite en el edge)
```

| Capa | Tecnología | Dónde |
|---|---|---|
| Frontend | HTML + CSS + JS vanilla (sin frameworks) | `index.html`, `css/`, `js/` |
| Backend | Cloudflare Workers (JS) | `functions/api/` |
| Base de datos | Cloudflare D1 (SQLite) | BD `inventario-departamento` |
| Hosting | Cloudflare Pages | Auto-deploy desde GitHub `main` |

---

## Qué hace la app

- **Inventario** de material técnico organizado por aulas y ciclos formativos
- **Préstamos y devoluciones** de material a profesores
- **Mantenimiento**: marcar ítems en reparación, asignar responsable
- **Documentos adjuntos** a ítems (actualmente en Google Drive, pendiente migrar a R2)
- **Gestión de usuarios** con roles: Jefe Departamento, profesor, consulta/lector
- **QR por ítem**: escaneo con cámara y etiquetas imprimibles
- **Importar/exportar** CSV y backup JSON
- **PWA instalable**, funciona offline con service worker

---

## Estructura de archivos

```
SQLInventarioElecFP/
│
├── index.html              ← App SPA completa (todas las páginas en un HTML)
├── manifest.json           ← PWA manifest
├── sw.js                   ← Service worker (caché offline)
├── favicon.svg
├── wrangler.toml           ← Configuración Cloudflare (D1 binding)
│
├── css/
│   └── styles.css          ← Todos los estilos
│
├── js/                     ← Frontend (vanilla JS, sin frameworks)
│   ├── state.js            ← Variables globales: items, SESSION, etc.
│   ├── api.js              ← apiGet() y apiPost() → llaman a /api/*
│   ├── auth.js             ← Login, logout, loadData() en 2 fases
│   ├── config.js           ← AULAS, CICLOS, CATS por defecto
│   ├── roles.js            ← Sistema de permisos frontend
│   ├── nav.js              ← Navegación entre vistas
│   ├── home.js             ← Pantalla de inicio con tarjetas
│   ├── inventory.js        ← Listado de inventario (tabla + tarjetas)
│   ├── modal-item.js       ← Modal de añadir/editar ítem
│   ├── modal-aulas.js      ← Gestión de aulas
│   ├── modal-cats.js       ← Gestión de categorías
│   ├── modal-ciclos.js     ← Gestión de ciclos y módulos
│   ├── prestamos.js        ← Préstamos y devoluciones
│   ├── import.js           ← Importar CSV y restaurar backup JSON
│   ├── docs.js             ← Documentos adjuntos
│   ├── docs-dpto.js        ← Documentación del departamento (SharePoint)
│   ├── profile.js          ← Perfil de usuario
│   ├── reset.js            ← Recuperación de contraseña
│   ├── search.js           ← Buscador global
│   ├── pwa.js              ← Registro del service worker
│   └── qr-scanner.js      ← Escaneo QR con cámara
│
├── functions/              ← Cloudflare Workers (backend)
│   └── api/
│       ├── _middleware.js  ← Autenticación compartida (lee u= y p= de query)
│       ├── auth.js         ← GET /api/auth?action=login
│       ├── meta.js         ← GET /api/meta  (aulas, cats, ciclos — carga rápida)
│       ├── list.js         ← GET /api/list  (items, prestamos, profesores)
│       ├── item.js         ← POST /api/item (add, update, delete, bulkImport)
│       ├── prestar.js      ← POST /api/prestar (prestar, devolver)
│       ├── config.js       ← POST /api/config (aulasSync, catsSync, ciclosSync)
│       ├── profesores.js   ← POST /api/profesores (profAdd, profUpdate, profDelete)
│       ├── perfil.js       ← POST /api/perfil (updateProfile, changePassword)
│       └── usuarios.js     ← POST /api/usuarios (getUsers, userAdd, userUpdate...)
│
├── migrations/
│   └── 0001_schema.sql     ← Definición de todas las tablas D1
│
└── icons/
    ├── icon-192.png
    ├── icon-512.png
    └── qr-code.svg
```

---

## Base de datos D1 — tablas

| Tabla | Equivalente en Sheets | Contenido |
|---|---|---|
| `inventario` | Hoja Inventario | Ítems de material (22 columnas) |
| `usuarios` | Hoja Usuarios | Cuentas de acceso + roles |
| `profesores` | Hoja Profesores | Profesores prestatarios |
| `prestamos` | Hoja Prestamos | Historial de préstamos |
| `aulas` | Hoja Aulas | Aulas/espacios configurables |
| `categorias` | Hoja Categorias | Categorías de ítems |
| `ciclos` | Hoja Ciclos | Ciclos formativos y módulos (filas planas) |
| `modulos` | Hoja Modulos | Módulos con responsable (para emails) |
| `documentos` | Hoja Documentos | Metadatos de archivos en Drive |
| `log` | Hoja Log | Auditoría de acciones |
| `reset_tokens` | PropertiesService | Tokens de recuperación de contraseña |

---

## Cómo funciona la autenticación

El frontend envía `u=usuario&p=contraseña` como query params en cada petición.
El `_middleware.js` los lee, consulta la tabla `usuarios` y rechaza con 401 si no coinciden.
Las credenciales se guardan en `localStorage` bajo la clave `inv_session`.

Las peticiones GET van a `/api/meta` y `/api/list`.
Las peticiones POST van a `/api/item`, `/api/prestar`, etc. — el body JSON incluye `action` para diferenciar operaciones dentro del mismo endpoint.

---

## Carga en dos fases (optimización de rendimiento)

`auth.js → loadData()` hace dos llamadas separadas:

1. **Fase 1 — `/api/meta`** (~50ms): devuelve solo aulas, categorías y ciclos. El home se muestra inmediatamente con las tarjetas navegables. Los contadores muestran un skeleton animado.

2. **Fase 2 — `/api/list`** (~150ms): devuelve ítems, préstamos y profesores en background. Los ítems llegan comprimidos como arrays (`itemsC` + `itemsH`) para reducir el tamaño del JSON ~40%. Al terminar, el home se refresca con los contadores reales.

---

## Workers pendientes de implementar

Estos endpoints aún no están escritos — se irán añadiendo:

| Endpoint | Acción | Estado |
|---|---|---|
| `/api/docs` | getDocs, uploadDoc, deleteDoc | Pendiente |
| `/api/pedidos` | notificarPedido | Pendiente |
| `/api/auth` | requestReset, resetPassword | Pendiente (solo login implementado) |
| Email (préstamos, mantenimiento, stock bajo) | — | Pendiente (usar Resend API) |
| Backup/restore | restoreBackup | Pendiente |

---

## Pasos para poner en marcha (resumen)

### 1. Instalar Wrangler
```bash
npm install -g wrangler
wrangler login
```

### 2. Crear la base de datos D1
```bash
wrangler d1 create inventario-departamento
# Copia el database_id que te devuelve y ponlo en wrangler.toml
```

### 3. Aplicar el schema
```bash
wrangler d1 execute inventario-departamento --file=migrations/0001_schema.sql
```

### 4. Migrar datos desde el proyecto anterior
- En la app actual (`inventariodepartamento.pages.dev`): **⚙️ Departamento → Exportar / Backup → Backup completo JSON**
- Guarda el archivo como `backup.json` en la raíz de este proyecto
- Ejecuta el script de migración (ver `MIGRACION_CLOUDFLARE_D1.md` para el código completo):
```bash
node migrate.js
wrangler d1 execute inventario-departamento --file=migration.sql
```

### 5. Añadir usuarios manualmente
```bash
wrangler d1 execute inventario-departamento --command="INSERT INTO usuarios VALUES ('admin','TU_PASSWORD','Nombre','Jefe Departamento','email@centro.es')"
```

### 6. Probar en local
```bash
wrangler pages dev . --d1=DB=inventario-departamento
# Abre http://localhost:8788
```

### 6.1. Configurar subida a Google Drive
La subida de documentos requiere dos secretos en Cloudflare:
- `GOOGLE_SERVICE_ACCOUNT`: JSON del service account con permisos de Drive
- `GOOGLE_DRIVE_ROOT_FOLDER_ID`: ID de la carpeta raíz de Drive donde se crearán las subcarpetas por aula

### 7. Crear página en Cloudflare Pages
- Cloudflare Dashboard → Workers & Pages → Create → conectar repo `SQLInventarioElecFP`
- Settings → Functions → D1 database bindings → Variable: `DB` → BD: `inventario-departamento`
- Git push → auto-deploy

---

## Diferencias con el proyecto original

| Aspecto | Original (V3) | Este (V4) |
|---|---|---|
| Backend | Google Apps Script | Cloudflare Workers |
| BD | Google Sheets | Cloudflare D1 (SQLite) |
| Tiempo de carga | 5-60 segundos | < 200ms |
| Redespliegue backend | Manual (editor GAS) | Automático (git push) |
| Caché necesaria | Sí (CacheService 3min) | No |
| Emails | MailApp (GAS) | Pendiente: Resend API |
| Documentos | Google Drive | Google Drive (pendiente R2) |
| URL producción | inventariodepartamento.pages.dev | Pendiente crear en Cloudflare |

---

## Guía de migración completa

Ver `MIGRACION_CLOUDFLARE_D1.md` para la planificación detallada paso a paso.
