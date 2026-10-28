import {
  getAuthVault,
  isBiometricAvailable,
  loginWithCombinedAuth,
  registerWithCombinedAuth,
} from '../services/authService.js';
import { t } from '../utils/i18n.js';

export function renderAuth(container, { onSuccess } = {}) {
  let mode = getAuthVault() ? 'sign-in' : 'sign-up';
  container.innerHTML = `
    <section class="auth-shell">
      <div class="auth-card card stack">
        <span class="eyebrow">CalMal security</span>
        <h1 class="page-title">${t('auth_title', 'Protect your progress')}</h1>
        <p class="muted">${t('auth_subtitle', 'Use your password and device biometric together.')}</p>
        <div class="auth-steps" aria-label="Authentication steps">
          <span class="auth-step active">1. Password</span><span class="auth-step">2. Biometric</span><span class="auth-step">3. Unlocked</span>
        </div>
        <div class="row" role="tablist">
          <button type="button" class="btn btn-primary btn-sm" data-mode="sign-in">Sign In</button>
          <button type="button" class="btn btn-ghost btn-sm" data-mode="sign-up">Create Account</button>
        </div>
        <form class="stack" id="combined-auth-form">
          <label class="field"><span>Username</span><input class="input" name="username" autocomplete="username" required minlength="3" maxlength="32" pattern="[A-Za-z0-9_]+" /></label>
          <label class="field"><span>Password</span><input class="input" name="password" type="password" autocomplete="current-password" required minlength="8" /></label>
          <p class="small muted" data-hint>Password needs 8+ characters, uppercase, lowercase, and a number.</p>
          <button class="btn btn-primary" type="submit" data-submit>Verify Password & Scan Biometric</button>
        </form>
        <p class="small muted" data-device>Checking biometric support…</p>
        <p class="small" role="status" data-status></p>
      </div>
    </section>`;

  const form = container.querySelector('#combined-auth-form');
  const submit = container.querySelector('[data-submit]');
  const status = container.querySelector('[data-status]');
  const device = container.querySelector('[data-device]');
  const setStatus = (message, error = false) => { status.textContent = message; status.style.color = error ? 'var(--danger)' : 'var(--ok)'; };
  const updateMode = () => {
    container.querySelectorAll('[data-mode]').forEach((button) => {
      const active = button.dataset.mode === mode;
      button.classList.toggle('btn-primary', active);
      button.classList.toggle('btn-ghost', !active);
    });
    submit.textContent = mode === 'sign-up' ? 'Register Password + Biometric Key' : 'Verify Password & Scan Biometric';
    form.querySelector('[name=password]').autocomplete = mode === 'sign-up' ? 'new-password' : 'current-password';
  };
  container.querySelectorAll('[data-mode]').forEach((button) => button.addEventListener('click', () => { mode = button.dataset.mode; updateMode(); }));
  isBiometricAvailable().then((available) => {
    device.textContent = available ? 'Platform biometric available.' : 'Biometric hardware unavailable. Use HTTPS and enable Windows Hello, Touch ID, or Android biometrics.';
    device.style.color = available ? 'var(--ok)' : 'var(--warn)';
    submit.disabled = !available;
  });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    submit.disabled = true;
    setStatus('Waiting for biometric verification…');
    const data = new FormData(form);
    try {
      const result = mode === 'sign-up'
        ? await registerWithCombinedAuth(data.get('username'), data.get('password'))
        : await loginWithCombinedAuth(data.get('username'), data.get('password'));
      setStatus('Authentication key unlocked.');
      onSuccess?.(result);
    } catch (error) {
      setStatus(error.message || 'Authentication failed.', true);
    } finally {
      submit.disabled = false;
    }
  });
  updateMode();
  return () => {};
}

