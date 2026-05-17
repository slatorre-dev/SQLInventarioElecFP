function normalizeText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function canReadFullHistory(user, url) {
  const usuario = normalizeText(user?.usuario);
  const loginUsuario = normalizeText(url.searchParams.get('u'));
  const rol = normalizeText(user?.rol);
  return usuario === 'seba' ||
    loginUsuario === 'seba' ||
    rol.includes('admin') ||
    rol.includes('jefe') ||
    rol.includes('departamento');
}

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers || {}) }
  });
}

async function ensureLogTable(db) {
  await db.prepare("CREATE TABLE IF NOT EXISTS log (id INTEGER PRIMARY KEY AUTOINCREMENT, fecha TEXT DEFAULT '', usuario TEXT DEFAULT '', nombre TEXT DEFAULT '', rol TEXT DEFAULT '', accion TEXT DEFAULT '', itemId TEXT DEFAULT '', resumen TEXT DEFAULT '')").run();
}

function mapLogRow(row) {
  const accion = String(row.accion || '');
  const itemId = String(row.itemId || '').trim();
  const actionKey = normalizeText(accion);
  let tipo = 'Sistema';
  if (['add', 'update', 'delete', 'bulkimport', 'itemadd', 'itemupdate', 'itemdelete', 'itembaja'].includes(actionKey)) tipo = 'Items';
  else if (actionKey.startsWith('user') || ['updateprofile', 'changepassword'].includes(actionKey)) tipo = 'Usuarios';
  else if (actionKey.startsWith('prof')) tipo = 'Profesores';
  else if (['prestar', 'prestarcaja', 'devolver'].includes(actionKey)) tipo = 'Prestamos';
  else if (actionKey.includes('doc')) tipo = 'Documentos';
  else if (['aulassync', 'catssync', 'ciclossync', 'ubicacionessync', 'normalizecategoriestags'].includes(actionKey)) tipo = 'Configuracion';
  else if (itemId) tipo = 'Items';

  return {
    id: row.id,
    timestamp: row.fecha,
    usuario: row.usuario,
    accion,
    tipo,
    que: itemId,
    nombre: row.itemNombre || row.nombre,
    detalles: row.resumen,
    fecha: row.fecha,
    resumen: row.resumen
  };
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const user = request.user;

  if (request.method === 'GET') {
    try {
      await ensureLogTable(env.DB);
      const itemId = url.searchParams.get('itemId');

      if (itemId) {
        const result = await env.DB.prepare(`
          SELECT log.id, log.fecha, log.usuario, log.nombre, log.rol, log.accion, log.itemId, log.resumen,
                 inventario.item AS itemNombre
          FROM log
          LEFT JOIN inventario ON CAST(log.itemId AS INTEGER) = inventario.id
          WHERE log.itemId = ?
          ORDER BY log.id DESC
          LIMIT 200
        `).bind(String(itemId)).all();

        return json({ ok: true, logs: (result.results || []).map(mapLogRow) });
      }

      if (!canReadFullHistory(user, url)) {
        return json({ ok: false, error: 'No autorizado' }, { status: 403 });
      }

      const result = await env.DB.prepare(`
        SELECT log.id, log.fecha, log.usuario, log.nombre, log.rol, log.accion, log.itemId, log.resumen,
               inventario.item AS itemNombre
        FROM log
        LEFT JOIN inventario ON CAST(log.itemId AS INTEGER) = inventario.id
        ORDER BY log.id DESC
        LIMIT 5000
      `).all();

      return json((result.results || []).map(mapLogRow));
    } catch (err) {
      console.error('Error fetching historial:', err);
      return json({ ok: false, error: err.message }, { status: 500 });
    }
  }

  if (request.method === 'POST') {
    try {
      await ensureLogTable(env.DB);
      const data = await request.json();
      const accion = String(data.accion || '').trim();
      const itemId = String(data.que || data.itemId || '').trim();
      const resumen = String(data.detalles || data.nombre || '').trim();
      const fecha = new Date().toISOString().replace('T', ' ').slice(0, 19);

      if (!accion || !itemId) {
        return json({ ok: false, error: 'Faltan campos requeridos' }, { status: 400 });
      }

      const result = await env.DB.prepare(`
        INSERT INTO log (fecha, usuario, nombre, rol, accion, itemId, resumen)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(fecha, user.usuario, user.nombre, user.rol, accion, itemId, resumen).run();

      return json({ ok: true, id: result.meta?.last_row_id || null }, { status: 201 });
    } catch (err) {
      console.error('Error logging historial:', err);
      return json({ ok: false, error: err.message }, { status: 500 });
    }
  }

  return json({ ok: false, error: 'Method not allowed' }, { status: 405 });
}
