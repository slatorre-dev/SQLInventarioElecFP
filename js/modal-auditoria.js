// ══ AUDITORÍA DE DATOS ══

const CAMPOS_CRITICOS = [
  { key: 'cat',  label: 'Categoría' },
  { key: 'mod',  label: 'Módulo/Ciclo' },
  { key: 'aula', label: 'Aula' },
];

const CAMPOS_SECUNDARIOS = [
  { key: 'ref',       label: 'Referencia' },
  { key: 'loc',       label: 'Ubicación' },
  { key: 'proveedor', label: 'Proveedor' },
];

const TODOS_LOS_CAMPOS = [...CAMPOS_CRITICOS, ...CAMPOS_SECUNDARIOS];

let auditoriaData = [];
let auditoriaFiltroActual = 'all';

function openAuditoriaModal() {
  if (!can('config.manage')) {
    toast('Sin permisos para acceder a auditoría', 'err');
    return;
  }

  const modal = document.getElementById('mAuditoria');
  modal.style.display = 'flex';
  modal.classList.add('open');

  cargarAuditoria();
}

function closeAuditoriaModal() {
  const modal = document.getElementById('mAuditoria');
  modal.classList.remove('open');
  modal.style.display = 'none';
}

function cargarAuditoria() {
  const empty = document.getElementById('auditoriaEmpty');
  empty.style.display = 'none';

  // Usar items ya cargado en memoria
  if (!items || items.length === 0) {
    empty.textContent = 'Cargando...';
    empty.style.display = 'block';
    return;
  }

  // Analizar cada item y encontrar campos faltantes
  auditoriaData = items.map(item => ({
    ...item,
    problemas: getItemProblemas(item)
  })).filter(item => item.problemas.length > 0);

  console.log('auditoriaData:', auditoriaData);
  console.log('items sample:', items.slice(0, 3));

  // Renderizar con filtro actual
  renderAuditoria(auditoriaFiltroActual);

  // Actualizar botones de filtro con contadores
  updateFiltroButtons();
}

function getItemProblemas(item) {
  return TODOS_LOS_CAMPOS
    .filter(c => !item[c.key] || item[c.key].toString().trim() === '')
    .map(c => c.label);
}

function renderAuditoria(filtro) {
  const tbody = document.getElementById('auditoriaTbody');
  const empty = document.getElementById('auditoriaEmpty');
  const info = document.getElementById('auditoriaInfo');

  tbody.innerHTML = '';

  // Filtrar items según el tipo de problema
  let items = auditoriaData;
  if (filtro !== 'all') {
    const field = TODOS_LOS_CAMPOS.find(f => f.key === filtro);
    if (field) {
      items = auditoriaData.filter(item =>
        item.problemas.includes(field.label)
      );
    }
  }

  // Actualizar información
  const total = auditoriaData.length;
  const mostrados = items.length;
  if (filtro === 'all') {
    info.innerHTML = `<strong>${total} items con campos faltantes</strong>`;
  } else {
    const fieldName = TODOS_LOS_CAMPOS.find(f => f.key === filtro)?.label || filtro;
    info.innerHTML = `<strong>${mostrados} items sin ${fieldName}</strong> (de ${total} total)`;
  }

  if (items.length === 0) {
    empty.textContent = filtro === 'all'
      ? 'No hay items con campos faltantes ✓'
      : 'No se encontraron items con ese problema ✓';
    empty.style.display = 'block';
    return;
  }

  empty.style.display = 'none';

  // Renderizar filas
  items.forEach(item => {
    const tr = document.createElement('tr');
    const problemasStr = item.problemas.join(', ');

    tr.innerHTML = `
      <td class="ref-cell">${escapeHtml(item.ref || '—')}</td>
      <td class="name-cell">${escapeHtml(item.item || '—')}</td>
      <td class="aula-cell">${escapeHtml(item.aula || '—')}</td>
      <td class="problemas-cell">
        <span class="problemas-badge">${escapeHtml(problemasStr)}</span>
      </td>
      <td class="action-cell">
        <button class="mini-btn" onclick="abrirItemParaEditar(${item.id})">✏️ Editar</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function filtrarAuditoria(filtro) {
  auditoriaFiltroActual = filtro;

  // Actualizar botones activos
  document.querySelectorAll('#auditoriaFiltros .abtn').forEach(btn => {
    btn.classList.remove('active');
  });

  const activeBtn = Array.from(document.querySelectorAll('#auditoriaFiltros .abtn'))
    .find(btn => {
      const onclick = btn.getAttribute('onclick');
      return onclick && onclick.includes(`'${filtro}'`);
    });
  if (activeBtn) activeBtn.classList.add('active');

  renderAuditoria(filtro);
}

function updateFiltroButtons() {
  // Contar items con cada tipo de problema
  const counts = {};
  TODOS_LOS_CAMPOS.forEach(field => {
    counts[field.key] = auditoriaData.filter(item =>
      item.problemas.includes(field.label)
    ).length;
  });

  // Actualizar texto de botones
  const botones = document.querySelectorAll('#auditoriaFiltros .abtn');
  botones.forEach(btn => {
    const onclick = btn.getAttribute('onclick');

    if (onclick.includes("'all'")) {
      btn.innerHTML = `Todos (${auditoriaData.length})`;
    } else {
      TODOS_LOS_CAMPOS.forEach(field => {
        if (onclick.includes(`'${field.key}'`)) {
          btn.innerHTML = `Sin ${field.key === 'aula' ? 'aula' : field.label.toLowerCase()} (${counts[field.key]})`;
        }
      });
    }
  });
}

function abrirItemParaEditar(itemId) {
  const item = items.find(i => i.id === itemId);
  if (!item) {
    toast('Item no encontrado', 'err');
    return;
  }

  // Abrir modal de edición
  openItemModal(item.id);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
