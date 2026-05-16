async function auditLog(db, user, accion, resumen) {
  const fecha = new Date().toISOString().replace('T',' ').slice(0,19);
  try {
    await db.prepare("CREATE TABLE IF NOT EXISTS log (id INTEGER PRIMARY KEY AUTOINCREMENT, fecha TEXT DEFAULT '', usuario TEXT DEFAULT '', nombre TEXT DEFAULT '', rol TEXT DEFAULT '', accion TEXT DEFAULT '', itemId TEXT DEFAULT '', resumen TEXT DEFAULT '')").run();
    await db.prepare('INSERT INTO log (fecha,usuario,nombre,rol,accion,itemId,resumen) VALUES (?,?,?,?,?,?,?)')
      .bind(fecha, user.usuario, user.nombre, user.rol, accion, '', resumen).run();
  } catch (error) {
    console.warn('auditLog failed', error?.message || error);
  }
}

export async function onRequestPost({ request, env }) {
  const body = await request.json();
  const { action } = body;
  const user = request.user;

  if (action === 'getUsers') {
    const rows = await env.DB.prepare('SELECT usuario, nombre, rol, email FROM usuarios ORDER BY usuario').all();
    return Response.json({ ok: true, usuarios: rows.results });
  }

  if (action === 'userAdd') {
    const u = body.usuario;
    await env.DB.prepare('INSERT INTO usuarios (usuario,password,nombre,rol,email) VALUES (?,?,?,?,?)')
      .bind(u.usuario.trim(), u.password||'cambiar123', u.nombre.trim(), u.rol.trim(), u.email||'').run();
    await auditLog(env.DB, user, 'userAdd', `Nuevo usuario: ${u.usuario} (${u.rol})`);
    return Response.json({ ok: true });
  }

  if (action === 'userUpdate') {
    const u = body.usuario;
    await env.DB.prepare('UPDATE usuarios SET nombre=?, rol=?, email=? WHERE usuario=?')
      .bind(u.nombre.trim(), u.rol.trim(), u.email||'', u.usuario).run();
    await auditLog(env.DB, user, 'userUpdate', `Usuario actualizado: ${u.usuario} (${u.rol})`);
    return Response.json({ ok: true });
  }

  if (action === 'userDelete') {
    if (body.usuario === user.usuario)
      return Response.json({ ok: false, error: 'No puedes eliminar tu propia cuenta' });
    await env.DB.prepare('DELETE FROM usuarios WHERE usuario=?').bind(body.usuario).run();
    await auditLog(env.DB, user, 'userDelete', `Usuario eliminado: ${body.usuario}`);
    return Response.json({ ok: true });
  }

  if (action === 'userResetPassword') {
    if (!body.newPassword || body.newPassword.length < 4)
      return Response.json({ ok: false, error: 'Contraseña demasiado corta' });
    await env.DB.prepare('UPDATE usuarios SET password=? WHERE usuario=?')
      .bind(body.newPassword, body.usuario).run();
    await auditLog(env.DB, user, 'userResetPassword', `Contraseña reseteada: ${body.usuario}`);
    return Response.json({ ok: true });
  }

  return Response.json({ ok: false, error: 'Acción desconocida' });
}
