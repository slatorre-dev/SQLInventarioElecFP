CREATE TABLE IF NOT EXISTS form_corrections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  frase_norm TEXT NOT NULL,
  aula_id TEXT,
  ciclo_id TEXT,
  mod_cod TEXT,
  cat_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_form_corrections_user_frase
ON form_corrections(user_id, frase_norm);

CREATE INDEX IF NOT EXISTS ix_form_corrections_user
ON form_corrections(user_id);
