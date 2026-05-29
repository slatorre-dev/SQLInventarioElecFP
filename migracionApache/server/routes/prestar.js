const express = require('express');
const router = express.Router();
const DB = require('../db');

const HEADERS_PRES = ['id','itemId','itemNombre','cantidad','aulaOrigen','aulaDestino','profesorId','profesorNombre','gestionadoPor','fechaPrestamo','fechaPrevista','fechaDevolucion','cantidadDevuelta','estado','obs'];

async function getGmailAccessToken() {
  const { GOOGLE_OAUTH_CLIENT_ID: c, GOOGLE_OAUTH_CLIENT_SECRET: s, GOOGLE_OAUTH_REFRESH_TOKEN: r } = process.env;
  if (!c || !s || !r) return null;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: c, client_secret: s, refresh_token: r, grant_type: 'refresh_token' }),
  });
  const data = await res.json().catch(() => ({}));
  return data.access_token || null;
}

async function sendGmail(to, subject, htmlBody) {
  const accessToken = await getGmailAccessToken();
  if (!accessToken || !to) return;
  const from = process.env.MAIL_FROM || 'inventarioelec@iesjuanbosco.es';
  const subjectEncoded = '=?UTF-8?B?' + btoa(unescape(encodeURIComponent(subject))) + '?=';
  const mime = [
    `From: Inventario Taller FP <${from}>`, `To: ${to}`, `Subject: ${subjectEncoded}`,
    'MIME-Version: 1.0', 'Content-Type: text/html; charset=utf-8', 'Content-Transfer-Encoding: base64',
    '', btoa(unescape(encodeURIComponent(htmlBody))),
  ].join('\r\n');
  const encoded = btoa(unescape(encodeURIComponent(mime))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw: encoded }),
  }).catch(e => console.warn('sendGmail failed', e?.message));
}

async function auditLog(user, accion, itemId, resumen) {
  const fecha = new Date().toISOString().replace('T', ' ').slice(0, 19);
  try {
    await DB.prepare("CREATE TABLE IF NOT EXISTS log (id INTEGER PRIMARY KEY AUTOINCREMENT, fecha TEXT DEFAULT '', usuario TEXT DEFAULT '', nombre TEXT DEFAULT '', rol TEXT DEFAULT '', accion TEXT DEFAULT '', itemId TEXT DEFAULT '', resumen TEXT DEFAULT '')").run();
    await DB.prepare('INSERT INTO log (fecha,usuario,nombre,rol,accion,itemId,resumen) VALUES (?,?,?,?,?,?,?)')
      .bind(fecha, user.usuario, user.nombre, user.rol, accion, String(itemId ?? ''), resumen).run();
  } catch (error) {
    console.warn('auditLog failed', error?.message || error);
  }
}

router.post('/', async (req, res) => {
  const body = req.body;
  const { action } = body;
  const user = req.user;

  if (action === 'prestarCaja') {
    const { cajaId, profesorId, profesorNombre, aulaDestino, fechaPrevista, obs, gestionadoPor, fechaPrestamo } = body;
    const hijos = await DB.prepare('SELECT * FROM inventario WHERE parent_id=?').bind(cajaId).all();
    if (!hijos.results?.length) return res.json({ ok: false, error: 'La caja no tiene componentes' });
    const maxRow = await DB.prepare('SELECT MAX(id) as m FROM prestamos').first();
    let nextId = (maxRow.m || 0) + 1;
    const nuevos = [];
    for (const hijo of hijos.results) {
      if (Number(hijo.qty) < 1) continue;
      const pres = {
        id: nextId++, itemId: hijo.id, itemNombre: hijo.item, cantidad: Number(hijo.qty),
        aulaOrigen: hijo.aula, aulaDestino: aulaDestino || '', profesorId, profesorNombre,
        gestionadoPor: gestionadoPor || '', fechaPrestamo: fechaPrestamo || '',
        fechaPrevista: fechaPrevista || '', fechaDevolucion: '', cantidadDevuelta: 0, estado: 'Activo', obs: obs || '',
      };
      const vals = HEADERS_PRES.map(h => pres[h] ?? '');
      await DB.prepare(`INSERT INTO prestamos (${HEADERS_PRES.join(',')}) VALUES (${HEADERS_PRES.map(() => '?').join(',')})`)
        .bind(...vals).run();
      await DB.prepare('UPDATE inventario SET qty = qty - ? WHERE id=?').bind(pres.cantidad, hijo.id).run();
      nuevos.push(pres);
    }
    await auditLog(user, 'prestarCaja', cajaId, `Préstamo de caja ${cajaId} completa a ${profesorNombre}: ${nuevos.length} componentes`);
    return res.json({ ok: true, prestamos: nuevos });
  }

  if (action === 'prestar') {
    const pres = body.prestamo;
    const maxRow = await DB.prepare('SELECT MAX(id) as m FROM prestamos').first();
    pres.id = (maxRow.m || 0) + 1;
    pres.estado = 'Activo';
    await DB.prepare('UPDATE inventario SET qty = qty - ? WHERE id=?').bind(pres.cantidad, pres.itemId).run();
    const vals = HEADERS_PRES.map(h => pres[h] ?? '');
    await DB.prepare(`INSERT INTO prestamos (${HEADERS_PRES.join(',')}) VALUES (${HEADERS_PRES.map(() => '?').join(',')})`)
      .bind(...vals).run();
    await auditLog(user, 'prestar', pres.itemId, `Préstamo ${pres.id}: ${pres.cantidad}ud a ${pres.profesorNombre}`);

    // Notificar al responsable del módulo si existe
    if (pres.moduloCod) {
      try {
        await DB.prepare("ALTER TABLE ciclos ADD COLUMN responsable TEXT DEFAULT ''").run().catch(() => {});
        const moduloKey = String(pres.moduloCod);
        const [cicloId, modCod] = moduloKey.includes('__') ? moduloKey.split('__') : ['', moduloKey];
        const modRow = cicloId
          ? await DB.prepare('SELECT responsable FROM ciclos WHERE cicloId=? AND modCod=?').bind(cicloId, modCod).first()
          : await DB.prepare('SELECT responsable FROM ciclos WHERE modCod=?').bind(modCod).first();
        const responsableNombre = modRow?.responsable?.trim();
        if (responsableNombre) {
          const userRow = await DB.prepare('SELECT email FROM usuarios WHERE nombre=?').bind(responsableNombre).first();
          if (userRow?.email) {
            await sendGmail(userRow.email, `Préstamo de material: ${pres.itemNombre}`,
              `<div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827">
                <h2>Nuevo préstamo de material</h2>
                <p>Hola ${responsableNombre},</p>
                <p>Se ha registrado un préstamo de material de tu módulo <strong>${pres.moduloNombre || pres.moduloCod}</strong>:</p>
                <table style="border-collapse:collapse;width:100%;max-width:500px">
                  <tr><td style="padding:6px;font-weight:bold">Material:</td><td style="padding:6px">${pres.itemNombre}</td></tr>
                  <tr><td style="padding:6px;font-weight:bold">Cantidad:</td><td style="padding:6px">${pres.cantidad}</td></tr>
                  <tr><td style="padding:6px;font-weight:bold">Profesor:</td><td style="padding:6px">${pres.profesorNombre}</td></tr>
                  <tr><td style="padding:6px;font-weight:bold">Aula destino:</td><td style="padding:6px">${pres.aulaDestino || '-'}</td></tr>
                  <tr><td style="padding:6px;font-weight:bold">Fecha prevista devolución:</td><td style="padding:6px">${pres.fechaPrevista || '-'}</td></tr>
                </table>
                <p style="font-size:12px;color:#6b7280">Inventario Taller FP</p>
              </div>`
            );
          }
        }
      } catch (e) { console.warn('notif email failed', e?.message); }
    }
    return res.json({ ok: true, prestamo: pres });
  }

  if (action === 'devolver') {
    const { presId, cantidadDevuelta, obs } = body;
    const pres = await DB.prepare('SELECT * FROM prestamos WHERE id=?').bind(presId).first();
    if (!pres) return res.json({ ok: false, error: 'Préstamo no encontrado' });
    const fecha = new Date().toISOString().split('T')[0];
    const estado = cantidadDevuelta >= pres.cantidad ? 'Devuelto' : 'Parcial';
    await DB.prepare('UPDATE prestamos SET fechaDevolucion=?, cantidadDevuelta=?, estado=?, obs=? WHERE id=?')
      .bind(fecha, cantidadDevuelta, estado, obs || '', presId).run();
    await DB.prepare('UPDATE inventario SET qty = qty + ? WHERE id=?').bind(cantidadDevuelta, pres.itemId).run();
    await auditLog(user, 'devolver', pres.itemId, `Devolución préstamo ${presId}: ${cantidadDevuelta}ud`);
    return res.json({ ok: true });
  }

  res.json({ ok: false, error: 'Acción desconocida' });
});

module.exports = router;
