const HEADERS_INV = ['id','ref','aula','mod','item','qty','min','cat','loc','est','util','fecha','mant','mantFecha','mantNota','mantResp','mantEstado','mantSolicitante','mantSolicitanteEmail','foto','obs','code'];

export async function onRequestGet({ request, env }) {
  const user = request.user;

  const [items, profesores, prestamos, aulas, cats, ciclosRows] = await Promise.all([
    env.DB.prepare('SELECT * FROM inventario ORDER BY id').all(),
    env.DB.prepare("SELECT * FROM profesores WHERE nombre != '' AND lower(nombre) != 'departamento' ORDER BY nombre").all(),
    env.DB.prepare('SELECT * FROM prestamos ORDER BY id').all(),
    env.DB.prepare('SELECT * FROM aulas ORDER BY orden').all(),
    env.DB.prepare('SELECT * FROM categorias ORDER BY orden').all(),
    env.DB.prepare('SELECT * FROM ciclos ORDER BY cicloOrden, modOrden').all(),
  ]);

  const cicloMap = {}, cicloOrder = [];
  for (const r of ciclosRows.results) {
    if (!cicloMap[r.cicloId]) {
      cicloMap[r.cicloId] = { id: r.cicloId, name: r.cicloNombre, nivel: r.nivel, icon: r.icon, th: r.th, desc: r.desc, modulos: [] };
      cicloOrder.push(r.cicloId);
    }
    if (r.modCod) cicloMap[r.cicloId].modulos.push({ cod: r.modCod, name: r.modNombre, horas: r.modHoras });
  }

  // Compresión: items como array de arrays
  const itemsC = items.results.map(it => HEADERS_INV.map(h => it[h] ?? ''));

  return Response.json({
    ok: true,
    itemsH: HEADERS_INV,
    itemsC,
    profesores: profesores.results,
    prestamos: prestamos.results,
    aulas: aulas.results,
    cats: cats.results,
    ciclos: cicloOrder.map(id => cicloMap[id]),
    user
  });
}
