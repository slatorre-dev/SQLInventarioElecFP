const HEADERS_INV = ['id','ref','aula','mod','item','qty','min','cat','loc','est','util','fecha','mant','mantFecha','mantNota','mantResp','mantEstado','mantSolicitante','mantSolicitanteEmail','foto','obs','code','es_contenedor','parent_id'];

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

function mergeCats(savedCats, items) {
  const rows = (savedCats || []).filter(c => String(c.name || '').trim());
  const seen = new Set(rows.map(c => String(c.name).trim().toLowerCase()));
  const maxOrder = rows.reduce((max, c) => Math.max(max, Number(c.orden) || 0), 0);
  const inventoryNames = new Map();
  for (const item of items || []) {
    const name = String(item.cat || '').trim();
    if (name) inventoryNames.set(name.toLowerCase(), name);
  }
  const missingNames = [...inventoryNames.entries()]
    .filter(([key]) => {
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map(([, name]) => name)
    .sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
  return rows.concat(missingNames.map((name, idx) => ({ name, ...defaultCatStyle(name), orden: maxOrder + idx + 1 })));
}

export async function onRequestGet({ request, env }) {
  const user = request.user;

  await env.DB.prepare("ALTER TABLE inventario ADD COLUMN es_contenedor INTEGER DEFAULT 0").run().catch(() => {});
  await env.DB.prepare("ALTER TABLE inventario ADD COLUMN parent_id INTEGER DEFAULT NULL").run().catch(() => {});

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
  const itemRows = items.results || [];
  const itemsC = itemRows.map(it => HEADERS_INV.map(h => it[h] ?? ''));

  return Response.json({
    ok: true,
    itemsH: HEADERS_INV,
    itemsC,
    profesores: profesores.results,
    prestamos: prestamos.results,
    aulas: aulas.results,
    cats: mergeCats(cats.results, itemRows),
    ciclos: cicloOrder.map(id => cicloMap[id]),
    user
  });
}
