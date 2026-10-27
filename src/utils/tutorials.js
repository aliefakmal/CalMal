// Modal Panduan & Walkthrough Interaktif CalMal bagi Setiap Halaman
import { t, getLang } from './i18n.js';
import { openSheet } from '../components/ui.js';
import { icons } from '../components/icons.js';
import { esc } from './helpers.js';
import { soundboard } from '../services/audioService.js';

/**
 * Returns the interactive tutorial definition for a given page key
 * Support for: dashboard, scan, recipes, activity, profile
 */
function getTutorialConfig(pageKey, isEn) {
  const configs = {
    dashboard: {
      category: isEn ? 'Dashboard & Balance' : 'Dashboard & Baki Kalori',
      icon: icons.home,
      steps: [
        {
          tag: isEn ? 'Step 1: Calorie Balance' : 'Langkah 1: Formula Baki Kalori',
          title: isEn ? 'Auto Calorie Balance Formula' : 'Formula Baki Kalori Automatik',
          desc: isEn
            ? 'Daily Target - Food Eaten + Calories Burned = Remaining Allowance. Green ring keeps you on track; red warns surplus!'
            : 'Sasaran Harian - Makanan Masuk + Kalori Terbakar = Baki Kuota. Cincin hijau tanda patuh sasaran; merah tanda lebihan!',
          renderWidget: () => `
            <div class="tutorial-widget-box" id="tut-widget-box">
              <div class="tutorial-widget-header">
                <span class="tutorial-widget-badge">⚡ ${isEn ? 'Try It Live' : 'Uji Sekarang'}</span>
                <span class="tutorial-widget-tip">${isEn ? 'Tap actions to test live ring' : 'Sentuh butang untuk uji cincin'}</span>
              </div>
              <div class="t-ring-wrapper">
                <svg class="t-ring-svg" viewBox="0 0 100 100">
                  <circle class="t-ring-bg" cx="50" cy="50" r="40" />
                  <circle class="t-ring-val" id="tut-dash-ring" cx="50" cy="50" r="40" stroke-dasharray="251.2" stroke-dashoffset="105" />
                </svg>
                <div class="t-ring-data">
                  <div class="t-ring-num"><span id="tut-dash-rem">1,150</span> <span style="font-size:13px;font-weight:600;color:#94a3b8">kcal</span></div>
                  <div class="t-ring-status" id="tut-dash-status">${isEn ? '✓ On Track (Remaining)' : '✓ Mengikut Sasaran (Baki)'}</div>
                  <div class="t-formula-line" id="tut-dash-formula">2,000 (Target) - 850 (Food) = 1,150</div>
                </div>
              </div>
              <div class="t-actions-grid">
                <button type="button" class="t-demo-btn" id="tut-dash-add-food">
                  <span>🍛 + ${isEn ? 'Nasi Lemak (+450)' : 'Nasi Lemak (+450)'}</span>
                </button>
                <button type="button" class="t-demo-btn" id="tut-dash-add-tea">
                  <span>☕ + ${isEn ? 'Teh Tarik (+140)' : 'Teh Tarik (+140)'}</span>
                </button>
                <button type="button" class="t-demo-btn" id="tut-dash-add-run">
                  <span>🏃 - ${isEn ? '3km Run (-250)' : 'Larian 3km (-250)'}</span>
                </button>
                <button type="button" class="t-demo-btn" id="tut-dash-reset" style="color:#94a3b8">
                  <span>↺ ${isEn ? 'Reset' : 'Semula'}</span>
                </button>
              </div>
            </div>
          `,
          mount: (box) => {
            let target = 2000;
            let food = 850;
            let burned = 0;

            const updateUI = () => {
              const rem = target - food + burned;
              const remEl = box.querySelector('#tut-dash-rem');
              const ringEl = box.querySelector('#tut-dash-ring');
              const statusEl = box.querySelector('#tut-dash-status');
              const formulaEl = box.querySelector('#tut-dash-formula');

              if (remEl) remEl.textContent = rem.toLocaleString();
              const circum = 251.2;
              const ratio = Math.max(0, Math.min(1.4, food / (target + burned)));
              const offset = Math.max(0, circum * (1 - ratio));

              if (ringEl) {
                ringEl.style.strokeDashoffset = offset;
                if (rem < 0) {
                  ringEl.classList.add('surplus');
                } else {
                  ringEl.classList.remove('surplus');
                }
              }

              if (statusEl) {
                if (rem < 0) {
                  statusEl.className = 't-ring-status surplus';
                  statusEl.textContent = isEn ? `⚠️ Calorie Surplus (+${Math.abs(rem)} kcal)` : `⚠️ Terlebih Had! (+${Math.abs(rem)} kcal)`;
                } else {
                  statusEl.className = 't-ring-status';
                  statusEl.textContent = isEn ? '✓ On Track (Remaining)' : '✓ Mengikut Sasaran (Baki)';
                }
              }

              if (formulaEl) {
                formulaEl.textContent = `${target} - ${food} + ${burned} = ${rem} kcal`;
              }
            };

            box.querySelector('#tut-dash-add-food')?.addEventListener('click', () => {
              food += 450;
              soundboard.playUISound('stepper');
              updateUI();
            });
            box.querySelector('#tut-dash-add-tea')?.addEventListener('click', () => {
              food += 140;
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
          tag: isEn ? 'Step 2: 1-Tap Malaysian Foods' : 'Langkah 2: Cip 1-Sentuhan Malaysia',
          title: isEn ? 'Instant 1-Tap Food Logging' : 'Log Makanan Pantas 1-Sentuhan',
          desc: isEn
            ? 'No typing needed! Tap common Malaysian staples below to instantly record calories and macros directly to today\'s diary.'
            : 'Tak perlu taip! Sentuh cip hidangan lazim Malaysia untuk rekod kalori dan makro serta-merta ke dalam diari makanan hari ini.',
          renderWidget: () => `
            <div class="tutorial-widget-box" id="tut-widget-box">
              <div class="tutorial-widget-header">
                <span class="tutorial-widget-badge">⚡ ${isEn ? 'Interactive Chips' : 'Cip Interaktif'}</span>
                <span class="tutorial-widget-tip">${isEn ? 'Tap any dish to log' : 'Sentuh hidangan untuk log'}</span>
              </div>
              <div class="t-chips-list">
                <button type="button" class="t-food-chip" data-name="Kopi O" data-kcal="60">☕ Kopi O · 60 kcal</button>
                <button type="button" class="t-food-chip" data-name="2 Telur" data-kcal="140">🥚 2 Telur · 140 kcal</button>
                <button type="button" class="t-food-chip" data-name="Roti Canai" data-kcal="300">🥞 Roti Canai · 300 kcal</button>
                <button type="button" class="t-food-chip" data-name="Roti Bakar Kaya" data-kcal="220">🥪 Roti Kaya · 220 kcal</button>
              </div>
              <div class="t-log-tray">
                <div id="tut-tray-info" style="color:#e2e8f0;font-weight:600">
                  ${isEn ? 'Logged: 0 items (0 kcal)' : 'Dilog: 0 hidangan (0 kcal)'}
                </div>
                <button type="button" class="btn btn-ghost btn-xs" id="tut-tray-clear" style="font-size:11px;color:#94a3b8">
                  ${isEn ? 'Clear' : 'Kosongkan'}
                </button>
              </div>
            </div>
          `,
          mount: (box) => {
            let totalKcal = 0;
            let count = 0;
            const trayInfo = box.querySelector('#tut-tray-info');

            box.querySelectorAll('.t-food-chip').forEach((chip) => {
              chip.addEventListener('click', () => {
                const kcal = parseInt(chip.dataset.kcal, 10) || 0;
                const name = chip.dataset.name;
                totalKcal += kcal;
                count += 1;
                chip.classList.add('t-added');
                setTimeout(() => chip.classList.remove('t-added'), 400);

                soundboard.playUISound('stepper');
                if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(12);

                if (trayInfo) {
                  trayInfo.innerHTML = `✓ ${isEn ? 'Added' : 'Ditambah'} <strong>${name}</strong> (+${kcal} kcal) · <span style="color:#34d399">Total: ${totalKcal} kcal</span>`;
                }
              });
            });

            box.querySelector('#tut-tray-clear')?.addEventListener('click', () => {
              totalKcal = 0;
              count = 0;
              soundboard.playUISound('nav');
              if (trayInfo) {
                trayInfo.textContent = isEn ? 'Logged: 0 items (0 kcal)' : 'Dilog: 0 hidangan (0 kcal)';
              }
            });
          },
        },
        {
          tag: isEn ? 'Step 3: Hydration Tracker' : 'Langkah 3: Penjejak Air Pintar',
          title: isEn ? 'Smart Water Hydration Tracking' : 'Penjejak Air Minuman Pintar',
          desc: isEn
            ? 'Stay energized! Tap +250ml for a quick glass, or tap the water tumbler to log any exact amount.'
            : 'Kekal bertenaga! Sentuh +250ml untuk secawan air pantas, atau sentuh sukatan botol untuk mencapai 2,500ml harian.',
          renderWidget: () => `
            <div class="tutorial-widget-box" id="tut-widget-box">
              <div class="tutorial-widget-header">
                <span class="tutorial-widget-badge">⚡ ${isEn ? 'Hydration Stepper' : 'Pelaras Air Pintar'}</span>
                <span class="tutorial-widget-tip">${isEn ? 'Daily Goal: 2,500 ml' : 'Sasaran: 2,500 ml'}</span>
              </div>
              <div class="t-water-box">
                <div class="t-water-glass">
                  <div class="t-water-fill" id="tut-water-fill" style="height: 50%;"></div>
                </div>
                <div class="t-water-info">
                  <div class="t-water-amount"><span id="tut-water-val">1,250</span> <span style="font-size:13px;font-weight:600;color:#94a3b8">/ 2,500 ml</span></div>
                  <div style="font-size:11.5px;font-weight:600;color:#38bdf8" id="tut-water-pct">50% ${isEn ? 'achieved' : 'tercapai'}</div>
                  <div class="xs muted">${isEn ? 'Tap buttons below to drink' : 'Sentuh butang bawah untuk minum'}</div>
                </div>
              </div>
              <div class="row gap-2">
                <button type="button" class="t-demo-btn" id="tut-water-sub" style="flex:1">
                  <span>- 250ml</span>
                </button>
                <button type="button" class="t-demo-btn" id="tut-water-add" style="flex:1;border-color:rgba(56,189,248,0.4);color:#38bdf8">
                  <span>+ 250ml</span>
                </button>
                <button type="button" class="t-demo-btn" id="tut-water-bot" style="flex:1">
                  <span>💧 + 500ml</span>
                </button>
              </div>
            </div>
          `,
          mount: (box) => {
            let water = 1250;
            const maxWater = 2500;
            const fillEl = box.querySelector('#tut-water-fill');
            const valEl = box.querySelector('#tut-water-val');
            const pctEl = box.querySelector('#tut-water-pct');

            const updateWater = () => {
              if (valEl) valEl.textContent = water.toLocaleString();
              const pct = Math.round((water / maxWater) * 100);
              if (pctEl) {
                pctEl.textContent = `${pct}% ${isEn ? 'achieved' : 'tercapai'}${pct >= 100 ? (isEn ? ' 🏆 Goal Reached!' : ' 🏆 Sasaran Tercapai!') : ''}`;
                pctEl.style.color = pct >= 100 ? '#fbbf24' : '#38bdf8';
              }
              if (fillEl) {
                fillEl.style.height = `${Math.min(100, pct)}%`;
              }
            };

            box.querySelector('#tut-water-add')?.addEventListener('click', () => {
              water = Math.min(4000, water + 250);
              soundboard.playUISound('stepper');
              updateWater();
            });
            box.querySelector('#tut-water-bot')?.addEventListener('click', () => {
              water = Math.min(4000, water + 500);
              soundboard.playUISound('confirm');
              updateWater();
            });
            box.querySelector('#tut-water-sub')?.addEventListener('click', () => {
              water = Math.max(0, water - 250);
              soundboard.playUISound('stepper');
              updateWater();
            });
          },
        },
        {
          tag: isEn ? 'Step 4: Anime Hero Coach' : 'Langkah 4: Jurulatih Suara Anime',
          title: isEn ? 'Deku & Bakugou Live Companion' : 'Jurulatih Anime Deku & Bakugou',
          desc: isEn
            ? 'Get vocal motivation and real-time commentary based on your workout and calorie discipline!'
            : 'Dapatkan sorakan suara bersemangat dan ulasan AI mengikut pencapaian diet dan larian anda.',
          renderWidget: () => `
            <div class="tutorial-widget-box" id="tut-widget-box">
              <div class="tutorial-widget-header">
                <span class="tutorial-widget-badge">⚡ ${isEn ? 'Select Hero' : 'Pilih Jurulatih'}</span>
                <span class="tutorial-widget-tip">${isEn ? 'Tap to switch character' : 'Sentuh untuk tukar suara'}</span>
              </div>
              <div class="t-hero-grid">
                <div class="t-hero-card active-deku" id="tut-card-deku">
                  <div class="t-hero-name">🥦 Deku</div>
                  <div class="t-hero-quote" id="tut-quote-deku">"大丈夫！(Daijoubu!) Mari capai sasaran hari ini!"</div>
                </div>
                <div class="t-hero-card" id="tut-card-baku">
                  <div class="t-hero-name">💥 Bakugou</div>
                  <div class="t-hero-quote" id="tut-quote-baku">"おいおいおい！Jangan malas, bakar kalori tu!"</div>
                </div>
              </div>
              <button type="button" class="btn btn-secondary btn-block" id="tut-voice-test-btn" style="margin-top:2px;gap:8px">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
                <span>${isEn ? 'Preview Hero Voice Line' : 'Dengar Suara Motivasi Hero'}</span>
              </button>
            </div>
          `,
          mount: (box) => {
            let activeHero = 'deku';
            const dekuCard = box.querySelector('#tut-card-deku');
            const bakuCard = box.querySelector('#tut-card-baku');

            dekuCard?.addEventListener('click', () => {
              activeHero = 'deku';
              dekuCard.classList.add('active-deku');
              bakuCard.classList.remove('active-baku');
              soundboard.playUISound('toggle-on');
            });

            bakuCard?.addEventListener('click', () => {
              activeHero = 'bakugou';
              bakuCard.classList.add('active-baku');
              dekuCard.classList.remove('active-deku');
              soundboard.playUISound('toggle-on');
            });

            box.querySelector('#tut-voice-test-btn')?.addEventListener('click', () => {
              soundboard.playSound(activeHero, 'greet');
            });
          },
        },
      ],
    },

    scan: {
      category: isEn ? 'AI Food Scanner' : 'Pengimbas Makanan AI',
      icon: icons.scan,
      steps: [
        {
          tag: isEn ? 'Step 1: Live Camera Scan' : 'Langkah 1: Kamera AI Masa Nyata',
          title: isEn ? 'Point & Snap AI Vision' : 'Halakan Kamera & Imbas AI',
          desc: isEn
            ? 'Snap any Malaysian dish. CalMal AI recognizes portions, dish names, calories, and complete macros.'
            : 'Halakan kamera ke hidangan Malaysia. AI CalMal mengenal pasti jenis masakan, porsi, kalori dan makro automatik.',
          renderWidget: () => `
            <div class="tutorial-widget-box" id="tut-widget-box">
              <div class="tutorial-widget-header">
                <span class="tutorial-widget-badge">⚡ ${isEn ? 'Live Vision Demo' : 'Simulasi Kamera AI'}</span>
                <span class="tutorial-widget-tip">${isEn ? 'Tap Test AI Scan below' : 'Sentuh Uji Imbas'}</span>
              </div>
              <div class="t-viewfinder">
                <div class="t-corner-tl"></div>
                <div class="t-corner-tr"></div>
                <div class="t-corner-bl"></div>
                <div class="t-corner-br"></div>
                <div class="t-laser-line"></div>
                <div id="tut-scan-preview" style="text-align:center;padding:12px;z-index:2">
                  <div style="font-size:28px">🍛</div>
                  <div style="font-size:12px;font-weight:700;color:#fff;margin-top:4px">Nasi Lemak Ayam Goreng</div>
                  <div class="xs muted">${isEn ? 'Align food within brackets' : 'Kekalkan hidangan dalam bingkai'}</div>
                </div>
              </div>
              <button type="button" class="btn btn-primary btn-block" id="tut-scan-test-btn" style="gap:8px">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                <span>${isEn ? '📸 Test AI Scan' : '📸 Uji Imbasan AI'}</span>
              </button>
              <div id="tut-scan-result" style="display:none;background:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.3);border-radius:10px;padding:8px 12px;font-size:11.5px">
                <div style="color:#34d399;font-weight:800">✓ ${isEn ? 'Detected: Nasi Lemak (640 kcal)' : 'Dikesan: Nasi Lemak Ayam Goreng (640 kcal)'}</div>
                <div class="xs muted" style="margin-top:2px">Protein: 32g · Carbs: 68g · Fat: 26g · 98% Accuracy</div>
              </div>
            </div>
          `,
          mount: (box) => {
            const btn = box.querySelector('#tut-scan-test-btn');
            const res = box.querySelector('#tut-scan-result');

            btn?.addEventListener('click', () => {
              btn.disabled = true;
              btn.innerHTML = `<span class="spinner" style="width:14px;height:14px;border-width:2px"></span> <span>${isEn ? 'AI Analyzing...' : 'AI Sedang Menganalisis...'}</span>`;
              soundboard.playUISound('confirm');

              setTimeout(() => {
                btn.disabled = false;
                btn.innerHTML = `<span>${isEn ? '✓ Scan Completed!' : '✓ Imbasan Berjaya!'}</span>`;
                if (res) res.style.display = 'block';
                soundboard.playUISound('confirm');
                if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([20, 30, 40]);
              }, 480);
            });
          },
        },
        {
          tag: isEn ? 'Step 2: Voice Dictation' : 'Langkah 2: Log Nota Suara',
          title: isEn ? 'Speak & Log With Voice' : 'Sebut & Log Melalui Suara',
          desc: isEn
            ? 'Don\'t feel like typing? Speak in English, Malay, or Manglish and CalMal AI will automatically extract items and calculate calories.'
            : 'Malas nak menaip? Sebut hidangan anda dalam Bahasa Melayu atau santai dan AI akan mengasingkan lauk serta kalori secara automatik.',
          renderWidget: () => `
            <div class="tutorial-widget-box" id="tut-widget-box">
              <div class="tutorial-widget-header">
                <span class="tutorial-widget-badge">⚡ ${isEn ? 'Voice Note Simulator' : 'Simulasi Suara AI'}</span>
                <span class="tutorial-widget-tip">${isEn ? 'Tap to dictate meal' : 'Sentuh untuk uji sebut'}</span>
              </div>
              <div class="t-waveform">
                <div class="t-wave-bar"></div>
                <div class="t-wave-bar"></div>
                <div class="t-wave-bar"></div>
                <div class="t-wave-bar"></div>
                <div class="t-wave-bar"></div>
              </div>
              <button type="button" class="btn btn-secondary btn-block" id="tut-voice-dictate-btn" style="gap:8px">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
                <span>${isEn ? '🎙️ Test Voice Memo' : '🎙️ Uji Sebut Nota Suara'}</span>
              </button>
              <div id="tut-voice-output" style="display:none;background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:8px 12px;font-size:11.5px">
                <div class="xs muted">${isEn ? 'Transcribed Audio:' : 'Audio Diterjemah:'}</div>
                <div style="font-weight:700;color:#fff;margin:2px 0 4px">"Mee goreng mamak telur mata dan teh tarik kurang manis"</div>
                <div style="color:#38bdf8;font-weight:700">✓ ${isEn ? 'Extracted 3 items · 745 kcal total' : 'Dikenalpasti: 3 item · Jumlah 745 kcal'}</div>
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
                btn.innerHTML = `<span>${isEn ? '✓ Voice Recognized' : '✓ Suara Dikesan'}</span>`;
                if (out) out.style.display = 'block';
                soundboard.playUISound('confirm');
              }, 450);
            });
          },
        },
        {
          tag: isEn ? 'Step 3: Quick Portion Chips' : 'Langkah 3: Cip Pelaras Porsi',
          title: isEn ? 'Tune Portions Before Saving' : 'Laras Porsi Sebelum Simpan',
          desc: isEn
            ? 'Adjust calories easily using fast portion chips like "Half Rice", "Less Oil", or "Extra Protein".'
            : 'Sesuaikan anggaran kalori mengikut cara masakan sebenar menggunakan cip pantas seperti "Nasi Separuh" atau "Kurang Minyak".',
          renderWidget: () => `
            <div class="tutorial-widget-box" id="tut-widget-box">
              <div class="tutorial-widget-header">
                <span class="tutorial-widget-badge">⚡ ${isEn ? 'Portion Adjuster' : 'Pelaras Porsi'}</span>
                <span class="tutorial-widget-tip">${isEn ? 'Tap chips to modify total' : 'Sentuh cip untuk laras'}</span>
              </div>
              <div style="display:flex;align-items:center;justify-content:space-between;padding:4px 0">
                <div style="font-weight:700;color:#fff;font-size:13px">🍛 Mee Goreng Mamak</div>
                <div style="font-size:18px;font-weight:900;color:#38bdf8"><span id="tut-tune-kcal">580</span> kcal</div>
              </div>
              <div class="t-chips-list">
                <button type="button" class="t-food-chip" id="chip-rice" data-mod="-140">🍚 ${isEn ? 'Half Noodle (-140)' : 'Mee Separuh (-140)'}</button>
                <button type="button" class="t-food-chip" id="chip-oil" data-mod="-60">🛢️ ${isEn ? 'Less Oil (-60)' : 'Kurang Minyak (-60)'}</button>
                <button type="button" class="t-food-chip" id="chip-egg" data-mod="85">🍳 ${isEn ? 'Add Egg (+85)' : 'Tambah Telur (+85)'}</button>
              </div>
              <div class="xs muted" style="line-height:1.4">
                ${isEn ? 'CalMal recalculates macros and calories automatically based on your customized preferences.' : 'CalMal mengira semula makro dan kalori mengikut pilihan penyediaan sebenar anda.'}
              </div>
            </div>
          `,
          mount: (box) => {
            const baseKcal = 580;
            const activeMods = new Set();
            const kcalEl = box.querySelector('#tut-tune-kcal');

            ['#chip-rice', '#chip-oil', '#chip-egg'].forEach((id) => {
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
          tag: isEn ? 'Step 4: Barcode & OCR' : 'Langkah 4: Kod Bar & Nutrisi',
          title: isEn ? 'Packaged Foods Barcode Scan' : 'Imbas Kod Bar Makanan Bungkusan',
          desc: isEn
            ? 'Scan barcodes on Malaysian supermarket packaged foods or snap nutrition tables directly from packaging.'
            : 'Imbas kod bar produk pasar raya Malaysia atau tangkap jadual Maklumat Pemakanan dari bungkusan.',
          renderWidget: () => `
            <div class="tutorial-widget-box" id="tut-widget-box">
              <div class="tutorial-widget-header">
                <span class="tutorial-widget-badge">⚡ ${isEn ? 'Barcode OCR' : 'Pengimbas Kod Bar'}</span>
                <span class="tutorial-widget-tip">${isEn ? 'Instant lookup' : 'Carian segera'}</span>
              </div>
              <div style="background:#090c10;border-radius:10px;padding:12px;text-align:center;border:1px dashed rgba(255,255,255,0.15)">
                <div style="font-family:monospace;letter-spacing:6px;font-size:20px;color:#cbd5e1">||| | |||| | |||||</div>
                <div class="xs muted" style="margin-top:4px">9556001234567 (Malaysia Barcode)</div>
              </div>
              <button type="button" class="btn btn-secondary btn-block" id="tut-barcode-btn" style="gap:8px">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="3" y1="5" x2="3" y2="19"/><line x1="8" y1="5" x2="8" y2="19"/><line x1="12" y1="5" x2="12" y2="19"/><line x1="17" y1="5" x2="17" y2="19"/><line x1="21" y1="5" x2="21" y2="19"/></svg>
                <span>${isEn ? '🏷️ Simulate Barcode Match' : '🏷️ Uji Imbasan Kod Bar'}</span>
              </button>
              <div id="tut-barcode-res" style="display:none;background:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.3);border-radius:10px;padding:8px 12px;font-size:11.5px">
                <div style="color:#34d399;font-weight:800">✓ Nestlé Milo UHT 200ml</div>
                <div class="xs muted" style="margin-top:2px">124 kcal · Protein: 4.2g · Enriched with Calcium & B-Vitamins</div>
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
      category: isEn ? 'Recipes & Meal Plan' : 'Resipi & Pelan Makanan',
      icon: icons.chef,
      steps: [
        {
          tag: isEn ? 'Step 1: 7-Day Meal Plan' : 'Langkah 1: Pelan Makanan 7-Hari',
          title: isEn ? 'Personalized Weekly Malaysian Schedule' : 'Jadual Mingguan Makanan Sihat Malaysia',
          desc: isEn
            ? 'Filter by Day (Mon–Sun) or meal timing (Breakfast, Lunch, Dinner) to view scheduled healthy Malaysian dishes.'
            : 'Pilih hari (Isnin–Ahad) atau waktu makan untuk melihat cadangan menu sihat seimbang khas citarasa tempatan.',
          renderWidget: () => `
            <div class="tutorial-widget-box" id="tut-widget-box">
              <div class="tutorial-widget-header">
                <span class="tutorial-widget-badge">⚡ ${isEn ? 'Interactive Schedule' : 'Jadual Interaktif'}</span>
                <span class="tutorial-widget-tip">${isEn ? 'Tap day to swap menu' : 'Sentuh hari untuk tukar'}</span>
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
                  <div style="font-size:10px;font-weight:700;color:#60a5fa;text-transform:uppercase">${isEn ? 'LUNCH PREVIEW' : 'MAKAN TENGAH HARI'}</div>
                  <div style="font-weight:800;color:#fff;font-size:13px;margin:2px 0" id="tut-dish-name">🍛 Nasi Beras Perang + Ayam Panggang</div>
                  <div class="xs muted" id="tut-dish-macros">420 kcal · 36g Protein · 48g Carbs</div>
                </div>
                <span class="badge ok" style="font-size:10px">✓ High Protein</span>
              </div>
            </div>
          `,
          mount: (box) => {
            const dishes = {
              mon: { name: isEn ? '🍛 Brown Rice + Grilled Turmeric Chicken' : '🍛 Nasi Beras Perang + Ayam Panggang', macros: '420 kcal · 36g P · 48g C' },
              tue: { name: isEn ? '🐟 Tomato Clear Fish Soup & Greens' : '🐟 Sup Ikan Siakap Sayur Bening', macros: '320 kcal · 38g P · 18g C' },
              wed: { name: isEn ? '🥗 Malaysian Chicken Salad & Boiled Egg' : '🥗 Kerabu Ayam & Telur Rebus', macros: '350 kcal · 32g P · 14g C' },
              thu: { name: isEn ? '🍲 Kelantan Beef Singgang (Low Fat)' : '🍲 Singgang Daging Kelantan Sihat', macros: '390 kcal · 40g P · 12g C' },
              fri: { name: isEn ? '🍗 Coconut-Free Roast Percik Chicken' : '🍗 Ayam Percik Bakar Tanpa Santan', macros: '430 kcal · 37g P · 22g C' },
            };

            box.querySelectorAll('.t-day-pill').forEach((pill) => {
              pill.addEventListener('click', () => {
                box.querySelectorAll('.t-day-pill').forEach((p) => p.classList.remove('active'));
                pill.classList.add('active');
                const day = pill.dataset.day;
                const d = dishes[day];
                if (d) {
                  box.querySelector('#tut-dish-name').textContent = d.name;
                  box.querySelector('#tut-dish-macros').textContent = d.macros;
                }
                soundboard.playUISound('nav');
              });
            });
          },
        },
        {
          tag: isEn ? 'Step 2: 1-Tap Dish Swap' : 'Langkah 2: Tukar Lauk 1-Sentuhan',
          title: isEn ? 'Don\'t Like It? Instant Dish Swap!' : 'Tak Suka Menu Cadangan? Tukar Serta-Merta!',
          desc: isEn
            ? 'Tap "Swap Dish" to rotate healthy alternatives with matching nutritional calories and protein macros.'
            : 'Sentuh "Tukar Lauk" untuk menggantikan menu dengan hidangan alternatif sihat yang mempunyai jumlah kalori dan protein setara.',
          renderWidget: () => `
            <div class="tutorial-widget-box" id="tut-widget-box">
              <div class="tutorial-widget-header">
                <span class="tutorial-widget-badge">⚡ ${isEn ? 'Smart Dish Swap' : 'Tukar Lauk Pintar'}</span>
                <span class="tutorial-widget-tip">${isEn ? 'Preserves calorie budget' : 'Kekalkan bajet kalori'}</span>
              </div>
              <div class="t-dish-preview-card" id="tut-swap-card">
                <div>
                  <div style="font-size:10px;font-weight:700;color:#f59e0b;text-transform:uppercase">${isEn ? 'CURRENT SELECTION' : 'LAUK TERPILIH'}</div>
                  <div style="font-weight:800;color:#fff;font-size:13.5px;margin:2px 0" id="tut-swap-name">🍗 Ayam Masak Merah Sihat</div>
                  <div class="xs muted" id="tut-swap-meta">460 kcal · 36g Protein · Kurang Minyak</div>
                </div>
              </div>
              <button type="button" class="btn btn-secondary btn-block" id="tut-swap-btn" style="gap:8px">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M16 3h5v5"/><path d="M4 20L21 3"/><path d="M21 16v5h-5"/><path d="M15 15l6 6"/><path d="M4 4l5 5"/></svg>
                <span>${isEn ? '⇄ Swap Dish Now' : '⇄ Tukar Lauk Sekarang'}</span>
              </button>
            </div>
          `,
          mount: (box) => {
            const alts = [
              { name: isEn ? '🐟 Sambal Grilled Fish (Air Asam)' : '🐟 Ikan Kembung Bakar Air Asam', meta: '320 kcal · 32g Protein' },
              { name: isEn ? '🍲 Steamed Lime & Ginger Sea Bass' : '🍲 Ikan Siakap Stim Limau & Halia', meta: '290 kcal · 38g Protein' },
              { name: isEn ? '🍳 Turmeric Chicken Breast Stir-Fry' : '🍳 Ayam Kunyit Dada Sayur Campur', meta: '380 kcal · 35g Protein' },
              { name: isEn ? '🍗 Healthy Ayam Masak Merah' : '🍗 Ayam Masak Merah Sihat', meta: '460 kcal · 36g Protein' },
            ];
            let idx = 0;
            const btn = box.querySelector('#tut-swap-btn');
            const nameEl = box.querySelector('#tut-swap-name');
            const metaEl = box.querySelector('#tut-swap-meta');
            const cardEl = box.querySelector('#tut-swap-card');

            btn?.addEventListener('click', () => {
              idx = (idx + 1) % alts.length;
              if (cardEl) {
                cardEl.style.transform = 'scale(0.96)';
                setTimeout(() => (cardEl.style.transform = 'scale(1)'), 150);
              }
              if (nameEl) nameEl.textContent = alts[idx].name;
              if (metaEl) metaEl.textContent = alts[idx].meta;
              soundboard.playUISound('stepper');
            });
          },
        },
        {
          tag: isEn ? 'Step 3: AI Kitchen Generator' : 'Langkah 3: Penjana Resipi AI',
          title: isEn ? 'Cook From Whatever You Have' : 'Masak Dari Bahan Dapur Anda',
          desc: isEn
            ? 'Select ingredients in your fridge or kitchen, and CalMal AI generates high-protein, calorie-friendly Malaysian meals in seconds.'
            : 'Pilih bahan yang ada dalam peti sejuk anda, dan AI akan mencadangkan hidangan sihat, jimat, dan pantas mengikut selera tempatan.',
          renderWidget: () => `
            <div class="tutorial-widget-box" id="tut-widget-box">
              <div class="tutorial-widget-header">
                <span class="tutorial-widget-badge">⚡ ${isEn ? 'AI Chef Generator' : 'Penjana Resipi AI'}</span>
                <span class="tutorial-widget-tip">${isEn ? 'Tap ingredients' : 'Pilih bahan dapur'}</span>
              </div>
              <div class="t-chips-list">
                <button type="button" class="t-food-chip t-added" data-ing="egg">🥚 ${isEn ? 'Egg' : 'Telur'}</button>
                <button type="button" class="t-food-chip t-added" data-ing="chicken">🍗 ${isEn ? 'Chicken' : 'Dada Ayam'}</button>
                <button type="button" class="t-food-chip" data-ing="spinach">🥬 ${isEn ? 'Spinach' : 'Bayam'}</button>
                <button type="button" class="t-food-chip" data-ing="garlic">🧄 ${isEn ? 'Garlic' : 'Bawang Putih'}</button>
              </div>
              <button type="button" class="btn btn-primary btn-block" id="tut-gen-btn" style="gap:8px">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
                <span>${isEn ? '✨ Generate AI Recipe' : '✨ Jana Resipi AI'}</span>
              </button>
              <div id="tut-gen-res" style="display:none;background:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.3);border-radius:10px;padding:8px 12px;font-size:11.5px">
                <div style="color:#34d399;font-weight:800">🍳 ${isEn ? 'Stir-Fry Garlic Chicken & Egg (280 kcal)' : 'Tumis Ayam Telur Bawang Putih (280 kcal)'}</div>
                <div class="xs muted" style="margin-top:2px">36g Protein · Ready in 10 mins · Low sodium & oil</div>
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
              btn.innerHTML = `<span class="spinner" style="width:14px;height:14px;border-width:2px"></span> <span>${isEn ? 'Cooking with AI...' : 'AI Sedang Menjana...'}</span>`;
              soundboard.playUISound('confirm');
              setTimeout(() => {
                btn.disabled = false;
                btn.innerHTML = `<span>${isEn ? '✓ Recipe Ready!' : '✓ Resipi Siap!'}</span>`;
                if (res) res.style.display = 'block';
                soundboard.playUISound('confirm');
              }, 420);
            });
          },
        },
        {
          tag: isEn ? 'Step 4: Market Shopping Tips' : 'Langkah 4: Panduan Pasar Segar',
          title: isEn ? 'Malaysian Grocer & Wet Market Guide' : 'Tips Membeli Di Pasar Pagi & Pasar Raya',
          desc: isEn
            ? 'Learn how to pick fresh lean proteins (kembung fish, chicken breast) and budget greens with maximum satiety.'
            : 'Ketahui cara memilih sumber protein tinggi (ikan kembung, dada ayam, telur) dan sayur kampung paling jimat berkhasiat.',
          renderWidget: () => `
            <div class="tutorial-widget-box" id="tut-widget-box">
              <div class="tutorial-widget-header">
                <span class="tutorial-widget-badge">⚡ ${isEn ? 'Smart Buyer Tips' : 'Tips Jimat & Sihat'}</span>
                <span class="tutorial-widget-tip">${isEn ? 'Malaysian Grocers' : 'Pasar Tempatan'}</span>
              </div>
              <div style="display:flex;flex-direction:column;gap:6px">
                <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:8px 10px;font-size:11.5px">
                  <strong style="color:#60a5fa">🐟 Ikan Kembung & Siakap:</strong> <span style="color:#cbd5e1">${isEn ? 'High Omega-3, budget friendly at morning wet markets.' : 'Tinggi Omega-3, harga paling jimat di pasar pagi.'}</span>
                </div>
                <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:8px 10px;font-size:11.5px">
                  <strong style="color:#34d399">🍗 Dada Ayam Segar:</strong> <span style="color:#cbd5e1">${isEn ? '31g protein per 100g. Request skinless cut.' : '31g protein setiap 100g. Minta buang kulit & lemak.'}</span>
                </div>
              </div>
            </div>
          `,
          mount: () => {},
        },
      ],
    },

    activity: {
      category: isEn ? 'GPS Activity Tracker' : 'Penjejak GPS Aktiviti',
      icon: icons.run,
      steps: [
        {
          tag: isEn ? 'Step 1: Live GPS Running HUD' : 'Langkah 1: HUD GPS Masa Nyata',
          title: isEn ? 'Strava-Style Outdoor Running HUD' : 'Paparan HUD Larian & Kayuhan Bergaya Strava',
          desc: isEn
            ? 'Track your pace, distance, and calories burned with real-time HUD metrics and live GPS mapping.'
            : 'Pantau kelajuan, jarak, purata pace (min/km), dan kalori terbakar dengan paparan HUD berprestasi tinggi.',
          renderWidget: () => `
            <div class="tutorial-widget-box" id="tut-widget-box">
              <div class="tutorial-widget-header">
                <span class="tutorial-widget-badge">⚡ ${isEn ? 'Live HUD Simulator' : 'Simulasi HUD Masa Nyata'}</span>
                <span class="tutorial-widget-tip" id="tut-gps-status" style="color:#34d399">● READY</span>
              </div>
              <div class="t-hud-grid">
                <div class="t-hud-item">
                  <div class="t-hud-lbl">${isEn ? 'DISTANCE' : 'JARAK'}</div>
                  <div class="t-hud-val"><span id="tut-hud-dist">1.42</span> km</div>
                </div>
                <div class="t-hud-item">
                  <div class="t-hud-lbl">${isEn ? 'TIME' : 'MASA'}</div>
                  <div class="t-hud-val" id="tut-hud-time">08:14</div>
                </div>
                <div class="t-hud-item">
                  <div class="t-hud-lbl">${isEn ? 'PACE' : 'PACE'}</div>
                  <div class="t-hud-val">5'48" /km</div>
                </div>
                <div class="t-hud-item">
                  <div class="t-hud-lbl">${isEn ? 'BURNED' : 'TERBAKAR'}</div>
                  <div class="t-hud-val"><span id="tut-hud-cal">118</span> kcal</div>
                </div>
              </div>
              <button type="button" class="btn btn-primary btn-block" id="tut-gps-toggle-btn" style="gap:8px">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                <span>${isEn ? 'Start Workout Demo' : 'Mula Uji Larian'}</span>
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
                btn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> <span>${isEn ? 'Pause Workout' : 'Jeda Larian'}</span>`;
                if (statEl) {
                  statEl.textContent = isEn ? '● TRACKING ACTIVE' : '● GPS MENJEJAK';
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
                btn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg> <span>${isEn ? 'Resume Workout' : 'Sambung Larian'}</span>`;
                if (statEl) {
                  statEl.textContent = isEn ? '● PAUSED' : '● DIJEDA';
                  statEl.style.color = '#fbbf24';
                }
              }
            });

            return () => clearInterval(timer);
          },
        },
        {
          tag: isEn ? 'Step 2: Simulation Mode' : 'Langkah 2: Mod Simulasi Laluan',
          title: isEn ? 'Indoor Route Simulation' : 'Uji Laluan Tanpa Perlu Keluar Rumah',
          desc: isEn
            ? 'Test route playback and speedometer calculations indoors anytime using CalMal\'s built-in simulation mode.'
            : 'Gunakan Mod Simulasi untuk menguji sistem GPS dan visualisasi laluan peta tanpa perlu berlari di luar rumah.',
          renderWidget: () => `
            <div class="tutorial-widget-box" id="tut-widget-box">
              <div class="tutorial-widget-header">
                <span class="tutorial-widget-badge">⚡ ${isEn ? 'Route Simulation' : 'Simulasi Laluan'}</span>
                <span class="tutorial-widget-tip">${isEn ? 'Test without stepping outside' : 'Uji dalam bilik'}</span>
              </div>
              <div style="background:#090c10;border-radius:10px;height:70px;position:relative;overflow:hidden;border:1px solid rgba(56,189,248,0.2);display:flex;align-items:center;padding:0 20px">
                <div style="position:absolute;left:20px;right:20px;height:3px;background:linear-gradient(90deg, #10b981, #38bdf8);border-radius:3px"></div>
                <div id="tut-runner-dot" style="position:absolute;left:20px;width:14px;height:14px;border-radius:50%;background:#38bdf8;box-shadow:0 0 10px #38bdf8;transition:left 1.2s ease"></div>
              </div>
              <div class="row gap-2">
                <button type="button" class="t-demo-btn" id="tut-speed-walk" style="flex:1">🚶 4 km/j</button>
                <button type="button" class="t-demo-btn" id="tut-speed-run" style="flex:1;border-color:#10b981;color:#34d399">🏃 9 km/j</button>
                <button type="button" class="t-demo-btn" id="tut-speed-cycle" style="flex:1">🚴 18 km/j</button>
              </div>
            </div>
          `,
          mount: (box) => {
            const dot = box.querySelector('#tut-runner-dot');
            box.querySelector('#tut-speed-walk')?.addEventListener('click', () => {
              if (dot) dot.style.left = '40%';
              soundboard.playUISound('stepper');
            });
            box.querySelector('#tut-speed-run')?.addEventListener('click', () => {
              if (dot) dot.style.left = '75%';
              soundboard.playUISound('stepper');
            });
            box.querySelector('#tut-speed-cycle')?.addEventListener('click', () => {
              if (dot) dot.style.left = '90%';
              soundboard.playUISound('confirm');
            });
          },
        },
        {
          tag: isEn ? 'Step 3: Burn-to-Earn Sync' : 'Langkah 3: Segerak Kalori Terbakar',
          title: isEn ? 'Burned Calories Boost Daily Budget' : 'Kalori Terbakar Tambah Kuota Makan',
          desc: isEn
            ? 'Every workout completed automatically credits burned calories directly back to your dashboard food allowance!'
            : 'Setiap larian disegerakkan terus ke Dashboard untuk menambah kuota makanan harian anda secara automatik!',
          renderWidget: () => `
            <div class="tutorial-widget-box" id="tut-widget-box">
              <div class="tutorial-widget-header">
                <span class="tutorial-widget-badge">⚡ ${isEn ? 'Calorie Sync Demo' : 'Segerak Automatik'}</span>
                <span class="tutorial-widget-tip">${isEn ? 'Tap to sync' : 'Sentuh untuk segerak'}</span>
              </div>
              <div style="background:rgba(0,0,0,0.35);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:10px 12px">
                <div class="row between" style="font-size:12px;margin-bottom:6px">
                  <span style="color:#94a3b8">${isEn ? 'Food Allowance Before:' : 'Kuota Makanan Asal:'}</span>
                  <span style="font-weight:700;color:#fff">1,800 kcal</span>
                </div>
                <div class="row between" style="font-size:12px;margin-bottom:6px">
                  <span style="color:#38bdf8">${isEn ? 'Workout Burned (5km):' : 'Larian Terbakar (5km):'}</span>
                  <span style="font-weight:700;color:#38bdf8">+ 350 kcal</span>
                </div>
                <div class="row between" style="font-size:13px;padding-top:6px;border-top:1px dashed rgba(255,255,255,0.1)">
                  <span style="color:#34d399;font-weight:700">${isEn ? 'New Food Budget:' : 'Kuota Baharu Anda:'}</span>
                  <span style="font-weight:900;color:#34d399;font-size:16px" id="tut-sync-total">2,150 kcal</span>
                </div>
              </div>
              <button type="button" class="btn btn-primary btn-block" id="tut-sync-btn">
                <span>⚡ ${isEn ? 'Simulate Activity Sync' : 'Uji Segerak Aktiviti'}</span>
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
                total.style.transform = 'scale(1.15)';
                total.style.color = '#fbbf24';
                setTimeout(() => {
                  total.style.transform = 'scale(1)';
                  total.style.color = '#34d399';
                  btn.disabled = false;
                }, 300);
              }
            });
          },
        },
      ],
    },

    profile: {
      category: isEn ? 'Profile & Hero Coach' : 'Profil & Jurulatih',
      icon: icons.user,
      steps: [
        {
          tag: isEn ? 'Step 1: BMR & TDEE Calibration' : 'Langkah 1: Kalibrasi BMR & TDEE',
          title: isEn ? 'Scientifically Tailored To Your Body' : 'Kiraan Tepat Mengikut Tubuh Anda',
          desc: isEn
            ? 'Mifflin-St Jeor formula calculates your exact calorie targets based on your height, weight, age, and fitness goals.'
            : 'Formula saintifik mengira keperluan kalori harian berasaskan tinggi, berat, umur, dan matlamat badan anda.',
          renderWidget: () => `
            <div class="tutorial-widget-box" id="tut-widget-box">
              <div class="tutorial-widget-header">
                <span class="tutorial-widget-badge">⚡ ${isEn ? 'Fitness Goal Selector' : 'Pilihan Sasaran'}</span>
                <span class="tutorial-widget-tip">${isEn ? 'Live target recalibration' : 'Kiraan automatik'}</span>
              </div>
              <div class="row gap-2">
                <button type="button" class="t-demo-btn active" id="goal-fat" style="flex:1;border-color:#10b981;color:#34d399">🔥 ${isEn ? 'Fat Loss' : 'Bakar Lemak'}</button>
                <button type="button" class="t-demo-btn" id="goal-keep" style="flex:1">⚖️ ${isEn ? 'Maintain' : 'Kekal'}</button>
                <button type="button" class="t-demo-btn" id="goal-bulk" style="flex:1">💪 ${isEn ? 'Muscle' : 'Bina Otot'}</button>
              </div>
              <div style="background:rgba(0,0,0,0.35);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:10px 12px">
                <div class="row between" style="margin-bottom:4px">
                  <span class="xs muted">${isEn ? 'Daily Calorie Target' : 'Sasaran Kalori Harian'}</span>
                  <span style="font-size:16px;font-weight:900;color:#38bdf8" id="tut-goal-target">1,650 kcal</span>
                </div>
                <div class="xs muted" id="tut-goal-macro">Protein: 140g · Carbs: 160g · Fat: 45g</div>
              </div>
            </div>
          `,
          mount: (box) => {
            const targets = {
              fat: { kcal: '1,650 kcal', macros: isEn ? 'Deficit -500 kcal · High Protein (140g)' : 'Defisit -500 kcal · Tinggi Protein (140g)' },
              keep: { kcal: '2,150 kcal', macros: isEn ? 'Maintenance TDEE · Balanced Energy' : 'Kekal Berat TDEE · Nutrisi Seimbang' },
              bulk: { kcal: '2,450 kcal', macros: isEn ? 'Surplus +300 kcal · Hypertrophy Fuel' : 'Lebihan +300 kcal · Pembinaan Otot' },
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
          tag: isEn ? 'Step 2: Anime Voice Coach' : 'Langkah 2: Suara Jurulatih Anime',
          title: isEn ? 'Deku & Bakugou Japanese Dialogue' : 'Suara Asli Anime Deku & Bakugou',
          desc: isEn
            ? 'Choose between encouraging Deku or fierce Bakugou for genuine anime motivational energy in your workouts!'
            : 'Pilih antara Deku (penyokong setia) atau Bakugou (motivasi garang) untuk menyemarakkan disiplin kecergasan anda.',
          renderWidget: () => `
            <div class="tutorial-widget-box" id="tut-widget-box">
              <div class="tutorial-widget-header">
                <span class="tutorial-widget-badge">⚡ ${isEn ? 'Anime Audio' : 'Audio Anime Asli'}</span>
                <span class="tutorial-widget-tip">${isEn ? 'Japanese Voice' : 'Suara Jepun'}</span>
              </div>
              <div class="row gap-2">
                <button type="button" class="btn btn-secondary btn-block" id="tut-prof-deku" style="flex:1;border-color:rgba(16,185,129,0.4)">
                  <span>🥦 Deku</span>
                </button>
                <button type="button" class="btn btn-secondary btn-block" id="tut-prof-baku" style="flex:1;border-color:rgba(249,115,22,0.4)">
                  <span>💥 Bakugou</span>
                </button>
              </div>
              <div id="tut-prof-quote" style="background:rgba(0,0,0,0.35);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:8px 12px;font-size:11.5px">
                <div style="font-weight:700;color:#34d399" id="tut-prof-ja">大丈夫！(Daijoubu!)</div>
                <div class="xs muted" id="tut-prof-ms">"Jangan risau, mari capai matlamat kecergasan hari ini!"</div>
              </div>
            </div>
          `,
          mount: (box) => {
            box.querySelector('#tut-prof-deku')?.addEventListener('click', () => {
              box.querySelector('#tut-prof-ja').textContent = '大丈夫！(Daijoubu!)';
              box.querySelector('#tut-prof-ms').textContent = isEn ? '"Don’t worry, you’ve got this!"' : '"Jangan risau, mari capai sasaran hari ini!"';
              box.querySelector('#tut-prof-ja').style.color = '#34d399';
              soundboard.playSound('deku', 'greet');
            });

            box.querySelector('#tut-prof-baku')?.addEventListener('click', () => {
              box.querySelector('#tut-prof-ja').textContent = 'おいおいおい！(Oi oi oi!)';
              box.querySelector('#tut-prof-ms').textContent = isEn ? '"Hey! Break through your limits!"' : '"Pecahkan had batasan kau, jangan malas!"';
              box.querySelector('#tut-prof-ja').style.color = '#f97316';
              soundboard.playSound('bakugou', 'greet');
            });
          },
        },
        {
          tag: isEn ? 'Step 3: Offline Privacy & Language' : 'Langkah 3: Privasi Luar Talian & Bahasa',
          title: isEn ? 'Local-First Privacy & Bilingual App' : '100% Privasi Tempatan & Dwi-Bahasa',
          desc: isEn
            ? 'CalMal works completely offline with secure local device storage. Toggle between English and Bahasa Melayu anytime.'
            : 'CalMal beroperasi luar talian (local-first) tanpa menjual data anda. Tukar antara Bahasa Melayu dan English bila-bila masa.',
          renderWidget: () => `
            <div class="tutorial-widget-box" id="tut-widget-box">
              <div class="tutorial-widget-header">
                <span class="tutorial-widget-badge">⚡ ${isEn ? 'Local Storage' : 'Privasi Peranti'}</span>
                <span class="tutorial-widget-tip">${isEn ? 'Zero cloud tracking' : 'Bebas penjejakan'}</span>
              </div>
              <div style="display:flex;align-items:center;gap:10px;background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.25);border-radius:10px;padding:10px 12px">
                <div style="font-size:24px">🔒</div>
                <div>
                  <div style="font-weight:700;color:#34d399;font-size:12px">${isEn ? '100% Local-First Storage' : '100% Data Disimpan Dalam Peranti'}</div>
                  <div class="xs muted">${isEn ? 'Encrypted IndexedDB & offline PWA ready' : 'Storan selamat IndexedDB & sokongan PWA'}</div>
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
            <span style="width:14px;height:14px;display:inline-flex">${config.icon}</span>
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
  `);

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
        nextBtn.innerHTML = `<span>${isEn ? '✓ Got It' : '✓ Faham & Selesai'}</span>`;
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
            <span style="font-size:12px">✨</span>
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
    if (currentStep > 0) {
      soundboard.playUISound('nav');
      renderStep(currentStep - 1);
    }
  });

  // Skip Button Handler
  skipBtn?.addEventListener('click', () => {
    soundboard.playUISound('cancel');
    close();
  });

  // Click on segment progress bars
  progressBars.forEach((bar) => {
    bar.addEventListener('click', () => {
      const targetStep = parseInt(bar.dataset.step, 10);
      if (!isNaN(targetStep) && targetStep !== currentStep) {
        soundboard.playUISound('nav');
        renderStep(targetStep);
      }
    });
  });

  // Initial step render
  renderStep(0);
}
