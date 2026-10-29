// Offline meal ideas that fit the calories left today.
export function suggestFoods(remaining, foods = [], n = 3) {
  if (!(remaining >= 80)) return [];
  const min = remaining * 0.25;
  return foods
    .filter((f) => f.kcal >= min && f.kcal <= remaining)
    .sort((a, b) => (b.protein || 0) / b.kcal - (a.protein || 0) / a.kcal)
    .slice(0, n);
}
