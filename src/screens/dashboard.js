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
          <span class="eyebrow">Papan Pemuka Harian</span>
          <h1 class="page-title">Hai, ${esc(p.name)}</h1>
        </div>
        <div class="row" style="gap:8px">
          <a href="#/scan" class="btn btn-sm btn-primary" id="btn-quick-scan">
            ${icons.camera}
            <span>Imbas</span>
          </a>
        </div>
      </div>

      <div class="dash-grid">
        <!-- Kolum Kiri: Cincin Baki Kalori & Makronutrien -->
        <div class="stack">
          <!-- Kad Cincin Monokrom -->
          <div class="card center" style="padding:28px 18px 24px">
            <div class="card-title row between" style="margin-bottom:6px">
              <span>Baki Kalori Bersih</span>
              <span class="badge ${isOver ? 'bad' : 'ok'}">${isOver ? 'TERLEBIH' : 'DALAM SASARAN'}</span>
            </div>

            <div class="ring-wrap" style="margin:16px auto 14px">
              ${ringSVG({ size: 230, stroke: 7, progress, over: isOver })}
              <div class="ring-center">
                <div class="ring-big num ${isOver ? 'color-danger' : ''}" style="${isOver ? 'color:var(--danger)' : ''}">
                  ${Math.abs(s.remaining)}
                </div>
                <div class="ring-label">
                  ${isOver ? 'kcal terlebih' : 'kcal berbaki'}
                </div>
              </div>
            </div>

            <!-- Formula Masa Nyata: Sasaran - Masuk + Keluar = Baki -->
            <div class="equation">
              <div class="eq-cell">
                <span>Sasaran</span>
                <b class="num">${s.target}</b>
              </div>
              <div class="eq-cell">
                <span>Makanan (In)</span>
                <b class="num">${s.kin}</b>
              </div>
              <div class="eq-cell">
                <span>Senaman (Out)</span>
                <b class="num" style="color:var(--ok)">+${s.kout}</b>
              </div>
            </div>
          </div>

          <!-- Kad Makronutrien Minimalis -->
          <div class="card">
            <div class="card-title">
              <span>Pecahan Makronutrien</span>
              <span class="muted">Harian</span>
            </div>
            ${macroBar({ label: 'Protein', value: s.protein, target: s.macros.protein, cls: 'p' })}
            ${macroBar({ label: 'Karbohidrat', value: s.carbs, target: s.macros.carbs, cls: 'c' })}
            ${macroBar({ label: 'Lemak', value: s.fat, target: s.macros.fat, cls: 'f' })}
          </div>

          <!-- Kompanion Mesej Deku / Bakugou -->
          ${companionBubble(compMsg.who, compMsg.text)}
        </div>

        <!-- Kolum Kanan: Log Makanan Hari Ini & Aktiviti -->
        <div class="stack">
          <!-- Kad Log Makanan -->
          <div class="card">
            <div class="card-title row between">
              <span>Log Makanan Hari Ini</span>
              <button class="btn btn-sm btn-ghost" id="btn-manual-add">
                ${icons.plus}
                <span>Tambah Manual</span>
              </button>
            </div>

            <div class="list" id="meal-list">
              ${
                s.meals.length === 0
                  ? `<div class="empty">
                      ${icons.bowl}
                      <p>Belum ada makanan direkodkan hari ini.</p>
                      <span class="small muted">Tangkap gambar makanan anda untuk dianalisis oleh Gemini AI!</span>
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
                          <span class="badge" style="height:18px;font-size:10px;padding:0 6px">${m.mealType || 'Makan'}</span>
                          <span>· P: ${Math.round(m.protein || 0)}g · K: ${Math.round(m.carbs || 0)}g · L: ${Math.round(m.fat || 0)}g</span>
                        </div>
                      </div>
                      <div class="li-end">
                        <b class="num">${m.kcal} <span class="xs muted">kcal</span></b>
                        <small>${fmtTime(m.time || m.date)}</small>
                      </div>
                      <div class="row" style="gap:4px;margin-left:6px">
                        <button class="btn btn-icon btn-ghost btn-sm edit-meal-btn" data-id="${m.id}" title="Edit" aria-label="Edit hidangan">
                          ${icons.edit}
                        </button>
                        <button class="btn btn-icon btn-ghost btn-sm del-meal-btn" data-id="${m.id}" title="Padam" aria-label="Padam hidangan" style="color:var(--danger)">
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

          <!-- Kad Aktiviti / Larian Ala Strava Hari Ini -->
          <div class="card">
            <div class="card-title row between">
              <span>Aktiviti Fizikal Hari Ini</span>
              <a href="#/activity" class="btn btn-sm btn-ghost">
                ${icons.run}
                <span>Mula Larian</span>
              </a>
            </div>

            <div class="list">
              ${
                s.acts.length === 0
                  ? `<div class="empty">
                      ${icons.run}
                      <p>Tiada aktiviti fizikal direkodkan hari ini.</p>
                      <span class="small muted">Mulakan penjejak GPS ala Strava untuk membakar kalori!</span>
                    </div>`
                  : s.acts
                      .map(
                        (a) => `
                    <div class="list-item" data-id="${a.id}">
                      <div class="thumb" style="width:72px;background:#0d0d0e;border:1px solid var(--border);padding:2px">
                        ${routeThumbSVG(a.segments, { w: 72, h: 48, stroke: 2 })}
                      </div>
                      <div class="li-main">
                        <div class="li-title">${esc(a.type || 'Larian GPS')}</div>
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
                      <button class="btn btn-icon btn-ghost btn-sm del-act-btn" data-id="${a.id}" title="Padam" aria-label="Padam aktiviti" style="color:var(--danger)">
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
        title: 'Tambah Hidangan',
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
            title: 'Edit Hidangan',
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
