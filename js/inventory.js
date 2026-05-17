// ═════════════════════════════════════════════════════════
// SUBPAGE / INVENTARIO
// ═════════════════════════════════════════════════════════
function renderSubStats(data,low){
  const units=data.reduce((a,x)=>a+(Number(x.qty)||0),0);
  const mant=data.filter(needsMaintenance).length;
  document.getElementById('sStats').innerHTML=`
    <div class="scard"><div class="scard-icon">📋</div><div><div class="scard-num">${data.length}</div><div class="scard-lbl">tipos de ítem</div></div></div>
    <div class="scard"><div class="scard-icon">🔢</div><div><div class="scard-num">${units}</div><div class="scard-lbl">unidades</div></div></div>
    <div class="scard"><div class="scard-icon">⚠️</div><div><div class="scard-num" style="color:var(--red)">${low}</div><div class="scard-lbl">stock bajo</div></div></div>
    <div class="scard"><div class="scard-icon">🛠️</div><div><div class="scard-num" style="color:var(--amber)">${mant}</div><div class="scard-lbl">mantenimiento</div></div></div>
  `;
}

function getBase(){
  return items.filter(x=>{
    if(cf.type==='aula') return x.aula===cf.id;
    if(cf.type==='cat') return x.cat===cf.id;
    if(cf.type==='lowstock') return isLowStock(x);
    if(cf.type==='maintenance') return needsMaintenance(x);
    if(cf.type==='caja') return Number(x.parent_id)===Number(cf.id);
    return x.mod===cf.id;
  });
}

function getFiltered(){
  const q=document.getElementById('srch').value;
  const fc=document.getElementById('fCat').value;
  const fe=document.getElementById('fEst').value;
  return getBase().filter(x=>{
    if(fc&&x.cat!==fc)return false;
    if(fe&&x.est!==fe)return false;
    if(q&&!fuzzyMatch(q,[typeof itemCode === 'function' ? itemCode(x) : x.code,x.ref,x.item,x.loc,x.proveedor].join(' ')))return false;
    return true;
  }).sort((a,b)=>{
    let av=a[sk]??'',bv=b[sk]??'';
    if(sk==='qty'||sk==='min') return sa?Number(av)-Number(bv):Number(bv)-Number(av);
    return sa?String(av).localeCompare(String(bv)):String(bv).localeCompare(String(av));
  });
}

function renderInv(){
  const data=getFiltered();
  const low=data.filter(isLowStock).length;
  document.getElementById('iCount').textContent=`${data.length} ítem${data.length!==1?'s':''}`;
  document.getElementById('iLow').textContent=low>0?`⚠ ${low} con stock bajo`:'';
  const mc=document.getElementById('iContent');
  if(!data.length){mc.innerHTML=`<div class="empty"><div class="ei">🔍</div><div class="et">No hay ítems con estos filtros.</div></div>`;return}
  const mode = getInvRenderMode();
  _lastInvRenderMode = mode;
  const page = getInvPage(data);
  mode === 'table' ? rTable(page.items,mc) : rCards(page.items,mc);
  renderPager(mc,page);
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
  return (view==='table' && window.innerWidth > 900 && !isTouchLike()) ? 'table' : 'cards';
}

function getPageSig(data){
  return [
    cf?.type, cf?.id,
    document.getElementById('srch')?.value || '',
    document.getElementById('fCat')?.value || '',
    document.getElementById('fEst')?.value || '',
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
  const sizes = isTouchLike() ? [10,25,30,50] : [10,25,30,50];
  mc.insertAdjacentHTML('beforeend',`
    <div class="pager">
      <div class="pager-info">Mostrando ${page.start+1}-${page.end} de ${page.total}</div>
      <div class="pager-controls">
        <button class="btn btn-sm" onclick="goInvPage(${page.page-1})" ${page.page<=1?'disabled':''}>‹ Anterior</button>
        <span class="pager-page">Página ${page.page} / ${page.totalPages}</span>
        <button class="btn btn-sm" onclick="goInvPage(${page.page+1})" ${page.page>=page.totalPages?'disabled':''}>Siguiente ›</button>
        <label class="pager-size">
          <span>Ítems</span>
          <select onchange="setPageSize(this.value)">
            ${sizes.map(n=>`<option value="${n}" ${n===_pageSize?'selected':''}>${n}</option>`).join('')}
          </select>
        </label>
      </div>
    </div>
  `);
}

function th2(k,l){const i=k===sk?(sa?'▲':'▼'):'↕';return`<th onclick="sort('${k}')" class="${k===sk?'srt':''}">${l} <span style="font-size:9px;opacity:.6">${i}</span></th>`}
function shortText(v,max=15){
  const s = String(v || '');
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

function rTable(data,mc){
  mc.innerHTML=`<div class="tw"><div class="tw-scroll"><table>
    <thead><tr><th>Foto</th>${th2('ref','Ref.')}${th2('aula','Aula')}${th2('item','Ítem')}${th2('qty','Cant.')}<th>Mín.</th>${th2('cat','Categoría')}${th2('loc','Ubicación')}${th2('est','Estado')}${th2('util','Utilidad')}<th>Acciones</th></tr></thead>
    <tbody>${data.map(x=>{
      const low=isLowStock(x),mant=needsMaintenance(x),mantInfo=[x.mantEstado,x.mantFecha,x.mantResp].filter(Boolean).join(' · '),cat=CATS[x.cat]||CATS['Otros']||{c:'#6b7280',bg:'#f9fafb',i:'🔧'},ec=ESTC[x.est]||'#6b7280',tipo=materialType(x);
      const esContenedor = x.es_contenedor == 1;
      const parentItem = x.parent_id ? items.find(p=>Number(p.id)===Number(x.parent_id)) : null;
      const numHijos = esContenedor ? items.filter(h=>Number(h.parent_id)===Number(x.id)).length : 0;
      return`<tr${parentItem?' style="background:var(--bg2,#f9fafb)"':''}>
        <td>${x.foto?`<img class="table-photo" src="${x.foto}" alt="">`:'<span class="table-photo table-photo-empty">📷</span>'}</td>
        <td><span class="rbadge">${x.ref||'—'}</span></td>
        <td style="font-size:12px;color:var(--muted)">${AULAS.find(a=>a.id===x.aula)?.name||x.aula}</td>
        <td style="max-width:220px;font-weight:600" title="${x.item}">
          <div class="item-title-line">
            ${parentItem?'<span style="color:var(--muted);margin-right:4px">↳</span>':''}
            <span class="item-title-text">${x.item}</span>
            ${esContenedor?`<span title="Ver componentes" onclick="goCaja(${x.id})" style="cursor:pointer;font-size:10px;background:#eff6ff;color:#2563eb;border-radius:4px;padding:1px 5px;margin-left:4px">📦 ${numHijos}</span>`:''}
            ${parentItem?`<span style="font-size:10px;background:#f0fdf4;color:#15803d;border-radius:4px;padding:1px 5px;margin-left:4px" title="En caja: ${parentItem.item}">📦 ${parentItem.ref||parentItem.item}</span>`:''}
            <button type="button" class="qr-name-btn" onclick="openItemQr(${x.id})" title="Ver QR" aria-label="Ver QR"><img class="qr-name-icon" src="icons/qr-code.svg" alt=""></button>
          </div>
        </td>
        <td><span class="qval ${low?'qlow':'qok'}">${x.qty}${low?' ⚠':''}</span></td>
        <td style="color:var(--muted);font-family:var(--mono);font-size:12px">${x.min}</td>
        <td>${x.cat?`<span class="cpill" style="background:${cat.bg};color:${cat.c}">${cat.i} ${x.cat}</span>`:'—'}<br><span class="cpill" style="background:${tipo==='inventariable'?'#f5f3ff':'#ecfdf5'};color:${tipo==='inventariable'?'#7c3aed':'#059669'};font-size:10px">${tipo==='inventariable'?'Inventariable':'Consumible'}</span></td>
        <td style="color:var(--muted);font-size:12px" title="${x.loc||''}">${x.loc?(x.loc.length>10?x.loc.slice(0,10)+'…':x.loc):'—'}</td>
        <td>${x.est?`<span class="edot"><span class="dot" style="background:${ec}"></span>${x.est}</span>`:'—'}</td>
        <td style="color:var(--muted);font-size:12px" title="${mantInfo || x.util || x.proveedor || ''}">${mant?`🛠️ ${shortText(mantInfo,15)} `:''}${shortText(x.util,15)||'—'}${x.proveedor?`<br><span title="${x.proveedor}">🏪 ${shortText(x.proveedor,15)}</span>`:''}</td>
        <td><div style="display:flex;gap:6px">
          <button class="btn btn-sm" onclick="openModal(${x.id})" title="Editar">✏️</button>
          <button class="btn btn-sm" onclick="duplicateItem(${x.id})" title="Duplicar">⧉</button>
          <button class="btn btn-sm" onclick="openDocsModal(${x.id})" title="Documentación">📌</button>
          ${esContenedor
            ? `<button class="btn btn-sm btn-loan" onclick="openPrestarCaja(${x.id})" title="Prestar caja completa" style="font-size:16px;line-height:1">📦⌛</button>`
            : `<button class="btn btn-sm btn-loan" onclick="openPresDevModal(${x.id})" title="Prestar / Devolver" style="font-size:16px;line-height:1">⌛</button>`
          }
          <button class="btn btn-sm btn-pedido${isPedido(x.id)?' activo':''}" onclick="togglePedido(${x.id})" title="${isPedido(x.id)?'Quitar del pedido':'Añadir al pedido'}">🛒</button>
          <button class="btn btn-sm btn-d" onclick="openDelModal(${x.id})" title="Baja / Eliminar">🗑️</button>
        </div></td>
      </tr>`;
    }).join('')}</tbody>
  </table></div></div>`;
}

function rCards(data,mc){
  mc.innerHTML=`<div class="cgrid">${data.map(x=>{
    const low=isLowStock(x),mant=needsMaintenance(x),mantStatus=x.mantEstado||'Pendiente',cat=CATS[x.cat]||CATS['Otros']||{c:'#6b7280',bg:'#f9fafb',i:'🔧'},ec=ESTC[x.est]||'#6b7280',mod=findModulo(x.mod),tipo=materialType(x);
    const esContenedor2 = x.es_contenedor == 1;
    const parentItem2 = x.parent_id ? items.find(p=>Number(p.id)===Number(x.parent_id)) : null;
    const numHijos2 = esContenedor2 ? items.filter(h=>Number(h.parent_id)===Number(x.id)).length : 0;
    return`<div class="icard${low?' low':''}${parentItem2?' child-item':''}">
      ${x.foto?`<img class="card-photo" src="${x.foto}" alt="Foto de ${x.item}">`:''}
      <div class="ch">
        <div class="card-title-wrap">
          <div class="item-title-line">
            <div class="cname">${parentItem2?'↳ ':''}${x.item}</div>
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
      </div>
      <div class="cfg">
        <div><div class="cfl">Aula</div><div class="cfv">${AULAS.find(a=>a.id===x.aula)?.name||x.aula}</div></div>
        <div><div class="cfl">Ubicación</div><div class="cfv">${x.loc||'—'}</div></div>
        <div><div class="cfl">Utilidad</div><div class="cfv" style="font-size:11px" title="${x.util||''}">${shortText(x.util)||'—'}</div></div>
        <div><div class="cfl">Proveedor</div><div class="cfv" style="font-size:11px" title="${x.proveedor||''}">${shortText(x.proveedor)||'—'}</div></div>
        <div><div class="cfl">Revisión</div><div class="cfv" style="font-family:var(--mono);font-size:11px">${x.fecha||'—'}</div></div>
      </div>
      ${mant?`<div class="maint-note">
        <strong>${mantStatus}</strong>${x.mantFecha?` · ${x.mantFecha}`:''}${x.mantResp?` · ${x.mantResp}`:''}
        ${x.mantNota?`<br>${x.mantNota}`:''}
      </div>`:''}
      ${x.obs?`<div class="cobs">💬 ${x.obs}</div>`:''}
      <div class="cfoot">
        <button class="btn btn-sm" onclick="openModal(${x.id})" title="Editar">✏️</button>
        <button class="btn btn-sm" onclick="duplicateItem(${x.id})" title="Duplicar">⧉</button>
        <button class="btn btn-sm" onclick="openDocsModal(${x.id})" title="Documentación">📌</button>
        ${esContenedor2
          ? `<button class="btn btn-sm btn-loan" onclick="openPrestarCaja(${x.id})" title="Prestar caja completa" style="font-size:16px;line-height:1">📦⌛</button>`
          : `<button class="btn btn-sm btn-loan" onclick="openPresDevModal(${x.id})" title="Prestar / Devolver" style="font-size:16px;line-height:1">⌛</button>`
        }
        <button class="btn btn-sm btn-pedido${isPedido(x.id)?' activo':''}" onclick="togglePedido(${x.id})" title="Pedido">🛒</button>
        <button class="btn btn-sm btn-d" onclick="openDelModal(${x.id})" title="Baja / Eliminar">🗑️</button>
      </div>
    </div>`;
  }).join('')}</div>`;
}

function sv(v){view=v;document.getElementById('vT').classList.toggle('on',v==='table');document.getElementById('vC').classList.toggle('on',v==='cards');renderInv()}
window.addEventListener('resize',()=>{
  if(!document.getElementById('pS')?.classList.contains('active')) return;
  const nextMode = getInvRenderMode();
  if(nextMode !== _lastInvRenderMode) renderInv();
});
function sort(k){if(sk===k)sa=!sa;else{sk=k;sa=true}renderInv()}
function goInvPage(page){_invPage=page;renderInv();document.getElementById('pS')?.scrollIntoView({block:'start'})}
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
  const h='Referencia,Aula,Módulo,Ítem,Cantidad,Mínimo,Tipo material,Categoría,Ubicación,Estado,Mantenimiento,Fecha aviso mant.,Estado mant.,Responsable mant.,Nota mant.,Utilidad,Proveedor,Revisión,Observaciones';
  const rows=data.map(x=>{
    const m = findModulo(x.mod);
    return [x.ref,AULAS.find(a=>a.id===x.aula)?.name||x.aula,m?`${m.cod} ${m.name}`:'',x.item,x.qty,x.min,materialType(x),x.cat,x.loc,x.est,needsMaintenance(x)?'Sí':'',x.mantFecha,x.mantEstado,x.mantResp,x.mantNota,x.util,x.proveedor,x.fecha,x.obs].map(v=>`"${String(v||'').replace(/"/g,'""')}"`).join(',');
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
    `${items.length} ítems · ${AULAS.length} aulas · ${Object.keys(CATS).length} categorías · ${CICLOS.length} ciclos · ${prestamos.length} préstamos · ${profesores.length} profesores.`;
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
  const h='Referencia,Aula,MÃ³dulo,Ãtem,Cantidad,MÃ­nimo,Tipo material,CategorÃ­a,UbicaciÃ³n,Estado,Mantenimiento,Fecha aviso mant.,Estado mant.,Responsable mant.,Nota mant.,Utilidad,Proveedor,RevisiÃ³n,Observaciones';
  const rows=data.map(x=>{
    const m = findModulo(x.mod);
    return [x.ref,AULAS.find(a=>a.id===x.aula)?.name||x.aula,m?`${m.cod} ${m.name}`:'',x.item,x.qty,x.min,materialType(x),x.cat,x.loc,x.est,needsMaintenance(x)?'SÃ­':'',x.mantFecha,x.mantEstado,x.mantResp,x.mantNota,x.util,x.proveedor,x.fecha,x.obs].map(csvCell).join(',');
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
