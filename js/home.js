// ═════════════════════════════════════════════════════════
// HOME RENDER
// ═════════════════════════════════════════════════════════
function renderHome(){
  // Banner de préstamos
  renderLoanBanner();

  const loading = !itemsLoaded;
  const total=items.length;
  const low=items.filter(x=>Number(x.qty)<=Number(x.min)).length;
  const mant=items.filter(needsMaintenance).length;
  const units=items.reduce((a,x)=>a+(Number(x.qty)||0),0);
  document.getElementById('hStats').innerHTML= loading
    ? `<div class="scard scard-loading"><div class="scard-icon">📦</div><div><div class="scard-num skel"></div><div class="scard-lbl">tipos de ítem</div></div></div>
       <div class="scard scard-loading"><div class="scard-icon">🔢</div><div><div class="scard-num skel"></div><div class="scard-lbl">unidades totales</div></div></div>
       <div class="scard scard-loading"><div class="scard-icon">⚠️</div><div><div class="scard-num skel"></div><div class="scard-lbl">stock bajo</div></div></div>
       <div class="scard scard-loading"><div class="scard-icon">🛠️</div><div><div class="scard-num skel"></div><div class="scard-lbl">mantenimiento</div></div></div>`
    : `<div class="scard"><div class="scard-icon">📦</div><div><div class="scard-num">${total}</div><div class="scard-lbl">tipos de ítem</div></div></div>
    <div class="scard"><div class="scard-icon">🔢</div><div><div class="scard-num">${units.toLocaleString()}</div><div class="scard-lbl">unidades totales</div></div></div>
    <div class="scard${low?' scard-alert':''}" ${low?'onclick="goLowStock()" style="cursor:pointer"':''}><div class="scard-icon">⚠️</div><div><div class="scard-num" style="color:var(--red)">${low}</div><div class="scard-lbl">stock bajo</div></div></div>
    <div class="scard${mant?' scard-alert':''}" ${mant?'onclick="goMaintenance()" style="cursor:pointer"':''}><div class="scard-icon">🛠️</div><div><div class="scard-num" style="color:var(--amber)">${mant}</div><div class="scard-lbl">mantenimiento</div></div></div>`;
  const countHtml = loading ? `<span class="ccard-count skel skel-count"></span>` : null;
  document.getElementById('gAulas').innerHTML=AULAS.map(a=>{
    const n=items.filter(x=>x.aula===a.id).length;
    const w=loading ? 0 : items.filter(x=>x.aula===a.id&&Number(x.qty)<=Number(x.min)).length;
    return`<div class="ccard ${a.th}" onclick="goAula('${a.id}')">
      ${loading ? `<span class="ccard-count skel skel-count"></span>` : `<span class="ccard-count">${n} ítems</span>`}
      <button class="ccard-edit" onclick="event.stopPropagation();openAulasModal()" title="Editar aulas">✏️</button>
      <div class="ccard-icon">${a.icon}</div>
      <div class="ccard-title">${a.name}</div>
      <div class="ccard-desc">${a.desc}${w?`<div class="ccard-warn">⚠ ${w} stock bajo</div>`:''}</div>
    </div>`;
  }).join('');
  const catEntries = loading ? Object.entries(CATS) : Object.entries(CATS).filter(([name])=>items.some(x=>x.cat===name));
  document.getElementById('gCats').innerHTML=catEntries.length
    ? catEntries.map(([name,c])=>{
        const n=items.filter(x=>x.cat===name).length;
        const w=loading ? 0 : items.filter(x=>x.cat===name&&Number(x.qty)<=Number(x.min)).length;
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
}

function renderLoanBanner(){
  const el = document.getElementById('loanBanner');
  if(!el) return;

  const rol = (SESSION?.rol || '').toLowerCase().trim();
  const esJefe = ['jefe departamento','jefe de departamento','administrador','admin'].includes(rol);

  let activos, vencidos;
  if(esJefe){
    activos = getPrestamosActivos();
    vencidos = getVencidos();
  } else {
    // Solo muestra los préstamos donde el usuario logueado es el prestatario
    const miNombre = (SESSION?.nombre || '').toLowerCase().trim();
    activos = getPrestamosActivos().filter(p=>(p.profesorNombre||'').toLowerCase().trim()===miNombre);
    vencidos = activos.filter(isVencido);
  }

  if(vencidos.length){
    el.innerHTML=`<div class="loan-banner danger">
      <div class="loan-banner-info">
        <div class="loan-banner-icon">⚠️</div>
        <div class="loan-banner-text"><span class="loan-banner-count">${vencidos.length}</span> préstamo${vencidos.length!==1?'s':''} vencido${vencidos.length!==1?'s':''} pendiente${vencidos.length!==1?'s':''} de devolución</div>
      </div>
      <button class="loan-banner-btn" onclick="goPrestamos('vencidos')">Ver vencidos →</button>
    </div>`;
  } else if(activos.length){
    el.innerHTML=`<div class="loan-banner">
      <div class="loan-banner-info">
        <div class="loan-banner-icon">📋</div>
        <div class="loan-banner-text"><span class="loan-banner-count">${activos.length}</span> préstamo${activos.length!==1?'s':''} activo${activos.length!==1?'s':''} en curso</div>
      </div>
      <button class="loan-banner-btn" onclick="goPrestamos('activos')">Ver préstamos →</button>
    </div>`;
  } else {
    el.innerHTML='';
  }
}
