// ═════════════════════════════════════════════════════════
// API — Cloudflare Workers
// ═════════════════════════════════════════════════════════

const ENDPOINT_MAP = {
  add:'item', update:'item', delete:'item', bulkImport:'item', restoreBackup:'item',
  prestar:'prestar', devolver:'prestar', prestarCaja:'prestar',
  profAdd:'profesores', profUpdate:'profesores', profDelete:'profesores',
  aulasSync:'config', catsSync:'config', ciclosSync:'config', ubicacionesSync:'config',
  updateProfile:'perfil', changePassword:'perfil',
  getUsers:'usuarios', userAdd:'usuarios', userUpdate:'usuarios',
  userDelete:'usuarios', userResetPassword:'usuarios', userAssignModulos:'usuarios',
  getDocs:'docs', uploadDoc:'docs', deleteDoc:'docs',
  notificarPedido:'pedidos', getItemLog:'list',
};

function urlWithAuth(endpoint, params={}){
  const u = encodeURIComponent(SESSION?.usuario||'');
  const p = encodeURIComponent(SESSION?.password||'');
  let url = `/api/${endpoint}?u=${u}&p=${p}`;
  for (const [key, val] of Object.entries(params)) {
    if (val != null) url += `&${encodeURIComponent(key)}=${encodeURIComponent(val)}`;
  }
  return url;
}

async function apiGet(endpoint, params={}){
  if (typeof endpoint === 'object') {
    const obj = endpoint;
    endpoint = obj.action || 'list';
    params = {...obj};
    delete params.action;
  }
  const r = await fetch(urlWithAuth(endpoint, params));
  if(!r.ok) throw new Error('HTTP '+r.status);
  return r.json();
}

async function apiPost(payload){
  if(payload?.action && typeof canAction === 'function' && !canAction(payload.action)){
    return {ok:false, error:'No tienes permisos para realizar esta acción'};
  }
  const endpoint = ENDPOINT_MAP[payload.action] || payload.action;
  const u = encodeURIComponent(SESSION?.usuario||'');
  const p = encodeURIComponent(SESSION?.password||'');
  const r = await fetch(`/api/${endpoint}?u=${u}&p=${p}`, {
    method:'POST',
    body: JSON.stringify(payload),
    headers: {'Content-Type':'application/json'},
  });
  let data = null;
  try { data = await r.json(); } catch(e) {}
  if(!r.ok) throw new Error(data?.error || data?.message || 'HTTP '+r.status);
  return data || {};
}
