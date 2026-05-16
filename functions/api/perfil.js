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
  try {
    const body = await request.json();
    const { action } = body;
    const user = request.user;

    if (action === 'updateProfile') {
      await env.DB.prepare('UPDATE usuarios SET nombre=?, email=? WHERE usuario=?')
        .bind(body.nombre, body.email || '', user.usuario).run();
      await auditLog(env.DB, user, 'updateProfile', `Perfil actualizado: ${body.nombre}`);
      return Response.json({ ok: true });
    }

    if (action === 'changePassword') {
      if (!body.oldPassword) {
        return Response.json({ ok: false, error: 'Contraseña actual requerida' });
      }
      if (!body.newPassword || body.newPassword.length < 4) {
        return Response.json({ ok: false, error: 'Contraseña demasiado corta' });
      }

      const current = await env.DB.prepare('SELECT password FROM usuarios WHERE usuario=?')
        .bind(user.usuario).first();
      if (!current || current.password !== body.oldPassword) {
        return Response.json({ ok: false, error: 'La contraseña actual no es correcta' });
      }

      await env.DB.prepare('UPDATE usuarios SET password=? WHERE usuario=?')
        .bind(body.newPassword, user.usuario).run();
      await auditLog(env.DB, user, 'changePassword', 'Contraseña cambiada');
      return Response.json({ ok: true });
    }

    return Response.json({ ok: false, error: 'Acción desconocida' });
  } catch (error) {
    console.error('perfil error', error?.message || error);
    return Response.json({ ok: false, error: error?.message || String(error) });
  }
}
