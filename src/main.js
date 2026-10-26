import 'leaflet/dist/leaflet.css';
import './styles/index.css';
import './styles/screens.css';

import { store } from './services/store.js';
import { icons } from './components/icons.js';
import { startReminderLoop } from './services/companionService.js';
import * as tracker from './services/gpsTracker.js';
import { renderOnboarding } from './screens/onboarding.js';
import { renderDashboard } from './screens/dashboard.js';
import { renderScanner } from './screens/scanner.js';
import { renderActivity } from './screens/activity.js';
import { renderRecipes } from './screens/recipes.js';
import { renderProfile } from './screens/profile.js';

const ROUTES = {
  home: { label: 'Dashboard', icon: icons.home, render: renderDashboard, title: 'Dashboard' },
  activity: { label: 'Activity', icon: icons.run, render: renderActivity, title: 'Activity' },
  scan: { label: 'Scan', icon: icons.scan, render: renderScanner, title: 'AI Food Scanner', fab: true },
  recipes: { label: 'Recipes', icon: icons.chef, render: renderRecipes, title: 'AI Recipes' },
  profile: { label: 'Profile', icon: icons.user, render: renderProfile, title: 'Profile' },
};

const view = document.getElementById('view');
let cleanup = null;

function currentRoute() {
  const r = location.hash.replace(/^#\/?/, '').split('?')[0];
  return ROUTES[r] ? r : 'home';
}

function renderNav(active) {
  const order = ['home', 'activity', 'scan', 'recipes', 'profile'];
  document.getElementById('bottom-nav').innerHTML = order
    .map((k) => {
      const r = ROUTES[k];
      if (r.fab) return `<a href="#/${k}" id="nav-${k}" class="nav-fab ${active === k ? 'active' : ''}" aria-label="${r.label}">${icons.camera}</a>`;
      return `<a href="#/${k}" id="nav-${k}" class="nav-item ${active === k ? 'active' : ''}">${r.icon}<span>${r.label}</span></a>`;
    })
    .join('');

  document.getElementById('sidebar').innerHTML = `
    <a class="brand" href="#/home"><img src="/icon.svg" alt="" />CalMal</a>
    ${['home', 'scan', 'activity', 'recipes', 'profile']
      .map((k) => `<a href="#/${k}" id="side-${k}" class="side-item ${active === k ? 'active' : ''}">${k === 'scan' ? icons.camera : ROUTES[k].icon}<span>${k === 'scan' ? 'Scan Food' : ROUTES[k].label}</span></a>`)
      .join('')}
    <div class="side-foot">CalMal v2.5 · Multi-Tier AI Cascade<br/>Local-first privacy & offline storage.</div>`;
}

function renderTopbar() {
  const online = navigator.onLine;
  const rec = tracker.isActive();
  document.getElementById('topbar').innerHTML = `
    <a class="brand" href="#/home"><img src="/icon.svg" alt="" />CalMal</a>
    <div class="topbar-actions">
      ${rec ? `<a class="pill-status rec" href="#/activity" id="rec-pill"><span class="dot"></span>Recording</a>` : ''}
      <span class="pill-status ${online ? '' : 'offline'}" title="${online ? 'Online' : 'Offline — Data saved locally'}">
        <span class="dot"></span>${online ? 'Online' : 'Offline'}
      </span>
    </div>`;
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
  document.body.classList.remove('onboarding');

  const key = currentRoute();
  const r = ROUTES[key];
  document.title = `${r.title} · CalMal`;
  renderNav(key);
  renderTopbar();
  cleanup = r.render(container) || null;
  window.scrollTo({ top: 0 });
}

window.addEventListener('hashchange', route);
window.addEventListener('online', renderTopbar);
window.addEventListener('offline', renderTopbar);

let wasActive = tracker.isActive();
tracker.subscribe(() => {
  const now = tracker.isActive();
  if (now !== wasActive) { wasActive = now; renderTopbar(); }
});

store.subscribe((type) => { if (type === 'reset') route(); });

route();
startReminderLoop();

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
