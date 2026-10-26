// Skrin Resipi & Pelan Makanan AI (Ciri Cal-AI asal dengan model Gemini 3.5 Flash Lite)
import { icons } from '../components/icons.js';
import { toast, setLoading } from '../components/ui.js';
import { generateRecipe, generateMealPlan } from '../services/gemini.js';
import { DIET_FILTERS, PLANNER_QUESTIONS } from '../constants/prompts.js';
import { compressImage, esc, round1 } from '../utils/helpers.js';
import { store } from '../services/store.js';

export function renderRecipes(container) {
  let tab = 'recipe'; // 'recipe' | 'planner' | 'saved'
  let selectedDiet = 'Halal';
  let recipeTextRequest = '';
  let ingredientImage = null;
  let currentRecipe = null;
  let isGenerating = false;

  // Meal Planner 10 MCQs state
  let currentStep = 0;
  let mcqAnswers = {};
  let currentMealPlan = store.state.mealPlan;
  let isGeneratingPlan = false;

  function render() {
    container.innerHTML = `
      <div class="page-head">
        <div>
          <span class="eyebrow">Dapur AI Malaysia</span>
          <h1 class="page-title">Resipi & Pelan Makan</h1>
        </div>
      </div>

      <!-- Segmented Tab -->
      <div class="segmented" id="recipe-tabs" style="margin-bottom:16px">
        <button type="button" data-t="recipe" class="${tab === 'recipe' ? 'active' : ''}">
          ${icons.chef}
          <span>Cipta Resipi</span>
        </button>
        <button type="button" data-t="planner" class="${tab === 'planner' ? 'active' : ''}">
          ${icons.sparkles}
          <span>Pelan 7 Hari</span>
        </button>
        <button type="button" data-t="saved" class="${tab === 'saved' ? 'active' : ''}">
          ${icons.bowl}
          <span>Tersimpan (${store.state.recipes.length})</span>
        </button>
      </div>


      ${tab === 'recipe' ? renderRecipeGenerator() : tab === 'planner' ? renderMealPlanner() : renderSavedRecipes()}
    `;

    bindEvents();
  }

  function renderRecipeGenerator() {
    return `
      <div class="stack">
        <div class="card stack">
          <div class="card-title">
            <span>Penapis Diet</span>
            <span class="xs muted">Wajib Halal</span>
          </div>
          <div class="chips" id="diet-chips">
            ${DIET_FILTERS.map((d) => `<button type="button" class="chip ${selectedDiet === d ? 'active' : ''}" data-d="${d}">${d}</button>`).join('')}
          </div>

          <div class="field" style="margin-top:4px">
            <label for="recipe-input">Permintaan / Bahan Anda</label>
            <textarea class="textarea" id="recipe-input" placeholder="cth. Saya ada dada ayam, bayam dan santan kotak. Cadangkan resipi sihat ala kampung...">${esc(recipeTextRequest)}</textarea>
          </div>

          <div class="row between" style="align-items:center">
            <input type="file" id="recipe-img-file" accept="image/*" class="hidden" />
            <button type="button" class="btn btn-sm btn-ghost" id="btn-add-ing-img">
              ${icons.camera}
              <span>${ingredientImage ? 'Tukar Gambar Bahan' : 'Gambar Peti Sejuk / Bahan'}</span>
            </button>
            ${ingredientImage ? '<span class="badge ok">1 gambar dipilih</span>' : ''}
          </div>

          ${
            ingredientImage
              ? `<div style="position:relative;width:100px;height:70px;border-radius:10px;overflow:hidden;border:1px solid var(--border)">
                  <img src="${ingredientImage.dataUrl}" style="width:100%;height:100%;object-fit:cover" />
                  <button type="button" id="btn-remove-ing-img" style="position:absolute;top:2px;right:2px;background:rgba(0,0,0,0.7);color:#fff;border:0;border-radius:50%;width:20px;height:20px;cursor:pointer">×</button>
                </div>`
              : ''
          }

          <button type="button" class="btn btn-primary btn-block" id="btn-gen-recipe" style="margin-top:6px" ${isGenerating ? 'disabled' : ''}>
            ${isGenerating ? '<span class="spinner"></span>' : icons.sparkles}
            <span>${isGenerating ? 'Gemini Sedang Memasak Resipi...' : 'Jana Resipi Bersama AI'}</span>
          </button>
        </div>

        ${currentRecipe ? renderRecipeCard(currentRecipe) : ''}
      </div>
    `;
  }

  function renderRecipeCard(r) {
    const n = r.nutrition || {};
    return `
      <div class="card stack fade-up" id="recipe-card">
        <div class="card-title row between">
          <div>
            <span class="eyebrow">${esc(selectedDiet)}</span>
            <h2 style="font-size:22px;font-weight:800">${esc(r.title)}</h2>
          </div>
          <span class="badge ok">${r.prep_time_min + r.cook_time_min} min</span>
        </div>

        <p class="small muted" style="line-height:1.45">${esc(r.description || '')}</p>

        <!-- Nutrisi Pie / Metrik -->
        <div class="equation">
          <div class="eq-cell">
            <span>Tenaga</span>
            <b class="num">${n.calories_kcal || 0}</b>
            <span class="xs muted">kcal</span>
          </div>
          <div class="eq-cell">
            <span>Protein</span>
            <b class="num">${round1(n.protein_g || 0)}</b>
            <span class="xs muted">g</span>
          </div>
          <div class="eq-cell">
            <span>Karbo / Lemak</span>
            <b class="num">${round1(n.carbs_g || 0)}/${round1(n.fat_g || 0)}</b>
            <span class="xs muted">g</span>
          </div>
        </div>

        <div class="divider"></div>

        <div>
          <b class="small" style="text-transform:uppercase;letter-spacing:0.06em;color:var(--muted)">Bahan-Bahan:</b>
          <ul style="padding-left:20px;margin:8px 0;line-height:1.6;font-size:14px">
            ${(r.ingredients || []).map((ing) => `<li>${esc(ing)}</li>`).join('')}
          </ul>
        </div>

        <div>
          <b class="small" style="text-transform:uppercase;letter-spacing:0.06em;color:var(--muted)">Langkah Memasak:</b>
          <ol style="padding-left:20px;margin:8px 0;line-height:1.6;font-size:14px">
            ${(r.steps || []).map((st) => `<li>${esc(st)}</li>`).join('')}
          </ol>
        </div>

        ${r.tips ? `<div class="card flat" style="background:#0d0d0e;border:1px solid var(--border);padding:12px;font-size:13px"><b style="color:var(--deku)">Tip Chef:</b> ${esc(r.tips)}</div>` : ''}

        <div class="grid grid-2" style="margin-top:8px">
          <button type="button" class="btn btn-secondary" id="btn-save-recipe">
            ${icons.plus}
            <span>Simpan Resipi</span>
          </button>
          <button type="button" class="btn btn-primary" id="btn-log-recipe-meal">
            ${icons.check}
            <span>Makan Hidangan Ini</span>
          </button>
        </div>
      </div>
    `;
  }

  function renderMealPlanner() {
    if (currentMealPlan && !isGeneratingPlan) {
      return renderMealPlanResult(currentMealPlan);
    }

    const q = PLANNER_QUESTIONS[currentStep];
    const pct = Math.round(((currentStep + 1) / PLANNER_QUESTIONS.length) * 100);

    return `
      <div class="stack">
        <div class="card stack">
          <div class="row between">
            <span class="eyebrow">Soalan ${currentStep + 1} daripada ${PLANNER_QUESTIONS.length}</span>
            <span class="small bold muted">${pct}%</span>
          </div>
          <div class="stepper-progress">
            <div class="stepper-bar" style="width:${pct}%"></div>
          </div>

          <h3 style="font-size:19px;font-weight:800;margin:4px 0 12px">${esc(q.q)}</h3>

          <div class="stack" style="gap:8px">
            ${q.options
              .map(
                (opt) => `
              <button type="button" class="mcq-option ${mcqAnswers[q.id] === opt ? 'selected' : ''}" data-ans="${opt}">
                <span>${esc(opt)}</span>
                ${mcqAnswers[q.id] === opt ? icons.check : ''}
              </button>`
              )
              .join('')}
          </div>

          <div class="row between" style="margin-top:14px">
            <button type="button" class="btn btn-ghost btn-sm" id="btn-step-prev" ${currentStep === 0 ? 'disabled' : ''}>
              ${icons.chevronLeft}
              <span>Sebelum</span>
            </button>
            ${
              currentStep === PLANNER_QUESTIONS.length - 1
                ? `<button type="button" class="btn btn-primary" id="btn-submit-planner" ${!mcqAnswers[q.id] || isGeneratingPlan ? 'disabled' : ''}>
                    ${isGeneratingPlan ? '<span class="spinner"></span>' : icons.sparkles}
                    <span>${isGeneratingPlan ? 'Menjana Pelan 7 Hari...' : 'Cipta Pelan 7 Hari'}</span>
                  </button>`
                : `<button type="button" class="btn btn-secondary btn-sm" id="btn-step-next" ${!mcqAnswers[q.id] ? 'disabled' : ''}>
                    <span>Seterusnya</span>
                    ${icons.chevronRight}
                  </button>`
            }
          </div>
        </div>
      </div>
    `;
  }

  function renderMealPlanResult(plan) {
    return `
      <div class="stack fade-up">
        <div class="card stack">
          <div class="card-title row between">
            <div>
              <span class="eyebrow">Pelan Makanan 7 Hari</span>
              <h2 style="font-size:22px;font-weight:800">Jadual Lengkap</h2>
            </div>
            <div class="row" style="gap:6px">
              <button type="button" class="btn btn-sm btn-ghost" id="btn-print-plan" title="Cetak / Eksport PDF">
                ${icons.printer}
                <span>Cetak / PDF</span>
              </button>
              <button type="button" class="btn btn-sm btn-ghost" id="btn-reset-plan" title="Jana Pelan Baru">
                ${icons.refresh}
              </button>
            </div>
          </div>

          <p class="small muted">${esc(plan.summary || '')}</p>

          <div class="stack" style="gap:12px;margin-top:6px">
            ${(plan.days || [])
              .map(
                (d) => `
              <div class="card flat" style="background:#0d0d0e;border:1px solid var(--border);padding:14px">
                <div class="row between" style="margin-bottom:8px">
                  <b style="font-size:15px;color:#fff">${esc(d.day)}</b>
                  <span class="badge ok">${d.total_kcal} kcal</span>
                </div>
                <div class="stack" style="gap:6px">
                  ${(d.meals || [])
                    .map(
                      (m) => `
                    <div class="row between small" style="padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.04)">
                      <span><b class="muted">${esc(m.type)}:</b> ${esc(m.name)}</span>
                      <span class="num">${m.kcal} kcal · ${m.protein_g}g P</span>
                    </div>`
                    )
                    .join('')}
                </div>
              </div>`
              )
              .join('')}
          </div>

          ${
            plan.shopping_tips && plan.shopping_tips.length
              ? `<div class="divider"></div>
                 <div class="small">
                   <b class="muted" style="text-transform:uppercase">Tip Pembelian Bahan:</b>
                   <ul style="padding-left:18px;margin:6px 0;line-height:1.5">
                     ${plan.shopping_tips.map((t) => `<li>${esc(t)}</li>`).join('')}
                   </ul>
                 </div>`
              : ''
          }
        </div>
      </div>
    `;
  }

  function renderSavedRecipes() {
    const list = store.state.recipes;
    return `
      <div class="stack">
        <div class="card">
          <div class="card-title">
            <span>Koleksi Resipi Anda</span>
            <span class="muted">${list.length} resipi</span>
          </div>

          <div class="list">
            ${
              list.length === 0
                ? `<div class="empty">
                    ${icons.chef}
                    <p>Belum ada resipi yang disimpan.</p>
                    <span class="small muted">Jana resipi sihat di tab "Cipta Resipi" dan simpan ke sini!</span>
                  </div>`
                : list
                    .map(
                      (r) => `
                  <div class="list-item" data-id="${r.id}">
                    <div class="thumb">${icons.chef}</div>
                    <div class="li-main">
                      <div class="li-title">${esc(r.title)}</div>
                      <div class="li-sub">
                        <span>${r.prep_time_min + r.cook_time_min} min</span> · 
                        <span>${r.nutrition?.calories_kcal || 0} kcal</span> · 
                        <span>${r.nutrition?.protein_g || 0}g protein</span>
                      </div>
                    </div>
                    <div class="row" style="gap:4px">
                      <button class="btn btn-icon btn-ghost btn-sm view-saved-btn" data-id="${r.id}" title="Lihat">
                        ${icons.chevronRight}
                      </button>
                      <button class="btn btn-icon btn-ghost btn-sm del-saved-btn" data-id="${r.id}" title="Padam" style="color:var(--danger)">
                        ${icons.trash}
                      </button>
                    </div>
                  </div>`
                    )
                    .join('')
            }
          </div>
        </div>
      </div>
    `;
  }

  function bindEvents() {
    container.querySelectorAll('#recipe-tabs button').forEach((b) => {
      b.addEventListener('click', () => {
        tab = b.dataset.t;
        render();
      });
    });

    if (tab === 'recipe') {
      container.querySelectorAll('#diet-chips button').forEach((c) => {
        c.addEventListener('click', () => {
          selectedDiet = c.dataset.d;
          render();
        });
      });

      container.querySelector('#recipe-input')?.addEventListener('input', (e) => {
        recipeTextRequest = e.target.value;
      });

      const imgInput = container.querySelector('#recipe-img-file');
      container.querySelector('#btn-add-ing-img')?.addEventListener('click', () => imgInput?.click());
      imgInput?.addEventListener('change', async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
          ingredientImage = await compressImage(file);
          render();
        } catch {
          toast('Gagal memproses gambar.', 'error');
        }
      });

      container.querySelector('#btn-remove-ing-img')?.addEventListener('click', () => {
        ingredientImage = null;
        render();
      });

      // Demo Resipi Tempatan (tanpa perlu API key)
      container.querySelector('#btn-demo-recipe')?.addEventListener('click', () => {
        currentRecipe = {
          title: 'Sup Ayam Halia Kampung Rendah Lemak',
          description: 'Sup ayam berkuah jernih dengan aroma halia tua, serai dan daun sup segar — hidangan pemulihan tenaga wira yang tinggi protein.',
          prep_time_min: 10,
          cook_time_min: 20,
          servings: 1,
          ingredients: [
            '220 g dada ayam tanpa kulit (dipotong dadu)',
            '3 cm halia tua (dihiris nipis)',
            '1 batang serai (diketuk)',
            '2 ulas bawang putih & 1 biji bawang merah (dihiris)',
            '1 biji lobak merah kecil (dipotong bulat)',
            '500 ml air atau stok ayam rendah garam',
            'Sedikit garam bukit & lada hitam tumbuk',
            'Daun sup dan bawang goreng untuk hiasan',
          ],
          steps: [
            '1. Tumis hirisan bawang putih, bawang merah dan halia dengan 1 sudu kecil minyak zaitun sehingga wangi.',
            '2. Masukkan serai dan ketulan dada ayam, kacau sehingga permukaan ayam bertukar putih.',
            '3. Tuangkan 500 ml air dan biarkan mendidih dengan api sederhana.',
            '4. Masukkan lobak merah dan renehkan selama 10 minit sehingga empuk.',
            '5. Perasakan dengan secubit garam bukit dan lada hitam.',
            '6. Angkat dan taburkan daun sup segar sebelum dihidangkan panas-panas.',
          ],
          nutrition: {
            calories_kcal: 380,
            protein_g: 48,
            carbs_g: 14,
            fat_g: 8,
          },
          tips: 'Gunakan halia bentong untuk aroma lebih pedas menyegarkan dan melancarkan pencernaan selepas bersenam.',
        };
        toast('Demo resipi dimuatkan!', 'success');
        render();
      });

      container.querySelector('#btn-gen-recipe')?.addEventListener('click', async () => {
        isGenerating = true;
        render();

        try {
          const res = await generateRecipe({
            request: recipeTextRequest,
            diet: selectedDiet,
            image: ingredientImage,
          });
          currentRecipe = res;
          toast(`Resipi siap: ${res.title}!`, 'success');
        } catch (err) {
          toast(err.message || 'Gagal menjana resipi.', 'error');
        } finally {
          isGenerating = false;
          render();
        }
      });

      container.querySelector('#btn-save-recipe')?.addEventListener('click', () => {
        if (!currentRecipe) return;
        store.saveRecipe(currentRecipe);
        toast(`Resipi "${currentRecipe.title}" disimpan ke koleksi!`, 'success');
      });

      container.querySelector('#btn-log-recipe-meal')?.addEventListener('click', () => {
        if (!currentRecipe) return;
        const n = currentRecipe.nutrition || {};
        store.addMeal({
          name: currentRecipe.title,
          kcal: n.calories_kcal || 500,
          protein: n.protein_g || 30,
          carbs: n.carbs_g || 50,
          fat: n.fat_g || 15,
          weight_g: 350,
        });
        toast(`Hidangan "${currentRecipe.title}" ditambah ke log hari ini!`, 'success');
      });
    }

    if (tab === 'planner') {
      container.querySelectorAll('.mcq-option').forEach((optBtn) => {
        optBtn.addEventListener('click', () => {
          const q = PLANNER_QUESTIONS[currentStep];
          mcqAnswers[q.id] = optBtn.dataset.ans;
          if (currentStep < PLANNER_QUESTIONS.length - 1) {
            currentStep++;
          }
          render();
        });
      });

      container.querySelector('#btn-step-prev')?.addEventListener('click', () => {
        if (currentStep > 0) currentStep--;
        render();
      });

      container.querySelector('#btn-step-next')?.addEventListener('click', () => {
        if (currentStep < PLANNER_QUESTIONS.length - 1) currentStep++;
        render();
      });

      container.querySelector('#btn-submit-planner')?.addEventListener('click', async () => {
        isGeneratingPlan = true;
        render();

        try {
          const res = await generateMealPlan({
            answers: mcqAnswers,
            diet: selectedDiet,
          });
          currentMealPlan = res;
          store.saveMealPlan(res);
          toast('Pelan makan 7 hari berjaya dicipta!', 'success');
        } catch (err) {
          toast(err.message || 'Gagal menjana pelan makan.', 'error');
        } finally {
          isGeneratingPlan = false;
          render();
        }
      });

      container.querySelector('#btn-print-plan')?.addEventListener('click', () => {
        window.print();
      });

      container.querySelector('#btn-reset-plan')?.addEventListener('click', () => {
        currentMealPlan = null;
        currentStep = 0;
        mcqAnswers = {};
        store.saveMealPlan(null);
        render();
      });
    }

    if (tab === 'saved') {
      container.querySelectorAll('.view-saved-btn').forEach((b) => {
        b.addEventListener('click', () => {
          const id = b.dataset.id;
          const r = store.state.recipes.find((x) => x.id === id);
          if (r) {
            currentRecipe = r;
            tab = 'recipe';
            render();
          }
        });
      });

      container.querySelectorAll('.del-saved-btn').forEach((b) => {
        b.addEventListener('click', () => {
          const id = b.dataset.id;
          store.deleteRecipe(id);
          render();
        });
      });
    }
  }

  render();
}
