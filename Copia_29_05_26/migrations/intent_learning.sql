CREATE TABLE IF NOT EXISTS intent_learning (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  phrase_raw TEXT NOT NULL,
  phrase_norm TEXT NOT NULL,
  intent TEXT NOT NULL,
  weight REAL NOT NULL DEFAULT 1.0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_intent_learning_user_phrase_intent
ON intent_learning(user_id, phrase_norm, intent);

CREATE INDEX IF NOT EXISTS ix_intent_learning_user
ON intent_learning(user_id);

CREATE INDEX IF NOT EXISTS ix_intent_learning_intent
ON intent_learning(intent);

CREATE INDEX IF NOT EXISTS ix_intent_learning_updated_at
ON intent_learning(updated_at);
