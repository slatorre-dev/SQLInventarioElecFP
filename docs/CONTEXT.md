# Contexto del Proyecto — SQLInventarioElecFP

> Leer esto al inicio de cada sesión desde un PC nuevo.

## ¿Qué es esto?
Inventario de material electrónico del IES El Bosco (FP). App web PWA con:
- **Frontend**: HTML/CSS/JS vanilla, Service Worker (sw.js)
- **Backend**: Cloudflare Pages Functions (JS)
- **BD**: Cloudflare D1 (SQLite remoto) — base de datos: `inventario_db`
- **Auth**: Login propio con sesión en localStorage (`inv_session`)

## URL de producción
La app está en Cloudflare Pages. Cada `git push` a `main` despliega automáticamente.

## Flujo de trabajo
1. Editar código localmente
2. `git push` → despliega en Cloudflare Pages
3. Para SQL en BD remota: usar Cloudflare Dashboard → D1 → inventario_db → Console
4. **NO usar** `wrangler pages dev` para BD remota (ejecuta D1 local)

## Versión actual
- sw.js: **v249** (22/05/2026)

## Roles del sistema
| Rol en BD | Se muestra como | Permisos |
|---|---|---|
| `SuperAdmin` | `Jefe/a Departamento` + 👑 (solo él) | `['*']` total |
| `Jefe/a Departamento` | `Jefe/a Departamento` | `['*']` total |
| `Jefe Departamento` | `Jefe/a Departamento` | `['*']` total |
| `admin` | `Jefe/a Departamento` | `['*']` total |
| `Profesor/a` | `Profesor/a` | items, docs, préstamos, pedidos |
| `Consulta` | `Consulta` | solo perfil |

## Usuarios en BD (22/05/2026)
| usuario | nombre | rol |
|---|---|---|
| Seba | Seba | **SuperAdmin** 👑 |
| Admin | Admin | Jefe Departamento |
| adiaz | Antonio Díaz... | jefe/a departamento |
| Ruben | Ruben | Profesor/a |
| evalhondo | Emilio Valhondo | Profesor/a |
| fcastillo | Francisco Castillo | Profesor/a |
| gvaldivia | Genoveva Valdivia | Profesor/a |
| jquintanar | Jesús Quintanar | Profesor/a |
| lgil | Luis Gil-Ortega | Profesor/a |
| lmartinez | Luis Martinez | (sin rol) |

## SuperAdmin — detalles importantes
- Rol en BD: `'SuperAdmin'` (con mayúsculas exactas)
- Nadie sabe que existe este rol excepto Seba
- En lista de usuarios aparece como `Jefe/a Departamento` sin ningún icono
- Solo en su propio perfil ve 👑
- Para promover a SuperAdmin: SQL directo en D1 Console: `UPDATE usuarios SET rol='SuperAdmin' WHERE usuario='X';`

## Archivos clave
- `js/roles.js` — lógica de roles y permisos
- `js/prestamos.js` — gestión de usuarios, préstamos
- `functions/api/_middleware.js` — autenticación
- `functions/api/usuarios.js` — CRUD usuarios
- `functions/api/historial.js` — logs de auditoría
- `sw.js` — Service Worker (versión de la app)
- `migrations/` — migraciones SQL

## Reglas de desarrollo
- **Siempre** bumpar versión en `sw.js` y hacer commit+push al final de cada sesión
- Commits atómicos con mensaje descriptivo
- Trabajar con BD remota (no local)
- No usar `wrangler` CLI si hay problemas de proxy/VPN — usar Cloudflare Dashboard

## Doble repositorio (sincronización obligatoria)
Hay DOS repos en GitHub que deben quedar siempre idénticos:
- `sebantonio/SQLInventarioElecFP` — repo principal, despliega en Cloudflare Pages
- `slatorre-dev/SQLInventarioElecFP` — espejo de código (cuenta colaboradora), no despliega

**Norma: cada `git push` debe subir a LOS DOS repos.**
- Este equipo ya tiene `origin` configurado con doble URL de push, así que un `git push` normal sube a ambos automáticamente. Verificar con `git remote -v` (origin debe listar 2 URLs de push).
- Si `origin` solo tiene una URL de push, reconfigurar:
  ```
  git remote set-url --add --push origin https://github.com/sebantonio/SQLInventarioElecFP.git
  git remote set-url --add --push origin https://github.com/slatorre-dev/SQLInventarioElecFP.git
  ```
- `git pull` trae solo de `sebantonio` (fetch único). Siempre `pull` antes de empezar y `push` al terminar.
- **Nunca** trabajar en los dos equipos a la vez sin sincronizar entre medias, o las historias divergen.
- Verificar que ambos coinciden: `git rev-parse origin/main` y `git rev-parse slatorre/main` deben dar el mismo hash.

## Qué decir al iniciar sesión desde otro PC
"Estoy trabajando en SQLInventarioElecFP. Lee el fichero CONTEXT.md del repositorio para ponerte al día. La BD es remota en Cloudflare D1."
