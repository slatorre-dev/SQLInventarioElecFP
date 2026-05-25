---
name: incident_reset_v321j_oauth
description: Bug de modales invisibles (.mbg opacity) que rompió los botones; reset final a v318 (21b92b3), backup OAuth en backup/oauth-pre-reset-v327
metadata: 
  node_type: memory
  type: project
  originSessionId: 589ea9b2-544d-4d49-ab4b-990c7131db04
---

El 2026-05-23 los botones de gestión (usuarios, aulas, ciclos, imprimir, préstamos, dar de baja) y el FAB movible dejaron de funcionar: el click no hacía nada y SIN error en consola. Probado en producción + incógnito + Ctrl+Shift+R + Clear site data → no era caché del SW.

**Diagnóstico real (confirmado por consola):** las funciones existían (`window.openAulasModal` etc. = function) y se ejecutaban; ponían la clase `.open` en el modal (`mAulas open`, display:flex) PERO el modal NO aparecía visualmente. Cada `.mbg` abierto e invisible es un overlay `position:fixed; inset:0; z-index:500` con `pointer-events:all` que tapaba la pantalla y se tragaba los clicks de los demás botones. Funcionaban los que abren PÁGINAS (Préstamos, Mantenimiento, Documentación) y `openModal`/mItem (z-index mayor); fallaban los que abren otros `.mbg`. NO era el FAB ni OAuth ni permisos (rol SuperAdmin con `*` correcto). La causa estaba en la reorganización de modales que empezó en v319 (commit 41769ca) y siguió con todo el CSS móvil de hoy (v319→v321j).

**Resolución:** `git reset --hard 21b92b3` = **v318** ("backup: v318 pre-secciones, antes de cambios UX modal", marcado por el propio usuario), descartando TODO lo de hoy desde 12:13 (reorg modales, CSS móvil, alias ciclos, OAuth, FAB). Force-push a los DOS remotos (origin/sebantonio + slatorre). Nota: en v318 el badge dice "v77" en index.html pero sw.js VERSION=v318. El force-with-lease a slatorre falla la 1ª vez por "stale info"; hacer `git fetch slatorre` y reintentar.

**Backup:** rama LOCAL `backup/oauth-pre-reset-v327` → commit 85f85f0 (NO pusheada). Ahí está OAuth completo + todo el trabajo visual posterior a v318, para rescatar piezas sueltas.

**Reaplicación commit a commit (misma sesión):** sobre v318 se fueron aplicando commits uno a uno verificando en producción. v319 (41769ca, reorg modal con modal-content/modal-footer + sticky) FUNCIONA. **v320 (0d95f79, reorg modal en 6 secciones) ROMPE de nuevo TODOS los botones** → confirmado que el bug entra exactamente en el diff v319→v320. Ese commit reestructura masivamente el HTML del modal #mItem (142 ins/163 del: modal-content→fg, modal-footer→mf, secciones reanidadas) y casi seguro deja un `</div>` descuadrado que solapa contenedores y bloquea clicks. Se volvió a v319 (commit 4dd5218, SW='v319-stable' para forzar refresco) y ahí quedó producción estable.

**Para retomar la reorg del modal:** NO reusar el HTML de v320 (está roto). Rehacer las 6 secciones desde v319 cerrando bien cada div y verificando tras cada cambio que los botones responden. El CSS de v320 añade `#mItem .m-section:has(#f_foto_preview)` (`:has()`) y cambia footer a `.mf` / contenido a `.fg` con overflow.

**Método de avance usado:** cherry-pick da conflictos por claude.md/sw.js; en su lugar `git checkout <commit> -- <archivos>`, bump manual de VERSION en sw.js, commit y push. Push a origin actualiza ambas URLs (sebantonio+slatorre); el push directo a slatorre suele quedar "up-to-date".

**DESENLACE (misma sesión):** se reaplicó todo paso a paso sobre v318 hasta llegar a **v321j funcionando** (commit fe5cd65). Camino: v319 → v320(+fix div) → v320a/b/c → v320d → salto directo al árbol de v321j (`git checkout 051422c -- index.html css/styles.css js/{config,home,modal-item,inventory}.js`) + re-aplicar el mismo `</div>` de cierre de `.fg`. El bug del div sin cerrar ESTABA en v320 y persistía hasta v321j en el historial original; nuestro fix lo corrige. CLAVE de verificación: balance `<div>`/`</div>` del index.html debe ser 0 (grep -oE conteo) y llaves CSS balanceadas.

**OAuth REINTRODUCIDO con éxito (v322, commit b95e0a0):** sobre la base v321j sana se recuperó SOLO el OAuth puro en su estado funcional v323, dejando FUERA el FAB movible (nav.js) y los cambios de roles posteriores (los culpables del incidente). Archivos traídos de v323 (5cdf899): `functions/api/oauth/login-google.js`, `functions/api/_middleware.js` (auth dual: u+p tradicional Ó u+t session_token), `js/api.js` (urlWithAuth usa t= si hay session_token, si no p=), `js/auth.js` (handleGoogleSignIn). El botón Google en index.html y su CSS se añadieron A MANO (no por checkout) para NO tocar el modal #mItem. Client ID Google: 374986567801-lamnmhp3p3jtudo9f4db3s5kum7ef1v9. La columna D1 `session_token` ya existía de los intentos previos (o se añade con `ALTER TABLE usuarios ADD COLUMN session_token TEXT DEFAULT NULL`). Login tradicional Y Google funcionan. nav.js quedó intacto (sin FAB).

**Estado producción:** v322 con OAuth funcionando, en los dos remotos. backup/oauth-pre-reset-v327 (85f85f0) guarda FAB+PWA-networkfirst por si se quisieran. Los cambios de "roles admin" (isAdminRole, etc.) NO se recuperan: eran un intento fallido de arreglar los botones muertos, pero la causa real era el div sin cerrar, así que no aportan nada.

**DECISIÓN del usuario (cerrada):** el FAB movible NO se reintroduce. Dejarlo así; no volver a ofrecerlo. La app queda en v322 estable (visual completo + login dual password/Google, sin FAB ni cambios de roles).

**Why:** El usuario priorizó recuperar botones funcionando ya. La causa NO era el FAB (descartado tras diagnóstico) sino la reestructuración del HTML del modal en v320 que solapa contenedores y bloquea los clicks.
**How to apply:** Si se reintroduce OAuth o el trabajo de modales, cherry-pick desde el backup 85f85f0 y VERIFICAR que cada `.mbg.open` se hace visible (opacity:1 y aparece en pantalla) antes de dar por bueno. Recordar [[feedback_commit_push_auto]] (push a los dos repos) y [[feedback_sw_bump]] (bump VERSION).
