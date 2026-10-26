import { store } from '../services/store.js';
import { icons } from '../components/icons.js';
import { ringSVG, macroBar, animateRings, routeThumbSVG, openSheet, toast } from '../components/ui.js';
import { companionBubble, bindCompanionEvents } from '../components/companion.js';
import { dashboardMessage } from '../services/companionService.js';
import { openMealEditor } from '../components/mealEditor.js';
import { formatPace, formatDuration, calcSuggestedDailyTarget } from '../utils/calc.js';
import { esc, fmtTime, todayKey } from '../utils/helpers.js';

export function renderDashboard(container) {
  let unsub = null;

  function render() {
    const s = store.summary();
    const p = store.profile || { name: 'Hero', weight: 70, targetWeight: 65, selectedCompanion: 'deku' };
    const compMsg = dashboardMessage();
    const heroRank = store.getHeroRank();
    const water = store.getWater();
    const waterTarget = 2000;
    const waterPct = Math.min(100, Math.round((water / waterTarget) * 100));

    // Progress calculation for calorie ring
    const effectiveTarget = Math.max(1, s.target + s.kout);
    const progress = Math.min(1.2, s.kin / effectiveTarget);
    const isOver = s.kin > effectiveTarget;

    // Companion 5-state calculation
    const compState = isOver
      ? 'over_limit'
      : s.protein >= s.macros.protein && s.kin > 300
      ? 'goal_hit'
      : 'idle';

    const soundKey = isOver ? 'over' : compState === 'goal_hit' ? 'goal' : 'greet';

    container.innerHTML = `
      <!-- Bento Header -->
      <div class="page-head bento-header">
        <div>
          <div class="row" style="gap:8px;align-items:center;margin-bottom:2px">
            <span class="eyebrow">Level ${heroRank.level} · ${esc(heroRank.title)}</span>
            <span class="badge ok" style="font-size:10px;padding:2px 7px">${heroRank.pct}% EXP</span>
          </div>
          <h1 class="page-title">Hi, ${esc(p.name)}!</h1>
        </div>
        <div class="row" style="gap:8px">
          <a href="#/scan" class="btn btn-sm btn-primary" id="btn-quick-scan">
            ${icons.camera}
            <span>Scan Food</span>
          </a>
        </div>
      </div>

      <!-- Bento Grid Layout -->
      <div class="bento-container">
        <!-- Bento Row 1: Calorie Balance Ring (Card 1) & Mini-Macro + Water Grid (Card 2) -->
        <div class="bento-top-grid">
          <!-- Card 1: Calorie Balance Ring -->
          <div class="card center bento-card bento-ring-card">
            <div class="card-title row between" style="width:100%;margin-bottom:4px">
              <span>Net Calorie Balance</span>
              <div class="row" style="gap:6px;align-items:center">
                <button type="button" class="btn btn-xs btn-ghost" id="btn-adjust-target" title="Adjust daily calorie target" style="padding:2px 8px;font-size:11px;border:1px solid var(--border-soft)">
                  ${icons.edit}
                  <span>Adjust</span>
                </button>
                <span class="badge ${isOver ? 'bad' : 'ok'}">${isOver ? 'SURPLUS' : 'ON TARGET'}</span>
              </div>
            </div>

            <div class="ring-wrap" style="margin:14px auto 12px">
              ${ringSVG({ size: 210, stroke: 7, progress, over: isOver })}
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
            <div class="equation" style="width:100%">
              <div class="eq-cell">
                <span>Target</span>
                <b class="num">${s.target}</b>
              </div>
              <div class="eq-cell">
                <span>Food (In)</span>
                <b class="num">${s.kin}</b>
              </div>
              <div class="eq-cell">
                <span>Burned</span>
                <b class="num" style="color:var(--ok)">+${s.kout}</b>
              </div>
            </div>
          </div>

          <!-- Card 2: Macro Mini-Grid + Water Tracker Widget -->
          <div class="bento-side-grid">
            <!-- Macros 3-Tile Row -->
            <div class="card bento-card" style="padding:16px">
              <div class="card-title row between" style="margin-bottom:10px">
                <span>Macronutrients</span>
                <span class="xs muted">Daily Goals</span>
              </div>
              <div class="macro-mini-tiles">
                <div class="macro-mini-tile tile-p">
                  <span class="m-label">Protein</span>
                  <b class="m-val num">${Math.round(s.protein)}<small>g</small></b>
                  <div class="m-sub xs muted">/ ${s.macros.protein}g</div>
                  <div class="m-bar"><div class="m-bar-fill" style="width:${Math.min(100, (s.protein / (s.macros.protein || 1)) * 100)}%"></div></div>
                </div>
                <div class="macro-mini-tile tile-c">
                  <span class="m-label">Carbs</span>
                  <b class="m-val num">${Math.round(s.carbs)}<small>g</small></b>
                  <div class="m-sub xs muted">/ ${s.macros.carbs}g</div>
                  <div class="m-bar"><div class="m-bar-fill" style="width:${Math.min(100, (s.carbs / (s.macros.carbs || 1)) * 100)}%"></div></div>
                </div>
                <div class="macro-mini-tile tile-f">
                  <span class="m-label">Fat</span>
                  <b class="m-val num">${Math.round(s.fat)}<small>g</small></b>
                  <div class="m-sub xs muted">/ ${s.macros.fat}g</div>
                  <div class="m-bar"><div class="m-bar-fill" style="width:${Math.min(100, (s.fat / (s.macros.fat || 1)) * 100)}%"></div></div>
                </div>
              </div>
            </div>

            <!-- Water Tracker Card -->
            <div class="card bento-card water-widget" style="padding:16px">
              <div class="row between" style="margin-bottom:8px">
                <div class="row" style="gap:8px;align-items:center">
                  <div class="water-icon-circle">${icons.droplet}</div>
                  <div>
                    <span class="small bold" style="color:#fff">Water Hydration</span>
                    <div class="xs muted">${water} / ${waterTarget} ml (${waterPct}%)</div>
                  </div>
                </div>
                <div class="row" style="gap:5px">
                  <button type="button" class="btn btn-xs btn-ghost" id="btn-sub-water" title="Remove 250ml water" style="padding:3px 7px;font-size:11px;border:1px solid var(--border-soft);color:var(--text-muted)">
                    ${icons.minus}
                    <span>250ml</span>
                  </button>
                  <button type="button" class="btn btn-xs btn-primary btn-water-add" id="btn-add-water" title="Add 250ml water" style="padding:3px 7px;font-size:11px">
                    ${icons.plus}
                    <span>250ml</span>
                  </button>
                </div>
              </div>

              <div class="water-track">
                <div class="water-fill" style="width:${waterPct}%"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Bento Row 2: Hero Companion Card (Card 3) -->
        <div class="bento-companion-row">
          ${companionBubble(p.selectedCompanion || compMsg.who, compMsg.text, {
            compact: false,
            state: compState,
            soundKey: soundKey,
            allowSwitch: true,
          })}
        </div>

        <!-- Bento Row 3: Logged Meals & GPS Activities Grid -->
        <div class="bento-bottom-grid">
          <!-- Meal Log Card -->
          <div class="card bento-card">
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
          <div class="card bento-card">
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
                      <span class="small muted">Record an outdoor run or walk to track your burned calories and route.</span>
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
    bindCompanionEvents(container, () => render());
    animateRings(container);
  }

  function bindEvents() {
    // Adjust Daily Calorie Target Modal
    container.querySelector('#btn-adjust-target')?.addEventListener('click', () => {
      const currentProfile = store.profile || {};
      const suggestedTarget = calcSuggestedDailyTarget(currentProfile);
      const currentTarget = s.target;
      const isCustom = Boolean(currentProfile.customTarget && Number(currentProfile.customTarget) >= 500);

      const { el: sheet, close } = openSheet(`
        <div class="sheet-head row between" style="margin-bottom:14px">
          <div>
            <span class="eyebrow">Goal Calibration</span>
            <h3 style="margin:2px 0 0;font-size:18px;font-weight:800">Adjust Calorie Target</h3>
          </div>
          <button type="button" class="btn btn-icon btn-ghost btn-sm" data-close aria-label="Close">
            ${icons.close}
          </button>
        </div>

        <div class="stack" style="gap:14px">
          <div class="card flat" style="padding:12px;background:var(--surface-2);border-radius:12px">
            <div class="row between small" style="margin-bottom:6px">
              <span class="muted">Formula Recommendation:</span>
              <b class="num">${suggestedTarget} kcal</b>
            </div>
            <div class="row between small">
              <span class="muted">Active Calorie Target:</span>
              <b class="num" style="color:var(--hero-accent)">${currentTarget} kcal ${isCustom ? '(Custom)' : '(Suggested)'}</b>
            </div>
          </div>

          <div class="field">
            <label for="input-custom-target">Custom Daily Calorie Target (kcal):</label>
            <div class="input-suffix">
              <input class="input num" id="input-custom-target" type="number" min="800" max="6000" step="50" value="${currentTarget}" placeholder="e.g. 2000" />
              <span>kcal</span>
            </div>
            <span class="xs muted">You can enter your own custom calorie goal or reset back to the recommended formula value.</span>
          </div>

          <div class="stack" style="gap:8px;margin-top:6px">
            <button type="button" class="btn btn-primary btn-block" id="btn-save-custom-target">
              ${icons.check}
              <span>Save Calorie Target</span>
            </button>
            <button type="button" class="btn btn-secondary btn-block" id="btn-reset-suggested-target">
              ${icons.refresh}
              <span>Reset to Suggested (${suggestedTarget} kcal)</span>
            </button>
          </div>
        </div>
      `);

      sheet.querySelector('#btn-save-custom-target')?.addEventListener('click', () => {
        const val = Number(sheet.querySelector('#input-custom-target')?.value);
        if (!val || val < 800 || val > 6000) {
          toast('Please enter a realistic calorie target (800 – 6000 kcal).', 'error');
          return;
        }
        store.saveProfile({ customTarget: Math.round(val) });
        toast(`Daily calorie target set to ${Math.round(val)} kcal!`, 'success');
        close();
        render();
      });

      sheet.querySelector('#btn-reset-suggested-target')?.addEventListener('click', () => {
        store.saveProfile({ customTarget: null });
        toast(`Target reset to formula recommendation (${suggestedTarget} kcal)!`, 'info');
        close();
        render();
      });
    });

    // Water tracker add & subtract buttons
    container.querySelector('#btn-add-water')?.addEventListener('click', () => {
      store.addWater(250);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(20);
      }
      render();
    });

    container.querySelector('#btn-sub-water')?.addEventListener('click', () => {
      store.addWater(-250);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(15);
      }
      render();
    });

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
