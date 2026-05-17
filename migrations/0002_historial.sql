-- Tabla de historial para auditoría
CREATE TABLE IF NOT EXISTS historial (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  usuario TEXT NOT NULL,
  accion TEXT NOT NULL,
  que TEXT NOT NULL,
  nombre TEXT,
  detalles TEXT
);

CREATE INDEX IF NOT EXISTS idx_historial_usuario ON historial(usuario);
CREATE INDEX IF NOT EXISTS idx_historial_timestamp ON historial(timestamp);
CREATE INDEX IF NOT EXISTS idx_historial_accion ON historial(accion);
