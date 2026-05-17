// Modal del historial de acciones.

let historialData = [];

function historialText(value) {
  return String(value || '').toLowerCase();
}

function historialEsc(value) {
  return String(value ?? '-').replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[ch]));
}

function historialBadgeClass(action) {
  return 'badge-' + String(action || 'accion').toLowerCase().replace(/[^a-z0-9_-]+/g, '-');
}

function openHistorialModal() {
  if (!SESSION || (SESSION.usuario || '').toLowerCase() !== 'seba') {
    toast('Solo el administrador puede acceder al historial', 'err');
    return;
  }

  const modal = document.getElementById('mHistorial');
  modal.style.display = 'flex';
  modal.classList.add('open');
  cargarHistorial();
}

function closeHistorialModal() {
  const modal = document.getElementById('mHistorial');
  modal.classList.remove('open');
  modal.style.display = 'none';
}

async function cargarHistorial() {
  const tbody = document.getElementById('historialTbody');
  const empty = document.getElementById('historialEmpty');
  const table = document.getElementById('historialTable');
  const summary = document.getElementById('historialSummary');

  tbody.innerHTML = '';
  empty.textContent = 'Cargando...';
  empty.style.display = 'block';
  table.style.display = 'none';
  if (summary) summary.textContent = 'Cargando...';

  try {
    historialData = await apiGet('historial');
    populateActionFilter(historialData);

    if (!historialData || historialData.length === 0) {
      empty.textContent = 'No hay historial registrado aun';
      if (summary) summary.textContent = '0 acciones';
      return;
    }

    renderHistorial(historialData);
  } catch (err) {
    console.error('Error loading historial:', err);
    empty.textContent = 'Error al cargar el historial: ' + err.message;
    if (summary) summary.textContent = 'Error de carga';
  }
}

function renderHistorial(data) {
  const tbody = document.getElementById('historialTbody');
  const empty = document.getElementById('historialEmpty');
  const table = document.getElementById('historialTable');
  const summary = document.getElementById('historialSummary');

  if (summary) summary.textContent = `${data.length} de ${historialData.length} acciones`;

  if (!data.length) {
    tbody.innerHTML = '';
    table.style.display = 'none';
    empty.textContent = 'No hay acciones que coincidan con los filtros.';
    empty.style.display = 'block';
    return;
  }

  empty.style.display = 'none';
  table.style.display = 'table';
  tbody.innerHTML = data.map(h => `
    <tr>
      <td class="ts">${historialEsc(h.timestamp)}</td>
      <td class="usr">${historialEsc(h.usuario)}</td>
      <td class="act"><span class="badge ${historialBadgeClass(h.accion)}">${historialEsc(h.accion)}</span></td>
      <td class="que">${historialEsc(h.que)}</td>
      <td class="nom">${historialEsc(h.nombre)}</td>
      <td class="det" title="${historialEsc(h.detalles)}">${historialEsc(h.detalles)}</td>
    </tr>
  `).join('');
}

function populateActionFilter(data) {
  const select = document.getElementById('filterAccion');
  const current = select.value;
  const actions = [...new Set((data || []).map(h => h.accion).filter(Boolean))]
    .sort((a, b) => String(a).localeCompare(String(b), 'es', { sensitivity: 'base' }));

  select.innerHTML = '<option value="">Todas las acciones</option>' +
    actions.map(action => `<option value="${historialEsc(action)}">${historialEsc(action)}</option>`).join('');

  if (actions.includes(current)) select.value = current;
}

function filtrarHistorial() {
  const usuario = historialText(document.getElementById('filterUsuario').value);
  const accion = document.getElementById('filterAccion').value;
  const que = historialText(document.getElementById('filterQue').value);

  const filtered = historialData.filter(h => {
    const matchUsr = !usuario || historialText(h.usuario).includes(usuario);
    const matchAct = !accion || h.accion === accion;
    const haystack = [h.que, h.nombre, h.detalles, h.accion, h.timestamp].map(historialText).join(' ');
    const matchQue = !que || haystack.includes(que);
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

document.addEventListener('DOMContentLoaded', () => {
  const usuario = document.getElementById('filterUsuario');
  const accion = document.getElementById('filterAccion');
  const que = document.getElementById('filterQue');
  if (usuario) usuario.addEventListener('input', filtrarHistorial);
  if (accion) accion.addEventListener('change', filtrarHistorial);
  if (que) que.addEventListener('input', filtrarHistorial);
});
