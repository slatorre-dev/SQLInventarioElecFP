// ═════════════════════════════════════════════════════════
// DOCUMENTACIÓN DEL DEPARTAMENTO — Hub de accesos directos
// ═════════════════════════════════════════════════════════
// SharePoint bloquea el iframe via X-Frame-Options, asi que
// renderizamos una rejilla de tarjetas que abren cada recurso
// en pestania nueva. Anadir/quitar entradas editando los arrays.
// ═════════════════════════════════════════════════════════

const DOCS_DPTO_LINKS = [
  {
    icon: '⚖️',
    title: 'Normativa',
    desc: 'Resoluciones, órdenes y decretos',
    th: 'th-blue',
    url: 'https://crfpcastilla.sharepoint.com/:f:/r/sites/EPT13000220E01-Dpto.ElectricidadyElectrnica/Documentos%20compartidos/Dpto.%20Electricidad%20y%20Electr%C3%B3nica/Normativa?csf=1&web=1&e=N4zkQk'
  },
  {
    icon: '📁',
    title: 'Carpeta digital',
    desc: 'Curso 2025-26',
    th: 'th-purple',
    url: 'https://crfpcastilla.sharepoint.com/:f:/r/sites/EPT13000220E01/Documentos%20compartidos/General/CURSO_2025-26/CARPETA%20DIGITAL?csf=1&web=1&e=SSmnlf'
  },
  {
    icon: '📝',
    title: 'Modelo de pedidos',
    desc: 'Plantilla calidad (Word)',
    th: 'th-amber',
    url: 'https://crfpcastilla.sharepoint.com/:w:/r/sites/EPT13000220E01-Dpto.ElectricidadyElectrnica/Documentos%20compartidos/Dpto.%20Electricidad%20y%20Electr%C3%B3nica/Pedidos%20material%20modelo%20calidad.doc?d=wead504113932496f9bce0fb6e8531353&csf=1&web=1&e=Qoj1EQ'
  },
  {
    icon: '📂',
    title: 'Sitio del departamento',
    desc: 'Carpeta raíz en SharePoint',
    th: 'th-teal',
    url: 'https://crfpcastilla.sharepoint.com/sites/EPT13000220E01-Dpto.ElectricidadyElectrnica'
  },
];

const DOCS_DPTO_EXT = [
  { title: 'Portal de Educación JCCM',          url: 'https://www.educa.jccm.es/' },
  { title: 'TodoFP — Ministerio de Educación',  url: 'https://www.todofp.es/' },
  { title: 'BOE — Boletín Oficial del Estado',  url: 'https://www.boe.es/' },
  { title: 'DOCM — Diario Oficial CLM',         url: 'https://docm.castillalamancha.es/' },
];

function renderDocsHub(){
  const grid = document.getElementById('docsGrid');
  if(!grid) return;
  grid.innerHTML = DOCS_DPTO_LINKS.map(d => `
    <a href="${d.url}" target="_blank" rel="noopener" class="docs-card ${d.th}">
      <div class="docs-card-arrow">↗</div>
      <div class="docs-card-icon">${d.icon}</div>
      <div class="docs-card-title">${d.title}</div>
      <div class="docs-card-desc">${d.desc}</div>
    </a>
  `).join('');

  const links = document.getElementById('docsLinks');
  if(!links) return;
  links.innerHTML = DOCS_DPTO_EXT.map(l => `
    <a href="${l.url}" target="_blank" rel="noopener" class="docs-link">
      <span class="docs-link-arrow">↗</span>
      <span>${l.title}</span>
    </a>
  `).join('');
}

function goDocsDpto(){
  _push({page:'docs'}, '#docs');
  cf = null; currentCiclo = null;
  document.getElementById('bc').innerHTML =
    `<span class="bc-link" onclick="goHome()">Inicio</span><span class="sep">›</span><strong>📂 Documentación</strong>`;
  document.getElementById('btnN').style.display = 'none';
  document.getElementById('btnE').style.display = 'none';
  _hideHomeButtons();
  renderDocsHub();
  show('pDocsDpto');
}