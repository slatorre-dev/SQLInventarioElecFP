const CAT_PALETTE = [
  { c:'#2563eb', bg:'#eff6ff', i:'🏷️' },
  { c:'#0891b2', bg:'#ecfeff', i:'🏷️' },
  { c:'#059669', bg:'#ecfdf5', i:'🏷️' },
  { c:'#d97706', bg:'#fffbeb', i:'🏷️' },
  { c:'#7c3aed', bg:'#f5f3ff', i:'🏷️' },
  { c:'#db2777', bg:'#fdf2f8', i:'🏷️' },
  { c:'#6b7280', bg:'#f9fafb', i:'🏷️' },
];

function defaultCatStyle(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  return CAT_PALETTE[Math.abs(hash) % CAT_PALETTE.length];
}

function mergeCats(savedCats, inventoryCats) {
  const rows = (savedCats || []).filter(c => String(c.name || '').trim());
  const seen = new Set(rows.map(c => String(c.name).trim().toLowerCase()));
  const maxOrder = rows.reduce((max, c) => Math.max(max, Number(c.orden) || 0), 0);
  const missing = (inventoryCats || [])
    .map(c => String(c.cat || c.name || '').trim())
    .filter(Boolean)
    .filter(name => {
      const key = name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }))
    .map((name, idx) => ({ name, ...defaultCatStyle(name), orden: maxOrder + idx + 1 }));
  return rows.concat(missing);
}

export async function onRequestGet({ request, env }) {
  const user = request.user;

  const [aulas, cats, invCats, ciclosRows] = await Promise.all([
    env.DB.prepare('SELECT * FROM aulas ORDER BY orden').all(),
    env.DB.prepare('SELECT * FROM categorias ORDER BY orden').all(),
    env.DB.prepare("SELECT DISTINCT cat FROM inventario WHERE cat IS NOT NULL AND trim(cat) != '' ORDER BY cat").all(),
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
    cats: mergeCats(cats.results, invCats.results),
    ciclos: cicloOrder.map(id => cicloMap[id]),
    user
  });
}
