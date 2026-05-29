const express = require('express');
const router = express.Router();
const DB = require('../db');

async function auditLog(user, accion, resumen) {
  const fecha = new Date().toISOString().replace('T', ' ').slice(0, 19);
  try {
    const actor = user || {};
    const rolNorm = String(actor.rol || '').trim().toLowerCase();
    const rol = rolNorm === 'superadmin' ? 'Jefe/a Departamento' : (actor.rol || '');
    await DB.prepare("CREATE TABLE IF NOT EXISTS log (id INTEGER PRIMARY KEY AUTOINCREMENT, fecha TEXT DEFAULT '', usuario TEXT DEFAULT '', nombre TEXT DEFAULT '', rol TEXT DEFAULT '', accion TEXT DEFAULT '', itemId TEXT DEFAULT '', resumen TEXT DEFAULT '')").run();
    await DB.prepare('INSERT INTO log (fecha,usuario,nombre,rol,accion,itemId,resumen) VALUES (?,?,?,?,?,?,?)')
      .bind(fecha, actor.usuario || '', actor.nombre || '', rol, accion, '', resumen).run();
  } catch (error) { console.warn('auditLog failed', error?.message || error); }
}

function moduloId(row) { return `${row.cicloId}__${row.modCod}`; }

router.post('/', async (req, res) => {
  const body = req.body;
  const { action } = body;
  const user = req.user;

  if (action === 'getUsers') {
    const [usuariosRows, ciclosRows] = await Promise.all([
      DB.prepare('SELECT usuario, nombre, rol, email FROM usuarios ORDER BY usuario').all(),
      DB.prepare("ALTER TABLE ciclos ADD COLUMN responsable TEXT DEFAULT ''").run().catch(() => {})
        .then(() => DB.prepare('SELECT cicloId, modCod, modNombre, responsable FROM ciclos WHERE modCod IS NOT NULL').all()),
    ]);
    const ciclos = ciclosRows?.results || [];
    const modulosPorNombre = {};
    for (const row of ciclos) {
      const resp = (row.responsable || '').trim().toLowerCase();
      if (!resp) continue;
      if (!modulosPorNombre[resp]) modulosPorNombre[resp] = [];
      modulosPorNombre[resp].push(moduloId(row));
    }
    const todosModulos = ciclos.map(r => ({ id: moduloId(r), cicloId: r.cicloId, cod: String(r.modCod), nombre: r.modNombre || '', responsable: r.responsable || '' }));
    const usuarios = usuariosRows.results.map(u => {
      const rolNorm = String(u.rol || '').trim().toLowerCase();
      return { ...u, rol: rolNorm === 'superadmin' ? 'Jefe/a Departamento' : u.rol, modulos: modulosPorNombre[u.nombre.trim().toLowerCase()] || [] };
    });
    return res.json({ ok: true, usuarios, todosModulos });
  }

  if (action === 'userAdd') {
    const u = body.usuario;
    await DB.prepare('INSERT INTO usuarios (usuario,password,nombre,rol,email) VALUES (?,?,?,?,?)')
      .bind(u.usuario.trim(), u.password || 'cambiar123', u.nombre.trim(), u.rol.trim(), u.email || '').run();
    await auditLog(user, 'userAdd', `Nuevo usuario: ${u.usuario} (${u.rol})`);
    return res.json({ ok: true });
  }

  if (action === 'userUpdate') {
    const u = body.usuario;
    const actual = await DB.prepare('SELECT rol FROM usuarios WHERE usuario=?').bind(u.usuario).first();
    const eraSuperAdmin = String(actual?.rol || '').trim().toLowerCase() === 'superadmin';
    const rolFinal = eraSuperAdmin ? actual.rol : u.rol.trim();
    await DB.prepare('UPDATE usuarios SET nombre=?, rol=?, email=? WHERE usuario=?')
      .bind(u.nombre.trim(), rolFinal, u.email || '', u.usuario).run();
    await auditLog(user, 'userUpdate', `Usuario actualizado: ${u.usuario} (${rolFinal})`);
    return res.json({ ok: true });
  }

  if (action === 'userDelete') {
    if (user && body.usuario === user.usuario) return res.json({ ok: false, error: 'No puedes eliminar tu propia cuenta' });
    await DB.prepare('DELETE FROM usuarios WHERE usuario=?').bind(body.usuario).run();
    await auditLog(user, 'userDelete', `Usuario eliminado: ${body.usuario}`);
    return res.json({ ok: true });
  }

  if (action === 'userResetPassword') {
    const newPassword = String(body.newPassword || body.password || '').trim();
    if (!newPassword || newPassword.length < 4) return res.json({ ok: false, error: 'Contraseña demasiado corta' });
    await DB.prepare('UPDATE usuarios SET password=? WHERE usuario=?').bind(newPassword, body.usuario).run();
    await auditLog(user, 'userResetPassword', `Contraseña reseteada: ${body.usuario}`);
    return res.json({ ok: true });
  }

  if (action === 'userAssignModulos') {
    const nombre = (body.nombre || '').trim();
    const modulos = Array.isArray(body.modulos) ? body.modulos.map(String) : [];
    const legacyByCode = modulos.length > 0 && modulos.every(m => !m.includes('__'));
    if (!nombre) return res.json({ ok: false, error: 'Nombre requerido' });
    await DB.prepare("ALTER TABLE ciclos ADD COLUMN responsable TEXT DEFAULT ''").run().catch(() => {});
    const rows = await DB.prepare('SELECT cicloId, modCod, responsable FROM ciclos').all();
    for (const row of rows.results) {
      const id = moduloId(row);
      const esMio = modulos.includes(id) || (legacyByCode && modulos.includes(String(row.modCod)));
      const eraMio = (row.responsable || '').toLowerCase() === nombre.toLowerCase();
      if (esMio && !eraMio) {
        await DB.prepare('UPDATE ciclos SET responsable=? WHERE cicloId=? AND modCod=?').bind(nombre, row.cicloId, row.modCod).run();
      } else if (!esMio && eraMio) {
        await DB.prepare("UPDATE ciclos SET responsable='' WHERE cicloId=? AND modCod=?").bind(row.cicloId, row.modCod).run();
      }
    }
    await auditLog(user, 'userAssignModulos', `Módulos asignados a ${nombre}: ${modulos.join(',')}`);
    return res.json({ ok: true });
  }

  res.json({ ok: false, error: 'Acción desconocida' });
});

module.exports = router;
