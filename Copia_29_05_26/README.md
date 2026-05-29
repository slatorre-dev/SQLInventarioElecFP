# Inventario Electrónica FP — IES El Bosco

Sistema web completo de gestión de inventario para el departamento de Electricidad/Electrónica. Accesible desde cualquier dispositivo (PC, móvil, tablet) sin instalación, funciona también sin conexión.

---

## Qué hace la aplicación

### Acceso y usuarios

- Login con usuario y contraseña, o con **Google (OAuth)**
- Roles: **Consulta** (solo lectura), **Profesor** (préstamos y edición básica), **Jefe de Departamento** (acceso completo)
- Gestión de usuarios: alta, baja, cambio de rol y asignación de módulos desde la propia app
- Perfil personal: cambiar nombre, email y contraseña
- Historial de todas las acciones con fecha y usuario responsable

### Inventario principal

- Más de **1.100 ítems** catalogados con: nombre, referencia, aula, ubicación exacta (armario, estantería…), categoría, ciclo formativo, módulo, tipo (consumible/inventariable), cantidad, mínimo de stock, estado, proveedor, fecha de revisión, foto y observaciones
- Búsqueda en tiempo real insensible a mayúsculas y tildes, con matching en singular y plural
- Filtros combinables: por aula, categoría, ciclo, estado, tipo de material y texto libre
- Vista tabla o vista tarjetas, adaptadas a móvil
- Paginación configurable (10, 25, 50 ítems)
- Código QR por ítem: generado automáticamente, imprimible individualmente o en lote
- Posibilidad de ocultar ítems (solo visibles para administradores)
- Contenedores (prefijo SET- y CONT-): agrupan componentes en conjuntos o cajas físicas, con generación automática de unidades hijas

### Selección en lote

Selecciona varios ítems a la vez y aplica:
- Cambio de aula, ubicación, categoría, ciclo/módulo o tipo de material
- Añadir o reemplazar tags
- Marcar para mantenimiento
- Cambiar imagen en bloque
- Exportar a CSV o imprimir listado
- Eliminar con cuenta atrás de 5 segundos (doble confirmación)

### Préstamos

- Registrar préstamo: ítem, profesor, cantidad, aula destino y fecha de devolución prevista
- Préstamo de caja completa: registra un préstamo por cada componente del conjunto en un solo paso
- Devolución total o parcial
- Estados: Activo, Parcial, Devuelto, Vencido
- Vistas agrupadas: por profesor, por aula, por material
- Gestión de profesores prestatarios (nombre, departamento, email, importables desde CSV)
- Resaltado automático de préstamos vencidos

### Fotos y documentos

- Foto principal del ítem: subir desde archivo, hacer foto con la cámara del móvil directamente o arrastrar imagen
- Compresión automática antes de guardar
- Documentos adjuntos por ítem (PDF, imágenes, Word, Excel…) almacenados en Google Drive
- Vista ampliada de foto con un toque

### Agente Volt — IA por chat y voz

Botón flotante que abre un panel de chat para gestionar el inventario en lenguaje natural:

- **Buscar**: *"¿Dónde está la fusionadora de fibra?"* / *"¿Qué hay en el Aula 35?"*
- **Añadir ítem**: *"Añade 4 osciloscopios en el aula 40, armario metálico, para el ciclo de telecomunicaciones"* → rellena el formulario automáticamente
- **Préstamo**: *"Dame el multímetro"* / *"Me llevo el soldador"*
- **Devolución**: *"Devuelvo el osciloscopio de Juan"*
- **Stock**: *"Quedan 10 resistencias"* / *"¿Hay stock bajo?"*
- **Estado**: *"El polímetro está en avería"* / *"Cambia estado a Bueno"*
- **Mantenimiento**: *"El taladro necesita revisión"*
- **Resumen de aula**: *"¿Qué hay en el Aula 14?"* / *"Préstamos activos"*
- **Editar ficha**: *"Abre la ficha del osciloscopio"* → navega directamente al ítem
- **Escanear QR**: abre cámara para identificar material por código
- **Voz**: pulsa el micrófono y habla — espera 2 segundos de silencio antes de enviar, acumula frases largas
- **Aprendizaje**: Volt aprende correcciones y preferencias del usuario, guardadas en la base de datos
- **Historial de conversación persistente**: se recupera aunque se cierre el panel
- Respuestas con IA (GPT-4o mini) en streaming

### Auditoría y calidad de datos

- Panel de auditoría: detecta ítems con campos incompletos (sin aula, sin categoría, sin foto, sin ubicación…)
- Filtros por tipo de problema combinables
- Acciones masivas desde el panel de auditoría
- Historial completo de acciones: página visual con timeline agrupado por día, avatares de color por tipo, click en ítem navega directamente al modal

### Importación y exportación

- Importar CSV: detección automática de columnas, validación previa y vista previa de 50 filas antes de confirmar
- Importar backup JSON completo: restaura inventario, aulas, categorías, ciclos y profesores
- Exportar CSV del inventario filtrado o completo
- Exportar backup JSON: copia de seguridad completa
- Imprimir listado configurable por columnas
- Etiquetas QR en varios formatos (compacto 6/fila o con datos 5/fila)

### Configuración del departamento

Gestionable desde la app sin tocar código:
- **Aulas**: añadir, eliminar, reordenar, importar desde CSV
- **Categorías**: con icono emoji y color personalizable
- **Tags/etiquetas**: vocabulario controlado de palabras clave
- **Ciclos formativos y módulos**: alta, edición y eliminación con sus módulos
- **Ubicaciones sugeridas**: lista de sitios frecuentes (armarios, estanterías…)
- **Profesores prestatarios**: gestión del directorio de prestatarios

### Documentación del departamento

Accesos directos integrados a normativa, carpeta digital del curso, modelo de pedidos, sitio del departamento en SharePoint, Portal JCCM, TodoFP, BOE y DOCM.

### Funciona sin conexión (PWA)

- Instalable en el móvil o PC como app
- Carga instantánea desde caché aunque no haya red
- Actualización automática y silenciosa al volver la conexión

---

*Desarrollado para el Departamento de Electricidad/Electrónica — IES El Bosco*

---

## Documentación técnica

Este repositorio contiene la migración del proyecto original (Google Apps Script + Google Sheets) hacia una arquitectura moderna con Cloudflare Pages, Cloudflare Pages Functions y Cloudflare D1.

## 1. Estado actual

Estado a 2026-05-27 — versión `v423`:

- **Frontend:** SPA (Single Page Application) en HTML5, CSS3 y JavaScript vanilla sin frameworks.
- **Hosting:** Cloudflare Pages, despliegue automático en cada `git push` a `main`.
- **Backend:** Cloudflare Pages Functions en `functions/api/` (Workers serverless, runtime V8).
- **Base de datos:** Cloudflare D1 (SQLite remoto), base `inventario-departamento`, ID `5e996989-1972-481e-a43a-136e25380906`.
- **Documentos adjuntos:** Google Drive mediante OAuth de usuario real (refresh token).
- **IA conversacional:** Agente Volt usando GitHub Models (GPT-4o mini) con streaming.
- **Aprendizaje conversacional:** Tabla D1 `intent_learning` para persistir patrones del usuario.
- **Service Worker:** Activo — shell estático en caché, `/api/*` y Google APIs siempre en red.

## 2. Origen del proyecto

El proyecto original funcionaba así:

```
Navegador → Google Apps Script → Google Sheets
```

La latencia de Apps Script era alta y leer varias hojas de Sheets secuencialmente resultaba costoso. La nueva arquitectura es:

```
Navegador
  → Cloudflare Pages (hosting estático)
  → /api/* Cloudflare Pages Functions (Workers serverless)
  → Cloudflare D1 (SQLite remoto)
  → Google Drive API (documentos adjuntos, OAuth real)
  → GitHub Models API (IA conversacional Volt, GPT-4o mini)
```

## 3. Stack técnico

| Capa | Tecnología | Archivos clave |
|---|---|---|
| Frontend | HTML5 / CSS3 / JS vanilla (sin frameworks) | `index.html`, `css/styles.css`, `js/` |
| Backend | Cloudflare Pages Functions (Workers, runtime V8) | `functions/api/` |
| Base de datos | Cloudflare D1 (SQLite remoto) | `migrations/` |
| Documentos | Google Drive API + OAuth refresh token | `functions/api/docs.js` |
| IA conversacional | GitHub Models (GPT-4o mini streaming) | `functions/proxy/ai.js`, `js/agente-widget.js` |
| Hosting | Cloudflare Pages (auto-deploy desde GitHub `main`) | `wrangler.toml` |
| PWA | Service Worker + Web App Manifest | `sw.js`, `manifest.json` |

## 4. Estructura del repositorio

```
SQLInventarioElecFP/
├── index.html                  ← SPA principal, todos los modales y vistas
├── manifest.json               ← PWA: nombre, iconos, colores
├── sw.js                       ← Service Worker, VERSION aquí para cache-bust
├── wrangler.toml               ← Configuración Cloudflare (D1 binding, compatibilidad)
│
├── css/
│   └── styles.css              ← Todos los estilos (responsive, temas, modales)
│
├── js/                         ← Frontend vanilla JS (IIFEs, sin bundler)
│   ├── config.js               ← CICLOS, AULAS, CATS (se sobreescriben con D1 al login)
│   ├── state.js                ← Estado global SESSION, items, prestamos, helpers
│   ├── roles.js                ← Roles, permisos, can(), requirePerm()
│   ├── auth.js                 ← Login, OAuth Google, carga de datos en 2 fases
│   ├── api.js                  ← Helpers fetch con credenciales
│   ├── nav.js                  ← Navegación SPA (hash routing)
│   ├── search.js               ← Búsqueda global
│   ├── home.js                 ← Home: estadísticas, grillas de aulas/categorías/ciclos
│   ├── inventory.js            ← Inventario: filtros, vistas tabla/cards, bulk actions
│   ├── modal-item.js           ← Modal edición/creación de ítems, contenedores SET-/CONT-
│   ├── modal-aulas.js          ← Gestión CRUD de aulas
│   ├── modal-cats.js           ← Gestión CRUD de categorías y tags
│   ├── modal-ciclos.js         ← Gestión CRUD de ciclos y módulos
│   ├── modal-ubicaciones.js    ← Gestión de ubicaciones sugeridas
│   ├── modal-historial.js      ← Historial de auditoría filtrable
│   ├── prestamos.js            ← Sistema completo de préstamos y devoluciones
│   ├── import.js               ← Importación CSV (4 pasos) y backup JSON
│   ├── docs.js                 ← Documentos adjuntos por ítem (Drive)
│   ├── docs-dpto.js            ← Hub de documentación del departamento
│   ├── profile.js              ← Perfil de usuario, cambio de contraseña
│   ├── pwa.js                  ← Registro SW, install prompt, detección de updates
│   ├── qr-scanner.js           ← Escáner QR con cámara (jsQR)
│   ├── audit-log.js            ← Logging de acciones al backend
│   ├── reset.js                ← Flujo de recuperación de contraseña
│   ├── dept-game.js            ← Juego Pac-Man integrado
│   └── agente-widget.js        ← Agente Volt completo (NLP, chat, voz, aprendizaje)
│
├── functions/
│   └── api/
│       ├── _middleware.js      ← Auth guard: valida u+p o u+t en todas las rutas protegidas
│       ├── auth.js             ← Login, recuperación de contraseña, reset tokens
│       ├── meta.js             ← Metadatos ligeros (aulas, cats, ciclos, ubicaciones)
│       ├── list.js             ← Inventario comprimido + préstamos + profesores
│       ├── item.js             ← CRUD ítems: add, update, delete, bulkImport, toggleOculto
│       ├── prestar.js          ← Préstamos: prestar, prestarCaja, devolver + Gmail notify
│       ├── usuarios.js         ← Gestión de usuarios, roles, módulos asignados
│       ├── profesores.js       ← Gestión de profesores prestatarios
│       ├── config.js           ← Sync de aulas, categorías, ciclos, ubicaciones
│       ├── docs.js             ← Upload/delete de documentos en Google Drive
│       ├── perfil.js           ← Actualización de perfil y cambio de contraseña
│       ├── historial.js        ← Consulta del audit log (solo admin/jefe)
│       ├── intent-learning.js  ← Aprendizaje conversacional Volt en D1
│       └── oauth/
│           ├── login-google.js ← Valida JWT de Google Sign-In, crea/actualiza usuario
│           ├── start.js        ← Inicia flujo OAuth para Drive (genera refresh token)
│           └── callback.js     ← Recibe código OAuth de Google
│
├── migrations/
│   ├── 0001_schema.sql         ← Schema completo inicial
│   └── intent_learning.sql     ← Tabla aprendizaje Volt (añadida 24/05/2026)
│
└── icons/
    ├── icon-192.png
    ├── icon-512.png
    └── dept-electricidad.svg
```

## 5. Autenticación y middleware

### Middleware (`functions/api/_middleware.js`)

Protege todas las rutas `/api/*` excepto las públicas.

**Rutas públicas** (sin autenticación):
- `GET /api/auth` — login y recuperación de contraseña
- `POST /api/auth` — reset de contraseña
- `POST /api/oauth/login-google` — login con Google JWT
- `GET /api/oauth/callback` — recibe código OAuth de Google (Drive)
- `GET /api/backup` — exportación completa (protegida por otros medios)

**Métodos de autenticación para rutas protegidas:**

```
Método 1 — Login tradicional (usuario + contraseña):
  Query params: ?u={usuario}&p={password}
  SQL: SELECT usuario, nombre, rol, email FROM usuarios WHERE usuario=? AND password=?

Método 2 — Google OAuth (usuario + session_token):
  Query params: ?u={usuario}&t={session_token}
  SQL: SELECT usuario, nombre, rol, email FROM usuarios WHERE usuario=? AND session_token=?
```

Si ambos métodos fallan: respuesta `401 { ok: false, error: 'No autorizado' }`.

El usuario autenticado se pasa al handler como `data.user` (nunca leer de `request.user` — es inmutable en Workers).

### Login con Google (`functions/api/oauth/login-google.js`)

Flujo de Google Sign-In para usuarios del dominio `@iesjuanbosco.es`:

1. Cliente obtiene JWT de Google Sign-In widget
2. Cliente: `POST /api/oauth/login-google { token: "JWT" }`
3. Backend valida el JWT (aud, exp, iss, dominio de email)
4. Si el email no es `@iesjuanbosco.es` → `403 Forbidden`
5. Si el usuario existe por email: genera nuevo `session_token` y actualiza
6. Si no existe: crea usuario automáticamente con `rol='profesor'`
7. Respuesta: `{ ok: true, user: { usuario, nombre, email, rol, google_id, session_token, auth_method: 'google' } }`

El `session_token` son 40 caracteres alfanuméricos aleatorios. Se regenera en cada login por Google. En requests posteriores se usa como `?u={usuario}&t={session_token}`.

### Recuperación de contraseña

```
GET /api/auth?action=requestReset&usuario=X&appUrl=Y
  → Genera token 64 hex chars, expiry = now + 1h
  → Envía email con enlace {appUrl}#reset/{token}

POST /api/auth { action: 'resetPassword', token, newPassword }
  → Valida token y expiry en reset_tokens
  → UPDATE usuarios SET password=?
  → DELETE token (uso único)
```

## 6. Carga de datos en dos fases

`js/auth.js` orquesta la carga con barra de progreso:

**Fase 1 — `/api/meta` (metadatos ligeros):**
- Aulas, categorías, ubicaciones, ciclos con módulos
- Permite mostrar el home inmediatamente
- Merge automático: categorías declaradas + categorías usadas en inventario (evita "tarjetas desaparecidas" si faltan en tabla `categorias`)

**Fase 2 — `/api/list` (datos pesados):**
- Ítems del inventario (comprimidos)
- Préstamos activos e histórico
- Profesores prestatarios (merged de tabla `profesores` + tabla `usuarios`)

**Compresión de ítems** — reduce el tamaño de respuesta ~65%:

```json
{
  "itemsH": ["id", "ref", "aula", "item", "qty", "..."],
  "itemsC": [
    [1, "REF-001", "aula35", "Osciloscopio digital", 3, "..."],
    [2, "REF-002", "aula36", "Multímetro", 10, "..."]
  ]
}
```

Descompresión en cliente:
```javascript
items = itemsC.map(row => Object.fromEntries(itemsH.map((h, i) => [h, row[i]])))
```

**Headers completos de inventario (28 campos):**
```
id, ref, aula, mod, item, qty, min, cat, loc, est, util,
proveedor, tags, fecha, mant, mantFecha, mantNota, mantResp,
mantEstado, mantSolicitante, mantSolicitanteEmail, foto, obs,
code, es_contenedor, parent_id, tipo_material, oculto
```

## 7. Base de datos D1

**Base:** `inventario-departamento`  
**Binding Cloudflare:** `DB`  
**ID:** `5e996989-1972-481e-a43a-136e25380906`

### Schema completo de tablas

**`inventario`** — ítems del inventario (28 columnas)

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | INTEGER PK | ID autoincremental |
| `ref` | TEXT | Referencia interna |
| `aula` | TEXT | ID del aula (ej: `aula35`) |
| `mod` | TEXT | Módulo asociado |
| `item` | TEXT | Nombre del ítem |
| `qty` | INTEGER | Cantidad/stock actual |
| `min` | INTEGER | Stock mínimo (alerta si qty < min) |
| `cat` | TEXT | Categoría |
| `loc` | TEXT | Ubicación exacta (armario, estantería…) |
| `est` | TEXT | Estado: `Bueno`, `Deteriorado`, `Avería`, `Baja` |
| `util` | TEXT | Utilidad/descripción breve |
| `proveedor` | TEXT | Proveedor o URL de compra |
| `tags` | TEXT | Etiquetas (CSV o JSON array) |
| `fecha` | TEXT | Fecha de adquisición/revisión |
| `mant` | TEXT | Necesita mantenimiento (`0`\|`1`) |
| `mantFecha` | TEXT | Fecha solicitud de mantenimiento |
| `mantNota` | TEXT | Notas de mantenimiento |
| `mantResp` | TEXT | Responsable de mantenimiento |
| `mantEstado` | TEXT | Estado: `Pendiente`, `En reparación`, `Reparado`, `Resuelto` |
| `mantSolicitante` | TEXT | Usuario que solicitó el mantenimiento |
| `mantSolicitanteEmail` | TEXT | Email del solicitante |
| `foto` | TEXT | URL de foto o base64 comprimido |
| `obs` | TEXT | Observaciones libres |
| `code` | TEXT | Código QR (`IB-{id:05d}`) |
| `es_contenedor` | INTEGER | `1` si es caja/contenedor, `0` si no |
| `parent_id` | INTEGER | ID de la caja padre (NULL si es independiente) |
| `tipo_material` | TEXT | `consumible` o `inventariable` |
| `oculto` | INTEGER | `1` si está oculto (solo visible para admin) |

**`usuarios`** — usuarios de la aplicación

| Columna | Tipo | Descripción |
|---|---|---|
| `usuario` | TEXT PK | Nombre de usuario único |
| `password` | TEXT | Contraseña (texto plano — pendiente de hashear en FASE 1 seguridad) |
| `nombre` | TEXT | Nombre completo |
| `rol` | TEXT | `profesor`, `jefe departamento`, `consulta` |
| `email` | TEXT | Email institucional |
| `google_id` | TEXT | ID de Google (para OAuth) |
| `auth_method` | TEXT | `traditional` o `google` |
| `session_token` | TEXT | Token activo para OAuth (40 chars alfanuméricos) |
| `created_at` | TEXT | Timestamp de creación |

**`profesores`** — profesores prestatarios externos

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | INTEGER PK | |
| `nombre` | TEXT | Nombre completo |
| `departamento` | TEXT | Departamento de origen |
| `email` | TEXT | Email de contacto |

**`prestamos`** — registro de préstamos

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | INTEGER PK | |
| `itemId` | INTEGER | FK → inventario.id |
| `itemNombre` | TEXT | Nombre del ítem (desnormalizado para historial) |
| `cantidad` | INTEGER | Unidades prestadas |
| `aulaOrigen` | TEXT | Aula donde estaba el material |
| `aulaDestino` | TEXT | Aula donde va el material |
| `profesorId` | INTEGER | FK → profesores.id |
| `profesorNombre` | TEXT | Nombre del profesor (desnormalizado) |
| `gestionadoPor` | TEXT | Usuario de la app que registró el préstamo |
| `fechaPrestamo` | TEXT | Fecha de préstamo (ISO) |
| `fechaPrevista` | TEXT | Fecha prevista de devolución |
| `fechaDevolucion` | TEXT | Fecha real de devolución (NULL si activo) |
| `cantidadDevuelta` | INTEGER | Unidades devueltas (0 si activo) |
| `estado` | TEXT | `Activo`, `Devuelto`, `Parcial` |
| `obs` | TEXT | Observaciones |

**`aulas`** — aulas configurables

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | TEXT PK | Ej: `aula35` |
| `name` | TEXT | Nombre visible |
| `icon` | TEXT | Emoji de icono |
| `desc` | TEXT | Descripción |
| `th` | TEXT | Tema de color CSS (`th-blue`, `th-green`…) |
| `orden` | INTEGER | Orden de visualización |

**`categorias`** — categorías de material

| Columna | Tipo | Descripción |
|---|---|---|
| `name` | TEXT PK | Nombre de la categoría |
| `c` | TEXT | Color de texto (hex) |
| `bg` | TEXT | Color de fondo (hex) |
| `i` | TEXT | Emoji |
| `orden` | INTEGER | Orden de visualización |

**`ciclos`** — ciclos formativos y módulos (filas planas)

| Columna | Tipo | Descripción |
|---|---|---|
| `cicloId` | TEXT | ID del ciclo (ej: `IT`, `ME`) |
| `cicloNombre` | TEXT | Nombre completo del ciclo |
| `nivel` | TEXT | `CFGM` o `CFGS` |
| `icon` | TEXT | Emoji |
| `th` | TEXT | Tema de color CSS |
| `desc` | TEXT | Descripción |
| `modCod` | TEXT | Código del módulo |
| `modNombre` | TEXT | Nombre del módulo |
| `modHoras` | INTEGER | Horas del módulo |
| `cicloOrden` | INTEGER | Orden del ciclo |
| `modOrden` | INTEGER | Orden del módulo dentro del ciclo |
| `responsable` | TEXT | Usuario responsable del módulo (para notificaciones de préstamo) |
| PRIMARY KEY | | `(cicloId, modCod)` |

**`ubicaciones`** — ubicaciones sugeridas

| Columna | Tipo |
|---|---|
| `name` | TEXT PK |
| `orden` | INTEGER |

**`documentos`** — metadatos de adjuntos en Google Drive

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | INTEGER PK | |
| `itemId` | INTEGER | FK → inventario.id |
| `itemNombre` | TEXT | Nombre desnormalizado |
| `aulaId` | TEXT | Aula (para organizar en carpetas Drive) |
| `fileName` | TEXT | Nombre del archivo |
| `driveId` | TEXT | ID del archivo en Google Drive |
| `driveUrl` | TEXT | URL pública de visualización |
| `fecha` | TEXT | Fecha de subida |

**`log`** — auditoría completa de acciones

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | INTEGER PK AUTOINCREMENT | |
| `fecha` | TEXT | Timestamp ISO |
| `usuario` | TEXT | Usuario que realizó la acción |
| `nombre` | TEXT | Nombre completo del usuario |
| `rol` | TEXT | Rol en el momento de la acción |
| `accion` | TEXT | `add`, `update`, `delete`, `bulkImport`, `prestar`, `devolver`, `uploadDoc`, `deleteDoc`, `toggleOculto`… |
| `itemId` | TEXT | ID del ítem afectado |
| `resumen` | TEXT | Descripción legible de la acción |

**`reset_tokens`** — tokens de recuperación de contraseña

| Columna | Tipo | Descripción |
|---|---|---|
| `token` | TEXT PK | 64 caracteres hex, uso único |
| `usuario` | TEXT | Usuario que solicitó el reset |
| `expires` | INTEGER | Timestamp ms (validez 1 hora) |

**`intent_learning`** — aprendizaje conversacional del agente Volt

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | INTEGER PK AUTOINCREMENT | |
| `user_id` | TEXT NOT NULL | Usuario propietario |
| `phrase_raw` | TEXT NOT NULL | Frase original tal como la escribió el usuario |
| `phrase_norm` | TEXT NOT NULL | Frase normalizada (lowercase, sin tildes, solo alfanumérico) |
| `intent` | TEXT NOT NULL | Intención aprendida (ver lista de intents válidos) |
| `weight` | REAL DEFAULT 1.0 | Peso de refuerzo (sube +1 cada vez que se confirma) |
| `created_at` | TEXT | Timestamp de creación |
| `updated_at` | TEXT | Timestamp de última actualización |

Índices: `UNIQUE(user_id, phrase_norm, intent)`, `(user_id)`, `(intent)`, `(updated_at)`

**`app_meta`** — marcas internas de migraciones automáticas

| Columna | Tipo |
|---|---|
| `key` | TEXT PK |
| `value` | TEXT |

### Ciclos formativos configurados

| ID | Nombre | Nivel | Módulos |
|---|---|---|---|
| `IT` | Inst. de Telecomunicaciones | CFGM | 15 módulos |
| `IEA` | Inst. Eléctricas y Automáticas | CFGM | 15 módulos |
| `ME` | Mantenimiento Electrónico | CFGS | 15 módulos |
| `SEA` | Sistemas Electrotécnicos y Automatizados | CFGS | 15 módulos |
| `dpto` | Departamento | — | 1 módulo (fallback) |

### Aulas configuradas

| ID | Nombre | Tema |
|---|---|---|
| `aula35` | Aula 35 — Mantenimiento Electrónico | `th-blue` |
| `aula36` | Aula 36 — Electrónica | `th-purple` |
| `aula38` | Aula 38 — Electricidad | `th-amber` |
| `aula39` | Aula 39 — Electricidad | `th-orange` |
| `aula40` | Aula 40 — Electrónica | `th-teal` |
| `aula41` | Aula 41 — Electrónica | `th-green` |
| `aula_dep` | Departamento | `th-pink` |

## 8. Roles y permisos

### Roles canónicos

| Rol | Alias reconocidos | Permisos |
|---|---|---|
| `jefe departamento` | jefe/a departamento, admin, administrador/a, jefe de departamento | Todo (`*`) |
| `profesor` | profesor/a, teacher | `items.write`, `docs.write`, `loans.write`, `orders.write`, `profile.write` |
| `consulta` | readonly, viewer | Solo `profile.write` |

> Los roles se normalizan al leer de BD (lowercase + sin tildes) para tolerancia de variantes históricas.

### Permisos disponibles

| Permiso | Quién | Qué permite |
|---|---|---|
| `items.write` | Jefe, Profesor | Crear, editar, importar ítems |
| `items.delete` | Jefe | Eliminar ítems |
| `docs.read` | Todos | Ver documentos adjuntos |
| `docs.write` | Jefe, Profesor | Subir y eliminar documentos |
| `loans.write` | Jefe, Profesor | Registrar y devolver préstamos |
| `orders.write` | Jefe, Profesor | Notificar pedidos |
| `profile.write` | Todos | Editar propio perfil y contraseña |
| `config.manage` | Jefe | Aulas, ciclos, ubicaciones, usuarios |
| `categories.manage` | Jefe | Categorías y tags |
| `profesores.manage` | Jefe | Directorio de profesores prestatarios |
| `import.write` | Jefe | Importar CSV y restaurar backups |
| `visibility.manage` | Solo superadmin | Ocultar/mostrar ítems |

### Funciones de control en `js/roles.js`

```javascript
can(permission)         // true/false — comprueba permiso del usuario activo
canAction(action)       // mapea nombre de acción a permiso necesario
requirePerm(perm, msg)  // lanza toast y retorna false si no tiene permiso
roleLabelWithIcon()     // retorna texto del rol con icono visual
```

## 9. API — Referencia de endpoints

### Públicos

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/api/auth?action=login&u=X&p=Y` | Login tradicional |
| `GET` | `/api/auth?action=requestReset&usuario=X&appUrl=Y` | Solicitar recuperación de contraseña |
| `POST` | `/api/auth` `{ action:'resetPassword', token, newPassword }` | Resetear contraseña |
| `POST` | `/api/oauth/login-google` `{ token: "JWT_GOOGLE" }` | Login con Google |
| `GET` | `/api/oauth/start?u=X&p=Y` | Iniciar flujo OAuth para Drive |
| `GET` | `/api/oauth/callback` | Callback de Google (Drive OAuth) |

### Protegidos (`?u=usuario&p=password` o `?u=usuario&t=session_token`)

| Método | Endpoint | Action / Body | Descripción |
|---|---|---|---|
| `GET` | `/api/meta` | — | Aulas, cats, ciclos, ubicaciones, usuario |
| `GET` | `/api/list` | — | Inventario comprimido, préstamos, profesores |
| `POST` | `/api/item` | `{ action:'add', item:{...} }` | Crear ítem |
| `POST` | `/api/item` | `{ action:'update', item:{...} }` | Actualizar ítem |
| `POST` | `/api/item` | `{ action:'delete', id }` | Eliminar ítem |
| `POST` | `/api/item` | `{ action:'bulkImport', items:[...] }` | Importación masiva |
| `POST` | `/api/item` | `{ action:'toggleOculto', id, oculto }` | Ocultar/mostrar ítem (solo superadmin) |
| `POST` | `/api/prestar` | `{ action:'prestar', prestamo:{...} }` | Registrar préstamo + notificación Gmail |
| `POST` | `/api/prestar` | `{ action:'prestarCaja', cajaId, ... }` | Préstamo de caja completa |
| `POST` | `/api/prestar` | `{ action:'devolver', presId, cantidadDevuelta, obs }` | Devolver préstamo |
| `POST` | `/api/usuarios` | `{ action:'getUsers' }` | Listar usuarios y módulos |
| `POST` | `/api/usuarios` | `{ action:'userAdd', usuario:{...} }` | Crear usuario |
| `POST` | `/api/usuarios` | `{ action:'userUpdate', usuario:{...} }` | Actualizar usuario |
| `POST` | `/api/usuarios` | `{ action:'userDelete', usuario }` | Eliminar usuario |
| `POST` | `/api/usuarios` | `{ action:'userResetPassword', usuario, newPassword }` | Resetear contraseña de usuario |
| `POST` | `/api/usuarios` | `{ action:'userAssignModulos', nombre, modulos:[...] }` | Asignar módulos a usuario |
| `POST` | `/api/docs` | `{ action:'getDocs', itemId }` | Listar documentos de un ítem |
| `POST` | `/api/docs` | `{ action:'uploadDoc', itemId, fileName, mimeType, data }` | Subir documento a Drive |
| `POST` | `/api/docs` | `{ action:'deleteDoc', docId, driveId, itemId }` | Eliminar documento |
| `POST` | `/api/config` | `{ action:'aulasSync', aulas:[...] }` | Sincronizar aulas |
| `POST` | `/api/config` | `{ action:'catsSync', cats:[...] }` | Sincronizar categorías |
| `POST` | `/api/config` | `{ action:'ciclosSync', ciclos:[...] }` | Sincronizar ciclos y módulos |
| `POST` | `/api/config` | `{ action:'ubicacionesSync', ubicaciones:[...] }` | Sincronizar ubicaciones |
| `POST` | `/api/perfil` | `{ nombre, email }` | Actualizar perfil |
| `POST` | `/api/perfil` | `{ oldPassword, newPassword }` | Cambiar contraseña |
| `GET` | `/api/historial` | — | Audit log (solo jefe/admin) |
| `GET` | `/api/intent-learning` | — | Listar aprendizajes del usuario |
| `POST` | `/api/intent-learning` | `{ phrase, intent }` | Guardar o reforzar aprendizaje |
| `POST` | `/api/intent-learning/clear` | — | Borrar todos los aprendizajes del usuario |
| `POST` | `/api/intent-learning/bulk-import` | `{ items:[...] }` | Migración masiva desde localStorage |
| `DELETE` | `/api/intent-learning/:id` | — | Borrar un aprendizaje individual |

## 10. Agente Volt — Arquitectura técnica

El agente Volt es un widget IIFE en `js/agente-widget.js` (~3400 líneas) que no depende de ningún framework.

### NLP sin LLM (detección local)

```
normalize(s)             → lowercase + NFD + quitar diacríticos + trim
detectarIntencion(q)     → puntuación por keywords, retorna intent con mayor score
extraerNombreItem(q)     → corta en verbos de acción y preposiciones de ubicación
extraerAulaDeFrase(q)    → regex "aula/clase N" + comprueba contra array AULAS
extraerUbicacionDeFrase(q) → regex armario/estantería/vitrina + busca en state.inventario
extraerCantidadDeFrase(q)  → textToNumber() + múltiples patrones regex
expandKeywords(words)    → genera singular/plural + raíz parcial 75% longitud
textToNumber(q)          → convierte números en español a dígitos (uno→1, quince→15, treinta y dos→32)
```

### Intenciones válidas (whitelist)

| Intent | Descripción |
|---|---|
| `prestamo` | Pedir un material prestado |
| `devolver` | Devolver material prestado |
| `stock` | Consultar o actualizar stock |
| `estado` | Cambiar o consultar estado del ítem |
| `mantenimiento` | Solicitar mantenimiento |
| `buscar` | Buscar un ítem en el inventario |
| `resumen_aula` | Resumen del material en un aula |
| `quien_tiene` | Consultar préstamos activos de un ítem |
| `stock_bajo` | Listar ítems por debajo del mínimo |
| `lista_mantenimiento` | Listar ítems pendientes de mantenimiento |

### Aprendizaje conversacional

- Las correcciones del usuario se guardan en D1 (`intent_learning`)
- `cargarAprendizajes()`: carga desde backend, migra localStorage automáticamente una vez (flag `volt_intents_migrated_v1`)
- `guardarAprendizaje()`: UI optimista + POST backend, fallback localStorage si falla
- Límite: 300 registros por usuario; si se supera, elimina el de menor weight
- `weight`: sube +1 cada vez que el usuario confirma la misma frase/intent

### IA con streaming (GPT-4o mini)

```
Petición: POST /proxy/ai
Formato: OpenAI-compatible (stream: true)
Respuesta: Server-Sent Events (text/event-stream)
Rendering: md2html() convierte markdown → HTML en tiempo real
```

### Historial de conversación persistente

- `HISTORY_KEY = 'volt_chat_history_v1'` en localStorage
- Máximo 40 mensajes almacenados
- Se restaura al abrir el panel (con separador "— conversación anterior —")
- El botón 🧹 borra pantalla + historial persistido

### Reconocimiento de voz

- Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`)
- Idioma: `es-ES`
- Estrategia: `continuous: false` + reinicio automático de sesión al cortar por pausa del sistema
- Acumulación de transcript entre sesiones de reconocimiento
- Timer de 2 segundos de silencio antes de enviar (evita cortes al tomar aire)
- `textToNumber()` convierte palabras a dígitos (para dictado de cantidades)

## 11. Service Worker y PWA

**Archivo:** `sw.js`  
**Versión actual:** `v371` (incrementar en cada sesión de cambios para forzar cache-bust)

### Estrategias de caché

| Recurso | Estrategia |
|---|---|
| Shell local (HTML/CSS/JS) | Cache-first → red de respaldo → `index.html` si navegación |
| Google Fonts CSS | Stale-while-revalidate |
| Google Fonts woff2 | Network-only (gestionado por el navegador) |
| `/api/*` | Network-only (datos siempre frescos) |
| `script.google.com` | Network-only |
| `sharepoint.com` | Network-only |
| `fonts.gstatic.com` | Network-only |

### Recursos del shell (29 archivos)

```
index.html, manifest.json, css/styles.css,
js/config.js, js/state.js, js/roles.js, js/api.js, js/auth.js, js/nav.js,
js/search.js, js/home.js, js/inventory.js, js/modal-item.js, js/modal-aulas.js,
js/modal-ubicaciones.js, js/modal-cats.js, js/modal-ciclos.js, js/prestamos.js,
js/import.js, js/docs.js, js/docs-dpto.js, js/pwa.js, js/profile.js, js/reset.js,
js/qr-scanner.js, js/audit-log.js, js/modal-historial.js, js/dept-game.js,
js/agente-widget.js, favicon.svg, icons/icon-192.png, icons/icon-512.png
```

### Actualización

- Cambiar `VERSION` en `sw.js` → navegadores descargan nuevo shell
- El cliente recibe notificación de nueva versión y recarga en 5 segundos
- Mensaje `SKIP_WAITING` fuerza instalación inmediata sin esperar cierre de pestañas

### Manifest PWA

```json
{
  "name": "Inventario Taller FP — IES Juan Bosco",
  "display": "standalone",
  "theme_color": "#2563eb",
  "background_color": "#f4f6fb",
  "lang": "es",
  "icons": ["icon-192.png", "icon-512.png", "dept-electricidad.svg (maskable)"]
}
```

## 12. Documentos adjuntos en Google Drive

El backend usa Google Drive con OAuth de usuario real (no service account) porque:
- R2 (Cloudflare) requiere tarjeta bancaria
- Service accounts no tienen cuota propia sin Unidad Compartida

### Flujo de subida

1. Cliente comprime imagen (canvas, máx 360px, JPEG 0.45 o máx 1400px para docs, JPEG 0.5)
2. Cliente envía base64 al backend
3. Backend obtiene access token (OAuth refresh)
4. Backend busca o crea carpeta Drive con nombre del aula
5. Backend sube archivo con multipart upload
6. Backend intenta hacer el archivo público (`reader` para `anyone`)
7. Backend guarda metadatos en tabla `documentos`

### Obtención de access token

```
Si GOOGLE_OAUTH_REFRESH_TOKEN existe:
  POST https://oauth2.googleapis.com/token
  { grant_type: 'refresh_token', client_id, client_secret, refresh_token }

Si no, fallback a GOOGLE_SERVICE_ACCOUNT (JSON):
  Genera JWT RS256 → Bearer exchange
  Scope: https://www.googleapis.com/auth/drive
```

### Notificaciones Gmail en préstamos

`/api/prestar` envía email HTML al responsable del módulo cuando se registra un préstamo. Usa la misma cuenta OAuth del Drive (scope adicional `gmail.send`).

## 13. Contenedores y agrupaciones

- **Prefijo `SET-`**: conjunto de componentes relacionados. El padre es `SET-XXX-00`, los hijos son `SET-XXX-01`, `SET-XXX-02`, etc.
- **Prefijo `CONT-`**: contenedor físico (caja, maletín…)
- `es_contenedor = 1` → el ítem es inventariable (no consumible) y puede tener hijos
- `parent_id` → apunta al padre (NULL si es raíz)
- Al borrar un contenedor: se desasocia a todos los hijos (`UPDATE parent_id=NULL WHERE parent_id=?`)
- Préstamo de caja (`prestarCaja`): crea un préstamo independiente por cada hijo con `qty > 0`

## 14. Importación CSV — Detección automática de columnas

El importador reconoce automáticamente 19 campos por nombre de columna:

| Campo interno | Nombres de columna CSV reconocidos |
|---|---|
| `item` | nombre, artículo, producto, descripción, material |
| `ref` | referencia, SKU, código |
| `aula` | sala, espacio, clase, aula |
| `qty` | cantidad, unidades, stock, existencias |
| `min` | mínimo, stock_mínimo, reposición |
| `cat` | categoría, tipo, familia |
| `loc` | ubicación, localización, estantería, sitio |
| `est` | estado, condición, status |
| `mant` | mantenimiento, reparación, avería |
| `tipo_material` | consumible, inventariable |
| `tags` | etiquetas, palabras_clave |
| `obs` | observaciones, notas, comentarios |
| `proveedor` | supplier, tienda |
| `util` | utilidad, uso, función |
| `fecha` | revisión, actualizado |
| `foto` | imagen, photo |
| `code` | código QR, inventario, ID |

Flujo en 4 pasos: subida → mapeo de columnas → vista previa (50 filas) → importación con informe de resultado.

## 15. Variables de entorno en Cloudflare Pages

### D1 Binding (obligatorio)

```
Variable: DB
Database: inventario-departamento
ID: 5e996989-1972-481e-a43a-136e25380906
```

### Environment variables / secrets

| Variable | Obligatoria | Descripción |
|---|---|---|
| `GOOGLE_OAUTH_CLIENT_ID` | Sí | OAuth client ID de Google Cloud |
| `GOOGLE_OAUTH_CLIENT_SECRET` | Sí | OAuth client secret |
| `GOOGLE_OAUTH_REFRESH_TOKEN` | Sí | Refresh token para Gmail + Drive |
| `GOOGLE_DRIVE_ROOT_FOLDER_ID` | Sí | ID carpeta raíz en Drive para documentos |
| `MAIL_FROM` | No | Email remitente notificaciones (default: `inventarioelec@iesjuanbosco.es`) |
| `GOOGLE_SERVICE_ACCOUNT` | No | JSON de service account (fallback si no hay refresh token) |

Después de modificar variables en Cloudflare Pages hay que redeplegar:

```bash
git commit --allow-empty -m "trigger redeploy"
git push
```

## 16. Seguridad — Qué nunca subir al repositorio

```
client_secret*.json
credentials*.json
GOOGLE_OAUTH_CLIENT_SECRET (valor)
GOOGLE_OAUTH_REFRESH_TOKEN (valor)
JSON de service account
backup*.sql / backup*.json con datos reales
migration*.sql con datos reales
```

`.gitignore` incluye patrones para evitar subida accidental de credenciales locales.

**Si se filtra un secreto:**
1. Revocar en Google Cloud Console
2. Generar nuevo credential
3. Actualizar en Cloudflare Pages → Environment Variables
4. Redeploy (push vacío o cambio de código)

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

## 18. Documentacion de desarrollo

Para seguimiento del desarrollo y mejoras implementadas:

- **`DEVELOPMENT.md`**: Registro de todas las sesiones de desarrollo, features implementadas, commits y próximos pasos.
- **`IDEAS.md`**: Ideas y mejoras sugeridas, con priorización y estimación de impacto. Incluye mejoras de gestión de inventario y optimizaciones de performance.

### Últimas sesiones

**Sesión Mayo 2026 (v139→v147):**
- Separación de modales de impresión (inventario vs QR)
- Feature de indicador de cambios sin guardar en modal de items
- Mejoras en placeholder de búsqueda
- Control de acceso por usuario específico (historial)

**Próximas mejoras sugeridas:**
- Historial de cambios (auditoría)
- Indexación de base de datos para búsqueda rápida
- Filtro por mantenimiento pendiente
- Lazy loading de imágenes
- Consolidación de items duplicados
