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
          <span class="eyebrow">AI Nutrition & Culinary Kitchen</span>
          <h1 class="page-title">Recipes & Meal Plans</h1>
        </div>
      </div>

      <!-- Segmented Tab -->
      <div class="segmented" id="recipe-tabs" style="margin-bottom:16px">
        <button type="button" data-t="recipe" class="${tab === 'recipe' ? 'active' : ''}">
          ${icons.chef}
          <span>Recipe Generator</span>
        </button>
        <button type="button" data-t="planner" class="${tab === 'planner' ? 'active' : ''}">
          ${icons.sparkles}
          <span>7-Day Plan</span>
        </button>
        <button type="button" data-t="saved" class="${tab === 'saved' ? 'active' : ''}">
          ${icons.bowl}
          <span>Saved (${store.state.recipes.length})</span>
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
            <span>Dietary Filter</span>
            <span class="xs muted">Halal / Health Focus</span>
          </div>
          <div class="chips" id="diet-chips">
            ${DIET_FILTERS.map((d) => `<button type="button" class="chip ${selectedDiet === d ? 'active' : ''}" data-d="${d}">${d}</button>`).join('')}
          </div>

          <div class="field" style="margin-top:4px">
            <label for="recipe-input">Your Request / Ingredients</label>
            <textarea class="textarea" id="recipe-input" placeholder="e.g. I have chicken breast, spinach and light coconut milk. Suggest a healthy, high-protein meal...">${esc(recipeTextRequest)}</textarea>
          </div>

          <div class="row between" style="align-items:center">
            <input type="file" id="recipe-img-file" accept="image/*" class="hidden" />
            <button type="button" class="btn btn-sm btn-ghost" id="btn-add-ing-img">
              ${icons.camera}
              <span>${ingredientImage ? 'Change Ingredient Photo' : 'Fridge / Ingredients Photo'}</span>
            </button>
            ${ingredientImage ? '<span class="badge ok">1 photo attached</span>' : ''}
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
            <span>${isGenerating ? 'Gemini is Crafting Recipe...' : 'Generate Recipe with AI'}</span>
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

        <!-- Nutrition Metrics -->
        <div class="equation">
          <div class="eq-cell">
            <span>Calories</span>
            <b class="num">${n.calories_kcal || 0}</b>
            <span class="xs muted">kcal</span>
          </div>
          <div class="eq-cell">
            <span>Protein</span>
            <b class="num">${round1(n.protein_g || 0)}</b>
            <span class="xs muted">g</span>
          </div>
          <div class="eq-cell">
            <span>Carbs / Fat</span>
            <b class="num">${round1(n.carbs_g || 0)}/${round1(n.fat_g || 0)}</b>
            <span class="xs muted">g</span>
          </div>
        </div>

        <div class="divider"></div>

        <div>
          <b class="small" style="text-transform:uppercase;letter-spacing:0.06em;color:var(--muted)">Ingredients:</b>
          <ul style="padding-left:20px;margin:8px 0;line-height:1.6;font-size:14px">
            ${(r.ingredients || []).map((ing) => `<li>${esc(ing)}</li>`).join('')}
          </ul>
        </div>

        <div>
          <b class="small" style="text-transform:uppercase;letter-spacing:0.06em;color:var(--muted)">Cooking Instructions:</b>
          <ol style="padding-left:20px;margin:8px 0;line-height:1.6;font-size:14px">
            ${(r.steps || []).map((st) => `<li>${esc(st)}</li>`).join('')}
          </ol>
        </div>

        ${r.tips ? `<div class="card flat" style="background:#0d0d0e;border:1px solid var(--border);padding:12px;font-size:13px"><b style="color:var(--deku)">Chef Tip:</b> ${esc(r.tips)}</div>` : ''}

        <div class="grid grid-2" style="margin-top:8px">
          <button type="button" class="btn btn-secondary" id="btn-save-recipe">
            ${icons.plus}
            <span>Save Recipe</span>
          </button>
          <button type="button" class="btn btn-primary" id="btn-log-recipe-meal">
            ${icons.check}
            <span>Log This Meal</span>
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
            <span class="eyebrow">Question ${currentStep + 1} of ${PLANNER_QUESTIONS.length}</span>
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
              <span>Previous</span>
            </button>
            ${
              currentStep === PLANNER_QUESTIONS.length - 1
                ? `<button type="button" class="btn btn-primary" id="btn-submit-planner" ${!mcqAnswers[q.id] || isGeneratingPlan ? 'disabled' : ''}>
                    ${isGeneratingPlan ? '<span class="spinner"></span>' : icons.sparkles}
                    <span>${isGeneratingPlan ? 'Generating 7-Day Plan...' : 'Generate 7-Day Plan'}</span>
                  </button>`
                : `<button type="button" class="btn btn-secondary btn-sm" id="btn-step-next" ${!mcqAnswers[q.id] ? 'disabled' : ''}>
                    <span>Next</span>
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
              <span class="eyebrow">7-Day Nutrition Plan</span>
              <h2 style="font-size:22px;font-weight:800">Complete Schedule</h2>
            </div>
            <div class="row" style="gap:6px">
              <button type="button" class="btn btn-sm btn-ghost" id="btn-print-plan" title="Print / Export PDF">
                ${icons.printer}
                <span>Print / PDF</span>
              </button>
              <button type="button" class="btn btn-sm btn-ghost" id="btn-reset-plan" title="Generate New Plan">
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
                   <b class="muted" style="text-transform:uppercase">Grocery Shopping Tips:</b>
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
            <span>Your Recipe Collection</span>
            <span class="muted">${list.length} recipes</span>
          </div>

          <div class="list">
            ${
              list.length === 0
                ? `<div class="empty">
                    ${icons.chef}
                    <p>No saved recipes yet.</p>
                    <span class="small muted">Generate healthy recipes in the "Recipe Generator" tab and save them here!</span>
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
                      <button class="btn btn-icon btn-ghost btn-sm view-saved-btn" data-id="${r.id}" title="View">
                        ${icons.chevronRight}
                      </button>
                      <button class="btn btn-icon btn-ghost btn-sm del-saved-btn" data-id="${r.id}" title="Delete" style="color:var(--danger)">
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
          toast('Failed to process image.', 'error');
        }
      });

      container.querySelector('#btn-remove-ing-img')?.addEventListener('click', () => {
        ingredientImage = null;
        render();
      });

      // Demo Recipe (no API key required)
      container.querySelector('#btn-demo-recipe')?.addEventListener('click', () => {
        currentRecipe = {
          title: 'Low-Fat Ginger Chicken Soup',
          description: 'A comforting, clear broth chicken soup infused with fresh ginger, lemongrass, and celery herbs — an optimal high-protein recovery meal.',
          prep_time_min: 10,
          cook_time_min: 20,
          servings: 1,
          ingredients: [
            '220g skinless chicken breast (diced)',
            '3cm fresh ginger root (thinly sliced)',
            '1 stalk lemongrass (bruised)',
            '2 cloves garlic & 1 shallot (sliced)',
            '1 small carrot (sliced)',
            '500ml water or low-sodium chicken stock',
            'Pinch of sea salt & crushed black pepper',
            'Fresh cilantro and scallions for garnish',
          ],
          steps: [
            '1. Sauté sliced garlic, shallots, and ginger with 1 tsp olive oil until fragrant.',
            '2. Add lemongrass and diced chicken breast; stir-fry until outer surface turns white.',
            '3. Pour in 500ml water and bring to a simmer over medium heat.',
            '4. Add sliced carrots and simmer gently for 10 minutes until tender.',
            '5. Season with a pinch of sea salt and freshly cracked black pepper.',
            '6. Remove from heat, garnish with fresh herbs, and serve hot.',
          ],
          nutrition: {
            calories_kcal: 380,
            protein_g: 48,
            carbs_g: 14,
            fat_g: 8,
          },
          tips: 'Ginger improves post-workout digestion and promotes rapid muscle recovery.',
        };
        toast('Demo recipe loaded!', 'success');
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
          toast(`Recipe ready: ${res.title}!`, 'success');
        } catch (err) {
          toast(err.message || 'Failed to generate recipe.', 'error');
        } finally {
          isGenerating = false;
          render();
        }
      });

      container.querySelector('#btn-save-recipe')?.addEventListener('click', () => {
        if (!currentRecipe) return;
        store.saveRecipe(currentRecipe);
        toast(`Recipe "${currentRecipe.title}" saved to collection!`, 'success');
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
        toast(`Meal "${currentRecipe.title}" logged for today!`, 'success');
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
          toast('7-day meal plan created successfully!', 'success');
        } catch (err) {
          toast(err.message || 'Failed to generate meal plan.', 'error');
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
