import { isBiometricAvailable, signIn, signInWithBiometrics, signUp, hasRegisteredBiometric } from '../services/authService.js';

export function openAuthModal({ onSuccess } = {}) {
  document.getElementById('calmal-auth-modal')?.remove();
  const modal = document.createElement('div'); modal.id = 'calmal-auth-modal'; modal.className = 'modal-backdrop';
  modal.innerHTML = `
    <div class="modal card stack" role="dialog" aria-modal="true" aria-labelledby="auth-title" style="max-width:420px;width:calc(100% - 32px);margin:auto">
      <div class="row between"><h2 id="auth-title" class="card-title">Sign in to CalMal</h2><button class="btn btn-ghost btn-sm" data-close aria-label="Close">×</button></div>
      <div class="row" role="tablist"><button class="btn btn-sm btn-primary" data-tab="sign-in">Sign In</button><button class="btn btn-sm btn-ghost" data-tab="sign-up">Create Account</button></div>
      <form class="stack" id="auth-form"><label class="field"><span>Username</span><input class="input" name="username" autocomplete="username" required minlength="3" maxlength="32" pattern="[A-Za-z0-9_]+" /></label><label class="field"><span>Password</span><input class="input" name="password" type="password" autocomplete="current-password" required minlength="10" /></label><p class="small muted" data-password-hint hidden>Password: 10+ chars, uppercase, lowercase, number.</p><button class="btn btn-primary" type="submit" data-submit>Sign In</button></form>
      <button class="btn btn-secondary" type="button" data-biometric hidden>Unlock with biometrics</button><p class="small" role="status" data-status></p>
    </div>`;
  document.body.append(modal);
  const form = modal.querySelector('#auth-form'), submit = modal.querySelector('[data-submit]'), status = modal.querySelector('[data-status]'); let mode = 'sign-in';
  const setStatus = (message, error = false) => { status.textContent = message; status.style.color = error ? 'var(--danger)' : 'var(--ok)'; };
  const setMode = (next) => { mode = next; modal.querySelectorAll('[data-tab]').forEach((b) => { b.classList.toggle('btn-primary', b.dataset.tab === mode); b.classList.toggle('btn-ghost', b.dataset.tab !== mode); }); submit.textContent = mode === 'sign-in' ? 'Sign In' : 'Create Account'; form.querySelector('[name=password]').autocomplete = mode === 'sign-in' ? 'current-password' : 'new-password'; modal.querySelector('[data-password-hint]').hidden = mode !== 'sign-up'; };
  modal.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.tab)));
  modal.querySelector('[data-close]').addEventListener('click', () => modal.remove());
  form.addEventListener('submit', async (event) => { event.preventDefault(); submit.disabled = true; setStatus('Working…'); const data = new FormData(form); try { const result = mode === 'sign-in' ? await signIn(data.get('username'), data.get('password')) : await signUp(data.get('username'), data.get('password')); setStatus('Signed in.'); onSuccess?.(result); setTimeout(() => modal.remove(), 250); } catch (err) { setStatus(err.message || 'Authentication failed.', true); } finally { submit.disabled = false; } });
  const biometric = modal.querySelector('[data-biometric]');
  isBiometricAvailable().then((available) => { biometric.hidden = !(available && hasRegisteredBiometric()); });
  biometric.addEventListener('click', async () => { biometric.disabled = true; setStatus('Waiting for biometrics…'); try { await signInWithBiometrics(); onSuccess?.(); modal.remove(); } catch (err) { setStatus(err.message, true); biometric.disabled = false; } });
  return () => modal.remove();
}
