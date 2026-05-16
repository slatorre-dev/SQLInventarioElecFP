// ═════════════════════════════════════════════════════════
// LOGIN
// ═════════════════════════════════════════════════════════
async function doLogin(){
  const usuario = document.getElementById('loginUser').value.trim();
  const password = document.getElementById('loginPass').value;
  const errorEl = document.getElementById('loginError');
  const btn = document.getElementById('loginBtn');

  errorEl.classList.remove('show');
  if(!usuario || !password){
    errorEl.textContent = 'Introduce usuario y contraseña';
    errorEl.classList.add('show');
    return;
  }

  btn.disabled = true; btn.textContent = 'Comprobando...';
  try {
    const u = encodeURIComponent(usuario);
    const p = encodeURIComponent(password);
    const r = await fetch(`/api/auth?action=login&u=${u}&p=${p}`);
    if(!r.ok) throw new Error('HTTP '+r.status);
    const res = await r.json();
    if(!res.ok) throw new Error(res.error||'Credenciales incorrectas');
    if(!res.user) throw new Error('Sin datos de usuario. Comprueba que la BD tiene la tabla Usuarios con datos.');

    SESSION = {
      usuario: usuario,
      password: password,
      nombre: res.user.nombre || usuario,
      rol: res.user.rol || 'profesor',
      email: res.user.email || ''
    };
    localStorage.setItem('inv_session', JSON.stringify(SESSION));
    document.getElementById('loginUser').value = '';
    document.getElementById('loginPass').value = '';
    showUserChip();
    _showOverlay();
    loadData();
  } catch(err) {
    console.error(err);
    errorEl.textContent = err.message || 'Error de conexión';
    errorEl.classList.add('show');
  } finally {
    btn.disabled = false; btn.textContent = 'Entrar';
  }
}

function logout(){
  if(!confirm('¿Cerrar sesión?')) return;
  localStorage.removeItem('inv_session');
  SESSION = null;
  items = [];
  cf = null;
  currentCiclo = null;
  document.getElementById('userChip').style.display = 'none';
  document.getElementById('btnN').style.display = 'none';
  document.getElementById('btnE').style.display = 'none';
  document.getElementById('bc').innerHTML = '';
  setConn('', 'Sin sesión');
  show('pLogin');
}

function showUserChip(){
  if(!SESSION) return;
  const initials = (SESSION.nombre||SESSION.usuario).split(' ').map(s=>s[0]).join('').slice(0,2).toUpperCase();
  document.getElementById('userAvatar').textContent = initials;
  document.getElementById('userName').textContent = SESSION.nombre || SESSION.usuario;
  document.getElementById('userChip').style.display = 'flex';
  if(typeof applyRoleUI === 'function') applyRoleUI();
}

function syncSessionUser(user){
  if(!SESSION || !user) return;
  SESSION = {
    ...SESSION,
    nombre: user.nombre || SESSION.nombre || SESSION.usuario,
    rol: user.rol || SESSION.rol || 'profesor',
    email: user.email || SESSION.email || ''
  };
  localStorage.setItem('inv_session', JSON.stringify(SESSION));
}

function _showOverlay(){
  const ov = document.getElementById('loadOverlay');
  if(!ov) return;
  ov.classList.remove('lo-hide');
  ov.style.display = '';
}

function _hideOverlay(){
  const ov = document.getElementById('loadOverlay');
  if(!ov || ov.style.display==='none') return;
  ov.classList.add('lo-hide');
  setTimeout(()=>{ ov.style.display='none'; }, 480);
}

async function loadData(){
  if(!SESSION){ _hideOverlay(); show('pLogin'); setConn('','Sin sesión'); return; }
  itemsLoaded = false;
  showUserChip();
  show('pH');
  setConn('loading','Cargando...');
  const bar = document.getElementById('loadBar');
  bar.className = ''; bar.style.width = '0'; bar.offsetWidth;
  bar.className = 'is-loading';

  // ── Fase 1: metadatos ligeros (aulas, cats, ciclos) ──────
  try{
    const meta = await apiGet('meta');
    if(!meta.ok){
      if(meta.error && meta.error.includes('autorizado')){
        localStorage.removeItem('inv_session');
        SESSION = null;
        document.getElementById('userChip').style.display = 'none';
        _hideOverlay();
        show('pLogin');
        setConn('err','Sesión expirada');
        bar.className = '';
        return;
      }
      throw new Error(meta.error||'Error');
    }
    syncSessionUser(meta.user);
    showUserChip();
    if(meta.aulas && meta.aulas.length) AULAS = meta.aulas;
    if(meta.cats && meta.cats.length) CATS = Object.fromEntries(meta.cats.sort((a,b)=>a.orden-b.orden).map(c=>[c.name,{c:c.c,bg:c.bg,i:c.i}]));
    if(meta.ubicaciones) UBICACIONES = meta.ubicaciones;
    if(meta.ciclos && meta.ciclos.length) CICLOS = meta.ciclos;
    document.getElementById('btnN').style.display='flex';
    document.getElementById('btnPres').style.display='flex';
    document.getElementById('btnPed').style.display='flex';
    if(typeof applyRoleUI === 'function') applyRoleUI();
    updatePedBadge();
    _hideOverlay();
    bar.className = 'is-done';
    setTimeout(()=>{bar.className='';bar.style.width='0';}, 500);
    if(location.hash && location.hash.length > 1) navigateFromHash(location.hash);
    else if(cf) openSub(); else if(currentCiclo) openCiclo(currentCiclo.id); else goHome();
  }catch(err){
    console.error(err);
    setConn('err','Error de conexión');
    show('pH');
    document.getElementById('hStats').innerHTML=`<div class="empty" style="grid-column:1/-1"><div class="ei">⚠️</div><div class="et">No se pudo conectar.<br><small>${err.message}</small></div></div>`;
    _hideOverlay();
    bar.className = '';
    return;
  }

  // ── Fase 2: datos pesados en background (items, prestamos, profesores) ──
  setConn('loading','Cargando inventario...');
  try{
    const res = await apiGet('list');
    if(!res.ok) throw new Error(res.error||'Error');
    // Descomprimir formato compacto (array de arrays → objetos)
    if(res.itemsC && res.itemsH){
      items = res.itemsC.map(row => Object.fromEntries(res.itemsH.map((h,i) => [h, row[i]])));
    } else {
      items = res.items || [];
    }
    profesores = res.profesores || [];
    prestamos = res.prestamos || [];
    itemsLoaded = true;
    setConn('ok',`${items.length} ítems · sincronizado`);
    if(typeof renderHome === 'function' && document.getElementById('pH').classList.contains('active')) renderHome();
    else if(cf) openSub();
  }catch(err){
    console.error(err);
    setConn('err','Error cargando inventario');
  }
}

// ─── INIT ────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function(){
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeM();closeConf();closeAulasModal();closeUbicacionesModal();closePrestar();closeDevolver();closeProfModal();closeImport();closeExportModal();closeDocsModal();closeDelModal();closeHistorial();closeQrScanner();closeUsuariosModal();closeModulosUsuario();closePrintModal()}});
  ['loginUser','loginPass'].forEach(id=>{
    document.getElementById(id).addEventListener('keydown',e=>{if(e.key==='Enter')doLogin()});
  });
  // Detectar enlace de recuperación de contraseña
  if(location.hash.startsWith('#reset/')){
    showResetPage(location.hash.slice(7));
    return;
  }
  loadData();
});
