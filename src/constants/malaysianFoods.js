// Malaysian Foods Database (Mamak, Melayu, Cina, India, Kuih-Muih & Minuman)
// Allows lightning-fast offline search and 1-tap quick logging

export const MALAYSIAN_FOODS = [
  // --- Nasi & Hidangan Utama ---
  { name: 'Nasi Lemak Biasa (Sambal, Telur Rebus, Timun, Ikan Bilis)', kcal: 390, protein: 9, carbs: 54, fat: 16, category: 'Nasi', weight_g: 230 },
  { name: 'Nasi Lemak Ayam Goreng Berempah', kcal: 660, protein: 32, carbs: 64, fat: 31, category: 'Nasi', weight_g: 400 },
  { name: 'Nasi Lemak Sambal Sotong', kcal: 540, protein: 22, carbs: 62, fat: 23, category: 'Nasi', weight_g: 350 },
  { name: 'Nasi Putih (1 Senduk / 1 Mangkuk)', kcal: 150, protein: 3, carbs: 33, fat: 0.5, category: 'Nasi', weight_g: 150 },
  { name: 'Nasi Goreng Kampung (Ikan Bilis & Kangkung)', kcal: 480, protein: 14, carbs: 68, fat: 18, category: 'Nasi', weight_g: 320 },
  { name: 'Nasi Goreng Ayam Kunyit', kcal: 580, protein: 29, carbs: 70, fat: 21, category: 'Nasi', weight_g: 380 },
  { name: 'Nasi Goreng USA (Daging Merah, Telur Mata)', kcal: 680, protein: 26, carbs: 76, fat: 31, category: 'Nasi', weight_g: 420 },
  { name: 'Nasi Goreng Cina (Vegetable & Telur)', kcal: 410, protein: 11, carbs: 62, fat: 14, category: 'Nasi', weight_g: 300 },
  { name: 'Nasi Kandar (Nasi + Ayam Goreng + Sayur Kubis + Kuah Campur)', kcal: 730, protein: 36, carbs: 80, fat: 30, category: 'Nasi', weight_g: 450 },
  { name: 'Nasi Biryani Ayam', kcal: 620, protein: 31, carbs: 74, fat: 23, category: 'Nasi', weight_g: 420 },
  { name: 'Nasi Ayam Hainan (Paha/Dada)', kcal: 520, protein: 28, carbs: 65, fat: 17, category: 'Nasi', weight_g: 380 },
  { name: 'Nasi Ayam Penyet (Sambal, Tempe, Tauhu, Ayam Goreng)', kcal: 710, protein: 38, carbs: 72, fat: 32, category: 'Nasi', weight_g: 450 },
  { name: 'Nasi Kerabu Ayam Percik', kcal: 560, protein: 34, carbs: 68, fat: 17, category: 'Nasi', weight_g: 400 },
  { name: 'Nasi Dagang Gulai Ikan Tongkol', kcal: 610, protein: 26, carbs: 76, fat: 23, category: 'Nasi', weight_g: 410 },

  // --- Mee, Bihun & Kuetiau ---
  { name: 'Mee Goreng Mamak', kcal: 530, protein: 16, carbs: 72, fat: 21, category: 'Mee', weight_g: 330 },
  { name: 'Char Kway Teow Kerang & Udang', kcal: 650, protein: 22, carbs: 76, fat: 29, category: 'Mee', weight_g: 350 },
  { name: 'Maggi Goreng Telur Mata', kcal: 510, protein: 14, carbs: 64, fat: 23, category: 'Mee', weight_g: 280 },
  { name: 'Bihun Sup Ayam & Sayur', kcal: 320, protein: 20, carbs: 48, fat: 6, category: 'Mee', weight_g: 400 },
  { name: 'Laksa Utara / Laksa Penang', kcal: 380, protein: 18, carbs: 56, fat: 8, category: 'Mee', weight_g: 420 },
  { name: 'Curry Laksa / Mee Kari', kcal: 590, protein: 21, carbs: 62, fat: 30, category: 'Mee', weight_g: 450 },
  { name: 'Mee Kolok Sarawak', kcal: 460, protein: 24, carbs: 54, fat: 16, category: 'Mee', weight_g: 320 },
  { name: 'Pan Mee Soup (Ikan Bilis & Pucuk Manis)', kcal: 390, protein: 21, carbs: 58, fat: 8, category: 'Mee', weight_g: 400 },

  // --- Roti & Sarapan Pagi ---
  { name: 'Roti Canai (1 Keping + Dhal)', kcal: 310, protein: 7, carbs: 44, fat: 12, category: 'Roti', weight_g: 130 },
  { name: 'Roti Telur (1 Keping + Dhal)', kcal: 410, protein: 13, carbs: 46, fat: 19, category: 'Roti', weight_g: 180 },
  { name: 'Roti Bom (Susu Manis)', kcal: 480, protein: 6, carbs: 58, fat: 25, category: 'Roti', weight_g: 150 },
  { name: 'Roti Naan Kosong (Bakar Tandoor)', kcal: 260, protein: 8, carbs: 48, fat: 4, category: 'Roti', weight_g: 120 },
  { name: 'Roti Naan Cheese', kcal: 420, protein: 18, carbs: 50, fat: 16, category: 'Roti', weight_g: 180 },
  { name: 'Tosai Biasa (Chutney & Sambar)', kcal: 180, protein: 5, carbs: 32, fat: 3.5, category: 'Roti', weight_g: 120 },
  { name: 'Telur Separuh Masak (2 Biji)', kcal: 140, protein: 12, carbs: 1, fat: 10, category: 'Sarapan', weight_g: 110 },
  { name: 'Telur Dadar (1 Biji)', kcal: 130, protein: 7, carbs: 1, fat: 11, category: 'Lauk', weight_g: 65 },
  { name: 'Roti Bakar Kaya Butter (Kopitiam)', kcal: 280, protein: 5, carbs: 38, fat: 12, category: 'Sarapan', weight_g: 110 },
  { name: 'Oatmeal / Bubur Oat (Air/Susu Rendah Lemak)', kcal: 150, protein: 6, carbs: 26, fat: 2.5, category: 'Sarapan', weight_g: 220 },

  // --- Lauk Pauk & Protein Sihat ---
  { name: 'Ayam Dada Panggang / Grilled Chicken Breast', kcal: 195, protein: 35, carbs: 0, fat: 5, category: 'Protein', weight_g: 160 },
  { name: 'Ayam Goreng Kunyit Panas', kcal: 290, protein: 26, carbs: 4, fat: 19, category: 'Protein', weight_g: 160 },
  { name: 'Ayam Percik Kelantan (1 Ketul)', kcal: 280, protein: 27, carbs: 10, fat: 14, category: 'Protein', weight_g: 170 },
  { name: 'Ayam Masak Merah (1 Ketul)', kcal: 270, protein: 24, carbs: 12, fat: 14, category: 'Protein', weight_g: 170 },
  { name: 'Ayam Rendang Daging/Ayam', kcal: 320, protein: 25, carbs: 8, fat: 21, category: 'Protein', weight_g: 180 },
  { name: 'Ikan Kembung Bakar Air Asam', kcal: 180, protein: 25, carbs: 3, fat: 7, category: 'Protein', weight_g: 150 },
  { name: 'Ikan Siakap Stim Limau & Halia', kcal: 190, protein: 30, carbs: 4, fat: 5, category: 'Protein', weight_g: 220 },
  { name: 'Sup Daging / Sup Ayam Kampung', kcal: 210, protein: 24, carbs: 6, fat: 9, category: 'Lauk', weight_g: 350 },
  { name: 'Sayur Kangkung Belacan', kcal: 120, protein: 4, carbs: 8, fat: 8, category: 'Sayur', weight_g: 140 },
  { name: 'Sayur Kobis Goreng Kunyit', kcal: 85, protein: 2, carbs: 7, fat: 5, category: 'Sayur', weight_g: 130 },
  { name: 'Tauhu Sumbat Kukus / Bakar', kcal: 140, protein: 9, carbs: 11, fat: 7, category: 'Protein', weight_g: 140 },
  { name: 'Tempe Goreng (3 Keping)', kcal: 160, protein: 11, carbs: 9, fat: 9, category: 'Protein', weight_g: 90 },

  // --- Minuman Tempatan ---
  { name: 'Kopi O Kosong (Tanpa Gula)', kcal: 5, protein: 0.3, carbs: 0.8, fat: 0.1, category: 'Minuman', weight_g: 220 },
  { name: 'Kopi O Kurang Manis', kcal: 45, protein: 0.4, carbs: 11, fat: 0.1, category: 'Minuman', weight_g: 220 },
  { name: 'Teh O Kosong / Green Tea Kosong', kcal: 2, protein: 0.1, carbs: 0.4, fat: 0, category: 'Minuman', weight_g: 220 },
  { name: 'Teh O Ais Limau Kurang Manis', kcal: 55, protein: 0.3, carbs: 14, fat: 0.1, category: 'Minuman', weight_g: 280 },
  { name: 'Teh Tarik Kurang Manis (Susu Kurang)', kcal: 115, protein: 3, carbs: 19, fat: 3.5, category: 'Minuman', weight_g: 240 },
  { name: 'Teh Tarik Biasa Mamak', kcal: 180, protein: 4, carbs: 29, fat: 5.5, category: 'Minuman', weight_g: 240 },
  { name: 'Milo Ais Kurang Manis', kcal: 140, protein: 4, carbs: 24, fat: 3.5, category: 'Minuman', weight_g: 260 },
  { name: 'Milo Kosong (Serbuk Sahaja)', kcal: 90, protein: 3, carbs: 16, fat: 1.5, category: 'Minuman', weight_g: 220 },
  { name: 'Air Kelapa Muda Segar (Tanpa Gula)', kcal: 45, protein: 0.5, carbs: 11, fat: 0.2, category: 'Minuman', weight_g: 250 },
  { name: 'Soya Bean Kurang Manis', kcal: 95, protein: 6, carbs: 13, fat: 2.2, category: 'Minuman', weight_g: 250 },

  // --- Kuih & Snek ---
  { name: 'Karipap Pusing Kentang (1 Biji)', kcal: 135, protein: 2, carbs: 16, fat: 7, category: 'Kuih', weight_g: 45 },
  { name: 'Pisang Goreng (1 Biji)', kcal: 140, protein: 1.5, carbs: 21, fat: 6, category: 'Kuih', weight_g: 65 },
  { name: 'Cucur Badak / Kuih Keria (1 Biji)', kcal: 125, protein: 1.8, carbs: 22, fat: 3.5, category: 'Kuih', weight_g: 50 },
  { name: 'Popiah Basah (1 Gulung)', kcal: 95, protein: 3.2, carbs: 15, fat: 2.5, category: 'Kuih', weight_g: 90 },
  { name: 'Buah Epal / Pisang Segar (1 Biji)', kcal: 85, protein: 0.5, carbs: 21, fat: 0.3, category: 'Snek Sihat', weight_g: 130 },
];

/** Search Malaysian foods by query */
export function searchMalaysianFoods(query = '') {
  const q = query.trim().toLowerCase();
  if (!q) return MALAYSIAN_FOODS.slice(0, 15);
  return MALAYSIAN_FOODS.filter(
    (f) => f.name.toLowerCase().includes(q) || f.category.toLowerCase().includes(q)
  );
}
