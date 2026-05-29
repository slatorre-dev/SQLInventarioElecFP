const express = require('express');
const router = express.Router();
const DB = require('../db');

async function auditLog(user, accion, itemId, resumen) {
  const fecha = new Date().toISOString().replace('T', ' ').slice(0, 19);
  try {
    await DB.prepare("CREATE TABLE IF NOT EXISTS log (id INTEGER PRIMARY KEY AUTOINCREMENT, fecha TEXT DEFAULT '', usuario TEXT DEFAULT '', nombre TEXT DEFAULT '', rol TEXT DEFAULT '', accion TEXT DEFAULT '', itemId TEXT DEFAULT '', resumen TEXT DEFAULT '')").run();
    await DB.prepare('INSERT INTO log (fecha,usuario,nombre,rol,accion,itemId,resumen) VALUES (?,?,?,?,?,?,?)')
      .bind(fecha, user.usuario, user.nombre, user.rol, accion, String(itemId ?? ''), resumen).run();
  } catch (error) { console.warn('auditLog failed', error?.message || error); }
}

router.post('/', async (req, res) => {
  const body = req.body;
  const { action } = body;
  const user = req.user;

  if (action === 'profAdd') {
    const p = body.profesor;
    const maxRow = await DB.prepare('SELECT MAX(id) as m FROM profesores').first();
    p.id = (maxRow.m || 0) + 1;
    await DB.prepare('INSERT INTO profesores (id,nombre,departamento,email) VALUES (?,?,?,?)')
      .bind(p.id, p.nombre, p.departamento || '', p.email || '').run();
    await auditLog(user, 'profAdd', p.id, `Añadido: ${p.nombre}`);
    return res.json({ ok: true, profesor: p });
  }

  if (action === 'profUpdate') {
    const p = body.profesor;
    await DB.prepare('UPDATE profesores SET nombre=?, departamento=?, email=? WHERE id=?')
      .bind(p.nombre, p.departamento || '', p.email || '', p.id).run();
    await auditLog(user, 'profUpdate', p.id, `Actualizado: ${p.nombre}`);
    return res.json({ ok: true });
  }

  if (action === 'profDelete') {
    const old = await DB.prepare('SELECT nombre FROM profesores WHERE id=?').bind(body.id).first();
    await DB.prepare('DELETE FROM profesores WHERE id=?').bind(body.id).run();
    await auditLog(user, 'profDelete', body.id, `Eliminado: ${old?.nombre}`);
    return res.json({ ok: true });
  }

  res.json({ ok: false, error: 'Acción desconocida' });
});

module.exports = router;
