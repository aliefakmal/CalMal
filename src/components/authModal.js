import {
  getAuthVault,
  isBiometricAvailable,
  loginWithCombinedAuth,
  registerWithCombinedAuth,
} from '../services/authService.js';
import { icons } from './icons.js';
import { toast } from './ui.js';
import { getLang } from '../utils/i18n.js';
import { esc } from '../utils/helpers.js';

export function openAuthModal({ onSuccess, initialMode } = {}) {
  document.getElementById('calmal-auth-modal')?.remove();

  const isEn = getLang() === 'en';
  const vault = getAuthVault();
  let mode = initialMode || (vault ? 'sign-in' : 'sign-up');
  let closed = false;

  const modal = document.createElement('div');
  modal.id = 'calmal-auth-modal';
  modal.className = 'modal-backdrop';

  const eyeOpenSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`;
  const eyeOffSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>`;

  modal.innerHTML = `
    <div class="modal auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title">
      <div class="auth-modal-head">
        <div class="auth-modal-brand">
          <div class="auth-modal-icon">${icons.key}</div>
          <div>
            <span class="eyebrow">${isEn ? 'CalMal Security' : 'Keselamatan CalMal'}</span>
            <h2 id="auth-title" class="auth-modal-title">${isEn ? 'CalMal Account' : 'Akaun CalMal'}</h2>
          </div>
        </div>
        <button type="button" class="auth-close-btn" data-close aria-label="${isEn ? 'Close' : 'Tutup'}">
          ${icons.close}
        </button>
      </div>

      <p class="auth-modal-sub" data-subtitle></p>

      <div class="auth-tabs" role="tablist" aria-label="Authentication mode">
        <div class="auth-tab-slider" data-slider></div>
        <button type="button" class="auth-tab-btn" role="tab" data-mode="sign-in">
          ${isEn ? 'Sign In' : 'Log Masuk'}
        </button>
        <button type="button" class="auth-tab-btn" role="tab" data-mode="sign-up">
          ${isEn ? 'Create Account' : 'Cipta Akaun'}
        </button>
      </div>

      <form class="auth-form-stack" id="auth-form" novalidate>
        <label class="field">
          <span>${isEn ? 'Username' : 'Nama Pengguna'}</span>
          <div class="auth-input-wrap">
            <span class="auth-input-prefix">@</span>
            <input
              class="input auth-input-with-prefix"
              name="username"
              autocomplete="username"
              autocapitalize="none"
              spellcheck="false"
              placeholder="${isEn ? 'e.g. alief_hero' : 'cth. alief_hero'}"
              value="${esc(vault?.username || '')}"
              required
              minlength="3"
              maxlength="32"
              pattern="[A-Za-z0-9_]+"
            />
          </div>
        </label>

        <label class="field">
          <span>${isEn ? 'Password' : 'Kata Laluan'}</span>
          <div class="auth-input-wrap">
            <input
              class="input auth-input-with-Action"
              name="password"
              type="password"
              autocomplete="current-password"
              placeholder="${isEn ? 'Min. 8 characters' : 'Min. 8 aksara'}"
              required
              minlength="8"
            />
            <button type="button" class="auth-eye-btn" data-toggle-pw aria-label="${isEn ? 'Show password' : 'Tunjuk kata laluan'}">
              ${eyeOpenSvg}
            </button>
          </div>
        </label>

        <div class="auth-pw-rules" data-pw-rules>
          <span class="auth-rule-pill" data-rule="len">8+ ${isEn ? 'chars' : 'aksara'}</span>
          <span class="auth-rule-pill" data-rule="case">A–Z & a–z</span>
          <span class="auth-rule-pill" data-rule="num">0–9</span>
        </div>

        <button class="btn btn-primary btn-block auth-submit-btn" type="submit" data-submit>
          Verify Password & Scan Biometric
        </button>
      </form>

      <div class="auth-modal-foot">
        <div class="auth-device-pill" data-device-pill>
          <span class="dot" data-device-dot></span>
          <span data-device>${isEn ? 'Checking biometric support…' : 'Menyemak sokongan biometrik…'}</span>
        </div>
        <p class="auth-status-msg" role="status" aria-live="polite" data-status></p>
      </div>
    </div>`;

  const root = document.getElementById('overlay-root') || document.body;
  root.appendChild(modal);
  document.body.style.overflow = 'hidden';

  const dialog = modal.querySelector('.auth-modal');
  const form = modal.querySelector('#auth-form');
  const submit = modal.querySelector('[data-submit]');
  const status = modal.querySelector('[data-status]');
  const subtitle = modal.querySelector('[data-subtitle]');
  const slider = modal.querySelector('[data-slider]');
  const pwRules = modal.querySelector('[data-pw-rules]');
  const usernameInput = form.querySelector('[name="username"]');
  const passwordInput = form.querySelector('[name="password"]');
  const togglePwBtn = modal.querySelector('[data-toggle-pw]');
  const deviceText = modal.querySelector('[data-device]');
  const deviceDot = modal.querySelector('[data-device-dot]');

  const close = () => {
    if (closed) return;
    closed = true;
    document.removeEventListener('keydown', onKey);
    document.body.style.overflow = '';
    modal.classList.add('closing');
    setTimeout(() => modal.remove(), 220);
  };

  const onKey = (e) => {
    if (e.key === 'Escape') close();
  };
  document.addEventListener('keydown', onKey);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) close();
  });
  modal.querySelector('[data-close]')?.addEventListener('click', close);

  togglePwBtn?.addEventListener('click', () => {
    const show = passwordInput.type === 'password';
    passwordInput.type = show ? 'text' : 'password';
    togglePwBtn.innerHTML = show ? eyeOffSvg : eyeOpenSvg;
  });

  const setStatus = (message, error = false) => {
    status.textContent = message;
    status.className = `auth-status-msg ${message ? (error ? 'is-error' : 'is-ok') : ''}`;
  };

  const updatePwChecklist = () => {
    const val = passwordInput.value || '';
    const hasLen = val.length >= 8;
    const hasCase = /[a-z]/.test(val) && /[A-Z]/.test(val);
    const hasNum = /\d/.test(val);
    modal.querySelector('[data-rule="len"]')?.classList.toggle('met', hasLen);
    modal.querySelector('[data-rule="case"]')?.classList.toggle('met', hasCase);
    modal.querySelector('[data-rule="num"]')?.classList.toggle('met', hasNum);
  };

  passwordInput.addEventListener('input', updatePwChecklist);

  const updateMode = (animate = false) => {
    const isSignUp = mode === 'sign-up';
    if (slider) {
      slider.style.transform = isSignUp ? 'translateX(100%)' : 'translateX(0%)';
    }
    modal.querySelectorAll('[data-mode]').forEach((button) => {
      const active = button.dataset.mode === mode;
      button.classList.toggle('active', active);
      button.classList.toggle('btn-primary', active);
      button.classList.toggle('btn-ghost', !active);
      button.setAttribute('aria-selected', String(active));
    });

    if (subtitle) {
      subtitle.textContent = isSignUp
        ? (isEn
            ? 'Create a secure key with your password and device biometric to back up your data.'
            : 'Cipta kunci selamat dengan kata laluan & biometrik peranti untuk menyandar data anda.')
        : (isEn
            ? 'Sign in with your username, password, and biometric key to sync your progress.'
            : 'Log masuk dengan nama pengguna, kata laluan, dan biometrik untuk segerakkan data.');
    }

    if (pwRules) {
      pwRules.classList.toggle('hidden', !isSignUp);
    }

    passwordInput.autocomplete = isSignUp ? 'new-password' : 'current-password';
    submit.textContent = isSignUp
      ? (isEn ? 'Register Password + Biometric Key' : 'Daftar Kata Laluan + Kunci Biometrik')
      : (isEn ? 'Verify Password & Scan Biometric' : 'Sahkan Kata Laluan & Imbas Biometrik');

    setStatus('');

    if (animate && form) {
      form.classList.remove('auth-form-anim');
      void form.offsetWidth;
      form.classList.add('auth-form-anim');
    }
  };

  modal.querySelectorAll('[data-mode]').forEach((button) => {
    button.addEventListener('click', () => {
      if (mode === button.dataset.mode) return;
      mode = button.dataset.mode;
      updateMode(true);
    });
  });

  isBiometricAvailable().then((available) => {
    if (deviceText) {
      deviceText.textContent = available
        ? (isEn ? 'Platform biometric available' : 'Biometrik peranti sedia digunakan')
        : (isEn ? 'Encrypted device key mode active' : 'Mod kunci peranti tersulit aktif');
    }
    if (deviceDot) {
      deviceDot.style.background = available ? 'var(--ok)' : 'var(--warn)';
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const rawUser = String(data.get('username') || '').trim();
    const rawPass = String(data.get('password') || '');

    if (!rawUser || rawUser.length < 3) {
      setStatus(isEn ? 'Username must be at least 3 characters.' : 'Nama pengguna mesti sekurang-kurangnya 3 aksara.', true);
      usernameInput.focus();
      return;
    }
    if (!rawPass || rawPass.length < 8) {
      setStatus(isEn ? 'Password must be at least 8 characters.' : 'Kata laluan mesti sekurang-kurangnya 8 aksara.', true);
      passwordInput.focus();
      return;
    }

    submit.disabled = true;
    setStatus(isEn ? 'Verifying credentials & biometric key…' : 'Mengesahkan kelayakan & kunci biometrik…');

    try {
      const result = mode === 'sign-up'
        ? await registerWithCombinedAuth(rawUser, rawPass)
        : await loginWithCombinedAuth(rawUser, rawPass);
      setStatus(isEn ? 'Authentication key unlocked!' : 'Kunci pengesahan dibuka!');
      toast(
        mode === 'sign-up'
          ? (isEn ? `Account @${rawUser.toLowerCase()} created & synced!` : `Akaun @${rawUser.toLowerCase()} dicipta & disegerakkan!`)
          : (isEn ? `Welcome back, @${rawUser.toLowerCase()}!` : `Selamat kembali, @${rawUser.toLowerCase()}!`),
        'success'
      );
      onSuccess?.(result);
      setTimeout(() => close(), 220);
    } catch (error) {
      setStatus(error.message || (isEn ? 'Authentication failed.' : 'Pengesahan gagal.'), true);
    } finally {
      submit.disabled = false;
    }
  });

  updateMode(false);
  updatePwChecklist();

  setTimeout(() => {
    if (vault?.username && mode === 'sign-in') {
      passwordInput?.focus();
    } else {
      usernameInput?.focus();
    }
  }, 80);

  return close;
}
