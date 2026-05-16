// ═════════════════════════════════════════════════════════
// DOCUMENTACIÓN ADJUNTA
// ═════════════════════════════════════════════════════════
let docsPendientes = [];
let docsActuales   = [];
let _docNameSeq = 0;

const DOC_ICONS = {pdf:'📄',jpg:'🖼️',jpeg:'🖼️',png:'🖼️',gif:'🖼️',webp:'🖼️',
  doc:'📝',docx:'📝',xls:'📊',xlsx:'📊',ppt:'📊',pptx:'📊',
  zip:'🗜️',rar:'🗜️',mp4:'🎬',mp3:'🎵',txt:'📋',svg:'🖼️'};

function docIcon(name){ return DOC_ICONS[(name||'').split('.').pop().toLowerCase()]||'📎'; }
function isImageDocName(name){ return ['jpg','jpeg','png','gif','webp','svg'].includes((name||'').split('.').pop().toLowerCase()); }
function driveThumbSrc(driveId, size=360){ return `https://drive.google.com/thumbnail?id=${encodeURIComponent(driveId)}&sz=w${size}`; }
function docProvider(doc){ return doc?.provider || (doc?.r2Key ? 'r2' : 'drive'); }
function docViewUrl(doc){
  if(docProvider(doc) === 'r2') return urlWithAuth('docs', { action:'viewDoc', docId:doc.id });
  return doc.driveUrl || urlWithAuth('docs', { action:'viewDoc', docId:doc.id });
}

function initDocSection(itemId){
  docsPendientes = []; docsActuales = [];
  document.getElementById('f_doc_list').innerHTML = '';
  if(itemId) loadItemDocs(itemId);
}

async function loadItemDocs(itemId){
  try{
    const res = await apiPost({action:'getDocs', itemId});
    if(res.ok){
      docsActuales = res.docs||[];
      renderDocList();
      syncMainPhotoFromDocs();
    }
  }catch(e){}
}

function syncMainPhotoFromDocs(){
  const input = document.getElementById('f_foto');
  if(!input || input.value) return;
  const imgDoc = docsActuales.find(d => isImageDocName(d.fileName) && (d.driveId || d.r2Key));
  if(imgDoc && typeof renderMainPhoto === 'function') {
    renderMainPhoto(docProvider(imgDoc) === 'r2' ? docViewUrl(imgDoc) : driveThumbSrc(imgDoc.driveId));
  }
}

async function addDocFiles(files){
  const name = document.getElementById('f_item')?.value.trim() || 'foto';
  const arr = Array.from(files);
  const firstImg = arr.find(f => f.type.startsWith('image/'));
  const processed = await Promise.all(arr.map(f => _processFile(f, name)));
  if(firstImg && typeof setMainPhotoFromFile === 'function') await setMainPhotoFromFile(firstImg);
  docsPendientes.push(...processed);
  renderDocList();
}

function removePendingDoc(idx){ docsPendientes.splice(idx,1); renderDocList(); }

async function deleteExistingDoc(docId){
  if(!confirm('¿Eliminar este documento?')) return;
  try{
    const res = await apiPost({action:'deleteDoc', docId});
    if(!res.ok) throw new Error(res.error);
    const old = docsActuales.find(d=>d.id===docId);
    docsActuales = docsActuales.filter(d=>d.id!==docId);
    const fotoInput = document.getElementById('f_foto');
    const oldPhotoRef = old ? (old.driveId || old.r2Key || '') : '';
    if(fotoInput?.value && oldPhotoRef && String(fotoInput.value).includes(String(oldPhotoRef))) renderMainPhoto('');
    renderDocList(); toast('Documento eliminado','ok');
  }catch(e){ toast('Error: '+e.message,'err'); }
}

function renderDocList(){
  const el = document.getElementById('f_doc_list');
  const ex = docsActuales.map(d=>`
    <div class="doc-row">
      <span class="di">${docIcon(d.fileName)}</span>
      <span class="dn" title="${d.fileName}">${d.fileName}</span>
      <a class="dv" href="${docViewUrl(d)}" target="_blank">Ver</a>
      <button class="dx" onclick="deleteExistingDoc(${d.id})" title="Eliminar">✕</button>
    </div>`).join('');
  const pe = docsPendientes.map((f,i)=>`
    <div class="doc-row dp">
      <span class="di">${docIcon(f.name)}</span>
      <span class="dn" title="${f.name}">${f.name} <span style="color:var(--muted);font-size:10px">${(f.size/1024).toFixed(0)} KB · pendiente</span></span>
      <button class="dx" onclick="removePendingDoc(${i})" title="Quitar">✕</button>
    </div>`).join('');
  el.innerHTML = ex + pe;
}

function _processFile(file, itemName){
  if(!file.type.startsWith('image/')) return Promise.resolve(file);
  const MAX = 1400, QUALITY = 0.5;
  const safe = (itemName||'foto').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g,'')
    .replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'').substring(0,30) || 'foto';
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
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      c.toBlob(blob => {
        resolve(new File([blob], _photoFileName(safe), {type:'image/jpeg'}));
      }, 'image/jpeg', QUALITY);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

function _photoFileName(base){
  const d = new Date();
  const pad = n => String(n).padStart(2,'0');
  const ms = String(d.getMilliseconds()).padStart(3,'0');
  _docNameSeq = (_docNameSeq + 1) % 100;
  const seq = String(_docNameSeq).padStart(2,'0');
  const stamp = `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}_${ms}${seq}`;
  return `${base}_${stamp}.jpg`;
}

function fileToBase64(file){
  return new Promise((res,rej)=>{
    const r=new FileReader();
    r.onload=()=>res(r.result.split(',')[1]);
    r.onerror=rej;
    r.readAsDataURL(file);
  });
}

// ─── MODAL DOCS INDEPENDIENTE ────────────────────────────
let _dmItem = null;
let _dmActuales = [];
let _dmPendientes = [];

async function openDocsModal(itemId){
  const item = items.find(x=>Number(x.id)===Number(itemId));
  if(!item) return;
  _dmItem = item;
  _dmActuales = [];
  _dmPendientes = [];
  document.getElementById('docsModalTitle').textContent = `📎 ${item.item}`;
  document.getElementById('dm_doc_list').innerHTML = '<div style="color:var(--muted);font-size:13px;padding:8px 0">Cargando...</div>';
  document.getElementById('mDocs').classList.add('open');
  try {
    const res = await apiPost({action:'getDocs', itemId});
    if(res.ok) _dmActuales = res.docs || [];
  } catch(e) {}
  _renderDmList();
}

function closeDocsModal(){ document.getElementById('mDocs').classList.remove('open'); _dmItem=null; _dmPendientes=[]; }

async function addDocsModalFiles(files){
  const name = _dmItem?.item || 'foto';
  const processed = await Promise.all(Array.from(files).map(f => _processFile(f, name)));
  _dmPendientes.push(...processed);
  _renderDmList();
}

function _renderDmList(){
  const el = document.getElementById('dm_doc_list');
  const ex = _dmActuales.map(d=>`
    <div class="doc-row">
      <span class="di">${docIcon(d.fileName)}</span>
      <span class="dn" title="${d.fileName}">${d.fileName}</span>
      <a class="dv" href="${docViewUrl(d)}" target="_blank">Ver</a>
      <button class="dx" onclick="_dmDeleteDoc(${d.id})" title="Eliminar">✕</button>
    </div>`).join('');
  const pe = _dmPendientes.map((f,i)=>`
    <div class="doc-row dp">
      <span class="di">${docIcon(f.name)}</span>
      <span class="dn">${f.name} <span style="color:var(--muted);font-size:10px">${(f.size/1024).toFixed(0)} KB · pendiente</span></span>
      <button class="dx" onclick="_dmPendientes.splice(${i},1);_renderDmList()" title="Quitar">✕</button>
    </div>`).join('');
  el.innerHTML = (ex+pe) || '<div style="color:var(--muted);font-size:13px;padding:8px 0">Sin documentos adjuntos.</div>';
}

async function _dmDeleteDoc(docId){
  if(!confirm('¿Eliminar este documento?')) return;
  try {
    const res = await apiPost({action:'deleteDoc', docId});
    if(!res.ok) throw new Error(res.error);
    _dmActuales = _dmActuales.filter(d=>d.id!==docId);
    _renderDmList(); toast('Documento eliminado','ok');
  } catch(e){ toast('Error: '+e.message,'err'); }
}

async function saveDocsModal(){
  if(!_dmPendientes.length){ closeDocsModal(); return; }
  if(!_dmItem) return;
  const btn = document.getElementById('btnDocsSave');
  btn.disabled = true; btn.textContent = '⏳ Subiendo...';
  const aulaName = AULAS.find(a=>a.id===_dmItem.aula)?.name || _dmItem.aula;
  const failed = [];
  let saved = 0;
  for(const file of [..._dmPendientes]){
    try {
      toast(`Subiendo ${file.name}…`,'ok');
      const data = await fileToBase64(file);
      const res = await apiPost({action:'uploadDoc', itemId:_dmItem.id, itemNombre:_dmItem.item,
        aulaId:_dmItem.aula, aulaName, fileName:file.name, mimeType:file.type||'application/octet-stream', data});
      if(!res.ok) throw new Error(res.error);
      if(res.doc) _dmActuales.push(res.doc);
      saved++;
    } catch(e){
      failed.push(file);
      toast(`Error: ${e.message}`,'err');
    }
  }
  _dmPendientes = failed;
  _renderDmList();
  btn.disabled = false; btn.textContent = '💾 Guardar documentos';
  if(saved) toast(`${saved} documento${saved!==1?'s':''} guardado${saved!==1?'s':''}`,'ok');
  if(failed.length) toast(`${failed.length} documento${failed.length!==1?'s':''} pendiente${failed.length!==1?'s':''} por error`,'err');
}

async function uploadPendingDocs(itemId, itemNombre, aulaId){
  if(!docsPendientes.length) return;
  const aulaName = AULAS.find(a=>a.id===aulaId)?.name || aulaId;
  const failed = [];
  for(const file of [...docsPendientes]){
    try{
      toast(`Subiendo ${file.name}…`,'ok');
      const data = await fileToBase64(file);
      const res = await apiPost({action:'uploadDoc', itemId, itemNombre, aulaId, aulaName,
        fileName:file.name, mimeType:file.type||'application/octet-stream', data});
      if(!res.ok) throw new Error(res.error);
    }catch(e){
      failed.push(file);
      toast(`Error con ${file.name}: ${e.message}`,'err');
    }
  }
  docsPendientes = failed;
}
