// ═════════════════════════════════════════════════════════
// RECUPERACIÓN DE CONTRASEÑA
// ═════════════════════════════════════════════════════════
let _resetToken = null;

// ─── LOGIN: alternar vistas ───────────────────────────────
function showRecovery() {
  document.getElementById('loginForm').style.display = 'none';
  document.getElementById('recoveryForm').style.display = 'block';
  document.getElementById('recoveryError').classList.remove('show');
  document.getElementById('recoveryOk').classList.remove('show');
  document.getElementById('recoveryUser').value = '';
  document.getElementById('recoveryUser').focus();
}

function showLogin() {
  document.getElementById('recoveryForm').style.display = 'none';
  document.getElementById('loginForm').style.display = 'block';
}

// ─── SOLICITAR RECUPERACIÓN ───────────────────────────────
async function requestReset() {
  const usuario = document.getElementById('recoveryUser').value.trim();
  const errEl = document.getElementById('recoveryError');
  const okEl  = document.getElementById('recoveryOk');
  errEl.classList.remove('show');
  okEl.classList.remove('show');

  if (!usuario) {
    errEl.textContent = 'Introduce tu usuario';
    errEl.classList.add('show');
    return;
  }

  const btn = document.getElementById('recoveryBtn');
  btn.disabled = true; btn.textContent = 'Enviando...';
  try {
    const appUrl = window.location.href.split('#')[0];
    const sep = API_URL.includes('?') ? '&' : '?';
    const r = await fetch(`${API_URL}${sep}action=requestReset&usuario=${encodeURIComponent(usuario)}&appUrl=${encodeURIComponent(appUrl)}`);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    await r.json();
    // Mensaje genérico siempre (no revelar si el usuario existe)
    okEl.textContent = 'Si el usuario existe y tiene correo registrado, recibirás un enlace en breve.';
    okEl.classList.add('show');
    document.getElementById('recoveryUser').value = '';
  } catch (err) {
    errEl.textContent = 'Error de conexión. Inténtalo de nuevo.';
    errEl.classList.add('show');
  } finally {
    btn.disabled = false; btn.textContent = 'Enviar correo de recuperación';
  }
}

// ─── PÁGINA DE RESET (desde enlace del correo) ────────────
function showResetPage(token) {
  _resetToken = token;
  document.getElementById('resetPass1').value = '';
  document.getElementById('resetPass2').value = '';
  document.getElementById('resetError').classList.remove('show');
  show('pReset');
}

function goBackToLogin() {
  _resetToken = null;
  history.replaceState(null, '', window.location.pathname);
  show('pLogin');
  showLogin();
}

async function doResetPassword() {
  const p1 = document.getElementById('resetPass1').value;
  const p2 = document.getElementById('resetPass2').value;
  const errEl = document.getElementById('resetError');
  errEl.classList.remove('show');

  if (!p1 || !p2) { errEl.textContent = 'Rellena los dos campos'; errEl.classList.add('show'); return; }
  if (p1 !== p2)  { errEl.textContent = 'Las contraseñas no coinciden'; errEl.classList.add('show'); return; }
  if (p1.length < 4) { errEl.textContent = 'La contraseña debe tener al menos 4 caracteres'; errEl.classList.add('show'); return; }

  const btn = document.getElementById('resetBtn');
  btn.disabled = true; btn.textContent = 'Cambiando...';
  try {
    const r = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'resetPassword', token: _resetToken, newPassword: p1 }),
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      redirect: 'follow'
    });
    const res = await r.json();
    if (!res.ok) throw new Error(res.error || 'Error al cambiar la contraseña');

    _resetToken = null;
    history.replaceState(null, '', window.location.pathname);
    show('pLogin');
    showLogin();
    const okEl = document.getElementById('loginOk');
    okEl.textContent = '✓ Contraseña cambiada correctamente. Ya puedes iniciar sesión.';
    okEl.classList.add('show');
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.add('show');
  } finally {
    btn.disabled = false; btn.textContent = 'Cambiar contraseña';
  }
}

// ─── EVENT LISTENERS ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {
  document.getElementById('recoveryUser').addEventListener('keydown', e => { if (e.key === 'Enter') requestReset(); });
  document.getElementById('resetPass1').addEventListener('keydown', e => { if (e.key === 'Enter') doResetPassword(); });
  document.getElementById('resetPass2').addEventListener('keydown', e => { if (e.key === 'Enter') doResetPassword(); });
});
