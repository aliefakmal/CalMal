import 'leaflet/dist/leaflet.css';
import './styles/index.css';
import './styles/screens.css';

import { store } from './services/store.js';
import { icons } from './components/icons.js';
import { t, getLang, toggleLang, onLangChange } from './utils/i18n.js';
import { startReminderLoop } from './services/companionService.js';
import * as tracker from './services/gpsTracker.js';
import { renderOnboarding } from './screens/onboarding.js';
import { renderDashboard } from './screens/dashboard.js';
import { renderScanner } from './screens/scanner.js';
import { renderActivity } from './screens/activity.js';
import { renderRecipes } from './screens/recipes.js';
import { renderProfile } from './screens/profile.js';
import { openPageTutorial } from './utils/tutorials.js';
import { initPwaInstall, isStandalone, promptInstall, subscribeInstallState } from './utils/pwaInstall.js';
import { soundboard } from './services/audioService.js';
import { hasCombinedAuthVault, isCombinedAuthActive } from './services/authService.js';
import { renderAuth } from './screens/auth.js';

function getRoutes() {
  return {
    home: { label: t('nav_dashboard'), icon: icons.home, render: renderDashboard, title: t('nav_dashboard') },
    activity: { label: t('nav_activity'), icon: icons.run, render: renderActivity, title: t('nav_activity') },
    scan: { label: t('nav_scan'), icon: icons.scan, render: renderScanner, title: 'AI Food Scanner', fab: true },
    recipes: { label: t('nav_recipes'), icon: icons.chef, render: renderRecipes, title: t('nav_recipes') },
    profile: { label: t('nav_profile'), icon: icons.user, render: renderProfile, title: t('nav_profile') },
  };
}

const view = document.getElementById('view');
let cleanup = null;

function currentRoute() {
  const routes = getRoutes();
  const r = location.hash.replace(/^#\/?/, '').split('?')[0];
  return routes[r] ? r : 'home';
}

function renderNav(active) {
  const routes = getRoutes();
  const order = ['home', 'activity', 'scan', 'recipes', 'profile'];
  const nav = document.getElementById('bottom-nav');
  nav.innerHTML = order
    .map((k) => {
      const r = routes[k];
      if (r.fab) {
        return `<a href="#/${k}" id="nav-${k}" class="nav-fab ${active === k ? 'active' : ''}" aria-label="Scan Food AI">
          <span class="nav-fab-icon">${icons.camera}</span>
          <span class="nav-fab-text">${t('nav_scan')}</span>
        </a>`;
      }
      return `<a href="#/${k}" id="nav-${k}" class="nav-item ${active === k ? 'active' : ''}">${r.icon}<span>${r.label}</span></a>`;
    })
    .join('');

  nav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(10);
      }
    });
  });

  document.getElementById('sidebar').innerHTML = `
    <a class="brand" href="#/home"><img src="/calmal-logo.png" alt="CalMal Logo" /><span>CalMal</span></a>
    ${['home', 'scan', 'activity', 'recipes', 'profile']
      .map((k) => `<a href="#/${k}" id="side-${k}" class="side-item ${active === k ? 'active' : ''}">${k === 'scan' ? icons.camera : routes[k].icon}<span>${k === 'scan' ? t('dash_scan_btn') : routes[k].label}</span></a>`)
      .join('')}
    <div class="side-foot">${t('side_foot').replace(/\n/g, '<br/>')}</div>`;
}

function renderTopbar() {
  const rec = tracker.isActive();
  const lang = getLang();
  const standalone = isStandalone();

  document.getElementById('topbar').innerHTML = `
    <a class="brand" href="#/home"><img src="/calmal-logo.png" alt="CalMal Logo" /><span>CalMal</span></a>
    <div class="topbar-actions">
      <!-- Universal Page Tutorial Button -->
      <button type="button" class="btn-guide-pill" id="topbar-tutorial-btn" title="${lang === 'en' ? 'Page Guide & Tutorial' : 'Panduan & Tutorial Halaman'}">
        ${icons.help}
        <span>${lang === 'en' ? 'Tutorial' : 'Panduan'}</span>
      </button>

      <!-- Universal Language Switcher Pill -->
      <button type="button" class="lang-pill-btn" id="topbar-lang-toggle" title="Switch Language / Tukar Bahasa (EN / BM)">
        <span class="lang-icon">${icons.globe}</span>
        <span class="lang-cur">${lang.toUpperCase()}</span>
        <span class="lang-alt">${lang === 'en' ? 'BM' : 'EN'}</span>
      </button>

      <!-- Add to Home Screen Option (Hidden once running in Standalone) -->
      ${!standalone ? `
        <button type="button" class="btn-install-pill" id="topbar-install-btn" title="${lang === 'en' ? 'Add CalMal to Home Screen' : 'Pasang CalMal ke Skrin Utama'}">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          <span>${lang === 'en' ? 'Install' : 'Pasang'}</span>
        </button>
      ` : ''}

      ${rec ? `<a class="pill-status rec" href="#/activity" id="rec-pill"><span class="dot"></span>${t('topbar_recording')}</a>` : ''}
    </div>`;

  document.getElementById('topbar-tutorial-btn')?.addEventListener('click', () => {
    const routeKey = currentRoute();
    const pageKey = routeKey === 'home' ? 'dashboard' : routeKey;
    openPageTutorial(pageKey);
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
  });

  document.getElementById('topbar-lang-toggle')?.addEventListener('click', () => {
    toggleLang();
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
  });

  document.getElementById('topbar-install-btn')?.addEventListener('click', () => {
    promptInstall();
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
  });
}

function route() {
  cleanup?.();
  cleanup = null;
  const container = view;
  container.innerHTML = '';
  container.style.animation = 'none';
  void container.offsetWidth;
  container.style.animation = '';

  if (!store.profile) {
    document.body.classList.add('onboarding');
    cleanup = renderOnboarding(container, () => {
      document.body.classList.remove('onboarding');
      location.hash = '#/home';
      route();
    });
    return;
  }
  if (hasCombinedAuthVault() && !isCombinedAuthActive()) {
    document.body.classList.add('onboarding');
    cleanup = renderAuth(container, { onSuccess: route });
    return;
  }
  document.body.classList.remove('onboarding');

  const routes = getRoutes();
  const key = currentRoute();
  const r = routes[key];
  document.title = `${r.title} · CalMal`;
  renderNav(key);
  renderTopbar();
  cleanup = r.render(container) || null;
  window.scrollTo({ top: 0 });
}

window.addEventListener('hashchange', route);

let wasActive = tracker.isActive();
tracker.subscribe(() => {
  const now = tracker.isActive();
  if (now !== wasActive) { wasActive = now; renderTopbar(); }
});

store.subscribe((type) => { if (type === 'reset') route(); });
onLangChange(() => route());
initPwaInstall();
subscribeInstallState(() => renderTopbar());

route();
startReminderLoop();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
