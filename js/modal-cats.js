// ═════════════════════════════════════════════════════════
// MODAL GESTIÓN DE CATEGORÍAS
// ═════════════════════════════════════════════════════════
let catsEditing = [];

function sortCatsEditing(){
  catsEditing.sort((a,b)=>catNameCompare(a.name, b.name));
}

function openCatsModal(){
  if(!requirePerm('categories.manage')) return;
  catsEditing = sortedCatEntries().map(([name,v])=>({name, c:v.c, bg:v.bg, i:v.i}));
  sortCatsEditing();
  renderCatsList();
  renderTagsList();
  document.getElementById('mCats').classList.add('open');
}
function closeCatsModal(){document.getElementById('mCats').classList.remove('open')}

function renderCatsList(){
  sortCatsEditing();
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
  const names = catsEditing.map(c=>c.name.trim().toLowerCase());
  if(new Set(names).size !== names.length){toast('Hay nombres de categoría duplicados','err');return}
  const clean = catsEditing.map(c=>({name:c.name.trim(), c:c.c, bg:c.bg, i:c.i})).sort((a,b)=>catNameCompare(a.name,b.name));
  const payload = clean.map((c,i)=>({name:c.name, c:c.c, bg:c.bg, i:c.i, orden:i+1}));
  try {
    const res = await apiPost({action:'catsSync', cats:payload});
    if(!res.ok) throw new Error(res.error);
    setCatsFromEntries(clean.map(c=>[c.name, {c:c.c, bg:c.bg, i:c.i}]));
    fillCatFilter();
    fillModalSelects();
    if(typeof renderHome === 'function') renderHome();
    closeCatsModal();
    toast('Categorías guardadas y sincronizadas','ok');
  } catch(err) {
    toast('Error al sincronizar: '+err.message,'err');
  }
}

async function normalizeCategoriesToTags(){
  if(!requirePerm('categories.manage')) return;
  if(!confirm('Esto reducirá las categorías a grupos principales y moverá categorías como Routers, Fibra óptica, Telecomunicaciones, Ordenadores o Domótica a tags de los ítems. ¿Continuar?')) return;
  try{
    const res = await apiPost({action:'normalizeCategoriesTags'});
    if(!res.ok) throw new Error(res.error);
    if(res.items) items = res.items;
    if(res.cats) setCatsFromEntries(res.cats.map(c=>[c.name,{c:c.c,bg:c.bg,i:c.i}]));
    catsEditing = sortedCatEntries().map(([name,v])=>({name, c:v.c, bg:v.bg, i:v.i}));
    renderCatsList();
    fillModalSelects();
    fillCatFilter();
    if(typeof renderHome === 'function') renderHome();
    if(cf) renderInv();
    toast(`Categorías normalizadas: ${res.updated||0} ítems actualizados`, 'ok');
  }catch(err){
    toast('Error al normalizar: ' + err.message, 'err');
  }
}

// ═════════════════════════════════════════════════════════
// GESTIÓN DE TAGS
// ═════════════════════════════════════════════════════════
function renderTagsList(){
  const list = document.getElementById('tagsList');
  if(!list) return;
  const sorted = [...TAGS].sort(tagNameCompare);
  list.innerHTML = sorted.map((tag, i) => `
    <div class="tag-row">
      <span class="tag-name">${tag}</span>
      <button class="del-btn" onclick="removeTag('${tag.replace(/'/g, '\\\'')}')" title="Eliminar">🗑</button>
    </div>
  `).join('');
}

function addTagRow(){
  const input = document.getElementById('newTagInput');
  const tag = (input?.value || '').trim();
  if(!tag){
    toast('Escribe el nombre del tag','err');
    return;
  }
  if(TAGS.includes(tag)){
    toast('Este tag ya existe','err');
    return;
  }
  if(tag.length > 50){
    toast('El tag no puede exceder 50 caracteres','err');
    return;
  }
  TAGS.push(tag);
  TAGS.sort(tagNameCompare);
  input.value = '';
  renderTagsList();
  fillTagSuggestions();
  toast(`Tag "${tag}" añadido`,'ok');
}

function removeTag(tag){
  const idx = TAGS.indexOf(tag);
  if(idx === -1) return;
  const usados = items.filter(x => (x.tags || '').split(',').map(t => t.trim()).includes(tag)).length;
  if(usados > 0){
    if(!confirm(`Este tag se usa en ${usados} ítem(s). ¿Continuar con la eliminación?`)) return;
  }
  TAGS.splice(idx, 1);
  renderTagsList();
  fillTagSuggestions();
  if(usados > 0) toast(`Tag "${tag}" eliminado de ${usados} ítem(s)`,'ok');
  else toast(`Tag "${tag}" eliminado`,'ok');
}
