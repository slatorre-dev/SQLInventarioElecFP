-- Migración para soporte de rol SuperAdmin
-- SuperAdmin tiene permisos completos pero se muestra como 'Jefe/a Departamento'
-- El rol interno será 'superadmin' en la columna 'rol' de la tabla 'usuarios'

-- No se requieren cambios en el schema de usuarios, solo en la lógica de aplicación
-- El campo rol ya existe y puede almacenar 'superadmin'
-- Las APIs filtran y ocultan 'superadmin' mostrándolo como 'jefe/a departamento'

CREATE TABLE IF NOT EXISTS usuarios (
  usuario  TEXT PRIMARY KEY,
  password TEXT DEFAULT '',
  nombre   TEXT DEFAULT '',
  rol      TEXT DEFAULT 'profesor',
  email    TEXT DEFAULT ''
);

-- Ejemplo de INSERT para crear un SuperAdmin (no ejecutar automáticamente):
-- INSERT INTO usuarios (usuario, password, nombre, rol, email) VALUES ('admin', 'cambiar123', 'Administrador', 'superadmin', 'admin@example.com');
