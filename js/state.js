// ═════════════════════════════════════════════════════════
// ESTADO
// ═════════════════════════════════════════════════════════
// Backend: Cloudflare Workers (mismo origen, no necesita URL externa)
let SESSION = JSON.parse(localStorage.getItem('inv_session') || 'null');
let items = [];
let profesores = [];
let prestamos = [];
let UBICACIONES = [];
let cf = null;
let currentCiclo = null;
let view = 'table';
let sk = 'item', sa = true;
let eid = null;
let currentPresTab = 'activos';
let prestarItemId = null;
let devolverPresId = null;
let itemsLoaded = false;

function setConn(state, txt){
  const el = document.getElementById('connStatus');
  el.className = 'conn-status ' + state;
  document.getElementById('connTxt').textContent = txt;
}

function materialType(item){
  const raw = String(item?.tipo_material || item?.tipoMaterial || '').trim().toLowerCase();
  if(raw === 'inventariable') return 'inventariable';
  if(raw === 'consumible') return 'consumible';
  if(item?.es_contenedor == 1 || item?.es_contenedor === true) return 'inventariable';
  return 'consumible';
}

function isConsumible(item){
  return materialType(item) === 'consumible';
}

function isLowStock(item){
  return isConsumible(item) && Number(item?.qty) <= Number(item?.min);
}

function show(id){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  const fab=document.getElementById('fabNuevo');
  if(fab && id!=='pS') fab.style.display='none';
}

function needsMaintenance(item){
  const status = String(item?.mantEstado || '').trim().toLowerCase();
  if(status === 'resuelto' || status === 'reparado') return false;
  return item?.mant === true || item?.mant === 1 || String(item?.mant || '').trim() === '1' || item?.est === 'Avería';
}
