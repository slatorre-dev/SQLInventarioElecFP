const express = require('express');
const router = express.Router();
const DB = require('../db');

const VALID_INTENTS = ['anadir','prestamo','devolver','stock','estado','mantenimiento','buscar','resumen_aula','quien_tiene','stock_bajo','lista_mantenimiento'];
const MAX_PER_USER = 300;
const MAX_PHRASE_LEN = 200;

function normalizePhrase(str) {
  return str.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}

// GET /api/intent-learning
router.get('/', async (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ ok: false, error: 'No autorizado' });
  const rows = await DB.prepare(
    'SELECT id, phrase_raw, phrase_norm, intent, weight, created_at, updated_at FROM intent_learning WHERE user_id=? ORDER BY updated_at DESC LIMIT 300'
  ).bind(user.usuario).all();
  res.json({ ok: true, items: rows.results.map(r => ({
    id: r.id, phraseRaw: r.phrase_raw, phraseNorm: r.phrase_norm,
    intent: r.intent, weight: r.weight, createdAt: r.created_at, updatedAt: r.updated_at,
  }))});
});

// POST /api/intent-learning
router.post('/', async (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ ok: false, error: 'No autorizado' });
  const body = req.body || {};
  const phrase = (body.phrase || '').slice(0, MAX_PHRASE_LEN).trim();
  const intent = (body.intent || '').trim();
  if (!phrase) return res.status(400).json({ ok: false, error: 'phrase es obligatorio' });
  if (!VALID_INTENTS.includes(intent)) return res.status(400).json({ ok: false, error: `intent no válido. Válidos: ${VALID_INTENTS.join(', ')}` });
  const phraseNorm = normalizePhrase(phrase);
  if (!phraseNorm) return res.status(400).json({ ok: false, error: 'phrase vacía tras normalizar' });
  const count = await DB.prepare('SELECT COUNT(*) as c FROM intent_learning WHERE user_id=?').bind(user.usuario).first();
  if ((count?.c || 0) >= MAX_PER_USER) {
    await DB.prepare('DELETE FROM intent_learning WHERE id = (SELECT id FROM intent_learning WHERE user_id=? ORDER BY weight ASC, updated_at ASC LIMIT 1)').bind(user.usuario).run();
  }
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const existing = await DB.prepare('SELECT id, weight FROM intent_learning WHERE user_id=? AND phrase_norm=? AND intent=?').bind(user.usuario, phraseNorm, intent).first();
  if (existing) {
    await DB.prepare('UPDATE intent_learning SET weight=weight+1, updated_at=? WHERE id=?').bind(now, existing.id).run();
    return res.json({ ok: true, action: 'reinforced', weight: existing.weight + 1 });
  } else {
    await DB.prepare('INSERT INTO intent_learning (user_id,phrase_raw,phrase_norm,intent,weight,created_at,updated_at) VALUES (?,?,?,?,1.0,?,?)').bind(user.usuario, phrase, phraseNorm, intent, now, now).run();
    return res.json({ ok: true, action: 'created' });
  }
});

// POST /api/intent-learning/clear
router.post('/clear', async (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ ok: false, error: 'No autorizado' });
  const result = await DB.prepare('DELETE FROM intent_learning WHERE user_id=?').bind(user.usuario).run();
  res.json({ ok: true, deleted: result.meta?.changes || 0 });
});

// POST /api/intent-learning/bulk-import
router.post('/bulk-import', async (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ ok: false, error: 'No autorizado' });
  const body = req.body || {};
  if (!body.items || !Array.isArray(body.items)) return res.status(400).json({ ok: false, error: 'items debe ser un array' });
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  let inserted = 0, skipped = 0;
  for (const item of body.items.slice(0, MAX_PER_USER)) {
    const phrase = (item.phrase || '').slice(0, MAX_PHRASE_LEN).trim();
    const intent = (item.intent || '').trim();
    if (!phrase || !VALID_INTENTS.includes(intent)) { skipped++; continue; }
    const phraseNorm = normalizePhrase(phrase);
    if (!phraseNorm) { skipped++; continue; }
    try {
      await DB.prepare('INSERT OR IGNORE INTO intent_learning (user_id,phrase_raw,phrase_norm,intent,weight,created_at,updated_at) VALUES (?,?,?,?,1.0,?,?)')
        .bind(user.usuario, phrase, phraseNorm, intent, now, now).run();
      inserted++;
    } catch { skipped++; }
  }
  res.json({ ok: true, inserted, skipped });
});

// DELETE /api/intent-learning/:id
router.delete('/:id', async (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ ok: false, error: 'No autorizado' });
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ ok: false, error: 'ID inválido' });
  const row = await DB.prepare('SELECT id FROM intent_learning WHERE id=? AND user_id=?').bind(id, user.usuario).first();
  if (!row) return res.status(404).json({ ok: false, error: 'No encontrado' });
  await DB.prepare('DELETE FROM intent_learning WHERE id=?').bind(id).run();
  res.json({ ok: true });
});

module.exports = router;
