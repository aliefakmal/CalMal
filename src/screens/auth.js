import { createLocalAccount, listLocalAccounts } from '../services/authService.js';
import { store } from '../services/store.js';
import { esc } from '../utils/helpers.js';

export function renderAuth(container, { onSuccess } = {}) {
  const accounts = listLocalAccounts();
  container.innerHTML = `
    <section class="auth-shell">
      <div class="auth-card card stack">
        <span class="eyebrow">CalMal local account</span>
        <h1 class="page-title">Create Account</h1>
        <p class="muted">Your progress stays in this browser. A password protects new account creation, but is not stored.</p>
        <form class="stack" id="local-auth-form">
          <label class="field"><span>Username</span><input class="input" name="username" autocomplete="username" required minlength="3" maxlength="32" pattern="[A-Za-z0-9_]+" /></label>
          <label class="field"><span>Password</span><input class="input" name="password" type="password" autocomplete="new-password" required minlength="8" /></label>
          <p class="small muted">Password needs 8+ characters, uppercase, lowercase, and a number.</p>
          <button class="btn btn-primary" type="submit" data-submit>Create Account</button>
        </form>
        <p class="small" role="status" data-status></p>
        ${accounts.length ? `
          <div class="saved-accounts">
            <h2 class="card-title">Saved accounts</h2>
            <p class="small muted">Open an account on this device without entering its password.</p>
            <div class="saved-account-list">
              ${accounts.map(({ username }) => `<button type="button" class="btn btn-secondary saved-account-button" data-account="${esc(username)}">${esc(username)}</button>`).join('')}
            </div>
          </div>` : ''}
      </div>
    </section>`;

  const form = container.querySelector('#local-auth-form');
  const submit = container.querySelector('[data-submit]');
  const status = container.querySelector('[data-status]');
  const accountButtons = [...container.querySelectorAll('[data-account]')];
  const setStatus = (message, error = false) => {
    status.textContent = message;
    status.style.color = error ? 'var(--danger)' : 'var(--ok)';
  };
  const setBusy = (busy, busyLabel = 'Creating account…') => {
    submit.disabled = busy;
    submit.textContent = busy ? busyLabel : 'Create Account';
    accountButtons.forEach((button) => { button.disabled = busy; });
  };
  const activate = (username) => {
    store.activateAccount(username);
    onSuccess?.({ username });
  };

  accountButtons.forEach((button) => button.addEventListener('click', async () => {
    setBusy(true, 'Opening saved account…');
    setStatus('Opening saved account…');
    try {
      const username = button.dataset.account;
      activate(username);
    } catch (error) {
      setStatus(error.message || 'Could not open this saved account.', true);
    } finally {
      setBusy(false);
    }
  }));

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    setBusy(true);
    setStatus('Creating account…');
    const data = new FormData(form);
    try {
      await Promise.resolve().then(() => {
        const account = createLocalAccount(data.get('username'), data.get('password'));
        activate(account.username);
      });
      setStatus('Account created.');
    } catch (error) {
      const duplicate = /already exists/i.test(error.message || '');
      setStatus(duplicate ? 'This local account already exists. Choose it from Saved accounts below.' : (error.message || 'Could not create account.'), true);
    } finally {
      setBusy(false);
    }
  });

  return () => {};
}
