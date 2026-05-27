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

const NORMALIZED_CATS = [
  { name:'Componentes electrónicos', c:'#2563eb', bg:'#eff6ff', i:'⚡', orden:1 },
  { name:'Consumibles', c:'#7c3aed', bg:'#f5f3ff', i:'📦', orden:2 },
  { name:'Equipos de medida', c:'#0891b2', bg:'#ecfeff', i:'📊', orden:3 },
  { name:'Herramientas', c:'#d97706', bg:'#fffbeb', i:'🔨', orden:4 },
  { name:'Informática', c:'#1d4ed8', bg:'#eff6ff', i:'💻', orden:5 },
  { name:'Material eléctrico', c:'#db2777', bg:'#fdf2f8', i:'🔌', orden:6 },
  { name:'Redes', c:'#0e7490', bg:'#f0fdfa', i:'🌐', orden:7 },
  { name:'Robótica y automatización', c:'#7e22ce', bg:'#faf5ff', i:'🤖', orden:8 },
  { name:'Otros', c:'#6b7280', bg:'#f9fafb', i:'🔧', orden:9 },
];

function normText(v){
  return String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function splitTags(v){
  return String(v || '').split(/[;,]/).map(t=>t.trim()).filter(Boolean);
}

function addTag(tags, value){
  const tag = String(value || '').trim();
  if(!tag) return;
  if(!tags.some(t=>normText(t)===normText(tag))) tags.push(tag);
}

const TAG_PLURAL_OVERRIDES = {
  reles: 'rele',
  relays: 'rele',
  cables: 'cable',
  conectores: 'conector',
  sensores: 'sensor',
  resistencias: 'resistencia',
  condensadores: 'condensador',
  osciloscopios: 'osciloscopio',
  polimetros: 'polimetro',
  multimetros: 'multimetro',
  fuentes: 'fuente',
  ruedas: 'rueda',
};

function singularizeToken(tok){
  if(TAG_PLURAL_OVERRIDES[tok]) return TAG_PLURAL_OVERRIDES[tok];
  if(tok.length <= 3) return tok;
  if(tok.endsWith('ces') && tok.length > 4) return tok.slice(0, -3) + 'z';
  if(tok.endsWith('es') && tok.length > 4) return tok.slice(0, -2);
  if(tok.endsWith('s') && tok.length > 3) return tok.slice(0, -1);
  return tok;
}

function canonicalTagFamily(tag){
  const cleaned = normText(tag)
    .replace(/[^a-z0-9\s\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if(!cleaned) return '';
  const tokens = cleaned.split(' ').filter(Boolean).map(singularizeToken);
  return tokens[0] || '';
}

function normalizeTagsCanonical(value){
  const seen = new Set();
  const out = [];
  for(const raw of splitTags(value)){
    const family = canonicalTagFamily(raw);
    if(!family || seen.has(family)) continue;
    seen.add(family);
    out.push(family);
  }
  out.sort((a,b)=>a.localeCompare(b,'es',{sensitivity:'base'}));
  return out.join(', ');
}

function normalizeItemCategoryAndTags(item){
  const text = normText([item.cat,item.item,item.ref,item.util,item.loc,item.obs].join(' '));
  const oldCat = String(item.cat || '').trim();
  const tags = splitTags(item.tags);
  let cat = NORMALIZED_CATS.some(c=>normText(c.name)===normText(oldCat)) ? oldCat : 'Otros';

  const rules = [
    { cat:'Redes', tag:'Routers', keys:['router','routers'] },
    { cat:'Redes', tag:'Fibra óptica', keys:['fibra','optica','fo '] },
    { cat:'Redes', tag:'Telecomunicaciones', keys:['telecom','comunicacion'] },
    { cat:'Redes', tag:'Antenas', keys:['antena','antenas'] },
    { cat:'Redes', tag:'Switches', keys:['switch','ethernet','rj45','wifi','wi-fi','access point','punto de acceso'] },
    { cat:'Informática', tag:'Ordenadores', keys:['ordenador','ordenadores','pc','portatil','portátil','monitor','teclado','raton','ratón'] },
    { cat:'Informática', tag:'Raspberry Pi', keys:['raspberry'] },
    { cat:'Robótica y automatización', tag:'Arduino', keys:['arduino'] },
    { cat:'Robótica y automatización', tag:'ESP32', keys:['esp32','esp8266'] },
    { cat:'Robótica y automatización', tag:'Domótica', keys:['domotica','domótica','knx'] },
    { cat:'Robótica y automatización', tag:'Robótica', keys:['robot','robotica','robótica','servo','motor','sensor'] },
    { cat:'Material eléctrico', tag:'Protecciones eléctricas', keys:['proteccion','protección','diferencial','magnetotermico','magnetotérmico','fusible'] },
    { cat:'Material eléctrico', tag:'Cables', keys:['cable','cables','manguera'] },
    { cat:'Material eléctrico', tag:'Conectores', keys:['conector','conectores','enchufe','regleta','borne'] },
    { cat:'Material eléctrico', tag:'230V', keys:['230v','220v','ac '] },
    { cat:'Herramientas', tag:'Herramienta', keys:['herramienta','destornillador','alicate','pinza','cutter','taladro','ingletadora','soldador'] },
    { cat:'Herramientas', tag:'Soldadura', keys:['soldadura','soldador','estaño','estano'] },
    { cat:'Equipos de medida', tag:'Medida', keys:['medida','tester','multimetro','multímetro','osciloscopio','vatimetro','vatímetro','pinza amperimetrica','fuente laboratorio'] },
    { cat:'Componentes electrónicos', tag:'SMD', keys:['smd'] },
    { cat:'Componentes electrónicos', tag:'Resistencias', keys:['resistencia','resistencias','res '] },
    { cat:'Componentes electrónicos', tag:'Condensadores', keys:['condensador','condensadores','cond-'] },
    { cat:'Componentes electrónicos', tag:'Relés', keys:['rele','relé','relay'] },
    { cat:'Componentes electrónicos', tag:'Sensores', keys:['sensor','sensores'] },
    { cat:'Consumibles', tag:'Tornillería', keys:['tornillo','tuerca','arandela','tornilleria','tornillería'] },
    { cat:'Consumibles', tag:'Consumible', keys:['consumible','brida','cinta','termorretractil','termorretráctil'] },
  ];

  for(const rule of rules){
    if(rule.keys.some(k=>text.includes(normText(k)))){
      cat = rule.cat;
      addTag(tags, rule.tag);
    }
  }

  const oldCatNorm = normText(oldCat);
  const majorNorms = new Set(NORMALIZED_CATS.map(c=>normText(c.name)));
  if(oldCat && oldCatNorm !== normText(cat) && !majorNorms.has(oldCatNorm)) addTag(tags, oldCat);

  return { cat, tags: tags.sort((a,b)=>a.localeCompare(b,'es',{sensitivity:'base'})).join(', ') };
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

  if (action === 'normalizeCategoriesTags') {
    await env.DB.prepare("ALTER TABLE inventario ADD COLUMN tags TEXT DEFAULT ''").run().catch(() => {});
    const inv = await env.DB.prepare('SELECT * FROM inventario').all();
    const rows = inv.results || [];
    const updates = [];
    for (const item of rows) {
      const next = normalizeItemCategoryAndTags(item);
      if (next.cat !== (item.cat || '') || next.tags !== (item.tags || '')) {
        updates.push({ id:item.id, ...next });
      }
    }
    if (updates.length) {
      const stmt = env.DB.prepare('UPDATE inventario SET cat=?, tags=? WHERE id=?');
      await env.DB.batch(updates.map(u => stmt.bind(u.cat, u.tags, u.id)));
    }
    await env.DB.prepare('DELETE FROM categorias').run();
    const catStmt = env.DB.prepare('INSERT INTO categorias (name,c,bg,i,orden) VALUES (?,?,?,?,?)');
    await env.DB.batch(NORMALIZED_CATS.map(c => catStmt.bind(c.name,c.c,c.bg,c.i,c.orden)));
    await auditLog(env.DB, user, 'normalizeCategoriesTags', `Normalizadas categorias y tags en ${updates.length} items`);
    const items = await env.DB.prepare('SELECT * FROM inventario ORDER BY id').all();
    return Response.json({ ok: true, updated: updates.length, cats: NORMALIZED_CATS, items: items.results || [] });
  }

  if (action === 'normalizeTagsCanonical') {
    await env.DB.prepare("ALTER TABLE inventario ADD COLUMN tags TEXT DEFAULT ''").run().catch(() => {});
    const inv = await env.DB.prepare('SELECT id, tags FROM inventario').all();
    const rows = inv.results || [];
    const updates = [];
    for (const item of rows) {
      const nextTags = normalizeTagsCanonical(item.tags || '');
      const current = String(item.tags || '').trim();
      if (nextTags !== current) updates.push({ id:item.id, tags:nextTags });
    }
    if (updates.length) {
      const stmt = env.DB.prepare('UPDATE inventario SET tags=? WHERE id=?');
      await env.DB.batch(updates.map(u => stmt.bind(u.tags, u.id)));
    }
    await auditLog(env.DB, user, 'normalizeTagsCanonical', `Normalizados tags en ${updates.length} items`);
    const items = await env.DB.prepare('SELECT * FROM inventario ORDER BY id').all();
    return Response.json({ ok: true, updated: updates.length, items: items.results || [] });
  }

  if (action === 'ubicacionesSync') {
    const ubicaciones = body.ubicaciones || [];
    await env.DB.prepare("CREATE TABLE IF NOT EXISTS ubicaciones (name TEXT PRIMARY KEY, orden INTEGER DEFAULT 0)").run();
    await env.DB.prepare('DELETE FROM ubicaciones').run();
    if (ubicaciones.length) {
      const stmt = env.DB.prepare('INSERT INTO ubicaciones (name,orden) VALUES (?,?)');
      await env.DB.batch(ubicaciones.map((u, i) => stmt.bind(String(u.name || '').trim(), u.orden || i + 1)));
    }
    await auditLog(env.DB, user, 'ubicacionesSync', `Sincronizadas ${ubicaciones.length} ubicaciones`);
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
