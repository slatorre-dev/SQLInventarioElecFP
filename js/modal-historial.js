// Modal del historial de acciones (solo visible para Seba)

let historialData = [];

function openHistorialModal() {
  // Validar que sea Seba
  if (!SESSION || (SESSION.usuario || '').toLowerCase() !== 'seba') {
    toast('Solo el administrador puede acceder al historial', 'err');
    return;
  }

  document.getElementById('mHistorial').style.display = 'flex';
  cargarHistorial();
}

function closeHistorialModal() {
  document.getElementById('mHistorial').style.display = 'none';
}

async function cargarHistorial() {
  const tbody = document.getElementById('historialTbody');
  const empty = document.getElementById('historialEmpty');
  const table = document.getElementById('historialTable');

  tbody.innerHTML = '';
  empty.textContent = 'Cargando...';
  empty.style.display = 'block';
  table.style.display = 'none';

  try {
    console.log('[cargarHistorial] Fetching /api/historial?usuario=seba');
    const response = await fetch(`/api/historial?usuario=seba`);
    console.log('[cargarHistorial] Response status:', response.status);

    if (!response.ok) {
      empty.textContent = 'No tienes permisos para ver el historial';
      return;
    }

    historialData = await response.json();
    console.log('[cargarHistorial] Data:', historialData);

    if (!historialData || historialData.length === 0) {
      empty.textContent = 'No hay historial registrado aún';
      return;
    }

    empty.style.display = 'none';
    table.style.display = 'table';
    renderHistorial(historialData);
  } catch (err) {
    console.error('Error loading historial:', err);
    empty.textContent = 'Error al cargar el historial: ' + err.message;
  }
}

function renderHistorial(data) {
  const tbody = document.getElementById('historialTbody');
  tbody.innerHTML = data.map(h => `
    <tr>
      <td class="ts">${h.timestamp || '—'}</td>
      <td class="usr">${h.usuario || '—'}</td>
      <td class="act"><span class="badge badge-${h.accion}">${h.accion || '—'}</span></td>
      <td class="que">${h.que || '—'}</td>
      <td class="nom">${h.nombre || '—'}</td>
      <td class="det">${h.detalles || '—'}</td>
    </tr>
  `).join('');
}

function filtrarHistorial() {
  const usuario = document.getElementById('filterUsuario').value.toLowerCase();
  const accion = document.getElementById('filterAccion').value;
  const que = document.getElementById('filterQue').value.toLowerCase();

  const filtered = historialData.filter(h => {
    const matchUsr = !usuario || (h.usuario || '').toLowerCase().includes(usuario);
    const matchAct = !accion || h.accion === accion;
    const matchQue = !que || (h.que || '').toLowerCase().includes(que);
    return matchUsr && matchAct && matchQue;
  });

  renderHistorial(filtered);
}

function limpiarFiltrosHistorial() {
  document.getElementById('filterUsuario').value = '';
  document.getElementById('filterAccion').value = '';
  document.getElementById('filterQue').value = '';
  renderHistorial(historialData);
}

// Eventos de filtro
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('filterUsuario')) {
    document.getElementById('filterUsuario').addEventListener('input', filtrarHistorial);
    document.getElementById('filterAccion').addEventListener('change', filtrarHistorial);
    document.getElementById('filterQue').addEventListener('input', filtrarHistorial);
  }
});
