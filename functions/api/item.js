const HEADERS_INV = ['id','ref','aula','mod','item','qty','min','cat','loc','est','util','proveedor','tags','fecha','mant','mantFecha','mantNota','mantResp','mantEstado','mantSolicitante','mantSolicitanteEmail','foto','obs','code','es_contenedor','parent_id','tipo_material'];
const FIELDS_UPD  = HEADERS_INV.filter(h => h !== 'id');

async function ensureContainerCols(db) {
  await db.prepare("ALTER TABLE inventario ADD COLUMN es_contenedor INTEGER DEFAULT 0").run().catch(() => {});
  await db.prepare("ALTER TABLE inventario ADD COLUMN parent_id INTEGER DEFAULT NULL").run().catch(() => {});
  await db.prepare("ALTER TABLE inventario ADD COLUMN tipo_material TEXT DEFAULT 'consumible'").run().catch(() => {});
  await db.prepare("ALTER TABLE inventario ADD COLUMN proveedor TEXT DEFAULT ''").run().catch(() => {});
  await db.prepare("ALTER TABLE inventario ADD COLUMN tags TEXT DEFAULT ''").run().catch(() => {});
  await db.prepare("UPDATE inventario SET tipo_material='inventariable' WHERE es_contenedor=1 AND (tipo_material IS NULL OR trim(tipo_material)='')").run().catch(() => {});
  await db.prepare("UPDATE inventario SET tipo_material='consumible' WHERE tipo_material IS NULL OR trim(tipo_material)=''").run().catch(() => {});
  await db.prepare("CREATE TABLE IF NOT EXISTS app_meta (key TEXT PRIMARY KEY, value TEXT DEFAULT '')").run().catch(() => {});
  const migrated = await db.prepare("SELECT value FROM app_meta WHERE key='tipo_material_migrated'").first().catch(() => null);
  if (!migrated) {
    await db.prepare("UPDATE inventario SET tipo_material='inventariable' WHERE es_contenedor=1 OR lower(cat) LIKE '%herramient%' OR lower(cat) LIKE '%equipo%' OR lower(cat) LIKE '%instrument%'").run().catch(() => {});
    await db.prepare("INSERT OR REPLACE INTO app_meta (key,value) VALUES ('tipo_material_migrated', datetime('now'))").run().catch(() => {});
  }
}

async function auditLog(db, user, accion, itemId, resumen) {
  const fecha = new Date().toISOString().replace('T',' ').slice(0,19);
  try {
    await db.prepare("CREATE TABLE IF NOT EXISTS log (id INTEGER PRIMARY KEY AUTOINCREMENT, fecha TEXT DEFAULT '', usuario TEXT DEFAULT '', nombre TEXT DEFAULT '', rol TEXT DEFAULT '', accion TEXT DEFAULT '', itemId TEXT DEFAULT '', resumen TEXT DEFAULT '')").run();
    await db.prepare('INSERT INTO log (fecha,usuario,nombre,rol,accion,itemId,resumen) VALUES (?,?,?,?,?,?,?)')
      .bind(fecha, user.usuario, user.nombre, user.rol, accion, String(itemId ?? ''), resumen).run();
  } catch (error) {
    console.warn('auditLog failed', error?.message || error);
  }
}

export async function onRequestPost({ request, env }) {
  const body = await request.json();
  const { action, item, id } = body;
  const user = request.user;

  await ensureContainerCols(env.DB);

  if (action === 'add') {
    const maxRow = await env.DB.prepare('SELECT MAX(id) as m FROM inventario').first();
    const newId = (maxRow.m || 0) + 1;
    item.id = newId;
    if (!item.code) item.code = 'IB-' + String(newId).padStart(5,'0');
    item.es_contenedor = item.es_contenedor ? 1 : 0;
    item.parent_id = item.parent_id || null;
    item.tipo_material = item.es_contenedor ? 'inventariable' : (item.tipo_material || 'consumible');
    const vals = HEADERS_INV.map(h => item[h] ?? null);
    await env.DB.prepare(`INSERT INTO inventario (${HEADERS_INV.join(',')}) VALUES (${HEADERS_INV.map(()=>'?').join(',')})`)
      .bind(...vals).run();
    await auditLog(env.DB, user, 'add', newId, `Añadido: ${item.item} (${item.ref})`);
    return Response.json({ ok: true, item });
  }

  if (action === 'update') {
    item.es_contenedor = item.es_contenedor ? 1 : 0;
    item.parent_id = item.parent_id || null;
    item.tipo_material = item.es_contenedor ? 'inventariable' : (item.tipo_material || 'consumible');
    const sets = FIELDS_UPD.map(h => `${h}=?`).join(',');
    const vals = [...FIELDS_UPD.map(h => item[h] ?? null), item.id];
    await env.DB.prepare(`UPDATE inventario SET ${sets} WHERE id=?`).bind(...vals).run();
    await auditLog(env.DB, user, 'update', item.id, `Actualizado: ${item.item}`);
    return Response.json({ ok: true, item });
  }

  if (action === 'delete') {
    const old = await env.DB.prepare('SELECT item, ref FROM inventario WHERE id=?').bind(id).first();
    // Desasociar hijos antes de borrar la caja
    await env.DB.prepare('UPDATE inventario SET parent_id=NULL WHERE parent_id=?').bind(id).run();
    await env.DB.prepare('DELETE FROM inventario WHERE id=?').bind(id).run();
    await auditLog(env.DB, user, 'delete', id, `Eliminado: ${old?.item} (${old?.ref})`);
    return Response.json({ ok: true });
  }

  if (action === 'bulkImport') {
    const newItems = body.items || [];
    if (!newItems.length) return Response.json({ ok: false, error: 'Sin ítems' });
    const maxRow = await env.DB.prepare('SELECT MAX(id) as m FROM inventario').first();
    let nextId = (maxRow.m || 0) + 1;
    const stmt = env.DB.prepare(`INSERT OR REPLACE INTO inventario (${HEADERS_INV.join(',')}) VALUES (${HEADERS_INV.map(()=>'?').join(',')})`);
    const batch = newItems.map(it => {
      if (!it.id) it.id = nextId++;
      if (!it.code) it.code = 'IB-' + String(it.id).padStart(5,'0');
      it.es_contenedor = it.es_contenedor ? 1 : 0;
      it.parent_id = it.parent_id || null;
      it.tipo_material = it.es_contenedor ? 'inventariable' : (it.tipo_material || 'consumible');
      return stmt.bind(...HEADERS_INV.map(h => it[h] ?? null));
    });
    await env.DB.batch(batch);
    await auditLog(env.DB, user, 'bulkImport', '', `Importados ${newItems.length} ítems`);
    return Response.json({ ok: true, imported: newItems.length, items: newItems });
  }

  return Response.json({ ok: false, error: 'Acción desconocida' });
}
