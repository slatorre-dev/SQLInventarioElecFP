const VALID_INTENTS = [
  'prestamo', 'devolver', 'stock', 'estado', 'mantenimiento',
  'buscar', 'resumen_aula', 'quien_tiene', 'stock_bajo', 'lista_mantenimiento'
];
const MAX_PER_USER = 300;
const MAX_PHRASE_LEN = 200;

function normalizePhrase(str) {
  return str
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function jsonErr(msg, status = 400) {
  return Response.json({ ok: false, error: msg }, { status });
}

export async function onRequest({ request, env, data }) {
  const user = data?.user || request.user;
  if (!user) return jsonErr('No autorizado', 401);

  const url = new URL(request.url);
  const method = request.method.toUpperCase();
  const pathParts = url.pathname.split('/').filter(Boolean); // ['api','intent-learning', ...]
  const sub = pathParts[2]; // undefined | 'clear' | 'bulk-import' | id

  // GET /api/intent-learning — listar aprendizajes del usuario
  if (method === 'GET' && !sub) {
    const rows = await env.DB.prepare(
      'SELECT id, phrase_raw, phrase_norm, intent, weight, created_at, updated_at FROM intent_learning WHERE user_id=? ORDER BY updated_at DESC LIMIT 300'
    ).bind(user.usuario).all();
    return Response.json({ ok: true, items: rows.results.map(r => ({
      id: r.id,
      phraseRaw: r.phrase_raw,
      phraseNorm: r.phrase_norm,
      intent: r.intent,
      weight: r.weight,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }))});
  }

  // POST /api/intent-learning — guardar o reforzar una enseñanza
  if (method === 'POST' && !sub) {
    const body = await request.json().catch(() => null);
    if (!body) return jsonErr('Body inválido');

    const phrase = (body.phrase || '').slice(0, MAX_PHRASE_LEN).trim();
    const intent = (body.intent || '').trim();

    if (!phrase) return jsonErr('phrase es obligatorio');
    if (!VALID_INTENTS.includes(intent)) return jsonErr(`intent no válido. Válidos: ${VALID_INTENTS.join(', ')}`);

    const phraseNorm = normalizePhrase(phrase);
    if (!phraseNorm) return jsonErr('phrase vacía tras normalizar');

    // Comprobar límite por usuario
    const count = await env.DB.prepare(
      'SELECT COUNT(*) as c FROM intent_learning WHERE user_id=?'
    ).bind(user.usuario).first();
    if ((count?.c || 0) >= MAX_PER_USER) {
      // Borrar el más antiguo con menor weight para hacer hueco
      await env.DB.prepare(
        'DELETE FROM intent_learning WHERE id = (SELECT id FROM intent_learning WHERE user_id=? ORDER BY weight ASC, updated_at ASC LIMIT 1)'
      ).bind(user.usuario).run();
    }

    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

    // Upsert: si existe sube weight y updated_at, si no inserta
    const existing = await env.DB.prepare(
      'SELECT id, weight FROM intent_learning WHERE user_id=? AND phrase_norm=? AND intent=?'
    ).bind(user.usuario, phraseNorm, intent).first();

    if (existing) {
      await env.DB.prepare(
        'UPDATE intent_learning SET weight=weight+1, updated_at=? WHERE id=?'
      ).bind(now, existing.id).run();
      return Response.json({ ok: true, action: 'reinforced', weight: existing.weight + 1 });
    } else {
      await env.DB.prepare(
        'INSERT INTO intent_learning (user_id, phrase_raw, phrase_norm, intent, weight, created_at, updated_at) VALUES (?,?,?,?,1.0,?,?)'
      ).bind(user.usuario, phrase, phraseNorm, intent, now, now).run();
      return Response.json({ ok: true, action: 'created' });
    }
  }

  // POST /api/intent-learning/clear — borrar todos los aprendizajes del usuario
  if (method === 'POST' && sub === 'clear') {
    const result = await env.DB.prepare(
      'DELETE FROM intent_learning WHERE user_id=?'
    ).bind(user.usuario).run();
    return Response.json({ ok: true, deleted: result.meta?.changes || 0 });
  }

  // POST /api/intent-learning/bulk-import — migración desde localStorage
  if (method === 'POST' && sub === 'bulk-import') {
    const body = await request.json().catch(() => null);
    if (!body?.items || !Array.isArray(body.items)) return jsonErr('items debe ser un array');

    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    let inserted = 0, skipped = 0;

    for (const item of body.items.slice(0, MAX_PER_USER)) {
      const phrase = (item.phrase || '').slice(0, MAX_PHRASE_LEN).trim();
      const intent = (item.intent || '').trim();
      if (!phrase || !VALID_INTENTS.includes(intent)) { skipped++; continue; }

      const phraseNorm = normalizePhrase(phrase);
      if (!phraseNorm) { skipped++; continue; }

      try {
        await env.DB.prepare(
          'INSERT OR IGNORE INTO intent_learning (user_id, phrase_raw, phrase_norm, intent, weight, created_at, updated_at) VALUES (?,?,?,?,1.0,?,?)'
        ).bind(user.usuario, phrase, phraseNorm, intent, now, now).run();
        inserted++;
      } catch { skipped++; }
    }

    return Response.json({ ok: true, inserted, skipped });
  }

  // DELETE /api/intent-learning/:id — borrar un aprendizaje individual
  if (method === 'DELETE' && sub) {
    const id = parseInt(sub, 10);
    if (!id) return jsonErr('ID inválido');
    const row = await env.DB.prepare(
      'SELECT id FROM intent_learning WHERE id=? AND user_id=?'
    ).bind(id, user.usuario).first();
    if (!row) return jsonErr('No encontrado', 404);
    await env.DB.prepare('DELETE FROM intent_learning WHERE id=?').bind(id).run();
    return Response.json({ ok: true });
  }

  return jsonErr('Método no permitido', 405);
}
