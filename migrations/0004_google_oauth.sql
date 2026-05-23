-- Migración: Agregar soporte para Google OAuth
-- Fecha: Mayo 23, 2026

-- Solo agregar session_token (las otras columnas ya existen)
ALTER TABLE usuarios ADD COLUMN session_token TEXT DEFAULT NULL;

-- Crear índice para búsquedas rápidas por token
CREATE INDEX IF NOT EXISTS idx_usuarios_session_token ON usuarios(session_token);


