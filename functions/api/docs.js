// Gestión de documentos adjuntos (metadatos)
async function auditLog(db, user, accion, itemId, resumen) {
  const fecha = new Date().toISOString().replace('T',' ').slice(0,19);
  try {
    await db.prepare("CREATE TABLE IF NOT EXISTS log (id INTEGER PRIMARY KEY AUTOINCREMENT, fecha TEXT DEFAULT '', usuario TEXT DEFAULT '', nombre TEXT DEFAULT '', rol TEXT DEFAULT '', accion TEXT DEFAULT '', itemId TEXT DEFAULT '', resumen TEXT DEFAULT '')").run();
    await db.prepare('INSERT INTO log (fecha,usuario,nombre,rol,accion,itemId,resumen) VALUES (?,?,?,?,?,?,?)')
      .bind(fecha, user.usuario, user.nombre, user.rol, accion, String(itemId || ''), resumen).run();
  } catch (error) {
    console.warn('auditLog failed', error?.message || error);
  }
}

function base64UrlEncode(str) {
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlEncodeBytes(bytes) {
  let str = '';
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
  return base64UrlEncode(str);
}

function base64ToUint8Array(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function ensureDocumentSchema(db) {
  const columns = [
    "ALTER TABLE documentos ADD COLUMN provider TEXT DEFAULT 'drive'",
    "ALTER TABLE documentos ADD COLUMN r2Key TEXT DEFAULT ''",
    "ALTER TABLE documentos ADD COLUMN mimeType TEXT DEFAULT ''",
    "ALTER TABLE documentos ADD COLUMN size INTEGER DEFAULT 0",
    "ALTER TABLE documentos ADD COLUMN driveSyncStatus TEXT DEFAULT ''",
  ];
  for (const sql of columns) {
    try { await db.prepare(sql).run(); }
    catch (error) {
      if (!String(error?.message || error).toLowerCase().includes('duplicate column')) {
        console.warn('ensureDocumentSchema failed', error?.message || error);
      }
    }
  }
}

function safePathPart(value, fallback = 'archivo') {
  return String(value || fallback)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80) || fallback;
}

function makeR2Key({ itemId, aulaId, fileName }) {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  const stamp = `${d.getUTCFullYear()}${pad(d.getUTCMonth()+1)}${pad(d.getUTCDate())}_${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}_${String(d.getUTCMilliseconds()).padStart(3,'0')}`;
  const rand = crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10);
  return `items/${safePathPart(itemId, 'sin_item')}/${safePathPart(aulaId, 'sin_aula')}/${stamp}_${rand}_${safePathPart(fileName)}`;
}

async function uploadFileToR2(env, { itemId, aulaId, fileName, mimeType, data }) {
  if (!env.DOCS_BUCKET) throw new Error('R2 no configurado: falta el binding DOCS_BUCKET');
  const bytes = base64ToUint8Array(data);
  const key = makeR2Key({ itemId, aulaId, fileName });
  await env.DOCS_BUCKET.put(key, bytes, {
    httpMetadata: { contentType: mimeType || 'application/octet-stream' },
    customMetadata: {
      itemId: String(itemId ?? ''),
      aulaId: String(aulaId ?? ''),
      fileName: String(fileName || ''),
    },
  });
  return { r2Key: key, size: bytes.byteLength };
}

function docProvider(doc) {
  return doc?.provider || (doc?.r2Key ? 'r2' : 'drive');
}

function pemToArrayBuffer(pem) {
  const b64 = pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  return base64ToUint8Array(b64).buffer;
}

async function signJwt(privateKeyPem, payload) {
  const keyData = pemToArrayBuffer(privateKeyPem);
  const key = await crypto.subtle.importKey(
    'pkcs8',
    keyData,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(payload)
  );
  return base64UrlEncodeBytes(new Uint8Array(signature));
}

async function getGoogleAccessToken(env) {
  const sa = env.GOOGLE_SERVICE_ACCOUNT;
  if (!sa) throw new Error('Google Drive no configurado');
  const account = typeof sa === 'string' ? JSON.parse(sa) : sa;
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss: account.client_email,
    scope: 'https://www.googleapis.com/auth/drive',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };
  const jwtPayload = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(claim))}`;
  const signature = await signJwt(account.private_key, jwtPayload);
  const assertion = `${jwtPayload}.${signature}`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  const tokenJson = await tokenRes.json();
  if (!tokenRes.ok || !tokenJson.access_token) {
    throw new Error('Google OAuth error: ' + (tokenJson.error_description || tokenJson.error || JSON.stringify(tokenJson)));
  }
  return tokenJson.access_token;
}

function normalizeFolderName(name) {
  return String(name || '').trim() || 'Aula';
}

function driveErrorMessage(prefix, payload) {
  const message = payload?.error?.message || JSON.stringify(payload);
  if (/storageQuotaExceeded|Service Accounts do not have storage quota|shared drives/i.test(message)) {
    return prefix + ': Google rechaza la subida porque la cuenta de servicio no tiene cuota propia. Usa como GOOGLE_DRIVE_ROOT_FOLDER_ID una carpeta dentro de una Unidad compartida de Google Drive y añade el service account como Gestor de contenido o Editor. Detalle: ' + message;
  }
  return prefix + ': ' + message;
}

async function findOrCreateDriveFolder(env, parentFolderId, folderName) {
  const token = await getGoogleAccessToken(env);
  const safeName = normalizeFolderName(folderName).replace(/'/g, "\\'");
  const query = `mimeType='application/vnd.google-apps.folder' and name='${safeName}' and '${parentFolderId}' in parents and trashed=false`;
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&spaces=drive&includeItemsFromAllDrives=true&supportsAllDrives=true&fields=files(id,name)`;
  const searchRes = await fetch(searchUrl, { headers: { Authorization: `Bearer ${token}` } });
  const searchJson = await searchRes.json();
  if (searchRes.ok && Array.isArray(searchJson.files) && searchJson.files.length > 0) {
    return searchJson.files[0].id;
  }

  const createRes = await fetch('https://www.googleapis.com/drive/v3/files?supportsAllDrives=true&fields=id,name', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: normalizeFolderName(folderName),
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId],
    }),
  });
  const createJson = await createRes.json();
  if (!createRes.ok || !createJson.id) {
    throw new Error(driveErrorMessage('No se pudo crear la carpeta de aula en Drive', createJson));
  }
  return createJson.id;
}

async function uploadFileToDrive(env, folderId, fileName, mimeType, base64Data) {
  const token = await getGoogleAccessToken(env);
  const boundary = '-------314159265358979323846';
  const metadata = {
    name: fileName,
    parents: [folderId],
  };
  const delimiter = `--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;
  const metadataPart =
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify(metadata) + '\r\n';
  const fileHeader = `Content-Type: ${mimeType}\r\n\r\n`;
  const preamble = new TextEncoder().encode(delimiter + metadataPart + `--${boundary}\r\n` + fileHeader);
  const fileData = base64ToUint8Array(base64Data);
  const postamble = new TextEncoder().encode(closeDelimiter);
  const body = new Uint8Array(preamble.length + fileData.length + postamble.length);
  body.set(preamble, 0);
  body.set(fileData, preamble.length);
  body.set(postamble, preamble.length + fileData.length);

  const uploadRes = await fetch(
    `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,webViewLink`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  );
  const uploadJson = await uploadRes.json();
  if (!uploadRes.ok || !uploadJson.id) {
    throw new Error(driveErrorMessage('No se pudo subir el archivo a Drive', uploadJson));
  }

  try {
    await fetch(`https://www.googleapis.com/drive/v3/files/${uploadJson.id}/permissions?supportsAllDrives=true`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ role: 'reader', type: 'anyone' }),
    });
  } catch (e) {
    // Si falla el permiso público, seguimos guardando el documento.
  }

  return {
    driveId: uploadJson.id,
    driveUrl: uploadJson.webViewLink || `https://drive.google.com/file/d/${uploadJson.id}/view`,
  };
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const action = url.searchParams.get('action') || '';

  if (action !== 'viewDoc') {
    return Response.json({ ok: false, error: 'Acción desconocida' }, { status: 404 });
  }

  await ensureDocumentSchema(env.DB);
  const docId = url.searchParams.get('docId');
  if (!docId) return Response.json({ ok: false, error: 'docId requerido' }, { status: 400 });

  const doc = await env.DB.prepare('SELECT * FROM documentos WHERE id=?').bind(docId).first();
  if (!doc) return Response.json({ ok: false, error: 'Documento no encontrado' }, { status: 404 });

  if (docProvider(doc) === 'drive') {
    if (!doc.driveUrl) return Response.json({ ok: false, error: 'Documento de Drive sin URL' }, { status: 404 });
    return Response.redirect(doc.driveUrl, 302);
  }

  if (!env.DOCS_BUCKET) return Response.json({ ok: false, error: 'R2 no configurado' }, { status: 500 });
  if (!doc.r2Key) return Response.json({ ok: false, error: 'Documento R2 sin clave' }, { status: 404 });

  const object = await env.DOCS_BUCKET.get(doc.r2Key);
  if (!object) return Response.json({ ok: false, error: 'Archivo no encontrado en R2' }, { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('cache-control', 'private, max-age=300');
  headers.set('content-disposition', `inline; filename*=UTF-8''${encodeURIComponent(doc.fileName || 'documento')}`);
  if (doc.mimeType && !headers.has('content-type')) headers.set('content-type', doc.mimeType);
  return new Response(object.body, { headers });
}

export async function onRequestPost({ request, env }) {
  const body = await request.json();
  const { action } = body;
  const user = request.user;

  if (action === 'getDocs') {
    const itemId = body.itemId;
    if (itemId == null) return Response.json({ ok: false, error: 'itemId requerido' });
    await ensureDocumentSchema(env.DB);
    const docs = await env.DB.prepare('SELECT * FROM documentos WHERE itemId=? ORDER BY id').bind(itemId).all();
    return Response.json({ ok: true, docs: (docs.results || []).map(d => ({ ...d, provider: docProvider(d) })) });
  }

  if (action === 'deleteDoc') {
    const docId = body.docId;
    if (docId == null) return Response.json({ ok: false, error: 'docId requerido' });
    await ensureDocumentSchema(env.DB);
    const doc = await env.DB.prepare('SELECT * FROM documentos WHERE id=?').bind(docId).first();
    if (!doc) return Response.json({ ok: false, error: 'Documento no encontrado' });
    const provider = docProvider(doc);
    if (provider === 'r2' && doc.r2Key && env.DOCS_BUCKET) {
      try {
        await env.DOCS_BUCKET.delete(doc.r2Key);
      } catch (e) {
        console.warn('R2 delete failed', e?.message || e);
      }
    } else if (doc.driveId || body.driveId) {
      try {
        const token = await getGoogleAccessToken(env);
        await fetch(`https://www.googleapis.com/drive/v3/files/${doc.driveId || body.driveId}?supportsAllDrives=true`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (e) {
        // Ignoramos si la eliminación en Drive falla y seguimos borrando metadatos.
      }
    }
    await env.DB.prepare('DELETE FROM documentos WHERE id=?').bind(docId).run();
    await auditLog(env.DB, user, 'deleteDoc', doc.itemId || body.itemId, `Doc ${docId} eliminado`);
    return Response.json({ ok: true });
  }

  if (action === 'uploadDoc') {
    const { itemId, itemNombre, aulaId, aulaName, fileName, mimeType, data } = body;
    if (itemId == null) return Response.json({ ok: false, error: 'itemId requerido' });
    if (!fileName) return Response.json({ ok: false, error: 'fileName requerido' });
    if (!data) return Response.json({ ok: false, error: 'data requerido' });

    try {
      await ensureDocumentSchema(env.DB);
      const uploaded = await uploadFileToR2(env, { itemId, aulaId, fileName, mimeType: mimeType || 'application/octet-stream', data });
      await env.DB.prepare('INSERT INTO documentos (itemId,itemNombre,aulaId,fileName,driveId,driveUrl,fecha,provider,r2Key,mimeType,size,driveSyncStatus) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
        .bind(itemId, itemNombre || '', aulaId || '', fileName, '', '', new Date().toISOString(), 'r2', uploaded.r2Key, mimeType || 'application/octet-stream', uploaded.size, 'pending').run();
      const doc = await env.DB.prepare('SELECT * FROM documentos WHERE r2Key=?').bind(uploaded.r2Key).first();
      await auditLog(env.DB, user, 'uploadDoc', itemId, `Documento subido: ${fileName}`);
      return Response.json({ ok: true, doc: { ...doc, provider: 'r2' } });
    } catch (error) {
      return Response.json({ ok: false, error: error.message || String(error) });
    }
  }

  return Response.json({ ok: false, error: 'Acción desconocida' });
}
