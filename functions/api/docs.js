// Gestión de documentos adjuntos (metadatos)
async function auditLog(db, user, accion, itemId, resumen) {
  const fecha = new Date().toISOString().replace('T',' ').slice(0,19);
  await db.prepare('INSERT INTO log (fecha,usuario,nombre,rol,accion,itemId,resumen) VALUES (?,?,?,?,?,?,?)')
    .bind(fecha, user.usuario, user.nombre, user.rol, accion, String(itemId || ''), resumen).run();
}

export async function onRequestPost({ request, env }) {
  const body = await request.json();
  const { action } = body;
  const user = request.user;

  if (action === 'getDocs') {
    const itemId = body.itemId;
    if (itemId == null) return Response.json({ ok: false, error: 'itemId requerido' });
    const docs = await env.DB.prepare('SELECT * FROM documentos WHERE itemId=? ORDER BY id').bind(itemId).all();
    return Response.json({ ok: true, docs: docs.results || [] });
  }

  if (action === 'deleteDoc') {
    const docId = body.docId;
    if (docId == null) return Response.json({ ok: false, error: 'docId requerido' });
    await env.DB.prepare('DELETE FROM documentos WHERE id=?').bind(docId).run();
    await auditLog(env.DB, user, 'deleteDoc', body.itemId, `Doc ${docId} eliminado`);
    return Response.json({ ok: true });
  }

  if (action === 'uploadDoc') {
    return Response.json({ ok: false, error: 'Upload de documentos no implementado en el backend' });
  }

  return Response.json({ ok: false, error: 'Acción desconocida' });
}
