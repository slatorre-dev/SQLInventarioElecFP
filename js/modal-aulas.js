// ═════════════════════════════════════════════════════════
// MODAL GESTIÓN DE AULAS
// ═════════════════════════════════════════════════════════
let aulasEditing = [];

function openAulasModal(){
  if(!requirePerm('config.manage')) return;
  aulasEditing = JSON.parse(JSON.stringify(AULAS)); // copia profunda
  renderAulasList();
  document.getElementById('mAulas').classList.add('open');
}
function closeAulasModal(){document.getElementById('mAulas').classList.remove('open')}

function renderAulasList(){
  document.getElementById('aulasList').innerHTML = aulasEditing.map((a,i)=>`
    <div class="aula-row">
      <input class="icon-pick" value="${a.icon}" onchange="aulasEditing[${i}].icon=this.value" maxlength="2">
      <input class="fi-w name-input" value="${a.name}" onchange="aulasEditing[${i}].name=this.value" placeholder="Nombre">
      <input class="fi-w desc-input" value="${a.desc||''}" onchange="aulasEditing[${i}].desc=this.value" placeholder="Descripción">
      <button class="del-btn" onclick="removeAulaRow(${i})" title="Eliminar">🗑</button>
    </div>
  `).join('');
}

function addAulaRow(){
  const newId = 'aula_'+Date.now();
  aulasEditing.push({id:newId, name:'Aula nueva', icon:'🏫', desc:'', th:TH_OPTIONS[aulasEditing.length%TH_OPTIONS.length]});
  renderAulasList();
}

function removeAulaRow(idx){
  const a = aulasEditing[idx];
  const usadas = items.filter(x=>x.aula===a.id).length;
  if(usadas > 0){
    if(!confirm(`Esta aula tiene ${usadas} ítem(s) asignados. Si la eliminas, esos ítems quedarán sin aula. ¿Continuar?`)) return;
  }
  aulasEditing.splice(idx,1);
  renderAulasList();
}

async function saveAulas(){
  // Validación: nombres no vacíos
  for(const a of aulasEditing){
    if(!a.name.trim()){toast('Hay aulas sin nombre','err');return}
  }
  // Asegurar que cada aula tiene un th asignado
  aulasEditing.forEach((a,i)=>{ if(!a.th) a.th = TH_OPTIONS[i%TH_OPTIONS.length]; });

  try {
    const res = await apiPost({action:'aulasSync', aulas:aulasEditing});
    if(!res.ok) throw new Error(res.error);
    AULAS = aulasEditing;
    closeAulasModal();
    renderHome();
    toast('Aulas guardadas y sincronizadas','ok');
  } catch(err) {
    toast('Error al sincronizar: '+err.message,'err');
  }
}
