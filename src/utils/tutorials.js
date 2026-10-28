// Modal Panduan & Walkthrough Interaktif CalMal bagi Setiap Halaman
// Reka bentuk minimalist, bersih, dan sepadan 100% dengan UI sebenar setiap halaman
import { t, getLang } from './i18n.js';
import { openSheet } from '../components/ui.js';
import { icons } from '../components/icons.js';
import { esc } from './helpers.js';
import { soundboard, VOICE_SHUFFLE_CATALOG } from '../services/audioService.js';

/**
 * Returns the interactive tutorial configuration for a given page key.
 * Strictly mirrors the actual UI elements, terms, and features of each page.
 * Support for: dashboard, scan, recipes, activity, profile
 */
function getTutorialConfig(pageKey, isEn) {
  const configs = {
    dashboard: {
      category: 'Dashboard',
      icon: icons.home,
      steps: [
        {
          tag: isEn ? 'Calorie Balance' : 'Baki Kalori',
          title: isEn ? 'Calorie Balance: Target - Food In + Burned' : 'Formula Baki Kalori: Sasaran - Makanan + Terbakar',
          desc: isEn
            ? 'Formula: Daily Target - Food In + Burned = Remaining Calories. Green ring indicates on target; red warns of a calorie surplus.'
            : 'Formula: Sasaran Harian - Makanan Masuk + Kalori Terbakar = Baki Kalori. Cincin hijau tanda patuh sasaran; merah tanda lebihan kalori.',
          renderWidget: () => `
            <div class="tutorial-widget-box" id="tut-widget-box">
              <div class="tutorial-widget-header">
                <span class="tutorial-widget-badge">${isEn ? 'Interactive Preview' : 'Pratonton Interaktif'}</span>
                <span class="tutorial-widget-tip">${isEn ? 'Adjust Target or tap actions' : 'Laras sasaran atau sentuh butang'}</span>
              </div>
              <div class="row between" style="align-items:center;padding:2px 0">
                <span style="font-weight:700;color:#fff;font-size:13px">${isEn ? 'Calorie Balance' : 'Baki Kalori'}</span>
                <span class="badge ok" id="tut-dash-badge">${isEn ? 'On Target' : 'Mengikut Sasaran'}</span>
              </div>
              <div class="t-ring-wrapper">
                <svg class="t-ring-svg" viewBox="0 0 100 100">
                  <circle class="t-ring-bg" cx="50" cy="50" r="40" />
                  <circle class="t-ring-val" id="tut-dash-ring" cx="50" cy="50" r="40" stroke-dasharray="251.2" stroke-dashoffset="105" />
                </svg>
                <div class="t-ring-data">
                  <div class="t-ring-num"><span id="tut-dash-rem">1,150</span> <span style="font-size:12px;font-weight:600;color:#94a3b8">kcal</span></div>
                  <div class="t-ring-status" id="tut-dash-status">${isEn ? 'kcal Remaining' : 'kcal Baki'}</div>
                </div>
              </div>
              <!-- Equation row matching real Dashboard -->
              <div class="equation" style="margin:2px 0">
                <div class="eq-cell">
                  <span>${isEn ? 'Target' : 'Sasaran'}</span>
                  <b class="num" id="tut-eq-target">2,000</b>
                </div>
                <div class="eq-cell">
                  <span>${isEn ? 'Food In' : 'Makanan'}</span>
                  <b class="num" id="tut-eq-food">850</b>
                </div>
                <div class="eq-cell">
                  <span>${isEn ? 'Burned' : 'Terbakar'}</span>
                  <b class="num" id="tut-eq-burn" style="color:var(--ok)">+0</b>
                </div>
              </div>
              <div class="t-actions-grid">
                <button type="button" class="t-demo-btn" id="tut-dash-add-egg">+ 2 Telur (+140 kcal)</button>
                <button type="button" class="t-demo-btn" id="tut-dash-add-roti">+ Roti Canai (+310 kcal)</button>
                <button type="button" class="t-demo-btn" id="tut-dash-add-run" style="border-color:rgba(16,185,129,0.3);color:#34d399">Larian 3km (-250 kcal)</button>
                <button type="button" class="t-demo-btn" id="tut-dash-reset" style="color:#94a3b8">${isEn ? 'Reset' : 'Semula'}</button>
              </div>
            </div>
          `,
          mount: (box) => {
            let target = 2000;
            let food = 850;
            let burned = 0;

            const updateUI = () => {
              const rem = target - food + burned;
              const isOver = rem < 0;
              const remEl = box.querySelector('#tut-dash-rem');
              const ringEl = box.querySelector('#tut-dash-ring');
              const statusEl = box.querySelector('#tut-dash-status');
              const badgeEl = box.querySelector('#tut-dash-badge');
              const foodEl = box.querySelector('#tut-eq-food');
              const burnEl = box.querySelector('#tut-eq-burn');

              if (remEl) remEl.textContent = Math.abs(rem).toLocaleString();
              if (foodEl) foodEl.textContent = food.toLocaleString();
              if (burnEl) burnEl.textContent = `+${burned}`;

              const circum = 251.2;
              const effectiveTarget = Math.max(1, target + burned);
              const ratio = Math.max(0, Math.min(1.3, food / effectiveTarget));
              const offset = Math.max(0, circum * (1 - ratio));

              if (ringEl) {
                ringEl.style.strokeDashoffset = offset;
                if (isOver) {
                  ringEl.classList.add('surplus');
                } else {
                  ringEl.classList.remove('surplus');
                }
              }

              if (badgeEl) {
                badgeEl.className = `badge ${isOver ? 'bad' : 'ok'}`;
                badgeEl.textContent = isOver ? (isEn ? 'Surplus' : 'Lebihan') : (isEn ? 'On Target' : 'Mengikut Sasaran');
              }

              if (statusEl) {
                statusEl.className = `t-ring-status ${isOver ? 'surplus' : ''}`;
                statusEl.textContent = isOver ? (isEn ? 'kcal Over Target' : 'kcal Terlebih Had') : (isEn ? 'kcal Remaining' : 'kcal Baki');
              }
            };

            box.querySelector('#tut-dash-add-egg')?.addEventListener('click', () => {
              food += 140;
              soundboard.playUISound('stepper');
              updateUI();
            });
            box.querySelector('#tut-dash-add-roti')?.addEventListener('click', () => {
              food += 310;
              soundboard.playUISound('stepper');
              updateUI();
            });
            box.querySelector('#tut-dash-add-run')?.addEventListener('click', () => {
              burned += 250;
              soundboard.playUISound('confirm');
              updateUI();
            });
            box.querySelector('#tut-dash-reset')?.addEventListener('click', () => {
              target = 2000;
              food = 850;
              burned = 0;
              soundboard.playUISound('nav');
              updateUI();
            });
          },
        },
        {
          tag: isEn ? '1-Tap Malaysian Foods' : 'Cip 1-Sentuhan Malaysia',
          title: isEn ? "Today's Meals & Quick Tap Chips" : 'Log Hidangan Pantas 1-Sentuhan',
          desc: isEn
            ? 'Tap quick Malaysian staple chips (Kopi O, 2 Telur, Roti Canai, Nasi Putih) to instantly log calories and macros into your food diary.'
            : 'Sentuh cip makanan lazim (Kopi O, 2 Telur, Roti Canai, Nasi Putih) untuk merekod kalori dan makro serta-merta ke dalam diari makanan.',
          renderWidget: () => `
            <div class="tutorial-widget-box" id="tut-widget-box">
              <div class="tutorial-widget-header">
                <span class="tutorial-widget-badge">${isEn ? 'Interactive Preview' : 'Pratonton Interaktif'}</span>
                <span class="tutorial-widget-tip">${isEn ? 'Tap chips to log' : 'Sentuh cip untuk log'}</span>
              </div>
              <div class="row between" style="align-items:center">
                <span class="xs bold muted" style="letter-spacing:0.04em">${isEn ? '1-Tap Malaysian Foods' : 'Cip Makanan Lazim Malaysia'}</span>
                <button type="button" class="btn btn-xs btn-ghost" id="tut-tray-clear" style="font-size:11px;color:#94a3b8">${isEn ? 'Reset' : 'Semula'}</button>
              </div>
              <div class="t-chips-list">
                <button type="button" class="t-food-chip" data-name="Kopi O Kosong" data-kcal="5">+ Kopi O (5 kcal)</button>
                <button type="button" class="t-food-chip" data-name="Telur Separuh Masak" data-kcal="140">+ 2 Telur (140 kcal)</button>
                <button type="button" class="t-food-chip" data-name="Roti Canai" data-kcal="310">+ Roti Canai (310 kcal)</button>
                <button type="button" class="t-food-chip" data-name="Nasi Putih" data-kcal="150">+ Nasi Putih (150 kcal)</button>
                <button type="button" class="t-food-chip" data-name="Teh Tarik Kurang Manis" data-kcal="115">+ Teh Tarik (115 kcal)</button>
              </div>
              <div class="t-log-tray" id="tut-log-tray">
                <div id="tut-tray-info" style="color:#e2e8f0;font-size:12px;font-weight:600">
                  ${isEn ? 'Diary: 0 items (0 kcal)' : 'Diari: 0 hidangan (0 kcal)'}
                </div>
              </div>
            </div>
          `,
          mount: (box) => {
            let totalKcal = 0;
            let items = [];
            const trayInfo = box.querySelector('#tut-tray-info');

            box.querySelectorAll('.t-food-chip').forEach((chip) => {
              chip.addEventListener('click', () => {
                const kcal = parseInt(chip.dataset.kcal, 10) || 0;
                const name = chip.dataset.name;
                totalKcal += kcal;
                items.push(name);
                chip.classList.add('t-added');
                setTimeout(() => chip.classList.remove('t-added'), 300);

                soundboard.playUISound('stepper');
                if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);

                if (trayInfo) {
                  trayInfo.innerHTML = `${isEn ? 'Logged' : 'Dilog'}: <strong>${name}</strong> (+${kcal} kcal) · <span style="color:#34d399">${totalKcal} kcal</span>`;
                }
              });
            });

            box.querySelector('#tut-tray-clear')?.addEventListener('click', () => {
              totalKcal = 0;
              items = [];
              soundboard.playUISound('nav');
              if (trayInfo) {
                trayInfo.textContent = isEn ? 'Diary: 0 items (0 kcal)' : 'Diari: 0 hidangan (0 kcal)';
              }
            });
          },
        },
        {
          tag: isEn ? 'Water Intake' : 'Air Minuman',
          title: isEn ? 'Water Tracker & Custom Amount' : 'Penjejak Air Minuman & Sukatan Bebas',
          desc: isEn
            ? 'Tap "+ 250ml" for quick logging, "- 250ml" to deduct, or tap "Custom" / the water bar to input any exact amount in ml.'
            : 'Sentuh "+ 250ml" untuk log pantas, "- 250ml" untuk tolak, atau sentuh "Bebas" / bar air untuk tetapkan sebarang jumlah ml.',
          renderWidget: () => `
            <div class="tutorial-widget-box" id="tut-widget-box">
              <div class="tutorial-widget-header">
                <span class="tutorial-widget-badge">${isEn ? 'Interactive Preview' : 'Pratonton Interaktif'}</span>
                <span class="tutorial-widget-tip">${isEn ? 'Daily Target: 2,500 ml' : 'Sasaran Harian: 2,500 ml'}</span>
              </div>
              <div class="row between" style="align-items:center">
                <div class="row" style="gap:8px;align-items:center">
                  <span style="width:16px;height:16px;display:inline-flex;color:#38bdf8">${icons.droplet}</span>
                  <div>
                    <div class="row" style="gap:6px;align-items:center">
                      <span class="small bold" style="color:#fff">${isEn ? 'Water Intake' : 'Air Minuman'}</span>
                      <button type="button" class="btn btn-xs btn-ghost" id="tut-water-custom-btn" style="padding:1px 6px;font-size:10px;border:1px solid var(--border-soft)">${isEn ? 'Custom' : 'Bebas'}</button>
                    </div>
                    <div class="xs muted"><span id="tut-water-val">1,250</span> / 2,500 ml (<span id="tut-water-pct">50</span>%)</div>
                  </div>
                </div>
                <div class="row" style="gap:5px;align-items:center">
                  <button type="button" class="btn btn-xs btn-ghost" id="tut-water-sub" style="padding:3px 7px;font-size:11px;border:1px solid var(--border-soft)">- 250ml</button>
                  <button type="button" class="btn btn-xs btn-primary" id="tut-water-add" style="padding:3px 7px;font-size:11px">+ 250ml</button>
                </div>
              </div>
              <!-- Water track bar matching real UI -->
              <div class="water-track" id="tut-water-bar" style="margin-top:6px;cursor:pointer">
                <div class="water-fill" id="tut-water-fill" style="width: 50%;"></div>
              </div>
            </div>
          `,
          mount: (box) => {
            let water = 1250;
            const target = 2500;
            const valEl = box.querySelector('#tut-water-val');
            const pctEl = box.querySelector('#tut-water-pct');
            const fillEl = box.querySelector('#tut-water-fill');

            const update = () => {
              if (valEl) valEl.textContent = water.toLocaleString();
              const pct = Math.min(100, Math.round((water / target) * 100));
              if (pctEl) pctEl.textContent = pct;
              if (fillEl) {
                fillEl.style.width = `${pct}%`;
                if (pct >= 100) fillEl.classList.add('complete');
                else fillEl.classList.remove('complete');
              }
            };

            box.querySelector('#tut-water-add')?.addEventListener('click', () => {
              water = Math.min(4000, water + 250);
              soundboard.playUISound('stepper');
              update();
            });
            box.querySelector('#tut-water-sub')?.addEventListener('click', () => {
              water = Math.max(0, water - 250);
              soundboard.playUISound('stepper');
              update();
            });
            box.querySelector('#tut-water-custom-btn')?.addEventListener('click', () => {
              water = water === 2000 ? 1250 : 2000;
              soundboard.playUISound('confirm');
              update();
            });
            box.querySelector('#tut-water-bar')?.addEventListener('click', () => {
              water = water >= 2500 ? 500 : water + 500;
              soundboard.playUISound('stepper');
              update();
            });
          },
        },
        {
          tag: isEn ? 'AI Hero Coach' : 'Jurulatih Hero AI',
          title: isEn ? 'Deku & Bakugou Audio Companion' : 'Jurulatih Audio Deku & Bakugou',
          desc: isEn
            ? 'Switch between Deku and Bakugou for genuine Japanese voice lines and motivational feedback based on your progress.'
            : 'Pilih antara Deku dan Bakugou untuk ulasan suara asli anime Jepun dan sorakan motivasi mengikut pencapaian anda.',
          renderWidget: () => {
            const dekuDefault = VOICE_SHUFFLE_CATALOG.deku[0];
            return `
            <div class="tutorial-widget-box" id="tut-widget-box">
              <div class="tutorial-widget-header">
                <span class="tutorial-widget-badge">${isEn ? 'Interactive Preview' : 'Pratonton Interaktif'}</span>
                <span class="tutorial-widget-tip">${isEn ? 'Tap to switch coach' : 'Sentuh untuk tukar jurulatih'}</span>
              </div>
              <div class="t-coach-toggle-grid">
                <button type="button" class="t-coach-btn active-deku" id="tut-coach-deku">
                  <span>Izuku Midoriya (Deku)</span>
                </button>
                <button type="button" class="t-coach-btn" id="tut-coach-baku">
                  <span>Katsuki Bakugou</span>
                </button>
              </div>
              <!-- Speech Bubble Card matching real Companion -->
              <div style="background:rgba(0,0,0,0.35);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:10px 12px">
                <div class="row" style="gap:6px;align-items:center;font-size:11.5px;color:#34d399;margin-bottom:4px;font-weight:600">
                  <span style="font-size:9px;padding:1px 5px;border-radius:4px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.1)">JP</span>
                  <span id="tut-coach-ja">${esc(dekuDefault.ja)}</span>
                </div>
                <p style="font-size:12.5px;color:#e2e8f0;margin:0;line-height:1.4" id="tut-coach-text">
                  ${esc(isEn ? dekuDefault.en : dekuDefault.ms)}
                </p>
              </div>
              <button type="button" class="btn btn-secondary btn-block" id="tut-coach-play-btn" style="gap:8px">
                <span id="tut-coach-play-icon" style="width:14px;height:14px;display:inline-flex">${icons.sound}</span>
                <span id="tut-coach-play-label">${isEn ? 'Play Voice Audio' : 'Dengar Suara Hero'}</span>
              </button>
            </div>
            `;
          },
          mount: (box) => {
            const dekuLine = VOICE_SHUFFLE_CATALOG.deku[0];
            const bakuLine = VOICE_SHUFFLE_CATALOG.bakugou[0];
            let activeCoach = 'deku';
            let currentLine = dekuLine;
            let isPlaying = false;
            let playTimer = null;
            const dekuBtn = box.querySelector('#tut-coach-deku');
            const bakuBtn = box.querySelector('#tut-coach-baku');
            const jaEl = box.querySelector('#tut-coach-ja');
            const textEl = box.querySelector('#tut-coach-text');
            const playBtn = box.querySelector('#tut-coach-play-btn');
            const playIcon = box.querySelector('#tut-coach-play-icon');
            const playLabel = box.querySelector('#tut-coach-play-label');

            const resetPlayBtn = () => {
              isPlaying = false;
              if (playTimer) {
                clearTimeout(playTimer);
                playTimer = null;
              }
              if (playBtn) {
                playBtn.classList.remove('is-playing');
                playBtn.style.borderColor = '';
                playBtn.style.color = '';
                playBtn.style.background = '';
              }
              if (playIcon) playIcon.innerHTML = icons.sound;
              if (playLabel) playLabel.textContent = isEn ? 'Play Voice Audio' : 'Dengar Suara Hero';
            };

            const setPlayingBtn = () => {
              isPlaying = true;
              if (playBtn) {
                playBtn.classList.add('is-playing');
                playBtn.style.borderColor = 'rgba(239, 68, 68, 0.45)';
                playBtn.style.color = '#fca5a5';
                playBtn.style.background = 'rgba(239, 68, 68, 0.12)';
              }
              if (playIcon) playIcon.innerHTML = icons.pause;
              if (playLabel) playLabel.textContent = isEn ? 'Stop / Skip Voice' : 'Langkau / Hentikan Suara';
            };

            const setCoach = (coach) => {
              if (activeCoach !== coach) {
                soundboard.stopAll();
                resetPlayBtn();
              }
              activeCoach = coach;
              if (coach === 'deku') {
                currentLine = dekuLine;
                dekuBtn.className = 't-coach-btn active-deku';
                bakuBtn.className = 't-coach-btn';
                jaEl.textContent = dekuLine.ja;
                jaEl.style.color = '#34d399';
                textEl.textContent = isEn ? dekuLine.en : dekuLine.ms;
              } else {
                currentLine = bakuLine;
                bakuBtn.className = 't-coach-btn active-baku';
                dekuBtn.className = 't-coach-btn';
                jaEl.textContent = bakuLine.ja;
                jaEl.style.color = '#fb923c';
                textEl.textContent = isEn ? bakuLine.en : bakuLine.ms;
              }
              soundboard.playUISound('toggle-on');
            };

            dekuBtn?.addEventListener('click', () => setCoach('deku'));
            bakuBtn?.addEventListener('click', () => setCoach('bakugou'));

            const onVoiceState = (ev) => {
              if (!ev.detail?.isPlaying) {
                resetPlayBtn();
              }
            };
            window.addEventListener('calmal:voice-state', onVoiceState);

            playBtn?.addEventListener('click', () => {
              if (isPlaying) {
                soundboard.stopAll();
                resetPlayBtn();
                return;
              }

              setPlayingBtn();
              // Play the exact line displayed without changing text
              soundboard.playLineAudio(activeCoach, currentLine).catch(() => {
                resetPlayBtn();
              });

              playTimer = setTimeout(() => {
                resetPlayBtn();
              }, 4800);
            });

            return () => {
              window.removeEventListener('calmal:voice-state', onVoiceState);
              if (playTimer) clearTimeout(playTimer);
              soundboard.stopAll();
            };
          },
        },
      ],
    },

    scan: {
      category: isEn ? 'Food Scanner' : 'Pengimbas',
      icon: icons.scan,
      steps: [
        {
          tag: isEn ? 'Live Camera Scan' : 'Imbasan Kamera AI',
          title: isEn ? 'AI Vision Food Recognition' : 'Pengecaman Makanan Melalui Kamera AI',
          desc: isEn
            ? 'Point your camera at any Malaysian dish. CalMal AI identifies the dish, estimated portions, calories, and macros automatically.'
            : 'Halakan kamera ke hidangan Malaysia. AI CalMal mengenal pasti jenis masakan, anggaran saiz porsi, kalori dan makro secara automatik.',
          renderWidget: () => `
            <div class="tutorial-widget-box" id="tut-widget-box">
              <div class="tutorial-widget-header">
                <span class="tutorial-widget-badge">${isEn ? 'Interactive Preview' : 'Pratonton Interaktif'}</span>
                <span class="tutorial-widget-tip">${isEn ? 'Tap Test AI Scan' : 'Sentuh Uji Imbasan AI'}</span>
              </div>
              <div class="t-viewfinder">
                <div class="t-corner-tl"></div>
                <div class="t-corner-tr"></div>
                <div class="t-corner-bl"></div>
                <div class="t-corner-br"></div>
                <div class="t-laser-line"></div>
                <div id="tut-scan-preview" style="text-align:center;padding:12px;z-index:2">
                  <div style="font-size:13px;font-weight:700;color:#fff">Nasi Lemak Ayam Goreng</div>
                  <div class="xs muted">${isEn ? 'Position dish within frame' : 'Halakan makanan ke dalam bingkai'}</div>
                </div>
              </div>
              <button type="button" class="btn btn-primary btn-block" id="tut-scan-test-btn" style="gap:8px">
                <span style="width:14px;height:14px;display:inline-flex">${icons.camera}</span>
                <span>${isEn ? 'Test AI Scan' : 'Uji Imbasan AI'}</span>
              </button>
              <div id="tut-scan-result" style="display:none;background:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.3);border-radius:10px;padding:8px 12px;font-size:11.5px">
                <div class="row between" style="align-items:center">
                  <strong style="color:#34d399">Nasi Lemak Ayam Goreng</strong>
                  <span class="badge ok" style="font-size:10px">98% Match</span>
                </div>
                <div style="font-size:15px;font-weight:900;color:#fff;margin:4px 0">640 <span style="font-size:11px;font-weight:500;color:#94a3b8">kcal · 1 serving (380g)</span></div>
                <div class="xs muted">Protein: 32g · Carbs: 68g · Fat: 26g</div>
              </div>
            </div>
          `,
          mount: (box) => {
            const btn = box.querySelector('#tut-scan-test-btn');
            const res = box.querySelector('#tut-scan-result');

            btn?.addEventListener('click', () => {
              btn.disabled = true;
              btn.innerHTML = `<span class="spinner" style="width:14px;height:14px;border-width:2px"></span> <span>${isEn ? 'Analyzing...' : 'Menganalisis...'}</span>`;
              soundboard.playUISound('confirm');

              setTimeout(() => {
                btn.disabled = false;
                btn.innerHTML = `<span style="width:14px;height:14px;display:inline-flex">${icons.check}</span> <span>${isEn ? 'Scan Complete' : 'Imbasan Selesai'}</span>`;
                if (res) res.style.display = 'block';
                soundboard.playUISound('confirm');
              }, 450);
            });
          },
        },
        {
          tag: isEn ? 'Voice Note' : 'Nota Suara',
          title: isEn ? 'Log Meals Using Voice Dictation' : 'Log Hidangan Menggunakan Suara',
          desc: isEn
            ? 'Tap "Voice Note" in the header and speak what you ate in English or Bahasa Melayu. CalMal extracts individual items and calculates calories.'
            : 'Sentuh "Nota Suara" di bar atas dan sebut hidangan anda. CalMal mengasingkan lauk dan mengira jumlah kalori secara automatik.',
          renderWidget: () => `
            <div class="tutorial-widget-box" id="tut-widget-box">
              <div class="tutorial-widget-header">
                <span class="tutorial-widget-badge">${isEn ? 'Interactive Preview' : 'Pratonton Interaktif'}</span>
                <span class="tutorial-widget-tip">${isEn ? 'Tap to test dictation' : 'Sentuh untuk uji sebut'}</span>
              </div>
              <div class="t-waveform">
                <div class="t-wave-bar"></div>
                <div class="t-wave-bar"></div>
                <div class="t-wave-bar"></div>
                <div class="t-wave-bar"></div>
                <div class="t-wave-bar"></div>
              </div>
              <button type="button" class="btn btn-secondary btn-block" id="tut-voice-dictate-btn" style="gap:8px">
                <span style="width:14px;height:14px;display:inline-flex">${icons.sound}</span>
                <span>${isEn ? 'Test Voice Note' : 'Uji Nota Suara'}</span>
              </button>
              <div id="tut-voice-output" style="display:none;background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:8px 12px;font-size:11.5px">
                <div class="xs muted">${isEn ? 'Transcribed Speech:' : 'Pertuturan Diterjemah:'}</div>
                <div style="font-weight:700;color:#fff;margin:2px 0 4px">"Mee goreng mamak telur mata dan teh tarik kurang manis"</div>
                <div style="color:#38bdf8;font-weight:700">✓ ${isEn ? 'Extracted 2 items · Total: 655 kcal' : 'Dikesan 2 hidangan · Jumlah: 655 kcal'}</div>
              </div>
            </div>
          `,
          mount: (box) => {
            const btn = box.querySelector('#tut-voice-dictate-btn');
            const out = box.querySelector('#tut-voice-output');

            btn?.addEventListener('click', () => {
              btn.disabled = true;
              btn.innerHTML = `<span class="spinner" style="width:14px;height:14px;border-width:2px"></span> <span>${isEn ? 'Listening...' : 'Mendengar...'}</span>`;
              soundboard.playUISound('nav');

              setTimeout(() => {
                btn.disabled = false;
                btn.innerHTML = `<span style="width:14px;height:14px;display:inline-flex">${icons.check}</span> <span>${isEn ? 'Voice Recognized' : 'Suara Dikesan'}</span>`;
                if (out) out.style.display = 'block';
                soundboard.playUISound('confirm');
              }, 420);
            });
          },
        },
        {
          tag: isEn ? 'Portion Tuning' : 'Laras Porsi',
          title: isEn ? 'Quick Context Notes (Portion Fine-Tuning)' : 'Nota Pantas (Laras Saiz Porsi)',
          desc: isEn
            ? 'Select chips like "Half rice" or "Less oil" before scanning to tune calorie accuracy to your exact preparation.'
            : 'Pilih cip pantas seperti "Nasi separuh" atau "Kurang minyak" sebelum imbas untuk ketepatan kalori mengikut hidangan sebenar.',
          renderWidget: () => `
            <div class="tutorial-widget-box" id="tut-widget-box">
              <div class="tutorial-widget-header">
                <span class="tutorial-widget-badge">${isEn ? 'Interactive Preview' : 'Pratonton Interaktif'}</span>
                <span class="tutorial-widget-tip">${isEn ? 'Toggle chips to adjust' : 'Sentuh cip untuk laras'}</span>
              </div>
              <div class="row between" style="align-items:center;padding:2px 0">
                <span style="font-weight:700;color:#fff;font-size:13px">Mee Goreng Mamak</span>
                <span style="font-size:16px;font-weight:900;color:#38bdf8"><span id="tut-tune-kcal">580</span> kcal</span>
              </div>
              <div class="t-chips-list">
                <button type="button" class="t-food-chip" id="chip-rice" data-mod="-140">${isEn ? 'Half rice (-140 kcal)' : 'Nasi separuh (-140 kcal)'}</button>
                <button type="button" class="t-food-chip" id="chip-oil" data-mod="-60">${isEn ? 'Less oil (-60 kcal)' : 'Kurang minyak (-60 kcal)'}</button>
                <button type="button" class="t-food-chip" id="chip-meat" data-mod="120">${isEn ? 'Chicken breast (+120 kcal)' : 'Ayam dada (+120 kcal)'}</button>
                <button type="button" class="t-food-chip" id="chip-sweet" data-mod="-40">${isEn ? 'Less sweet (-40 kcal)' : 'Kurang manis (-40 kcal)'}</button>
              </div>
              <div class="xs muted" style="line-height:1.4">
                ${isEn ? 'CalMal tunes nutritional calories automatically without manual calculation.' : 'CalMal melaras anggaran kalori serta-merta tanpa perlu pengiraan manual.'}
              </div>
            </div>
          `,
          mount: (box) => {
            const baseKcal = 580;
            const activeMods = new Set();
            const kcalEl = box.querySelector('#tut-tune-kcal');

            ['#chip-rice', '#chip-oil', '#chip-meat', '#chip-sweet'].forEach((id) => {
              const chip = box.querySelector(id);
              chip?.addEventListener('click', () => {
                const mod = parseInt(chip.dataset.mod, 10);
                if (activeMods.has(mod)) {
                  activeMods.delete(mod);
                  chip.classList.remove('t-added');
                  soundboard.playUISound('toggle-off');
                } else {
                  activeMods.add(mod);
                  chip.classList.add('t-added');
                  soundboard.playUISound('toggle-on');
                }
                let current = baseKcal;
                activeMods.forEach((m) => (current += m));
                if (kcalEl) kcalEl.textContent = current;
              });
            });
          },
        },
        {
          tag: isEn ? 'Barcode & OCR' : 'Kod Bar & Nutrisi',
          title: isEn ? 'Barcode & Nutrition Facts OCR' : 'Imbas Kod Bar & Maklumat Pemakanan',
          desc: isEn
            ? 'Switch tabs to scan Malaysian packaged food barcodes or snap nutrition facts tables directly from packages.'
            : 'Tukar tab untuk imbas kod bar makanan bungkusan pasar raya atau tangkap jadual maklumat pemakanan.',
          renderWidget: () => `
            <div class="tutorial-widget-box" id="tut-widget-box">
              <div class="tutorial-widget-header">
                <span class="tutorial-widget-badge">${isEn ? 'Interactive Preview' : 'Pratonton Interaktif'}</span>
                <span class="tutorial-widget-tip">${isEn ? 'Instant lookup' : 'Carian segera'}</span>
              </div>
              <div style="background:#090c10;border-radius:10px;padding:10px;text-align:center;border:1px dashed rgba(255,255,255,0.15)">
                <div style="font-family:monospace;letter-spacing:6px;font-size:18px;color:#cbd5e1">||| | |||| | |||||</div>
                <div class="xs muted" style="margin-top:2px">9556001234567 (Malaysian Barcode)</div>
              </div>
              <button type="button" class="btn btn-secondary btn-block" id="tut-barcode-btn" style="gap:8px">
                <span style="width:14px;height:14px;display:inline-flex">${icons.barcode}</span>
                <span>${isEn ? 'Test Barcode Lookup' : 'Uji Imbasan Kod Bar'}</span>
              </button>
              <div id="tut-barcode-res" style="display:none;background:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.3);border-radius:10px;padding:8px 12px;font-size:11.5px">
                <div style="color:#34d399;font-weight:700">Nestlé Milo UHT 200ml</div>
                <div class="xs muted" style="margin-top:2px">124 kcal · Protein: 4.2g · Carbs: 18g · Calcium & B-Vitamins</div>
              </div>
            </div>
          `,
          mount: (box) => {
            const btn = box.querySelector('#tut-barcode-btn');
            const res = box.querySelector('#tut-barcode-res');

            btn?.addEventListener('click', () => {
              btn.disabled = true;
              soundboard.playUISound('stepper');
              setTimeout(() => {
                btn.disabled = false;
                if (res) res.style.display = 'block';
                soundboard.playUISound('confirm');
              }, 300);
            });
          },
        },
      ],
    },

    recipes: {
      category: isEn ? 'Recipes' : 'Resipi',
      icon: icons.chef,
      steps: [
        {
          tag: isEn ? '7-Day Meal Plan' : 'Pelan 7-Hari',
          title: isEn ? '7-Day Schedule & Meal Filters' : 'Jadual Mingguan & Pilihan Waktu Makan',
          desc: isEn
            ? 'Toggle between Day View (Mon–Sun) or Meal View (Breakfast, Lunch, Dinner, Snack) to view scheduled healthy Malaysian dishes.'
            : 'Pilih mod Ikut Hari (Isnin–Ahad) atau Ikut Waktu Makan (Sarapan, Makan Tengah Hari, dll.) untuk semak hidangan sihat.',
          renderWidget: () => `
            <div class="tutorial-widget-box" id="tut-widget-box">
              <div class="tutorial-widget-header">
                <span class="tutorial-widget-badge">${isEn ? 'Interactive Preview' : 'Pratonton Interaktif'}</span>
                <span class="tutorial-widget-tip">${isEn ? 'Tap day to inspect meal' : 'Sentuh hari untuk semak'}</span>
              </div>
              <div class="t-day-pills">
                <button type="button" class="t-day-pill active" data-day="mon">${isEn ? 'Mon' : 'Isnin'}</button>
                <button type="button" class="t-day-pill" data-day="tue">${isEn ? 'Tue' : 'Selasa'}</button>
                <button type="button" class="t-day-pill" data-day="wed">${isEn ? 'Wed' : 'Rabu'}</button>
                <button type="button" class="t-day-pill" data-day="thu">${isEn ? 'Thu' : 'Khamis'}</button>
                <button type="button" class="t-day-pill" data-day="fri">${isEn ? 'Fri' : 'Jumaat'}</button>
              </div>
              <div class="t-dish-preview-card" id="tut-dish-card">
                <div>
                  <div style="font-size:10px;font-weight:700;color:#60a5fa;text-transform:uppercase" id="tut-dish-timing">${isEn ? 'LUNCH' : 'MAKAN TENGAH HARI'}</div>
                  <div style="font-weight:700;color:#fff;font-size:13px;margin:2px 0" id="tut-dish-name">Ayam Masak Lemak Cili Api & Nasi</div>
                  <div class="xs muted" id="tut-dish-macros">680 kcal · 54g Protein · 65g Carbs</div>
                </div>
                <span class="badge ok" style="font-size:10px">High Protein</span>
              </div>
            </div>
          `,
          mount: (box) => {
            const dishes = {
              mon: { timing: isEn ? 'LUNCH' : 'MAKAN TENGAH HARI', name: 'Ayam Masak Lemak Cili Api & Nasi', macros: '680 kcal · 54g Protein · 65g Carbs' },
              tue: { timing: isEn ? 'LUNCH' : 'MAKAN TENGAH HARI', name: 'Sup Ayam Utara & Ulam Kampung', macros: '620 kcal · 52g Protein · 55g Carbs' },
              wed: { timing: isEn ? 'DINNER' : 'MAKAN MALAM', name: 'Ikan Siakap Stim Limau & Halia', macros: '510 kcal · 48g Protein · 35g Carbs' },
              thu: { timing: isEn ? 'LUNCH' : 'MAKAN TENGAH HARI', name: 'Nasi Kerabu & Ayam Percik', macros: '690 kcal · 56g Protein · 70g Carbs' },
              fri: { timing: isEn ? 'BREAKFAST' : 'SARAPAN', name: 'Roti Bakar & Telur Separuh Masak', macros: '320 kcal · 17g Protein · 28g Carbs' },
            };

            box.querySelectorAll('.t-day-pill').forEach((pill) => {
              pill.addEventListener('click', () => {
                box.querySelectorAll('.t-day-pill').forEach((p) => p.classList.remove('active'));
                pill.classList.add('active');
                const d = dishes[pill.dataset.day];
                if (d) {
                  box.querySelector('#tut-dish-timing').textContent = d.timing;
                  box.querySelector('#tut-dish-name').textContent = d.name;
                  box.querySelector('#tut-dish-macros').textContent = d.macros;
                }
                soundboard.playUISound('nav');
              });
            });
          },
        },
        {
          tag: isEn ? 'Swap Dish' : 'Tukar Lauk',
          title: isEn ? 'Instant Dish Swap & Diet Preferences' : 'Tukar Lauk 1-Sentuhan & Keutamaan Diet',
          desc: isEn
            ? 'Tap "Swap Dish" on any meal to instantly rotate an alternative healthy Malaysian dish with matching nutritional macros.'
            : 'Sentuh "Tukar Lauk" pada mana-mana hidangan untuk menggantikan menu alternatif sihat yang mempunyai makro setara.',
          renderWidget: () => `
            <div class="tutorial-widget-box" id="tut-widget-box">
              <div class="tutorial-widget-header">
                <span class="tutorial-widget-badge">${isEn ? 'Interactive Preview' : 'Pratonton Interaktif'}</span>
                <span class="tutorial-widget-tip">${isEn ? 'Preserves calorie target' : 'Kekalkan sasaran kalori'}</span>
              </div>
              <div class="t-dish-preview-card" id="tut-swap-card">
                <div>
                  <div style="font-size:10px;font-weight:700;color:#f59e0b;text-transform:uppercase">${isEn ? 'CURRENT SELECTION' : 'MENU SEMASA'}</div>
                  <div style="font-weight:700;color:#fff;font-size:13px;margin:2px 0" id="tut-swap-name">Ayam Masak Lemak Cili Api & Nasi</div>
                  <div class="xs muted" id="tut-swap-meta">680 kcal · 54g Protein</div>
                </div>
              </div>
              <button type="button" class="btn btn-secondary btn-block" id="tut-swap-btn" style="gap:8px">
                <span style="width:14px;height:14px;display:inline-flex">${icons.refresh}</span>
                <span>${isEn ? 'Swap Dish' : 'Tukar Lauk'}</span>
              </button>
            </div>
          `,
          mount: (box) => {
            const alts = [
              { name: 'Ikan Kembung Bakar Air Asam', meta: '520 kcal · 44g Protein' },
              { name: 'Nasi Ayam Stim Hainan', meta: '590 kcal · 46g Protein' },
              { name: 'Sup Daging Empuk & Kentang', meta: '610 kcal · 46g Protein' },
              { name: 'Ayam Masak Lemak Cili Api & Nasi', meta: '680 kcal · 54g Protein' },
            ];
            let idx = 0;
            const btn = box.querySelector('#tut-swap-btn');
            const nameEl = box.querySelector('#tut-swap-name');
            const metaEl = box.querySelector('#tut-swap-meta');
            const cardEl = box.querySelector('#tut-swap-card');

            btn?.addEventListener('click', () => {
              idx = (idx + 1) % alts.length;
              if (cardEl) {
                cardEl.style.transform = 'scale(0.97)';
                setTimeout(() => (cardEl.style.transform = 'scale(1)'), 140);
              }
              if (nameEl) nameEl.textContent = alts[idx].name;
              if (metaEl) metaEl.textContent = alts[idx].meta;
              soundboard.playUISound('stepper');
            });
          },
        },
        {
          tag: isEn ? 'AI Generator' : 'Penjana AI',
          title: isEn ? 'Generate Recipes From Available Ingredients' : 'Cipta Resipi Dari Bahan Dapur Anda',
          desc: isEn
            ? 'Switch to the Generator tab to create personalized recipes from ingredients you have or fridge photos.'
            : 'Pergi ke tab Penjana untuk mencipta resipi sihat daripada bahan dapur yang ada atau foto peti sejuk anda.',
          renderWidget: () => `
            <div class="tutorial-widget-box" id="tut-widget-box">
              <div class="tutorial-widget-header">
                <span class="tutorial-widget-badge">${isEn ? 'Interactive Preview' : 'Pratonton Interaktif'}</span>
                <span class="tutorial-widget-tip">${isEn ? 'Select available items' : 'Pilih bahan dapur'}</span>
              </div>
              <div class="t-chips-list">
                <button type="button" class="t-food-chip t-added" data-ing="egg">Telur</button>
                <button type="button" class="t-food-chip t-added" data-ing="chicken">Dada Ayam</button>
                <button type="button" class="t-food-chip" data-ing="spinach">Bayam</button>
                <button type="button" class="t-food-chip" data-ing="garlic">Bawang Putih</button>
              </div>
              <button type="button" class="btn btn-primary btn-block" id="tut-gen-btn" style="gap:8px">
                <span style="width:14px;height:14px;display:inline-flex">${icons.sparkles}</span>
                <span>${isEn ? 'Generate Recipe' : 'Jana Resipi'}</span>
              </button>
              <div id="tut-gen-res" style="display:none;background:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.3);border-radius:10px;padding:8px 12px;font-size:11.5px">
                <div style="color:#34d399;font-weight:700">Tumis Dada Ayam & Bayam Bawang Putih</div>
                <div class="xs muted" style="margin-top:2px">280 kcal · 36g Protein · Siap dalam 10 minit · Rendah minyak</div>
              </div>
            </div>
          `,
          mount: (box) => {
            box.querySelectorAll('.t-food-chip').forEach((c) => {
              c.addEventListener('click', () => {
                c.classList.toggle('t-added');
                soundboard.playUISound('stepper');
              });
            });

            const btn = box.querySelector('#tut-gen-btn');
            const res = box.querySelector('#tut-gen-res');

            btn?.addEventListener('click', () => {
              btn.disabled = true;
              btn.innerHTML = `<span class="spinner" style="width:14px;height:14px;border-width:2px"></span> <span>${isEn ? 'Generating...' : 'Menjana...'}</span>`;
              soundboard.playUISound('confirm');
              setTimeout(() => {
                btn.disabled = false;
                btn.innerHTML = `<span style="width:14px;height:14px;display:inline-flex">${icons.check}</span> <span>${isEn ? 'Recipe Ready' : 'Resipi Siap'}</span>`;
                if (res) res.style.display = 'block';
                soundboard.playUISound('confirm');
              }, 400);
            });
          },
        },
        {
          tag: isEn ? 'Market Guide' : 'Panduan Pasar',
          title: isEn ? 'Fresh Market & Grocer Shopping Tips' : 'Tips Pembelian Bahan Segar & Jimat',
          desc: isEn
            ? 'Tap the Market Guide card at the bottom of the screen to view strategies for fresh proteins and budget-friendly greens.'
            : 'Sentuh kad Panduan Pasar di bahagian bawah skrin untuk melihat panduan membeli bahan basah segar dan jimat.',
          renderWidget: () => `
            <div class="tutorial-widget-box" id="tut-widget-box">
              <div class="tutorial-widget-header">
                <span class="tutorial-widget-badge">${isEn ? 'Interactive Preview' : 'Pratonton Interaktif'}</span>
                <span class="tutorial-widget-tip">${isEn ? 'Grocers & Wet Markets' : 'Pasar Pagi & Pasar Raya'}</span>
              </div>
              <div style="display:flex;flex-direction:column;gap:6px">
                <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:8px 10px;font-size:11.5px">
                  <strong style="color:#60a5fa">Ikan Kembung & Siakap:</strong> <span style="color:#cbd5e1">${isEn ? 'High Omega-3, best value and freshness at morning markets.' : 'Tinggi Omega-3, kualiti paling segar dan jimat di pasar pagi.'}</span>
                </div>
                <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:8px 10px;font-size:11.5px">
                  <strong style="color:#34d399">Dada Ayam Segar:</strong> <span style="color:#cbd5e1">${isEn ? '31g protein per 100g. Request skinless cut.' : '31g protein per 100g. Minta buang kulit dan lemak.'}</span>
                </div>
              </div>
            </div>
          `,
          mount: () => {},
        },
      ],
    },

    activity: {
      category: isEn ? 'Activity' : 'Aktiviti',
      icon: icons.run,
      steps: [
        {
          tag: isEn ? 'Live GPS HUD' : 'GPS Masa Nyata',
          title: isEn ? 'Strava-Style Outdoor Activity HUD' : 'Paparan HUD Aktiviti Luar Bergaya Strava',
          desc: isEn
            ? 'Track your outdoor walks, runs, and rides with live distance, elapsed time, average pace (min/km), and estimated calories burned.'
            : 'Pantau aktiviti jalan, larian atau kayuhan dengan paparan masa nyata: jarak (km), masa, purata pace (min/km), dan kalori terbakar.',
          renderWidget: () => `
            <div class="tutorial-widget-box" id="tut-widget-box">
              <div class="tutorial-widget-header">
                <span class="tutorial-widget-badge">${isEn ? 'Interactive Preview' : 'Pratonton Interaktif'}</span>
                <span class="tutorial-widget-tip" id="tut-gps-status" style="color:#34d399">READY</span>
              </div>
              <div class="t-hud-grid">
                <div class="t-hud-item">
                  <div class="t-hud-lbl">${isEn ? 'DISTANCE' : 'JARAK'}</div>
                  <div class="t-hud-val"><span id="tut-hud-dist">1.42</span> km</div>
                </div>
                <div class="t-hud-item">
                  <div class="t-hud-lbl">${isEn ? 'DURATION' : 'MASA'}</div>
                  <div class="t-hud-val" id="tut-hud-time">08:14</div>
                </div>
                <div class="t-hud-item">
                  <div class="t-hud-lbl">${isEn ? 'PACE' : 'PACE'}</div>
                  <div class="t-hud-val">5'48" /km</div>
                </div>
                <div class="t-hud-item">
                  <div class="t-hud-lbl">${isEn ? 'CALORIES' : 'KALORI'}</div>
                  <div class="t-hud-val"><span id="tut-hud-cal">118</span> kcal</div>
                </div>
              </div>
              <button type="button" class="btn btn-primary btn-block" id="tut-gps-toggle-btn" style="gap:8px">
                <span style="width:14px;height:14px;display:inline-flex">${icons.play}</span>
                <span>${isEn ? 'Start Activity' : 'Mula Aktiviti'}</span>
              </button>
            </div>
          `,
          mount: (box) => {
            let isRunning = false;
            let timer = null;
            let secs = 494;
            let dist = 1.42;
            let kcal = 118;
            const btn = box.querySelector('#tut-gps-toggle-btn');
            const distEl = box.querySelector('#tut-hud-dist');
            const timeEl = box.querySelector('#tut-hud-time');
            const kcalEl = box.querySelector('#tut-hud-cal');
            const statEl = box.querySelector('#tut-gps-status');

            btn?.addEventListener('click', () => {
              isRunning = !isRunning;
              soundboard.playUISound(isRunning ? 'confirm' : 'nav');

              if (isRunning) {
                btn.className = 'btn btn-secondary btn-block';
                btn.innerHTML = `<span style="width:14px;height:14px;display:inline-flex">${icons.pause}</span> <span>${isEn ? 'Pause Activity' : 'Jeda Aktiviti'}</span>`;
                if (statEl) {
                  statEl.textContent = isEn ? 'RECORDING' : 'MERAKAM';
                  statEl.style.color = '#38bdf8';
                }
                timer = setInterval(() => {
                  secs += 1;
                  dist += 0.01;
                  kcal += 1;
                  const m = Math.floor(secs / 60).toString().padStart(2, '0');
                  const s = (secs % 60).toString().padStart(2, '0');
                  if (timeEl) timeEl.textContent = `${m}:${s}`;
                  if (distEl) distEl.textContent = dist.toFixed(2);
                  if (kcalEl) kcalEl.textContent = Math.round(kcal);
                }, 1000);
              } else {
                clearInterval(timer);
                btn.className = 'btn btn-primary btn-block';
                btn.innerHTML = `<span style="width:14px;height:14px;display:inline-flex">${icons.play}</span> <span>${isEn ? 'Resume Activity' : 'Sambung Aktiviti'}</span>`;
                if (statEl) {
                  statEl.textContent = isEn ? 'PAUSED' : 'DIJEDA';
                  statEl.style.color = '#fbbf24';
                }
              }
            });

            return () => clearInterval(timer);
          },
        },
        {
          tag: isEn ? 'Simulation Mode' : 'Mod Simulasi',
          title: isEn ? 'Simulation Mode for Indoor Testing' : 'Mod Simulasi untuk Ujian Dalam Rumah',
          desc: isEn
            ? 'Toggle "Simulation Mode" in the top bar to test route recording, speed, and GPS mapping without stepping outside.'
            : 'Aktifkan "Mod Simulasi" di bar atas untuk menguji rakaman laluan, kelajuan, dan peta GPS tanpa perlu keluar dari rumah.',
          renderWidget: () => `
            <div class="tutorial-widget-box" id="tut-widget-box">
              <div class="tutorial-widget-header">
                <span class="tutorial-widget-badge">${isEn ? 'Interactive Preview' : 'Pratonton Interaktif'}</span>
                <span class="tutorial-widget-tip">${isEn ? 'Test without GPS movement' : 'Uji tanpa pergerakan GPS'}</span>
              </div>
              <div style="background:#090c10;border-radius:10px;height:64px;position:relative;overflow:hidden;border:1px solid rgba(56,189,248,0.2);display:flex;align-items:center;padding:0 20px">
                <div style="position:absolute;left:20px;right:20px;height:3px;background:linear-gradient(90deg, #10b981, #38bdf8);border-radius:3px"></div>
                <div id="tut-runner-dot" style="position:absolute;left:20px;width:12px;height:12px;border-radius:50%;background:#38bdf8;box-shadow:0 0 10px #38bdf8;transition:left 1s ease"></div>
              </div>
              <div class="row gap-2">
                <button type="button" class="t-demo-btn" id="tut-speed-walk" style="flex:1">${isEn ? 'Walk 4 km/h' : 'Jalan 4 km/j'}</button>
                <button type="button" class="t-demo-btn" id="tut-speed-run" style="flex:1;border-color:#10b981;color:#34d399">${isEn ? 'Run 9 km/h' : 'Lari 9 km/j'}</button>
                <button type="button" class="t-demo-btn" id="tut-speed-cycle" style="flex:1">${isEn ? 'Cycle 18 km/h' : 'Kayuh 18 km/j'}</button>
              </div>
            </div>
          `,
          mount: (box) => {
            const dot = box.querySelector('#tut-runner-dot');
            box.querySelector('#tut-speed-walk')?.addEventListener('click', () => {
              if (dot) dot.style.left = '35%';
              soundboard.playUISound('stepper');
            });
            box.querySelector('#tut-speed-run')?.addEventListener('click', () => {
              if (dot) dot.style.left = '70%';
              soundboard.playUISound('stepper');
            });
            box.querySelector('#tut-speed-cycle')?.addEventListener('click', () => {
              if (dot) dot.style.left = '92%';
              soundboard.playUISound('confirm');
            });
          },
        },
        {
          tag: isEn ? 'Auto Calorie Sync' : 'Segerak Kalori',
          title: isEn ? 'Burned Calories Sync to Dashboard' : 'Segerak Kalori Terbakar ke Dashboard',
          desc: isEn
            ? 'Completed activities automatically credit burned calories directly to your dashboard calorie balance, expanding your food quota.'
            : 'Aktiviti yang selesai disimpan akan disegerakkan terus ke Dashboard: kalori terbakar ditambah ke baki kuota makanan harian anda.',
          renderWidget: () => `
            <div class="tutorial-widget-box" id="tut-widget-box">
              <div class="tutorial-widget-header">
                <span class="tutorial-widget-badge">${isEn ? 'Interactive Preview' : 'Pratonton Interaktif'}</span>
                <span class="tutorial-widget-tip">${isEn ? 'Automatic dashboard sync' : 'Segerak automatik'}</span>
              </div>
              <div style="background:rgba(0,0,0,0.35);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:10px 12px">
                <div class="row between" style="font-size:12px;margin-bottom:5px">
                  <span style="color:#94a3b8">${isEn ? 'Food Target:' : 'Sasaran Makanan:'}</span>
                  <span style="font-weight:700;color:#fff">2,000 kcal</span>
                </div>
                <div class="row between" style="font-size:12px;margin-bottom:5px">
                  <span style="color:#38bdf8">${isEn ? 'Workout Burned:' : 'Larian Terbakar:'}</span>
                  <span style="font-weight:700;color:#38bdf8">+ 350 kcal</span>
                </div>
                <div class="row between" style="font-size:13px;padding-top:6px;border-top:1px dashed rgba(255,255,255,0.1)">
                  <span style="color:#34d399;font-weight:700">${isEn ? 'New Calorie Allowance:' : 'Kuota Makanan Baharu:'}</span>
                  <span style="font-weight:900;color:#34d399;font-size:16px" id="tut-sync-total">2,350 kcal</span>
                </div>
              </div>
              <button type="button" class="btn btn-primary btn-block" id="tut-sync-btn">
                <span>${isEn ? 'Simulate Activity Sync' : 'Uji Segerak Aktiviti'}</span>
              </button>
            </div>
          `,
          mount: (box) => {
            const btn = box.querySelector('#tut-sync-btn');
            const total = box.querySelector('#tut-sync-total');

            btn?.addEventListener('click', () => {
              btn.disabled = true;
              soundboard.playUISound('confirm');
              if (total) {
                total.style.transform = 'scale(1.1)';
                total.style.color = '#38bdf8';
                setTimeout(() => {
                  total.style.transform = 'scale(1)';
                  total.style.color = '#34d399';
                  btn.disabled = false;
                }, 250);
              }
            });
          },
        },
      ],
    },

    profile: {
      category: isEn ? 'Profile' : 'Profil',
      icon: icons.user,
      steps: [
        {
          tag: isEn ? 'Body Biometrics' : 'Statistik Badan',
          title: isEn ? 'Scientific BMR & TDEE Calibration' : 'Kalibrasi BMR & TDEE Saintifik',
          desc: isEn
            ? 'Tap "Edit Profile" to update height, weight, target goal, and age for exact Mifflin-St Jeor daily calorie targets.'
            : 'Sentuh "Edit Profil" untuk mengemas kini tinggi, berat, umur dan sasaran bagi pengiraan BMR & TDEE yang tepat.',
          renderWidget: () => `
            <div class="tutorial-widget-box" id="tut-widget-box">
              <div class="tutorial-widget-header">
                <span class="tutorial-widget-badge">${isEn ? 'Interactive Preview' : 'Pratonton Interaktif'}</span>
                <span class="tutorial-widget-tip">${isEn ? 'Select fitness goal' : 'Pilih matlamat kecergasan'}</span>
              </div>
              <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:6px;width:100%">
                <button type="button" class="t-demo-btn active" id="goal-fat" style="border-color:#10b981;color:#34d399">${isEn ? 'Fat Loss' : 'Bakar Lemak'}</button>
                <button type="button" class="t-demo-btn" id="goal-keep">${isEn ? 'Maintain' : 'Kekal Berat'}</button>
                <button type="button" class="t-demo-btn" id="goal-bulk">${isEn ? 'Build Muscle' : 'Bina Otot'}</button>
              </div>
              <div style="background:rgba(0,0,0,0.35);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:10px 12px">
                <div class="row between" style="margin-bottom:4px">
                  <span class="xs muted">${isEn ? 'Daily Calorie Target' : 'Sasaran Kalori Harian'}</span>
                  <span style="font-size:16px;font-weight:900;color:#38bdf8" id="tut-goal-target">1,650 kcal</span>
                </div>
                <div class="xs muted" id="tut-goal-macro">${isEn ? 'Protein: 140g · Carbs: 160g · Fat: 45g (BMI 24.2)' : 'Protein: 140g · Karbo: 160g · Lemak: 45g (BMI 24.2)'}</div>
              </div>
            </div>
          `,
          mount: (box) => {
            const targets = {
              fat: { kcal: '1,650 kcal', macros: isEn ? 'Deficit -500 kcal · High Protein (140g)' : 'Defisit -500 kcal · Tinggi Protein (140g)' },
              keep: { kcal: '2,150 kcal', macros: isEn ? 'Maintenance TDEE · Balanced Nutrition' : 'Kekal Berat TDEE · Nutrisi Seimbang' },
              bulk: { kcal: '2,450 kcal', macros: isEn ? 'Surplus +300 kcal · Muscle Fuel' : 'Lebihan +300 kcal · Pembinaan Otot' },
            };

            ['fat', 'keep', 'bulk'].forEach((key) => {
              const btn = box.querySelector(`#goal-${key}`);
              btn?.addEventListener('click', () => {
                box.querySelectorAll('.t-demo-btn').forEach((b) => {
                  b.style.borderColor = 'rgba(255,255,255,0.1)';
                  b.style.color = '#e2e8f0';
                });
                btn.style.borderColor = '#10b981';
                btn.style.color = '#34d399';
                box.querySelector('#tut-goal-target').textContent = targets[key].kcal;
                box.querySelector('#tut-goal-macro').textContent = targets[key].macros;
                soundboard.playUISound('toggle-on');
              });
            });
          },
        },
        {
          tag: isEn ? 'AI Hero Coach' : 'Jurulatih Hero AI',
          title: isEn ? 'Hero Voice Coach & Sound FX' : 'Suara Asli Jurulatih Deku & Bakugou',
          desc: isEn
            ? 'Switch between Deku and Bakugou for motivational voice lines and commentary based on your workout and nutrition.'
            : 'Pilih antara Deku dan Bakugou untuk suara motivasi dan ulasan audio mengikut pencapaian nutrisi dan senaman anda.',
          renderWidget: () => {
            const dekuDefault = VOICE_SHUFFLE_CATALOG.deku[0];
            return `
            <div class="tutorial-widget-box" id="tut-widget-box">
              <div class="tutorial-widget-header">
                <span class="tutorial-widget-badge">${isEn ? 'Interactive Preview' : 'Pratonton Interaktif'}</span>
                <span class="tutorial-widget-tip">${isEn ? 'Japanese Voice Lines' : 'Suara Asli Jepun'}</span>
              </div>
              <div class="t-coach-toggle-grid">
                <button type="button" class="t-coach-btn active-deku" id="tut-prof-deku">
                  <span>Izuku Midoriya (Deku)</span>
                </button>
                <button type="button" class="t-coach-btn" id="tut-prof-baku">
                  <span>Katsuki Bakugou</span>
                </button>
              </div>
              <div id="tut-prof-quote" style="background:rgba(0,0,0,0.35);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:8px 12px;font-size:11.5px">
                <div class="row" style="gap:6px;align-items:center;font-size:11.5px;color:#34d399;margin-bottom:3px;font-weight:600">
                  <span style="font-size:9px;padding:1px 5px;border-radius:4px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.1)">JP</span>
                  <span id="tut-prof-ja">${esc(dekuDefault.ja)}</span>
                </div>
                <div class="xs muted" id="tut-prof-ms">
                  ${esc(isEn ? dekuDefault.en : dekuDefault.ms)}
                </div>
              </div>
              <button type="button" class="btn btn-secondary btn-block" id="tut-prof-play-btn" style="gap:8px">
                <span id="tut-prof-play-icon" style="width:14px;height:14px;display:inline-flex">${icons.sound}</span>
                <span id="tut-prof-play-label">${isEn ? 'Play Hero Voice Line' : 'Dengar Suara Hero'}</span>
              </button>
            </div>
            `;
          },
          mount: (box) => {
            const dekuLine = VOICE_SHUFFLE_CATALOG.deku[0];
            const bakuLine = VOICE_SHUFFLE_CATALOG.bakugou[0];
            let activeChar = 'deku';
            let currentLine = dekuLine;
            let isPlaying = false;
            let playTimer = null;
            const dekuBtn = box.querySelector('#tut-prof-deku');
            const bakuBtn = box.querySelector('#tut-prof-baku');
            const jaEl = box.querySelector('#tut-prof-ja');
            const msEl = box.querySelector('#tut-prof-ms');
            const playBtn = box.querySelector('#tut-prof-play-btn');
            const playIcon = box.querySelector('#tut-prof-play-icon');
            const playLabel = box.querySelector('#tut-prof-play-label');

            const resetPlayBtn = () => {
              isPlaying = false;
              if (playTimer) {
                clearTimeout(playTimer);
                playTimer = null;
              }
              if (playBtn) {
                playBtn.classList.remove('is-playing');
                playBtn.style.borderColor = '';
                playBtn.style.color = '';
                playBtn.style.background = '';
              }
              if (playIcon) playIcon.innerHTML = icons.sound;
              if (playLabel) playLabel.textContent = isEn ? 'Play Hero Voice Line' : 'Dengar Suara Hero';
            };

            const setPlayingBtn = () => {
              isPlaying = true;
              if (playBtn) {
                playBtn.classList.add('is-playing');
                playBtn.style.borderColor = 'rgba(239, 68, 68, 0.45)';
                playBtn.style.color = '#fca5a5';
                playBtn.style.background = 'rgba(239, 68, 68, 0.12)';
              }
              if (playIcon) playIcon.innerHTML = icons.pause;
              if (playLabel) playLabel.textContent = isEn ? 'Stop / Skip Voice' : 'Langkau / Hentikan Suara';
            };

            const setChar = (char) => {
              if (activeChar !== char) {
                soundboard.stopAll();
                resetPlayBtn();
              }
              activeChar = char;
              if (char === 'deku') {
                currentLine = dekuLine;
                dekuBtn.className = 't-coach-btn active-deku';
                bakuBtn.className = 't-coach-btn';
                jaEl.textContent = dekuLine.ja;
                jaEl.style.color = '#34d399';
                msEl.textContent = isEn ? dekuLine.en : dekuLine.ms;
              } else {
                currentLine = bakuLine;
                bakuBtn.className = 't-coach-btn active-baku';
                dekuBtn.className = 't-coach-btn';
                jaEl.textContent = bakuLine.ja;
                jaEl.style.color = '#fb923c';
                msEl.textContent = isEn ? bakuLine.en : bakuLine.ms;
              }
              soundboard.playUISound('toggle-on');
            };

            dekuBtn?.addEventListener('click', () => setChar('deku'));
            bakuBtn?.addEventListener('click', () => setChar('bakugou'));

            const onVoiceState = (ev) => {
              if (!ev.detail?.isPlaying) {
                resetPlayBtn();
              }
            };
            window.addEventListener('calmal:voice-state', onVoiceState);

            playBtn?.addEventListener('click', () => {
              if (isPlaying) {
                soundboard.stopAll();
                resetPlayBtn();
                return;
              }

              setPlayingBtn();
              // Play the exact line displayed without changing text
              soundboard.playLineAudio(activeChar, currentLine).catch(() => {
                resetPlayBtn();
              });

              playTimer = setTimeout(() => {
                resetPlayBtn();
              }, 4800);
            });

            return () => {
              window.removeEventListener('calmal:voice-state', onVoiceState);
              if (playTimer) clearTimeout(playTimer);
              soundboard.stopAll();
            };
          },
        },
        {
          tag: isEn ? 'Privacy & Language' : 'Privasi & Bahasa',
          title: isEn ? 'Local-First Privacy & Bilingual App' : 'Privasi Tempatan & Dwi-Bahasa',
          desc: isEn
            ? 'CalMal is local-first; personal stats are stored securely on your device. Switch between English and Bahasa Melayu anytime.'
            : 'CalMal berorientasikan privasi setempat (local-first); data disimpan selamat dalam peranti anda. Beralih bahasa bila-bila masa.',
          renderWidget: () => `
            <div class="tutorial-widget-box" id="tut-widget-box">
              <div class="tutorial-widget-header">
                <span class="tutorial-widget-badge">${isEn ? 'Interactive Preview' : 'Pratonton Interaktif'}</span>
                <span class="tutorial-widget-tip">${isEn ? 'Encrypted IndexedDB' : 'Storan selamat'}</span>
              </div>
              <div style="background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.22);border-radius:10px;padding:10px 12px">
                <div style="font-weight:700;color:#34d399;font-size:12.5px;margin-bottom:2px">
                  ${isEn ? 'Local-First Device Storage' : '100% Data Disimpan Selamat Dalam Peranti'}
                </div>
                <div class="xs muted" style="line-height:1.45">
                  ${isEn ? 'Zero cloud tracking. Works fully offline as a standalone Progressive Web App.' : 'Bebas penjejakan awan. Berfungsi sepenuhnya luar talian sebagai Progressive Web App.'}
                </div>
              </div>
            </div>
          `,
          mount: () => {},
        },
      ],
    },
  };

  return configs[pageKey] || null;
}

/**
 * Universal Open Tutorial Sheet with Multi-Step Story Carousel & Live Mini-Widgets
 */
export function openPageTutorial(pageKey) {
  const isEn = getLang() === 'en';
  const config = getTutorialConfig(pageKey, isEn);
  if (!config) return;

  let currentStep = 0;
  const totalSteps = config.steps.length;
  let activeCleanup = null;

  // Render modal container shell
  const { el: sheetEl, close } = openSheet(`
    <div class="tutorial-modal-sheet">
      <!-- Top Bar -->
      <div class="tutorial-topbar">
        <div class="tutorial-badge-row">
          <span class="tutorial-cat-pill">
            <span style="width:13px;height:13px;display:inline-flex">${config.icon}</span>
            <span>${esc(config.category)}</span>
          </span>
          <span class="tutorial-step-indicator" id="tut-step-ind">1 / ${totalSteps}</span>
        </div>
        <div class="row" style="gap:6px;align-items:center">
          <button type="button" class="tutorial-skip-btn" id="tut-skip-btn">
            ${isEn ? 'Skip' : 'Langkau'}
          </button>
          <button type="button" class="btn btn-icon btn-ghost btn-sm" data-close aria-label="${t('close')}">
            ${icons.close}
          </button>
        </div>
      </div>

      <!-- Segmented Story Progress Bars -->
      <div class="tutorial-progress-bars" id="tut-progress-bars" title="${isEn ? 'Click any bar to jump step' : 'Sentuh bar untuk lompat langkah'}">
        ${Array.from({ length: totalSteps })
          .map((_, i) => `<div class="t-bar ${i === 0 ? 'active' : ''}" data-step="${i}"></div>`)
          .join('')}
      </div>

      <!-- Slide Container -->
      <div class="tutorial-slide-container" id="tut-slide-container">
        <!-- Rendered dynamically -->
      </div>

      <!-- Footer Action Buttons -->
      <div class="tutorial-footer-actions">
        <button type="button" class="btn btn-ghost tutorial-nav-btn" id="tut-prev-btn" style="visibility:hidden">
          <span>${isEn ? '‹ Back' : '‹ Undur'}</span>
        </button>
        <div class="tutorial-dots" id="tut-dots">
          ${Array.from({ length: totalSteps })
            .map((_, i) => `<div class="t-dot ${i === 0 ? 'active' : ''}" data-step="${i}"></div>`)
            .join('')}
        </div>
        <button type="button" class="btn btn-primary tutorial-nav-btn" id="tut-next-btn">
          <span>${isEn ? 'Next ›' : 'Seterusnya ›'}</span>
        </button>
      </div>
    </div>
  `, {
    onClose: () => {
      soundboard.stopAll();
      if (activeCleanup) {
        try {
          activeCleanup();
        } catch {
          // ignore
        }
        activeCleanup = null;
      }
    },
  });

  const slideContainer = sheetEl.querySelector('#tut-slide-container');
  const stepInd = sheetEl.querySelector('#tut-step-ind');
  const prevBtn = sheetEl.querySelector('#tut-prev-btn');
  const nextBtn = sheetEl.querySelector('#tut-next-btn');
  const skipBtn = sheetEl.querySelector('#tut-skip-btn');
  const progressBars = sheetEl.querySelectorAll('.t-bar');
  const dots = sheetEl.querySelectorAll('.t-dot');

  // Render step view
  function renderStep(idx) {
    if (activeCleanup) {
      try {
        activeCleanup();
      } catch {
        // ignore cleanup errors
      }
      activeCleanup = null;
    }
    soundboard.stopAll();

    currentStep = idx;
    const step = config.steps[idx];

    // Update progress bars
    progressBars.forEach((bar, i) => {
      bar.classList.remove('active', 'completed');
      if (i < idx) bar.classList.add('completed');
      else if (i === idx) bar.classList.add('active');
    });

    // Update dots
    dots.forEach((dot, i) => {
      if (i === idx) dot.classList.add('active');
      else dot.classList.remove('active');
    });

    // Update indicator
    if (stepInd) {
      stepInd.textContent = `${idx + 1} / ${totalSteps}`;
    }

    // Update buttons
    if (prevBtn) {
      prevBtn.style.visibility = idx === 0 ? 'hidden' : 'visible';
    }

    if (nextBtn) {
      if (idx === totalSteps - 1) {
        nextBtn.className = 'btn tutorial-finish-btn tutorial-nav-btn';
        nextBtn.innerHTML = `<span>${isEn ? 'Got It' : 'Faham'}</span>`;
      } else {
        nextBtn.className = 'btn btn-primary tutorial-nav-btn';
        nextBtn.innerHTML = `<span>${isEn ? 'Next ›' : 'Seterusnya ›'}</span>`;
      }
    }

    // Render slide HTML
    if (slideContainer) {
      slideContainer.innerHTML = `
        <div class="tutorial-step-header">
          <div class="tutorial-step-tag">
            <span>${esc(step.tag)}</span>
          </div>
          <h3 class="tutorial-step-title">${esc(step.title)}</h3>
          <p class="tutorial-step-desc">${esc(step.desc)}</p>
        </div>
        ${step.renderWidget()}
      `;

      // Mount widget interactions
      const widgetBox = slideContainer.querySelector('#tut-widget-box');
      if (widgetBox && step.mount) {
        activeCleanup = step.mount(widgetBox);
      }
    }
  }

  // Next Button Handler
  nextBtn?.addEventListener('click', () => {
    soundboard.stopAll();
    if (currentStep < totalSteps - 1) {
      soundboard.playUISound('nav');
      renderStep(currentStep + 1);
    } else {
      soundboard.playUISound('confirm');
      close();
    }
  });

  // Back Button Handler
  prevBtn?.addEventListener('click', () => {
    soundboard.stopAll();
    if (currentStep > 0) {
      soundboard.playUISound('nav');
      renderStep(currentStep - 1);
    }
  });

  // Skip Button Handler: Stop immediately and close with zero lingering audio
  skipBtn?.addEventListener('click', () => {
    soundboard.stopAll();
    if (activeCleanup) {
      try {
        activeCleanup();
      } catch {
        // ignore
      }
      activeCleanup = null;
    }
    close();
  });

  // Click on segment progress bars
  progressBars.forEach((bar) => {
    bar.addEventListener('click', () => {
      const targetStep = parseInt(bar.dataset.step, 10);
      if (!isNaN(targetStep) && targetStep !== currentStep) {
        soundboard.stopAll();
        soundboard.playUISound('nav');
        renderStep(targetStep);
      }
    });
  });

  // Initial step render
  renderStep(0);
}

