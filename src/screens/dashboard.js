// Skrin Papan Pemuka (pelan §3.2) — Net Calorie Balance Dashboard (Masa Nyata)
import { store } from '../services/store.js';
import { icons } from '../components/icons.js';
import { ringSVG, macroBar, animateRings, routeThumbSVG } from '../components/ui.js';
import { companionBubble } from '../components/companion.js';
import { dashboardMessage } from '../services/companionService.js';
import { openMealEditor } from '../components/mealEditor.js';
import { formatPace, formatDuration } from '../utils/calc.js';
import { esc, fmtTime } from '../utils/helpers.js';

export function renderDashboard(container) {
  let unsub = null;

  function render() {
    const s = store.summary();
    const p = store.profile || { name: 'Wira', weight: 70, targetWeight: 65 };
    const compMsg = dashboardMessage();

    // Progress calculation for the ring
    const effectiveTarget = Math.max(1, s.target + s.kout);
    const progress = Math.min(1.2, s.kin / effectiveTarget);
    const isOver = s.kin > effectiveTarget;

    container.innerHTML = `
      <div class="page-head">
        <div>
          <span class="eyebrow">Daily Dashboard</span>
          <h1 class="page-title">Hi, ${esc(p.name)}</h1>
        </div>
        <div class="row" style="gap:8px">
          <a href="#/scan" class="btn btn-sm btn-primary" id="btn-quick-scan">
            ${icons.camera}
            <span>Scan</span>
          </a>
        </div>
      </div>

      <div class="dash-grid">
        <!-- Left Column: Calorie Balance Ring & Macros -->
        <div class="stack">
          <!-- Calorie Ring Card -->
          <div class="card center" style="padding:28px 18px 24px">
            <div class="card-title row between" style="margin-bottom:6px">
              <span>Daily Net Calorie Balance</span>
              <span class="badge ${isOver ? 'bad' : 'ok'}">${isOver ? 'SURPLUS' : 'ON TARGET'}</span>
            </div>

            <div class="ring-wrap" style="margin:16px auto 14px">
              ${ringSVG({ size: 230, stroke: 7, progress, over: isOver })}
              <div class="ring-center">
                <div class="ring-big num ${isOver ? 'color-danger' : ''}" style="${isOver ? 'color:var(--danger)' : ''}">
                  ${Math.abs(s.remaining)}
                </div>
                <div class="ring-label">
                  ${isOver ? 'kcal over' : 'kcal remaining'}
                </div>
              </div>
            </div>

            <!-- Formula: Target - In + Out = Remaining -->
            <div class="equation">
              <div class="eq-cell">
                <span>Target</span>
                <b class="num">${s.target}</b>
              </div>
              <div class="eq-cell">
                <span>Food (In)</span>
                <b class="num">${s.kin}</b>
              </div>
              <div class="eq-cell">
                <span>Exercise (Out)</span>
                <b class="num" style="color:var(--ok)">+${s.kout}</b>
              </div>
            </div>
          </div>

          <!-- Macros Card -->
          <div class="card">
            <div class="card-title">
              <span>Macronutrient Breakdown</span>
              <span class="muted">Daily Goal</span>
            </div>
            ${macroBar({ label: 'Protein', value: s.protein, target: s.macros.protein, cls: 'p' })}
            ${macroBar({ label: 'Carbs', value: s.carbs, target: s.macros.carbs, cls: 'c' })}
            ${macroBar({ label: 'Fat', value: s.fat, target: s.macros.fat, cls: 'f' })}
          </div>

          <!-- Deku / Bakugou Companion Message -->
          ${companionBubble(compMsg.who, compMsg.text)}
        </div>

        <!-- Right Column: Today's Logged Meals & Activities -->
        <div class="stack">
          <!-- Meal Log Card -->
          <div class="card">
            <div class="card-title row between">
              <span>Today's Logged Meals</span>
              <button class="btn btn-sm btn-ghost" id="btn-manual-add">
                ${icons.plus}
                <span>Add Manually</span>
              </button>
            </div>

            <div class="list" id="meal-list">
              ${
                s.meals.length === 0
                  ? `<div class="empty">
                      ${icons.bowl}
                      <p>No meals logged yet today.</p>
                      <span class="small muted">Snap a photo of your meal or food label for instant AI analysis!</span>
                    </div>`
                  : s.meals
                      .map(
                        (m) => `
                    <div class="list-item" data-id="${m.id}">
                      <div class="thumb" style="${m.thumb ? `background-image:url(${m.thumb});border:1px solid var(--border)` : ''}">
                        ${m.thumb ? '' : icons.bowl}
                      </div>
                      <div class="li-main">
                        <div class="li-title">${esc(m.name)}</div>
                        <div class="li-sub">
                          <span class="badge" style="height:18px;font-size:10px;padding:0 6px">${m.mealType || 'Meal'}</span>
                          <span>· P: ${Math.round(m.protein || 0)}g · C: ${Math.round(m.carbs || 0)}g · F: ${Math.round(m.fat || 0)}g</span>
                        </div>
                      </div>
                      <div class="li-end">
                        <b class="num">${m.kcal} <span class="xs muted">kcal</span></b>
                        <small>${fmtTime(m.time || m.date)}</small>
                      </div>
                      <div class="row" style="gap:4px;margin-left:6px">
                        <button class="btn btn-icon btn-ghost btn-sm edit-meal-btn" data-id="${m.id}" title="Edit" aria-label="Edit meal">
                          ${icons.edit}
                        </button>
                        <button class="btn btn-icon btn-ghost btn-sm del-meal-btn" data-id="${m.id}" title="Delete" aria-label="Delete meal" style="color:var(--danger)">
                          ${icons.trash}
                        </button>
                      </div>
                    </div>
                  `
                      )
                      .join('')
              }
            </div>
          </div>

          <!-- Activity / Strava-style Runs Card -->
          <div class="card">
            <div class="card-title row between">
              <span>Today's Activities & Runs</span>
              <a href="#/activity" class="btn btn-sm btn-ghost">
                ${icons.run}
                <span>Start Run</span>
              </a>
            </div>

            <div class="list">
              ${
                s.acts.length === 0
                  ? `<div class="empty">
                      ${icons.run}
                      <p>No activities logged today.</p>
                      <span class="small muted">Start the Strava-style GPS tracker to burn calories and record your route!</span>
                    </div>`
                  : s.acts
                      .map(
                        (a) => `
                    <div class="list-item" data-id="${a.id}">
                      <div class="thumb" style="width:72px;background:#0d0d0e;border:1px solid var(--border);padding:2px">
                        ${routeThumbSVG(a.segments, { w: 72, h: 48, stroke: 2 })}
                      </div>
                      <div class="li-main">
                        <div class="li-title">${esc(a.type || 'GPS Run')}</div>
                        <div class="li-sub">
                          <span class="num">${a.distanceKm.toFixed(2)} km</span> · 
                          <span class="num">${formatDuration(a.durationSec)}</span> · 
                          <span class="num">${formatPace(a.pace)} /km</span>
                        </div>
                      </div>
                      <div class="li-end">
                        <b class="num" style="color:var(--ok)">-${a.kcal} <span class="xs muted">kcal</span></b>
                        <small>${fmtTime(a.startedAt)}</small>
                      </div>
                      <button class="btn btn-icon btn-ghost btn-sm del-act-btn" data-id="${a.id}" title="Delete" aria-label="Delete activity" style="color:var(--danger)">
                        ${icons.trash}
                      </button>
                    </div>
                  `
                      )
                      .join('')
              }
            </div>
          </div>
        </div>
      </div>
    `;

    bindEvents();
    animateRings(container);
  }

  function bindEvents() {
    container.querySelector('#btn-manual-add')?.addEventListener('click', () => {
      openMealEditor({}, {
        title: 'Add Meal',
        onSaved: () => render(),
      });
    });

    container.querySelectorAll('.edit-meal-btn').forEach((b) => {
      b.addEventListener('click', () => {
        const id = b.dataset.id;
        const meal = store.state.meals.find((m) => m.id === id);
        if (meal) {
          openMealEditor(meal, {
            existingId: id,
            title: 'Edit Meal',
            onSaved: () => render(),
          });
        }
      });
    });

    container.querySelectorAll('.del-meal-btn').forEach((b) => {
      b.addEventListener('click', () => {
        const id = b.dataset.id;
        store.deleteMeal(id);
      });
    });

    container.querySelectorAll('.del-act-btn').forEach((b) => {
      b.addEventListener('click', () => {
        const id = b.dataset.id;
        store.deleteActivity(id);
      });
    });
  }

  render();
  unsub = store.subscribe(() => render());

  return () => {
    unsub?.();
  };
}
