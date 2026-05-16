// ═════════════════════════════════════════════════════════
// MODAL ITEM
// ═════════════════════════════════════════════════════════
function fillModalSelects(){
  document.getElementById('f_aula').innerHTML=AULAS.map(a=>`<option value="${a.id}">${a.name} — ${a.desc}</option>`).join('');
  document.getElementById('f_ciclo').innerHTML='<option value="">Sin asignar</option>'+CICLOS.map(c=>`<option value="${c.id}">${c.icon} ${c.name}</option>`).join('');
  document.getElementById('f_cat').innerHTML=Object.keys(CATS).map(c=>`<option value="${c}">${c}</option>`).join('');
  fillLocationSuggestions();
}

function fillLocationSuggestions(){
  const list = document.getElementById('locList');
  if(!list) return;
  const seen = new Set();
  const locs = (items || [])
    .map(x => String(x.loc || '').trim())
    .filter(Boolean)
    .filter(loc => {
      const key = loc.toLowerCase();
      if(seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a,b) => a.localeCompare(b, 'es', { sensitivity:'base' }));
  list.innerHTML = locs.map(loc => `<option value="${escHtml(loc)}"></option>`).join('');
}

function updateModSelect(){
  const cId = document.getElementById('f_ciclo').value;
  const sel = document.getElementById('f_mod');
  if(!cId){ sel.innerHTML='<option value="">Sin asignar</option>'; return; }
  const c = CICLOS.find(x=>x.id===cId);
  sel.innerHTML='<option value="">Sin asignar</option>'+c.modulos.map(m=>`<option value="${cId}__${m.cod}">${m.cod} — ${m.name}</option>`).join('');
}

function itemUrl(id){
  const base = location.protocol.startsWith('http')
    ? location.origin + location.pathname.replace(/index\.html$/,'')
    : 'https://inventariodepartamento.pages.dev/';
  return base.replace(/#.*$/,'') + '#item/' + encodeURIComponent(itemCode(id) || id);
}

function itemCode(itemOrId){
  const item = typeof itemOrId === 'object' ? itemOrId : items.find(x=>String(x.id)===String(itemOrId));
  if(item?.code) return String(item.code).trim().toUpperCase();
  const id = typeof itemOrId === 'object' ? itemOrId?.id : itemOrId;
  const n = Number(id);
  if(Number.isFinite(n) && n > 0) return 'IB-' + String(n).padStart(5, '0');
  const raw = String(id || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return raw ? 'IB-' + raw.slice(0, 8) : '';
}

function qrSrc(text, size=220){
  return 'https://api.qrserver.com/v1/create-qr-code/?size=' + size + 'x' + size +
    '&margin=10&data=' + encodeURIComponent(text);
}

function escHtml(v){
  return String(v ?? '').replace(/[&<>"']/g, ch => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  }[ch]));
}

function renderItemQr(item){
  const box = document.getElementById('itemQrBox');
  if(!box) return;
  if(!item?.id){
    box.style.display = 'none';
    return;
  }
  const url = itemUrl(item.id);
  const code = itemCode(item);
  box.style.display = '';
  document.getElementById('itemQrImg').src = qrSrc(url);
  document.getElementById('itemQrTitle').textContent = `${code} · ${item.ref ? item.ref+' · ' : ''}${item.item}`;
  document.getElementById('itemQrUrl').textContent = url;
}

let _quickQrItemId = null;

function openItemQr(id){
  const item = items.find(x=>Number(x.id)===Number(id));
  if(!item) return;
  _quickQrItemId = item.id;
  const url = itemUrl(item.id);
  const code = itemCode(item);
  document.getElementById('quickQrImg').src = qrSrc(url);
  document.getElementById('quickQrTitle').textContent = `${code} · ${item.ref ? item.ref+' · ' : ''}${item.item}`;
  document.getElementById('quickQrUrl').textContent = url;
  document.getElementById('mItemQr').classList.add('open');
}

function closeItemQr(){
  document.getElementById('mItemQr')?.classList.remove('open');
}

async function copyQuickItemQrUrl(){
  const url = document.getElementById('quickQrUrl')?.textContent || '';
  if(!url) return;
  try{
    await navigator.clipboard.writeText(url);
    toast('Enlace del ítem copiado','ok');
  }catch(e){
    prompt('Copia el enlace del ítem:', url);
  }
}

function printQuickItemQr(){
  if(!_quickQrItemId) return;
  printItemQr(_quickQrItemId);
}

function renderMainPhoto(src){
  const input = document.getElementById('f_foto');
  const preview = document.getElementById('f_foto_preview');
  if(input) input.value = src || '';
  if(!preview) return;
  preview.innerHTML = src ? `<img src="${src}" alt="Foto principal">` : '<span>📷</span>';
  preview.classList.toggle('has-photo', !!src);
}

function isMaintenanceMarked(item){
  return item?.mant === true || item?.mant === 1 || String(item?.mant || '').trim() === '1' || item?.est === 'Avería';
}

function fillMaintenanceResponsibles(){
  const list = document.getElementById('mantRespList');
  if(!list) return;
  list.innerHTML = profesores
    .map(p => p.nombre ? `<option value="${escHtml(p.nombre)}">${escHtml(p.departamento || '')}</option>` : '')
    .join('');
}

function toggleMaintFields(){
  const checked = document.getElementById('f_mant')?.checked;
  const box = document.getElementById('maintFields');
  if(box) box.classList.toggle('show', !!checked);
  if(checked){
    const fecha = document.getElementById('f_mantFecha');
    const estado = document.getElementById('f_mantEstado');
    if(fecha && !fecha.value) fecha.value = new Date().toISOString().split('T')[0];
    if(estado && !estado.value) estado.value = 'Pendiente';
  }
}

function setMainPhotoFromFile(file){
  if(!file || !file.type.startsWith('image/')) return Promise.resolve(false);
  const MAX = 360, QUALITY = 0.45;
  return new Promise(resolve => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let w = img.width, h = img.height;
      if(w > MAX || h > MAX){
        if(w >= h){ h = Math.round(h*MAX/w); w = MAX; }
        else       { w = Math.round(w*MAX/h); h = MAX; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      renderMainPhoto(canvas.toDataURL('image/jpeg', QUALITY));
      resolve(true);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(false); };
    img.src = url;
  });
}

function setItemModalReadonly(readonly){
  const modal = document.querySelector('#mItem .modal');
  modal?.classList.toggle('item-readonly', !!readonly);
  ['f_ref','f_aula','f_item','f_qty','f_min','f_cat','f_ciclo','f_mod','f_loc','f_est','f_util','f_fecha','f_mant','f_mantFecha','f_mantEstado','f_mantResp','f_mantNota','f_obs']
    .forEach(id => {
      const el = document.getElementById(id);
      if(el) el.disabled = !!readonly;
    });
}

function openModal(id=null, src=null){
  const existing = id !== null && id !== undefined;
  if(!existing && !requirePerm('items.write')) return;
  if(existing && !SESSION) return;
  eid=id; fillModalSelects();
  const m = existing ? items.find(x=>Number(x.id)===Number(id)) : src;
  if(existing && !m) return;
  const readonly = existing && !can('items.write');
  fillMaintenanceResponsibles();
  document.getElementById('mT').textContent = existing ? (readonly ? 'Ver ítem' : 'Editar ítem') : src ? '📋 Duplicar ítem' : 'Nuevo ítem';
  document.getElementById('f_ref').value = id ? (m?.ref||'') : '';
  document.getElementById('f_aula').value=m?.aula||(cf?.type==='aula'?cf.id:AULAS[0]?.id);
  document.getElementById('f_item').value=m?.item||'';
  renderMainPhoto(m?.foto||'');
  document.getElementById('f_qty').value = id ? (m?.qty??1) : 1;
  document.getElementById('f_min').value=m?.min??0;
  document.getElementById('f_cat').value=m?.cat||Object.keys(CATS)[0]||'Componentes electrónicos';
  const itemCiclo = m?.mod ? m.mod.split('__')[0] : (cf?.type==='mod' ? cf.ciclo.id : '');
  document.getElementById('f_ciclo').value = itemCiclo;
  updateModSelect();
  document.getElementById('f_mod').value = m?.mod || (cf?.type==='mod'?cf.id:'');
  document.getElementById('f_loc').value=m?.loc||'';
  document.getElementById('f_est').value=m?.est||'Bueno';
  document.getElementById('f_util').value=m?.util||'';
  document.getElementById('f_fecha').value=m?.fecha||new Date().toISOString().split('T')[0];
  document.getElementById('f_mant').checked=isMaintenanceMarked(m);
  document.getElementById('f_mantFecha').value=m?.mantFecha||'';
  document.getElementById('f_mantEstado').value=m?.mantEstado||'Pendiente';
  document.getElementById('f_mantResp').value=m?.mantResp||'';
  document.getElementById('f_mantNota').value=m?.mantNota||'';
  toggleMaintFields();
  document.getElementById('f_obs').value=m?.obs||'';
  initDocSection(id);
  renderItemQr(existing ? m : null);
  setItemModalReadonly(readonly);
  const btnH = document.getElementById('btnHistorial');
  if (btnH) btnH.style.display = existing ? '' : 'none';
  document.getElementById('mItem').classList.add('open');
}

function duplicateItem(id){
  if(!requirePerm('items.write')) return;
  const src = items.find(x=>x.id===id);
  if(src) openModal(null, src);
}

function _autoRef(name){
  const clean = name.normalize('NFD').split('').filter(c=>c.charCodeAt(0)<0x300||c.charCodeAt(0)>0x36F).join('');
  const prefix = clean.replace(/[^a-zA-Z]/g,'').slice(0,3);
  if(!prefix) return '';
  const cap = prefix.charAt(0).toUpperCase() + prefix.slice(1).toLowerCase();
  const pat = new RegExp('^' + cap + '-\\d+$');
  const nums = items.filter(x=>x.id!==eid).map(x=>x.ref||'').filter(r=>pat.test(r)).map(r=>parseInt(r.split('-')[1])||0);
  return cap + '-' + (nums.length ? Math.max(...nums)+1 : 1);
}
function closeM(){document.getElementById('mItem').classList.remove('open');setItemModalReadonly(false)}

async function copyItemQrUrl(){
  const url = document.getElementById('itemQrUrl')?.textContent || '';
  if(!url) return;
  try{
    await navigator.clipboard.writeText(url);
    toast('Enlace del ítem copiado','ok');
  }catch(e){
    prompt('Copia el enlace del ítem:', url);
  }
}

function printItemQr(itemId=eid){
  if(!itemId) return;
  const it = items.find(x=>Number(x.id)===Number(itemId));
  if(!it) return;
  const url = itemUrl(it.id);
  const code = itemCode(it);
  const aula = AULAS.find(a=>a.id===it.aula)?.name || it.aula || '';
  const mod = findModulo(it.mod);
  const title = `${code} · ${it.ref ? it.ref + ' · ' : ''}${it.item}`;
  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
  <title>QR ${escHtml(it.ref || it.item)}</title>
  <style>
    @page{size:80mm 55mm;margin:6mm}
    body{font-family:Arial,sans-serif;margin:0;color:#111}
    .label{display:flex;gap:12px;align-items:center}
    img{width:132px;height:132px}
    h1{font-size:15px;margin:0 0 5px;line-height:1.2}
    .meta{font-size:11px;line-height:1.35;color:#333}
    .url{font-size:8px;line-height:1.25;color:#666;margin-top:7px;word-break:break-all}
  </style></head><body>
    <div class="label">
      <img src="${qrSrc(url,260)}" alt="QR">
      <div>
        <h1>${escHtml(title)}</h1>
        <div class="meta">${escHtml(aula)}${mod ? '<br>' + escHtml(mod.cod + ' · ' + mod.name) : ''}</div>
        <div class="url">${escHtml(code)} · ${escHtml(url)}</div>
      </div>
    </div>
    <script>const img=document.querySelector('img');img.onload=()=>setTimeout(()=>print(),100);<\/script>
  </body></html>`;
  const w = window.open('','_blank');
  if(!w){ toast('El navegador ha bloqueado la ventana de impresión','err'); return; }
  w.document.write(html);
  w.document.close();
}

function printBulkItemQrs(){
  const data = (typeof getFiltered === 'function' ? getFiltered() : items)
    .filter(x => x?.id);
  if(!data.length){
    toast('No hay ítems para imprimir QR','err');
    return;
  }
  const titulo = cf?.label || 'Inventario';
  const fecha = new Date().toLocaleDateString('es-ES',{day:'2-digit',month:'long',year:'numeric'});
  const labels = data.map(it => {
    const url = itemUrl(it.id);
    const code = itemCode(it);
    const aula = AULAS.find(a=>a.id===it.aula)?.name || it.aula || '';
    const mod = findModulo(it.mod);
    const title = `${code} · ${it.ref ? it.ref + ' · ' : ''}${it.item || ''}`;
    return `<article class="label">
      <img src="${qrSrc(url,220)}" alt="QR">
      <div class="info">
        <h2>${escHtml(title)}</h2>
        <div class="meta">${escHtml(aula)}${mod ? '<br>' + escHtml(mod.cod + ' · ' + mod.name) : ''}</div>
        <div class="url">${escHtml(code)} · ${escHtml(url)}</div>
      </div>
    </article>`;
  }).join('');
  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
  <title>Etiquetas QR ${escHtml(titulo)}</title>
  <style>
    @page{size:A4;margin:10mm}
    *{box-sizing:border-box}
    body{font-family:Arial,sans-serif;margin:0;color:#111}
    .head{margin:0 0 8mm;border-bottom:1px solid #ddd;padding-bottom:4mm}
    .head h1{font-size:18px;margin:0 0 3px}
    .head p{font-size:11px;margin:0;color:#555}
    .sheet{display:grid;grid-template-columns:repeat(2,1fr);gap:6mm}
    .label{min-height:52mm;border:1px solid #d7dce5;border-radius:4px;padding:5mm;display:flex;gap:4mm;align-items:center;break-inside:avoid;page-break-inside:avoid}
    img{width:30mm;height:30mm;flex:0 0 30mm}
    h2{font-size:13px;line-height:1.2;margin:0 0 3mm;overflow-wrap:anywhere}
    .meta{font-size:10px;line-height:1.3;color:#333}
    .url{font-size:7px;line-height:1.2;color:#666;margin-top:3mm;word-break:break-all}
  </style></head><body>
    <header class="head">
      <h1>Etiquetas QR · ${escHtml(titulo)}</h1>
      <p>IES El Bosco · ${data.length} etiquetas · ${escHtml(fecha)}</p>
    </header>
    <main class="sheet">${labels}</main>
    <script>
      const imgs=[...document.images];
      Promise.all(imgs.map(img=>img.complete?Promise.resolve():new Promise(r=>{img.onload=img.onerror=r;})))
        .then(()=>setTimeout(()=>print(),150));
    <\/script>
  </body></html>`;
  const w = window.open('','_blank');
  if(!w){ toast('El navegador ha bloqueado la ventana de impresión','err'); return; }
  w.document.write(html);
  w.document.close();
}

async function saveItem(){
  const name=document.getElementById('f_item').value.trim();
  if(!name){toast('El nombre es obligatorio','err');return}
  if(!document.getElementById('f_ciclo').value){toast('El ciclo es obligatorio','err');return}
  if(!document.getElementById('f_mod').value){toast('El módulo es obligatorio','err');return}
  const refRaw = document.getElementById('f_ref').value.trim();
  const v={
    code: eid ? itemCode(items.find(x=>x.id===eid) || eid) : '',
    ref: refRaw || _autoRef(name),
    aula:document.getElementById('f_aula').value,
    item:name,
    foto:document.getElementById('f_foto').value,
    qty:parseInt(document.getElementById('f_qty').value)||0,
    min:parseInt(document.getElementById('f_min').value)||0,
    cat:document.getElementById('f_cat').value,
    mod:document.getElementById('f_mod').value,
    loc:document.getElementById('f_loc').value.trim(),
    est:document.getElementById('f_est').value,
    util:document.getElementById('f_util').value.trim(),
    fecha:document.getElementById('f_fecha').value,
    mant:document.getElementById('f_mant').checked ? '1' : '',
    mantFecha:document.getElementById('f_mantFecha').value,
    mantNota:document.getElementById('f_mantNota').value.trim(),
    mantResp:document.getElementById('f_mantResp').value.trim(),
    mantEstado:document.getElementById('f_mantEstado').value,
    obs:document.getElementById('f_obs').value.trim(),
  };
  const btn = document.getElementById('btnSave');
  btn.disabled = true; btn.textContent = '⏳ Guardando...';
  try {
    if(eid){
      const item={...items.find(x=>x.id===eid),...v};
      const res = await apiPost({action:'update', item});
      if(!res.ok) throw new Error(res.error);
      const i=items.findIndex(x=>x.id===eid); items[i]=item;
      await uploadPendingDocs(eid, item.item, item.aula);
      toast('Ítem actualizado','ok');
    } else {
      const res = await apiPost({action:'add', item:v});
      if(!res.ok) throw new Error(res.error);
      items.push(res.item);
      await uploadPendingDocs(res.item.id, res.item.item, res.item.aula);
      toast('Ítem añadido','ok');
    }
    closeM();
    if(cf) openSub(); else renderHome();
  } catch(err) { toast('Error: '+err.message,'err'); }
  finally { btn.disabled=false; btn.textContent='💾 Guardar'; }
}

// ═════════════════════════════════════════════════════════
// DELETE ITEM
// ═════════════════════════════════════════════════════════
let dId=null;
function confDel(id){
  if(!requirePerm('items.delete')) return;
  const it=items.find(x=>x.id===id);dId=id;
  document.getElementById('cTitle').textContent = '¿Eliminar ítem?';
  document.getElementById('cSub').textContent=`"${it?.item}" será eliminado permanentemente.`;
  document.getElementById('cOk').onclick = async () => {
    const btn = document.getElementById('cOk');
    btn.disabled = true; btn.textContent = '⏳';
    try {
      const res = await apiPost({action:'delete', id:dId});
      if(!res.ok) throw new Error(res.error);
      items = items.filter(x=>x.id!==dId);
      closeConf();
      if(cf) openSub(); else renderHome();
      toast('Ítem eliminado','ok');
    } catch(err) { toast('Error: '+err.message,'err'); }
    finally { btn.disabled=false; btn.textContent='Eliminar'; }
  };
  document.getElementById('mConf').classList.add('open');
}
function closeConf(){document.getElementById('mConf').classList.remove('open')}

// ═════════════════════════════════════════════════════════
// BAJA DE MATERIAL
// ═════════════════════════════════════════════════════════
let bajaId = null;

function openBaja(id){
  if(!requirePerm('items.write')) return;
  bajaId = id;
  const it = items.find(x=>x.id===id);
  if(!it) return;
  const qty = Number(it.qty)||0;
  document.getElementById('bajaItemName').textContent = `${it.ref ? it.ref+' — ' : ''}${it.item}`;
  document.getElementById('bajaQtyActual').textContent = qty;
  document.getElementById('bajaCantidad').max = qty;
  document.getElementById('bajaCantidad').value = 1;
  document.getElementById('bajaMotivo').value = '';
  document.getElementById('bajaFecha').value = new Date().toISOString().split('T')[0];
  updateBajaRestante();
  document.getElementById('mBaja').classList.add('open');
}

function updateBajaRestante(){
  const it = items.find(x=>x.id===bajaId);
  if(!it) return;
  const qty = Number(it.qty)||0;
  const cant = Math.min(Number(document.getElementById('bajaCantidad').value)||1, qty);
  const restante = qty - cant;
  const el = document.getElementById('bajaQtyRestante');
  el.textContent = restante;
  el.style.color = restante === 0 ? 'var(--red)' : 'var(--green)';
  document.getElementById('bajaNote').textContent = restante === 0
    ? '⚠ El ítem pasará a estado Baja (sin stock).'
    : `El ítem mantendrá ${restante} unidad${restante!==1?'es':''} en activo.`;
}

function closeBaja(){ document.getElementById('mBaja').classList.remove('open'); bajaId = null; }

async function saveBaja(){
  const motivo = document.getElementById('bajaMotivo').value.trim();
  if(!motivo){ toast('Escribe el motivo de la baja','err'); return; }
  const it = items.find(x=>x.id===bajaId);
  if(!it) return;
  const qty = Number(it.qty)||0;
  const cant = Math.min(Number(document.getElementById('bajaCantidad').value)||1, qty);
  if(cant < 1){ toast('La cantidad debe ser al menos 1','err'); return; }
  const fecha = document.getElementById('bajaFecha').value;
  const restante = qty - cant;
  const obsNuevo = `[BAJA ${fecha}: ${cant} ud.] ${motivo}${it.obs ? '\n'+it.obs : ''}`;
  const updated = {
    ...it,
    qty: restante,
    est: restante === 0 ? 'Baja' : it.est,
    fecha,
    obs: obsNuevo
  };
  const btn = document.getElementById('btnBaja');
  btn.disabled = true; btn.textContent = '⏳ Guardando...';
  try{
    const res = await apiPost({action:'update', item:updated});
    if(!res.ok) throw new Error(res.error);
    const idx = items.findIndex(x=>x.id===bajaId);
    items[idx] = updated;
    closeBaja();
    if(cf) openSub(); else renderHome();
    toast(restante===0 ? 'Ítem dado de baja completamente' : `${cant} unidad${cant!==1?'es':''} dada${cant!==1?'s':''} de baja · Quedan ${restante}`,'ok');
  }catch(err){ toast('Error: '+err.message,'err'); }
  finally{ btn.disabled=false; btn.textContent='⛔ Confirmar baja'; }
}

// ═════════════════════════════════════════════════════════
// SOLICITUD DE COMPRA (PEDIDOS)
// ═════════════════════════════════════════════════════════
let pedidos = JSON.parse(localStorage.getItem('inv_pedidos')||'{}');

function savePedidosLocal(){ localStorage.setItem('inv_pedidos', JSON.stringify(pedidos)); }

function isPedido(id){ return !!pedidos[id]; }

function updatePedBadge(){
  const n = Object.keys(pedidos).length;
  const badge = document.getElementById('pedBadge');
  if(!badge) return;
  badge.textContent = n;
  badge.style.display = n > 0 ? 'inline' : 'none';
}

function togglePedido(id){
  if(pedidos[id]){
    delete pedidos[id];
  } else {
    const it = items.find(x=>x.id===id);
    pedidos[id] = { qty: Math.max(1, (Number(it?.min)||1) - (Number(it?.qty)||0)), nota:'' };
    if(it) apiPost({action:'notificarPedido', item:{id:it.id, item:it.item, ref:it.ref, aula:AULAS.find(a=>a.id===it.aula)?.name||it.aula, qty:it.qty, min:it.min}}).catch(()=>{});
  }
  savePedidosLocal();
  updatePedBadge();
  if(cf) openSub(); else renderHome();
}

function openPedidos(){
  if(!requirePerm('orders.write')) return;
  renderPedidosList();
  document.getElementById('mPedidos').classList.add('open');
}
function closePedidos(){ document.getElementById('mPedidos').classList.remove('open'); }

function renderPedidosList(){
  const ids = Object.keys(pedidos);
  const el = document.getElementById('pedList');
  if(!ids.length){
    el.innerHTML=`<div class="ped-empty">🛒 No hay ítems en la lista de pedido.<br><span style="font-size:12px">Usa el botón 🛒 en cada ítem para añadirlos.</span></div>`;
    return;
  }
  el.innerHTML = ids.map(id=>{
    const it = items.find(x=>String(x.id)===String(id));
    if(!it) return '';
    const aula = AULAS.find(a=>a.id===it.aula)?.name||it.aula;
    return`<div class="ped-row">
      <div style="flex:1">
        <div class="ped-name">${it.item}</div>
        <div class="ped-meta">${it.ref?it.ref+' · ':''}${aula} · Stock actual: ${it.qty}</div>
        <input style="margin-top:6px;width:100%;padding:4px 8px;border:1px solid var(--border);border-radius:6px;font-size:12px;background:var(--white)" placeholder="Nota (opcional)" value="${pedidos[id].nota||''}" oninput="pedidos['${id}'].nota=this.value;savePedidosLocal()">
      </div>
      <div style="display:flex;flex-direction:column;align-items:center;gap:4px">
        <span style="font-size:10px;color:var(--muted)">Cantidad</span>
        <input class="ped-qty" type="number" min="1" value="${pedidos[id].qty||1}" oninput="pedidos['${id}'].qty=Number(this.value)||1;savePedidosLocal()">
        <button class="ped-del" onclick="removePedido('${id}')">🗑</button>
      </div>
    </div>`;
  }).join('');
}

function removePedido(id){
  delete pedidos[id];
  savePedidosLocal();
  updatePedBadge();
  renderPedidosList();
  if(cf) openSub(); else renderHome();
}

function clearPedidos(){
  if(!confirm('¿Vaciar toda la lista de pedido?')) return;
  pedidos = {};
  savePedidosLocal();
  updatePedBadge();
  renderPedidosList();
  if(cf) openSub(); else renderHome();
}

function printPedidos(){
  const ids = Object.keys(pedidos);
  if(!ids.length){ toast('La lista de pedido está vacía','err'); return; }
  const fecha = new Date().toLocaleDateString('es-ES');
  const filas = ids.map(id=>{
    const it = items.find(x=>String(x.id)===String(id));
    if(!it) return '';
    const aula = AULAS.find(a=>a.id===it.aula)?.name||it.aula;
    return `<tr>
      <td>${it.ref||'—'}</td>
      <td><strong>${it.item}</strong></td>
      <td>${aula}</td>
      <td style="text-align:center">${it.qty}</td>
      <td style="text-align:center;font-weight:700">${pedidos[id].qty}</td>
      <td>${pedidos[id].nota||''}</td>
    </tr>`;
  }).join('');
  const html=`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
  <title>Solicitud de compra — ${fecha}</title>
  <style>
    body{font-family:Arial,sans-serif;padding:32px;color:#111;font-size:13px}
    h1{font-size:20px;margin-bottom:4px}
    .sub{color:#666;font-size:12px;margin-bottom:24px}
    table{width:100%;border-collapse:collapse}
    th{background:#2563eb;color:#fff;padding:8px 10px;text-align:left;font-size:12px}
    td{padding:7px 10px;border-bottom:1px solid #e5e7eb}
    tr:nth-child(even) td{background:#f9fafb}
    .footer{margin-top:32px;font-size:11px;color:#999}
  </style></head><body>
  <h1>🛒 Solicitud de compra</h1>
  <div class="sub">IES Juan Bosco · Generado el ${fecha}</div>
  <table>
    <thead><tr><th>Ref.</th><th>Ítem</th><th>Aula</th><th>Stock actual</th><th>Cantidad a pedir</th><th>Nota</th></tr></thead>
    <tbody>${filas}</tbody>
  </table>
  <div class="footer">Inventario Taller FP</div>
  </body></html>`;
  const w = window.open('','_blank');
  w.document.write(html);
  w.document.close();
  w.print();
}

async function openHistorial(){
  if(!eid) return;
  const it = items.find(x=>Number(x.id)===Number(eid));
  document.getElementById('histModalTitle').textContent = `📋 Historial — ${it ? it.item : '#' + eid}`;
  document.getElementById('histBody').innerHTML = '<p style="color:var(--muted);text-align:center">Cargando...</p>';
  document.getElementById('mHistorial').classList.add('open');
  try {
    const res = await apiGet({ action: 'getItemLog', itemId: eid });
    const logs = res.logs || [];
    if (!logs.length) {
      document.getElementById('histBody').innerHTML = '<p style="color:var(--muted);text-align:center">Sin historial para este ítem.</p>';
      return;
    }
    document.getElementById('histBody').innerHTML =
      `<table class="tw" style="width:100%">
        <thead><tr><th>Fecha</th><th>Usuario</th><th>Acción</th><th>Detalle</th></tr></thead>
        <tbody>${logs.map(l =>
          `<tr>
            <td style="white-space:nowrap;font-size:12px">${l.fecha}</td>
            <td style="font-size:13px">${l.usuario}</td>
            <td style="font-size:12px">${l.accion}</td>
            <td style="font-size:12px;word-break:break-word">${l.resumen}</td>
          </tr>`
        ).join('')}</tbody>
      </table>`;
  } catch (e) {
    document.getElementById('histBody').innerHTML = `<p style="color:var(--danger)">Error al cargar historial.</p>`;
  }
}

function closeHistorial(){
  document.getElementById('mHistorial').classList.remove('open');
}
