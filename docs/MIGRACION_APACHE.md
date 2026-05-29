# Migración a Apache + Node.js + SQLite

**Fecha:** 29/05/2026  
**Carpeta:** `migracionApache/`  
**Estado:** Lista para desplegar — pendiente pruebas en Ubuntu

---

## Contexto

La infraestructura original corre en Cloudflare (Pages + Workers + D1). Esta migración traslada todo a un servidor Ubuntu local con Apache, para uso en intranet del centro sin dependencia de servicios externos.

---

## Estructura generada

```
migracionApache/
├── public/                  ← Frontend copiado tal cual (sin cambios)
│   ├── index.html
│   ├── sw.js
│   ├── manifest.json
│   ├── css/, js/, icons/
├── server/                  ← Backend Node.js Express
│   ├── server.js            ← Punto de entrada, puerto 3000
│   ├── db.js                ← Wrapper D1-compatible sobre better-sqlite3
│   ├── package.json         ← express, better-sqlite3, cors, dotenv, multer
│   ├── .env.example         ← Variables de entorno
│   ├── middleware/
│   │   └── auth.js          ← Auth migrada desde _middleware.js
│   ├── routes/              ← 11 handlers migrados desde functions/api/
│   │   ├── auth.js
│   │   ├── list.js
│   │   ├── item.js
│   │   ├── prestar.js
│   │   ├── historial.js
│   │   ├── usuarios.js
│   │   ├── config.js
│   │   ├── meta.js
│   │   ├── intent-learning.js
│   │   ├── profesores.js
│   │   ├── perfil.js
│   │   └── backup.js
│   └── scripts/
│       └── import-db.js     ← Importa backup SQL → inventario.db
├── database/
│   └── backup_20260529.sql  ← Backup D1 exportado el 29/05/2026
├── apache/
│   └── inventario.conf      ← VirtualHost Apache
└── INSTALL.md               ← Guía paso a paso de instalación
```

---

## Decisiones de diseño

### `db.js` — Wrapper D1-compatible

El cambio más importante. Cloudflare D1 tiene una API async (`env.DB.prepare(sql).bind(...).run()`). `better-sqlite3` es síncrono. En lugar de reescribir todos los handlers, se creó un wrapper que expone la misma API D1 pero por debajo llama al driver síncrono:

```js
DB.prepare(sql).bind(a, b).run()   // devuelve Promise — igual que D1
DB.prepare(sql).bind(a, b).first() // devuelve Promise — igual que D1
DB.prepare(sql).bind(a, b).all()   // devuelve Promise<{results:[...]}>
DB.batch([stmt1, stmt2])           // ejecuta en transacción SQLite
DB.raw                             // acceso síncrono para middleware
```

Esto permite que cada handler cambie solo:
- `env.DB` → `DB`
- `data?.user || request.user` → `req.user`
- `url.searchParams.get('x')` → `req.query.x`
- `await request.json()` → `req.body`
- `Response.json(data)` → `res.json(data)`
- `env.GOOGLE_*` → `process.env.GOOGLE_*`

### Apache como reverse proxy

Apache sirve los estáticos (`public/`) directamente y redirige `/api/*` al proceso Node en `localhost:3000`. El frontend no necesita ningún cambio — las URLs de la API son idénticas.

```apache
ProxyPass /api/ http://127.0.0.1:3000/api/
DocumentRoot /var/www/inventario/public
```

### Base de datos

D1 es SQLite con una capa de API. El backup exportado con `wrangler d1 export` es SQL estándar. El script `import-db.js` lo importa directamente a un fichero `.db` local sin ninguna conversión.

---

## Qué NO está migrado

| Componente | Razón | Impacto |
|---|---|---|
| `oauth/` (Google login) | Requiere configurar OAuth con dominio local | Login clásico u/p sigue funcionando |
| `docs.js` | Usa Google Drive API | Adjuntos de documentos no disponibles |
| `form-corrections.js` | Funcionalidad secundaria | Menor |
| Fotos vía Cloudflare Images | Necesita adaptarse a almacenamiento local | Las fotos ya subidas seguirán siendo URLs externas |

---

## Pasos para desplegar

Ver [INSTALL.md](../INSTALL.md) en la raíz de `migracionApache/`.

Resumen rápido:
1. `sudo apt install apache2 nodejs npm`
2. `sudo a2enmod proxy proxy_http rewrite`
3. `cd server && npm install`
4. `node scripts/import-db.js ../database/backup_20260529.sql`
5. Copiar `apache/inventario.conf` → `/etc/apache2/sites-available/`
6. Crear servicio systemd para el proceso Node
7. `sudo systemctl start inventario && sudo systemctl reload apache2`

---

## Backup incluido

`database/backup_20260529.sql` — exportado de D1 remoto el 29/05/2026 a las ~20:23 con `wrangler d1 export --remote`.
