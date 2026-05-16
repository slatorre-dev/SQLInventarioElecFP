const HEADERS_PRES = ['id','itemId','itemNombre','cantidad','aulaOrigen','aulaDestino','profesorId','profesorNombre','gestionadoPor','fechaPrestamo','fechaPrevista','fechaDevolucion','cantidadDevuelta','estado','obs'];

async function auditLog(db, user, accion, itemId, resumen) {
  const fecha = new Date().toISOString().replace('T',' ').slice(0,19);
  await db.prepare('INSERT INTO log (fecha,usuario,nombre,rol,accion,itemId,resumen) VALUES (?,?,?,?,?,?,?)')
    .bind(fecha, user.usuario, user.nombre, user.rol, accion, String(itemId ?? ''), resumen).run();
}

export async function onRequestPost({ request, env }) {
  const body = await request.json();
  const { action } = body;
  const user = request.user;

  if (action === 'prestar') {
    const pres = body.prestamo;
    const maxRow = await env.DB.prepare('SELECT MAX(id) as m FROM prestamos').first();
    pres.id = (maxRow.m || 0) + 1;
    pres.estado = 'activo';
    // Descontar stock
    await env.DB.prepare('UPDATE inventario SET qty = qty - ? WHERE id=?').bind(pres.cantidad, pres.itemId).run();
    const vals = HEADERS_PRES.map(h => pres[h] ?? '');
    await env.DB.prepare(`INSERT INTO prestamos (${HEADERS_PRES.join(',')}) VALUES (${HEADERS_PRES.map(()=>'?').join(',')})`)
      .bind(...vals).run();
    await auditLog(env.DB, user, 'prestar', pres.itemId, `Préstamo ${pres.id}: ${pres.cantidad}ud a ${pres.profesorNombre}`);
    return Response.json({ ok: true, prestamo: pres });
  }

  if (action === 'devolver') {
    const { presId, cantidadDevuelta, obs } = body;
    const pres = await env.DB.prepare('SELECT * FROM prestamos WHERE id=?').bind(presId).first();
    if (!pres) return Response.json({ ok: false, error: 'Préstamo no encontrado' });
    const fecha = new Date().toISOString().split('T')[0];
    const estado = cantidadDevuelta >= pres.cantidad ? 'devuelto' : 'parcial';
    await env.DB.prepare('UPDATE prestamos SET fechaDevolucion=?, cantidadDevuelta=?, estado=?, obs=? WHERE id=?')
      .bind(fecha, cantidadDevuelta, estado, obs || '', presId).run();
    // Reponer stock
    await env.DB.prepare('UPDATE inventario SET qty = qty + ? WHERE id=?').bind(cantidadDevuelta, pres.itemId).run();
    await auditLog(env.DB, user, 'devolver', pres.itemId, `Devolución préstamo ${presId}: ${cantidadDevuelta}ud`);
    return Response.json({ ok: true });
  }

  return Response.json({ ok: false, error: 'Acción desconocida' });
}
