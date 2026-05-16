export async function onRequestGet({ request, env }) {
  const user = request.user;

  const [aulas, cats, ciclosRows] = await Promise.all([
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

  return Response.json({
    ok: true,
    aulas: aulas.results,
    cats: cats.results,
    ciclos: cicloOrder.map(id => cicloMap[id]),
    user
  });
}
