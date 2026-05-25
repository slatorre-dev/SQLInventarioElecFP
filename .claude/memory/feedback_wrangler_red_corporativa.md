---
name: feedback_wrangler_red_corporativa
description: Wrangler falla con UNABLE_TO_VERIFY_LEAF_SIGNATURE en red corporativa — solución NODE_TLS_REJECT_UNAUTHORIZED
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 6d5e1bf7-7285-4f09-95bd-1cae54aa9071
---

Antes de cualquier comando `npx wrangler` en este entorno, establecer:
```powershell
$env:NODE_TLS_REJECT_UNAUTHORIZED="0"
```

**Why:** La red del centro tiene un proxy corporativo con CA propio que Node.js no reconoce, causando error `UNABLE_TO_VERIFY_LEAF_SIGNATURE` al intentar autenticarse con Cloudflare.

**How to apply:** Añadir siempre esa variable antes de wrangler d1 export, execute, deploy, etc. También requiere que `wrangler login` se haya hecho previamente en terminal interactiva (abre navegador — no funciona desde Claude).
