// ═════════════════════════════════════════════════════════
// HOME RENDER
// ═════════════════════════════════════════════════════════
function renderHome(){
  // Banner de préstamos
  renderLoanBanner();

  const loading = !itemsLoaded;
  const total=items.length;
  const low=items.filter(isLowStock).length;
  const mant=items.filter(needsMaintenance).length;
  const units=items.reduce((a,x)=>a+(Number(x.qty)||0),0);
  const oc = (typeof can==='function' && can('visibility.manage')) ? items.filter(x=>x.oculto==1).length : 0;
  const ocCard = (typeof can==='function' && can('visibility.manage'))
    ? `<div class="scard" onclick="goOcultos()" style="cursor:pointer"><div class="scard-icon">🙈</div><div class="scard-num">${oc}</div></div>`
    : '';
  document.getElementById('hStats').innerHTML= loading
    ? `<div class="scard scard-loading"><div class="scard-icon">📦</div><div class="scard-num skel"></div></div>
       <div class="scard scard-loading"><div class="scard-icon">🔢</div><div class="scard-num skel"></div></div>
       <div class="scard scard-loading"><div class="scard-icon">⚠️</div><div class="scard-num skel"></div></div>
       <div class="scard scard-loading"><div class="scard-icon">🛠️</div><div class="scard-num skel"></div></div>`
    : `<div class="scard"><div class="scard-icon">📦</div><div class="scard-num">${total}</div></div>
    <div class="scard"><div class="scard-icon">🔢</div><div class="scard-num">${units.toLocaleString()}</div></div>
    <div class="scard${low?' scard-alert':''}" ${low?'onclick="goLowStock()" style="cursor:pointer"':''}><div class="scard-icon">⚠️</div><div class="scard-num" style="color:var(--red)">${low}</div></div>
    <div class="scard${mant?' scard-alert':''}" ${mant?'onclick="goMaintenance()" style="cursor:pointer"':''}><div class="scard-icon">🛠️</div><div class="scard-num" style="color:var(--amber)">${mant}</div></div>${ocCard}`;
  const countHtml = loading ? `<span class="ccard-count skel skel-count"></span>` : null;
  document.getElementById('gAulas').innerHTML=AULAS.map(a=>{
    const n=items.filter(x=>x.aula===a.id).length;
    const w=loading ? 0 : items.filter(x=>x.aula===a.id&&isLowStock(x)).length;
    return`<div class="ccard ${a.th}" style="--ch:#2563eb" onclick="goAula('${a.id}')">
      ${loading ? `<span class="ccard-count skel skel-count"></span>` : `<span class="ccard-count">${n} ítems</span>`}
      <button class="ccard-edit" onclick="event.stopPropagation();openAulasModal()" title="Editar aulas">✏️</button>
      <div class="ccard-icon">${a.icon}</div>
      <div class="ccard-title">${a.name}</div>
      <div class="ccard-desc">${a.desc}${w?`<div class="ccard-warn">⚠ ${w} stock bajo</div>`:''}</div>
    </div>`;
  }).join('');
  const catEntries = loading ? sortedCatEntries() : sortedCatEntries().filter(([name])=>items.some(x=>x.cat===name));
  document.getElementById('gCats').innerHTML=catEntries.length
    ? catEntries.map(([name,c])=>{
        const n=items.filter(x=>x.cat===name).length;
        const w=loading ? 0 : items.filter(x=>x.cat===name&&isLowStock(x)).length;
        return`<div class="ccard" style="--ch:${c.c};--cbg:${c.bg}" onclick="goCat('${name.replace(/'/g,"\\'")}')">
          ${loading ? `<span class="ccard-count skel skel-count"></span>` : `<span class="ccard-count">${n} ítems</span>`}
          <div class="ccard-icon">${c.i}</div>
          <div class="ccard-title">${name}</div>
          <div class="ccard-desc">${w?`<div class="ccard-warn">⚠ ${w} stock bajo</div>`:''}</div>
        </div>`;
      }).join('')
    : `<div class="empty" style="grid-column:1/-1;padding:32px;text-align:center;color:var(--muted);font-size:13px">No hay ítems clasificados por categoría aún.</div>`;
  document.getElementById('gCiclos').innerHTML=CICLOS.map(c=>{
    const n=items.filter(x=>x.mod && x.mod.startsWith(c.id+'__')).length;
    return`<div class="ccard ${c.th}" onclick="openCiclo('${c.id}')">
      ${loading ? `<span class="ccard-count skel skel-count"></span>` : `<span class="ccard-count">${n} ítems</span>`}
      <div class="ccard-icon">${c.icon}</div>
      <div class="ccard-title">${c.name}</div>
      <div class="ccard-desc">${c.desc}</div>
    </div>`;
  }).join('');

  renderActivityFeed();
}

function _afTimeAgo(fechaStr) {
  if (!fechaStr) return '';
  const d = new Date(fechaStr.replace(' ', 'T'));
  if (isNaN(d)) return '';
  const diff = Math.floor((Date.now() - d) / 1000);
  if (diff < 60) return 'ahora';
  if (diff < 3600) return `${Math.floor(diff/60)}m`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h`;
  if (diff < 172800) return 'ayer';
  return d.toLocaleDateString('es-ES', { day:'numeric', month:'short' });
}

function _afChipStyle(accion) {
  const a = (accion || '').toLowerCase();
  if (['itemadd','add','bulkimport'].includes(a))      return { icon:'➕', cls:'add' };
  if (['itemupdate','update'].includes(a))              return { icon:'✏️', cls:'edit' };
  if (['itemdelete','delete','itembaja'].includes(a))   return { icon:'🗑️', cls:'del' };
  if (['prestar','prestarcaja'].includes(a))            return { icon:'📤', cls:'loan' };
  if (a === 'devolver')                                 return { icon:'📥', cls:'ret' };
  return { icon:'⚙️', cls:'sys' };
}

function _afChipLabel(accion, nombre, detalles) {
  const a = (accion || '').toLowerCase();
  const n = (nombre || detalles || '').slice(0, 28);
  if (a === 'itemadd' || a === 'add')         return ['Añadido', n];
  if (a === 'itemupdate' || a === 'update')   return ['Editado', n];
  if (a === 'itemdelete' || a === 'delete')   return ['Eliminado', n];
  if (a === 'itembaja')                       return ['Baja', n];
  if (a === 'prestar' || a === 'prestarcaja') return ['Préstamo', n];
  if (a === 'devolver')                       return ['Devuelto', n];
  if (a === 'bulkimport')                     return ['Importación', ''];
  return [detalles || accion || 'Acción', ''];
}

async function renderActivityFeed() {
  if (typeof canAccessHistorial !== 'function' || !canAccessHistorial()) return;

  const section = document.getElementById('activityFeedSection');
  const feed = document.getElementById('activityFeed');
  if (!section || !feed) return;

  section.style.display = '';
  feed.innerHTML = '<span class="af-chip af-chip-loading">Cargando…</span>';

  try {
    const res = await fetch(urlWithAuth('historial'));
    if (!res.ok) { section.style.display='none'; return; }
    const data = await res.json();
    const logs = Array.isArray(data) ? data : (data.logs || []);
    const recent = logs.slice(0, 12);
    if (!recent.length) { section.style.display='none'; return; }
    feed.innerHTML = recent.map(r => {
      const { icon, cls } = _afChipStyle(r.accion);
      const [verb, name] = _afChipLabel(r.accion, r.nombre || r.que, r.detalles);
      const t = _afTimeAgo(r.fecha || r.timestamp);
      const who = (r.usuario || '').split(' ')[0];
      return `<span class="af-chip af-chip-${cls}" title="${verb}${name ? ': '+name : ''}${who ? ' · '+who : ''}">
        <span class="af-chip-icon">${icon}</span>
        <span class="af-chip-text">${name || verb}</span>
        ${t ? `<span class="af-chip-time">${t}</span>` : ''}
      </span>`;
    }).join('');
  } catch(e) {
    section.style.display = 'none';
  }
}

function renderLoanBanner(){
  const el = document.getElementById('loanBanner');
  if(!el) return;
  el.innerHTML = '';
}
