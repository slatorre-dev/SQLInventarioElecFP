---
name: session_mayo_20260522_parte4
description: "Sesión 22/05/2026 Parte 4 — Rol SuperAdmin invisible, corona 👑 solo para Seba (v245→v249)"
metadata: 
  node_type: memory
  type: project
  originSessionId: 6522cefc-8d07-4b49-aeb4-0fce0a4b07e4
---

# Sesión 22/05/2026 Parte 4 — Rol SuperAdmin

## Qué se hizo

### Rol SuperAdmin (v245→v249)
- Creado rol `'SuperAdmin'` (con mayúsculas, por compatibilidad con BD)
- Permisos internos: `['*']` (igual que Jefe/a Departamento)
- Se muestra externamente como `'Jefe/a Departamento'` — nadie sabe que es SuperAdmin
- `normalizeRole()` convierte a minúsculas internamente para comparar
- APIs (`usuarios.js`, `historial.js`) filtran y ocultan el rol real

### Usuario Seba = SuperAdmin
- En BD remota: `UPDATE usuarios SET rol='SuperAdmin' WHERE usuario='Seba';`
- Solo Seba ve 👑 en su propio perfil
- En lista de usuarios todos ven `'Jefe/a Departamento'` sin icono
- Usuario `cmena` (Admin) fue eliminado de la BD

### Archivos modificados
- `js/roles.js` — añadido `'superadmin': _PERMS_JEFE`, función `roleLabelWithIcon()` con 👑
- `js/profile.js` — usa `roleLabelWithIcon()` para mostrar rol con corona
- `js/prestamos.js` — lista de usuarios oculta SuperAdmin, muestra como Jefe/a
- `functions/api/usuarios.js` — `getUsers` y `auditLog` ocultan rol superadmin
- `functions/api/historial.js` — `mapLogRow` y POST ocultan rol superadmin
- `migrations/0003_superadmin.sql` — documentación de la migración

### Versiones
- v245 → v246: rol SuperAdmin base
- v246 → v247: normalización mayúsculas
- v247 → v248: icono superhéroe (luego cambiado)
- v248 → v249: corona 👑 solo en perfil propio

**Why:** El SuperAdmin necesita pasar desapercibido ante otros usuarios del sistema.
**How to apply:** Si alguien pregunta por roles, SuperAdmin existe pero es invisible externamente.
