// Gestión de aulas, categorías y ciclos
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
    await env.DB.prepare("ALTER TABLE ciclos ADD COLUMN responsable TEXT DEFAULT ''").run().catch(() => {});
    // Preservar responsables antes de borrar
    const existentes = await env.DB.prepare('SELECT cicloId, modCod, responsable FROM ciclos').all();
    const respMap = {};
    for (const r of (existentes.results || [])) {
      respMap[`${r.cicloId}__${r.modCod}`] = r.responsable || '';
      if (!respMap[String(r.modCod)]) respMap[String(r.modCod)] = r.responsable || '';
    }
    await env.DB.prepare('DELETE FROM ciclos').run();
    const rows = [];
    ciclos.forEach((c, ci) => (c.modulos||[]).forEach((m, mi) => {
      const modKey = `${c.id}__${m.cod}`;
      rows.push({ cicloId:c.id, cicloNombre:c.name, nivel:c.nivel||'', icon:c.icon||'', th:c.th||'', desc:c.desc||'', modCod:m.cod, modNombre:m.name, modHoras:m.horas||0, cicloOrden:ci, modOrden:mi, responsable: respMap[modKey] || respMap[String(m.cod)] || '' });
    }));
    if (rows.length) {
      const stmt = env.DB.prepare('INSERT INTO ciclos (cicloId,cicloNombre,nivel,icon,th,desc,modCod,modNombre,modHoras,cicloOrden,modOrden,responsable) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)');
      await env.DB.batch(rows.map(r => stmt.bind(r.cicloId,r.cicloNombre,r.nivel,r.icon,r.th,r.desc,r.modCod,r.modNombre,r.modHoras,r.cicloOrden,r.modOrden,r.responsable)));
    }
    await auditLog(env.DB, user, 'ciclosSync', `Sincronizados ${ciclos.length} ciclos`);
    return Response.json({ ok: true });
  }

  return Response.json({ ok: false, error: 'Acción desconocida' });
}
