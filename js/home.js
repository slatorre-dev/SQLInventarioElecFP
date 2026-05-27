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
  if (isNaN(d)) return fechaStr.slice(0, 16).replace('T', ' ');
  const diff = Math.floor((Date.now() - d) / 1000);
  if (diff < 60) return 'Ahora mismo';
  if (diff < 3600) return `Hace ${Math.floor(diff/60)} min`;
  if (diff < 86400) return `Hace ${Math.floor(diff/3600)} h`;
  if (diff < 172800) return 'Ayer';
  return d.toLocaleDateString('es-ES', { day:'numeric', month:'short' });
}

function _afDotClass(accion) {
  const a = (accion || '').toLowerCase();
  if (['itemadd','add','bulkimport'].includes(a)) return 'add';
  if (['itemupdate','update'].includes(a)) return 'edit';
  if (['itemdelete','delete','itembaja'].includes(a)) return 'del';
  if (['prestar','prestarcaja'].includes(a)) return 'loan';
  if (a === 'devolver') return 'ret';
  return 'sys';
}

function _afIcon(dotClass) {
  return { add:'➕', edit:'✏️', del:'🗑️', loan:'📤', ret:'📥', sys:'⚙️' }[dotClass] || '•';
}

function _afLabel(accion, nombre, detalles) {
  const a = (accion || '').toLowerCase();
  const n = nombre || detalles || '';
  if (a === 'itemadd' || a === 'add') return n ? `Añadido: ${n}` : 'Ítem añadido';
  if (a === 'itemupdate' || a === 'update') return n ? `Editado: ${n}` : 'Ítem editado';
  if (a === 'itemdelete' || a === 'delete') return n ? `Eliminado: ${n}` : 'Ítem eliminado';
  if (a === 'itembaja') return n ? `Baja: ${n}` : 'Ítem dado de baja';
  if (a === 'prestar' || a === 'prestarcaja') return n ? `Préstamo: ${n}` : 'Préstamo realizado';
  if (a === 'devolver') return n ? `Devuelto: ${n}` : 'Devolución';
  if (a === 'bulkimport') return 'Importación masiva';
  return detalles || accion || 'Acción';
}

async function renderActivityFeed() {
  if (typeof can !== 'function') return;
  const isAdmin = can('historial.read') || SESSION?.rol?.toLowerCase().includes('admin') ||
                  SESSION?.rol?.toLowerCase().includes('jefe') || SESSION?.usuario?.toLowerCase() === 'seba';
  if (!isAdmin) return;

  const section = document.getElementById('activityFeedSection');
  const feed = document.getElementById('activityFeed');
  if (!section || !feed) return;

  section.style.display = '';
  feed.innerHTML = '<div class="af-item" style="justify-content:center;color:var(--muted);font-size:12px">Cargando...</div>';

  try {
    const qs = SESSION ? `?u=${encodeURIComponent(SESSION.usuario)}&p=${encodeURIComponent(SESSION.password||'')}` : '';
    const res = await fetch(`/api/historial${qs}`);
    if (!res.ok) { section.style.display='none'; return; }
    const data = await res.json();
    const logs = Array.isArray(data) ? data : (data.logs || []);
    const recent = logs.slice(0, 10);
    if (!recent.length) { feed.innerHTML = '<div class="af-item" style="color:var(--muted);font-size:12px;padding:12px 4px">Sin actividad reciente.</div>'; return; }
    feed.innerHTML = recent.map(r => {
      const dc = _afDotClass(r.accion);
      const label = _afLabel(r.accion, r.nombre || r.que, r.detalles);
      const quien = r.usuario ? `${r.usuario}${r.rol ? ' · ' + r.rol : ''}` : '';
      return `<div class="af-item">
        <div class="af-dot ${dc}">${_afIcon(dc)}</div>
        <div class="af-body">
          <div class="af-action">${label}</div>
          ${quien ? `<div class="af-meta">${quien}</div>` : ''}
        </div>
        <div class="af-time">${_afTimeAgo(r.fecha || r.timestamp)}</div>
      </div>`;
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
