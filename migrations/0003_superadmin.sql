-- Migración para soporte de rol SuperAdmin
-- SuperAdmin tiene permisos completos pero se muestra como 'Jefe/a Departamento'
-- El rol en BD es 'SuperAdmin' (con mayúsculas por compatibilidad con otros roles)

-- No se requieren cambios en el schema de usuarios, solo en la lógica de aplicación
-- El campo rol ya existe y puede almacenar 'SuperAdmin'
-- Las APIs normalizan y transforman 'SuperAdmin' → mostrado como 'Jefe/a Departamento'
-- La función normalizeRole() convierte todos los roles a minúsculas para comparación interna

CREATE TABLE IF NOT EXISTS usuarios (
  usuario  TEXT PRIMARY KEY,
  password TEXT DEFAULT '',
  nombre   TEXT DEFAULT '',
  rol      TEXT DEFAULT 'Profesor/a',
  email    TEXT DEFAULT ''
);

-- Ejemplo de UPDATE para crear un SuperAdmin (ya ejecutado):
-- UPDATE usuarios SET rol='SuperAdmin' WHERE usuario='Seba';
