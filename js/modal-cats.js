// ═════════════════════════════════════════════════════════
// MODAL GESTIÓN DE CATEGORÍAS
// ═════════════════════════════════════════════════════════
let catsEditing = [];

function openCatsModal(){
  if(!requirePerm('config.manage')) return;
  catsEditing = Object.entries(CATS).map(([name,v])=>({name, c:v.c, bg:v.bg, i:v.i}));
  renderCatsList();
  document.getElementById('mCats').classList.add('open');
}
function closeCatsModal(){document.getElementById('mCats').classList.remove('open')}

function renderCatsList(){
  document.getElementById('catsList').innerHTML = catsEditing.map((cat,i)=>`
    <div class="cat-row">
      <input class="icon-pick" value="${cat.i}" onchange="catsEditing[${i}].i=this.value" maxlength="2" title="Icono emoji">
      <input class="fi-w name-input" value="${cat.name.replace(/"/g,'&quot;')}" onchange="catsEditing[${i}].name=this.value" placeholder="Nombre categoría">
      <div class="color-col">
        <input type="color" class="color-pick" value="${cat.c}" onchange="catsEditing[${i}].c=this.value" title="Color del texto">
        <span>texto</span>
      </div>
      <div class="color-col">
        <input type="color" class="color-pick" value="${cat.bg}" onchange="catsEditing[${i}].bg=this.value" title="Color de fondo">
        <span>fondo</span>
      </div>
      <button class="del-btn" onclick="removeCatRow(${i})" title="Eliminar">🗑</button>
    </div>
  `).join('');
}

function addCatRow(){
  catsEditing.push({name:'Nueva categoría', i:'🏷️', c:'#6b7280', bg:'#f9fafb'});
  renderCatsList();
}

function removeCatRow(idx){
  const cat = catsEditing[idx];
  const usados = items.filter(x=>x.cat===cat.name).length;
  if(usados > 0){
    if(!confirm(`Esta categoría tiene ${usados} ítem(s) asignados. Si la eliminas, esos ítems conservarán el nombre de categoría anterior. ¿Continuar?`)) return;
  }
  catsEditing.splice(idx,1);
  renderCatsList();
}

async function saveCats(){
  for(const cat of catsEditing){
    if(!cat.name.trim()){toast('Hay categorías sin nombre','err');return}
  }
  const names = catsEditing.map(c=>c.name.trim());
  if(new Set(names).size !== names.length){toast('Hay nombres de categoría duplicados','err');return}
  const payload = catsEditing.map((c,i)=>({name:c.name.trim(), c:c.c, bg:c.bg, i:c.i, orden:i+1}));
  try {
    const res = await apiPost({action:'catsSync', cats:payload});
    if(!res.ok) throw new Error(res.error);
    CATS = Object.fromEntries(catsEditing.map(c=>[c.name.trim(), {c:c.c, bg:c.bg, i:c.i}]));
    closeCatsModal();
    toast('Categorías guardadas y sincronizadas','ok');
  } catch(err) {
    toast('Error al sincronizar: '+err.message,'err');
  }
}
