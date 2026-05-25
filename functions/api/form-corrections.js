const MAX_PER_USER = 200;
const MAX_FRASE_LEN = 300;

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
  const user = data?.user;
  if (!user) return jsonErr('No autorizado', 401);

  const url = new URL(request.url);
  const method = request.method.toUpperCase();
  const sub = url.pathname.split('/').filter(Boolean)[2]; // undefined | 'clear' | id

  // GET /api/form-corrections
  if (method === 'GET' && !sub) {
    const rows = await env.DB.prepare(
      'SELECT id, frase_norm, aula_id, ciclo_id, mod_cod, cat_id, updated_at FROM form_corrections WHERE user_id=? ORDER BY updated_at DESC LIMIT 200'
    ).bind(user.usuario).all();
    return Response.json({ ok: true, items: rows.results.map(r => ({
      id: r.id,
      fraseNorm: r.frase_norm,
      aulaId: r.aula_id,
      cicloId: r.ciclo_id,
      modCod: r.mod_cod,
      catId: r.cat_id,
      updatedAt: r.updated_at,
    }))});
  }

  // POST /api/form-corrections — upsert por frase_norm
  if (method === 'POST' && !sub) {
    const body = await request.json().catch(() => null);
    if (!body) return jsonErr('Body inválido');

    const fraseRaw = (body.fraseNorm || '').slice(0, MAX_FRASE_LEN).trim();
    if (!fraseRaw) return jsonErr('fraseNorm es obligatorio');
    const fraseNorm = normalizePhrase(fraseRaw);
    if (!fraseNorm) return jsonErr('frase vacía tras normalizar');

    const aulaId  = (body.aulaId  || null);
    const cicloId = (body.cicloId || null);
    const modCod  = (body.modCod  || null);
    const catId   = (body.catId   || null);

    // Comprobar límite por usuario
    const count = await env.DB.prepare(
      'SELECT COUNT(*) as c FROM form_corrections WHERE user_id=?'
    ).bind(user.usuario).first();
    if ((count?.c || 0) >= MAX_PER_USER) {
      // Borrar el más antiguo para hacer hueco
      await env.DB.prepare(
        'DELETE FROM form_corrections WHERE id=(SELECT id FROM form_corrections WHERE user_id=? ORDER BY updated_at ASC LIMIT 1)'
      ).bind(user.usuario).run();
    }

    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

    // Upsert por (user_id, frase_norm)
    const existing = await env.DB.prepare(
      'SELECT id FROM form_corrections WHERE user_id=? AND frase_norm=?'
    ).bind(user.usuario, fraseNorm).first();

    if (existing) {
      await env.DB.prepare(
        'UPDATE form_corrections SET aula_id=?, ciclo_id=?, mod_cod=?, cat_id=?, updated_at=? WHERE id=?'
      ).bind(aulaId, cicloId, modCod, catId, now, existing.id).run();
      return Response.json({ ok: true, action: 'updated' });
    } else {
      await env.DB.prepare(
        'INSERT INTO form_corrections (user_id, frase_norm, aula_id, ciclo_id, mod_cod, cat_id, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)'
      ).bind(user.usuario, fraseNorm, aulaId, cicloId, modCod, catId, now, now).run();
      return Response.json({ ok: true, action: 'created' });
    }
  }

  // POST /api/form-corrections/clear
  if (method === 'POST' && sub === 'clear') {
    const result = await env.DB.prepare(
      'DELETE FROM form_corrections WHERE user_id=?'
    ).bind(user.usuario).run();
    return Response.json({ ok: true, deleted: result.meta?.changes || 0 });
  }

  // DELETE /api/form-corrections/:id
  if (method === 'DELETE' && sub) {
    const id = parseInt(sub, 10);
    if (!id) return jsonErr('ID inválido');
    const row = await env.DB.prepare(
      'SELECT id FROM form_corrections WHERE id=? AND user_id=?'
    ).bind(id, user.usuario).first();
    if (!row) return jsonErr('No encontrado', 404);
    await env.DB.prepare('DELETE FROM form_corrections WHERE id=?').bind(id).run();
    return Response.json({ ok: true });
  }

  return jsonErr('Método no permitido', 405);
}
