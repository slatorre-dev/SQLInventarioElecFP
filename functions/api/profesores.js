async function auditLog(db, user, accion, itemId, resumen) {
  const fecha = new Date().toISOString().replace('T',' ').slice(0,19);
  await db.prepare('INSERT INTO log (fecha,usuario,nombre,rol,accion,itemId,resumen) VALUES (?,?,?,?,?,?,?)')
    .bind(fecha, user.usuario, user.nombre, user.rol, accion, String(itemId ?? ''), resumen).run();
}

export async function onRequestPost({ request, env }) {
  const body = await request.json();
  const { action } = body;
  const user = request.user;

  if (action === 'profAdd') {
    const p = body.profesor;
    const maxRow = await env.DB.prepare('SELECT MAX(id) as m FROM profesores').first();
    p.id = (maxRow.m || 0) + 1;
    await env.DB.prepare('INSERT INTO profesores (id,nombre,departamento,email) VALUES (?,?,?,?)')
      .bind(p.id, p.nombre, p.departamento||'', p.email||'').run();
    await auditLog(env.DB, user, 'profAdd', p.id, `Añadido: ${p.nombre}`);
    return Response.json({ ok: true, profesor: p });
  }

  if (action === 'profUpdate') {
    const p = body.profesor;
    await env.DB.prepare('UPDATE profesores SET nombre=?, departamento=?, email=? WHERE id=?')
      .bind(p.nombre, p.departamento||'', p.email||'', p.id).run();
    await auditLog(env.DB, user, 'profUpdate', p.id, `Actualizado: ${p.nombre}`);
    return Response.json({ ok: true });
  }

  if (action === 'profDelete') {
    const old = await env.DB.prepare('SELECT nombre FROM profesores WHERE id=?').bind(body.id).first();
    await env.DB.prepare('DELETE FROM profesores WHERE id=?').bind(body.id).run();
    await auditLog(env.DB, user, 'profDelete', body.id, `Eliminado: ${old?.nombre}`);
    return Response.json({ ok: true });
  }

  return Response.json({ ok: false, error: 'Acción desconocida' });
}
