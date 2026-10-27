import { store } from '../services/store.js';
import { icons } from '../components/icons.js';
import { ringSVG, macroBar, animateRings, routeThumbSVG, openSheet, toast } from '../components/ui.js';
import { companionBubble, bindCompanionEvents } from '../components/companion.js';
import { dashboardMessage } from '../services/companionService.js';
import { openMealEditor } from '../components/mealEditor.js';
import { formatPace, formatDuration, calcSuggestedDailyTarget } from '../utils/calc.js';
import { esc, fmtTime, todayKey } from '../utils/helpers.js';
import { t, getLang, toggleLang } from '../utils/i18n.js';

export function renderDashboard(container) {
  let unsub = null;

  function render() {
    const s = store.summary();
    const p = store.profile || { name: 'Hero', weight: 70, targetWeight: 65, selectedCompanion: 'deku' };
    const compMsg = dashboardMessage();
    const heroRank = store.getHeroRank();
    const water = store.getWater();
    const waterTarget = store.getWaterTarget();
    const waterPct = Math.min(100, Math.round((water / waterTarget) * 100));
    const weekly = store.weeklySummary();

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
          </div>          <h1 class="page-title">Hi, ${esc(p.name)}!</h1>
        </div>
        <div class="row" style="gap:8px">
          <a href="#/scan" class="btn btn-sm btn-primary" id="btn-quick-scan">
            ${icons.camera}
            <span>${t('dash_scan_btn')}</span>
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
              <span>${t('dash_calorie_balance')}</span>
              <div class="row" style="gap:6px;align-items:center">
                <button type="button" class="lang-pill-btn section-lang-toggle" title="Switch Language" style="padding:2px 7px;font-size:10.5px">
                  <span class="lang-icon">${icons.globe}</span>
                  <span class="lang-cur">${getLang().toUpperCase()}</span>
                </button>
                <button type="button" class="btn btn-xs btn-ghost" id="btn-adjust-target" title="${t('dash_adjust')}" style="padding:2px 8px;font-size:11px;border:1px solid var(--border-soft);cursor:pointer">
                  ${icons.edit}
                  <span>${t('dash_adjust')}</span>
                </button>
                <span class="badge ${isOver ? 'bad' : 'ok'}">${isOver ? t('dash_surplus') : t('dash_on_target')}</span>
              </div>
            </div>

            <div class="ring-wrap" style="margin:14px auto 12px">
              ${ringSVG({ size: 210, stroke: 7, progress, over: isOver })}
              <div class="ring-center">
                <div class="ring-big num ${isOver ? 'color-danger' : ''}" style="${isOver ? 'color:var(--danger)' : ''}">
                  ${Math.abs(s.remaining)}
                </div>
                <div class="ring-label">
                  ${isOver ? t('dash_kcal_over') : t('dash_kcal_remaining')}
                </div>
              </div>
            </div>

            <!-- Formula: Target - In + Out = Remaining -->
            <div class="equation" style="width:100%">
              <div class="eq-cell">
                <span>${t('dash_target')}</span>
                <b class="num">${s.target}</b>
              </div>
              <div class="eq-cell">
                <span>${t('dash_food_in')}</span>
                <b class="num">${s.kin}</b>
              </div>
              <div class="eq-cell">
                <span>${t('dash_burned')}</span>
                <b class="num" style="color:var(--ok)">+${s.kout}</b>
              </div>
            </div>

            <!-- Weekly Calorie Bank Pill -->
            <div class="row between xs muted" style="width:100%;margin-top:10px;padding-top:8px;border-top:1px solid var(--border-soft)">
              <span>${t('dash_weekly_bank')}</span>
              <b class="num" style="color:${weekly.bankRemaining >= 0 ? 'var(--ok)' : 'var(--danger)'}">
                ${weekly.bankRemaining >= 0 ? '+' : ''}${weekly.bankRemaining} kcal ${weekly.bankRemaining >= 0 ? t('dash_deficit') : t('dash_surplus')}
              </b>
            </div>
          </div>

          <!-- Card 2: Macro Mini-Grid + Water Tracker Widget -->
          <div class="bento-side-grid">
            <!-- Macros 3-Tile Row -->
            <div class="card bento-card" style="padding:16px">
              <div class="card-title row between" style="margin-bottom:10px">
                <span>${t('dash_macros')}</span>
                <span class="xs muted">${t('dash_daily_goals')}</span>
              </div>
              <div class="macro-mini-tiles">
                <div class="macro-mini-tile tile-p">
                  <span class="m-label">${t('dash_protein')}</span>
                  <b class="m-val num">${Math.round(s.protein)}<small>g</small></b>
                  <div class="m-sub xs muted">/ ${s.macros.protein}g</div>
                  <div class="m-bar"><div class="m-bar-fill" style="width:${Math.min(100, (s.protein / (s.macros.protein || 1)) * 100)}%"></div></div>
                </div>
                <div class="macro-mini-tile tile-c">
                  <span class="m-label">${t('dash_carbs')}</span>
                  <b class="m-val num">${Math.round(s.carbs)}<small>g</small></b>
                  <div class="m-sub xs muted">/ ${s.macros.carbs}g</div>
                  <div class="m-bar"><div class="m-bar-fill" style="width:${Math.min(100, (s.carbs / (s.macros.carbs || 1)) * 100)}%"></div></div>
                </div>
                <div class="macro-mini-tile tile-f">
                  <span class="m-label">${t('dash_fat')}</span>
                  <b class="m-val num">${Math.round(s.fat)}<small>g</small></b>
                  <div class="m-sub xs muted">/ ${s.macros.fat}g</div>
                  <div class="m-bar"><div class="m-bar-fill" style="width:${Math.min(100, (s.fat / (s.macros.fat || 1)) * 100)}%"></div></div>
                </div>
              </div>
            </div>

            <!-- Water Tracker Card (Customizable Any Amount) -->
            <div class="card bento-card water-widget" style="padding:16px">
              <div class="row between" style="margin-bottom:8px">
                <div class="row" style="gap:8px;align-items:center;cursor:pointer" id="btn-water-header" title="${t('dash_custom_water')}">
                  <div class="water-icon-circle">${icons.droplet}</div>
                  <div>
                    <div class="row" style="gap:6px;align-items:center">
                      <span class="small bold" style="color:#fff">${t('dash_water_title')}</span>
                      <button type="button" class="btn btn-xs btn-ghost" id="btn-custom-water" style="padding:1px 6px;font-size:10px;border:1px solid var(--border-soft)">${t('dash_custom_water')}</button>
                    </div>
                    <div class="xs muted">${water} / ${waterTarget} ml (${waterPct}%)</div>
                  </div>
                </div>
                <div class="row" style="gap:4px;align-items:center">
                  <button type="button" class="lang-pill-btn section-lang-toggle" title="Switch Language" style="padding:2px 7px;font-size:10.5px">
                    <span class="lang-icon">${icons.globe}</span>
                    <span class="lang-cur">${getLang().toUpperCase()}</span>
                  </button>
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

              <div class="water-track" style="cursor:pointer" id="water-bar-click" title="Click to adjust water">
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
            <div class="card-title row between" style="flex-wrap:wrap;gap:8px">
              <span>${t('dash_today_meals')}</span>
              <div class="row" style="gap:6px;align-items:center">
                <button type="button" class="lang-pill-btn section-lang-toggle" title="Switch Language" style="padding:2px 7px;font-size:10.5px">
                  <span class="lang-icon">${icons.globe}</span>
                  <span class="lang-cur">${getLang().toUpperCase()}</span>
                </button>
                <button type="button" class="btn btn-xs btn-secondary" id="btn-copy-yesterday" title="${t('dash_copy_yesterday')}">
                  ${icons.refresh}
                  <span>${t('dash_copy_yesterday')}</span>
                </button>
                <button class="btn btn-sm btn-ghost" id="btn-manual-add">
                  ${icons.plus}
                  <span>${t('dash_add_manual')}</span>
                </button>
              </div>
            </div>

            <!-- 1-Tap Malaysian Quick Chips -->
            <div style="margin-bottom:10px;padding:8px;background:rgba(255,255,255,0.02);border:1px solid var(--border-soft);border-radius:8px">
              <span class="xs bold muted" style="display:block;margin-bottom:4px;letter-spacing:0.04em">${t('dash_quick_tap')}</span>
              <div class="chips" style="gap:5px;flex-wrap:wrap">
                <button type="button" class="chip btn-quick-malay" data-name="Kopi O Kosong" data-kcal="5" data-p="0.3" data-c="0.8" data-f="0.1" data-w="220">+ Kopi O (5 kcal)</button>
                <button type="button" class="chip btn-quick-malay" data-name="Telur Separuh Masak (2 Biji)" data-kcal="140" data-p="12" data-c="1" data-f="10" data-w="110">+ 2 Telur (140 kcal)</button>
                <button type="button" class="chip btn-quick-malay" data-name="Roti Canai (1 Keping)" data-kcal="310" data-p="7" data-c="44" data-f="12" data-w="130">+ Roti Canai (310 kcal)</button>
                <button type="button" class="chip btn-quick-malay" data-name="Nasi Putih (1 Senduk)" data-kcal="150" data-p="3" data-c="33" data-f="0.5" data-w="150">+ Nasi Putih (150 kcal)</button>
                <button type="button" class="chip btn-quick-malay" data-name="Teh Tarik Kurang Manis" data-kcal="115" data-p="3" data-c="19" data-f="3.5" data-w="240">+ Teh Tarik Kurang Manis (115 kcal)</button>
              </div>
            </div>

            <div class="list" id="meal-list">
              ${
                s.meals.length === 0
                  ? `<div class="empty">
                      ${icons.bowl}
                      <p>${t('dash_no_meals')}</p>
                      <span class="small muted">${t('dash_no_meals_sub')}</span>
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
                        <button class="btn btn-icon btn-ghost btn-sm edit-meal-btn" data-id="${m.id}" title="${t('edit')}" aria-label="Edit meal">
                          ${icons.edit}
                        </button>
                        <button class="btn btn-icon btn-ghost btn-sm del-meal-btn" data-id="${m.id}" title="${t('delete')}" aria-label="Delete meal" style="color:var(--danger)">
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

          <!-- Activity / GPS Runs Card -->
          <div class="card bento-card">
            <div class="card-title row between">
              <span>${t('dash_recent_activity')}</span>
              <a href="#/activity" class="btn btn-sm btn-ghost">
                ${icons.run}
                <span>${t('dash_start_activity')}</span>
              </a>
            </div>

            <div class="list">
              ${
                s.acts.length === 0
                  ? `<div class="empty">
                      ${icons.run}
                      <p>${t('dash_no_activity')}</p>
                      <span class="small muted">${t('dash_no_activity_sub')}</span>
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

  function openWaterAdjuster() {
    const currentWater = store.getWater();
    const currentTarget = store.getWaterTarget();

    const { el: sheet, close } = openSheet(`
      <div class="sheet-head row between" style="margin-bottom:12px">
        <div>
          <span class="eyebrow">${t('dash_hydration_tracker')}</span>
          <h3 style="margin:2px 0 0;font-size:18px;font-weight:800">${t('dash_water_adjust_title')}</h3>
        </div>
        <button type="button" class="btn btn-icon btn-ghost btn-sm" data-close aria-label="${t('close')}">
          ${icons.close}
        </button>
      </div>

      <div class="stack" style="gap:14px">
        <div class="card flat" style="padding:12px;background:var(--surface-2);border-radius:12px">
          <div class="row between">
            <span class="muted">${t('dash_todays_intake')}</span>
            <b class="num" style="font-size:18px;color:#3897f0">${currentWater} ml <small class="muted">/ ${currentTarget} ml</small></b>
          </div>
        </div>

        <div>
          <span class="xs bold muted" style="display:block;margin-bottom:6px;letter-spacing:0.04em">${t('dash_quick_add')}</span>
          <div class="grid grid-4" style="gap:6px">
            <button type="button" class="btn btn-secondary btn-sm btn-water-quick" data-add="100">+100 ml</button>
            <button type="button" class="btn btn-secondary btn-sm btn-water-quick" data-add="250">+250 ml</button>
            <button type="button" class="btn btn-secondary btn-sm btn-water-quick" data-add="500">+500 ml</button>
            <button type="button" class="btn btn-secondary btn-sm btn-water-quick" data-add="1000">+1000 ml</button>
          </div>
        </div>

        <div>
          <span class="xs bold muted" style="display:block;margin-bottom:6px;letter-spacing:0.04em">${t('dash_quick_remove')}</span>
          <div class="grid grid-3" style="gap:6px">
            <button type="button" class="btn btn-ghost btn-sm btn-water-quick" data-add="-100" style="border:1px solid var(--border-soft);color:var(--text-muted)">-100 ml</button>
            <button type="button" class="btn btn-ghost btn-sm btn-water-quick" data-add="-250" style="border:1px solid var(--border-soft);color:var(--text-muted)">-250 ml</button>
            <button type="button" class="btn btn-ghost btn-sm btn-water-quick" data-add="-500" style="border:1px solid var(--border-soft);color:var(--text-muted)">-500 ml</button>
          </div>
        </div>

        <div class="divider"></div>

        <div class="field">
          <label for="input-custom-water-ml">${t('dash_custom_amount')}</label>
          <div class="input-suffix">
            <input class="input num" id="input-custom-water-ml" type="number" min="10" max="5000" step="50" value="300" placeholder="e.g. 350" />
            <span>ml</span>
          </div>
        </div>

        <div class="grid grid-3" style="gap:6px">
          <button type="button" class="btn btn-primary" id="btn-custom-add-water">${t('dash_add')}</button>
          <button type="button" class="btn btn-secondary" id="btn-custom-sub-water">${t('dash_remove')}</button>
          <button type="button" class="btn btn-ghost" id="btn-custom-set-water" style="border:1px solid var(--border-soft)">${t('dash_set_total')}</button>
        </div>

        <div class="divider"></div>

        <div class="field">
          <label for="input-water-goal-ml">${t('dash_daily_water_target')}</label>
          <div class="row" style="gap:8px">
            <div class="input-suffix" style="flex:1">
              <input class="input num" id="input-water-goal-ml" type="number" min="500" max="6000" step="100" value="${currentTarget}" />
              <span>ml</span>
            </div>
            <button type="button" class="btn btn-secondary btn-sm" id="btn-save-water-goal">${t('dash_save_goal')}</button>
          </div>
        </div>
      </div>
    `);

    sheet.querySelectorAll('.btn-water-quick').forEach((b) => {
      b.addEventListener('click', () => {
        const amt = Number(b.dataset.add);
        store.addWater(amt);
        toast(`${amt > 0 ? '+' : ''}${amt} ml updated!`, 'info');
        close();
        render();
      });
    });

    sheet.querySelector('#btn-custom-add-water')?.addEventListener('click', () => {
      const val = Number(sheet.querySelector('#input-custom-water-ml')?.value);
      if (!val || val <= 0) return toast('Please enter a positive ml value.', 'error');
      store.addWater(val);
      toast(`+${val} ml water recorded!`, 'success');
      close();
      render();
    });

    sheet.querySelector('#btn-custom-sub-water')?.addEventListener('click', () => {
      const val = Number(sheet.querySelector('#input-custom-water-ml')?.value);
      if (!val || val <= 0) return toast('Please enter a positive ml value.', 'error');
      store.addWater(-val);
      toast(`-${val} ml water deducted!`, 'info');
      close();
      render();
    });

    sheet.querySelector('#btn-custom-set-water')?.addEventListener('click', () => {
      const val = Number(sheet.querySelector('#input-custom-water-ml')?.value);
      if (val == null || val < 0) return toast('Please enter a valid amount.', 'error');
      store.setWater(val);
      toast(`Total water set to ${val} ml!`, 'success');
      close();
      render();
    });

    sheet.querySelector('#btn-save-water-goal')?.addEventListener('click', () => {
      const val = Number(sheet.querySelector('#input-water-goal-ml')?.value);
      if (!val || val < 500) return toast('Please set target to at least 500 ml.', 'error');
      store.setWaterTarget(val);
      toast(`Daily water target updated to ${val} ml!`, 'success');
      close();
      render();
    });
  }

  function bindEvents() {
    // 0. Section Language Toggles
    container.querySelectorAll('.section-lang-toggle').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleLang();
        render();
      });
    });

    // 1. Adjust Daily Calorie Target Modal (Bug Fixed)
    container.querySelector('#btn-adjust-target')?.addEventListener('click', () => {
      const currentProfile = store.profile || {};
      const currentSummary = store.summary();
      const suggestedTarget = calcSuggestedDailyTarget(currentProfile);
      const currentTarget = currentSummary.target;
      const isCustom = Boolean(currentProfile.customTarget && Number(currentProfile.customTarget) >= 500);

      const { el: sheet, close } = openSheet(`
        <div class="sheet-head row between" style="margin-bottom:14px">
          <div>
            <span class="eyebrow">${t('dash_goal_calibration')}</span>
            <h3 style="margin:2px 0 0;font-size:18px;font-weight:800">${t('dash_adjust_modal_title')}</h3>
          </div>
          <button type="button" class="btn btn-icon btn-ghost btn-sm" data-close aria-label="${t('close')}">
            ${icons.close}
          </button>
        </div>

        <div class="stack" style="gap:14px">
          <div class="card flat" style="padding:12px;background:var(--surface-2);border-radius:12px">
            <div class="row between small" style="margin-bottom:6px">
              <span class="muted">${t('dash_formula_recommendation')}</span>
              <b class="num">${suggestedTarget} kcal</b>
            </div>
            <div class="row between small">
              <span class="muted">${t('dash_active_target')}</span>
              <b class="num" style="color:var(--hero-accent)">${currentTarget} kcal ${isCustom ? `(${t('dash_custom_water')})` : `(${t('dash_suggested_target').replace(':', '')})`}</b>
            </div>
          </div>

          <div class="field">
            <label for="input-custom-target">${t('dash_custom_daily_target')}</label>
            <div class="input-suffix">
              <input class="input num" id="input-custom-target" type="number" min="800" max="6000" step="50" value="${currentTarget}" placeholder="e.g. 2000" />
              <span>kcal</span>
            </div>
            <span class="xs muted">${t('dash_custom_target_hint')}</span>
          </div>

          <div class="stack" style="gap:8px;margin-top:6px">
            <button type="button" class="btn btn-primary btn-block" id="btn-save-custom-target">
              ${icons.check}
              <span>${t('dash_save_calorie_target')}</span>
            </button>
            <button type="button" class="btn btn-secondary btn-block" id="btn-reset-suggested-target">
              ${icons.refresh}
              <span>${t('dash_reset_suggested')} (${suggestedTarget} kcal)</span>
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

    // 2. Water tracker buttons & full custom modal
    container.querySelector('#btn-custom-water')?.addEventListener('click', (e) => {
      e.stopPropagation();
      openWaterAdjuster();
    });
    container.querySelector('#btn-water-header')?.addEventListener('click', () => {
      openWaterAdjuster();
    });
    container.querySelector('#water-bar-click')?.addEventListener('click', () => {
      openWaterAdjuster();
    });

    container.querySelector('#btn-add-water')?.addEventListener('click', () => {
      store.addWater(250);
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(20);
      render();
    });

    container.querySelector('#btn-sub-water')?.addEventListener('click', () => {
      store.addWater(-250);
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(15);
      render();
    });

    // 3. Copy Yesterday's Meals Button
    container.querySelector('#btn-copy-yesterday')?.addEventListener('click', () => {
      const count = store.copyYesterdayMeals();
      if (count > 0) {
        toast(`Copied ${count} meals from yesterday!`, 'success');
        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([20, 40]);
        render();
      } else {
        toast('No meals found from yesterday to copy.', 'info');
      }
    });

    // 4. 1-Tap Malaysian Quick Chips
    container.querySelectorAll('.btn-quick-malay').forEach((b) => {
      b.addEventListener('click', () => {
        const meal = {
          name: b.dataset.name,
          kcal: Number(b.dataset.kcal),
          protein: Number(b.dataset.p),
          carbs: Number(b.dataset.c),
          fat: Number(b.dataset.f),
          weight_g: Number(b.dataset.w || 150),
          mealType: 'Meal',
        };
        store.addMeal(meal);
        toast(`Logged: ${meal.name} (+${meal.kcal} kcal)`, 'success');
        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(20);
        render();
      });
    });

    // 5. Add Manual Meal
    container.querySelector('#btn-manual-add')?.addEventListener('click', () => {
      openMealEditor({}, {
        title: t('me_title_quick'),
        onSaved: () => render(),
      });
    });

    // 6. Edit & Delete Meals
    container.querySelectorAll('.edit-meal-btn').forEach((b) => {
      b.addEventListener('click', () => {
        const id = b.dataset.id;
        const meal = store.state.meals.find((m) => m.id === id);
        if (meal) {
          openMealEditor(meal, {
            existingId: id,
            title: t('me_title_edit'),
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
