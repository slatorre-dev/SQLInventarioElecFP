// ═════════════════════════════════════════════════════════
// NAVEGACIÓN + HASH ROUTING
// ═════════════════════════════════════════════════════════
let _skipHistory = false;

function _push(state, hash){
  if(!_skipHistory) history.pushState(state, '', hash || './');
}

function _showHomeButtons(){
  document.getElementById('btnImp').style.display = 'flex';
  document.getElementById('btnPres').style.display = 'flex';
  document.getElementById('btnPed').style.display = 'flex';
  if(deferredInstallPrompt) document.getElementById('btnInstall').style.display = 'flex';
  document.getElementById('btnHome').style.display = 'none';
}
function _hideHomeButtons(){
  document.getElementById('btnImp').style.display = 'none';
  document.getElementById('btnPres').style.display = 'none';
  document.getElementById('btnPed').style.display = 'none';
  document.getElementById('btnInstall').style.display = 'none';
  document.getElementById('btnHome').style.display = 'flex';
}

function goHome(){
  _push({page:'home'}, './');
  cf=null; currentCiclo=null;
  document.getElementById('bc').innerHTML='';
  document.getElementById('btnN').style.display='flex';
  document.getElementById('btnE').style.display='none';
  _showHomeButtons();
  if(typeof applyRoleUI === 'function') applyRoleUI();
  gsClear();
  show('pH'); renderHome();
}

function goAula(id){
  _push({page:'aula', id}, '#aula/'+id);
  cf={type:'aula',id,label:AULAS.find(a=>a.id===id)?.name,icon:AULAS.find(a=>a.id===id)?.icon};
  openSub();
}

function goCat(name){
  _push({page:'cat', id:name}, '#cat/'+encodeURIComponent(name));
  const c=CATS[name]||{c:'#6b7280',bg:'#f9fafb',i:'🔧'};
  cf={type:'cat',id:name,label:name,icon:c.i,catColor:c.c,catBg:c.bg};
  openSub();
}

function openCiclo(cicloId){
  _push({page:'ciclo', id:cicloId}, '#ciclo/'+cicloId);
  currentCiclo = CICLOS.find(c=>c.id===cicloId);
  if(!currentCiclo) return;
  cf=null;
  document.getElementById('btnN').style.display='flex';
  document.getElementById('btnE').style.display='none';
  _hideHomeButtons();
  if(typeof applyRoleUI === 'function') applyRoleUI();
  document.getElementById('cicloTag').textContent = `${currentCiclo.icon} ${currentCiclo.nivel}`;
  document.getElementById('cicloTitle').textContent = currentCiclo.name;
  document.getElementById('cicloMeta').textContent = currentCiclo.desc;
  document.getElementById('bc').innerHTML = `<span class="bc-link" onclick="goHome()">Inicio</span><span class="sep">›</span><strong>${currentCiclo.icon} ${currentCiclo.name}</strong>`;
  // Render módulos
  document.getElementById('modGrid').innerHTML = currentCiclo.modulos.map(m=>{
    const modId = `${currentCiclo.id}__${m.cod}`;
    const n = items.filter(x=>x.mod===modId).length;
    return `<div class="mod-card" onclick="goMod('${modId}')">
      <div class="mod-code">${m.cod}</div>
      <div class="mod-info">
        <div class="mod-name">${m.name}</div>
        <div class="mod-hours">${m.horas?m.horas+' horas':'—'}</div>
      </div>
      <div class="mod-count">${n||''}</div>
    </div>`;
  }).join('');
  show('pCiclo');
}

function goMod(modId){
  _push({page:'mod', id:modId}, '#mod/'+encodeURIComponent(modId));
  const m = findModulo(modId);
  if(!m) return;
  cf={type:'mod',id:modId,label:m.name,icon:m.ciclo.icon,ciclo:m.ciclo};
  openSub();
}

function goLowStock(){
  _push({page:'lowstock'}, '#lowstock');
  cf={type:'lowstock', id:'lowstock', label:'Stock bajo', icon:'⚠️'};
  openSub();
}

function goMaintenance(){
  _push({page:'maintenance'}, '#maintenance');
  cf={type:'maintenance', id:'maintenance', label:'Mantenimiento / reparación', icon:'🛠️'};
  openSub();
}

function openSub(){
  const all=getBase();
  const low=all.filter(x=>Number(x.qty)<=Number(x.min)).length;
  let tagC, typeLabel;
  if(cf.type==='aula'){tagC='background:#eff6ff;color:#2563eb';typeLabel='Aula';}
  else if(cf.type==='cat'){tagC=`background:${cf.catBg};color:${cf.catColor}`;typeLabel='Categoría';}
  else if(cf.type==='lowstock'){tagC='background:#fff7ed;color:#c2410c';typeLabel='Alerta';}
  else if(cf.type==='maintenance'){tagC='background:#fffbeb;color:#b45309';typeLabel='Mantenimiento';}
  else{tagC='background:#f5f3ff;color:#7c3aed';typeLabel='Módulo';}
  document.getElementById('sTag').textContent=`${cf.icon} ${typeLabel}`;
  document.getElementById('sTag').style.cssText=tagC;
  document.getElementById('sTitle').textContent=cf.label;
  if(cf.type==='aula'){
    const a = AULAS.find(x=>x.id===cf.id);
    document.getElementById('sMeta').textContent = `${a?.desc||''} · ${all.length} tipos · ${all.reduce((a2,x)=>a2+(Number(x.qty)||0),0)} unidades`;
  } else if(cf.type==='cat'){
    document.getElementById('sMeta').textContent = `${all.length} tipos · ${all.reduce((a2,x)=>a2+(Number(x.qty)||0),0)} unidades`;
  } else if(cf.type==='lowstock'){
    document.getElementById('sMeta').textContent = `${all.length} ítem${all.length!==1?'s':''} por debajo del stock mínimo`;
  } else if(cf.type==='maintenance'){
    document.getElementById('sMeta').textContent = `${all.length} ítem${all.length!==1?'s':''} marcado${all.length!==1?'s':''} para mantenimiento o reparación`;
  } else {
    document.getElementById('sMeta').textContent = `${cf.ciclo.name} · ${all.length} tipos · ${all.reduce((a2,x)=>a2+(Number(x.qty)||0),0)} unidades`;
  }

  // Breadcrumb
  if(cf.type==='aula'){
    document.getElementById('bc').innerHTML=`<span class="bc-link" onclick="goHome()">Inicio</span><span class="sep">›</span><strong>${cf.icon} ${cf.label}</strong>`;
  } else if(cf.type==='cat'){
    document.getElementById('bc').innerHTML=`<span class="bc-link" onclick="goHome()">Inicio</span><span class="sep">›</span><strong>${cf.icon} ${cf.label}</strong>`;
  } else if(cf.type==='lowstock'){
    document.getElementById('bc').innerHTML=`<span class="bc-link" onclick="goHome()">Inicio</span><span class="sep">›</span><strong>⚠️ Stock bajo</strong>`;
  } else if(cf.type==='maintenance'){
    document.getElementById('bc').innerHTML=`<span class="bc-link" onclick="goHome()">Inicio</span><span class="sep">›</span><strong>🛠️ Mantenimiento</strong>`;
  } else {
    document.getElementById('bc').innerHTML=`<span class="bc-link" onclick="goHome()">Inicio</span><span class="sep">›</span><span class="bc-link" onclick="openCiclo('${cf.ciclo.id}')">${cf.ciclo.icon} ${cf.ciclo.name}</span><span class="sep">›</span><strong>${cf.label}</strong>`;
  }

  document.getElementById('btnN').style.display = (cf.type==='lowstock' || cf.type==='maintenance') ? 'none' : 'flex';
  document.getElementById('btnE').style.display = (cf.type==='lowstock' || cf.type==='maintenance') ? 'none' : 'flex';
  _hideHomeButtons();
  if(typeof applyRoleUI === 'function') applyRoleUI();
  document.getElementById('srch').value='';
  document.getElementById('fEst').value='';
  const cats=[...new Set(all.map(x=>x.cat).filter(Boolean))].sort();
  document.getElementById('fCat').innerHTML='<option value="">Todas las categorías</option>'+cats.map(c=>`<option>${c}</option>`).join('');
  show('pS'); renderInv(); renderSubStats(all,low);
}

function openItemRoute(id){
  const normRouteText = v => (typeof normalizeStr === 'function'
    ? normalizeStr(v)
    : String(v || '').toLowerCase()).replace(/[^a-z0-9]/g, '');
  const norm = normRouteText(id);
  const item = items.find(x=>
    String(x.id) === String(id) ||
    (typeof itemCode === 'function' && normRouteText(itemCode(x)) === norm) ||
    normRouteText(x.ref || '') === norm
  );
  if(!item){ goHome(); toast('Ítem no encontrado','err'); return; }
  const aula = AULAS.find(a=>a.id===item.aula);
  cf = {type:'aula', id:item.aula, label:aula?.name || item.aula, icon:aula?.icon || '📦'};
  currentCiclo = null;
  openSub();
  openModal(item.id);
}

// ─── HASH ROUTING ─────────────────────────────────────────
function navigateFromHash(hash){
  if(!hash || hash === '#' || hash === '#home') { goHome(); return; }
  const h = hash.replace(/^#/, '');
  const [seg, ...rest] = h.split('/');
  const id = decodeURIComponent(rest.join('/'));
  if(seg === 'profile')    { goProfile(); return; }
  if(seg === 'prestamos')  { goPrestamos(); return; }
  if(seg === 'lowstock')   { goLowStock(); return; }
  if(seg === 'maintenance') { goMaintenance(); return; }
  if(seg === 'docs')       { goDocsDpto(); return; }
  if(seg === 'aula' && id) { goAula(id); return; }
  if(seg === 'cat'  && id) { goCat(id); return; }
  if(seg === 'ciclo'&& id) { openCiclo(id); return; }
  if(seg === 'mod'  && id) { goMod(id); return; }
  if(seg === 'item' && id) { openItemRoute(id); return; }
  goHome();
}

window.addEventListener('popstate', function(){
  if(!SESSION) return;
  _skipHistory = true;
  navigateFromHash(location.hash);
  _skipHistory = false;
});

// ─── MENÚ MÓVIL ───────────────────────────────────────────
function toggleMobMenu(){
  document.getElementById('topbarBtns').classList.toggle('open');
}
function closeMobMenu(){
  document.getElementById('topbarBtns').classList.remove('open');
}
document.addEventListener('click', function(e){
  if(!e.target.closest('#topbarBtns') && !e.target.closest('#mobMenuBtn'))
    closeMobMenu();
  if(!e.target.closest('#deptMenuWrap'))
    closeDeptMenu();
});

// ─── MENÚ DEPARTAMENTO ────────────────────────────────────
function toggleDeptMenu(){
  document.getElementById('deptMenu').classList.toggle('open');
}
function closeDeptMenu(){
  document.getElementById('deptMenu').classList.remove('open');
}
