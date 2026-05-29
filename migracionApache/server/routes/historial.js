const express = require('express');
const router = express.Router();
const DB = require('../db');

function normalizeText(v) {
  return String(v || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function canReadFullHistory(user, query) {
  const usuario = normalizeText(user?.usuario);
  const loginUsuario = normalizeText(query.u);
  const rol = normalizeText(user?.rol);
  return usuario === 'seba' || loginUsuario === 'seba' ||
    rol === 'admin' || rol === 'administrador' || rol.includes('admin') ||
    rol.includes('jefe') || rol.includes('departamento') || rol.includes('director');
}

async function ensureLogTable() {
  await DB.prepare("CREATE TABLE IF NOT EXISTS log (id INTEGER PRIMARY KEY AUTOINCREMENT, fecha TEXT DEFAULT '', usuario TEXT DEFAULT '', nombre TEXT DEFAULT '', rol TEXT DEFAULT '', accion TEXT DEFAULT '', itemId TEXT DEFAULT '', resumen TEXT DEFAULT '')").run();
}

function mapLogRow(row) {
  const accion = String(row.accion || '');
  const itemId = String(row.itemId || '').trim();
  const actionKey = normalizeText(accion);
  const rolNorm = normalizeText(row.rol);
  const rol = rolNorm === 'superadmin' ? 'Jefe/a Departamento' : row.rol;
  let tipo = 'Sistema';
  if (['add','update','delete','bulkimport','itemadd','itemupdate','itemdelete','itembaja'].includes(actionKey)) tipo = 'Items';
  else if (actionKey.startsWith('user') || ['updateprofile','changepassword'].includes(actionKey)) tipo = 'Usuarios';
  else if (actionKey.startsWith('prof')) tipo = 'Profesores';
  else if (['prestar','prestarcaja','devolver'].includes(actionKey)) tipo = 'Prestamos';
  else if (actionKey.includes('doc')) tipo = 'Documentos';
  else if (['aulassync','catssync','ciclossync','ubicacionessync','normalizecategoriestags'].includes(actionKey)) tipo = 'Configuracion';
  else if (itemId) tipo = 'Items';
  return { id: row.id, timestamp: row.fecha, usuario: row.usuario, accion, tipo, que: itemId,
    nombre: row.itemNombre || row.nombre, detalles: row.resumen, fecha: row.fecha, resumen: row.resumen, rol };
}

router.get('/', async (req, res) => {
  try {
    await ensureLogTable();
    const { itemId } = req.query;
    if (itemId) {
      const result = await DB.prepare(`
        SELECT log.id, log.fecha, log.usuario, log.nombre, log.rol, log.accion, log.itemId, log.resumen,
               inventario.item AS itemNombre
        FROM log LEFT JOIN inventario ON CAST(log.itemId AS SIGNED) = inventario.id
        WHERE log.itemId = ? ORDER BY log.id DESC LIMIT 200
      `).bind(String(itemId)).all();
      return res.json({ ok: true, logs: (result.results || []).map(mapLogRow) });
    }
    if (!canReadFullHistory(req.user, req.query)) {
      return res.status(403).json({ ok: false, error: 'No autorizado' });
    }
    const result = await DB.prepare(`
      SELECT log.id, log.fecha, log.usuario, log.nombre, log.rol, log.accion, log.itemId, log.resumen,
             inventario.item AS itemNombre
      FROM log LEFT JOIN inventario ON CAST(log.itemId AS SIGNED) = inventario.id
      ORDER BY log.id DESC LIMIT 5000
    `).all();
    return res.json((result.results || []).map(mapLogRow));
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    await ensureLogTable();
    const body = req.body;
    const accion = String(body.accion || '').trim();
    const itemId = String(body.que || body.itemId || '').trim();
    const resumen = String(body.detalles || body.nombre || '').trim();
    const fecha = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const actor = req.user || {};
    const loginUsuario = req.query.u || body.usuario || '';
    if (!actor.usuario && loginUsuario) {
      const row = await DB.prepare('SELECT usuario, nombre, rol FROM usuarios WHERE usuario=?')
        .bind(String(loginUsuario).trim()).first().catch(() => null);
      Object.assign(actor, row || { usuario: String(loginUsuario).trim(), nombre: String(loginUsuario).trim(), rol: '' });
    }
    if (!accion || !itemId) return res.status(400).json({ ok: false, error: 'Faltan campos requeridos' });
    const rolNorm = String(actor.rol || '').trim().toLowerCase();
    const rol = rolNorm === 'superadmin' ? 'Jefe/a Departamento' : (actor.rol || '');
    const result = await DB.prepare('INSERT INTO log (fecha,usuario,nombre,rol,accion,itemId,resumen) VALUES (?,?,?,?,?,?,?)')
      .bind(fecha, actor.usuario || '', actor.nombre || '', rol, accion, itemId, resumen).run();
    return res.status(201).json({ ok: true, id: result.meta?.last_row_id || null });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
