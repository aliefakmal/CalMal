import {
  getAuthVault,
  isBiometricAvailable,
  loginWithCombinedAuth,
  registerWithCombinedAuth,
} from '../services/authService.js';
import { icons } from '../components/icons.js';
import { t, getLang } from '../utils/i18n.js';
import { esc } from '../utils/helpers.js';

export function renderAuth(container, { onSuccess } = {}) {
  const vault = getAuthVault();
  let mode = vault ? 'sign-in' : 'sign-up';
  const isEn = getLang() === 'en';

  const eyeOpenSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`;
  const eyeOffSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>`;

  container.innerHTML = `
    <section class="auth-shell">
      <div class="auth-card auth-modal card stack">
        <div class="auth-modal-head">
          <div class="auth-modal-brand">
            <div class="auth-modal-icon">${icons.key}</div>
            <div>
              <span class="eyebrow">CalMal Security</span>
              <h1 class="auth-modal-title">${t('auth_title', 'Protect your progress')}</h1>
            </div>
          </div>
        </div>
        <p class="auth-modal-sub">${t('auth_subtitle', 'Use your password and device biometric together.')}</p>
        <div class="auth-steps" aria-label="Authentication steps">
          <span class="auth-step active">1. Password</span>
          <span class="auth-step">2. Biometric</span>
          <span class="auth-step">3. Unlocked</span>
        </div>
        <div class="auth-tabs" role="tablist">
          <div class="auth-tab-slider" data-slider></div>
          <button type="button" class="auth-tab-btn" data-mode="sign-in">${isEn ? 'Sign In' : 'Log Masuk'}</button>
          <button type="button" class="auth-tab-btn" data-mode="sign-up">${isEn ? 'Create Account' : 'Cipta Akaun'}</button>
        </div>
        <form class="auth-form-stack" id="combined-auth-form" novalidate>
          <label class="field">
            <span>${isEn ? 'Username' : 'Nama Pengguna'}</span>
            <div class="auth-input-wrap">
              <span class="auth-input-prefix">@</span>
              <input class="input auth-input-with-prefix" name="username" autocomplete="username" autocapitalize="none" spellcheck="false" value="${esc(vault?.username || '')}" placeholder="alief_hero" required minlength="3" maxlength="32" pattern="[A-Za-z0-9_]+" />
            </div>
          </label>
          <label class="field">
            <span>${isEn ? 'Password' : 'Kata Laluan'}</span>
            <div class="auth-input-wrap">
              <input class="input auth-input-with-Action" name="password" type="password" autocomplete="current-password" placeholder="Min. 8 characters" required minlength="8" />
              <button type="button" class="auth-eye-btn" data-toggle-pw aria-label="Show password">${eyeOpenSvg}</button>
            </div>
          </label>
          <p class="xs muted" data-hint>${isEn ? 'Password needs 8+ characters, uppercase, lowercase, and a number.' : 'Kata laluan memerlukan 8+ aksara, huruf besar, huruf kecil, dan nombor.'}</p>
          <button class="btn btn-primary btn-block auth-submit-btn" type="submit" data-submit>Verify Password & Scan Biometric</button>
        </form>
        <div class="auth-modal-foot">
          <div class="auth-device-pill">
            <span class="dot" data-device-dot></span>
            <span data-device>${isEn ? 'Checking biometric support…' : 'Menyemak sokongan biometrik…'}</span>
          </div>
          <p class="auth-status-msg" role="status" data-status></p>
        </div>
      </div>
    </section>`;

  const form = container.querySelector('#combined-auth-form');
  const submit = container.querySelector('[data-submit]');
  const status = container.querySelector('[data-status]');
  const device = container.querySelector('[data-device]');
  const deviceDot = container.querySelector('[data-device-dot]');
  const slider = container.querySelector('[data-slider]');
  const passwordInput = form.querySelector('[name="password"]');
  const togglePwBtn = container.querySelector('[data-toggle-pw]');

  togglePwBtn?.addEventListener('click', () => {
    const show = passwordInput.type === 'password';
    passwordInput.type = show ? 'text' : 'password';
    togglePwBtn.innerHTML = show ? eyeOffSvg : eyeOpenSvg;
  });

  const setStatus = (message, error = false) => {
    status.textContent = message;
    status.className = `auth-status-msg ${message ? (error ? 'is-error' : 'is-ok') : ''}`;
  };

  const updateMode = (animate = false) => {
    const isSignUp = mode === 'sign-up';
    if (slider) slider.style.transform = isSignUp ? 'translateX(100%)' : 'translateX(0%)';
    container.querySelectorAll('[data-mode]').forEach((button) => {
      const active = button.dataset.mode === mode;
      button.classList.toggle('active', active);
      button.classList.toggle('btn-primary', active);
      button.classList.toggle('btn-ghost', !active);
    });
    submit.textContent = isSignUp
      ? (isEn ? 'Register Password + Biometric Key' : 'Daftar Kata Laluan + Kunci Biometrik')
      : (isEn ? 'Verify Password & Scan Biometric' : 'Sahkan Kata Laluan & Imbas Biometrik');
    passwordInput.autocomplete = isSignUp ? 'new-password' : 'current-password';
    if (animate && form) {
      form.classList.remove('auth-form-anim');
      void form.offsetWidth;
      form.classList.add('auth-form-anim');
    }
  };

  container.querySelectorAll('[data-mode]').forEach((button) =>
    button.addEventListener('click', () => {
      if (mode === button.dataset.mode) return;
      mode = button.dataset.mode;
      updateMode(true);
    })
  );

  isBiometricAvailable().then((available) => {
    device.textContent = available
      ? (isEn ? 'Platform biometric available' : 'Biometrik peranti sedia digunakan')
      : (isEn ? 'Encrypted device key mode active' : 'Mod kunci peranti tersulit aktif');
    if (deviceDot) deviceDot.style.background = available ? 'var(--ok)' : 'var(--warn)';
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const rawUser = String(data.get('username') || '').trim();
    const rawPass = String(data.get('password') || '');
    if (!rawUser || rawUser.length < 3) {
      setStatus(isEn ? 'Username must be at least 3 characters.' : 'Nama pengguna mesti sekurang-kurangnya 3 aksara.', true);
      return;
    }
    if (!rawPass || rawPass.length < 8) {
      setStatus(isEn ? 'Password must be at least 8 characters.' : 'Kata laluan mesti sekurang-kurangnya 8 aksara.', true);
      return;
    }
    submit.disabled = true;
    setStatus(isEn ? 'Waiting for biometric verification…' : 'Menunggu pengesahan biometrik…');
    try {
      const result = mode === 'sign-up'
        ? await registerWithCombinedAuth(rawUser, rawPass)
        : await loginWithCombinedAuth(rawUser, rawPass);
      setStatus(isEn ? 'Authentication key unlocked.' : 'Kunci pengesahan dibuka.');
      onSuccess?.(result);
    } catch (error) {
      setStatus(error.message || 'Authentication failed.', true);
    } finally {
      submit.disabled = false;
    }
  });
  updateMode(false);
  return () => {};
}
