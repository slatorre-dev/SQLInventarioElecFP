// Gestión de aulas, categorías y ciclos
async function auditLog(db, user, accion, resumen) {
  const fecha = new Date().toISOString().replace('T',' ').slice(0,19);
  await db.prepare('INSERT INTO log (fecha,usuario,nombre,rol,accion,itemId,resumen) VALUES (?,?,?,?,?,?,?)')
    .bind(fecha, user.usuario, user.nombre, user.rol, accion, '', resumen).run();
}

export async function onRequestPost({ request, env }) {
  const body = await request.json();
  const { action } = body;
  const user = request.user;

  if (action === 'aulasSync') {
    const aulas = body.aulas || [];
    await env.DB.prepare('DELETE FROM aulas').run();
    if (aulas.length) {
      const stmt = env.DB.prepare('INSERT INTO aulas (id,name,icon,desc,th,orden) VALUES (?,?,?,?,?,?)');
      await env.DB.batch(aulas.map(a => stmt.bind(a.id,a.name,a.icon,a.desc,a.th,a.orden||0)));
    }
    await auditLog(env.DB, user, 'aulasSync', `Sincronizadas ${aulas.length} aulas`);
    return Response.json({ ok: true });
  }

  if (action === 'catsSync') {
    const cats = body.cats || [];
    await env.DB.prepare('DELETE FROM categorias').run();
    if (cats.length) {
      const stmt = env.DB.prepare('INSERT INTO categorias (name,c,bg,i,orden) VALUES (?,?,?,?,?)');
      await env.DB.batch(cats.map(c => stmt.bind(c.name,c.c,c.bg,c.i,c.orden||0)));
    }
    await auditLog(env.DB, user, 'catsSync', `Sincronizadas ${cats.length} categorías`);
    return Response.json({ ok: true });
  }

  if (action === 'ciclosSync') {
    const ciclos = body.ciclos || [];
    await env.DB.prepare('DELETE FROM ciclos').run();
    const rows = [];
    ciclos.forEach((c, ci) => (c.modulos||[]).forEach((m, mi) => {
      rows.push({ cicloId:c.id, cicloNombre:c.name, nivel:c.nivel||'', icon:c.icon||'', th:c.th||'', desc:c.desc||'', modCod:m.cod, modNombre:m.name, modHoras:m.horas||0, cicloOrden:ci, modOrden:mi });
    }));
    if (rows.length) {
      const stmt = env.DB.prepare('INSERT INTO ciclos VALUES (?,?,?,?,?,?,?,?,?,?,?)');
      await env.DB.batch(rows.map(r => stmt.bind(r.cicloId,r.cicloNombre,r.nivel,r.icon,r.th,r.desc,r.modCod,r.modNombre,r.modHoras,r.cicloOrden,r.modOrden)));
    }
    await auditLog(env.DB, user, 'ciclosSync', `Sincronizados ${ciclos.length} ciclos`);
    return Response.json({ ok: true });
  }

  return Response.json({ ok: false, error: 'Acción desconocida' });
}
