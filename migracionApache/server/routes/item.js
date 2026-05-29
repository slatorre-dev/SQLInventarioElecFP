const express = require('express');
const router = express.Router();
const DB = require('../db');

const HEADERS_INV = ['id','ref','aula','mod','item','qty','min','cat','loc','est','util','proveedor','tags','fecha','mant','mantFecha','mantNota','mantResp','mantEstado','mantSolicitante','mantSolicitanteEmail','foto','obs','code','es_contenedor','parent_id','tipo_material','oculto'];
const FIELDS_UPD = HEADERS_INV.filter(h => h !== 'id');

function isSuperAdmin(user) {
  return String(user?.rol || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') === 'superadmin';
}

async function ensureContainerCols() {
  await DB.prepare("ALTER TABLE inventario ADD COLUMN es_contenedor INTEGER DEFAULT 0").run().catch(() => {});
  await DB.prepare("ALTER TABLE inventario ADD COLUMN parent_id INTEGER DEFAULT NULL").run().catch(() => {});
  await DB.prepare("ALTER TABLE inventario ADD COLUMN tipo_material TEXT DEFAULT 'consumible'").run().catch(() => {});
  await DB.prepare("ALTER TABLE inventario ADD COLUMN proveedor TEXT DEFAULT ''").run().catch(() => {});
  await DB.prepare("ALTER TABLE inventario ADD COLUMN tags TEXT DEFAULT ''").run().catch(() => {});
  await DB.prepare("ALTER TABLE inventario ADD COLUMN oculto INTEGER DEFAULT 0").run().catch(() => {});
  await DB.prepare("UPDATE inventario SET tipo_material='inventariable' WHERE es_contenedor=1 AND (tipo_material IS NULL OR trim(tipo_material)='')").run().catch(() => {});
  await DB.prepare("UPDATE inventario SET tipo_material='consumible' WHERE tipo_material IS NULL OR trim(tipo_material)=''").run().catch(() => {});
  await DB.prepare("CREATE TABLE IF NOT EXISTS app_meta (key TEXT PRIMARY KEY, value TEXT DEFAULT '')").run().catch(() => {});
  const migrated = await DB.prepare("SELECT value FROM app_meta WHERE key='tipo_material_migrated'").first().catch(() => null);
  if (!migrated) {
    await DB.prepare("UPDATE inventario SET tipo_material='inventariable' WHERE es_contenedor=1 OR lower(cat) LIKE '%herramient%' OR lower(cat) LIKE '%equipo%' OR lower(cat) LIKE '%instrument%'").run().catch(() => {});
    await DB.prepare("INSERT OR REPLACE INTO app_meta (key,value) VALUES ('tipo_material_migrated', datetime('now'))").run().catch(() => {});
  }
}

async function auditLog(user, accion, itemId, resumen) {
  const fecha = new Date().toISOString().replace('T', ' ').slice(0, 19);
  try {
    const actor = user || {};
    await DB.prepare("CREATE TABLE IF NOT EXISTS log (id INTEGER PRIMARY KEY AUTOINCREMENT, fecha TEXT DEFAULT '', usuario TEXT DEFAULT '', nombre TEXT DEFAULT '', rol TEXT DEFAULT '', accion TEXT DEFAULT '', itemId TEXT DEFAULT '', resumen TEXT DEFAULT '')").run();
    await DB.prepare('INSERT INTO log (fecha,usuario,nombre,rol,accion,itemId,resumen) VALUES (?,?,?,?,?,?,?)')
      .bind(fecha, actor.usuario || '', actor.nombre || '', actor.rol || '', accion, String(itemId ?? ''), resumen).run();
  } catch (error) {
    console.warn('auditLog failed', error?.message || error);
  }
}

async function getAuditActor(req) {
  if (req.user?.usuario) return req.user;
  const usuario = req.query.u || '';
  if (!usuario) return {};
  const row = await DB.prepare('SELECT usuario, nombre, rol FROM usuarios WHERE usuario=?')
    .bind(usuario.trim()).first().catch(() => null);
  return row || { usuario: usuario.trim(), nombre: usuario.trim(), rol: '' };
}

function itemAuditSummary(prefix, item) {
  const parts = [
    item.ref ? `ref ${item.ref}` : '',
    item.aula ? `aula ${item.aula}` : '',
    item.cat ? `categoria ${item.cat}` : '',
    item.qty != null ? `stock ${item.qty}` : '',
    item.proveedor ? `proveedor ${item.proveedor}` : '',
  ].filter(Boolean);
  return `${prefix}: ${item.item || ''}${parts.length ? ' - ' + parts.join(' - ') : ''}`;
}

router.post('/', async (req, res) => {
  const body = req.body;
  const { action, item, id } = body;
  const user = await getAuditActor(req);

  await ensureContainerCols();

  if (action === 'add') {
    const maxRow = await DB.prepare('SELECT MAX(id) as m FROM inventario').first();
    const newId = (maxRow.m || 0) + 1;
    item.id = newId;
    if (!item.code) item.code = 'IB-' + String(newId).padStart(5, '0');
    item.es_contenedor = item.es_contenedor ? 1 : 0;
    item.parent_id = item.parent_id || null;
    item.tipo_material = item.es_contenedor ? 'inventariable' : (item.tipo_material || 'consumible');
    const vals = HEADERS_INV.map(h => item[h] ?? null);
    await DB.prepare(`INSERT INTO inventario (${HEADERS_INV.join(',')}) VALUES (${HEADERS_INV.map(() => '?').join(',')})`)
      .bind(...vals).run();
    await auditLog(user, 'add', newId, itemAuditSummary('Anadido', item));
    return res.json({ ok: true, item });
  }

  if (action === 'update') {
    item.es_contenedor = item.es_contenedor ? 1 : 0;
    item.parent_id = item.parent_id || null;
    item.tipo_material = item.es_contenedor ? 'inventariable' : (item.tipo_material || 'consumible');
    const sets = FIELDS_UPD.map(h => `${h}=?`).join(',');
    const vals = [...FIELDS_UPD.map(h => item[h] ?? null), item.id];
    await DB.prepare(`UPDATE inventario SET ${sets} WHERE id=?`).bind(...vals).run();
    await auditLog(user, 'update', item.id, itemAuditSummary('Actualizado', item));
    return res.json({ ok: true, item });
  }

  if (action === 'delete') {
    const old = await DB.prepare('SELECT item, ref FROM inventario WHERE id=?').bind(id).first();
    await DB.prepare('UPDATE inventario SET parent_id=NULL WHERE parent_id=?').bind(id).run();
    await DB.prepare('DELETE FROM inventario WHERE id=?').bind(id).run();
    await auditLog(user, 'delete', id, `Eliminado: ${old?.item} (${old?.ref})`);
    return res.json({ ok: true });
  }

  if (action === 'bulkImport') {
    const newItems = body.items || [];
    if (!newItems.length) return res.json({ ok: false, error: 'Sin items' });
    const maxRow = await DB.prepare('SELECT MAX(id) as m FROM inventario').first();
    let nextId = (maxRow.m || 0) + 1;
    const stmt = DB.prepare(`INSERT OR REPLACE INTO inventario (${HEADERS_INV.join(',')}) VALUES (${HEADERS_INV.map(() => '?').join(',')})`);
    const batch = newItems.map(it => {
      if (!it.id) it.id = nextId++;
      if (!it.code) it.code = 'IB-' + String(it.id).padStart(5, '0');
      it.es_contenedor = it.es_contenedor ? 1 : 0;
      it.parent_id = it.parent_id || null;
      it.tipo_material = it.es_contenedor ? 'inventariable' : (it.tipo_material || 'consumible');
      return stmt.bind(...HEADERS_INV.map(h => it[h] ?? null));
    });
    await DB.batch(batch);
    await auditLog(user, 'bulkImport', '', `Importados ${newItems.length} items`);
    return res.json({ ok: true, imported: newItems.length, items: newItems });
  }

  if (action === 'toggleOculto') {
    if (!isSuperAdmin(user)) return res.status(403).json({ ok: false, error: 'No autorizado' });
    const val = body.oculto ? 1 : 0;
    await DB.prepare('UPDATE inventario SET oculto=? WHERE id=?').bind(val, id).run();
    const row = await DB.prepare('SELECT item, ref FROM inventario WHERE id=?').bind(id).first();
    await auditLog(user, 'toggleOculto', id, `${val ? 'Ocultado' : 'Mostrado'}: ${row?.item} (${row?.ref})`);
    return res.json({ ok: true, oculto: val });
  }

  res.json({ ok: false, error: 'Accion desconocida' });
});

module.exports = router;
