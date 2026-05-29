const express = require('express');
const router = express.Router();
const DB = require('../db');

async function auditLog(user, accion, resumen) {
  const fecha = new Date().toISOString().replace('T', ' ').slice(0, 19);
  try {
    await DB.prepare("CREATE TABLE IF NOT EXISTS log (id INTEGER PRIMARY KEY AUTOINCREMENT, fecha TEXT DEFAULT '', usuario TEXT DEFAULT '', nombre TEXT DEFAULT '', rol TEXT DEFAULT '', accion TEXT DEFAULT '', itemId TEXT DEFAULT '', resumen TEXT DEFAULT '')").run();
    await DB.prepare('INSERT INTO log (fecha,usuario,nombre,rol,accion,itemId,resumen) VALUES (?,?,?,?,?,?,?)')
      .bind(fecha, user.usuario, user.nombre, user.rol, accion, '', resumen).run();
  } catch (error) { console.warn('auditLog failed', error?.message || error); }
}

router.post('/', async (req, res) => {
  try {
    const body = req.body;
    const { action } = body;
    const user = req.user;
    if (!user) return res.status(401).json({ ok: false, error: 'No autorizado' });

    if (action === 'updateProfile') {
      await DB.prepare('UPDATE usuarios SET nombre=?, email=? WHERE usuario=?')
        .bind(body.nombre, body.email || '', user.usuario).run();
      await auditLog(user, 'updateProfile', `Perfil actualizado: ${body.nombre}`);
      return res.json({ ok: true });
    }

    if (action === 'changePassword') {
      if (!body.oldPassword) return res.json({ ok: false, error: 'Contraseña actual requerida' });
      if (!body.newPassword || body.newPassword.length < 4) return res.json({ ok: false, error: 'Contraseña demasiado corta' });
      const current = await DB.prepare('SELECT password FROM usuarios WHERE usuario=?').bind(user.usuario).first();
      if (!current || current.password !== body.oldPassword) return res.json({ ok: false, error: 'La contraseña actual no es correcta' });
      await DB.prepare('UPDATE usuarios SET password=? WHERE usuario=?').bind(body.newPassword, user.usuario).run();
      await auditLog(user, 'changePassword', 'Contraseña cambiada');
      return res.json({ ok: true });
    }

    res.json({ ok: false, error: 'Acción desconocida' });
  } catch (error) {
    res.json({ ok: false, error: error?.message || String(error) });
  }
});

module.exports = router;
