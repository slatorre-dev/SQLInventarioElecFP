/**
 * Agente IA — Widget flotante para inventarioelecfp.pages.dev
 * Uso: <script src="agente-widget.js"></script>  (antes de </body>)
 *
 * Requisitos:
 *   - La página ya tiene sesión iniciada: window._appState.usuario y .password
 *   - O bien se puede configurar AGENTE_USER / AGENTE_PASS como variables globales
 *   - Necesita cabeceras CORS en /api/* (ver README)
 */

(function () {
  'use strict';

  // ── Config ────────────────────────────────────────────────────────────────
  var API_BASE = '';          // vacío = mismo dominio (relativo)
  var AI_ENDPOINT = '/proxy/ai';  // Pages Function — el token vive en el servidor
  var MODEL = 'gpt-4o-mini';     // GitHub Models: gpt-4o-mini, gpt-4o, meta-llama-3.1-70b-instruct...
  var AGENTE_NOMBRE = 'Volt';    // Nombre del agente IA

  // Obtener credenciales — usa SESSION global de la app (state.js)
  function getCreds() {
    if (typeof SESSION !== 'undefined' && SESSION && SESSION.usuario) {
      return { u: SESSION.usuario, p: SESSION.password || '' };
    }
    try {
      var saved = localStorage.getItem('inv_session');
      if (saved) { var s = JSON.parse(saved); return { u: s.usuario, p: s.password || '' }; }
    } catch(e) {}
    return null;
  }

  // ── API helpers ────────────────────────────────────────────────────────────
  function apiGet(path, params) {
    var creds = getCreds();
    var url = new URL(API_BASE + path, window.location.origin);
    if (creds) { url.searchParams.set('u', creds.u); url.searchParams.set('p', creds.p); }
    if (params) Object.keys(params).forEach(function(k){ url.searchParams.set(k, params[k]); });
    return fetch(url.toString()).then(function(r){ return r.json(); });
  }

  function apiPost(path, body) {
    var creds = getCreds();
    var url = new URL(API_BASE + path, window.location.origin);
    if (creds) { url.searchParams.set('u', creds.u); url.searchParams.set('p', creds.p); }
    return fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(function(r){ return r.json(); });
  }

  function decompressItems(data) {
    if (!data || !data.itemsH || !data.itemsC) return data && data.items ? data.items : [];
    return data.itemsC.map(function(row) {
      var obj = {};
      data.itemsH.forEach(function(h, i){ obj[h] = row[i]; });
      return obj;
    });
  }

  // ── GitHub Models streaming (formato OpenAI) ──────────────────────────────
  function streamAI(messages, systemExtra, onChunk) {
    var systemMsg = 'Eres VOLT, agente de inventario FP. Busca SIEMPRE en los resultados antes de responder. ' +
      'Reporta stock EXACTO. Si no aparece, di "No en inventario". ' +
      'Cuando el usuario quiera un material, localízalo y confirma disponibilidad. ' +
      'ACCIONES DISPONIBLES (se activan automáticamente con frases naturales):\n' +
      '- Pedir préstamo: "pedir prestado [ítem]", "me llevo el multímetro", "quiero coger el soldador"\n' +
      '- Devolver: "devuelve el multímetro de Juan", "devolver préstamo"\n' +
      '- Actualizar stock: "actualiza la cantidad de resistencias a 50", "quedan 20 condensadores"\n' +
      '- Cambiar estado: "el polímetro 3 está en avería", "cambia estado a deteriorado"\n' +
      '- Mantenimiento: "solicita mantenimiento para el soldador", "el osciloscopio necesita revisión"\n' +
      '- Añadir ítem: "añade un polímetro en el aula 35 en el armario metálico" (autocompleta aula y ubicación)\n' +
      '- Consultas: "¿stock bajo?", "¿quién tiene el osciloscopio?", "¿qué hay en el Aula 35?", "¿qué necesita mantenimiento?"\n' +
      'Cuando detectes una de estas intenciones, INDÍCALO brevemente. No inventes datos. ' +
      'Sé conciso. Responde en español. Usa tablas markdown si es útil.' +
      (systemExtra || '');

    var payload = {
      model: MODEL,
      max_tokens: 500,
      stream: true,
      messages: [{ role: 'system', content: systemMsg }].concat(messages)
    };

    return fetch(AI_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function(res) {
      if (!res.ok) return res.text().then(function(t){ throw new Error('API ' + res.status + ': ' + t); });
      var reader = res.body.getReader();
      var dec = new TextDecoder();
      var full = '';
      function pump() {
        return reader.read().then(function(ref) {
          if (ref.done) return full;
          dec.decode(ref.value).split('\n').forEach(function(line) {
            if (!line.startsWith('data: ') || line === 'data: [DONE]') return;
            try {
              var d = JSON.parse(line.slice(6));
              var delta = d.choices && d.choices[0].delta && d.choices[0].delta.content;
              if (delta) { full += delta; onChunk(delta); }
            } catch(e) {}
          });
          return pump();
        });
      }
      return pump();
    });
  }

  // ── CSS ────────────────────────────────────────────────────────────────────
  var css = `
    #agente-fab {
      position: fixed; top: 68px; right: 14px; z-index: 99998;
      height: 36px; padding: 0 18px; border-radius: 18px;
      background: linear-gradient(135deg, #1d4ed8, #0369a1);
      border: none; cursor: pointer; box-shadow: 0 4px 20px rgba(29,78,216,.5);
      display: flex; align-items: center; justify-content: center;
      font-size: 13px; font-weight: 700; letter-spacing: .3px; font-family: inherit; transition: opacity .2s, box-shadow .2s; white-space: nowrap; gap: 7px;
      color: white;
    }
    #agente-fab:hover { opacity: .9; box-shadow: 0 6px 24px rgba(29,78,216,.7); }
    #agente-fab .fab-badge {
      position: absolute; top: -4px; right: -4px;
      background: #ef4444; color: white; border-radius: 50%;
      width: 18px; height: 18px; font-size: 10px; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
    }

    #agente-panel {
      position: fixed; top: 0; right: 0; z-index: 99999;
      width: 420px; height: 100vh; max-height: 100vh;
      background: #070d1a; border-left: 1px solid #1e293b;
      display: flex; flex-direction: column;
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
      transform: translateY(-100vh); transition: transform .3s cubic-bezier(.4,0,.2,1);
      box-shadow: 0 8px 40px rgba(0,0,0,.6);
    }
    #agente-panel.open { transform: translateY(0); }

    @media (max-width: 480px) {
      #agente-panel { width: 100vw; }
    }

    .ag-header {
      background: #0a1628; border-bottom: 1px solid #1e293b;
      padding: 10px 14px; display: flex; align-items: center; gap: 10px;
      flex-shrink: 0;
    }
    .ag-header-title { flex: 1; }
    .ag-header-title .ag-title { font-size: 12px; font-weight: 700; color: #7dd3fc; letter-spacing: 1px; }
    .ag-header-title .ag-sub { font-size: 10px; color: #475569; }
    .ag-badge { padding: 2px 8px; border-radius: 9999px; font-size: 10px; font-weight: 600; }
    .ag-badge-green { background: #d1fae5; color: #065f46; }
    .ag-badge-yellow { background: #fef3c7; color: #92400e; }
    .ag-badge-red { background: #fee2e2; color: #991b1b; }
    .ag-close { background: none; border: none; color: #475569; cursor: pointer; font-size: 18px; padding: 4px; }
    .ag-close:hover { color: #94a3b8; }

    .ag-tabs {
      display: flex; border-bottom: 1px solid #1e293b;
      background: #0a1628; overflow-x: auto; flex-shrink: 0;
    }
    .ag-tab {
      background: transparent; border: none; border-bottom: 2px solid transparent;
      color: #475569; padding: 8px 12px; cursor: pointer; font-size: 11px;
      font-weight: 600; white-space: nowrap; font-family: inherit;
      transition: all .15s;
    }
    .ag-tab.active { background: #1e293b; border-bottom-color: #38bdf8; color: #7dd3fc; }

    .ag-body { flex: 1; overflow: hidden; display: flex; flex-direction: column; }
    .ag-panel { display: none; flex-direction: column; height: 100%; overflow-y: auto; padding: 14px; gap: 10px; }
    .ag-panel.active { display: flex; }

    /* Chat */
    .ag-messages { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; padding: 14px; }
    .ag-msg { max-width: 88%; padding: 9px 12px; border-radius: 10px; font-size: 12px; line-height: 1.6; }
    .ag-msg-user { background: #0369a1; color: #f1f5f9; align-self: flex-end; border-bottom-right-radius: 2px; }
    .ag-msg-ai { background: #1e293b; color: #e2e8f0; align-self: flex-start; border-bottom-left-radius: 2px; }
    .ag-msg-ai table { border-collapse: collapse; font-size: 11px; width: 100%; margin: 6px 0; }
    .ag-msg-ai th { background: #0f172a; color: #94a3b8; padding: 4px 8px; text-align: left; }
    .ag-msg-ai td { padding: 4px 8px; color: #e2e8f0; border-bottom: 1px solid #1e293b; }
    .ag-msg-ai strong { color: #f1f5f9; }
    .ag-msg-ai ul, .ag-msg-ai ol { padding-left: 16px; margin: 4px 0; }
    .ag-cursor { display: inline-block; width: 5px; height: 12px; background: #38bdf8; margin-left: 2px; animation: ag-blink 1s infinite; vertical-align: middle; }
    @keyframes ag-blink { 0%,100%{opacity:1} 50%{opacity:0} }
    .ag-dots { display: flex; gap: 4px; padding: 10px 14px; }
    .ag-dot { width: 6px; height: 6px; border-radius: 50%; background: #38bdf8; animation: ag-bounce 1.2s ease-in-out infinite; }
    @keyframes ag-bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
    .ag-quick { display: flex; flex-direction: column; gap: 6px; padding: 0 14px 10px; }
    .ag-quick-btn { background: #1e293b; border: 1px solid #334155; border-radius: 7px; color: #94a3b8; padding: 7px 10px; cursor: pointer; font-size: 11px; text-align: left; font-family: inherit; transition: all .15s; }
    .ag-quick-btn:hover { border-color: #38bdf8; color: #e2e8f0; }
    .ag-input-row { padding: 10px 14px; border-top: 1px solid #1e293b; display: flex; gap: 8px; flex-shrink: 0; }
    .ag-input { flex: 1; background: #0f172a; border: 1px solid #334155; border-radius: 7px; color: #f1f5f9; padding: 8px 10px; font-size: 12px; outline: none; font-family: inherit; }
    .ag-send { background: #0369a1; border: none; border-radius: 7px; color: white; padding: 8px 12px; cursor: pointer; font-size: 14px; }
    .ag-send:disabled { background: #1e293b; cursor: not-allowed; }

    /* Tablas genéricas */
    .ag-table-wrap { overflow-x: auto; }
    .ag-table { border-collapse: collapse; font-size: 11px; width: 100%; }
    .ag-table th { background: #1e293b; color: #94a3b8; padding: 5px 8px; text-align: left; white-space: nowrap; }
    .ag-table td { padding: 4px 8px; color: #e2e8f0; border-bottom: 1px solid #1e293b; white-space: nowrap; max-width: 160px; overflow: hidden; text-overflow: ellipsis; }
    .ag-table tr:nth-child(even) td { background: #111827; }

    /* Controles */
    .ag-btn { background: #1e293b; border: 1px solid #334155; border-radius: 7px; color: #f1f5f9; padding: 7px 12px; cursor: pointer; font-size: 11px; font-weight: 600; font-family: inherit; transition: opacity .15s; }
    .ag-btn:hover:not(:disabled) { opacity: .8; }
    .ag-btn:disabled { opacity: .4; cursor: not-allowed; }
    .ag-btn-blue { background: #0369a1; border-color: #7dd3fc; }
    .ag-label { color: #64748b; font-size: 10px; display: block; margin-bottom: 3px; }
    .ag-input-field { background: #0f172a; border: 1px solid #334155; border-radius: 6px; color: #f1f5f9; padding: 7px 9px; font-size: 11px; outline: none; width: 100%; box-sizing: border-box; font-family: inherit; }
    .ag-row { display: flex; gap: 8px; }
    .ag-col { flex: 1; }
    .ag-ai-result { background: #0f172a; border: 1px solid #1e293b; border-radius: 8px; padding: 10px; font-size: 11px; line-height: 1.7; color: #cbd5e1; margin-top: 4px; max-height: 300px; overflow-y: auto; }
    .ag-ai-result table { border-collapse: collapse; width: 100%; }
    .ag-ai-result th { background: #1e293b; color: #94a3b8; padding: 4px 8px; font-size: 10px; }
    .ag-ai-result td { padding: 4px 8px; border-bottom: 1px solid #1e293b; }
    .ag-ai-result strong { color: #f1f5f9; }
    .ag-section-title { color: #7dd3fc; font-size: 12px; font-weight: 700; margin: 0 0 4px; }
    .ag-badges { display: flex; gap: 6px; flex-wrap: wrap; }

    /* Item links en respuestas IA */
    .ag-item-link { color: #38bdf8; cursor: pointer; border-bottom: 1px dashed #38bdf8; transition: color .15s; }
    .ag-item-link:hover { color: #7dd3fc; border-bottom-color: #7dd3fc; }

    /* Login overlay */
    .ag-login { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; gap: 12px; padding: 24px; }
    .ag-login input { width: 100%; max-width: 260px; }
    .ag-login-title { color: #7dd3fc; font-size: 14px; font-weight: 700; }
    .ag-login-sub { color: #475569; font-size: 11px; }
    .ag-err { color: #ef4444; font-size: 11px; }
  `;

  // ── Markdown → HTML simple ─────────────────────────────────────────────────
  function md2html(text) {
    var html = '';
    var lines = text.split('\n');
    var inTable = false;
    var tableLines = [];

    function flushTable() {
      if (!tableLines.length) return;
      var rows = tableLines.map(function(l){ return l.split('|').slice(1,-1).map(function(c){ return c.trim(); }); });
      html += '<table><thead><tr>' + rows[0].map(function(c){ return '<th>' + esc(c) + '</th>'; }).join('') + '</tr></thead><tbody>';
      rows.slice(2).forEach(function(r){ html += '<tr>' + r.map(function(c){ return '<td>' + esc(c) + '</td>'; }).join('') + '</tr>'; });
      html += '</tbody></table>';
      tableLines = []; inTable = false;
    }

    lines.forEach(function(line) {
      if (line.startsWith('|')) { inTable = true; tableLines.push(line); return; }
      if (inTable) flushTable();
      if (!line.trim()) { html += '<br>'; return; }
      if (line.startsWith('### ')) { html += '<strong style="color:#38bdf8;display:block;margin:8px 0 4px">' + esc(line.slice(4)) + '</strong>'; return; }
      if (line.startsWith('## ')) { html += '<strong style="color:#7dd3fc;display:block;margin:10px 0 4px;font-size:12px">' + esc(line.slice(3)) + '</strong>'; return; }
      if (line.startsWith('- ')) { html += '<div style="padding-left:10px;margin-bottom:2px">· ' + inlineMd(line.slice(2)) + '</div>'; return; }
      html += '<div style="margin-bottom:2px">' + inlineMd(line) + '</div>';
    });
    if (inTable) flushTable();
    return html;
  }

  function inlineMd(text) {
    return esc(text).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  }

  function esc(t) {
    return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  // ── Estado global del widget ───────────────────────────────────────────────
  var state = {
    open: false,
    tab: 'chat',
    loading: false,
    dataLoaded: false,
    inventario: [],
    messages: [],
    // csv
    csvParsed: [],
    // audit filter
    auditFiltro: 'todos',
  };

  // ── DOM refs ───────────────────────────────────────────────────────────────
  var el = {};

  // ── Render helpers ─────────────────────────────────────────────────────────
  function badge(color, text) {
    return '<span class="ag-badge ag-badge-' + color + '">' + esc(text) + '</span>';
  }

  function renderBadgeEl(color, text) {
    var s = document.createElement('span');
    s.className = 'ag-badge ag-badge-' + color;
    s.textContent = text;
    return s;
  }

  // ── Carga de datos ─────────────────────────────────────────────────────────
  // Usa los arrays globales de la app (items, prestamos) si ya están cargados.
  // Fallback: llamada directa a la API con credenciales de SESSION.
  function loadData() {
    if (state.dataLoaded || state.loading) return;

    // Intento 1: Datos ya en memoria de la app
    if (typeof items !== 'undefined' && Array.isArray(items) && items.length > 0) {
      state.inventario = items;
      state.dataLoaded = true;
      updateStatusBadge('green', '● ' + state.inventario.length + ' ítems');
      renderCurrentTab();
      return;
    }

    // Intento 2: Esperar a que items esté disponible (si la app se está cargando aún)
    var attempts = 0;
    var waitForItems = setInterval(function() {
      attempts++;
      if (typeof items !== 'undefined' && Array.isArray(items) && items.length > 0) {
        clearInterval(waitForItems);
        state.inventario = items;
        state.dataLoaded = true;
        updateStatusBadge('green', '● ' + state.inventario.length + ' ítems');
        renderCurrentTab();
        return;
      }
      if (attempts > 10) {
        clearInterval(waitForItems);
        // Si sigue sin cargar, ir a fallback API
        loadFromAPI();
      }
    }, 200);
  }

  function loadFromAPI() {
    if (state.loading) return;
    state.loading = true;
    updateStatusBadge('yellow', '⏳ Cargando desde API...');
    var creds = getCreds();
    if (!creds) { updateStatusBadge('red', '❌ Sin sesión'); state.loading = false; return; }
    var u = encodeURIComponent(creds.u), p = encodeURIComponent(creds.p);

    fetch('/api/list?u=' + u + '&p=' + p).then(function(r){ return r.json(); })
      .then(function(listData) {
        state.inventario = Array.isArray(listData) ? listData : decompressItems(listData);
        state.dataLoaded = true;
        state.loading = false;
        updateStatusBadge('green', '● ' + state.inventario.length + ' ítems');
        renderCurrentTab();
      }).catch(function(e) {
        state.loading = false;
        updateStatusBadge('red', '❌ Error: ' + e.message);
        console.error('[Agente]', e);
      });
  }

  function updateStatusBadge(color, text) {
    if (!el.statusBadge) return;
    el.statusBadge.className = 'ag-badge ag-badge-' + color;
    el.statusBadge.textContent = text;
  }

  // ── Drag del FAB ───────────────────────────────────────────────────────────
  function makeFabDraggable(fab) {
    var POS_KEY = 'volt_fab_pos';
    var saved = null;
    try { saved = JSON.parse(localStorage.getItem(POS_KEY) || 'null'); } catch(e) {}
    if (saved && typeof saved.top === 'number' && typeof saved.left === 'number') {
      applyPos(saved.top, saved.left);
    }

    function applyPos(top, left) {
      // Asegurar que está dentro del viewport
      var maxLeft = window.innerWidth - fab.offsetWidth - 4;
      var maxTop = window.innerHeight - fab.offsetHeight - 4;
      top = Math.max(4, Math.min(top, maxTop));
      left = Math.max(4, Math.min(left, maxLeft));
      fab.style.top = top + 'px';
      fab.style.left = left + 'px';
      fab.style.right = 'auto';
    }

    var dragging = false;
    var moved = false;
    var startX = 0, startY = 0;
    var startLeft = 0, startTop = 0;

    function onDown(e) {
      var pt = e.touches ? e.touches[0] : e;
      dragging = true;
      moved = false;
      startX = pt.clientX;
      startY = pt.clientY;
      var rect = fab.getBoundingClientRect();
      startLeft = rect.left;
      startTop = rect.top;
      fab.style.transition = 'none';
      if (e.cancelable) e.preventDefault();
    }

    function onMove(e) {
      if (!dragging) return;
      var pt = e.touches ? e.touches[0] : e;
      var dx = pt.clientX - startX;
      var dy = pt.clientY - startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved = true;
      applyPos(startTop + dy, startLeft + dx);
    }

    function onUp() {
      if (!dragging) return;
      dragging = false;
      fab.style.transition = '';
      if (moved) {
        // Guardar posición
        var rect = fab.getBoundingClientRect();
        try { localStorage.setItem(POS_KEY, JSON.stringify({ top: rect.top, left: rect.left })); } catch(e) {}
      } else {
        // No se movió → click normal
        togglePanel();
      }
    }

    fab.addEventListener('mousedown', onDown);
    fab.addEventListener('touchstart', onDown, { passive: false });
    document.addEventListener('mousemove', onMove);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchend', onUp);

    // Reajustar si cambia el tamaño de ventana
    window.addEventListener('resize', function() {
      var rect = fab.getBoundingClientRect();
      applyPos(rect.top, rect.left);
    });
  }

  // ── Build UI ───────────────────────────────────────────────────────────────
  function buildWidget() {
    // Styles
    var styleEl = document.createElement('style');
    styleEl.textContent = css;
    document.head.appendChild(styleEl);

    // FAB
    var fab = document.createElement('button');
    fab.id = 'agente-fab';
    fab.title = 'Pregunta a ' + AGENTE_NOMBRE + ' (arrastra para mover)';
    fab.innerHTML = '⚡ Pregunta a ' + AGENTE_NOMBRE;
    document.body.appendChild(fab);
    el.fab = fab;
    makeFabDraggable(fab);

    // Panel
    var panel = document.createElement('div');
    panel.id = 'agente-panel';
    panel.innerHTML = buildPanelHTML();
    document.body.appendChild(panel);
    el.panel = panel;

    // Refs
    el.statusBadge = panel.querySelector('#ag-status');

    // Tab clicks
    panel.querySelectorAll('.ag-tab').forEach(function(t) {
      t.addEventListener('click', function() { switchTab(t.dataset.tab); });
    });

    // Close
    panel.querySelector('#ag-close').addEventListener('click', closePanel);

    // Chat input
    el.chatInput = panel.querySelector('#ag-chat-input');
    el.chatInput.addEventListener('keydown', function(e){ if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); } });
    el.chatInput.addEventListener('input', updateSuggestions);
    panel.querySelector('#ag-send').addEventListener('click', sendChat);
    panel.querySelector('#ag-scan').addEventListener('click', startScan);

    // Quick actions
    panel.querySelectorAll('.ag-quick-btn').forEach(function(b) {
      b.addEventListener('click', function(){ sendChat(b.dataset.q); });
    });

    // Messages container
    el.messages = panel.querySelector('#ag-messages');



    // Audit btn
    panel.querySelectorAll('.ag-audit-filter').forEach(function(b){
      b.addEventListener('click', function(){ state.auditFiltro = b.dataset.f; renderAudit(); });
    });
    panel.querySelector('#ag-audit-btn').addEventListener('click', auditAI);

    // CSV
    var fileInput = panel.querySelector('#ag-csv-file');
    fileInput.addEventListener('change', function(e){
      var f = e.target.files[0]; if (!f) return;
      var r = new FileReader();
      r.onload = function(ev){ panel.querySelector('#ag-csv-text').value = ev.target.result; };
      r.readAsText(f, 'utf-8');
    });
    panel.querySelector('#ag-csv-analyze').addEventListener('click', analyzeCSV);
    panel.querySelector('#ag-csv-import').addEventListener('click', importCSV);

    // Populate selects after data loads (called from loadData)
    // No hacer loadData aquí — se hace al abrir el panel
  }

  function buildPanelHTML() {
    var today = new Date().toISOString().split('T')[0];
    return [
      '<div class="ag-header">',
        '<span style="font-size:18px">⚡</span>',
        '<div class="ag-header-title">',
          '<div class="ag-title">AGENTE INVENTARIO</div>',
          '<div class="ag-sub">IES Juan Bosco</div>',
        '</div>',
        '<span id="ag-status" class="ag-badge ag-badge-yellow">⏳ Iniciando...</span>',
        '<button id="ag-close" class="ag-close" title="Cerrar">✕</button>',
      '</div>',

      '<div class="ag-tabs">',
        '<button class="ag-tab active" data-tab="chat">💬 Chat</button>',
        '<button class="ag-tab" data-tab="audit">🔍 Auditoría</button>',
        '<button class="ag-tab" data-tab="csv">📥 CSV</button>',
      '</div>',

      '<div class="ag-body">',

        // ── Chat ──
        '<div id="ag-tab-chat" class="ag-panel active" style="padding:0;gap:0;">',
          '<div id="ag-messages" class="ag-messages">',
            '<div style="text-align:center;padding:30px 16px;color:#475569;font-size:11px">',
              'Conectando con el inventario...',
            '</div>',
          '</div>',
          '<div id="ag-quick" class="ag-quick" style="display:none">',
            '<div style="padding:14px;color:#64748b;font-size:11px;line-height:1.8;background:#0f172a;border-radius:8px;margin:0 14px 14px;border:1px solid #1e293b">',
              '<strong style="color:#7dd3fc;display:block;margin-bottom:8px">💡 EJEMPLOS DE BÚSQUEDAS:</strong>',
              '<div style="margin-left:12px;color:#94a3b8">',
                '<div style="margin-bottom:6px">🔍 "¿Dónde está la Fusionadora de fibra?"</div>',
                '<div style="margin-bottom:6px">🔍 "¿Quién tiene el Osciloscopio?"</div>',
                '<div style="margin-bottom:6px">🔍 "Necesito pedir prestado un Multímetro"</div>',
                '<div style="margin-bottom:6px">📦 "Quiero añadir un Multimetro digital nuevo"</div>',
                '<div style="margin-bottom:6px">📦 "¿Qué materiales están bajo stock mínimo?"</div>',
                '<div>⚠️ "¿Qué ítems tienen campos incompletos?"</div>',
              '</div>',
            '</div>',
          '</div>',
          '<div id="ag-suggestions" class="ag-quick" style="display:none;padding:8px 14px;border-top:1px solid #1e293b;gap:4px"></div>',
          '<div class="ag-input-row">',
            '<button id="ag-scan" class="ag-send" title="Escanear código QR / código de barras" style="background:#1e293b">📷</button>',
            '<input id="ag-chat-input" class="ag-input" placeholder="Ej: ¿Dónde está...? | ¿Quién tiene...? | Necesito pedir...">',
            '<button id="ag-send" class="ag-send" disabled>➤</button>',
          '</div>',
        '</div>',



        // ── Auditoría ──
        '<div id="ag-tab-audit" class="ag-panel">',
          '<p class="ag-section-title">🔍 Auditoría de Datos Incompletos</p>',
          '<div id="ag-audit-badges" class="ag-badges"></div>',
          '<div class="ag-badges" style="margin-top:6px">',
            '<button class="ag-quick-btn ag-audit-filter" data-f="todos">Todos</button>',
            '<button class="ag-quick-btn ag-audit-filter" data-f="cat">Sin categoría</button>',
            '<button class="ag-quick-btn ag-audit-filter" data-f="aula">Sin aula</button>',
            '<button class="ag-quick-btn ag-audit-filter" data-f="ref">Sin referencia</button>',
          '</div>',
          '<div id="ag-audit-table" class="ag-table-wrap"></div>',
          '<button id="ag-audit-btn" class="ag-btn ag-btn-blue">🤖 Sugerir correcciones con IA</button>',
          '<div id="ag-audit-result" class="ag-ai-result" style="display:none"></div>',
        '</div>',

        // ── CSV ──
        '<div id="ag-tab-csv" class="ag-panel">',
          '<p class="ag-section-title">📥 Importar CSV</p>',
          '<div class="ag-row">',
            '<label class="ag-btn" style="cursor:pointer">📁 Cargar archivo<input id="ag-csv-file" type="file" accept=".csv,.txt" style="display:none"></label>',
            '<button id="ag-csv-analyze" class="ag-btn">🤖 Analizar</button>',
            '<button id="ag-csv-import" class="ag-btn" disabled>📤 Importar</button>',
          '</div>',
          '<textarea id="ag-csv-text" class="ag-input-field" rows="5" placeholder="Pega CSV o carga archivo...\n\nNombre,Cantidad,Aula,Categoria\nOsciloscopio,2,Aula 14,Instrumentacion" style="resize:vertical;font-size:10px;font-family:monospace"></textarea>',
          '<div id="ag-csv-badges" class="ag-badges"></div>',
          '<div id="ag-csv-result" class="ag-ai-result" style="display:none"></div>',
        '</div>',

      '</div>', // ag-body
    ].join('');
  }

  // ── Toggle / open / close ──────────────────────────────────────────────────
  function togglePanel() {
    if (state.open) closePanel(); else openPanel();
  }
  function openPanel() {
    state.open = true;
    el.panel.classList.add('open');
    el.fab.innerHTML = '✕ Cerrar';
    if (!state.dataLoaded) loadData();
    else renderCurrentTab();
  }
  function closePanel() {
    state.open = false;
    el.panel.classList.remove('open');
    el.fab.innerHTML = '⚡ Pregunta a ' + AGENTE_NOMBRE;
  }

  // ── Tabs ───────────────────────────────────────────────────────────────────
  function switchTab(tab) {
    state.tab = tab;
    el.panel.querySelectorAll('.ag-tab').forEach(function(t){ t.classList.toggle('active', t.dataset.tab === tab); });
    el.panel.querySelectorAll('.ag-panel').forEach(function(p){ p.classList.toggle('active', p.id === 'ag-tab-' + tab); });
    renderCurrentTab();
  }

  function renderCurrentTab() {
    if (!state.dataLoaded) return;
    if (state.tab === 'chat') renderChatReady();
    if (state.tab === 'audit') renderAudit();
  }

  // ── Navegación a items desde el chat ──────────────────────────────────────
  function navigateToItem(id) {
    closePanel();
    if (typeof openItemRoute === 'function') openItemRoute(id);
    else if (typeof openModal === 'function') openModal(id);
  }

  function linkifyItems(container) {
    if (!state.inventario.length) return;
    var nameMap = [];
    state.inventario.forEach(function(item) {
      var n = item.nombre || item.item || item.name || '';
      if (n && n.length > 2) nameMap.push({ name: n, id: item.id });
    });
    nameMap.sort(function(a, b) { return b.name.length - a.name.length; });

    var walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null, false);
    var nodes = [];
    var node;
    while ((node = walker.nextNode())) nodes.push(node);

    nodes.forEach(function(textNode) {
      var parent = textNode.parentNode;
      if (!parent || parent.classList && parent.classList.contains('ag-item-link')) return;
      var text = textNode.textContent;
      var fragments = [{ text: text, isLink: false }];
      var matched = false;

      nameMap.forEach(function(entry) {
        var newFrags = [];
        fragments.forEach(function(frag) {
          if (frag.isLink) { newFrags.push(frag); return; }
          var lower = frag.text.toLowerCase();
          var idx = lower.indexOf(entry.name.toLowerCase());
          if (idx === -1) { newFrags.push(frag); return; }
          matched = true;
          if (idx > 0) newFrags.push({ text: frag.text.slice(0, idx), isLink: false });
          newFrags.push({ text: frag.text.slice(idx, idx + entry.name.length), isLink: true, id: entry.id });
          if (idx + entry.name.length < frag.text.length) newFrags.push({ text: frag.text.slice(idx + entry.name.length), isLink: false });
        });
        fragments = newFrags;
      });

      if (!matched) return;
      var span = document.createElement('span');
      fragments.forEach(function(frag) {
        if (frag.isLink) {
          var a = document.createElement('span');
          a.className = 'ag-item-link';
          a.title = 'Ver item en inventario';
          a.textContent = frag.text;
          a.addEventListener('click', (function(id) { return function() { navigateToItem(id); }; })(frag.id));
          span.appendChild(a);
        } else {
          span.appendChild(document.createTextNode(frag.text));
        }
      });
      parent.replaceChild(span, textNode);
    });
  }

  // ── Chat ───────────────────────────────────────────────────────────────────
  function renderChatReady() {
    var sendBtn = el.panel.querySelector('#ag-send');
    sendBtn.disabled = false;
    if (state.messages.length === 0) {
      el.panel.querySelector('#ag-quick').style.display = 'flex';
      el.chatInput.focus();
    }
  }

  // ── Búsqueda inteligente en inventario ─────────────────────────────────────
  // Palabras vacías a ignorar (stop words en español)
  var STOP_WORDS = ['donde', 'dónde', 'esta', 'está', 'la', 'el', 'los', 'las', 'un', 'una', 'unos', 'unas',
    'de', 'del', 'al', 'a', 'en', 'con', 'por', 'para', 'que', 'qué', 'cual', 'cuál',
    'tiene', 'tienes', 'hay', 'cuanto', 'cuánto', 'cuanta', 'cuánta', 'cuantos', 'cuántos',
    'quiero', 'quieres', 'necesito', 'necesitas', 'puedo', 'puedes', 'pedir', 'prestado',
    'busco', 'buscar', 'me', 'te', 'se', 'su', 'sus', 'mi', 'tu', 'es', 'son',
    'y', 'o', 'pero', 'si', 'no', 'lo', 'le', 'les', 'sobre', 'como', 'cómo'];

  function extractKeywords(query) {
    var q = (query || '').toLowerCase()
      .replace(/[¿?¡!.,;:()]/g, ' ')  // quitar puntuación
      .replace(/\s+/g, ' ')
      .trim();

    var words = q.split(' ').filter(function(w) {
      return w.length >= 3 && STOP_WORDS.indexOf(w) === -1;
    });

    return words;
  }

  // Devuelve los objetos completos de items que coinciden (no strings)
  function searchInventoryItems(query) {
    if (!state.inventario.length) return null;
    var keywords = extractKeywords(query);
    if (keywords.length === 0) return null;

    var matches = state.inventario.filter(function(i) {
      var texto = [
        (i.nombre || i.name || i.item || ''),
        (i.aula || i.classroom || ''),
        (i.cat || i.categoria || i.category || ''),
        (i.ref || i.referencia || '')
      ].join(' ').toLowerCase();
      return keywords.some(function(kw) { return texto.includes(kw); });
    });

    if (matches.length === 0) return null;

    // Ordenar por relevancia — priorizar match exacto en nombre
    matches.sort(function(a, b) {
      var textoA = (a.item || a.nombre || a.name || '').toLowerCase();
      var textoB = (b.item || b.nombre || b.name || '').toLowerCase();
      // Match exacto de alguna keyword en el nombre vale doble
      var scoreA = keywords.reduce(function(s, kw) { return s + (textoA.includes(kw) ? (textoA === kw ? 3 : 1) : 0); }, 0);
      var scoreB = keywords.reduce(function(s, kw) { return s + (textoB.includes(kw) ? (textoB === kw ? 3 : 1) : 0); }, 0);
      return scoreB - scoreA;
    });

    // Si el primer resultado tiene mucho más score que el segundo, devolver solo ese
    if (matches.length > 1) {
      var nombrePrimero = (matches[0].item || matches[0].nombre || matches[0].name || '').toLowerCase();
      var exacto = keywords.some(function(kw) { return nombrePrimero === kw; });
      if (exacto) return [matches[0]];
    }

    return matches;
  }

  function searchInventory(query) {
    if (!state.inventario.length) return null;

    var keywords = extractKeywords(query);
    console.log('[Volt DEBUG] Keywords extraídas:', keywords);

    if (keywords.length === 0) return null;

    // Buscar items que contengan AL MENOS UNA palabra clave
    var matches = state.inventario.filter(function(i) {
      var texto = [
        (i.nombre || i.name || i.item || ''),
        (i.aula || i.classroom || ''),
        (i.cat || i.categoria || i.category || ''),
        (i.ref || i.referencia || '')
      ].join(' ').toLowerCase();

      return keywords.some(function(kw) { return texto.includes(kw); });
    });

    console.log('[Volt DEBUG] Matches encontrados:', matches.length);

    if (matches.length === 0) return null;

    // Si hay demasiados resultados, ordenar por relevancia (cuántas keywords coinciden)
    if (matches.length > 20) {
      matches.sort(function(a, b) {
        var textoA = (a.nombre || a.name || '').toLowerCase();
        var textoB = (b.nombre || b.name || '').toLowerCase();
        var scoreA = keywords.filter(function(kw){ return textoA.includes(kw); }).length;
        var scoreB = keywords.filter(function(kw){ return textoB.includes(kw); }).length;
        return scoreB - scoreA;
      });
      matches = matches.slice(0, 20);
    }

    // Formatear resultados para la IA
    var resultados = matches.map(function(i) {
      var qty = i.qty != null ? i.qty : (i.cantidad || 0);
      var min = i.min != null ? i.min : (i.stock_min || 0);
      var nombre = i.nombre || i.name || i.item || '(sin nombre)';
      var aula = i.aula || i.classroom || '—';
      var ref = i.ref || i.referencia || '—';
      return nombre + ' | Aula: ' + aula + ' | Stock: ' + qty + ' (mín: ' + min + ') | Ref: ' + ref;
    });

    return resultados;
  }

  // ── Detección de consultas de stock ───────────────────────────────────────
  function checkStockQuery(query) {
    var q = (query || '').toLowerCase();
    var menciona_stock_bajo = /stock\s+(bajo|minimo|mínimo|critic)|bajo\s+(de\s+)?stock|bajo\s+mín|escasea|agot|sin\s+stock|stock\s+cero|critico/.test(q);
    var menciona_listado_aula = /(items?|materiales?|que\s+hay|qué\s+hay)\s+.*(aula|en\s+el)/.test(q);

    if (!menciona_stock_bajo && !menciona_listado_aula) return null;

    // Extraer número de aula si se menciona
    var aulaMatch = q.match(/aula\s*(\d+|[a-z]+)/i);
    var aulaQ = aulaMatch ? aulaMatch[1].toLowerCase() : null;

    var inv = state.inventario;
    function qty(i){ return Number(i.qty != null ? i.qty : (i.cantidad || 0)); }
    function minimo(i){ return Number(i.min != null ? i.min : (i.stock_min || 0)); }

    // Filtrar por aula si se especificó
    var filtrados = inv;
    if (aulaQ) {
      filtrados = inv.filter(function(i) {
        var a = (i.aula || '').toLowerCase();
        return a.includes(aulaQ);
      });
    }

    if (menciona_stock_bajo) {
      // Items con stock REALMENTE bajo: qty < minimo Y minimo > 0
      var bajoMin = filtrados.filter(function(i) { return minimo(i) > 0 && qty(i) < minimo(i); });
      // Items sin stock
      var sinStock = filtrados.filter(function(i) { return qty(i) === 0; });

      if (bajoMin.length === 0 && sinStock.length === 0) {
        return '\n\n✅ NO HAY ITEMS BAJO STOCK MÍNIMO' + (aulaQ ? ' en aulas que contengan "' + aulaQ + '"' : '') +
          '. Todos los ' + filtrados.length + ' items revisados están OK. Responde explícitamente que no hay items con stock bajo.';
      }

      var lista = bajoMin.slice(0, 30).map(function(i) {
        var nombre = i.item || i.nombre || i.name || '';
        return nombre + ' | Aula: ' + (i.aula || '—') + ' | Stock: ' + qty(i) + ' | Mínimo: ' + minimo(i);
      });

      return '\n\n⚠️ ITEMS BAJO STOCK MÍNIMO' + (aulaQ ? ' (filtrado aula "' + aulaQ + '")' : '') + ' (' + bajoMin.length + ' total, sin stock: ' + sinStock.length + '):\n' +
        lista.join('\n') +
        '\n\nIMPORTANTE: Solo lista estos items. NO inventes otros. Si está vacío, di que no hay.';
    }

    if (menciona_listado_aula && aulaQ) {
      // Lista de items del aula (limitado para no exceder tokens)
      var lista2 = filtrados.slice(0, 30).map(function(i) {
        var nombre = i.item || i.nombre || i.name || '';
        return nombre + ' | Stock: ' + qty(i) + (minimo(i) > 0 ? ' (mín: ' + minimo(i) + ')' : '');
      });
      return '\n\n📦 ITEMS EN AULA "' + aulaQ + '" (' + filtrados.length + ' total' + (filtrados.length > 30 ? ', mostrando 30' : '') + '):\n' +
        lista2.join('\n') + '\n\nUSA ESTA LISTA. No inventes datos.';
    }

    return null;
  }

  function ctxExtra() {
    if (!state.inventario.length) return '';
    var inv = state.inventario;
    var aulas = [];
    inv.forEach(function(i){ if(i.aula && aulas.indexOf(i.aula)<0) aulas.push(i.aula); });
    var cats = [];
    inv.forEach(function(i){ if(i.cat && cats.indexOf(i.cat)<0) cats.push(i.cat); });
    var bajoMin = inv.filter(function(i){ return Number(i.min||i.stock_min)>0 && Number(i.qty??i.cantidad) < Number(i.min||i.stock_min); });

    // Debug: mostrar estructura de items para verificar
    console.log('[Volt DEBUG] Inventario cargado:', inv.length, 'items');
    if (inv.length > 0) {
      console.log('[Volt DEBUG] Estructura item 0:', inv[0]);
    }

    // Contexto MINIMALISTA: solo metadatos, NO la tabla completa
    return '\n\n📦 INVENTARIO DISPONIBLE:\n' +
      'Total: ' + inv.length + ' items | Aulas: ' + (aulas.length > 0 ? aulas.join(', ') : 'no cargadas') + ' | Bajo stock: ' + bajoMin.length + '\n' +
      'El usuario preguntará por materiales. Usa SIEMPRE los resultados de búsqueda que se proporcionan.';
  }

  // ── Sugerencias inteligentes mientras escribe ────────────────────────────────
  function updateSuggestions() {
    var input = el.chatInput.value.trim().toLowerCase();
    var sugDiv = el.panel.querySelector('#ag-suggestions');
    if (!input || input.length < 2) { sugDiv.style.display = 'none'; return; }

    var suggestions = [];

    // Detectar patrón de búsqueda
    if (input.includes('dónde') || input.includes('donde')) {
      suggestions.push({ text: '🔍 Buscar por aula', q: '¿' + input + '?' });
    }
    if (input.includes('quién') || input.includes('quien') || input.includes('tiene')) {
      suggestions.push({ text: '📍 Ver histórico de préstamos', q: input });
    }
    if (input.includes('pedir') || input.includes('prestado')) {
      suggestions.push({ text: '✅ Facilitar préstamo', q: input });
    }
    if (input.includes('añadir') || input.includes('anadir') || input.includes('crear') || input.includes('nuevo') || input.includes('agregar')) {
      suggestions.push({ text: '📦 Crear nuevo item', q: input });
    }
    if (input.includes('stock') || input.includes('minimo') || input.includes('mínimo')) {
      suggestions.push({ text: '📦 Ver tabla de stock', q: input });
    }
    if (input.includes('auditar') || input.includes('completo') || input.includes('incompleto')) {
      suggestions.push({ text: '⚠️ Ejecutar auditoría', q: input });
    }

    // Si no hay sugerencias específicas, mostrar materiales que coincidan
    if (!suggestions.length && state.inventario.length) {
      var matching = state.inventario.filter(function(i) {
        var nombre = (i.nombre || '').toLowerCase();
        return nombre.includes(input) && nombre.length > 0;
      }).slice(0, 3);

      matching.forEach(function(item) {
        suggestions.push({
          text: '🔗 ' + item.nombre + ' (' + (item.aula || '—') + ')',
          q: '¿Dónde está ' + item.nombre + '?'
        });
      });
    }

    if (suggestions.length) {
      sugDiv.innerHTML = '';
      suggestions.forEach(function(s) {
        var btn = document.createElement('button');
        btn.className = 'ag-quick-btn';
        btn.style.fontSize = '10px';
        btn.textContent = s.text;
        btn.addEventListener('click', function() { el.chatInput.value = s.q; el.chatInput.focus(); updateSuggestions(); });
        sugDiv.appendChild(btn);
      });
      sugDiv.style.display = 'flex';
    } else {
      sugDiv.style.display = 'none';
    }
  }

  // ── Detectar intención de préstamo ────────────────────────────────────────
  function detectarIntencionPrestamo(query) {
    var q = (query || '').toLowerCase().trim();
    // Patrones directos de petición de préstamo
    var patrones = ['pedir prestado', 'pedirlo prestado', 'pedirla prestada', 'préstamo', 'prestamo',
      'puedo pedir', 'me llevo', 'me lo llevo', 'me la llevo', 'cojo', 'tomo prestado',
      'facilitar préstamo', 'facilitar prestamo', 'lo quiero', 'la quiero',
      'lo necesito', 'la necesito', 'quiero pedir', 'quiero coger', 'reservar',
      'abre el formulario', 'abrir formulario', 'abrir el formulario', 'rellenar formulario',
      'quiero el', 'quiero la', 'pedirla', 'pedirlo', 'pídela', 'pidela', 'pídelo', 'pidelo',
      'tramitar', 'tramítalo', 'tramitalo', 'gestionar préstamo', 'gestionar prestamo',
      'solicitar', 'sí, por favor', 'si por favor', 'dale', 'venga', 'adelante'];
    if (patrones.some(function(p) { return q.includes(p); })) return true;

    // Si la última respuesta del agente mencionó abrir un formulario de préstamo,
    // tratar respuestas afirmativas cortas como confirmación
    var lastAI = null;
    for (var i = state.messages.length - 1; i >= 0; i--) {
      if (state.messages[i].role === 'assistant') { lastAI = state.messages[i].content.toLowerCase(); break; }
    }
    var afirmaciones = ['si', 'sí', 'ok', 'vale', 'yes', 'claro', 'por supuesto', 'efectivamente', 'correcto'];
    if (lastAI && (lastAI.includes('préstamo') || lastAI.includes('prestamo') || lastAI.includes('formulario'))) {
      if (afirmaciones.indexOf(q) !== -1 || q.length < 12 && afirmaciones.some(function(a){ return q.startsWith(a); })) {
        return true;
      }
    }
    return false;
  }

  function detectarIntencionAnadirItem(query) {
    var q = (query || '').toLowerCase().trim();
    var patrones = ['añadir', 'anadir', 'agregar', 'crear', 'nuevo item', 'nuevo ítem', 'nuevo material',
      'añadir item', 'anadir item', 'agregar item', 'crear item', 'registro nuevo', 'registrar nuevo',
      'incluir material', 'meter item', 'poner item', 'nuevo producto', 'alta item', 'alta material',
      'incorporar', 'incluir nuevo', 'añadir material', 'anadir material', 'agregar material'];
    return patrones.some(function(p) { return q.includes(p); });
  }

  function extraerNombreItem(query) {
    var q = normalize(query || '');
    // 1. Quitar el verbo de acción (primera aparición)
    var verbos = ['quiero anadir', 'quiero agregar', 'quiero crear', 'quiero añadir',
      'anadir un', 'anadir una', 'anadir el', 'anadir la', 'anadir',
      'añadir un', 'añadir una', 'añadir el', 'añadir la', 'añadir',
      'agregar un', 'agregar una', 'agregar', 'crear un', 'crear una', 'crear',
      'nuevo', 'nueva', 'registrar', 'incorporar', 'meter', 'poner'];
    var resto = q;
    for (var i = 0; i < verbos.length; i++) {
      var idx = resto.indexOf(verbos[i]);
      if (idx !== -1) { resto = resto.substring(idx + verbos[i].length).trim(); break; }
    }
    // 2. Quitar artículos iniciales
    resto = resto.replace(/^(un|una|el|la|los|las|de)\s+/i, '').trim();
    // 3. Cortar en preposiciones de lugar/contexto
    var corte = resto.search(/\s+(?:en el|en la|en aula|en clase|en taller|en el aula|para el|para la|al aula)\b/i);
    if (corte > 0) resto = resto.substring(0, corte).trim();
    // 4. Cortar en puntuación
    return resto.split(/[.,;:?!]/)[0].trim() || '';
  }

  function mostrarFormularioNuevoItem(nombreInicial, fraseCompleta) {
    var formDiv = document.createElement('div');
    formDiv.className = 'ag-msg ag-msg-ai';
    formDiv.style.cssText = 'max-width:95%;background:#0f172a;border:1px solid #10b981;overflow-y:auto;max-height:600px';

    var aulaOptions = [];
    var cicloOptions = [];
    var catOptions = [];

    // Cargar aulas desde la lista oficial AULAS
    if (AULAS && AULAS.length > 0) {
      AULAS.forEach(function(a) {
        aulaOptions.push({id: a.id, name: a.name});
      });
    }

    // Cargar categorías del inventario
    if (state.inventario && state.inventario.length > 0) {
      state.inventario.forEach(function(i) {
        if (i.cat && catOptions.indexOf(i.cat) === -1) catOptions.push(i.cat);
      });
    }
    catOptions.sort();

    // Cargar ciclos
    if (CICLOS && CICLOS.length > 0) {
      CICLOS.forEach(function(c) {
        cicloOptions.push({id: c.id, name: c.name});
      });
    }

    var selectAula = '<select class="ag-input-field ag-new-item-aula" style="padding:7px"><option value="">-- Seleccionar aula --</option>' +
      aulaOptions.map(function(a) { return '<option value="' + esc(a.id) + '">' + esc(a.name) + '</option>'; }).join('') + '</select>';
    
    var selectCat = '<select class="ag-input-field ag-new-item-cat" style="padding:7px"><option value="">-- Seleccionar categoría --</option>' +
      catOptions.map(function(c) { return '<option value="' + esc(c) + '">' + esc(c) + '</option>'; }).join('') + '</select>';
    
    var selectCiclo = '<select class="ag-input-field ag-new-item-ciclo" style="padding:7px"><option value="">-- Seleccionar ciclo --</option>' +
      cicloOptions.map(function(c) { return '<option value="' + esc(c.id) + '">' + esc(c.name) + '</option>'; }).join('') + '</select>';
    
    var selectMod = '<select class="ag-input-field ag-new-item-mod" style="padding:7px"><option value="">-- Seleccionar módulo --</option></select>';

    formDiv.innerHTML =
      '<div style="margin-bottom:10px"><strong style="color:#10b981">📦 Crear nuevo item:</strong></div>' +
      '<label class="ag-label">Nombre del item *</label>' +
      '<input class="ag-input-field ag-new-item-name" placeholder="Ej: Osciloscopio digital" value="' + esc(nombreInicial || '') + '">' +
      '<div style="display:flex;gap:6px;margin-top:6px">' +
        '<div style="flex:1"><label class="ag-label">Tipo *</label>' +
        '<select class="ag-input-field ag-new-item-tipo" style="padding:7px"><option value="consumible">Consumible</option><option value="inventariable">Inventariable</option></select></div>' +
        '<div style="width:80px"><label class="ag-label">Cantidad</label>' +
        '<input class="ag-input-field ag-new-item-qty" type="number" min="0" value="1"></div>' +
        '<div style="width:80px"><label class="ag-label">Mínimo</label>' +
        '<input class="ag-input-field ag-new-item-min" type="number" min="0" value="0"></div>' +
      '</div>' +
      '<div style="display:flex;gap:6px;margin-top:6px">' +
        '<div style="flex:1"><label class="ag-label">Aula *</label>' + selectAula + '</div>' +
        '<div style="flex:1"><label class="ag-label">Categoría *</label>' + selectCat + '</div>' +
      '</div>' +
      '<label class="ag-label" style="margin-top:6px">Ubicación</label>' +
      '<input class="ag-input-field ag-new-item-loc" placeholder="Ej: Armario metálico, Estantería A3...">' +
      '<div style="display:flex;gap:6px;margin-top:6px">' +
        '<div style="flex:1"><label class="ag-label">Ciclo</label>' + selectCiclo + '</div>' +
        '<div style="flex:1"><label class="ag-label">Módulo</label>' + selectMod + '</div>' +
      '</div>' +
      '<label class="ag-label" style="margin-top:6px">Foto (opcional)</label>' +
      '<input class="ag-input-field ag-new-item-foto" type="file" accept="image/*" style="padding:4px">' +
      '<div class="ag-new-item-foto-preview" style="margin-top:4px;max-height:100px;border-radius:4px;overflow:hidden"></div>' +
      '<label class="ag-label" style="margin-top:6px">Observaciones</label>' +
      '<textarea class="ag-input-field ag-new-item-obs" style="height:50px;resize:vertical" placeholder="Notas adicionales..."></textarea>' +
      '<div style="display:flex;gap:6px;margin-top:10px">' +
        '<button class="ag-btn ag-btn-blue ag-new-item-submit" style="flex:1">✅ Crear item</button>' +
        '<button class="ag-btn ag-new-item-cancel">Cancelar</button>' +
      '</div>' +
      '<div class="ag-new-item-result" style="margin-top:8px;font-size:11px"></div>';

    el.messages.appendChild(formDiv);
    el.messages.scrollTop = el.messages.scrollHeight;

    var nameInput = formDiv.querySelector('.ag-new-item-name');
    var cicloSelect = formDiv.querySelector('.ag-new-item-ciclo');
    var modSelect = formDiv.querySelector('.ag-new-item-mod');

    // Autocompletar campos desde la frase completa
    if (fraseCompleta) autocompletarFormulario(formDiv, fraseCompleta);

    nameInput.focus();

    // Cargar módulos cuando se selecciona un ciclo
    cicloSelect.addEventListener('change', function() {
      var cicloId = cicloSelect.value;
      modSelect.innerHTML = '<option value="">-- Seleccionar módulo --</option>';
      if (cicloId && CICLOS) {
        var ciclo = CICLOS.find(function(c) { return c.id === cicloId; });
        if (ciclo && ciclo.modulos && ciclo.modulos.length > 0) {
          ciclo.modulos.forEach(function(m) {
            var opt = document.createElement('option');
            opt.value = m.cod;
            opt.textContent = m.name;
            modSelect.appendChild(opt);
          });
        }
      }
    });

    formDiv.querySelector('.ag-new-item-cancel').addEventListener('click', function() {
      formDiv.remove();
    });

    var fotoInput = formDiv.querySelector('.ag-new-item-foto');
    var fotoPreview = formDiv.querySelector('.ag-new-item-foto-preview');
    var fotoData = null;

    fotoInput.addEventListener('change', function(e) {
      var file = e.target.files[0];
      if (!file) { fotoData = null; fotoPreview.innerHTML = ''; return; }
      var reader = new FileReader();
      reader.onload = function(event) {
        fotoData = event.target.result;
        var img = document.createElement('img');
        img.src = fotoData;
        img.style.cssText = 'max-width:100%;max-height:100px;border-radius:4px';
        fotoPreview.innerHTML = '';
        fotoPreview.appendChild(img);
      };
      reader.readAsDataURL(file);
    });

    formDiv.querySelector('.ag-new-item-submit').addEventListener('click', function() {
      var nombre = nameInput.value.trim();
      if (!nombre) { nameInput.focus(); nameInput.style.borderColor = '#ef4444'; return; }

      var tipo = formDiv.querySelector('.ag-new-item-tipo').value;
      var qty = Number(formDiv.querySelector('.ag-new-item-qty').value) || 1;
      var min = Number(formDiv.querySelector('.ag-new-item-min').value) || 0;
      var aula = formDiv.querySelector('.ag-new-item-aula').value || null;
      var cat = formDiv.querySelector('.ag-new-item-cat').value || null;
      var ciclo = formDiv.querySelector('.ag-new-item-ciclo').value || null;
      var mod = formDiv.querySelector('.ag-new-item-mod').value || null;
      var loc = formDiv.querySelector('.ag-new-item-loc').value.trim() || null;
      var obs = formDiv.querySelector('.ag-new-item-obs').value.trim();
      var resultEl = formDiv.querySelector('.ag-new-item-result');

      if (!aula) { formDiv.querySelector('.ag-new-item-aula').focus(); formDiv.querySelector('.ag-new-item-aula').style.borderColor = '#ef4444'; return; }
      if (!cat) { formDiv.querySelector('.ag-new-item-cat').focus(); formDiv.querySelector('.ag-new-item-cat').style.borderColor = '#ef4444'; return; }

      resultEl.innerHTML = '⏳ Creando item...';
      resultEl.style.color = '#94a3b8';

      var newItem = {
        item: nombre,
        ref: null,
        aula: aula,
        qty: qty,
        min: min,
        cat: cat,
        loc: loc,
        tipo_material: tipo,
        proveedor: null,
        obs: obs || null,
        mod: mod,
        est: null,
        util: null,
        fecha: new Date().toISOString().split('T')[0],
        mant: 0,
        foto: fotoData || null,
        tags: '',
        es_contenedor: 0,
        oculto: 0
      };

      apiPost('/api/item', {
        action: 'add',
        item: newItem
      }).then(function(res) {
        if (res.ok && res.item) {
          resultEl.innerHTML = '✅ Item creado: ' + esc(nombre) + ' (#' + res.item.id + ')';
          resultEl.style.color = '#34d399';
          formDiv.querySelector('.ag-new-item-submit').disabled = true;
          formDiv.querySelector('.ag-new-item-submit').textContent = '✅ Guardado';
          if (typeof loadData === 'function') {
            setTimeout(function() { loadData(); }, 500);
          }
        } else {
          resultEl.innerHTML = '❌ Error: ' + (res.error || 'No se pudo crear el item');
          resultEl.style.color = '#ef4444';
        }
      }).catch(function(e) {
        resultEl.innerHTML = '❌ Error: ' + e.message;
        resultEl.style.color = '#ef4444';
      });
    });
  }

  function mostrarFormularioPrestamo(item) {
    var formDiv = document.createElement('div');
    formDiv.className = 'ag-msg ag-msg-ai';
    formDiv.style.cssText = 'max-width:95%;background:#0f172a;border:1px solid #38bdf8';

    var qty = item.qty != null ? item.qty : (item.cantidad || 0);
    var nombreItem = item.item || item.nombre || item.name || '(sin nombre)';

    formDiv.innerHTML =
      '<div style="margin-bottom:10px"><strong style="color:#7dd3fc">📋 Solicitar préstamo:</strong><br>' +
      '<span style="color:#e2e8f0">' + esc(nombreItem) + '</span><br>' +
      '<small style="color:#64748b">Aula: ' + esc(item.aula || '—') + ' · Stock: ' + qty + '</small></div>' +
      '<label class="ag-label">Profesor/a que lo solicita *</label>' +
      '<input class="ag-input-field ag-loan-prof" placeholder="Ej: Juan García">' +
      '<div style="display:flex;gap:6px;margin-top:6px">' +
        '<div style="flex:1"><label class="ag-label">Aula destino</label>' +
        '<input class="ag-input-field ag-loan-aula" placeholder="Aula 14"></div>' +
        '<div style="width:80px"><label class="ag-label">Cantidad</label>' +
        '<input class="ag-input-field ag-loan-qty" type="number" min="1" max="' + qty + '" value="1"></div>' +
      '</div>' +
      '<label class="ag-label" style="margin-top:6px">Devolución prevista</label>' +
      '<input class="ag-input-field ag-loan-date" type="date" min="' + new Date().toISOString().split('T')[0] + '">' +
      '<div style="display:flex;gap:6px;margin-top:10px">' +
        '<button class="ag-btn ag-btn-blue ag-loan-submit" style="flex:1">✅ Registrar préstamo</button>' +
        '<button class="ag-btn ag-loan-cancel">Cancelar</button>' +
      '</div>' +
      '<div class="ag-loan-result" style="margin-top:8px;font-size:11px"></div>';

    el.messages.appendChild(formDiv);
    el.messages.scrollTop = el.messages.scrollHeight;

    var profInput = formDiv.querySelector('.ag-loan-prof');
    profInput.focus();

    formDiv.querySelector('.ag-loan-cancel').addEventListener('click', function() {
      formDiv.remove();
    });

    formDiv.querySelector('.ag-loan-submit').addEventListener('click', function() {
      var profesor = profInput.value.trim();
      if (!profesor) { profInput.focus(); profInput.style.borderColor = '#ef4444'; return; }

      var aula = formDiv.querySelector('.ag-loan-aula').value.trim();
      var cantidad = Number(formDiv.querySelector('.ag-loan-qty').value) || 1;
      var fecha = formDiv.querySelector('.ag-loan-date').value;
      var resultEl = formDiv.querySelector('.ag-loan-result');

      resultEl.innerHTML = '⏳ Registrando préstamo...';
      resultEl.style.color = '#94a3b8';

      var hoy = new Date().toISOString().replace('T',' ').slice(0,19);
      apiPost('/api/prestar', {
        action: 'prestar',
        prestamo: {
          itemId: item.id,
          itemNombre: item.item || item.nombre || item.name || '',
          cantidad: cantidad,
          aulaOrigen: item.aula || '',
          aulaDestino: aula,
          profesorId: '',
          profesorNombre: profesor,
          gestionadoPor: profesor,
          fechaPrestamo: hoy,
          fechaPrevista: fecha,
          fechaDevolucion: '',
          cantidadDevuelta: 0,
          estado: 'Activo',
          obs: ''
        }
      }).then(function(res) {
        resultEl.innerHTML = '✅ Préstamo registrado correctamente';
        resultEl.style.color = '#34d399';
        formDiv.querySelector('.ag-loan-submit').disabled = true;
        formDiv.querySelector('.ag-loan-submit').textContent = '✅ Guardado';
      }).catch(function(e) {
        resultEl.innerHTML = '❌ Error: ' + e.message;
        resultEl.style.color = '#ef4444';
      });
    });
  }

  // ══════════════════════════════════════════════════════════════════
  // PARSER CENTRAL DE INTENCIONES
  // ══════════════════════════════════════════════════════════════════
  function normalize(s) {
    return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  }

  function matchAny(q, list) {
    return list.some(function(p) { return q.includes(p); });
  }

  function detectarIntencion(q) {
    var n = normalize(q);

    // DEVOLVER PRÉSTAMO
    if (matchAny(n, ['devolver', 'devuelve', 'devolvemos', 'retornar', 'retorna', 'regresa', 'regresar',
        'ya lo tengo', 'ya la tengo', 'lo devuelvo', 'la devuelvo', 'devolverlo', 'devolverla',
        'entregar', 'entrega', 'ha vuelto', 'han vuelto', 'devolucion', 'devolución'])) {
      return { tipo: 'devolver' };
    }

    // ACTUALIZAR STOCK / CANTIDAD
    if (matchAny(n, ['actualiza', 'actualizar', 'cambia la cantidad', 'cambiar cantidad', 'pon la cantidad',
        'modifica la cantidad', 'modificar cantidad', 'stock a ', 'cantidad a ', 'hay ahora',
        'quedan ', 'tenemos ', 'unidades a ', 'ponlo a ', 'ponla a ', 'ajusta', 'ajustar stock',
        'nueva cantidad', 'cambiar stock', 'modifica stock'])) {
      var numMatch = n.match(/\b(\d+)\s*(unidades?|uds?|ud)?\b/);
      return { tipo: 'stock', cantidad: numMatch ? parseInt(numMatch[1]) : null };
    }

    // CAMBIAR ESTADO
    if (matchAny(n, ['cambia el estado', 'cambiar estado', 'marca como', 'marcar como', 'estado a',
        'esta en averia', 'está en avería', 'esta deteriorado', 'está deteriorado',
        'en buen estado', 'en buenas condiciones', 'averia', 'avería', 'deteriorado',
        'estado bueno', 'buen estado', 'de baja', 'dar de baja'])) {
      var estado = null;
      if (matchAny(n, ['averia', 'avería', 'averiado', 'roto', 'no funciona'])) estado = 'Avería';
      else if (matchAny(n, ['deteriorado', 'deteriorada', 'mal estado', 'desgastado'])) estado = 'Deteriorado';
      else if (matchAny(n, ['bueno', 'buena', 'buen estado', 'bien', 'ok', 'funciona'])) estado = 'Bueno';
      else if (matchAny(n, ['baja', 'dar de baja', 'desecho', 'inservible'])) estado = 'Baja';
      return { tipo: 'estado', estado: estado };
    }

    // MARCAR MANTENIMIENTO
    if (matchAny(n, ['mantenimiento', 'mantenimineto', 'reparar', 'reparacion', 'reparación',
        'revisar', 'revision', 'revisión', 'solicita mantenimiento', 'pide mantenimiento',
        'necesita revision', 'necesita reparacion', 'esta roto', 'está roto',
        'averiar', 'hay que arreglarlo', 'hay que arreglarla', 'no funciona bien'])) {
      return { tipo: 'mantenimiento' };
    }

    // CONSULTA: ¿QUIÉN TIENE X? / PRÉSTAMOS ACTIVOS
    if (matchAny(n, ['quien tiene', 'quién tiene', 'quien lo tiene', 'quién lo tiene',
        'prestado', 'prestados', 'donde esta prestado', 'quién se lo llevó', 'quien se lo llevo',
        'quien tiene cogido', 'quién tiene cogido', 'a quien se lo preste', 'a quién'])) {
      return { tipo: 'quien_tiene' };
    }

    // CONSULTA: RESUMEN DE AULA
    if (matchAny(n, ['que hay en', 'qué hay en', 'que tiene el aula', 'que tiene la clase',
        'resumen del aula', 'resumen de aula', 'inventario del aula', 'listar aula',
        'mostrar aula', 'ver aula', 'items del aula', 'ítems del aula',
        'que hay en el aula', 'qué hay en el aula'])) {
      return { tipo: 'resumen_aula' };
    }

    // CONSULTA: STOCK BAJO
    if (matchAny(n, ['stock bajo', 'poco stock', 'quedan pocos', 'quedan pocas', 'hay poco',
        'hay poca', 'se acaba', 'se acaban', 'necesita reposicion', 'necesita reposición',
        'reponer', 'reposicion', 'minimo', 'mínimo', 'por debajo del minimo'])) {
      return { tipo: 'stock_bajo' };
    }

    // CONSULTA: MANTENIMIENTO PENDIENTE
    if (matchAny(n, ['que necesita mantenimiento', 'qué necesita mantenimiento',
        'mantenimientos pendientes', 'pendiente de mantenimiento', 'items con mantenimiento',
        'que hay que reparar', 'qué hay que reparar', 'lista de reparaciones',
        'en reparacion', 'en reparación', 'necesitan reparacion'])) {
      return { tipo: 'lista_mantenimiento' };
    }

    return null;
  }

  // ── Extraer aula desde frase ──────────────────────────────────────
  function extraerAulaDeFrase(q) {
    var n = normalize(q);
    // Buscar patrones: "aula 35", "aula35", "en el aula 35", "clase 35"
    var m = n.match(/(?:aula|clase|taller|sala|lab)\s*(\w+)/i);
    if (m) {
      var candidato = m[1].toUpperCase();
      var found = AULAS && AULAS.find(function(a) {
        return normalize(a.name).includes(normalize(candidato)) ||
               normalize(a.id).includes(normalize(candidato));
      });
      return found || null;
    }
    // Buscar directamente por nombre de aula en el listado
    if (typeof AULAS !== 'undefined' && AULAS) {
      var sorted = AULAS.slice().sort(function(a, b) { return b.name.length - a.name.length; });
      for (var i = 0; i < sorted.length; i++) {
        if (n.includes(normalize(sorted[i].name))) return sorted[i];
      }
    }
    return null;
  }

  // ── Extraer ubicación desde frase ─────────────────────────────────
  function extraerUbicacionDeFrase(q) {
    var n = normalize(q);
    // Buscar patrón: "en el armario X", "en la estantería X", "en vitrina X"...
    var m = n.match(/\ben (?:el |la )?(?:armario|estanteria|vitrina|cajon|caja|mesa|balda|rack|panel)\s*([a-z0-9áéíóúüñ\s_-]{1,25}?)(?:\s*$|\s+(?:del|de|y|,|\.))/i);
    if (m) return (m[0].replace(/^en (?:el |la )?/i,'')).trim().replace(/\s+(del|de|y|,|\.).*$/i,'').trim();
    // Buscar ubicaciones existentes en el inventario que aparezcan en la frase
    if (state.inventario && state.inventario.length) {
      var locs = {};
      state.inventario.forEach(function(it) { if (it.loc) locs[normalize(it.loc)] = it.loc; });
      var keys = Object.keys(locs).sort(function(a,b){ return b.length - a.length; });
      for (var i = 0; i < keys.length; i++) {
        if (keys[i].length > 3 && n.includes(keys[i])) return locs[keys[i]];
      }
    }
    return null;
  }

  // ── Autocompletar formulario nuevo ítem desde frase ───────────────
  function autocompletarFormulario(formDiv, frase) {
    var aula = extraerAulaDeFrase(frase);
    if (aula) {
      var sel = formDiv.querySelector('.ag-new-item-aula');
      if (sel) sel.value = aula.id;
    }
    var loc = extraerUbicacionDeFrase(frase);
    if (loc) {
      var locInput = formDiv.querySelector('.ag-new-item-loc');
      if (locInput) locInput.value = loc;
    }
    // Intentar preseleccionar ciclo si hay contexto actual
    if (typeof cf !== 'undefined' && cf && cf.type === 'mod' && cf.ciclo) {
      var cicloSel = formDiv.querySelector('.ag-new-item-ciclo');
      if (cicloSel) { cicloSel.value = cf.ciclo.id; cicloSel.dispatchEvent(new Event('change')); }
    }
  }

  // ── Buscar préstamos activos por nombre de ítem o persona ─────────
  function buscarPrestamosActivos(q) {
    var n = normalize(q);
    var activos = (typeof prestamos !== 'undefined' ? prestamos : []).filter(function(p) {
      return p.estado === 'Activo';
    });
    if (!activos.length) return [];
    return activos.filter(function(p) {
      return normalize(p.itemNombre || '').includes(n) ||
             normalize(p.profesorNombre || '').includes(n) ||
             normalize(p.aulaDestino || '').includes(n);
    });
  }

  // ── Formulario: DEVOLVER préstamo ─────────────────────────────────
  function mostrarFormularioDevolucion(prestamosEncontrados, itemQuery) {
    var formDiv = document.createElement('div');
    formDiv.className = 'ag-msg ag-msg-ai';
    formDiv.style.cssText = 'max-width:95%;background:#0f172a;border:1px solid #f59e0b';

    if (!prestamosEncontrados.length) {
      formDiv.innerHTML = '<div style="color:#fbbf24">⚠ No encontré préstamos activos' +
        (itemQuery ? ' para "' + esc(itemQuery) + '"' : '') + '.</div>';
      el.messages.appendChild(formDiv);
      el.messages.scrollTop = el.messages.scrollHeight;
      return;
    }

    var rows = prestamosEncontrados.slice(0, 8).map(function(p) {
      return '<tr>' +
        '<td><input type="checkbox" class="ag-dev-check" data-id="' + p.id + '" data-qty="' + (p.cantidad||1) + '" style="width:16px;height:16px"></td>' +
        '<td>' + esc(p.itemNombre || '—') + '</td>' +
        '<td>' + esc(p.profesorNombre || '—') + '</td>' +
        '<td style="text-align:center">' + (p.cantidad||1) + '</td>' +
        '<td style="color:#64748b">' + (p.fechaPrestamo||'').slice(0,10) + '</td>' +
      '</tr>';
    }).join('');

    formDiv.innerHTML =
      '<div style="margin-bottom:10px"><strong style="color:#fbbf24">↩ Devolver préstamo:</strong></div>' +
      '<table class="ag-table" style="width:100%;margin-bottom:10px">' +
        '<thead><tr><th></th><th>Ítem</th><th>Profesor</th><th>Cant.</th><th>Fecha</th></tr></thead>' +
        '<tbody>' + rows + '</tbody>' +
      '</table>' +
      '<div style="display:flex;gap:6px">' +
        '<button class="ag-btn ag-btn-blue ag-dev-submit" style="flex:1">✅ Confirmar devolución</button>' +
        '<button class="ag-btn ag-dev-cancel">Cancelar</button>' +
      '</div>' +
      '<div class="ag-dev-result" style="margin-top:8px;font-size:11px"></div>';

    el.messages.appendChild(formDiv);
    el.messages.scrollTop = el.messages.scrollHeight;

    formDiv.querySelector('.ag-dev-cancel').addEventListener('click', function() { formDiv.remove(); });
    formDiv.querySelector('.ag-dev-submit').addEventListener('click', function() {
      var checks = formDiv.querySelectorAll('.ag-dev-check:checked');
      if (!checks.length) { appendMsgInDiv(formDiv, '⚠ Marca al menos un préstamo', '#fbbf24'); return; }
      var resultEl = formDiv.querySelector('.ag-dev-result');
      resultEl.innerHTML = '⏳ Procesando...'; resultEl.style.color = '#94a3b8';
      var promises = Array.from(checks).map(function(chk) {
        return apiPost('/api/prestar', {
          action: 'devolver',
          prestamoId: Number(chk.dataset.id),
          cantidadDevuelta: Number(chk.dataset.qty)
        });
      });
      Promise.all(promises).then(function() {
        resultEl.innerHTML = '✅ Devolución registrada';
        resultEl.style.color = '#34d399';
        formDiv.querySelector('.ag-dev-submit').disabled = true;
        if (typeof loadData === 'function') setTimeout(loadData, 500);
      }).catch(function(e) {
        resultEl.innerHTML = '❌ Error: ' + e.message;
        resultEl.style.color = '#ef4444';
      });
    });
  }

  // ── Formulario: ACTUALIZAR STOCK ──────────────────────────────────
  function mostrarFormularioStock(item, cantidadSugerida) {
    var formDiv = document.createElement('div');
    formDiv.className = 'ag-msg ag-msg-ai';
    formDiv.style.cssText = 'max-width:95%;background:#0f172a;border:1px solid #8b5cf6';
    formDiv.innerHTML =
      '<div style="margin-bottom:8px"><strong style="color:#a78bfa">📦 Actualizar stock:</strong> ' + esc(item.item) + '</div>' +
      '<div style="color:#64748b;font-size:11px;margin-bottom:8px">Stock actual: <strong style="color:#e2e8f0">' + (item.qty||0) + '</strong> · Mínimo: ' + (item.min||0) + '</div>' +
      '<label class="ag-label">Nueva cantidad *</label>' +
      '<input class="ag-input-field ag-stock-qty" type="number" min="0" value="' + (cantidadSugerida !== null ? cantidadSugerida : item.qty||0) + '">' +
      '<label class="ag-label" style="margin-top:6px">Motivo (opcional)</label>' +
      '<input class="ag-input-field ag-stock-obs" placeholder="Ej: Reposición, inventario físico...">' +
      '<div style="display:flex;gap:6px;margin-top:10px">' +
        '<button class="ag-btn ag-btn-blue ag-stock-submit" style="flex:1">✅ Actualizar</button>' +
        '<button class="ag-btn ag-stock-cancel">Cancelar</button>' +
      '</div>' +
      '<div class="ag-stock-result" style="margin-top:8px;font-size:11px"></div>';

    el.messages.appendChild(formDiv);
    el.messages.scrollTop = el.messages.scrollHeight;
    formDiv.querySelector('.ag-stock-qty').focus();
    formDiv.querySelector('.ag-stock-cancel').addEventListener('click', function() { formDiv.remove(); });
    formDiv.querySelector('.ag-stock-submit').addEventListener('click', function() {
      var nuevaQty = Number(formDiv.querySelector('.ag-stock-qty').value);
      var resultEl = formDiv.querySelector('.ag-stock-result');
      resultEl.innerHTML = '⏳ Guardando...'; resultEl.style.color = '#94a3b8';
      var updated = Object.assign({}, item, { qty: nuevaQty });
      apiPost('/api/item', { action: 'update', item: updated }).then(function(res) {
        if (!res.ok) throw new Error(res.error);
        var idx = items.findIndex(function(x) { return String(x.id) === String(item.id); });
        if (idx >= 0) items[idx] = updated;
        resultEl.innerHTML = '✅ Stock actualizado a ' + nuevaQty;
        resultEl.style.color = '#34d399';
        formDiv.querySelector('.ag-stock-submit').disabled = true;
      }).catch(function(e) {
        resultEl.innerHTML = '❌ ' + e.message; resultEl.style.color = '#ef4444';
      });
    });
  }

  // ── Formulario: CAMBIAR ESTADO ────────────────────────────────────
  function mostrarFormularioEstado(item, estadoSugerido) {
    var formDiv = document.createElement('div');
    formDiv.className = 'ag-msg ag-msg-ai';
    formDiv.style.cssText = 'max-width:95%;background:#0f172a;border:1px solid #06b6d4';
    var opts = ['Bueno','Deteriorado','Avería','Baja'].map(function(e) {
      return '<option value="' + e + '"' + (e === (estadoSugerido || item.est) ? ' selected' : '') + '>' + e + '</option>';
    }).join('');
    formDiv.innerHTML =
      '<div style="margin-bottom:8px"><strong style="color:#67e8f9">🔧 Cambiar estado:</strong> ' + esc(item.item) + '</div>' +
      '<div style="color:#64748b;font-size:11px;margin-bottom:8px">Estado actual: <strong style="color:#e2e8f0">' + esc(item.est||'—') + '</strong></div>' +
      '<label class="ag-label">Nuevo estado *</label>' +
      '<select class="ag-input-field ag-estado-sel" style="padding:7px">' + opts + '</select>' +
      '<label class="ag-label" style="margin-top:6px">Nota (opcional)</label>' +
      '<input class="ag-input-field ag-estado-obs" placeholder="Ej: Cable roto, pantalla rayada...">' +
      '<div style="display:flex;gap:6px;margin-top:10px">' +
        '<button class="ag-btn ag-btn-blue ag-estado-submit" style="flex:1">✅ Cambiar estado</button>' +
        '<button class="ag-btn ag-estado-cancel">Cancelar</button>' +
      '</div>' +
      '<div class="ag-estado-result" style="margin-top:8px;font-size:11px"></div>';

    el.messages.appendChild(formDiv);
    el.messages.scrollTop = el.messages.scrollHeight;
    formDiv.querySelector('.ag-estado-cancel').addEventListener('click', function() { formDiv.remove(); });
    formDiv.querySelector('.ag-estado-submit').addEventListener('click', function() {
      var nuevoEst = formDiv.querySelector('.ag-estado-sel').value;
      var obs = formDiv.querySelector('.ag-estado-obs').value.trim();
      var resultEl = formDiv.querySelector('.ag-estado-result');
      resultEl.innerHTML = '⏳ Guardando...'; resultEl.style.color = '#94a3b8';
      var updated = Object.assign({}, item, { est: nuevoEst, obs: obs || item.obs });
      apiPost('/api/item', { action: 'update', item: updated }).then(function(res) {
        if (!res.ok) throw new Error(res.error);
        var idx = items.findIndex(function(x) { return String(x.id) === String(item.id); });
        if (idx >= 0) items[idx] = updated;
        resultEl.innerHTML = '✅ Estado cambiado a ' + nuevoEst;
        resultEl.style.color = '#34d399';
        formDiv.querySelector('.ag-estado-submit').disabled = true;
      }).catch(function(e) {
        resultEl.innerHTML = '❌ ' + e.message; resultEl.style.color = '#ef4444';
      });
    });
  }

  // ── Formulario: MARCAR MANTENIMIENTO ─────────────────────────────
  function mostrarFormularioMantenimiento(item) {
    var formDiv = document.createElement('div');
    formDiv.className = 'ag-msg ag-msg-ai';
    formDiv.style.cssText = 'max-width:95%;background:#0f172a;border:1px solid #f59e0b';
    formDiv.innerHTML =
      '<div style="margin-bottom:8px"><strong style="color:#fbbf24">🛠 Solicitar mantenimiento:</strong> ' + esc(item.item) + '</div>' +
      '<label class="ag-label">Responsable (opcional)</label>' +
      '<input class="ag-input-field ag-mant-resp" placeholder="Ej: Servicio técnico, Juan...">' +
      '<label class="ag-label" style="margin-top:6px">Descripción del problema *</label>' +
      '<textarea class="ag-input-field ag-mant-nota" style="height:60px;resize:vertical" placeholder="Ej: No enciende, cable pelado..."></textarea>' +
      '<label class="ag-label" style="margin-top:6px">Fecha límite (opcional)</label>' +
      '<input class="ag-input-field ag-mant-fecha" type="date">' +
      '<div style="display:flex;gap:6px;margin-top:10px">' +
        '<button class="ag-btn ag-btn-blue ag-mant-submit" style="flex:1">✅ Solicitar</button>' +
        '<button class="ag-btn ag-mant-cancel">Cancelar</button>' +
      '</div>' +
      '<div class="ag-mant-result" style="margin-top:8px;font-size:11px"></div>';

    el.messages.appendChild(formDiv);
    el.messages.scrollTop = el.messages.scrollHeight;
    formDiv.querySelector('.ag-mant-cancel').addEventListener('click', function() { formDiv.remove(); });
    formDiv.querySelector('.ag-mant-submit').addEventListener('click', function() {
      var nota = formDiv.querySelector('.ag-mant-nota').value.trim();
      if (!nota) { formDiv.querySelector('.ag-mant-nota').style.borderColor = '#ef4444'; return; }
      var resp = formDiv.querySelector('.ag-mant-resp').value.trim();
      var fecha = formDiv.querySelector('.ag-mant-fecha').value;
      var resultEl = formDiv.querySelector('.ag-mant-result');
      resultEl.innerHTML = '⏳ Guardando...'; resultEl.style.color = '#94a3b8';
      var updated = Object.assign({}, item, {
        mant: '1', mantEstado: 'Pendiente',
        mantNota: nota, mantResp: resp, mantFecha: fecha
      });
      apiPost('/api/item', { action: 'update', item: updated }).then(function(res) {
        if (!res.ok) throw new Error(res.error);
        var idx = items.findIndex(function(x) { return String(x.id) === String(item.id); });
        if (idx >= 0) items[idx] = updated;
        resultEl.innerHTML = '✅ Mantenimiento solicitado';
        resultEl.style.color = '#34d399';
        formDiv.querySelector('.ag-mant-submit').disabled = true;
      }).catch(function(e) {
        resultEl.innerHTML = '❌ ' + e.message; resultEl.style.color = '#ef4444';
      });
    });
  }

  // ── Respuesta: CONSULTAS DIRECTAS (sin LLM) ───────────────────────
  function respuestaConsultaDirecta(tipo, q) {
    var n = normalize(q);

    if (tipo === 'stock_bajo') {
      var bajos = (items || []).filter(function(x) { return x.min && Number(x.qty) < Number(x.min); });
      if (!bajos.length) { appendMsg('ai', '✅ No hay ítems con stock bajo en este momento.'); return true; }
      appendMsgHtml('<strong style="color:#fbbf24">⚠ ' + bajos.length + ' ítems con stock bajo:</strong>' +
        '<table class="ag-table" style="width:100%;margin-top:8px"><thead><tr><th>Ítem</th><th>Aula</th><th>Stock</th><th>Mín.</th></tr></thead><tbody>' +
        bajos.slice(0,15).map(function(x) {
          return '<tr><td>' + esc(x.item) + '</td><td>' + esc(x.aula||'—') + '</td>' +
            '<td style="color:#ef4444;font-weight:700">' + x.qty + '</td><td>' + x.min + '</td></tr>';
        }).join('') + '</tbody></table>');
      return true;
    }

    if (tipo === 'lista_mantenimiento') {
      var mant = (items || []).filter(function(x) { return x.mant == 1 || x.mant === '1'; });
      if (!mant.length) { appendMsg('ai', '✅ No hay ítems pendientes de mantenimiento.'); return true; }
      appendMsgHtml('<strong style="color:#fbbf24">🛠 ' + mant.length + ' ítems con mantenimiento pendiente:</strong>' +
        '<table class="ag-table" style="width:100%;margin-top:8px"><thead><tr><th>Ítem</th><th>Aula</th><th>Estado</th><th>Responsable</th></tr></thead><tbody>' +
        mant.slice(0,15).map(function(x) {
          return '<tr><td>' + esc(x.item) + '</td><td>' + esc(x.aula||'—') + '</td>' +
            '<td>' + esc(x.mantEstado||'Pendiente') + '</td><td>' + esc(x.mantResp||'—') + '</td></tr>';
        }).join('') + '</tbody></table>');
      return true;
    }

    if (tipo === 'resumen_aula') {
      var aula = extraerAulaDeFrase(q);
      if (!aula) { appendMsg('ai', '¿De qué aula quieres el resumen? Ej: "¿qué hay en el Aula 35?"'); return true; }
      var aulaItems = (items || []).filter(function(x) { return x.aula === aula.id; });
      if (!aulaItems.length) { appendMsg('ai', 'No encontré ítems en ' + esc(aula.name) + '.'); return true; }
      var bajos2 = aulaItems.filter(function(x) { return x.min && Number(x.qty) < Number(x.min); }).length;
      var mant2 = aulaItems.filter(function(x) { return x.mant == 1 || x.mant === '1'; }).length;
      appendMsgHtml('<strong style="color:#67e8f9">🏫 Resumen ' + esc(aula.name) + '</strong> — ' +
        aulaItems.length + ' ítems · <span style="color:#ef4444">⚠ ' + bajos2 + ' stock bajo</span> · <span style="color:#fbbf24">🛠 ' + mant2 + ' mantenimiento</span>' +
        '<table class="ag-table" style="width:100%;margin-top:8px"><thead><tr><th>Ítem</th><th>Cant.</th><th>Estado</th><th>Ubicación</th></tr></thead><tbody>' +
        aulaItems.slice(0,20).map(function(x) {
          var low = x.min && Number(x.qty) < Number(x.min);
          return '<tr><td>' + esc(x.item) + '</td>' +
            '<td style="color:' + (low?'#ef4444':'#34d399') + ';font-weight:700">' + x.qty + '</td>' +
            '<td>' + esc(x.est||'—') + '</td><td style="color:#64748b">' + esc(x.loc||'—') + '</td></tr>';
        }).join('') + '</tbody></table>');
      return true;
    }

    if (tipo === 'quien_tiene') {
      var activos = (typeof prestamos !== 'undefined' ? prestamos : []).filter(function(p) { return p.estado === 'Activo'; });
      if (!activos.length) { appendMsg('ai', 'No hay préstamos activos en este momento.'); return true; }
      var palabras = n.replace(/\b(quien|quien|tiene|prestado|cogido|lleva|el|la|los|las|un|una|que|se|lo|la)\b/g,'').trim();
      var filtrados = palabras.length > 2 ? activos.filter(function(p) {
        return normalize(p.itemNombre||'').includes(palabras) || normalize(p.profesorNombre||'').includes(palabras);
      }) : activos;
      appendMsgHtml('<strong style="color:#7dd3fc">📋 Préstamos activos' +
        (palabras.length > 2 ? ' para "' + esc(palabras) + '"' : '') + ' (' + filtrados.length + '):</strong>' +
        '<table class="ag-table" style="width:100%;margin-top:8px"><thead><tr><th>Ítem</th><th>Profesor</th><th>Cant.</th><th>Desde</th><th>Prevista</th></tr></thead><tbody>' +
        filtrados.slice(0,10).map(function(p) {
          return '<tr><td>' + esc(p.itemNombre||'—') + '</td><td>' + esc(p.profesorNombre||'—') + '</td>' +
            '<td>' + (p.cantidad||1) + '</td><td style="color:#64748b">' + (p.fechaPrestamo||'').slice(0,10) + '</td>' +
            '<td style="color:#f59e0b">' + (p.fechaPrevista||'—').slice(0,10) + '</td></tr>';
        }).join('') + '</tbody></table>');
      return true;
    }

    return false;
  }

  // ── Seleccionar ítem con confirmación si hay varios ───────────────
  function seleccionarItemYEjecutar(q, callback) {
    var encontrados = searchInventoryItems(q);
    if (!encontrados || !encontrados.length) {
      appendMsg('ai', '❌ No encontré ningún ítem con ese nombre. ¿Puedes concretar más?');
      return;
    }
    if (encontrados.length === 1) { callback(encontrados[0]); return; }
    var listMsg = document.createElement('div');
    listMsg.className = 'ag-msg ag-msg-ai';
    listMsg.innerHTML = '<strong>¿A qué ítem te refieres?</strong><br><br>';
    encontrados.slice(0, 6).forEach(function(item) {
      var btn = document.createElement('button');
      btn.className = 'ag-quick-btn';
      btn.style.cssText = 'display:block;margin:4px 0;width:100%;text-align:left';
      btn.innerHTML = '📦 ' + esc(item.item) + ' <small style="color:#64748b">(Aula: ' + esc(item.aula||'—') + ' · ' + esc(item.est||'—') + ' · ' + (item.qty||0) + ' ud.)</small>';
      btn.addEventListener('click', (function(it) { return function() { listMsg.remove(); callback(it); }; })(item));
      listMsg.appendChild(btn);
    });
    el.messages.appendChild(listMsg);
    el.messages.scrollTop = el.messages.scrollHeight;
  }

  function appendMsgHtml(html) {
    var div = document.createElement('div');
    div.className = 'ag-msg ag-msg-ai';
    div.innerHTML = html;
    el.messages.appendChild(div);
    el.messages.scrollTop = el.messages.scrollHeight;
  }

  function appendMsgInDiv(div, text, color) {
    var r = div.querySelector('.ag-dev-result') || div.querySelector('.ag-stock-result') || div.querySelector('.ag-mant-result');
    if (r) { r.innerHTML = text; r.style.color = color || '#e2e8f0'; }
  }

  function sendChat(text) {
    var input = el.chatInput;
    // Si text es un evento (cuando viene de click), ignorarlo
    var queryText = (typeof text === 'string') ? text : '';
    var q = queryText || input.value.trim();
    if (!q || state.loading) return;
    input.value = '';
    el.panel.querySelector('#ag-quick').style.display = 'none';

    // Añadir mensaje usuario
    state.messages.push({ role: 'user', content: q });
    appendMsg('user', q);

    // ── INTERCEPTAR ACCIÓN DE AÑADIR ITEM ─────────────────────
    if (detectarIntencionAnadirItem(q)) {
      var nombreExtraido = extraerNombreItem(q);
      mostrarFormularioNuevoItem(nombreExtraido, q); // pasa frase completa para autocompletar
      return;
    }

    // ── PARSER CENTRAL DE INTENCIONES ──────────────────────────
    var intencion = detectarIntencion(q);
    if (intencion) {
      // Consultas directas sin ítem concreto
      if (intencion.tipo === 'stock_bajo' || intencion.tipo === 'lista_mantenimiento' ||
          intencion.tipo === 'resumen_aula' || intencion.tipo === 'quien_tiene') {
        respuestaConsultaDirecta(intencion.tipo, q);
        return;
      }
      // Acciones que necesitan un ítem: buscar primero
      if (intencion.tipo === 'devolver') {
        var termBusq = q.replace(/devuelve|devolver|devolverlo|devolverla|devolucion|devolución/gi,'').trim();
        var prestActivos = buscarPrestamosActivos(termBusq || '');
        if (!prestActivos.length) prestActivos = buscarPrestamosActivos(''); // si no encuentra, mostrar todos
        mostrarFormularioDevolucion(prestActivos, termBusq || null);
        return;
      }
      if (intencion.tipo === 'stock') {
        seleccionarItemYEjecutar(q, function(item) {
          mostrarFormularioStock(item, intencion.cantidad);
        });
        return;
      }
      if (intencion.tipo === 'estado') {
        seleccionarItemYEjecutar(q, function(item) {
          mostrarFormularioEstado(item, intencion.estado);
        });
        return;
      }
      if (intencion.tipo === 'mantenimiento') {
        seleccionarItemYEjecutar(q, function(item) {
          mostrarFormularioMantenimiento(item);
        });
        return;
      }
    }

    // ── INTERCEPTAR ACCIÓN DE PRÉSTAMO ─────────────────────────
    if (detectarIntencionPrestamo(q)) {
      // Buscar item en la pregunta actual; si no hay, buscar en mensajes anteriores
      var encontrados = searchInventoryItems(q);
      if (!encontrados || encontrados.length === 0) {
        // Recorrer historial de mensajes recientes buscando el item mencionado
        for (var mi = state.messages.length - 2; mi >= 0 && mi >= state.messages.length - 6; mi--) {
          var prevMsg = state.messages[mi];
          if (prevMsg && prevMsg.content) {
            encontrados = searchInventoryItems(prevMsg.content);
            if (encontrados && encontrados.length > 0) break;
          }
        }
      }
      if (encontrados && encontrados.length > 0) {
        if (encontrados.length === 1) {
          mostrarFormularioPrestamo(encontrados[0]);
          return;
        }
        // Si hay varios, pedir que elija
        var listaMsg = document.createElement('div');
        listaMsg.className = 'ag-msg ag-msg-ai';
        listaMsg.innerHTML = '<strong>Encontré varios materiales. ¿Cuál quieres pedir?</strong><br><br>';
        encontrados.slice(0, 5).forEach(function(item) {
          var btn = document.createElement('button');
          btn.className = 'ag-quick-btn';
          btn.style.cssText = 'display:block;margin:4px 0;width:100%;text-align:left';
          var qty = item.qty != null ? item.qty : (item.cantidad || 0);
          var nombreBtn = item.item || item.nombre || item.name || '(sin nombre)';
          btn.innerHTML = '📦 ' + esc(nombreBtn) + ' <small style="color:#64748b">(Aula: ' + esc(item.aula || '—') + ', Stock: ' + qty + ')</small>';
          btn.addEventListener('click', (function(it) { return function() {
            listaMsg.remove();
            mostrarFormularioPrestamo(it);
          }; })(item));
          listaMsg.appendChild(btn);
        });
        el.messages.appendChild(listaMsg);
        el.messages.scrollTop = el.messages.scrollHeight;
        return;
      }
      // No encontró item — pedir al usuario que lo especifique
      appendMsg('ai', '¿Qué material quieres pedir prestado? Dime el nombre y lo busco en el inventario.');
      state.loading = false;
      el.panel.querySelector('#ag-send').disabled = false;
      return;
    }

    // Dots
    var dots = document.createElement('div');
    dots.className = 'ag-dots';
    [0,1,2].forEach(function(i){
      var d = document.createElement('div');
      d.className = 'ag-dot';
      d.style.animationDelay = (i * 0.2) + 's';
      dots.appendChild(d);
    });
    el.messages.appendChild(dots);
    el.messages.scrollTop = el.messages.scrollHeight;

    state.loading = true;
    el.panel.querySelector('#ag-send').disabled = true;

    // Búsqueda inteligente: detectar consultas de stock y filtrar localmente
    var contextExtra = ctxExtra();
    var stockResults = checkStockQuery(q);
    if (stockResults) {
      contextExtra += stockResults;
    } else {
      var searchResults = searchInventory(q);
      if (searchResults && searchResults.length > 0) {
        contextExtra += '\n\n✅ RESULTADOS DE BÚSQUEDA para "' + q + '" (' + searchResults.length + ' encontrados):\n' +
          searchResults.join('\n') +
          '\n\nUSA ESTOS DATOS: Son resultados directos del inventario real.';
      } else {
        contextExtra += '\n\n❌ BÚSQUEDA para "' + q + '": No se encontraron coincidencias en el inventario.';
      }
    }

    var full = '';
    var aiDiv = null;

    streamAI(state.messages, contextExtra, function(delta) {
      if (!aiDiv) {
        dots.remove();
        aiDiv = document.createElement('div');
        aiDiv.className = 'ag-msg ag-msg-ai';
        el.messages.appendChild(aiDiv);
      }
      full += delta;
      aiDiv.innerHTML = md2html(full) + '<span class="ag-cursor"></span>';
      el.messages.scrollTop = el.messages.scrollHeight;
    }).then(function() {
      if (aiDiv) { aiDiv.innerHTML = md2html(full); linkifyItems(aiDiv); }
      state.messages.push({ role: 'assistant', content: full });
      state.loading = false;
      el.panel.querySelector('#ag-send').disabled = false;
    }).catch(function(e) {
      dots.remove();
      appendMsg('ai', '❌ Error: ' + e.message);
      state.loading = false;
      el.panel.querySelector('#ag-send').disabled = false;
    });
  }

  function appendMsg(role, html) {
    var div = document.createElement('div');
    div.className = 'ag-msg ag-msg-' + (role === 'user' ? 'user' : 'ai');
    if (role === 'user') div.textContent = html;
    else div.innerHTML = md2html(html);
    el.messages.appendChild(div);
    el.messages.scrollTop = el.messages.scrollHeight;
  }

  // ── Escáner de QR / código de barras ──────────────────────────────────────
  function startScan() {
    if (!('BarcodeDetector' in window)) {
      // Fallback: input manual
      var codigo = prompt('Tu navegador no soporta escáner de cámara.\nEscribe el código manualmente (referencia o ID del item):');
      if (codigo) buscarPorCodigo(codigo.trim());
      return;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast && toast('No se puede acceder a la cámara', 'err');
      return;
    }

    // Crear overlay con video
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:#000;z-index:100000;display:flex;flex-direction:column;align-items:center;justify-content:center';
    overlay.innerHTML = '<div style="position:absolute;top:14px;left:14px;right:14px;color:#fff;font-family:monospace;font-size:13px;text-align:center">📷 Apunta a un código QR o código de barras</div>' +
      '<video autoplay playsinline style="max-width:90vw;max-height:70vh;border-radius:12px"></video>' +
      '<button style="position:absolute;top:10px;right:10px;background:#ef4444;color:#fff;border:none;border-radius:50%;width:36px;height:36px;font-size:16px;cursor:pointer">✕</button>';
    document.body.appendChild(overlay);

    var video = overlay.querySelector('video');
    var closeBtn = overlay.querySelector('button');
    var stream = null;
    var detector = new window.BarcodeDetector({ formats: ['qr_code', 'ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e'] });
    var scanning = true;

    function stop() {
      scanning = false;
      if (stream) stream.getTracks().forEach(function(t){ t.stop(); });
      overlay.remove();
    }
    closeBtn.addEventListener('click', stop);

    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }).then(function(s) {
      stream = s;
      video.srcObject = s;
      function loop() {
        if (!scanning) return;
        detector.detect(video).then(function(codes) {
          if (codes && codes.length > 0) {
            var code = codes[0].rawValue;
            stop();
            buscarPorCodigo(code);
          } else {
            requestAnimationFrame(loop);
          }
        }).catch(function() { requestAnimationFrame(loop); });
      }
      video.addEventListener('loadedmetadata', loop);
    }).catch(function(e) {
      stop();
      alert('Error al acceder a la cámara: ' + e.message);
    });
  }

  function buscarPorCodigo(codigo) {
    if (!codigo) return;
    // Buscar en inventario por ref, id, o nombre
    var match = state.inventario.find(function(i) {
      return String(i.id) === codigo ||
        (i.ref || '').toLowerCase() === codigo.toLowerCase() ||
        (i.referencia || '').toLowerCase() === codigo.toLowerCase();
    });

    if (match) {
      // Insertar resultado directo en el chat
      var nombre = match.item || match.nombre || match.name || '(sin nombre)';
      var qty = match.qty != null ? match.qty : (match.cantidad || 0);
      appendMsg('user', '📷 Código escaneado: ' + codigo);
      var resultDiv = document.createElement('div');
      resultDiv.className = 'ag-msg ag-msg-ai';
      resultDiv.innerHTML = '✅ <strong>' + esc(nombre) + '</strong><br>' +
        '<small>Aula: ' + esc(match.aula || '—') + ' · Stock: ' + qty + ' · Ref: ' + esc(match.ref || '—') + '</small>';
      el.messages.appendChild(resultDiv);
      el.messages.scrollTop = el.messages.scrollHeight;
    } else {
      appendMsg('user', '📷 Código escaneado: ' + codigo);
      appendMsg('ai', '❌ No encuentro ningún ítem con código/referencia "' + codigo + '".');
    }
  }


  // ── Auditoría ──────────────────────────────────────────────────────────────
  var CAMPOS_AUDIT = { cat: 'Categoría', aula: 'Aula', ref: 'Referencia' };

  function getMissing(item) {
    return Object.keys(CAMPOS_AUDIT).filter(function(k){ return !item[k] && item[k] !== 0; }).map(function(k){ return CAMPOS_AUDIT[k]; });
  }

  function renderAudit() {
    var inv = state.inventario;
    var conProb = inv.filter(function(i){ return getMissing(i).length > 0; });

    // Filtro
    var filtrados = state.auditFiltro === 'todos' ? conProb
      : conProb.filter(function(i){ return !i[state.auditFiltro]; });

    // Badges
    var bd = el.panel.querySelector('#ag-audit-badges');
    bd.innerHTML = '';
    [
      ['red', conProb.length + ' con problemas'],
      ['green', (inv.length - conProb.length) + ' completos'],
      ['gray', inv.length + ' total'],
    ].forEach(function(b){ bd.appendChild(renderBadgeEl(b[0], b[1])); });

    // Tabla
    var html = '<table class="ag-table"><thead><tr><th>Nombre</th><th>Aula</th><th>Cat</th><th>Ref</th></tr></thead><tbody>';
    filtrados.slice(0, 40).forEach(function(item){
      html += '<tr>' +
        '<td>' + esc(item.nombre || '') + '</td>' +
        '<td style="color:' + (item.aula ? '#94a3b8' : '#ef4444') + '">' + esc(item.aula || '⚠️') + '</td>' +
        '<td style="color:' + (item.cat ? '#94a3b8' : '#ef4444') + '">' + esc(item.cat || '⚠️') + '</td>' +
        '<td style="color:' + (item.ref ? '#94a3b8' : '#f59e0b') + '">' + esc(item.ref || '—') + '</td>' +
        '</tr>';
    });
    html += '</tbody></table>';
    if (filtrados.length > 40) html += '<p style="color:#475569;font-size:10px;padding:4px 0">... y ' + (filtrados.length - 40) + ' más</p>';
    el.panel.querySelector('#ag-audit-table').innerHTML = filtrados.length ? html : '<p style="color:#34d399;font-size:11px">✅ Sin problemas en este filtro</p>';
  }

  function auditAI() {
    var conProb = state.inventario.filter(function(i){ return getMissing(i).length > 0; });
    var result = el.panel.querySelector('#ag-audit-result');
    result.style.display = 'block';
    result.innerHTML = '⏳ Analizando...';
    var muestra = conProb.slice(0, 12).map(function(i){ return { nombre: i.nombre, aula: i.aula, cat: i.cat, ref: i.ref, proveedor: i.proveedor, faltantes: getMissing(i) }; });
    var prompt = 'Audita estos ' + conProb.length + ' items del inventario FP con campos incompletos (muestra los primeros ' + muestra.length + '):\n' + JSON.stringify(muestra) + '\nSugiere valores razonables basandote en el nombre. Tabla: Item | Campos faltantes | Sugerencia | Prioridad';
    var full = '';
    streamAI([{ role: 'user', content: prompt }], '', function(d){ full += d; result.innerHTML = md2html(full); })
      .catch(function(e){ result.innerHTML = '❌ ' + e.message; });
  }

  // ── CSV ────────────────────────────────────────────────────────────────────
  function parseCSV(text) {
    var lines = text.trim().split('\n');
    if (lines.length < 2) return [];
    var headers = lines[0].split(',').map(function(h){ return h.trim().replace(/^"|"$/g,''); });
    return lines.slice(1).map(function(line){
      var vals = line.split(',').map(function(v){ return v.trim().replace(/^"|"$/g,''); });
      var obj = {};
      headers.forEach(function(h, i){ obj[h] = vals[i] || ''; });
      return obj;
    });
  }

  function analyzeCSV() {
    var text = el.panel.querySelector('#ag-csv-text').value.trim();
    if (!text) return;
    state.csvParsed = parseCSV(text);
    var result = el.panel.querySelector('#ag-csv-result');
    var bd = el.panel.querySelector('#ag-csv-badges');
    result.style.display = 'block';
    result.innerHTML = '⏳ Analizando CSV...';

    // Badges
    bd.innerHTML = '';
    if (state.csvParsed.length) {
      [
        ['green', state.csvParsed.length + ' filas'],
        ['blue', Object.keys(state.csvParsed[0]).length + ' columnas'],
        ['red', state.csvParsed.filter(function(r){ return !r['Nombre'] && !r['nombre']; }).length + ' sin nombre'],
      ].forEach(function(b){ bd.appendChild(renderBadgeEl(b[0], b[1])); });
    }

    var importBtn = el.panel.querySelector('#ag-csv-import');
    importBtn.disabled = state.csvParsed.length === 0;

    var prompt = 'Analiza este CSV de inventario FP (' + state.csvParsed.length + ' filas). Columnas: ' +
      Object.keys(state.csvParsed[0] || {}).join(', ') + '.\nPrimeras 5 filas:\n' + JSON.stringify(state.csvParsed.slice(0,5)) +
      '\nDetecta: campos vacios criticos, valores incoherentes, columnas no reconocidas. Resume que se importara y que problemas hay.';
    var full = '';
    streamAI([{ role: 'user', content: prompt }], '', function(d){ full += d; result.innerHTML = md2html(full); })
      .catch(function(e){ result.innerHTML = '❌ ' + e.message; });
  }

  function importCSV() {
    if (!state.csvParsed.length) return;
    var result = el.panel.querySelector('#ag-csv-result');
    result.style.display = 'block';
    result.innerHTML = '⏳ Importando ' + state.csvParsed.length + ' ítems...';
    apiPost('/api/item', { action: 'bulkImport', items: state.csvParsed })
      .then(function(res){ result.innerHTML = '✅ Importación completada.<br><small>' + JSON.stringify(res) + '</small>'; loadData(); })
      .catch(function(e){ result.innerHTML = '❌ Error: ' + e.message; });
  }

  // ── Init ───────────────────────────────────────────────────────────────────
  function init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', buildWidget);
    } else {
      buildWidget();
    }
  }

  init();

})();
