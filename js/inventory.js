// ═════════════════════════════════════════════════════════
// SUBPAGE / INVENTARIO
// ═════════════════════════════════════════════════════════
function renderSubStats(data,low){
  const units=data.reduce((a,x)=>a+(Number(x.qty)||0),0);
  const mant=data.filter(needsMaintenance).length;
  document.getElementById('sStats').innerHTML=`
    <div class="scard-compact" onclick="_subFilter=null;renderInv()" title="Ver todos los ítems"><span class="icon">📋</span><span class="num" id="sst-tipos">0</span><span class="lbl">tipos</span></div>
    <div class="scard-compact" title="Unidades en stock"><span class="icon">🔢</span><span class="num" id="sst-units">0</span><span class="lbl">unidades</span></div>
    <div class="scard-compact${low>0?' alert':''}" ${low>0?'onclick="_subFilter=\'lowstock\';renderInv()" title="Stock bajo"':' title="Sin stock bajo"'} ><span class="icon">⚠️</span><span class="num" id="sst-low">0</span><span class="lbl">bajo</span></div>
    <div class="scard-compact${mant>0?' warn':''}" ${mant>0?'onclick="_subFilter=\'maintenance\';renderInv()" title="Necesita mantenimiento"':' title="Sin mantenimiento pendiente"'} ><span class="icon">🛠️</span><span class="num" id="sst-mant">0</span><span class="lbl">mant.</span></div>
  `;
  animateCount(document.getElementById('sst-tipos'), data.length);
  animateCount(document.getElementById('sst-units'), units);
  animateCount(document.getElementById('sst-low'), low);
  animateCount(document.getElementById('sst-mant'), mant);
}

function toggleActionMenu(evt, itemId){
  evt.stopPropagation();
  const menu = document.getElementById(`am-${itemId}`);
  if(!menu) return;
  const isVisible = menu.style.display !== 'none';
  document.querySelectorAll('[id^="am-"]').forEach(m => m.style.display = 'none');
  if(!isVisible){
    const btn = evt.currentTarget;
    const r = btn.getBoundingClientRect();
    menu.style.position = 'fixed';
    menu.style.top = (r.bottom + 4) + 'px';
    menu.style.left = Math.max(4, r.right - 180) + 'px';
    menu.style.right = 'auto';
    menu.style.display = 'block';
  }
}
document.addEventListener('click', () => {
  document.querySelectorAll('[id^="am-"]').forEach(m => m.style.display = 'none');
});

function getBase(){
  return items.filter(x=>{
    if(cf.type==='aula') return x.aula===cf.id;
    if(cf.type==='cat') return x.cat===cf.id;
    if(cf.type==='lowstock') return isLowStock(x);
    if(cf.type==='maintenance') return needsMaintenance(x);
    if(cf.type==='ocultos') return x.oculto==1;
    if(cf.type==='caja') return Number(x.parent_id)===Number(cf.id);
    return x.mod===cf.id;
  });
}

function getFiltered(){
  const q=document.getElementById('srch').value;
  const fc=document.getElementById('fCat').value;
  const fe=document.getElementById('fEst')?.value??'';
  const ft=document.getElementById('fTipo').value;
  return getBase().filter(x=>{
    if(_subFilter==='lowstock' && !isLowStock(x)) return false;
    if(_subFilter==='maintenance' && !needsMaintenance(x)) return false;
    if(fc&&x.cat!==fc)return false;
    if(fe&&x.est!==fe)return false;
    if(ft&&x.tipo_material!==ft)return false;
    if(q&&!fuzzyMatch(q,[typeof itemCode === 'function' ? itemCode(x) : x.code,x.ref,x.item,x.loc,x.proveedor,x.tags].join(' ')))return false;
    return true;
  }).sort((a,b)=>{
    let av=a[sk]??'',bv=b[sk]??'';
    if(sk==='qty'||sk==='min') return sa?Number(av)-Number(bv):Number(bv)-Number(av);
    return sa?String(av).localeCompare(String(bv)):String(bv).localeCompare(String(av));
  });
}

function setTwHeight(){
  const scroll = document.querySelector('#iContent .tw-scroll');
  if (!scroll) return;
  const topbarH = document.querySelector('.topbar')?.offsetHeight || 58;
  const pager   = document.querySelector('#iContent .pager');
  const pagerH  = pager ? pager.offsetHeight + 8 : 60;
  const h = Math.max(600, window.innerHeight - 20);
  scroll.style.maxHeight = h + 'px';
}

function renderInv(){
  const mc=document.getElementById('iContent');
  if(!itemsLoaded){
    document.getElementById('iCount').textContent='';
    document.getElementById('iLow').textContent='';
    mc.innerHTML=`<div class="inv-loading-skeleton">${Array(6).fill(`<div class="skel-row"><div class="skel-cell skel" style="width:40%"></div><div class="skel-cell skel" style="width:20%"></div><div class="skel-cell skel" style="width:15%"></div><div class="skel-cell skel" style="width:15%"></div></div>`).join('')}</div>`;
    return;
  }
  const data=getFiltered();
  const low=data.filter(isLowStock).length;
  document.getElementById('iCount').textContent=`${data.length} ítem${data.length!==1?'s':''}`;
  document.getElementById('iLow').textContent=low>0?`⚠ ${low} con stock bajo`:'';
  renderBulkBar();
  if(!data.length){
    const hasFilter = document.getElementById('srch').value || document.getElementById('fCat').value || document.getElementById('fTipo').value || document.getElementById('fEst')?.value;
    mc.innerHTML=`<div class="empty">
      <span class="ei">${hasFilter ? '🔍' : '📭'}</span>
      <div class="et">${hasFilter ? 'No hay ítems con estos filtros.<br><small>Prueba a cambiar la búsqueda o los filtros.</small>' : 'Esta sección no tiene ítems todavía.'}</div>
      ${hasFilter ? `<button class="empty-btn" onclick="document.getElementById('srch').value='';document.getElementById('fCat').value='';document.getElementById('fTipo').value='';if(document.getElementById('fEst'))document.getElementById('fEst').value='';renderInv()">✕ Limpiar filtros</button>` : ''}
    </div>`;
    return;
  }
  const mode = getInvRenderMode();
  _lastInvRenderMode = mode;
  const page = getInvPage(data);
  if(mode === 'table') rTable(page.items,mc);
  else if(mode === 'list') rList(page.items,mc);
  else rCards(page.items,mc);
  renderPager(mc,page);
  if(mode === 'table') requestAnimationFrame(setTwHeight);
}

let _lastInvRenderMode = null;
let _invPage = 1;
let _pageSize = 25;
let _pageSizeUserSet = false;
let _pageSig = '';
function isTouchLike(){
  return matchMedia('(hover: none), (pointer: coarse)').matches;
}
function getInvRenderMode(){
  if(view==='table' && window.innerWidth > 900 && !isTouchLike()) return 'table';
  if(window.innerWidth < 640) return 'list';
  return 'cards';
}

function getPageSig(data){
  return [
    cf?.type, cf?.id,
    document.getElementById('srch')?.value || '',
    document.getElementById('fCat')?.value || '',
    document.getElementById('fEst')?.value || '',
    document.getElementById('fTipo')?.value || '',
    sk, sa ? '1' : '0',
    data.length
  ].join('|');
}

function getInvPage(data){
  const sig = getPageSig(data);
  if(sig !== _pageSig){
    _pageSig = sig;
    _invPage = 1;
    if(!_pageSizeUserSet) _pageSize = isTouchLike() ? 10 : 25;
  }
  const pageSize = _pageSize;
  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
  _invPage = Math.min(Math.max(1, _invPage), totalPages);
  const start = (_invPage - 1) * pageSize;
  const end = Math.min(start + pageSize, data.length);
  return {
    items: data.slice(start, end),
    start,
    end,
    total: data.length,
    page: _invPage,
    totalPages
  };
}

function renderPager(mc,page){
  const sizes = [10,25,30,50];
  const navHtml = `
    <button class="btn btn-sm" onclick="goInvPage(${page.page-1})" ${page.page<=1?'disabled':''}>‹ Anterior</button>
    <span class="pager-page">Página ${page.page} / ${page.totalPages}</span>
    <button class="btn btn-sm" onclick="goInvPage(${page.page+1})" ${page.page>=page.totalPages?'disabled':''}>Siguiente ›</button>`;
  mc.insertAdjacentHTML('beforeend',`
    <div class="pager">
      <div class="pager-info">Mostrando ${page.start+1}-${page.end} de ${page.total}</div>
      <div class="pager-controls">
        ${navHtml}
        <label class="pager-size">
          <span>Ítems</span>
          <select onchange="setPageSize(this.value)">
            ${sizes.map(n=>`<option value="${n}" ${n===_pageSize?'selected':''}>${n}</option>`).join('')}
          </select>
        </label>
      </div>
    </div>
  `);
  const pt = document.getElementById('pagerTop');
  if(pt){
    if(page.totalPages > 1){
      const sizeSelTop = `<label class="pager-size"><span>Ítems</span><select onchange="setPageSize(this.value)">${sizes.map(n=>`<option value="${n}" ${n===_pageSize?'selected':''}>${n}</option>`).join('')}</select></label>`;
      pt.innerHTML = `<div class="pager-top-inner">${navHtml}${sizeSelTop}</div>`;
      pt.style.display = 'flex';
    } else {
      pt.innerHTML = '';
      pt.style.display = 'none';
    }
  }
}

function th2(k,l){const i=k===sk?(sa?'▲':'▼'):'↕';return`<th onclick="sort('${k}')" class="${k===sk?'srt':''}">${l} <span style="font-size:9px;opacity:.6">${i}</span></th>`}
function shortText(v,max=15){
  const s = String(v || '');
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

function itemTags(item){
  return String(item?.tags || '').split(/[;,]/).map(t=>t.trim()).filter(Boolean);
}

let bulkSelected = new Set();

function getSelectedItems(){
  return items.filter(x => bulkSelected.has(String(x.id)));
}

function renderBulkBar(){
  bulkSelected = new Set([...bulkSelected].filter(id => items.some(x => String(x.id) === String(id))));
  const bar = document.getElementById('bulkBar');
  if(!bar) return;
  const n = bulkSelected.size;
  bar.style.display = n ? 'flex' : 'none';
  document.getElementById('bulkCount').textContent = `${n} seleccionado${n!==1?'s':''}`;
}

function toggleBulkSelect(id, checked){
  if(checked) bulkSelected.add(String(id));
  else bulkSelected.delete(String(id));
  renderInv();
}

function toggleBulkPage(checked){
  getInvPage(getFiltered()).items.forEach(x => checked ? bulkSelected.add(String(x.id)) : bulkSelected.delete(String(x.id)));
  renderInv();
}

function clearBulkSelection(){
  bulkSelected.clear();
  renderInv();
}

function renderBulkActionControl(){
  const action = document.getElementById('bulkAction')?.value || '';
  const box = document.getElementById('bulkActionControl');
  if(!box) return;
  if(action === 'loc'){
    box.innerHTML = '<input id="bulkLoc" list="locList" placeholder="Nueva ubicacion">';
  } else if(action === 'cat'){
    box.innerHTML = `<select id="bulkCat">${sortedCatNames().map(c=>`<option value="${escHtml(c)}">${escHtml(c)}</option>`).join('')}</select>`;
  } else if(action === 'mod'){
    box.innerHTML = `<select id="bulkCiclo" onchange="renderBulkModOptions()">${CICLOS.map(c=>`<option value="${c.id}">${escHtml(c.name)}</option>`).join('')}</select><select id="bulkMod"></select>`;
    renderBulkModOptions();
  } else if(action === 'tipo'){
    box.innerHTML = '<select id="bulkTipo"><option value="consumible">Consumible</option><option value="inventariable">Inventariable</option></select>';
  } else if(action === 'tagsAdd' || action === 'tagsReplace'){
    box.innerHTML = '<input id="bulkTags" list="tagList" placeholder="tag1, tag2">';
  } else if(action === 'mant'){
    box.innerHTML = '<select id="bulkMant"><option value="1">Marcar mantenimiento</option><option value="">Quitar mantenimiento</option></select>';
  } else if(action === 'foto'){
    box.innerHTML = `<div style="display:flex;gap:8px;align-items:center">
      <input id="bulkFotoUrl" type="url" placeholder="URL de la imagen (Drive, etc.)" style="flex:1">
      <input id="bulkFotoFile" type="file" accept="image/*" style="flex:1" onchange="handleBulkPhotoUpload()">
    </div>
    <div id="bulkFotoPreview" style="margin-top:8px;padding:8px;border-radius:4px;background:var(--surface2);display:none">
      <img id="bulkFotoImg" style="max-width:100px;max-height:100px;border-radius:4px">
    </div>`;
  } else {
    box.innerHTML = '';
  }
}

function renderBulkModOptions(){
  const cid = document.getElementById('bulkCiclo')?.value;
  const modSel = document.getElementById('bulkMod');
  const ciclo = CICLOS.find(c=>c.id===cid);
  if(!modSel || !ciclo) return;
  modSel.innerHTML = ciclo.modulos.map(m=>`<option value="${ciclo.id}__${m.cod}">${escHtml(m.cod)} - ${escHtml(m.name)}</option>`).join('');
}

function mergeTags(current, incoming, replace=false){
  const next = String(incoming || '').split(',').map(cleanTag).filter(Boolean);
  if(replace) return next.join(', ');
  const all = [...itemTags({tags:current}), ...next];
  return [...new Map(all.map(t=>[t.toLowerCase(), t])).values()].join(', ');
}

function handleBulkPhotoUpload(){
  const file = document.getElementById('bulkFotoFile')?.files?.[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const dataUrl = e.target.result;
    document.getElementById('bulkFotoUrl').value = dataUrl;
    const preview = document.getElementById('bulkFotoPreview');
    const img = document.getElementById('bulkFotoImg');
    if(preview && img){
      img.src = dataUrl;
      preview.style.display = 'block';
    }
  };
  reader.readAsDataURL(file);
}

async function applyBulkAction(){
  if(!requirePerm('items.write')) return;
  const selected = getSelectedItems();
  if(!selected.length) return;
  const action = document.getElementById('bulkAction').value;
  let patch = null;
  if(action === 'loc') patch = { loc: document.getElementById('bulkLoc').value.trim() };
  else if(action === 'cat') patch = { cat: document.getElementById('bulkCat').value };
  else if(action === 'mod') patch = { mod: document.getElementById('bulkMod').value };
  else if(action === 'tipo') patch = { tipo_material: document.getElementById('bulkTipo').value };
  else if(action === 'mant') patch = { mant: document.getElementById('bulkMant').value, mantEstado: document.getElementById('bulkMant').value ? 'Pendiente' : '' };
  else if(action === 'foto') {
    const url = document.getElementById('bulkFotoUrl').value.trim();
    if(!url){ toast('Indica una URL o carga una imagen','err'); return; }
    patch = { foto: url };
  }
  else if(action === 'tagsAdd' || action === 'tagsReplace') {
    const tags = document.getElementById('bulkTags').value;
    if(!tags.trim()){ toast('Indica tags para aplicar','err'); return; }
    patch = { _tags: tags, _replaceTags: action === 'tagsReplace' };
  }
  if(!patch){ toast('Selecciona una accion en lote','err'); return; }
  if(!confirm(`Aplicar cambio a ${selected.length} item${selected.length!==1?'s':''}?`)) return;
  let ok = 0;
  for(const it of selected){
    const updated = {...it, ...patch};
    if('_tags' in patch){
      updated.tags = mergeTags(it.tags, patch._tags, patch._replaceTags);
      delete updated._tags; delete updated._replaceTags;
    }
    try{
      const res = await apiPost({action:'update', item:updated});
      if(!res.ok) throw new Error(res.error);
      const idx = items.findIndex(x=>String(x.id)===String(it.id));
      if(idx >= 0) items[idx] = updated;
      ok++;
    }catch(e){ console.warn('[bulk] update failed', it.id, e); }
  }
  fillTagSuggestions();
  bulkSelected.clear();
  toast(`${ok} item${ok!==1?'s':''} actualizado${ok!==1?'s':''}`,'ok');
  if(cf) openSub(); else renderHome();
}

function bulkExportSelected(){
  const selected = getSelectedItems();
  if(!selected.length) return;
  const stamp = new Date().toISOString().slice(0,19).replace(/[:T]/g,'-');
  downloadText(`inventario-seleccion-${stamp}.csv`, 'text/csv;charset=utf-8', inventoryCsvRows(selected));
  toast('Seleccion exportada','ok');
}

function bulkPrintSelected(){
  const selected = getSelectedItems();
  if(!selected.length) return;
  const sel = _getPrintCols();
  const cols = PRINT_COLS.filter(c=>sel[c.key]);
  if(!cols.length){ toast('Selecciona columnas en Imprimir','err'); return; }
  const total = selected.length;
  const uds = selected.reduce((s,x)=>s+(Number(x.qty)||0),0);
  const fecha = new Date().toLocaleDateString('es-ES',{day:'2-digit',month:'long',year:'numeric'});
  const thead = cols.map(c=>`<th>${c.label}</th>`).join('');
  const tbody = selected.map(x=>{
    const low = isLowStock(x);
    const mant = needsMaintenance(x);
    const cat = CATS[x.cat]||CATS['Otros']||{c:'#6b7280',bg:'#f9fafb',i:'🔧'};
    const ec = ESTC[x.est]||'#6b7280';
    const mantInfo = [x.mantEstado,x.mantFecha,x.mantResp].filter(Boolean).join(' · ');
    return '<tr>'+cols.map(c=>{
      if(c.key==='foto')  return `<td>${x.foto?`<img style="width:36px;height:36px;object-fit:cover;border-radius:4px" src="${x.foto}" alt="">`:''}</td>`;
      if(c.key==='ref')   return `<td><span style="font-family:monospace;font-size:11px;background:#f3f4f6;padding:1px 5px;border-radius:4px">${x.ref||'—'}</span></td>`;
      if(c.key==='item')  return `<td style="font-weight:600">${x.item}</td>`;
      if(c.key==='aula')  return `<td>${AULAS.find(a=>a.id===x.aula)?.name||x.aula||'—'}</td>`;
      if(c.key==='mod')   { const m=findModulo(x.mod); return `<td style="font-size:11px">${m?m.cod+' '+m.name:x.mod||'—'}</td>`; }
      if(c.key==='qty')   return `<td style="text-align:center;font-weight:700;color:${low?'#dc2626':'#15803d'}">${x.qty}${low?' ⚠':''}</td>`;
      if(c.key==='min')   return `<td style="text-align:center">${x.min||'—'}</td>`;
      if(c.key==='cat')   return `<td>${x.cat?`<span style="background:${cat.bg};color:${cat.c};padding:1px 6px;border-radius:10px;font-size:11px">${cat.i} ${x.cat}</span>`:'—'}</td>`;
      if(c.key==='loc')   return `<td>${x.loc||'—'}</td>`;
      if(c.key==='est')   return `<td><span style="display:inline-flex;align-items:center;gap:4px"><span style="width:8px;height:8px;border-radius:50%;background:${ec};display:inline-block"></span>${x.est}</span></td>`;
      if(c.key==='util')  return `<td style="font-size:11px">${x.util||'—'}</td>`;
      if(c.key==='proveedor') return `<td style="font-size:11px">${x.proveedor||'—'}</td>`;
      if(c.key==='tags')  return `<td style="font-size:11px">${x.tags||'—'}</td>`;
      if(c.key==='mant')  return `<td style="font-size:11px">${mant?`🛠️ ${mantInfo||'Pendiente'}`:'—'}</td>`;
      if(c.key==='obs')   return `<td style="font-size:11px">${x.obs||'—'}</td>`;
      return '<td>—</td>';
    }).join('')+'</tr>';
  }).join('');

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
  <title>Inventario seleccion</title>
  <style>
    @page{size:A4 landscape;margin:10mm}
    *{box-sizing:border-box}
    body{font-family:Arial,sans-serif;font-size:12px;color:#111;margin:0}
    .head{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #2563eb;padding-bottom:6px;margin-bottom:10px}
    .head h1{font-size:18px;margin:0;color:#1e40af}
    .head p{font-size:11px;color:#555;margin:0;text-align:right}
    table{width:100%;border-collapse:collapse}
    th{background:#2563eb;color:#fff;padding:6px 8px;text-align:left;font-size:11px;white-space:nowrap}
    td{padding:5px 8px;border-bottom:1px solid #e5e7eb;vertical-align:middle}
    tr:nth-child(even) td{background:#f9fafb}
  </style></head><body>
  <div class="head">
    <h1>Seleccion de inventario</h1>
    <p>IES El Bosco - Inventario Departamento<br>${total} tipos · ${uds} unidades · ${fecha}</p>
  </div>
  <table><thead><tr>${thead}</tr></thead><tbody>${tbody}</tbody></table>
  <script>window.onload=()=>setTimeout(()=>print(),150);<\/script>
  </body></html>`;
  const w = window.open('','_blank');
  if(!w){ toast('El navegador bloqueo la ventana de impresion','err'); return; }
  w.document.write(html);
  w.document.close();
}

async function toggleOcultoItem(id){
  if(!can('visibility.manage')) return;
  const it = items.find(x=>Number(x.id)===Number(id));
  if(!it) return;
  const nuevo = it.oculto == 1 ? 0 : 1;
  try{
    const res = await apiPost({action:'toggleOculto', id, oculto:nuevo});
    if(!res.ok) throw new Error(res.error);
    it.oculto = nuevo;
    toast(nuevo ? 'Ítem oculto para el resto' : 'Ítem visible para todos','ok');
    renderInv();
  }catch(e){ toast('No se pudo cambiar la visibilidad','err'); }
}

function ocultoBtnHtml(x){
  if(!can('visibility.manage')) return '';
  const oc = x.oculto == 1;
  return `<button class="btn btn-sm" onclick="event.stopPropagation();toggleOcultoItem(${x.id})" title="${oc?'Oculto al resto — clic para mostrar':'Visible — clic para ocultar al resto'}">${oc?'🙈':'👁️'}</button>`;
}

function itemActiveLoans(id){
  return (prestamos || []).filter(p => String(p.itemId)===String(id) && (p.estado==='Activo' || p.estado==='Parcial'));
}

function quickItemHtml(item){
  const aula = AULAS.find(a=>a.id===item.aula)?.name || item.aula || '—';
  const active = itemActiveLoans(item.id);
  const tags = itemTags(item);
  return `<div class="quick-item-card">
    <div class="quick-item-head">
      <div class="quick-item-photo">${item.foto?`<img src="${item.foto}" alt="">`:'📷'}</div>
      <div class="quick-item-title">
        <strong>${escHtml(item.item || '')}</strong>
        <span>${escHtml(item.ref || itemCode(item) || '')}</span>
      </div>
    </div>
    <div class="quick-item-grid">
      <div><span>Stock</span><strong>${item.qty ?? '—'} / mín. ${item.min ?? '—'}</strong></div>
      <div><span>Aula</span><strong>${escHtml(aula)}</strong></div>
      <div><span>Ubicación</span><strong>${escHtml(item.loc || '—')}</strong></div>
      <div><span>Estado</span><strong>${escHtml(item.est || '—')}</strong></div>
      <div><span>Utilidad</span><strong>${escHtml(item.util || '—')}</strong></div>
      <div><span>Proveedor</span><strong>${escHtml(item.proveedor || '—')}</strong></div>
    </div>
    ${tags.length?`<div class="quick-tags">${tags.slice(0,6).map(t=>`<span>${escHtml(t)}</span>`).join('')}</div>`:''}
    <div class="quick-loans">${active.length ? `${active.length} préstamo${active.length!==1?'s':''} activo${active.length!==1?'s':''}` : 'Sin préstamos activos'}</div>
  </div>`;
}

function showQuickItem(id, ev){
  const item = items.find(x=>Number(x.id)===Number(id));
  if(!item) return;
  let box = document.getElementById('quickItemPreview');
  if(!box){
    box = document.createElement('div');
    box.id = 'quickItemPreview';
    document.body.appendChild(box);
  }
  box.innerHTML = quickItemHtml(item);
  box.classList.add('show');
  moveQuickItem(ev);
}

function moveQuickItem(ev){
  const box = document.getElementById('quickItemPreview');
  if(!box || !box.classList.contains('show')) return;
  const x = Math.min((ev?.clientX || 20) + 18, window.innerWidth - 440);
  const y = Math.min((ev?.clientY || 20) + 18, window.innerHeight - 340);
  box.style.left = Math.max(12, x) + 'px';
  box.style.top = Math.max(12, y) + 'px';
}

function hideQuickItem(){
  document.getElementById('quickItemPreview')?.classList.remove('show');
}

function rTable(data,mc){
  mc.innerHTML=`<div class="tw"><div class="tw-scroll"><table>
    <thead><tr><th><input type="checkbox" onchange="toggleBulkPage(this.checked)" title="Seleccionar pagina"></th><th>Foto</th>${th2('ref','Ref.')}${th2('aula','Aula')}${th2('item','Ítem')}${th2('qty','Cant.')}<th>Mín.</th>${th2('cat','Categoría')}${th2('loc','Ubicación')}${th2('est','Estado')}${th2('util','Utilidad')}<th>Acciones</th></tr></thead>
    <tbody>${data.map(x=>{
      const low=isLowStock(x),mant=needsMaintenance(x),mantInfo=[x.mantEstado,x.mantFecha,x.mantResp].filter(Boolean).join(' · '),cat=CATS[x.cat]||CATS['Otros']||{c:'#6b7280',bg:'#f9fafb',i:'🔧'},ec=ESTC[x.est]||'#6b7280',tipo=materialType(x);
      const esContenedor = x.es_contenedor == 1;
      const parentItem = x.parent_id ? items.find(p=>Number(p.id)===Number(x.parent_id)) : null;
      const numHijos = esContenedor ? items.filter(h=>Number(h.parent_id)===Number(x.id)).length : 0;
      const tags = itemTags(x);
      const utilTitle = [mantInfo, x.util, x.proveedor, x.tags].filter(Boolean).join(' · ');
      const utilVisible = mant ? `🛠️ ${shortText(mantInfo || x.util || x.proveedor, 12)}` : (shortText(x.util || x.proveedor, 15) || '—');
      const selected = bulkSelected.has(String(x.id));
      return`<tr class="${selected?'bulk-row-selected':''}${x.oculto==1?' item-oculto':''}"${parentItem?' style="background:var(--bg2,#f9fafb)"':''}>
        <td><input class="bulk-check" type="checkbox" ${selected?'checked':''} onclick="event.stopPropagation()" onchange="toggleBulkSelect(${x.id},this.checked)" title="Seleccionar"></td>
        <td>${x.foto?`<img class="table-photo quick-item-trigger" src="${x.foto}" alt="" onclick="showQuickItem(${x.id},event)" onmouseenter="showQuickItem(${x.id},event)" onmousemove="moveQuickItem(event)" onmouseleave="hideQuickItem()">`:`<span class="table-photo table-photo-empty quick-item-trigger" onclick="showQuickItem(${x.id},event)" onmouseenter="showQuickItem(${x.id},event)" onmousemove="moveQuickItem(event)" onmouseleave="hideQuickItem()">📷</span>`}</td>
        <td><span class="rbadge">${x.ref||'—'}</span></td>
        <td style="font-size:12px;color:var(--muted)">${AULAS.find(a=>a.id===x.aula)?.name||x.aula}</td>
        <td style="max-width:220px;font-weight:600" title="${x.item}">
          <div class="item-title-line">
            ${parentItem?'<span style="color:var(--muted);margin-right:4px">↳</span>':''}
            <span class="item-title-text item-title-link" onclick="openModal(${x.id})" onmouseenter="showQuickItem(${x.id},event)" onmousemove="moveQuickItem(event)" onmouseleave="hideQuickItem()">${x.item}</span>
            ${esContenedor?`<span title="Ver componentes" onclick="goCaja(${x.id})" style="cursor:pointer;font-size:10px;background:#eff6ff;color:#2563eb;border-radius:4px;padding:1px 5px;margin-left:4px">📦 ${numHijos}</span>`:''}
            ${parentItem?`<span style="font-size:10px;background:#f0fdf4;color:#15803d;border-radius:4px;padding:1px 5px;margin-left:4px" title="En caja: ${parentItem.item}">📦 ${parentItem.ref||parentItem.item}</span>`:''}
            <button type="button" class="qr-name-btn" onclick="event.stopPropagation();openItemQr(${x.id})" title="Ver QR" aria-label="Ver QR"><img class="qr-name-icon" src="icons/qr-code.svg" alt=""></button>
          </div>
        </td>
        <td><span class="qval ${low?'qlow':'qok'}">${x.qty}${low?' ⚠':''}</span></td>
        <td style="color:var(--muted);font-family:var(--mono);font-size:12px">${x.min}</td>
        <td>${x.cat?`<span class="cpill" style="background:${cat.bg};color:${cat.c}">${cat.i} ${x.cat}</span>`:'—'}<br><span class="cpill" style="background:${tipo==='inventariable'?'#f5f3ff':'#ecfdf5'};color:${tipo==='inventariable'?'#7c3aed':'#059669'};font-size:10px">${tipo==='inventariable'?'Inventariable':'Consumible'}</span>${tags.length?`<br><span class="tag-mini">${escHtml(tags.slice(0,3).join(', '))}</span>`:''}</td>
        <td style="color:var(--muted);font-size:12px" title="${x.loc||''}">${x.loc?(x.loc.length>10?x.loc.slice(0,10)+'…':x.loc):'—'}</td>
        <td>${x.est?`<span class="edot"><span class="dot" style="background:${ec}"></span>${x.est}</span>`:'—'}</td>
        <td style="color:var(--muted);font-size:12px" title="${utilTitle}"><span class="table-util-text">${utilVisible}</span></td>
        <td><div style="display:flex;gap:6px;position:relative">
          <button class="btn btn-sm" onclick="openModal(${x.id})" title="Editar">✏️</button>
          ${esContenedor
            ? `<button class="btn btn-sm btn-loan" onclick="openPrestarCaja(${x.id})" title="Prestar caja completa" style="font-size:16px;line-height:1">📦⌛</button>`
            : `<button class="btn btn-sm btn-loan" onclick="openPresDevModal(${x.id})" title="Prestar / Devolver" style="font-size:16px;line-height:1">⌛</button>`
          }
          <button class="btn btn-sm btn-d" onclick="openDelModal(${x.id})" title="Baja / Eliminar">🗑️</button>
          <div style="position:relative">
            <button class="btn btn-sm" onclick="toggleActionMenu(event,${x.id})" title="Más acciones">⋯</button>
            <div id="am-${x.id}" class="action-menu" style="display:none;position:absolute;right:0;top:100%;background:white;border:1px solid #ddd;border-radius:6px;box-shadow:0 2px 8px rgba(0,0,0,0.12);z-index:1000;min-width:180px">
              <button class="action-menu-item" onclick="event.stopPropagation();duplicateItem(${x.id});document.getElementById('am-${x.id}').style.display='none'" title="Duplicar">⧉ Duplicar</button>
              <button class="action-menu-item" onclick="event.stopPropagation();openDocsModal(${x.id});document.getElementById('am-${x.id}').style.display='none'" title="Documentación">📌 Documentación</button>
              <button class="action-menu-item${isPedido(x.id)?' activo':''}" onclick="event.stopPropagation();togglePedido(${x.id});document.getElementById('am-${x.id}').style.display='none'" title="Pedido">🛒 Pedido</button>
              ${ocultoBtnHtml(x).replace(/class="btn btn-sm"/g,'class="action-menu-item"').replace(/onclick="/g,'onclick="event.stopPropagation();').replace(/">/g,';document.getElementById("am-${x.id}").style.display="none">">')}
            </div>
          </div>
        </div></td>
      </tr>`;
    }).join('')}</tbody>
  </table></div></div>`;
}

function rCards(data,mc){
  mc.innerHTML=`<div class="cgrid">${data.map(x=>{
    const low=isLowStock(x),mant=needsMaintenance(x),mantStatus=x.mantEstado||'Pendiente',cat=CATS[x.cat]||CATS['Otros']||{c:'#6b7280',bg:'#f9fafb',i:'🔧'},ec=ESTC[x.est]||'#6b7280',mod=findModulo(x.mod),tipo=materialType(x),tags=itemTags(x);
    const esContenedor2 = x.es_contenedor == 1;
    const parentItem2 = x.parent_id ? items.find(p=>Number(p.id)===Number(x.parent_id)) : null;
    const numHijos2 = esContenedor2 ? items.filter(h=>Number(h.parent_id)===Number(x.id)).length : 0;
    const selected = bulkSelected.has(String(x.id));
    return`<div class="icard${low?' low':''}${parentItem2?' child-item':''}${selected?' bulk-card-selected':''}${x.oculto==1?' item-oculto':''}">
      <label class="bulk-card-check" onclick="event.stopPropagation()" title="Seleccionar">
        <input type="checkbox" ${selected?'checked':''} onchange="toggleBulkSelect(${x.id},this.checked)">
      </label>
      ${x.foto?`<img class="card-photo quick-item-trigger" src="${x.foto}" alt="Foto de ${x.item}" onclick="showQuickItem(${x.id},event)" onmouseenter="showQuickItem(${x.id},event)" onmousemove="moveQuickItem(event)" onmouseleave="hideQuickItem()">`:''}
      <div class="ch">
        <div class="card-title-wrap">
          <div class="item-title-line">
            <div class="cname item-title-link" onclick="openModal(${x.id})" onmouseenter="showQuickItem(${x.id},event)" onmousemove="moveQuickItem(event)" onmouseleave="hideQuickItem()">${parentItem2?'↳ ':''}${x.item}</div>
            ${esContenedor2?`<span title="Ver componentes" onclick="goCaja(${x.id})" style="cursor:pointer;font-size:10px;background:#eff6ff;color:#2563eb;border-radius:4px;padding:1px 5px">📦 ${numHijos2}</span>`:''}
            <button type="button" class="qr-name-btn" onclick="openItemQr(${x.id})" title="Ver QR" aria-label="Ver QR"><img class="qr-name-icon" src="icons/qr-code.svg" alt=""></button>
          </div>
          <div class="cref">${x.ref||''}${parentItem2?` · <span style="color:#15803d;font-size:10px">📦 ${parentItem2.ref||parentItem2.item}</span>`:''}</div>
        </div>
        <div class="cqbox"><div class="cqbig" style="color:${low?'var(--red)':'var(--green)'}">${x.qty}</div><div class="cqmin">mín. ${x.min}</div></div>
      </div>
      <div class="cpills">
        ${x.cat?`<span class="cpill" style="background:${cat.bg};color:${cat.c};font-size:11px">${cat.i} ${x.cat}</span>`:''}
        <span class="cpill" style="background:${tipo==='inventariable'?'#f5f3ff':'#ecfdf5'};color:${tipo==='inventariable'?'#7c3aed':'#059669'};font-size:11px">${tipo==='inventariable'?'Inventariable':'Consumible'}</span>
        ${x.est?`<span class="edot" style="font-size:12px"><span class="dot" style="background:${ec}"></span>${x.est}</span>`:''}
        ${mant?`<span class="cpill maintenance-pill">🛠️ ${mantStatus}</span>`:''}
        ${mod?`<span class="cpill" style="background:#eff6ff;color:#1d4ed8;font-size:11px">${mod.ciclo.icon||'📚'} ${mod.name}</span>`:''}
        ${tags.slice(0,4).map(t=>`<span class="tag-pill">${escHtml(t)}</span>`).join('')}
      </div>
      <div class="cfg">
        <div><div class="cfl">Aula</div><div class="cfv">${AULAS.find(a=>a.id===x.aula)?.name||x.aula}</div></div>
        <div><div class="cfl">Ubicación</div><div class="cfv">${x.loc||'—'}</div></div>
        <div><div class="cfl">Utilidad</div><div class="cfv" style="font-size:11px" title="${x.util||''}">${shortText(x.util)||'—'}</div></div>
        <div><div class="cfl">Proveedor</div><div class="cfv" style="font-size:11px" title="${x.proveedor||''}">${shortText(x.proveedor)||'—'}</div></div>
        <div><div class="cfl">Tags</div><div class="cfv" style="font-size:11px" title="${x.tags||''}">${shortText(x.tags)||'—'}</div></div>
        <div><div class="cfl">Revisión</div><div class="cfv" style="font-family:var(--mono);font-size:11px">${x.fecha||'—'}</div></div>
      </div>
      ${mant?`<div class="maint-note">
        <strong>${mantStatus}</strong>${x.mantFecha?` · ${x.mantFecha}`:''}${x.mantResp?` · ${x.mantResp}`:''}
        ${x.mantNota?`<br>${x.mantNota}`:''}
      </div>`:''}
      ${x.obs?`<div class="cobs">💬 ${x.obs}</div>`:''}
      <div class="cfoot" style="position:relative">
        <button class="btn btn-sm" onclick="openModal(${x.id})" title="Editar">✏️</button>
        ${esContenedor2
          ? `<button class="btn btn-sm btn-loan" onclick="openPrestarCaja(${x.id})" title="Prestar caja completa" style="font-size:16px;line-height:1">📦⌛</button>`
          : `<button class="btn btn-sm btn-loan" onclick="openPresDevModal(${x.id})" title="Prestar / Devolver" style="font-size:16px;line-height:1">⌛</button>`
        }
        <button class="btn btn-sm btn-d" onclick="openDelModal(${x.id})" title="Baja / Eliminar">🗑️</button>
        <div style="position:relative">
          <button class="btn btn-sm" onclick="toggleActionMenu(event,${x.id})" title="Más acciones">⋯</button>
          <div id="am-${x.id}" class="action-menu" style="display:none;position:absolute;right:0;top:100%;background:white;border:1px solid #ddd;border-radius:6px;box-shadow:0 2px 8px rgba(0,0,0,0.12);z-index:1000;min-width:180px">
            <button class="action-menu-item" onclick="event.stopPropagation();duplicateItem(${x.id});document.getElementById('am-${x.id}').style.display='none'" title="Duplicar">⧉ Duplicar</button>
            <button class="action-menu-item" onclick="event.stopPropagation();openDocsModal(${x.id});document.getElementById('am-${x.id}').style.display='none'" title="Documentación">📌 Documentación</button>
            <button class="action-menu-item${isPedido(x.id)?' activo':''}" onclick="event.stopPropagation();togglePedido(${x.id});document.getElementById('am-${x.id}').style.display='none'" title="Pedido">🛒 Pedido</button>
            ${ocultoBtnHtml(x).replace(/class="btn btn-sm"/g,'class="action-menu-item"').replace(/onclick="/g,'onclick="event.stopPropagation();').replace(/">/g,';document.getElementById("am-${x.id}").style.display="none">">')}
          </div>
        </div>
      </div>
    </div>`;
  }).join('')}</div>`;
}

function rList(data,mc){
  mc.innerHTML=`<div class="list-view">${data.map(x=>{
    const low=isLowStock(x),mant=needsMaintenance(x),cat=CATS[x.cat]||CATS['Otros']||{c:'#6b7280',bg:'#f9fafb',i:'🔧'},ec=ESTC[x.est]||'#6b7280',tipo=materialType(x),tags=itemTags(x);
    const esContenedor = x.es_contenedor == 1;
    const parentItem = x.parent_id ? items.find(p=>Number(p.id)===Number(x.parent_id)) : null;
    const numHijos = esContenedor ? items.filter(h=>Number(h.parent_id)===Number(x.id)).length : 0;
    const selected = bulkSelected.has(String(x.id));
    return`<div class="list-row${low?' low':''}${selected?' bulk-list-selected':''}${x.oculto==1?' item-oculto':''}">
      <label class="list-check" onclick="event.stopPropagation()">
        <input type="checkbox" ${selected?'checked':''} onchange="toggleBulkSelect(${x.id},this.checked)">
      </label>
      ${x.foto?`<img class="list-photo quick-item-trigger" src="${x.foto}" alt="" onclick="showQuickItem(${x.id},event)" style="cursor:pointer">`:
        `<div class="list-photo-empty quick-item-trigger" onclick="showQuickItem(${x.id},event)" style="cursor:pointer">📷</div>`}
      <div class="list-info">
        <div class="list-name item-title-link" onclick="openModal(${x.id})">${parentItem?'↳ ':''}${x.item}${esContenedor?` 📦${numHijos}`:''}</div>
        <div class="list-meta">${x.ref?`<span class="list-badge">${x.ref}</span>`:''}${x.cat?` <span class="list-cat">${cat.i} ${x.cat}</span>`:''}${x.est?` <span class="list-status" style="color:${ec}">●</span>`:''}</div>
      </div>
      <div class="list-footer">
        <div class="list-qty ${low?'low':''}">
          <div class="list-qty-num">${x.qty}</div>
          <div class="list-qty-min">mín.${x.min}</div>
        </div>
        <div class="list-actions">
          <button class="list-action-btn" onclick="openModal(${x.id})" title="Editar">✏️</button>
          <button class="list-action-btn" onclick="openPresDevModal(${x.id})" title="Prestar">⌛</button>
          <button class="list-action-btn${isPedido(x.id)?' list-active':''}" onclick="togglePedido(${x.id})" title="Pedido">🛒</button>
          ${can('visibility.manage')?`<button class="list-action-btn" onclick="event.stopPropagation();toggleOcultoItem(${x.id})" title="${x.oculto==1?'Oculto al resto':'Ocultar al resto'}">${x.oculto==1?'🙈':'👁️'}</button>`:''}
          <button class="list-action-btn list-delete" onclick="openDelModal(${x.id})" title="Eliminar">🗑️</button>
        </div>
      </div>
    </div>`;
  }).join('')}</div>`;
}

window.addEventListener('resize',()=>{
  if(!document.getElementById('pS')?.classList.contains('active')) return;
  const nextMode = getInvRenderMode();
  if(nextMode !== _lastInvRenderMode) renderInv();
  else setTwHeight();
});
function sort(k){if(sk===k)sa=!sa;else{sk=k;sa=true}renderInv()}
function goInvPage(page){_invPage=page;renderInv();document.querySelector('#pS .srow')?.scrollIntoView({block:'start'})}
function setPageSize(v){_pageSize=Number(v)||25;_pageSizeUserSet=true;_invPage=1;renderInv()}

let _delItemId = null;
function openDelModal(itemId){
  if(!can('items.write') && !can('items.delete')){ requirePerm('items.write'); return; }
  const step1 = document.getElementById('delPickerStep1');
  const step2 = document.getElementById('delPickerStep2');
  const delBtn = document.getElementById('delBtnDelete');
  if(delBtn) delBtn.style.display = can('items.delete') ? '' : 'none';
  if(itemId !== undefined && itemId !== null){
    const item = items.find(x=>Number(x.id)===Number(itemId));
    if(!item) return;
    _delItemId = itemId;
    document.getElementById('delPickerName').textContent = item.item;
    document.getElementById('delBtnBaja').style.display = item.est !== 'Baja' && can('items.write') ? '' : 'none';
    step1.style.display = 'none';
    step2.style.display = 'flex';
  } else {
    _delItemId = null;
    document.getElementById('delPickerName').textContent = 'Baja / Eliminar';
    document.getElementById('delPickerSearch').value = '';
    step1.style.display = '';
    step2.style.display = 'none';
    delPickerFilter();
  }
  document.getElementById('mDelPicker').classList.add('open');
}
function closeDelModal(){
  document.getElementById('mDelPicker').classList.remove('open');
}
function delPickerFilter(){
  const q = document.getElementById('delPickerSearch').value.toLowerCase();
  const src = (cf ? getBase() : items).filter(x=>
    !q || x.item.toLowerCase().includes(q) || (x.ref||'').toLowerCase().includes(q)
  ).sort((a,b)=>String(a.item||'').localeCompare(String(b.item||'')));
  const list = document.getElementById('delPickerList');
  if(!src.length){
    list.innerHTML='<div style="color:var(--muted);font-size:13px;text-align:center;padding:12px">Sin resultados</div>';
    return;
  }
  list.innerHTML=src.slice(0,25).map(x=>`
    <button class="btn" style="width:100%;justify-content:space-between;text-align:left;padding:9px 12px;font-size:13px" onclick="delPickerSelect(${x.id})">
      <span>${x.item}</span>
      <span style="font-size:11px;color:var(--muted)">${x.ref||''}</span>
    </button>`).join('');
}
function delPickerSelect(itemId){
  const item = items.find(x=>Number(x.id)===Number(itemId));
  if(!item) return;
  _delItemId = itemId;
  document.getElementById('delPickerName').textContent = item.item;
  document.getElementById('delBtnBaja').style.display = item.est !== 'Baja' && can('items.write') ? '' : 'none';
  document.getElementById('delPickerStep1').style.display = 'none';
  document.getElementById('delPickerStep2').style.display = 'flex';
}

// ═════════════════════════════════════════════════════════
// EXPORT
// ═════════════════════════════════════════════════════════
function exportCSV(){
  const data=getFiltered();
  const h='Referencia,Aula,Módulo,Ítem,Cantidad,Mínimo,Tipo material,Categoría,Tags,Ubicación,Estado,Mantenimiento,Fecha aviso mant.,Estado mant.,Responsable mant.,Nota mant.,Utilidad,Proveedor,Revisión,Observaciones';
  const rows=data.map(x=>{
    const m = findModulo(x.mod);
    return [x.ref,AULAS.find(a=>a.id===x.aula)?.name||x.aula,m?`${m.cod} ${m.name}`:'',x.item,x.qty,x.min,materialType(x),x.cat,x.tags,x.loc,x.est,needsMaintenance(x)?'Sí':'',x.mantFecha,x.mantEstado,x.mantResp,x.mantNota,x.util,x.proveedor,x.fecha,x.obs].map(v=>`"${String(v||'').replace(/"/g,'""')}"`).join(',');
  });
  const a=document.createElement('a');a.href='data:text/csv;charset=utf-8,﻿'+encodeURIComponent([h,...rows].join('\n'));a.download='inventario.csv';a.click();
  toast('CSV exportado','ok');
}

// ═════════════════════════════════════════════════════════
// IMPRIMIR
// ═════════════════════════════════════════════════════════
function openExportModal(){
  if(!requirePerm('import.write')) return;
  const filtered = cf ? getFiltered().length : items.length;
  document.getElementById('expFilteredCount').textContent = `${filtered} ítem${filtered!==1?'s':''} de la vista actual.`;
  document.getElementById('expAllItemsCount').textContent = `${items.length} ítem${items.length!==1?'s':''} en total.`;
  document.getElementById('expBackupCount').textContent =
    `${items.length} ítems · ${AULAS.length} aulas · ${Object.keys(CATS).length} categorías · ${CICLOS.length} ciclos · ${prestamos.length} préstamos · ${profesores.length} profesores/as.`;
  document.getElementById('mExport').classList.add('open');
}

function closeExportModal(){
  document.getElementById('mExport')?.classList.remove('open');
}

function csvCell(v){
  return `"${String(v ?? '').replace(/"/g,'""')}"`;
}

function downloadText(filename, mime, text){
  const blob = new Blob([text], {type: mime});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href), 800);
}

function inventoryCsvRows(data){
  const h='Referencia,Aula,MÃ³dulo,Ãtem,Cantidad,MÃ­nimo,Tipo material,CategorÃ­a,Tags,UbicaciÃ³n,Estado,Mantenimiento,Fecha aviso mant.,Estado mant.,Responsable mant.,Nota mant.,Utilidad,Proveedor,RevisiÃ³n,Observaciones';
  const rows=data.map(x=>{
    const m = findModulo(x.mod);
    return [x.ref,AULAS.find(a=>a.id===x.aula)?.name||x.aula,m?`${m.cod} ${m.name}`:'',x.item,x.qty,x.min,materialType(x),x.cat,x.tags,x.loc,x.est,needsMaintenance(x)?'SÃ­':'',x.mantFecha,x.mantEstado,x.mantResp,x.mantNota,x.util,x.proveedor,x.fecha,x.obs].map(csvCell).join(',');
  });
  return '\uFEFF' + [h,...rows].join('\n');
}

function exportAllItemsCSV(){
  const data = items.slice().sort((a,b)=>String(a.item||'').localeCompare(String(b.item||'')));
  downloadText('inventario-completo.csv', 'text/csv;charset=utf-8', inventoryCsvRows(data));
  closeExportModal();
  toast('CSV completo exportado','ok');
}

function exportFullBackup(){
  if(!requirePerm('import.write')) return;
  const now = new Date();
  const backup = {
    meta: {
      app: 'Inventario Taller FP',
      exportedAt: now.toISOString(),
      exportedBy: SESSION ? {usuario: SESSION.usuario, nombre: SESSION.nombre, rol: SESSION.rol, email: SESSION.email} : null,
      counts: {
        items: items.length,
        aulas: AULAS.length,
        categorias: Object.keys(CATS).length,
        ubicaciones: UBICACIONES.length,
        ciclos: CICLOS.length,
        prestamos: prestamos.length,
        profesores: profesores.length
      }
    },
    inventario: items,
    aulas: AULAS,
    categorias: CATS,
    ubicaciones: UBICACIONES,
    ciclos: CICLOS,
    prestamos,
    profesores
  };
  const stamp = now.toISOString().slice(0,19).replace(/[:T]/g,'-');
  downloadText(`backup-inventario-${stamp}.json`, 'application/json;charset=utf-8', JSON.stringify(backup, null, 2));
  closeExportModal();
  toast('Backup completo exportado','ok');
}

// ═════════════════════════════════════════════════════════
// MODAL IMPRIMIR — selector de columnas
// ═════════════════════════════════════════════════════════
const PRINT_COLS = [
  { key:'foto',      label:'Foto',          default:false },
  { key:'ref',       label:'Referencia',    default:true  },
  { key:'item',      label:'Nombre',        default:true  },
  { key:'aula',      label:'Aula',          default:true  },
  { key:'mod',       label:'Módulo',        default:false },
  { key:'qty',       label:'Cantidad',      default:true  },
  { key:'min',       label:'Mínimo',        default:false },
  { key:'cat',       label:'Categoría',     default:true  },
  { key:'loc',       label:'Ubicación',     default:true  },
  { key:'est',       label:'Estado',        default:true  },
  { key:'util',      label:'Utilidad',      default:false },
  { key:'proveedor', label:'Proveedor',     default:false },
  { key:'tags',      label:'Tags',          default:false },
  { key:'mant',      label:'Mantenimiento', default:false },
  { key:'obs',       label:'Observaciones', default:false },
];
const PRINT_COLS_KEY = 'inv_print_cols';

function _getPrintCols(){
  try {
    const saved = JSON.parse(localStorage.getItem(PRINT_COLS_KEY));
    if(saved && typeof saved === 'object') return saved;
  } catch(e){}
  return Object.fromEntries(PRINT_COLS.map(c=>[c.key, c.default]));
}

function openPrintModal(){
  const sel = _getPrintCols();
  const grid = document.getElementById('printColGrid');
  grid.innerHTML = PRINT_COLS.map(c=>`
    <label class="print-col-item">
      <input type="checkbox" id="prcol_${c.key}" ${sel[c.key]?'checked':''}>
      <span>${c.label}</span>
    </label>`).join('');
  document.getElementById('mPrint').classList.add('open');
}

function closePrintModal(){
  document.getElementById('mPrint').classList.remove('open');
}

function printColSelectAll(){
  PRINT_COLS.forEach(c=>{ document.getElementById('prcol_'+c.key).checked = true; });
}
function printColSelectNone(){
  PRINT_COLS.forEach(c=>{ document.getElementById('prcol_'+c.key).checked = false; });
}

function printInv(){
  const sel = Object.fromEntries(PRINT_COLS.map(c=>[c.key, document.getElementById('prcol_'+c.key)?.checked ?? c.default]));
  localStorage.setItem(PRINT_COLS_KEY, JSON.stringify(sel));
  const cols = PRINT_COLS.filter(c=>sel[c.key]);
  if(!cols.length){ toast('Selecciona al menos una columna','err'); return; }
  closePrintModal();

  const titulo = cf?.label || 'Inventario';
  const data = getFiltered();
  const total = data.length;
  const uds = data.reduce((s,x)=>s+(Number(x.qty)||0),0);
  const fecha = new Date().toLocaleDateString('es-ES',{day:'2-digit',month:'long',year:'numeric'});

  const thead = cols.map(c=>`<th>${c.label}</th>`).join('');
  const tbody = data.map(x=>{
    const low = isLowStock(x);
    const mant = needsMaintenance(x);
    const cat = CATS[x.cat]||CATS['Otros']||{c:'#6b7280',bg:'#f9fafb',i:'🔧'};
    const ec = ESTC[x.est]||'#6b7280';
    const mantInfo = [x.mantEstado,x.mantFecha,x.mantResp].filter(Boolean).join(' · ');
    return '<tr>'+cols.map(c=>{
      if(c.key==='foto')  return `<td>${x.foto?`<img style="width:36px;height:36px;object-fit:cover;border-radius:4px" src="${x.foto}" alt="">`:''}</td>`;
      if(c.key==='ref')   return `<td><span style="font-family:monospace;font-size:11px;background:#f3f4f6;padding:1px 5px;border-radius:4px">${x.ref||'—'}</span></td>`;
      if(c.key==='item')  return `<td style="font-weight:600">${x.item}</td>`;
      if(c.key==='aula')  return `<td>${AULAS.find(a=>a.id===x.aula)?.name||x.aula||'—'}</td>`;
      if(c.key==='mod')   { const m=findModulo(x.mod); return `<td style="font-size:11px">${m?m.cod+' '+m.name:x.mod||'—'}</td>`; }
      if(c.key==='qty')   return `<td style="text-align:center;font-weight:700;color:${low?'#dc2626':'#15803d'}">${x.qty}${low?' ⚠':''}</td>`;
      if(c.key==='min')   return `<td style="text-align:center">${x.min||'—'}</td>`;
      if(c.key==='cat')   return `<td>${x.cat?`<span style="background:${cat.bg};color:${cat.c};padding:1px 6px;border-radius:10px;font-size:11px">${cat.i} ${x.cat}</span>`:'—'}</td>`;
      if(c.key==='loc')   return `<td>${x.loc||'—'}</td>`;
      if(c.key==='est')   return `<td><span style="display:inline-flex;align-items:center;gap:4px"><span style="width:8px;height:8px;border-radius:50%;background:${ec};display:inline-block"></span>${x.est}</span></td>`;
      if(c.key==='util')  return `<td style="font-size:11px">${x.util||'—'}</td>`;
      if(c.key==='proveedor') return `<td style="font-size:11px">${x.proveedor||'—'}</td>`;
      if(c.key==='tags')  return `<td style="font-size:11px">${x.tags||'—'}</td>`;
      if(c.key==='mant')  return `<td style="font-size:11px">${mant?`🛠️ ${mantInfo||'Pendiente'}`:'—'}</td>`;
      if(c.key==='obs')   return `<td style="font-size:11px">${x.obs||'—'}</td>`;
      return '<td>—</td>';
    }).join('')+'</tr>';
  }).join('');

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
  <title>Inventario ${titulo}</title>
  <style>
    @page{size:A4 landscape;margin:10mm}
    *{box-sizing:border-box}
    body{font-family:Arial,sans-serif;font-size:12px;color:#111;margin:0}
    .head{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #2563eb;padding-bottom:6px;margin-bottom:10px}
    .head h1{font-size:18px;margin:0;color:#1e40af}
    .head p{font-size:11px;color:#555;margin:0;text-align:right}
    table{width:100%;border-collapse:collapse}
    th{background:#2563eb;color:#fff;padding:6px 8px;text-align:left;font-size:11px;white-space:nowrap}
    td{padding:5px 8px;border-bottom:1px solid #e5e7eb;vertical-align:middle}
    tr:nth-child(even) td{background:#f9fafb}
    .footer{margin-top:8px;font-size:10px;color:#9ca3af;text-align:right}
  </style></head><body>
  <div class="head">
    <h1>${cf?.icon||'📦'} ${titulo}</h1>
    <p>IES El Bosco — Inventario Departamento<br>${total} tipos · ${uds} unidades · ${fecha}</p>
  </div>
  <table>
    <thead><tr>${thead}</tr></thead>
    <tbody>${tbody}</tbody>
  </table>
  <div class="footer">Inventario Taller FP · ${fecha}</div>
  <script>window.onload=()=>setTimeout(()=>print(),150);<\/script>
  </body></html>`;

  const w = window.open('','_blank');
  if(!w){ toast('El navegador bloqueó la ventana de impresión','err'); return; }
  w.document.write(html);
  w.document.close();
}

// ═════════════════════════════════════════════════════════
// TOAST
// ═════════════════════════════════════════════════════════
function toast(msg,type='ok'){
  const el=document.createElement('div');el.className=`toast ${type}`;
  el.innerHTML=`<span>${type==='ok'?'✅':'❌'}</span><span>${msg}</span>`;
  document.getElementById('toasts').appendChild(el);
  setTimeout(()=>{el.style.animation='ti .3s reverse forwards';setTimeout(()=>el.remove(),300)},3000);
}
