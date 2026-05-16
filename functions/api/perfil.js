async function auditLog(db, user, accion, resumen) {
  const fecha = new Date().toISOString().replace('T',' ').slice(0,19);
  await db.prepare('INSERT INTO log (fecha,usuario,nombre,rol,accion,itemId,resumen) VALUES (?,?,?,?,?,?,?)')
    .bind(fecha, user.usuario, user.nombre, user.rol, accion, '', resumen).run();
}

export async function onRequestPost({ request, env }) {
  const body = await request.json();
  const { action } = body;
  const user = request.user;

  if (action === 'updateProfile') {
    await env.DB.prepare('UPDATE usuarios SET nombre=?, email=? WHERE usuario=?')
      .bind(body.nombre, body.email||'', user.usuario).run();
    await auditLog(env.DB, user, 'updateProfile', `Perfil actualizado: ${body.nombre}`);
    return Response.json({ ok: true });
  }

  if (action === 'changePassword') {
    if (!body.newPassword || body.newPassword.length < 4)
      return Response.json({ ok: false, error: 'Contraseña demasiado corta' });
    await env.DB.prepare('UPDATE usuarios SET password=? WHERE usuario=?')
      .bind(body.newPassword, user.usuario).run();
    await auditLog(env.DB, user, 'changePassword', 'Contraseña cambiada');
    return Response.json({ ok: true });
  }

  return Response.json({ ok: false, error: 'Acción desconocida' });
}
