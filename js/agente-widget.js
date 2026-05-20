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
    var systemMsg = 'Eres un agente experto en gestion de inventario de talleres FP de Electricidad y Electronica del IES Juan Bosco. ' +
      'Tienes acceso a datos REALES del inventario. Analiza los datos que se te proporcionan y responde con precision. ' +
      'Usa tablas markdown cuando sea util. Se conciso y orientado a la accion. Responde siempre en español.' +
      (systemExtra || '');

    var payload = {
      model: MODEL,
      max_tokens: 1000,
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
    prestamos: [],
    meta: {},
    messages: [],
    // préstamos form
    loanForm: { itemId: '', profesor: '', aula: '', cantidad: 1, devolucion: '' },
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

    // Datos ya en memoria de la app — camino rápido
    if (typeof items !== 'undefined' && Array.isArray(items) && items.length > 0) {
      state.inventario = items;
      state.prestamos = (typeof prestamos !== 'undefined' && Array.isArray(prestamos)) ? prestamos : [];
      state.dataLoaded = true;
      updateStatusBadge('green', '● ' + state.inventario.length + ' ítems');
      renderCurrentTab();
      return;
    }

    // Fallback: cargar desde API
    state.loading = true;
    updateStatusBadge('yellow', '⏳ Cargando...');
    var creds = getCreds();
    if (!creds) { updateStatusBadge('red', '❌ Sin sesión'); state.loading = false; return; }
    var u = encodeURIComponent(creds.u), p = encodeURIComponent(creds.p);

    Promise.all([
      fetch('/api/list?u=' + u + '&p=' + p).then(function(r){ return r.json(); }).catch(function(){ return {}; }),
      fetch('/api/prestar?u=' + u + '&p=' + p).then(function(r){ return r.json(); }).catch(function(){ return []; }),
    ]).then(function(results) {
      var listData = results[0];
      state.inventario = Array.isArray(listData) ? listData : decompressItems(listData);
      state.prestamos = Array.isArray(results[1]) ? results[1] : (results[1].prestamos || []);
      state.dataLoaded = true;
      state.loading = false;
      updateStatusBadge('green', '● ' + state.inventario.length + ' ítems');
      renderCurrentTab();
    }).catch(function(e) {
      state.loading = false;
      updateStatusBadge('red', '❌ Error');
      console.error('[Agente]', e);
    });
  }

  function updateStatusBadge(color, text) {
    if (!el.statusBadge) return;
    el.statusBadge.className = 'ag-badge ag-badge-' + color;
    el.statusBadge.textContent = text;
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
    fab.title = 'Agente IA Inventario';
    fab.innerHTML = '🤖 Agente IA';
    fab.addEventListener('click', togglePanel);
    document.body.appendChild(fab);
    el.fab = fab;

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
    panel.querySelector('#ag-send').addEventListener('click', sendChat);

    // Quick actions
    panel.querySelectorAll('.ag-quick-btn').forEach(function(b) {
      b.addEventListener('click', function(){ sendChat(b.dataset.q); });
    });

    // Messages container
    el.messages = panel.querySelector('#ag-messages');

    // Stock btn
    panel.querySelector('#ag-stock-btn').addEventListener('click', generateOrder);

    // Loans form
    el.loanItem = panel.querySelector('#ag-loan-item');
    el.loanProf = panel.querySelector('#ag-loan-prof');
    el.loanAula = panel.querySelector('#ag-loan-aula');
    el.loanQty  = panel.querySelector('#ag-loan-qty');
    el.loanDate = panel.querySelector('#ag-loan-date');
    panel.querySelector('#ag-loan-btn').addEventListener('click', registerLoan);

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
        '<button class="ag-tab active" data-tab="chat">🤖 Chat</button>',
        '<button class="ag-tab" data-tab="stock">📦 Stock</button>',
        '<button class="ag-tab" data-tab="loans">⌛ Préstamos</button>',
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
            '<button class="ag-quick-btn" data-q="¿Cuántos ítems hay y cuáles son las aulas?">¿Cuántos ítems hay y cuáles son las aulas?</button>',
            '<button class="ag-quick-btn" data-q="¿Qué materiales están bajo stock mínimo?">¿Qué materiales están bajo stock mínimo?</button>',
            '<button class="ag-quick-btn" data-q="¿Qué ítems tienen campos incompletos?">¿Qué ítems tienen campos incompletos?</button>',
            '<button class="ag-quick-btn" data-q="Genera un resumen del estado del inventario">Genera un resumen del estado del inventario</button>',
          '</div>',
          '<div class="ag-input-row">',
            '<input id="ag-chat-input" class="ag-input" placeholder="Pregunta sobre el inventario...">',
            '<button id="ag-send" class="ag-send" disabled>➤</button>',
          '</div>',
        '</div>',

        // ── Stock ──
        '<div id="ag-tab-stock" class="ag-panel">',
          '<p class="ag-section-title">📦 Control de Stock Mínimo</p>',
          '<div id="ag-stock-badges" class="ag-badges"></div>',
          '<div id="ag-stock-table" class="ag-table-wrap"><p style="color:#475569;font-size:11px">Cargando...</p></div>',
          '<button id="ag-stock-btn" class="ag-btn ag-btn-blue" disabled>🤖 Generar lista de pedido con IA</button>',
          '<div id="ag-stock-result" class="ag-ai-result" style="display:none"></div>',
        '</div>',

        // ── Préstamos ──
        '<div id="ag-tab-loans" class="ag-panel">',
          '<p class="ag-section-title">⌛ Registrar Préstamo</p>',
          '<div>',
            '<label class="ag-label">Material *</label>',
            '<select id="ag-loan-item" class="ag-input-field"><option value="">— Selecciona ítem —</option></select>',
          '</div>',
          '<div>',
            '<label class="ag-label">Profesor *</label>',
            '<select id="ag-loan-prof" class="ag-input-field"><option value="">— Selecciona profesor —</option></select>',
          '</div>',
          '<div class="ag-row">',
            '<div class="ag-col"><label class="ag-label">Aula destino</label><input id="ag-loan-aula" class="ag-input-field" placeholder="Ej: Aula 14"></div>',
            '<div class="ag-col"><label class="ag-label">Cantidad</label><input id="ag-loan-qty" class="ag-input-field" type="number" min="1" value="1"></div>',
          '</div>',
          '<div><label class="ag-label">Devolución prevista</label><input id="ag-loan-date" class="ag-input-field" type="date" min="' + today + '"></div>',
          '<button id="ag-loan-btn" class="ag-btn ag-btn-blue">📤 Registrar préstamo</button>',
          '<div id="ag-loan-result" class="ag-ai-result" style="display:none"></div>',
          '<p class="ag-section-title" style="margin-top:12px">Activos</p>',
          '<div id="ag-loans-table" class="ag-table-wrap"><p style="color:#475569;font-size:11px">Cargando...</p></div>',
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
    el.fab.innerHTML = '🤖 Agente IA';
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
    if (state.tab === 'stock') renderStock();
    if (state.tab === 'loans') renderLoans();
    if (state.tab === 'audit') renderAudit();
  }

  // ── Chat ───────────────────────────────────────────────────────────────────
  function renderChatReady() {
    var sendBtn = el.panel.querySelector('#ag-send');
    sendBtn.disabled = false;
    if (state.messages.length === 0) {
      el.panel.querySelector('#ag-quick').style.display = 'flex';
    }
  }

  function ctxExtra() {
    if (!state.inventario.length) return '';
    var inv = state.inventario;
    var aulas = [];
    inv.forEach(function(i){ if(i.aula && aulas.indexOf(i.aula)<0) aulas.push(i.aula); });
    var cats = [];
    inv.forEach(function(i){ if(i.cat && cats.indexOf(i.cat)<0) cats.push(i.cat); });
    var bajoMin = inv.filter(function(i){ return Number(i.min||i.stock_min)>0 && Number(i.qty??i.cantidad) < Number(i.min||i.stock_min); });
    var actPres = state.prestamos.filter(function(p){ return !p.devuelto && p.estado !== 'devuelto'; });

    // Muestra compacta de todos los items para el contexto de la IA
    var muestra = inv.slice(0, 120).map(function(i){
      var o = { n: i.nombre||i.name||'' };
      if(i.aula) o.a = i.aula;
      if(i.cat) o.c = i.cat;
      var q = i.qty != null ? i.qty : i.cantidad;
      if(q != null) o.q = q;
      var m = i.min != null ? i.min : i.stock_min;
      if(m != null) o.min = m;
      if(i.ref) o.r = i.ref;
      return o;
    });

    return '\n\nDATOS REALES del inventario (total ' + inv.length + ' ítems):\n' +
      'Aulas: ' + aulas.join(', ') + '\n' +
      'Categorías: ' + cats.slice(0,20).join(', ') + '\n' +
      'Bajo mínimo: ' + bajoMin.length + ' ítems\n' +
      'Préstamos activos: ' + actPres.length + '\n' +
      'Ítems (primeros 120 de ' + inv.length + ', campos: n=nombre a=aula c=cat q=qty min=minimo r=ref):\n' +
      JSON.stringify(muestra);
  }

  function sendChat(text) {
    var input = el.chatInput;
    var q = text || input.value.trim();
    if (!q || state.loading) return;
    input.value = '';
    el.panel.querySelector('#ag-quick').style.display = 'none';

    // Añadir mensaje usuario
    state.messages.push({ role: 'user', content: q });
    appendMsg('user', q);

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

    var full = '';
    var aiDiv = null;

    streamAI(state.messages, ctxExtra(), function(delta) {
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
      if (aiDiv) { aiDiv.innerHTML = md2html(full); }
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

  // ── Stock ──────────────────────────────────────────────────────────────────
  function renderStock() {
    var inv = state.inventario;
    function qty(i){ return i.qty != null ? Number(i.qty) : Number(i.cantidad); }
    function minimo(i){ return i.min != null ? Number(i.min) : Number(i.stock_min); }
    var bajoMin = inv.filter(function(i){ return minimo(i) > 0 && qty(i) < minimo(i); });
    var sinStock = inv.filter(function(i){ return qty(i) === 0; });

    // Badges
    var bd = el.panel.querySelector('#ag-stock-badges');
    bd.innerHTML = '';
    [
      ['red', sinStock.length + ' sin stock'],
      ['yellow', bajoMin.length + ' bajo mínimo'],
      ['green', (inv.length - bajoMin.length) + ' OK'],
    ].forEach(function(b){ bd.appendChild(renderBadgeEl(b[0], b[1])); });

    // Tabla — ordenar por ratio stock/minimo
    var sorted = inv.filter(function(i){ return minimo(i) > 0; })
      .sort(function(a,b){ return (qty(a)/minimo(a)) - (qty(b)/minimo(b)); })
      .slice(0, 40);

    var html = '<table class="ag-table"><thead><tr><th>Material</th><th>Aula</th><th>Stock</th><th>Mín</th><th>Estado</th></tr></thead><tbody>';
    sorted.forEach(function(item) {
      var q = qty(item), m = minimo(item);
      var ratio = q / m;
      var est = q === 0 ? '🔴' : ratio < 0.5 ? '🟡' : '🟢';
      var col = q === 0 ? '#ef4444' : ratio < 0.5 ? '#f59e0b' : '#34d399';
      html += '<tr><td>' + esc(item.nombre || '') + '</td><td>' + esc(item.aula || '—') + '</td>' +
        '<td style="color:' + col + ';font-weight:700">' + q + '</td>' +
        '<td style="color:#64748b">' + m + '</td><td>' + est + '</td></tr>';
    });
    html += '</tbody></table>';
    el.panel.querySelector('#ag-stock-table').innerHTML = bajoMin.length ? html : '<p style="color:#34d399;font-size:11px">✅ Sin ítems bajo mínimo</p>';
    el.panel.querySelector('#ag-stock-btn').disabled = bajoMin.length === 0;
  }

  function generateOrder() {
    function qty(i){ return i.qty != null ? Number(i.qty) : Number(i.cantidad); }
    function minimo(i){ return i.min != null ? Number(i.min) : Number(i.stock_min); }
    var bajoMin = state.inventario.filter(function(i){ return minimo(i) > 0 && qty(i) < minimo(i); });
    var result = el.panel.querySelector('#ag-stock-result');
    result.style.display = 'block';
    result.innerHTML = '⏳ Generando lista de pedido...';
    var datos = bajoMin.map(function(i){ return { nombre: i.nombre, aula: i.aula, stock: qty(i), minimo: minimo(i), proveedor: i.proveedor || '—' }; });
    var prompt = 'Genera una lista de pedido priorizada. Items bajo minimo:\n' + JSON.stringify(datos) + '\nOrganiza por urgencia (sin stock primero), agrupa por proveedor, calcula cantidad a pedir para llegar al doble del minimo. Tabla: Material | Proveedor | Stock | Minimo | A pedir | Urgencia';
    var full = '';
    streamAI([{ role: 'user', content: prompt }], '', function(d){ full += d; result.innerHTML = md2html(full); })
      .catch(function(e){ result.innerHTML = '❌ ' + e.message; });
  }

  // ── Préstamos ──────────────────────────────────────────────────────────────
  function renderLoans() {
    // Rellenar selects si están vacíos
    var itemSel = el.loanItem;
    if (itemSel.options.length <= 1) {
      state.inventario.forEach(function(i){
        var opt = document.createElement('option');
        opt.value = i.id;
        opt.textContent = (i.nombre || '') + ' (' + (i.aula || '—') + ') · Stock: ' + i.cantidad;
        itemSel.appendChild(opt);
      });
    }
    var profSel = el.loanProf;
    if (profSel.options.length <= 1) {
      var profs = [];
      (state.meta.profesores || []).forEach(function(p){ var n = p.nombre || p; if (n && profs.indexOf(n) < 0) profs.push(n); });
      state.prestamos.forEach(function(p){ if (p.profesor && profs.indexOf(p.profesor) < 0) profs.push(p.profesor); });
      profs.forEach(function(n){
        var opt = document.createElement('option'); opt.value = n; opt.textContent = n; profSel.appendChild(opt);
      });
    }

    // Tabla de préstamos activos
    var activos = state.prestamos.filter(function(p){ return !p.devuelto && p.estado !== 'devuelto'; }).slice(0, 15);
    var html = '<table class="ag-table"><thead><tr><th>Material</th><th>Profesor</th><th>Dev.</th><th>Estado</th></tr></thead><tbody>';
    activos.forEach(function(l){
      var vencido = l.devolucion_prevista && new Date(l.devolucion_prevista) < new Date();
      var est = vencido ? '<span class="ag-badge ag-badge-red">Vencido</span>' : '<span class="ag-badge ag-badge-green">Activo</span>';
      html += '<tr><td>' + esc(l.item_nombre || l.nombre || '—') + '</td><td>' + esc(l.profesor || '') + '</td><td>' + esc(l.devolucion_prevista || '—') + '</td><td>' + est + '</td></tr>';
    });
    html += '</tbody></table>';
    el.panel.querySelector('#ag-loans-table').innerHTML = activos.length ? html : '<p style="color:#64748b;font-size:11px">Sin préstamos activos</p>';
  }

  function registerLoan() {
    var itemId = el.loanItem.value;
    var profesor = el.loanProf.value;
    if (!itemId || !profesor) { alert('Selecciona ítem y profesor'); return; }
    var result = el.panel.querySelector('#ag-loan-result');
    result.style.display = 'block';
    result.innerHTML = '⏳ Registrando...';
    apiPost('/api/prestar', {
      action: 'prestar',
      item_id: itemId,
      profesor: profesor,
      aula_destino: el.loanAula.value,
      cantidad: Number(el.loanQty.value) || 1,
      devolucion_prevista: el.loanDate.value,
    }).then(function(res){
      result.innerHTML = '✅ Préstamo registrado correctamente.<br><small>' + JSON.stringify(res) + '</small>';
      // Recarga préstamos
      apiGet('/api/list', { tipo: 'prestamos' }).then(function(d){
        state.prestamos = Array.isArray(d) ? d : (d.prestamos || []);
        renderLoans();
      }).catch(function(){});
    }).catch(function(e){
      result.innerHTML = '⚠️ Error en API: ' + e.message + '<br><small>El préstamo puede haberse registrado igualmente.</small>';
    });
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
