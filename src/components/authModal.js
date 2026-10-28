import { getAuthVault, isBiometricAvailable, loginWithCombinedAuth, registerWithCombinedAuth } from '../services/authService.js';

export function openAuthModal({ onSuccess } = {}) {
  document.getElementById('calmal-auth-modal')?.remove();
  const modal = document.createElement('div');
  modal.id = 'calmal-auth-modal';
  modal.className = 'modal-backdrop';
  modal.innerHTML = `
    <div class="modal card stack" role="dialog" aria-modal="true" aria-labelledby="auth-title" style="max-width:420px;width:calc(100% - 32px);margin:auto">
      <div class="row between"><h2 id="auth-title" class="card-title">CalMal account</h2><button class="btn btn-ghost btn-sm" data-close aria-label="Close">×</button></div>
      <div class="row"><button class="btn btn-sm btn-primary" data-mode="sign-in">Sign In</button><button class="btn btn-sm btn-ghost" data-mode="sign-up">Create Account</button></div>
      <form class="stack" id="auth-form">
        <label class="field"><span>Username</span><input class="input" name="username" autocomplete="username" required minlength="3" maxlength="32" pattern="[A-Za-z0-9_]+" /></label>
        <label class="field"><span>Password</span><input class="input" name="password" type="password" autocomplete="current-password" required minlength="8" /></label>
        <button class="btn btn-primary" type="submit" data-submit>Verify Password & Scan Biometric</button>
      </form>
      <p class="small muted" data-device>Checking biometric support…</p><p class="small" role="status" data-status></p>
    </div>`;
  document.body.append(modal);
  const form = modal.querySelector('#auth-form');
  const submit = modal.querySelector('[data-submit]');
  const status = modal.querySelector('[data-status]');
  let mode = getAuthVault() ? 'sign-in' : 'sign-up';
  const setStatus = (message, error = false) => { status.textContent = message; status.style.color = error ? 'var(--danger)' : 'var(--ok)'; };
  const updateMode = () => {
    modal.querySelectorAll('[data-mode]').forEach((button) => { const active = button.dataset.mode === mode; button.classList.toggle('btn-primary', active); button.classList.toggle('btn-ghost', !active); });
    submit.textContent = mode === 'sign-up' ? 'Register Password + Biometric Key' : 'Verify Password & Scan Biometric';
  };
  modal.querySelectorAll('[data-mode]').forEach((button) => button.addEventListener('click', () => { mode = button.dataset.mode; updateMode(); }));
  modal.querySelector('[data-close]').addEventListener('click', () => modal.remove());
  isBiometricAvailable().then((available) => { modal.querySelector('[data-device]').textContent = available ? 'Platform biometric available.' : 'Biometric hardware unavailable.'; submit.disabled = !available; });
  form.addEventListener('submit', async (event) => {
    event.preventDefault(); submit.disabled = true; setStatus('Waiting for biometric verification…');
    const data = new FormData(form);
    try {
      const result = mode === 'sign-up' ? await registerWithCombinedAuth(data.get('username'), data.get('password')) : await loginWithCombinedAuth(data.get('username'), data.get('password'));
      setStatus('Authentication key unlocked.'); onSuccess?.(result); setTimeout(() => modal.remove(), 250);
    } catch (error) { setStatus(error.message || 'Authentication failed.', true); }
    finally { submit.disabled = false; }
  });
  updateMode();
  return () => modal.remove();
}

