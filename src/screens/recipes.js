// Skrin Resipi & Pelan Makanan AI CalMal
// Minimalist, Responsif, Sokong Paparan Ikut Hari & Ikut Waktu Makan, serta Preferences Dinamik
import { icons } from '../components/icons.js';
import { toast, openSheet } from '../components/ui.js';
import { generateRecipe, generateMealPlan } from '../services/gemini.js';
import { DIET_FILTERS, PLANNER_QUESTIONS } from '../constants/prompts.js';
import { compressImage, esc, round1 } from '../utils/helpers.js';
import { store } from '../services/store.js';
import { t, getLang, getDaysNames } from '../utils/i18n.js';

// Pool Menu Makanan Sihat Malaysia (Mengikut Waktu & Kategori Preferences)
// Minimalist, bersih, padat dan tepat mengikut makro & budaya tempatan
export const MALAYSIAN_MEAL_POOL = {
  breakfast: [
    { name: 'Roti Bakar & Telur Separuh Masak', desc: '2 telur separuh masak · Roti wholemeal · Kopi O kosong', kcal: 320, protein_g: 17, tags: ['protein', 'quick', 'budget', 'all'] },
    { name: 'Oatmeal Epal & Susu Rendah Lemak', desc: 'Rolled oat, hirisan epal merah & susu rendah lemak', kcal: 310, protein_g: 14, tags: ['oil', 'quick', 'budget', 'all'] },
    { name: 'Tosai Garing & Kuah Dhal', desc: 'Tosai panas kurang minyak, kuah dhal & chutney pudina', kcal: 260, protein_g: 9, tags: ['mamak', 'oil', 'budget', 'all'] },
    { name: 'Nasi Lemak Sihat Telur Rebus', desc: 'Nasi santan cair 1/2 cawan, sambal tumis renek & timun', kcal: 380, protein_g: 15, tags: ['melayu', 'budget', 'all'] },
    { name: 'Bihun Sup Ayam Dada Jernih', desc: 'Sup rempah jernih, dada ayam carik, taugeh & daun bawang', kcal: 330, protein_g: 24, tags: ['protein', 'oil', 'melayu', 'budget', 'all'] },
    { name: 'Roti Canai Kosong (1 Keping) & Dhal', desc: '1 keping garing & kuah dhal pekat berasingan', kcal: 310, protein_g: 9, tags: ['mamak', 'budget', 'all'] },
    { name: 'Scrambled Eggs & Roti Wholemeal', desc: '2 telur hancur lada hitam, tomato ceri & roti bakar wholemeal', kcal: 300, protein_g: 19, tags: ['protein', 'lowcarb', 'quick', 'all'] },
    { name: 'Telur Dadar Herba & Sup Cendawan', desc: 'Telur dadar 2 biji daun bawang & sup sayur bening cendawan', kcal: 250, protein_g: 16, tags: ['lowcarb', 'quick', 'oil', 'budget', 'all'] },
    { name: 'Naan Garlic & Dada Tandoori', desc: 'Naan bakar suku, dada ayam tandoori panggang & kuah dhal', kcal: 390, protein_g: 28, tags: ['mamak', 'budget', 'protein', 'all'] },
    { name: 'Greek Yogurt, Pisang & Madu', desc: 'Greek yogurt tinggi protein, pisang emas & biji chia', kcal: 240, protein_g: 15, tags: ['protein', 'quick', 'oil', 'all'] },
    { name: 'Lontong Sayur Lodeh Rendah Kalori', desc: 'Nasi impit, santan cair, tempe, tauhu, kobis & telur rebus', kcal: 360, protein_g: 16, tags: ['melayu', 'budget', 'all'] },
    { name: 'Soto Ayam & Nasi Impit Halus', desc: 'Sup ayam jernih berempah, ayam carik, taugeh & sambal kicap', kcal: 340, protein_g: 22, tags: ['melayu', 'oil', 'protein', 'budget', 'all'] },
    { name: 'Chee Cheong Fun Kukus & Sos Kicap Bijan', desc: 'Kuey teow gulung kukus, sengkuang, sos soya nipis & bijan', kcal: 270, protein_g: 8, tags: ['oil', 'quick', 'budget', 'all'] },
    { name: 'Bubur Ayam Halia & Daun Sup', desc: 'Bubur nasi lembut, hirisan dada ayam, halia muda & daun sup', kcal: 290, protein_g: 20, tags: ['oil', 'quick', 'budget', 'protein', 'all'] },
    { name: 'Lempeng Kelapa & Sambal Ikan Bilis', desc: 'Lempeng kelapa bakar tanpa minyak & sambal tumis bilis pedas', kcal: 310, protein_g: 11, tags: ['melayu', 'budget', 'quick', 'all'] },
    { name: 'Sandwich Telur Mayonis Rendah Lemak', desc: 'Telur rebus hancur, timun jepun, daun salad & roti mil penuh', kcal: 280, protein_g: 16, tags: ['quick', 'budget', 'protein', 'all'] },
    { name: 'Idli Kukus (2 Biji) & Kuah Sambhar', desc: 'Kek beras kukus India lembut, kuah dhal sayuran & pudina', kcal: 220, protein_g: 8, tags: ['mamak', 'oil', 'budget', 'quick', 'all'] },
    { name: 'Bihun Goreng Singapura Dada Ayam', desc: 'Bihun putih tumis bawang putih, hirisan dada ayam & kubis', kcal: 360, protein_g: 22, tags: ['protein', 'quick', 'budget', 'all'] },
    { name: 'Mee Hoon Tomyam Putih Jernih', desc: 'Bihun sup tomyam tanpa pes minyak, ayam, cendawan & serai', kcal: 320, protein_g: 21, tags: ['oil', 'quick', 'budget', 'protein', 'all'] },
    { name: 'Ubi Kayu Rebus & Sambal Ikan Bilis', desc: 'Ubi kayu empuk rebus garam bukit & sambal bilis kering pedas', kcal: 280, protein_g: 7, tags: ['melayu', 'budget', 'oil', 'all'] },
    { name: 'Roti Jala (3 Keping) & Kari Ayam', desc: 'Roti jala nipis & kuah kari dada ayam rempah pekat berkhasiat', kcal: 340, protein_g: 22, tags: ['melayu', 'protein', 'budget', 'all'] },
    { name: 'Overnight Oats Kurma & Badam', desc: 'Rolled oat rendaman susu rendah lemak, kurma & badam hiris', kcal: 290, protein_g: 13, tags: ['oil', 'quick', 'all'] },
  ],
  lunch: [
    { name: 'Ayam Masak Lemak Cili Api & Nasi', desc: 'Dada ayam tanpa kulit, kunyit hidup, santan cair, ulam & nasi separuh', kcal: 680, protein_g: 54, tags: ['melayu', 'protein', 'budget', 'all'] },
    { name: 'Sup Ayam Utara & Ulam Kampung', desc: 'Sup jernih dada ayam, timun segar, sambal belacan & nasi separuh', kcal: 620, protein_g: 52, tags: ['melayu', 'oil', 'protein', 'budget', 'all'] },
    { name: 'Ayam Bakar Madu & Ulam Raja', desc: 'Dada ayam bakar perap madu herba, ulam raja & nasi separuh', kcal: 640, protein_g: 52, tags: ['melayu', 'protein', 'oil', 'all'] },
    { name: 'Nasi Kerabu & Ayam Percik Kelantan', desc: 'Dada ayam percik bakar, ulam kerabu segar, telur masin suku & budu', kcal: 690, protein_g: 56, tags: ['melayu', 'protein', 'oil', 'budget', 'all'] },
    { name: 'Nasi Ayam Stim Hainan', desc: 'Dada ayam stim lembut, sup timun jernih, sos halia & nasi wangi', kcal: 590, protein_g: 46, tags: ['protein', 'oil', 'budget', 'quick', 'all'] },
    { name: 'Ikan Kembung Bakar Air Asam', desc: 'Ikan kembung bakar segar, bendi celur, air asam jawa & nasi separuh', kcal: 520, protein_g: 44, tags: ['melayu', 'oil', 'budget', 'protein', 'all'] },
    { name: 'Nasi Kandar Ayam Tandoori', desc: 'Dada tandoori panggang, bendi celur, kuah dhal pekat & nasi separuh', kcal: 650, protein_g: 54, tags: ['mamak', 'protein', 'budget', 'all'] },
    { name: 'Nasi Goreng Kampung Dada Ayam', desc: 'Kurang minyak, isi ayam kunyit, kangkung segar & cili padi', kcal: 620, protein_g: 42, tags: ['melayu', 'budget', 'quick', 'protein', 'all'] },
    { name: 'Sup Daging Empuk & Kentang', desc: 'Daging lembu lembut, lobak merah, daun sup & nasi separuh', kcal: 610, protein_g: 46, tags: ['melayu', 'protein', 'oil', 'budget', 'all'] },
    { name: 'Salad Ulam Ayam Panggang', desc: 'Dada ayam bakar rosemary, ulam pegaga, timun & sos air asam', kcal: 450, protein_g: 50, tags: ['lowcarb', 'protein', 'oil', 'quick', 'all'] },
    { name: 'Nasi Bujang Sihat Telur Mata & Sup', desc: 'Nasi separuh, 2 telur mata, sambal kicap cili & sup sayur bening', kcal: 490, protein_g: 22, tags: ['budget', 'quick', 'all'] },
    { name: 'Bihun Tomyam Putih Udang Segar', desc: 'Udang laut segar, cendawan tiram, serai & kuah tomyam jernih', kcal: 490, protein_g: 35, tags: ['oil', 'quick', 'budget', 'protein', 'all'] },
    { name: 'Asam Pedas Ikan Pari / Jenahak Melaka', desc: 'Kuah asam pedas pekat daun kesum, bendi, tomato & nasi separuh', kcal: 560, protein_g: 48, tags: ['melayu', 'oil', 'protein', 'budget', 'all'] },
    { name: 'Ikan Singgang Serai Halia Kelantan', desc: 'Ikan kembung rebus serai halia asam keping, ulam & sambal budu', kcal: 460, protein_g: 44, tags: ['melayu', 'oil', 'protein', 'budget', 'lowcarb', 'all'] },
    { name: 'Daging Salai Masak Lemak Pucuk Ubi', desc: 'Daging salai wangi, santan cair kurang lemak, pucuk ubi & nasi separuh', kcal: 660, protein_g: 48, tags: ['melayu', 'protein', 'all'] },
    { name: 'Ayam Goreng Berempah Air Fryer', desc: 'Dada ayam rempah ketumbar jintan garing tanpa minyak & sup sawi', kcal: 580, protein_g: 52, tags: ['melayu', 'protein', 'oil', 'budget', 'all'] },
    { name: 'Ikan Siakap Stim Limau & Halia', desc: 'Siakap stim serai limau nipis, cili api, bayam bening & nasi separuh', kcal: 510, protein_g: 48, tags: ['melayu', 'oil', 'protein', 'lowcarb', 'all'] },
    { name: 'Sambal Udang Petai Kurang Minyak', desc: 'Udang segar tumis sambal renek, petai rangup & kubis celur', kcal: 530, protein_g: 42, tags: ['melayu', 'protein', 'oil', 'all'] },
    { name: 'Mee Bandung Muar Daging Lembu', desc: 'Mee kuning kuah pes udang kering, daging empuk, sawi & telur mata', kcal: 610, protein_g: 44, tags: ['melayu', 'protein', 'budget', 'all'] },
    { name: 'Nasi Dagang Ikan Tongkol Terengganu', desc: 'Beras dagang kukus, gulai ikan tongkol santan sederhana & acar timun', kcal: 670, protein_g: 46, tags: ['melayu', 'protein', 'all'] },
    { name: 'Claypot Chicken Rice Sihat', desc: 'Nasi kukus dada ayam perap kicap cendawan, halia & sayur pak choy', kcal: 580, protein_g: 46, tags: ['protein', 'oil', 'budget', 'quick', 'all'] },
    { name: 'Pan Mee Sup Bayam & Ayam Cincang', desc: 'Mee sup buatan tangan, kuah ikan bilis jernih, bayam & isi ayam', kcal: 510, protein_g: 38, tags: ['oil', 'budget', 'quick', 'protein', 'all'] },
    { name: 'Ayam Masak Kurma & Lobak Merah', desc: 'Dada ayam kuah rempah kurma wangi, kentang rebus & sayur campur', kcal: 590, protein_g: 48, tags: ['melayu', 'protein', 'budget', 'all'] },
    { name: 'Ikan Keli Bakar Sambal Kicap Cili', desc: 'Ikan keli bakar garing, ulam timun, kubis segar & sambal kicap pedas', kcal: 530, protein_g: 42, tags: ['melayu', 'oil', 'budget', 'all'] },
    { name: 'Soto Daging Padang & Suun', desc: 'Sup daging jernih berempah, hirisan daging empuk, suun & daun sup', kcal: 520, protein_g: 42, tags: ['melayu', 'oil', 'protein', 'budget', 'all'] },
    { name: 'Nasi Tomato & Ayam Masak Merah Sihat', desc: 'Ayam panggang sos tomato rempah kurang minyak, acar nenas & nasi', kcal: 630, protein_g: 50, tags: ['melayu', 'protein', 'all'] },
  ],
  dinner: [
    { name: 'Mee Hoon Sup Ayam & Taugeh', desc: 'Sup jernih tanpa minyak, isi ayam dada carik, sawi & taugeh', kcal: 480, protein_g: 42, tags: ['melayu', 'oil', 'protein', 'budget', 'all'] },
    { name: 'Bihun Goreng Putih Kampung', desc: 'Bihun tumis bawang putih, ayam cincang, sayur sawi & cili potong', kcal: 530, protein_g: 40, tags: ['melayu', 'protein', 'budget', 'quick', 'all'] },
    { name: 'Ikan Siakap Bakar Sambal Petai', desc: 'Siakap bakar daun pisang, sambal petai kurang minyak & sup bayam', kcal: 490, protein_g: 48, tags: ['melayu', 'oil', 'protein', 'lowcarb', 'all'] },
    { name: 'Dada Ayam Panggang & Salad Jagung', desc: 'Dada ayam herba bakar, kentang bakar & salad jagung manis timun', kcal: 520, protein_g: 52, tags: ['protein', 'quick', 'budget', 'all'] },
    { name: 'Sup Tulang Daging Halia', desc: 'Sup daging empuk halia bara, sayur sawi bening & nasi separuh', kcal: 550, protein_g: 44, tags: ['melayu', 'protein', 'oil', 'budget', 'all'] },
    { name: 'Kuey Teow Kungfu Udang Segar', desc: 'Kuey teow kuah telur putih likat jernih, udang segar & brokoli', kcal: 490, protein_g: 36, tags: ['oil', 'quick', 'budget', 'protein', 'all'] },
    { name: 'Yong Tau Foo Sup Jernih Herba', desc: 'Tauhu kukus, bendi sumbat, peria, telur rebus & kangkung celur', kcal: 390, protein_g: 32, tags: ['oil', 'lowcarb', 'budget', 'quick', 'all'] },
    { name: 'Chapati (2 Keping) & Ayam Tandoori', desc: 'Chapati gandum asli tanpa minyak, kuah dhal & ayam tandoori', kcal: 550, protein_g: 46, tags: ['mamak', 'protein', 'oil', 'budget', 'all'] },
    { name: 'Sup Ayam Kampung & Keledek Manis', desc: 'Ayam kampung herba rebus, halia serai & keledek manis kukus', kcal: 470, protein_g: 42, tags: ['oil', 'melayu', 'protein', 'budget', 'all'] },
    { name: 'Wrap Tortilla Ayam Panggang', desc: 'Tortilla wholemeal, hirisan dada ayam bakar & sos yogurt timun', kcal: 450, protein_g: 40, tags: ['quick', 'protein', 'lowcarb', 'budget', 'all'] },
    { name: 'Sup Ikan Merah Tomato & Saderi', desc: 'Sup jernih isi ikan merah manis, tomato ceri & daun saderi', kcal: 430, protein_g: 45, tags: ['melayu', 'oil', 'protein', 'lowcarb', 'all'] },
    { name: 'Laksa Penang Asam Laksa Asli', desc: 'Kuah ikan kembung kisar asam gelugur, nenas, timun & daun pudina', kcal: 470, protein_g: 32, tags: ['oil', 'budget', 'all'] },
    { name: 'Tauhu Telur Kukus Sos Tiram Cendawan', desc: 'Tauhu telur kukus gebu, sos cendawan shiitake, isi ayam & brokoli', kcal: 410, protein_g: 34, tags: ['oil', 'lowcarb', 'quick', 'budget', 'protein', 'all'] },
    { name: 'Sup Ekor Lembu Wangi Berempah', desc: 'Sup jernih ekor lembut beraroma cengkih serai & nasi separuh', kcal: 540, protein_g: 44, tags: ['melayu', 'protein', 'oil', 'all'] },
    { name: 'Tomyam Poktek Jernih Makanan Laut', desc: 'Sup tomyam jernih limau nipis, udang laut, sotong & cendawan tiram', kcal: 440, protein_g: 40, tags: ['oil', 'quick', 'protein', 'all'] },
    { name: 'Kerabu Daging Bakar & Suun Ulam', desc: 'Daging lembu bakar hiris nipis, serai, daun kesum, limau & suun', kcal: 430, protein_g: 38, tags: ['melayu', 'oil', 'protein', 'lowcarb', 'all'] },
    { name: 'Ikan Bawal Emas Bakar Kunyit', desc: 'Bawal emas bakar kunyit garam bukit, air asam & bendi rebus', kcal: 480, protein_g: 46, tags: ['melayu', 'oil', 'protein', 'budget', 'all'] },
    { name: 'Mee Rebus Daging Kuah Keledek', desc: 'Mee kuning kuah keledek manis asli, hirisan daging empuk & tauhu', kcal: 530, protein_g: 38, tags: ['melayu', 'protein', 'budget', 'all'] },
    { name: 'Ayam Panggang Percik Putih Kelantan', desc: 'Dada ayam panggang serai, kuah percik santan cair & salad timun', kcal: 510, protein_g: 48, tags: ['melayu', 'protein', 'oil', 'all'] },
    { name: 'Sup Cendawan Tiram & Telur Drop', desc: 'Sup jernih telur hancur lembut, cendawan tiram, tauhu & sawi', kcal: 320, protein_g: 22, tags: ['oil', 'quick', 'lowcarb', 'budget', 'all'] },
    { name: 'Singgang Daging Pedas Asam Keping', desc: 'Daging lembu empuk kuah jernih pedas masam serai & nasi separuh', kcal: 480, protein_g: 42, tags: ['melayu', 'oil', 'protein', 'budget', 'all'] },
    { name: 'Bihun Kerabu Ulam Ikan Rebus', desc: 'Bihun gaul isi ikan kembung rebus, daun pegaga, kesum & kerisik', kcal: 440, protein_g: 32, tags: ['melayu', 'oil', 'budget', 'all'] },
    { name: 'Laksam Pantai Timur Kuah Ikan Jernih', desc: 'Gulungan mee beras kukus, kuah ikan rebus santan cair & ulaman', kcal: 460, protein_g: 30, tags: ['melayu', 'budget', 'all'] },
    { name: 'Sup Ketam Bunga Halia & Cendawan', desc: 'Ketam bunga manis segar, sup jernih halia bara & daun saderi', kcal: 380, protein_g: 36, tags: ['oil', 'protein', 'lowcarb', 'all'] },
  ],
  snack: [
    { name: 'Epal Hijau & Badam Panggang', desc: '1 biji epal hijau segar & 10 biji badam panggang tanpa garam', kcal: 170, protein_g: 5, tags: ['oil', 'quick', 'budget', 'all'] },
    { name: 'Pisang Emas & Air Kelapa Muda', desc: '2 biji pisang emas manis & air kelapa muda segar tanpa gula', kcal: 140, protein_g: 2, tags: ['quick', 'budget', 'oil', 'all'] },
    { name: 'Telur Rebus Kampung & Kopi O', desc: '1 biji telur rebus kampung & kopi o panas tanpa gula', kcal: 78, protein_g: 6.5, tags: ['protein', 'quick', 'lowcarb', 'budget', 'all'] },
    { name: 'Popiah Basah Sayur Segar', desc: '1 gulung popiah basah inti sengkuang, taugeh & sos kacang nipis', kcal: 120, protein_g: 4, tags: ['melayu', 'budget', 'all'] },
    { name: 'Greek Yogurt & Biji Chia', desc: 'Greek yogurt rendah lemak & taburan biji chia berkhasiat', kcal: 140, protein_g: 12, tags: ['protein', 'quick', 'lowcarb', 'all'] },
    { name: 'Tempe Bakar Sambal Kicap', desc: 'Kepingan tempe bakar garing & sambal kicap pedas', kcal: 160, protein_g: 12, tags: ['protein', 'budget', 'melayu', 'all'] },
    { name: 'Jagung Manis Rebus Panas', desc: '1 tongkol jagung manis rebus garam bukit tanpa mentega', kcal: 150, protein_g: 4.5, tags: ['oil', 'quick', 'budget', 'all'] },
    { name: 'Ubi Keledek Ungu Kukus', desc: 'Keledek ungu manis asli kukus empuk kaya antioksidan', kcal: 130, protein_g: 2.5, tags: ['oil', 'quick', 'budget', 'all'] },
    { name: 'Kacang Kuda Rebus Biji Sawi (Sundal)', desc: 'Kacang kuda rebus rempah daun kari & biji sawi gaya Mamak', kcal: 160, protein_g: 9, tags: ['mamak', 'protein', 'oil', 'budget', 'all'] },
    { name: 'Pau Ayam Kukus Gandum Penuh', desc: '1 biji pau kukus inti dada ayam cincang herba', kcal: 180, protein_g: 11, tags: ['protein', 'budget', 'all'] },
    { name: 'Tauhu Bakar Petis & Timun', desc: 'Kepingan tauhu bakar garing, hirisan timun, sengkuang & sos petis', kcal: 150, protein_g: 10, tags: ['melayu', 'protein', 'budget', 'all'] },
    { name: 'Pisang Tanduk Rebus Lembut', desc: 'Hirisan pisang tanduk rebus manis lembut mengenyangkan', kcal: 140, protein_g: 2, tags: ['melayu', 'oil', 'budget', 'all'] },
    { name: 'Rojak Buah Segar Kuah Petis Nipis', desc: 'Tembikai, nenas, timun & sengkuang dengan kuah rojak nipis', kcal: 130, protein_g: 2, tags: ['oil', 'quick', 'budget', 'all'] },
    { name: 'Edamame Rebus Garam Laut', desc: 'Kacang soya muda rebus tinggi serat dan protein sayuran', kcal: 120, protein_g: 11, tags: ['protein', 'oil', 'quick', 'lowcarb', 'all'] },
  ],
};

export function getPreferences() {
  return [
    { id: 'all', label: t('pref_all') },
    { id: 'protein', label: t('pref_protein') },
    { id: 'oil', label: t('pref_oil') },
    { id: 'budget', label: t('pref_budget') },
    { id: 'quick', label: t('pref_quick') },
    { id: 'lowcarb', label: t('pref_lowcarb') },
    { id: 'melayu', label: t('pref_melayu') },
    { id: 'mamak', label: t('pref_mamak') },
  ];
}

export const PREFERENCES = [
  { id: 'all', label: 'All Suggestions' },
  { id: 'protein', label: 'High Protein' },
  { id: 'oil', label: 'Less Oil / Soup' },
  { id: 'budget', label: 'Budget (< RM10)' },
  { id: 'quick', label: 'Quick (< 15m)' },
  { id: 'lowcarb', label: 'Low Carb' },
  { id: 'melayu', label: 'Malay Traditional' },
  { id: 'mamak', label: 'Healthy Mamak' },
];

export function getMealTypeInfo(type = '') {
  const isEn = getLang() === 'en';
  const str = (type || '').toLowerCase();
  if (str.includes('sarapan') || str.includes('breakfast')) {
    return { id: 'breakfast', label: isEn ? 'Breakfast' : 'Sarapan', colorClass: 'breakfast' };
  }
  if (str.includes('tengah hari') || str.includes('lunch') || str.includes('siang')) {
    return { id: 'lunch', label: isEn ? 'Lunch' : 'Tengah Hari', colorClass: 'lunch' };
  }
  if (str.includes('malam') || str.includes('dinner')) {
    return { id: 'dinner', label: isEn ? 'Dinner' : 'Malam', colorClass: 'dinner' };
  }
  if (str.includes('snek') || str.includes('snack') || str.includes('petang') || str.includes('afternoon')) {
    return { id: 'snack', label: isEn ? 'Snack' : 'Snek', colorClass: 'snack' };
  }
  return { id: 'other', label: type || (isEn ? 'Meal' : 'Hidangan'), colorClass: 'other' };
}

export function getNormalizedDayName(day = '') {
  const d = String(day).trim();
  const lower = d.toLowerCase();
  const isEn = getLang() === 'en';
  if (lower.startsWith('mon') || lower === 'isnin') return isEn ? 'Monday' : 'Isnin';
  if (lower.startsWith('tue') || lower === 'selasa') return isEn ? 'Tuesday' : 'Selasa';
  if (lower.startsWith('wed') || lower === 'rabu') return isEn ? 'Wednesday' : 'Rabu';
  if (lower.startsWith('thu') || lower === 'khamis') return isEn ? 'Thursday' : 'Khamis';
  if (lower.startsWith('fri') || lower === 'jumaat') return isEn ? 'Friday' : 'Jumaat';
  if (lower.startsWith('sat') || lower === 'sabtu') return isEn ? 'Saturday' : 'Sabtu';
  if (lower.startsWith('sun') || lower === 'ahad') return isEn ? 'Sunday' : 'Ahad';
  return d;
}

export function generateSmartPlan(pref = 'all', targetKcal = 1800, mealCount = 2, options = {}) {
  const { randomize = true } = options;
  const isEn = getLang() === 'en';
  const daysName = getDaysNames();

  function shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function getPool(category) {
    const list = MALAYSIAN_MEAL_POOL[category] || MALAYSIAN_MEAL_POOL.lunch;
    const filtered = pref !== 'all' ? list.filter((m) => m.tags && m.tags.includes(pref)) : list;
    const base = filtered.length >= 2 ? filtered : list;
    return randomize ? shuffle(base) : base;
  }

  const breakfastPool = getPool('breakfast');
  const lunchPool = getPool('lunch');
  const dinnerPool = getPool('dinner');
  const snackPool = getPool('snack');

  const days = daysName.map((day, idx) => {
    let rawMeals = [];
    const bType = isEn ? 'Breakfast' : 'Sarapan';
    const lType = isEn ? 'Lunch' : 'Makan Tengah Hari';
    const dType = isEn ? 'Dinner' : 'Makan Malam';
    const sType = isEn ? 'Snack' : 'Snek';

    const bDish = breakfastPool[idx % breakfastPool.length];
    const lDish = lunchPool[idx % lunchPool.length];
    const dDish = dinnerPool[idx % dinnerPool.length];
    const sDish = snackPool[idx % snackPool.length];

    if (mealCount === 2) {
      rawMeals = [
        { type: lType, dish: lDish },
        { type: dType, dish: dDish },
      ];
    } else if (mealCount === 3) {
      rawMeals = [
        { type: bType, dish: bDish },
        { type: lType, dish: lDish },
        { type: dType, dish: dDish },
      ];
    } else {
      rawMeals = [
        { type: bType, dish: bDish },
        { type: lType, dish: lDish },
        { type: sType, dish: sDish },
        { type: dType, dish: dDish },
      ];
    }

    // Accurately calibrate calories to align with targetKcal
    const baseSum = rawMeals.reduce((sum, item) => sum + (Number(item.dish.kcal) || 500), 0);
    const ratio = baseSum > 0 ? targetKcal / baseSum : 1;

    let allocatedKcal = 0;
    const meals = rawMeals.map((item, mIdx) => {
      const isLast = mIdx === rawMeals.length - 1;
      let mealKcal;
      if (isLast) {
        mealKcal = Math.max(100, targetKcal - allocatedKcal);
      } else {
        mealKcal = Math.round(item.dish.kcal * ratio);
        allocatedKcal += mealKcal;
      }
      const mealProtein = Math.round(item.dish.protein_g * ratio);

      return {
        type: item.type,
        name: item.dish.name,
        desc: item.dish.desc || '',
        kcal: mealKcal,
        protein_g: mealProtein,
      };
    });

    const total_kcal = meals.reduce((sum, m) => sum + (Number(m.kcal) || 0), 0);
    return { day, total_kcal, meals };
  });

  const prefLabel = getPreferences().find((p) => p.id === pref)?.label || (isEn ? 'Balanced' : 'Seimbang');
  return {
    summary: isEn
      ? `7-Day Malaysian style meal plan aligned with ~${targetKcal} kcal daily target focusing on: ${prefLabel}.`
      : `Pelan 7-Hari gaya Malaysia diselaraskan mengikut sasaran ~${targetKcal} kcal sehari dengan fokus: ${prefLabel}.`,
    days,
    preference: pref,
    shopping_tips: getShoppingTips(),
  };
}

export function getShoppingTips() {
  const isEn = getLang() === 'en';
  return isEn
    ? [
        'Buy fresh chicken breast, lean cuts, and local fish (sea bass / mackerel) at morning markets for freshness and best value.',
        'Incorporate local fresh herbs and greens like pegaga, ulam raja, cucumbers, and okra for micronutrients and satiety.',
        'Moderate rich gravies and highlight turmeric, ginger, lemongrass, and chili for bold Malaysian flavor without excess calories.',
        'Choose wholemeal bread, whole rolled oats, or half portions of white rice to keep daily carbohydrate spikes controlled.',
        'Drink plain warm water or sugar-free Chinese tea / Teh O Kosong instead of sweetened condensed milk beverages.',
      ]
    : [
        'Beli dada ayam segar, daging tanpa lemak, dan ikan tempatan (siakap / kembung) di pasar pagi untuk kualiti segar dan harga jimat.',
        'Amalkan ulam-ulaman segar tempatan seperti pegaga, timun, bendi dan raja untuk mikronutrien serta serat kenyang.',
        'Kawal santan dan lebihkan herba rempah ratus seperti kunyit, halia, serai dan cili untuk rasa sedap tanpa kalori tersembunyi.',
        'Pilih roti mil gandum penuh, oat, atau kurangkan nasi putih kepada separuh hidangan untuk kawal lonjakan gula darah.',
        'Amalkan air kosong atau teh cina / teh o kosong tanpa gula berbanding minuman susu pekat manis.',
      ];
}

export function triggerPrintMealPlan(plan) {
  if (!plan) return;
  const isEn = getLang() === 'en';
  const targetKcal = plan.days?.[0]?.total_kcal || store.macros?.target || 1800;
  const prefLabel = getPreferences().find((p) => p.id === plan.preference)?.label || (isEn ? 'Balanced' : 'Seimbang');
  const tips = getShoppingTips();

  const printableHtml = `<!DOCTYPE html>
<html lang="${isEn ? 'en' : 'ms'}">
<head>
  <meta charset="utf-8">
  <title>CalMal - 7-Day Malaysian Meal Plan</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 14mm 12mm 14mm;
    }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #111827;
      background: #ffffff;
      margin: 0;
      padding: 0;
      font-size: 10pt;
      line-height: 1.4;
    }
    .print-header {
      border-bottom: 2.5px solid #059669;
      padding-bottom: 8px;
      margin-bottom: 12px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .print-brand {
      font-size: 20pt;
      font-weight: 800;
      color: #065f46;
      letter-spacing: -0.5px;
      margin: 0;
      line-height: 1;
    }
    .print-brand small {
      font-size: 10pt;
      font-weight: 600;
      color: #10b981;
      margin-left: 6px;
    }
    .print-sub {
      font-size: 9.5pt;
      color: #4b5563;
      margin: 3px 0 0;
    }
    .print-meta-badge {
      text-align: right;
      font-size: 9pt;
      color: #6b7280;
    }
    .print-meta-badge b {
      color: #111827;
    }
    .print-days-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
    }
    .print-day-card {
      border: 1px solid #d1d5db;
      border-radius: 6px;
      padding: 7px 9px;
      background: #f9fafb;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .print-day-title {
      font-size: 10.5pt;
      font-weight: 800;
      color: #111827;
      display: flex;
      justify-content: space-between;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 3px;
      margin-bottom: 5px;
    }
    .print-day-title span.totals {
      font-size: 8.5pt;
      font-weight: 700;
      color: #047857;
    }
    .print-meal-item {
      margin-bottom: 4px;
      font-size: 9pt;
      line-height: 1.35;
    }
    .print-meal-item:last-child {
      margin-bottom: 0;
    }
    .print-meal-type {
      font-weight: 700;
      color: #374151;
      font-size: 8pt;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      margin-right: 4px;
    }
    .print-meal-name {
      font-weight: 600;
      color: #111827;
    }
    .print-meal-meta {
      font-size: 8pt;
      color: #6b7280;
      margin-left: 4px;
    }
    .print-meal-desc {
      font-size: 8pt;
      color: #6b7280;
      margin-left: 2px;
      display: block;
    }
    .print-tips-section {
      margin-top: 10px;
      border-top: 1.5px dashed #cbd5e1;
      padding-top: 8px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .print-tips-title {
      font-size: 9.5pt;
      font-weight: 700;
      color: #1e293b;
      margin: 0 0 4px;
    }
    .print-tips-list {
      margin: 0;
      padding-left: 16px;
      font-size: 8pt;
      color: #475569;
      line-height: 1.4;
    }
    .print-tips-list li {
      margin-bottom: 2px;
    }
    .print-footer {
      margin-top: 10px;
      border-top: 1px solid #e2e8f0;
      padding-top: 4px;
      text-align: center;
      font-size: 7.5pt;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div class="print-header">
    <div>
      <div class="print-brand">CalMal <small>AI Nutrition</small></div>
      <div class="print-sub">${esc(plan.summary || (isEn ? `7-Day Malaysian Meal Plan (~${targetKcal} kcal/day)` : `Pelan Makanan 7-Hari Malaysia (~${targetKcal} kcal/hari)`))}</div>
    </div>
    <div class="print-meta-badge">
      <div><b>${isEn ? 'Diet Focus:' : 'Fokus Diet:'}</b> ${esc(prefLabel)}</div>
      <div><b>${isEn ? 'Date:' : 'Tarikh:'}</b> ${new Date().toLocaleDateString(isEn ? 'en-MY' : 'ms-MY')}</div>
    </div>
  </div>

  <div class="print-days-grid">
    ${(plan.days || []).map((day) => {
      const dayName = getNormalizedDayName(day.day);
      const dayKcal = (day.meals || []).reduce((sum, m) => sum + (Number(m.kcal) || 0), 0);
      const dayProtein = (day.meals || []).reduce((sum, m) => sum + (Number(m.protein_g) || 0), 0);
      return `
        <div class="print-day-card">
          <div class="print-day-title">
            <span>${esc(dayName)}</span>
            <span class="totals">${dayKcal} kcal · ${dayProtein}g P</span>
          </div>
          ${(day.meals || []).map((m) => `
            <div class="print-meal-item">
              <span class="print-meal-type">${esc(m.type)}:</span>
              <span class="print-meal-name">${esc(m.name)}</span>
              <span class="print-meal-meta">(${m.kcal} kcal, ${m.protein_g}g P)</span>
              ${m.desc ? `<span class="print-meal-desc">${esc(m.desc)}</span>` : ''}
            </div>
          `).join('')}
        </div>
      `;
    }).join('')}
  </div>

  <div class="print-tips-section">
    <div class="print-tips-title">${isEn ? '🛒 Wet Market & Healthy Cooking Guidelines (Malaysia):' : '🛒 Panduan Pasar & Penyediaan Makanan Seimbang (Malaysia):'}</div>
    <ol class="print-tips-list">
      ${tips.map((t) => `<li>${esc(t)}</li>`).join('')}
    </ol>
  </div>

  <div class="print-footer">
    CalMal — Smart AI Nutrition & Calorie Tracking System · Sesuai Dicetak A4 & Simpanan PDF
  </div>
</body>
</html>`;

  let iframe = document.getElementById('calmal-print-frame');
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'calmal-print-frame';
    iframe.setAttribute('style', 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none;z-index:-1;');
    document.body.appendChild(iframe);
  }

  const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
  iframeDoc.open();
  iframeDoc.write(printableHtml);
  iframeDoc.close();

  setTimeout(() => {
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch {
      window.print();
    }
  }, 250);
}

function fallbackCopyText(text) {
  const isEn = getLang() === 'en';
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    toast(isEn ? '7-Day schedule copied to clipboard!' : 'Jadual 7-Hari disalin! Sedia untuk paste di WhatsApp/Notes.', 'success');
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([15, 30]);
  } catch {
    toast(isEn ? 'Could not copy to clipboard.' : 'Gagal menyalin ke papan keratan.', 'error');
  }
}

export function copyPlanToClipboard(plan) {
  if (!plan) return;
  const isEn = getLang() === 'en';
  const targetKcal = plan.days?.[0]?.total_kcal || store.macros?.target || 1800;
  const prefLabel = getPreferences().find((p) => p.id === plan.preference)?.label || (isEn ? 'Balanced' : 'Seimbang');
  const tips = getShoppingTips();

  let text = `🥗 *CALMAL — ${isEn ? '7-DAY MALAYSIAN MEAL PLAN' : 'PELAN MAKANAN 7-HARI MALAYSIA'}*\n`;
  text += `🎯 *${isEn ? 'Daily Target' : 'Sasaran Harian'}:* ~${targetKcal} kcal/hari\n`;
  text += `📌 *${isEn ? 'Diet Focus' : 'Keutamaan Diet'}:* ${prefLabel}\n`;
  text += `───────────────────────\n\n`;

  (plan.days || []).forEach((day) => {
    const dayName = getNormalizedDayName(day.day).toUpperCase();
    const dayKcal = (day.meals || []).reduce((sum, m) => sum + (Number(m.kcal) || 0), 0);
    const dayProtein = (day.meals || []).reduce((sum, m) => sum + (Number(m.protein_g) || 0), 0);

    text += `📅 *${dayName}* (~${dayKcal} kcal · ${dayProtein}g Protein)\n`;
    (day.meals || []).forEach((m) => {
      text += `• *${m.type}*: ${m.name} (${m.kcal} kcal, ${m.protein_g}g P)\n`;
    });
    text += `\n`;
  });

  text += `───────────────────────\n`;
  text += `🛒 *${isEn ? 'Market & Nutrition Tips:' : 'Tips Pasar & Nutrisi CalMal:'}*\n`;
  tips.slice(0, 3).forEach((tip, idx) => {
    text += `${idx + 1}. ${tip}\n`;
  });
  text += `\n✨ *${isEn ? 'Generated with CalMal Nutrition App' : 'Dijana secara pintar dengan CalMal Nutrition App'}*`;

  if (navigator?.clipboard?.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      toast(isEn ? '7-Day schedule copied to clipboard!' : 'Jadual 7-Hari disalin! Sedia untuk paste di WhatsApp/Notes.', 'success');
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([15, 30]);
    }).catch(() => {
      fallbackCopyText(text);
    });
  } else {
    fallbackCopyText(text);
  }
}

export function openPrintModal(plan) {
  if (!plan) return;
  const isEn = getLang() === 'en';
  const targetKcal = plan.days?.[0]?.total_kcal || store.macros?.target || 1800;
  const prefLabel = getPreferences().find((p) => p.id === plan.preference)?.label || (isEn ? 'Balanced' : 'Seimbang');

  const { el, close } = openSheet(`
    <div class="print-modal-sheet">
      <div class="row between" style="align-items:flex-start;margin-bottom:4px">
        <div style="flex:1;padding-right:12px">
          <div class="row" style="gap:6px;align-items:center;margin-bottom:4px">
            <span class="badge ok">${isEn ? 'A4 Printable' : 'Dokumen A4'}</span>
            <span class="xs muted">${isEn ? 'Print / Export Schedule' : 'Cetak & Simpan Jadual'}</span>
          </div>
          <h3 style="font-size:18px;font-weight:800;color:#fff;margin:0;line-height:1.3">
            ${isEn ? 'Print & Export 7-Day Plan' : 'Cetak & Eksport Pelan 7-Hari'}
          </h3>
          <p class="xs muted" style="margin:4px 0 0;line-height:1.4">
            ${isEn ? `Ready for A4 PDF export, printer connection, or 1-tap WhatsApp schedule copy (~${targetKcal} kcal/day).` : `Sedia untuk cetakan A4 / simpanan PDF, atau salin jadual mingguan untuk WhatsApp & Notes (~${targetKcal} kcal/hari).`}
          </p>
        </div>
        <button type="button" class="btn btn-icon btn-ghost btn-sm" data-close aria-label="${t('close')}">
          ${icons.close}
        </button>
      </div>

      <!-- Clean A4 Document Preview Card -->
      <div class="print-preview-container">
        <div class="printable-schedule-doc">
          <div style="display:flex;justify-content:space-between;align-items:baseline;border-bottom:2px solid #059669;padding-bottom:6px;margin-bottom:8px">
            <h2 style="font-size:15px;font-weight:800;color:#065f46;margin:0">CalMal · 7-Day Plan</h2>
            <span style="font-size:10.5px;font-weight:700;color:#047857">~${targetKcal} kcal/day · ${esc(prefLabel)}</span>
          </div>
          <div style="font-size:10px;color:#4b5563;margin-bottom:10px;line-height:1.4">
            ${esc(plan.summary || '')}
          </div>

          <div style="display:flex;flex-direction:column;gap:8px">
            ${(plan.days || []).map((day) => {
              const dayName = getNormalizedDayName(day.day);
              const dayKcal = (day.meals || []).reduce((sum, m) => sum + (Number(m.kcal) || 0), 0);
              const dayProtein = (day.meals || []).reduce((sum, m) => sum + (Number(m.protein_g) || 0), 0);
              return `
                <div class="printable-day-block">
                  <div class="printable-day-title">
                    <span>${esc(dayName)}</span>
                    <span style="font-size:10px;font-weight:700;color:#059669">${dayKcal} kcal · ${dayProtein}g protein</span>
                  </div>
                  ${(day.meals || []).map((m) => `
                    <div class="printable-meal-row">
                      <span><b class="printable-meal-tag">${esc(m.type)}:</b> ${esc(m.name)}</span>
                      <span class="printable-meal-nums">${m.kcal} kcal, ${m.protein_g}g P</span>
                    </div>
                  `).join('')}
                </div>
              `;
            }).join('')}
          </div>

          <div class="printable-tips-box">
            <b>${isEn ? 'Malaysian Market Tips:' : 'Tips Pasar CalMal:'}</b>
            <div style="margin-top:2px;font-size:10px;color:#4b5563">${esc(getShoppingTips()[0])}</div>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="grid grid-2" style="gap:10px;margin-top:4px">
        <button type="button" class="btn btn-primary" id="btn-modal-do-print">
          ${icons.printer}
          <span>${isEn ? 'Print / PDF (A4)' : 'Cetak / Simpan PDF'}</span>
        </button>
        <button type="button" class="btn btn-secondary" id="btn-modal-copy-text">
          ${icons.copy}
          <span>${isEn ? 'Copy (WhatsApp)' : 'Salin (WhatsApp)'}</span>
        </button>
      </div>

      <button type="button" class="btn btn-ghost btn-block btn-sm" data-close style="margin-top:2px">
        <span>${t('close')}</span>
      </button>
    </div>
  `);

  el.querySelector('#btn-modal-do-print')?.addEventListener('click', () => {
    triggerPrintMealPlan(plan);
    toast(isEn ? 'Print dialog opened. Select "Save as PDF" to save.' : 'Dialog cetakan dibuka. Pilih "Simpan sebagai PDF" jika mahu simpan fail.', 'info');
  });

  el.querySelector('#btn-modal-copy-text')?.addEventListener('click', () => {
    copyPlanToClipboard(plan);
  });
}

export function openMarketGuideModal() {
  const isEn = getLang() === 'en';

  const topics = [
    {
      id: 'protein',
      icon: '🥩',
      pill: isEn ? '🥩 Fresh Proteins' : '🥩 Protein Segar',
      badge: isEn ? 'Morning Market · Save ~30%' : 'Pasar Pagi · Jimat ~30%',
      title: isEn ? 'Fresh Chicken Breast & Local Fish' : 'Dada Ayam & Ikan Tempatan di Pasar Pagi',
      desc: isEn
        ? 'Buy fresh chicken breast, local sea bass (siakap), mackerel (kembung), and eggs at morning wet markets for peak freshness and lowest cost.'
        : 'Beli dada ayam segar tanpa kulit, ikan siakap, kembung dan telur di pasar basah pagi untuk kualiti segar dan harga jauh lebih murah berbanding pasar raya.',
      type: 'checklist',
      items: [
        { name: isEn ? 'Skinless Chicken Breast' : 'Dada Ayam Segar (Tanpa Kulit)', badge: isEn ? '165 kcal · 31g Protein' : '165 kcal · 31g Protein' },
        { name: isEn ? 'Fresh Sea Bass (Siakap)' : 'Ikan Siakap Tempatan', badge: isEn ? 'Lean & High Potassium' : 'Isi Putih & Rendah Lemak' },
        { name: isEn ? 'Local Mackerel (Kembung)' : 'Ikan Kembung Tempatan', badge: isEn ? 'Omega-3 Rich' : 'Kaya Omega-3 & Jimat' },
        { name: isEn ? 'Grade A / Kampung Eggs' : 'Telur Ayam Gred A / Kampung', badge: isEn ? 'Complete Protein' : 'Protein Lengkap & Kenyang' },
      ],
      protip: isEn
        ? 'Shop between 7:30–9:00 AM. Look for bright clear eyes and vibrant red gills. Ask the fishmonger to clean and gut on the spot!'
        : 'Datang jam 7:30–9:00 pagi. Pilih ikan dengan mata cembung jernih dan insang merah cerah. Minta peniaga potong dan bersihkan terus!',
    },
    {
      id: 'veggies',
      icon: '🌿',
      pill: isEn ? '🌿 Local Herbs & Greens' : '🌿 Ulam & Sayuran',
      badge: isEn ? 'High Satiety · Micronutrients' : 'Kaya Mikronutrien · Kenyang Lama',
      title: isEn ? 'Fresh Local Greens & Satiety Herbs' : 'Ulam-Ulaman Kampung & Sayur Hijau',
      desc: isEn
        ? 'Incorporate local traditional herbs like pegaga, ulam raja, cucumbers, and okra for vital micronutrients and long-lasting fullness.'
        : 'Amalkan ulam tradisional seperti pegaga, ulam raja, bendi celur dan timun kampung untuk serat tinggi, vitamin C, dan kawalan lapar.',
      type: 'checklist',
      items: [
        { name: isEn ? 'Ulam Raja (King’s Salad)' : 'Ulam Raja Segar', badge: isEn ? 'Calcium & Antioxidants' : 'Kalsium & Antioksidan (RM1 seikat)' },
        { name: isEn ? 'Daun Pegaga (Centella)' : 'Daun Pegaga Kampung', badge: isEn ? 'Blood Flow & Collagen' : 'Serat & Kolagen Alami' },
        { name: isEn ? 'Fresh Okra / Bendi (Blanched)' : 'Bendi Segar (Celur/Rebus)', badge: isEn ? 'Blood Sugar Control' : 'Kawal Paras Gula Darah' },
        { name: isEn ? 'Crisp Kampung Cucumbers' : 'Timun Kampung Rangup', badge: isEn ? '95% Water · Low Calorie' : '95% Air · Sangat Mengenyangkan' },
      ],
      protip: isEn
        ? 'Local ulam is often RM1–RM2 per bunch at morning stalls. Soak in a bowl of ice-cold water for 5 minutes before serving for maximum crispiness!'
        : 'Ulam raja dan pegaga biasanya hanya RM1–RM2 seikat di gerai kampung. Rendam dalam semangkuk air berais 5 minit untuk rangup segar bermakna!',
    },
    {
      id: 'spices',
      icon: '🌶️',
      pill: isEn ? '🌶️ Bold Spices & Broths' : '🌶️ Rempah & Kurang Minyak',
      badge: isEn ? 'Zero Hidden Fats' : 'Rasa Padu · Kawal Santan',
      title: isEn ? 'Bold Aromatic Spices, Less Palm Oil & Santan' : 'Rempah Asli, Kurangkan Santan Pekat & Minyak',
      desc: isEn
        ? 'Harness fresh turmeric, ginger, lemongrass, and chili for bold Malaysian flavor without heavy palm oil or thick coconut cream.'
        : 'Gunakan kunyit hidup, serai wangi, halia, dan cili padi untuk rasa lauk Melayu yang padu tanpa memerlukan minyak atau santan pekat.',
      type: 'compare',
      compare: {
        badTitle: isEn ? 'Heavy Santan / Deep Fried' : 'Gulai Santan Pekat / Goreng Minyak',
        badDesc: isEn ? '+380 kcal excess saturated fat' : '+380 kcal lemak tepu & minyak lebihan',
        goodTitle: isEn ? 'Singgang / Asam Pedas / Bakar' : 'Singgang / Asam Pedas / Ayam Bakar',
        goodDesc: isEn ? '+110 kcal · Saves ~270 kcal per dish!' : '+110 kcal · Jimat ~270 kcal setiap hidangan!',
      },
      protip: isEn
        ? 'Cook singgang, sup utara, or grilled dishes where fresh aromatics create deep savory broth without needing a single drop of cooking oil!'
        : 'Masakan singgang Kelantan, sup ayam utara dan lauk bakar serai langsung tidak memerlukan minyak masak, tapi rasanya sangat menyelerakan!',
    },
    {
      id: 'carbs',
      icon: '🌾',
      pill: isEn ? '🌾 Half Rice & Oats' : '🌾 Karbo Pintar & Nasi',
      badge: isEn ? 'Insulin Spike Control' : 'Kawal Lonjakan Gula & Mengantuk',
      title: isEn ? 'Half-Portion Rice & Complex Carbohydrates' : 'Amalkan Nasi Separuh & Karbohidrat Kompleks',
      desc: isEn
        ? 'Choose wholemeal bread, whole rolled oats, or reduce white rice to half a portion to control glucose spikes and prevent afternoon sluggishness.'
        : 'Pilih roti mil gandum penuh, rolled oats, atau amalkan konsep "nasi separuh" (1/2 cawan) untuk kawal lonjakan insulin dan elak mengantuk.',
      type: 'checklist',
      items: [
        { name: isEn ? 'Practice "Nasi Separuh" (1/2 Cup)' : 'Minta "Nasi Separuh" (1/2 Cawan)', badge: isEn ? 'Saves 140 kcal instantly' : 'Jimat 140 kcal serta-merta' },
        { name: isEn ? '100% Wholemeal Bread' : 'Roti Mil Gandum Penuh', badge: isEn ? 'High fiber · Slower digestion' : 'Serat tinggi & kenyang lama' },
        { name: isEn ? 'Whole Rolled Oats' : 'Rolled Oats Tradisional', badge: isEn ? 'Beta-glucan heart health' : 'Beta-glukan untuk jantung' },
        { name: isEn ? 'Steamed Sweet Potato' : 'Ubi Keledek Manis Rebus', badge: isEn ? 'Vitamin A & Complex Carb' : 'Karbo kompleks bertenaga' },
      ],
      protip: isEn
        ? 'When ordering mixed rice at economic rice or nasi campur stalls, ask for "nasi separuh" upfront before taking your protein and greens.'
        : 'Semasa memesan nasi campur atau nasi kandar, biasakan minta "nasi separuh" atau "suku pinggan" terlebih dahulu sebelum ambil lauk protein dan ulam.',
    },
    {
      id: 'hydration',
      icon: '💧',
      pill: isEn ? '💧 Zero-Sugar Drinks' : '💧 Minuman Bebas Gula',
      badge: isEn ? 'Zero Sugar · High Impact' : 'Sifar Gula · Jimat Kalori',
      title: isEn ? 'Plain Water, Teh O Kosong & Sugar-Free Drinks' : 'Air Kosong & Teh O Kosong Tanpa Gula',
      desc: isEn
        ? 'Sweetened condensed milk in Teh Tarik and iced Milo is the biggest hidden calorie trap in Malaysia. Switch to zero-sugar drinks for rapid fat loss.'
        : 'Susu pekat manis dalam Teh Tarik & Milo ais adalah penyumbang kalori tersembunyi terbesar di Malaysia. Tukar ke minuman bebas gula untuk hasil ketara.',
      type: 'drink_switch',
      drinkData: {
        badDrink: isEn ? 'Teh Tarik Kaw / Milo Ais Manis' : 'Teh Tarik Kaw / Milo Ais Manis',
        badMeta: isEn ? '160–180 kcal · 24g gula (4 sudu teh)' : '160–180 kcal · 24g gula (4 sudu gula)',
        goodDrink: isEn ? 'Teh O Kosong / Chinese Tea / Kopi O' : 'Teh O Kosong / Teh Cina / Kopi O Kosong',
        goodMeta: isEn ? '0 kcal · 0g gula · Penyerapan optimum' : '0 kcal · 0g gula · Penyerapan optimum',
        weeklySave: isEn ? '~2,240 kcal saved/week (2 cups a day = ~300g pure fat burn!)' : '~2,240 kcal dijimatkan seminggu (bersamaan bakar lemak ~300g seminggu!)',
      },
      protip: isEn
        ? 'Carry a chilled 1L water bottle everywhere. If craving refreshing sweetness, opt for fresh young coconut water with zero added syrup.'
        : 'Bawa botol air sejuk 1L ke mana sahaja. Jika teringin rasa manis yang menyegarkan, pilih air kelapa muda segar tanpa sirap gula tambahan.',
    },
  ];

  let currentStep = 0;
  const checkedItems = new Set();

  function copyMarketListToClipboard() {
    let text = isEn ? '🛒 *CALMAL FRESH MALAYSIAN MARKET SHOPPING LIST*\n\n' : '🛒 *SENARAI BELANJA PASAR SEGAR CALMAL*\n\n';
    text += isEn ? '🥩 *Fresh Proteins:*\n• Skinless chicken breast\n• Fresh sea bass (siakap) / mackerel (kembung)\n• Grade A / kampung eggs\n\n' : '🥩 *Protein Segar:*\n• Dada ayam segar tanpa kulit\n• Ikan siakap segar / ikan kembung tempatan\n• Telur ayam gred A / kampung\n\n';
    text += isEn ? '🌿 *Local Greens & Ulam:*\n• Ulam raja & daun pegaga (RM1–RM2)\n• Bendi segar (celur) & timun kampung\n• Bayam hijau / sawi\n\n' : '🌿 *Ulam & Sayur Segar:*\n• Ulam raja & daun pegaga segar\n• Bendi segar & timun kampung rangup\n• Bayam hijau / sawi\n\n';
    text += isEn ? '🌾 *Smart Carbs:*\n• Wholemeal bread & rolled oats\n• Basmati / brown rice & sweet potatoes\n\n' : '🌾 *Karbohidrat Pintar:*\n• Roti mil gandum penuh (wholemeal)\n• Rolled oats & beras basmati / perang\n• Ubi keledek manis rebus\n\n';
    text += isEn ? '🌶️ *Spices & Aromatics:*\n• Fresh turmeric, ginger, lemongrass, garlic & chili\n\n' : '🌶️ *Rempah Asli:*\n• Kunyit hidup, serai wangi, halia muda, bawang putih & cili padi\n\n';
    text += isEn ? '💧 *Hydration:*\n• Plain water, Teh O Kosong / Chinese tea\n\n' : '💧 *Minuman Sihat:*\n• Air kosong, Teh O Kosong & Kopi O tanpa gula\n\n';
    text += isEn ? '💡 *Market Pro-Tips:*\n1. Shop morning market 7:30–9:00 AM\n2. Request half-portion rice (nasi separuh)\n3. Ditch condensed milk beverages\n\n' : '💡 *Petua Pintar CalMal:*\n1. Beli di pasar pagi jam 7:30–9:00 pagi\n2. Minta nasi separuh di gerai makan\n3. Tukar teh tarik manis ke teh o kosong\n\n';
    text += isEn ? '✨ *Generated with CalMal Nutrition App*' : '✨ *Dijana dengan CalMal Nutrition App*';

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        toast(isEn ? 'Market shopping list copied to clipboard!' : 'Senarai belanja pasar berjaya disalin ke Clipboard! Sedia untuk WhatsApp/Notes.', 'success');
        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([15, 30]);
      }).catch(() => {
        fallbackCopyText(text);
      });
    } else {
      fallbackCopyText(text);
    }
  }

  const { el, close } = openSheet(`
    <div class="market-interactive-sheet">
      <!-- Top Bar -->
      <div class="market-interactive-top">
        <div class="row" style="gap:6px;align-items:center">
          <span class="badge ok">${isEn ? 'Market Guide' : 'Panduan Pasar'}</span>
          <span class="tutorial-step-indicator" id="market-step-num">1 / ${topics.length}</span>
        </div>
        <div class="row" style="gap:6px;align-items:center">
          <button type="button" class="btn btn-icon btn-ghost btn-sm" id="btn-copy-market-list" title="${isEn ? 'Copy Shopping List' : 'Salin Senarai Belanja'}">
            ${icons.copy}
          </button>
          <button type="button" class="btn btn-icon btn-ghost btn-sm" data-close aria-label="${t('close')}">
            ${icons.close}
          </button>
        </div>
      </div>

      <!-- Segmented Story Progress Bar (Tap any segment) -->
      <div class="market-progress-bars" id="market-progress-bars" title="Tap to jump to step">
        ${topics.map((_, i) => `<div class="m-bar ${i === 0 ? 'active' : ''}" data-idx="${i}"></div>`).join('')}
      </div>

      <!-- Category Filter Pills (Horizontal snap scroll) -->
      <div class="market-cat-dock" id="market-cat-dock">
        ${topics.map((tp, i) => `
          <button type="button" class="market-cat-pill ${i === 0 ? 'active' : ''}" data-idx="${i}">
            <span>${tp.pill}</span>
          </button>
        `).join('')}
      </div>

      <!-- Main Slide Card Mount -->
      <div id="market-slide-mount"></div>

      <!-- Bottom Interactive Controls -->
      <div class="market-actions-row">
        <button type="button" class="btn btn-ghost btn-sm" id="btn-market-prev" style="flex:1">
          ${icons.chevronLeft}
          <span>${t('previous')}</span>
        </button>
        <button type="button" class="btn btn-primary btn-sm" id="btn-market-next" style="flex:1.5">
          <span id="market-next-text">${t('next')}</span>
          ${icons.chevronRight}
        </button>
      </div>

      <button type="button" class="btn btn-ghost btn-block btn-xs" id="btn-market-copy-footer" style="color:var(--deku);margin-top:2px;gap:6px">
        ${icons.copy} <span>${isEn ? 'Copy Full Market List (WhatsApp)' : 'Salin Senarai Belanja Penuh (WhatsApp)'}</span>
      </button>
    </div>
  `);

  function renderCurrentSlide() {
    const tp = topics[currentStep];
    const mount = el.querySelector('#market-slide-mount');
    const stepNumEl = el.querySelector('#market-step-num');
    const nextTextEl = el.querySelector('#market-next-text');
    const prevBtn = el.querySelector('#btn-market-prev');

    if (stepNumEl) stepNumEl.textContent = `${currentStep + 1} / ${topics.length}`;

    // Update progress bars
    el.querySelectorAll('.m-bar').forEach((bar, idx) => {
      bar.classList.toggle('completed', idx < currentStep);
      bar.classList.toggle('active', idx === currentStep);
    });

    // Update category pills
    el.querySelectorAll('.market-cat-pill').forEach((pill, idx) => {
      const isActive = idx === currentStep;
      pill.classList.toggle('active', isActive);
      if (isActive) {
        pill.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      }
    });

    // Update Next button label
    if (nextTextEl) {
      nextTextEl.textContent = currentStep === topics.length - 1 ? (isEn ? 'Got It' : 'Faham & Selesai') : t('next');
    }

    if (prevBtn) {
      prevBtn.style.visibility = currentStep === 0 ? 'hidden' : 'visible';
    }

    // Render interactive widget based on type
    let widgetHtml = '';
    if (tp.type === 'checklist') {
      widgetHtml = `
        <div class="market-interactive-widget">
          <div class="market-widget-label">
            <span>${isEn ? 'Tap to mark items to buy:' : 'Sentuh bahan untuk tanda semak beli:'}</span>
            <span class="xs muted">${isEn ? 'Checklist' : 'Senarai Semak'}</span>
          </div>
          <div class="market-checklist-grid">
            ${tp.items.map((it, idx) => {
              const key = `${tp.id}-${idx}`;
              const isChecked = checkedItems.has(key);
              return `
                <div class="market-check-item ${isChecked ? 'checked' : ''}" data-key="${key}">
                  <div class="market-check-left">
                    <div class="market-check-circle">${icons.check}</div>
                    <span class="market-check-name">${esc(it.name)}</span>
                  </div>
                  <span class="market-check-badge">${esc(it.badge)}</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    } else if (tp.type === 'compare') {
      widgetHtml = `
        <div class="market-interactive-widget">
          <div class="market-widget-label">
            <span>${isEn ? 'Calorie & Fat Comparison:' : 'Perbandingan Kalori & Lemak:'}</span>
            <span class="badge ok">${isEn ? 'Save ~270 kcal' : 'Jimat ~270 kcal'}</span>
          </div>
          <div class="market-compare-grid">
            <div class="market-compare-card bad">
              <b style="font-size:11.5px">❌ ${esc(tp.compare.badTitle)}</b>
              <span class="xs" style="opacity:0.9">${esc(tp.compare.badDesc)}</span>
            </div>
            <div class="market-compare-card good">
              <b style="font-size:11.5px">✓ ${esc(tp.compare.goodTitle)}</b>
              <span class="xs" style="opacity:0.9">${esc(tp.compare.goodDesc)}</span>
            </div>
          </div>
        </div>
      `;
    } else if (tp.type === 'drink_switch') {
      widgetHtml = `
        <div class="market-interactive-widget">
          <div class="market-widget-label">
            <span>${isEn ? 'Zero-Sugar Switch Impact:' : 'Kesan Pertukaran Minuman Bebas Gula:'}</span>
            <span class="badge ok">${isEn ? 'Zero Sugar' : 'Sifar Gula'}</span>
          </div>
          <div style="display:flex;flex-direction:column;gap:6px">
            <div class="market-drink-row" style="border:1px solid rgba(239,68,68,0.25)">
              <div style="display:flex;align-items:center;gap:6px">
                <span>🧋</span>
                <div>
                  <b style="color:#fca5a5;font-size:12px">${esc(tp.drinkData.badDrink)}</b>
                  <div class="xs muted">${esc(tp.drinkData.badMeta)}</div>
                </div>
              </div>
            </div>
            <div class="market-drink-row" style="border:1px solid rgba(16,185,129,0.3);background:rgba(16,185,129,0.08)">
              <div style="display:flex;align-items:center;gap:6px">
                <span>🍵</span>
                <div>
                  <b style="color:#6ee7b7;font-size:12px">${esc(tp.drinkData.goodDrink)}</b>
                  <div class="xs" style="color:#34d399">${esc(tp.drinkData.goodMeta)}</div>
                </div>
              </div>
            </div>
            <div class="card flat" style="background:rgba(16,185,129,0.12);border:1px dashed #10b981;padding:8px 10px;border-radius:8px">
              <b class="xs" style="color:#34d399">🔥 ${isEn ? 'Weekly Calorie Deficit:' : 'Penjimatan Kalori Mingguan:'}</b>
              <div class="xs" style="color:#e4e4e7;margin-top:2px">${esc(tp.drinkData.weeklySave)}</div>
            </div>
          </div>
        </div>
      `;
    }

    if (mount) {
      mount.innerHTML = `
        <div class="market-slide-card">
          <div class="market-card-head">
            <div class="market-icon-bubble">${tp.icon}</div>
            <div style="flex:1">
              <span class="badge ok" style="font-size:10px;padding:2px 7px;margin-bottom:4px;display:inline-block">${esc(tp.badge)}</span>
              <h4 class="market-card-title">${esc(tp.title)}</h4>
              <p class="market-card-desc">${esc(tp.desc)}</p>
            </div>
          </div>

          ${widgetHtml}

          <div class="market-protip-box">
            <span>💡</span>
            <div><b>${isEn ? 'Market Pro-Tip:' : 'Petua Pasar:'}</b> ${esc(tp.protip)}</div>
          </div>
        </div>
      `;

      // Bind checklist clicks
      mount.querySelectorAll('.market-check-item').forEach((item) => {
        item.addEventListener('click', () => {
          const key = item.dataset.key;
          if (checkedItems.has(key)) {
            checkedItems.delete(key);
            item.classList.remove('checked');
          } else {
            checkedItems.add(key);
            item.classList.add('checked');
            if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
          }
        });
      });
    }
  }

  // Bind top progress bars
  el.querySelectorAll('.m-bar').forEach((bar) => {
    bar.addEventListener('click', () => {
      currentStep = Number(bar.dataset.idx);
      renderCurrentSlide();
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(8);
    });
  });

  // Bind category pills
  el.querySelectorAll('.market-cat-pill').forEach((pill) => {
    pill.addEventListener('click', () => {
      currentStep = Number(pill.dataset.idx);
      renderCurrentSlide();
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(8);
    });
  });

  // Bind next and prev
  el.querySelector('#btn-market-next')?.addEventListener('click', () => {
    if (currentStep < topics.length - 1) {
      currentStep++;
      renderCurrentSlide();
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
    } else {
      close();
    }
  });

  el.querySelector('#btn-market-prev')?.addEventListener('click', () => {
    if (currentStep > 0) {
      currentStep--;
      renderCurrentSlide();
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
    }
  });

  // Copy shopping list buttons
  el.querySelector('#btn-copy-market-list')?.addEventListener('click', () => {
    copyMarketListToClipboard();
  });
  el.querySelector('#btn-market-copy-footer')?.addEventListener('click', () => {
    copyMarketListToClipboard();
  });

  // Initial render
  renderCurrentSlide();
}

export function renderGuideButton(id, label = '') {
  const isEn = getLang() === 'en';
  const text = label || (isEn ? 'Tutorial' : 'Panduan');
  return `
    <button type="button" class="btn-guide-pill section-guide-btn" data-guide="${id}" title="${esc(text)}" aria-label="${esc(text)}">
      ${icons.help}
      <span>${esc(text)}</span>
    </button>
  `;
}

export function openGuideModal(guideId) {
  const isEn = getLang() === 'en';
  if (guideId === 'market') {
    openMarketGuideModal();
    return;
  }
  let title = '';
  let desc = '';
  let steps = [];

  switch (guideId) {
    case 'planner':
      title = t('guide_planner_title');
      desc = t('guide_planner_desc');
      steps = [
        t('guide_planner_s1'),
        t('guide_planner_s2'),
        t('guide_planner_s3'),
        t('guide_planner_s4'),
        t('guide_planner_s5'),
        t('guide_planner_s6'),
      ];
      break;
    case 'generator':
      title = t('guide_generator_title');
      desc = t('guide_generator_desc');
      steps = [
        t('guide_generator_s1'),
        t('guide_generator_s2'),
        t('guide_generator_s3'),
        t('guide_generator_s4'),
      ];
      break;
    case 'saved':
      title = t('guide_saved_title');
      desc = t('guide_saved_desc');
      steps = [
        t('guide_saved_s1'),
        t('guide_saved_s2'),
        t('guide_saved_s3'),
      ];
      break;
    case 'dash_calorie':
      title = t('guide_dash_cal_title');
      desc = t('guide_dash_cal_desc');
      steps = [
        t('guide_dash_cal_s1'),
        t('guide_dash_cal_s2'),
        t('guide_dash_cal_s3'),
        t('guide_dash_cal_s4'),
      ];
      break;
    case 'dash_water':
      title = t('guide_dash_water_title');
      desc = t('guide_dash_water_desc');
      steps = [
        t('guide_dash_water_s1'),
        t('guide_dash_water_s2'),
        t('guide_dash_water_s3'),
      ];
      break;
    case 'dash_meals':
      title = t('guide_dash_meals_title');
      desc = t('guide_dash_meals_desc');
      steps = [
        t('guide_dash_meals_s1'),
        t('guide_dash_meals_s2'),
        t('guide_dash_meals_s3'),
        t('guide_dash_meals_s4'),
      ];
      break;
    default:
      return;
  }

  openSheet(`
    <div class="guide-modal-sheet">
      <div class="row between" style="align-items:flex-start;margin-bottom:12px">
        <div style="flex:1;padding-right:12px">
          <div class="row" style="gap:6px;align-items:center;margin-bottom:4px">
            <span class="badge ok">${t('guide_badge')}</span>
            <span class="xs muted">${isEn ? 'Step-by-Step Walkthrough' : 'Langkah Demi Langkah'}</span>
          </div>
          <h3 style="font-size:17px;font-weight:800;color:#fff;margin:0;line-height:1.3">${esc(title)}</h3>
          <p class="xs muted" style="margin:4px 0 0;line-height:1.4">${esc(desc)}</p>
        </div>
        <button type="button" class="btn btn-icon btn-ghost btn-sm" data-close aria-label="${t('close')}">
          ${icons.close}
        </button>
      </div>

      <div class="guide-modal-steps">
        ${steps.map((st, idx) => `
          <div class="guide-modal-step-item">
            <div class="guide-step-num">${idx + 1}</div>
            <div class="guide-step-text">${esc(st)}</div>
          </div>
        `).join('')}
      </div>

      <button type="button" class="btn btn-primary btn-block" data-close style="margin-top:8px">
        <span>${isEn ? 'Got It' : 'Faham'}</span>
      </button>
    </div>
  `);
}

export function renderRecipes(container) {
  let tab = 'planner'; // Default to planner as requested for smooth navigation, can toggle to recipe/saved
  let selectedDiet = 'Halal';
  let recipeTextRequest = '';
  let ingredientImage = null;
  let currentRecipe = null;
  let isGenerating = false;

  // Meal Planner state
  let currentStep = 0;
  let mcqAnswers = {};

  function getValidMealPlan() {
    const plan = store.state.mealPlan;
    if (plan && Array.isArray(plan.days) && plan.days.length > 0 && plan.days.some((d) => Array.isArray(d.meals) && d.meals.length > 0)) {
      return plan;
    }
    const target = store.macros?.target || 1800;
    const newPlan = generateSmartPlan('all', target, 2);
    store.saveMealPlan(newPlan);
    return newPlan;
  }

  let currentMealPlan = getValidMealPlan();
  let isGeneratingPlan = false;

  // Planner View Modes & Preference states
  let planViewMode = 'day'; // 'day' (Ikut Hari) | 'meal' (Ikut Waktu Makan / Menu)
  let selectedDayIndex = -1; // -1 for 'All Days' (default), 0: Isnin, 1: Selasa, ...
  let selectedMealFilter = 'all'; // 'all' | 'breakfast' | 'lunch' | 'dinner' | 'snack'
  let selectedPreference = currentMealPlan?.preference || 'all';

  // Persistent horizontal scroll positions for Filter Dock
  const filterScrolls = {
    day: 0,
    meal: 0,
    pref: 0,
  };

  function captureFilterScrolls() {
    const dayEl = container.querySelector('#day-selector-scroll');
    if (dayEl) filterScrolls.day = dayEl.scrollLeft;

    const mealEl = container.querySelector('#meal-filter-scroll');
    if (mealEl) filterScrolls.meal = mealEl.scrollLeft;

    const prefEl = container.querySelector('#pref-chips');
    if (prefEl) filterScrolls.pref = prefEl.scrollLeft;
  }

  function restoreFilterScrolls() {
    requestAnimationFrame(() => {
      const dayEl = container.querySelector('#day-selector-scroll');
      if (dayEl && filterScrolls.day > 0) dayEl.scrollLeft = filterScrolls.day;

      const mealEl = container.querySelector('#meal-filter-scroll');
      if (mealEl && filterScrolls.meal > 0) mealEl.scrollLeft = filterScrolls.meal;

      const prefEl = container.querySelector('#pref-chips');
      if (prefEl && filterScrolls.pref > 0) prefEl.scrollLeft = filterScrolls.pref;
    });
  }

  function render() {
    captureFilterScrolls();
    const savedWindowY = window.scrollY || document.documentElement.scrollTop || 0;

    container.innerHTML = `
      <div class="page-head">
        <div>
          <span class="eyebrow">${t('rec_eyebrow')}</span>
          <h1 class="page-title">${t('rec_title')}</h1>
        </div>
      </div>

      <!-- Segmented Tab -->
      <div class="segmented" id="recipe-tabs" style="margin-bottom:16px">
        <button type="button" data-t="planner" class="${tab === 'planner' ? 'active' : ''}">
          ${icons.sparkles}
          <span>${t('rec_tab_planner')}</span>
        </button>
        <button type="button" data-t="recipe" class="${tab === 'recipe' ? 'active' : ''}">
          ${icons.chef}
          <span>${t('rec_tab_generator')}</span>
        </button>
        <button type="button" data-t="saved" class="${tab === 'saved' ? 'active' : ''}">
          ${icons.bowl}
          <span>${t('rec_tab_saved')} (${store.state.recipes.length})</span>
        </button>
      </div>

      ${tab === 'planner' ? renderMealPlanner() : tab === 'recipe' ? renderRecipeGenerator() : renderSavedRecipes()}
    `;

    restoreFilterScrolls();
    if (savedWindowY > 0) {
      window.scrollTo(0, savedWindowY);
    }

    bindEvents();
  }

  function renderRecipeGenerator() {
    const isEn = getLang() === 'en';
    return `
      <div class="stack fade-up">
        <div class="card stack">
          <div class="card-title row between" style="align-items:center">
            <div>
              <span>${t('rec_diet_focus')}</span>
              <span class="xs muted" style="margin-left:6px">${isEn ? 'Halal / Health Focus' : 'Fokus Sihat & Halal'}</span>
            </div>
          </div>

          <div class="chips" id="diet-chips" style="margin-top:4px">
            ${DIET_FILTERS.map((d) => `<button type="button" class="chip ${selectedDiet === d ? 'active' : ''}" data-d="${d}">${d}</button>`).join('')}
          </div>

          <div class="field" style="margin-top:4px">
            <label for="recipe-input">${t('rec_request_placeholder')}</label>
            <textarea class="textarea" id="recipe-input" placeholder="${t('rec_request_placeholder')}">${esc(recipeTextRequest)}</textarea>
          </div>

          <div class="row between" style="align-items:center">
            <input type="file" id="recipe-img-file" accept="image/*" class="hidden" />
            <button type="button" class="btn btn-sm btn-ghost" id="btn-add-ing-img">
              ${icons.camera}
              <span>${ingredientImage ? 'Change Photo' : 'Fridge / Ingredients Photo'}</span>
            </button>
            ${ingredientImage ? '<span class="badge ok">1 photo</span>' : ''}
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
            <span>${isGenerating ? t('rec_generating') : t('rec_generate_ai')}</span>
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
            <span>${t('me_calories')}</span>
            <b class="num">${n.calories_kcal || 0}</b>
            <span class="xs muted">kcal</span>
          </div>
          <div class="eq-cell">
            <span>${t('me_protein')}</span>
            <b class="num">${round1(n.protein_g || 0)}</b>
            <span class="xs muted">g</span>
          </div>
          <div class="eq-cell">
            <span>${t('me_carbs')} / ${t('me_fat')}</span>
            <b class="num">${round1(n.carbs_g || 0)}/${round1(n.fat_g || 0)}</b>
            <span class="xs muted">g</span>
          </div>
        </div>

        <div class="divider"></div>

        <div>
          <b class="small" style="text-transform:uppercase;letter-spacing:0.06em;color:var(--muted)">${t('rec_ingredients')}</b>
          <ul style="padding-left:20px;margin:8px 0;line-height:1.6;font-size:14px">
            ${(r.ingredients || []).map((ing) => `<li>${esc(typeof ing === 'string' ? ing : `${ing.amount || ''} ${ing.name || ''}`)}</li>`).join('')}
          </ul>
        </div>

        <div>
          <b class="small" style="text-transform:uppercase;letter-spacing:0.06em;color:var(--muted)">${t('rec_instructions')}</b>
          <ol style="padding-left:20px;margin:8px 0;line-height:1.6;font-size:14px">
            ${(r.steps || []).map((st) => `<li>${esc(st)}</li>`).join('')}
          </ol>
        </div>

        ${r.tips ? `<div class="card flat" style="background:#0d0d0e;border:1px solid var(--border);padding:12px;font-size:13px"><b style="color:var(--deku)">Chef Tip:</b> ${esc(r.tips)}</div>` : ''}

        <div class="grid grid-2" style="margin-top:8px">
          <button type="button" class="btn btn-secondary" id="btn-save-recipe">
            ${icons.plus}
            <span>${t('rec_save_recipe')}</span>
          </button>
          <button type="button" class="btn btn-primary" id="btn-log-recipe-meal">
            ${icons.check}
            <span>${t('scan_log_meal')}</span>
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
      <div class="stack fade-up">
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
              <span>${t('previous')}</span>
            </button>
            ${
              currentStep === PLANNER_QUESTIONS.length - 1
                ? `<button type="button" class="btn btn-primary" id="btn-submit-planner" ${!mcqAnswers[q.id] || isGeneratingPlan ? 'disabled' : ''}>
                    ${isGeneratingPlan ? '<span class="spinner"></span>' : icons.sparkles}
                    <span>${isGeneratingPlan ? t('rec_generating') : t('rec_generate_ai')}</span>
                  </button>`
                : `<button type="button" class="btn btn-secondary btn-sm" id="btn-step-next" ${!mcqAnswers[q.id] ? 'disabled' : ''}>
                    <span>${t('next')}</span>
                    ${icons.chevronRight}
                  </button>`
            }
          </div>

          <div class="divider" style="margin:12px 0 8px"></div>
          <button type="button" class="btn btn-ghost btn-sm btn-block" id="btn-quick-default-plan" style="color:var(--deku);gap:6px">
            ${icons.bolt} <span>${t('rec_quick_default')}</span>
          </button>
        </div>
      </div>
    `;
  }

  function renderMealCard(meal, dayIdx, mealIdx, showDayBadge = false, dayName = '') {
    const isEn = getLang() === 'en';
    const typeInfo = getMealTypeInfo(meal.type);
    return `
      <div class="plan-meal-card">
        <div class="plan-meal-body">
          <div class="plan-meal-header">
            <div class="row" style="gap:6px;align-items:center">
              ${showDayBadge ? `<span class="meal-day-pill">${esc(dayName)}</span>` : ''}
              <span class="meal-type-tag ${typeInfo.colorClass}">${esc(typeInfo.label)}</span>
            </div>
            <div class="meal-metrics-clean">
              <span class="meal-metric-kcal">${meal.kcal} <small>kcal</small></span>
              <span class="meal-metric-dot">·</span>
              <span class="meal-metric-protein">${meal.protein_g}g <small>protein</small></span>
            </div>
          </div>
          <h4 class="plan-meal-title">${esc(meal.name)}</h4>
          ${meal.desc ? `<p class="plan-meal-desc">${esc(meal.desc)}</p>` : ''}
        </div>

        <div class="plan-meal-actions">
          <button type="button" class="plan-action-btn primary btn-log-meal" data-didx="${dayIdx}" data-midx="${mealIdx}" title="Log into today's diary">
            ${icons.plus} <span>${isEn ? 'Log Meal' : 'Log Hidangan'}</span>
          </button>
          <button type="button" class="plan-action-btn btn-swap-meal" data-didx="${dayIdx}" data-midx="${mealIdx}" title="Swap with alternative dish">
            ${icons.refresh} <span>${isEn ? 'Swap' : 'Tukar'}</span>
          </button>
        </div>
      </div>
    `;
  }

  function renderPlanContent(plan) {
    const isEn = getLang() === 'en';

    function matchMeal(meal) {
      if (selectedMealFilter === 'all') return true;
      const typeInfo = getMealTypeInfo(meal.type);
      return typeInfo.id === selectedMealFilter;
    }

    if (selectedDayIndex >= 0) {
      const day = plan.days?.[selectedDayIndex];
      if (!day) return `<div class="empty">${t('rec_no_meals_filter')}</div>`;

      const dayName = getNormalizedDayName(day.day);
      const filteredMeals = (day.meals || []).filter(matchMeal);
      const dayTotalKcal = (day.meals || []).reduce((sum, m) => sum + (Number(m.kcal) || 0), 0);
      const dayTotalProtein = (day.meals || []).reduce((sum, m) => sum + (Number(m.protein_g) || 0), 0);

      return `
        <div class="plan-day-section fade-up">
          <div class="plan-day-banner">
            <div>
              <div class="plan-day-title">${esc(dayName)}</div>
              <div class="xs muted" style="margin-top:2px">${filteredMeals.length} ${isEn ? 'dishes scheduled' : 'hidangan berjadual'}</div>
            </div>
            <div class="meal-metrics-clean" style="font-size:13px">
              <span class="meal-metric-kcal">${dayTotalKcal} <small>kcal total</small></span>
              <span class="meal-metric-dot">·</span>
              <span class="meal-metric-protein">${dayTotalProtein}g <small>protein</small></span>
            </div>
          </div>

          ${
            filteredMeals.length === 0
              ? `<div class="empty" style="padding:28px 16px;text-align:center;color:var(--muted);font-size:13px">
                  <p style="margin-bottom:8px">${t('rec_no_meals_filter')}</p>
                  <button type="button" class="btn btn-sm btn-ghost btn-reset-filter" style="margin:0 auto">
                    ${icons.refresh} <span>${isEn ? 'View All Meals' : 'Lihat Semua Hidangan'}</span>
                  </button>
                </div>`
              : `<div class="plan-meals-grid">
                  ${filteredMeals.map((meal) => {
                    const originalIdx = day.meals.indexOf(meal);
                    return renderMealCard(meal, selectedDayIndex, originalIdx >= 0 ? originalIdx : 0, false);
                  }).join('')}
                </div>`
          }
        </div>
      `;
    }

    // View for All Days (-1): Group by day
    const daysWithMatches = (plan.days || []).map((day, dIdx) => ({
      day,
      dIdx,
      dayName: getNormalizedDayName(day.day),
      meals: (day.meals || []).filter(matchMeal),
    })).filter((item) => item.meals.length > 0);

    if (daysWithMatches.length === 0) {
      return `
        <div class="empty" style="padding:28px 16px;text-align:center;color:var(--muted);font-size:13px">
          <p style="margin-bottom:8px">${t('rec_no_meals_filter')}</p>
          <button type="button" class="btn btn-sm btn-ghost btn-reset-filter" style="margin:0 auto">
            ${icons.refresh} <span>${isEn ? 'View All Meals' : 'Lihat Semua Hidangan'}</span>
          </button>
        </div>
      `;
    }

    return `
      <div class="stack fade-up" style="gap:16px">
        ${daysWithMatches.map((item) => {
          const dayKcal = (item.day.meals || []).reduce((sum, m) => sum + (Number(m.kcal) || 0), 0);
          const dayProtein = (item.day.meals || []).reduce((sum, m) => sum + (Number(m.protein_g) || 0), 0);
          return `
            <div class="plan-day-section">
              <div class="plan-day-banner">
                <div class="plan-day-title">${esc(item.dayName)}</div>
                <div class="meal-metrics-clean" style="font-size:12.5px">
                  <span class="meal-metric-kcal">${dayKcal} <small>kcal</small></span>
                  <span class="meal-metric-dot">·</span>
                  <span class="meal-metric-protein">${dayProtein}g <small>protein</small></span>
                </div>
              </div>
              <div class="plan-meals-grid">
                ${item.meals.map((meal) => {
                  const mIdx = item.day.meals.indexOf(meal);
                  return renderMealCard(meal, item.dIdx, mIdx >= 0 ? mIdx : 0, false);
                }).join('')}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  function renderMealPlanResult(plan) {
    const isEn = getLang() === 'en';
    const dayShortNames = isEn
      ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
      : ['Isn', 'Sel', 'Rab', 'Kha', 'Jum', 'Sab', 'Aha'];

    const mealCategories = [
      { id: 'all', label: isEn ? 'All Meals' : 'Semua Hidangan' },
      { id: 'breakfast', label: isEn ? 'Breakfast' : 'Sarapan' },
      { id: 'lunch', label: isEn ? 'Lunch' : 'Makan Tengah Hari' },
      { id: 'dinner', label: isEn ? 'Dinner' : 'Makan Malam' },
      { id: 'snack', label: isEn ? 'Snack' : 'Snek' },
    ];

    return `
      <div class="plan-container fade-up">
        <!-- Top Header Card -->
        <div class="plan-header-card">
          <div class="row between" style="align-items:flex-start;flex-wrap:wrap;gap:12px">
            <div style="flex:1 1 200px;min-width:180px">
              <span class="eyebrow">${t('rec_tab_planner')}</span>
              <h2 style="font-size:20px;font-weight:800;color:#fff;margin:2px 0 4px">${t('rec_schedule_title')}</h2>
              <p class="xs muted" style="line-height:1.4">${esc(plan.summary || t('rec_schedule_sub'))}</p>
            </div>
            <div class="row" style="gap:6px;align-items:center;flex-shrink:0">
              <button type="button" class="btn btn-sm btn-ghost" id="btn-pref-modal" title="Preferences & Targets">
                ${icons.settings}
                <span>${isEn ? 'Preferences' : 'Keutamaan'}</span>
              </button>
              <button type="button" class="btn btn-sm btn-ghost btn-icon" id="btn-refresh-suggestions" title="Regenerate Plan" aria-label="Regenerate Plan">
                ${icons.refresh}
              </button>
              <button type="button" class="btn btn-sm btn-ghost btn-icon" id="btn-print-plan" title="Print / PDF" aria-label="Print PDF">
                ${icons.printer}
              </button>
            </div>
          </div>
        </div>

        <!-- Filter Dock (Sticky / Unified) -->
        <div class="plan-filter-dock" id="plan-filter-dock">
          <!-- Row 1: Day Tabs -->
          <div class="plan-filter-scroll" id="day-selector-scroll">
            <button type="button" class="plan-pill ${selectedDayIndex === -1 ? 'active' : ''}" data-didx="-1">
              <span>${isEn ? 'All Days' : 'Semua Hari'}</span>
            </button>
            ${dayShortNames.map((short, idx) => `
              <button type="button" class="plan-pill ${selectedDayIndex === idx ? 'active' : ''}" data-didx="${idx}">
                <span>${short}</span>
              </button>
            `).join('')}
          </div>

          <!-- Row 2: Meal Time Filter Pills -->
          <div class="plan-filter-scroll" id="meal-filter-scroll">
            ${mealCategories.map((c) => `
              <button type="button" class="plan-pill ${selectedMealFilter === c.id ? 'active' : ''}" data-mf="${c.id}">
                <span>${c.label}</span>
              </button>
            `).join('')}
          </div>

          <!-- Row 3: Dietary Preference Filter Chips -->
          <div class="plan-filter-scroll" id="pref-chips">
            ${getPreferences().map((p) => `
              <button type="button" class="plan-pref-chip ${selectedPreference === p.id ? 'active' : ''}" data-pref="${p.id}">
                <span>${p.label}</span>
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Main Plan Content -->
        <div id="plan-content-wrap">
          ${renderPlanContent(plan)}
        </div>

        <!-- Compact Touch UI Market Guide Card -->
        <div class="card flat market-touch-card" id="btn-open-market-guide" role="button" tabindex="0" style="background:#09090b;border:1px solid rgba(255,255,255,0.09);padding:12px 14px;cursor:pointer;border-radius:12px;margin-top:4px;transition:all 0.2s var(--ease)">
          <div class="row between" style="align-items:center">
            <div class="row" style="gap:10px;align-items:center">
              <div class="water-icon-circle" style="background:rgba(61,220,151,0.12);color:#3ddc97;width:32px;height:32px">
                ${icons.bowl}
              </div>
              <div>
                <div class="row" style="gap:6px;align-items:center">
                  <span class="badge ok" style="font-size:10px;padding:2px 6px">${isEn ? 'Market Guide' : 'Panduan Pasar'}</span>
                  <b style="font-size:13px;color:#fff">${isEn ? 'Grocery & Wet Market Tips' : 'Tips Pasar & Bahan Masakan'}</b>
                </div>
                <div class="xs muted" style="margin-top:2px">${isEn ? 'Tap to view fresh Malaysian proteins & smart shopping tips' : 'Sentuh untuk panduan bahan basah segar & jimat'}</div>
              </div>
            </div>
            <div class="row" style="gap:4px;align-items:center;color:var(--hero-accent)">
              <span class="xs bold">${isEn ? 'View' : 'Lihat'}</span>
              <span style="font-size:14px">›</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function renderSavedRecipes() {
    const list = store.state.recipes;
    const isEn = getLang() === 'en';
    return `
      <div class="stack fade-up">
        <div class="card stack">
          <div class="card-title row between" style="align-items:center">
            <div>
              <span>${t('rec_saved_collection')}</span>
              <span class="muted" style="margin-left:6px">${list.length} ${isEn ? 'recipes' : 'resipi'}</span>
            </div>
          </div>

          <div class="list">
            ${
              list.length === 0
                ? `<div class="empty">
                    ${icons.chef}
                    <p>${t('rec_no_saved')}</p>
                    <span class="small muted">${t('rec_no_saved_sub')}</span>
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

  function openPreferenceModal() {
    const targetKcal = store.macros?.target || 1800;
    const { el, close } = openSheet(`
      <h3 class="sheet-title">${t('rec_pref_modal_title')}</h3>
      <p class="muted small" style="margin-bottom:14px">${t('rec_pref_modal_sub')}</p>

      <div class="stack" style="gap:12px">
        <div class="field">
          <label>${t('rec_target_label')}</label>
          <input class="input num" id="pref-kcal-target" type="number" value="${targetKcal}" min="1000" max="4500" step="50" />
        </div>

        <div class="field">
          <label>${t('rec_meals_per_day')}</label>
          <div class="segmented" id="pref-meal-count" style="margin-top:4px">
            <button type="button" data-c="2" class="${currentMealPlan?.days?.[0]?.meals?.length === 2 ? 'active' : ''}">${t('rec_2_meals')}</button>
            <button type="button" data-c="3" class="${currentMealPlan?.days?.[0]?.meals?.length === 3 ? 'active' : ''}">${t('rec_3_meals')}</button>
            <button type="button" data-c="4" class="${currentMealPlan?.days?.[0]?.meals?.length === 4 ? 'active' : ''}">${t('rec_4_meals')}</button>
          </div>
        </div>

        <div class="field">
          <label>${t('rec_diet_focus')}</label>
          <div class="chips" id="pref-focus-chips" style="margin-top:4px">
            ${getPreferences().map((p) => `<button type="button" class="chip ${selectedPreference === p.id ? 'active' : ''}" data-p="${p.id}">${p.label}</button>`).join('')}
          </div>
        </div>

        <div class="grid grid-2" style="margin-top:8px;gap:10px">
          <button class="btn btn-ghost" data-close>${t('cancel')}</button>
          <button class="btn btn-primary" id="btn-save-pref">${t('rec_save_recalc')}</button>
        </div>
      </div>
    `);

    let mealCount = currentMealPlan?.days?.[0]?.meals?.length || 2;
    el.querySelectorAll('#pref-meal-count button').forEach((b) => {
      b.addEventListener('click', () => {
        mealCount = Number(b.dataset.c);
        el.querySelectorAll('#pref-meal-count button').forEach((x) => x.classList.toggle('active', x === b));
      });
    });

    let tempPref = selectedPreference;
    el.querySelectorAll('#pref-focus-chips button').forEach((b) => {
      b.addEventListener('click', () => {
        tempPref = b.dataset.p;
        el.querySelectorAll('#pref-focus-chips button').forEach((x) => x.classList.toggle('active', x === b));
      });
    });

      el.querySelector('#btn-save-pref').addEventListener('click', () => {
        const newTarget = Number(el.querySelector('#pref-kcal-target').value) || targetKcal;
        selectedPreference = tempPref;
        currentMealPlan = generateSmartPlan(selectedPreference, newTarget, mealCount);
        store.saveMealPlan(currentMealPlan);
        toast(getLang() === 'en' ? 'Preferences saved & new meal plan generated!' : 'Preferences disimpan & menu baru telah dijana!', 'success');
        close();
        render();
      });
    }

    function swapMeal(dayIdx, mealIdx) {
      if (!currentMealPlan?.days?.[dayIdx]?.meals?.[mealIdx]) return;
      const oldMeal = currentMealPlan.days[dayIdx].meals[mealIdx];
      const typeInfo = getMealTypeInfo(oldMeal.type);
      const pool = MALAYSIAN_MEAL_POOL[typeInfo.id] || MALAYSIAN_MEAL_POOL.lunch;

      // Filter alternatives
      const alternatives = pool.filter((m) => m.name !== oldMeal.name);
      const picked = alternatives[Math.floor(Math.random() * alternatives.length)] || pool[0];

      // Keep calories proportional to the slot being swapped
      const oldKcal = Number(oldMeal.kcal) || picked.kcal;
      const scale = oldKcal > 0 && picked.kcal > 0 ? oldKcal / picked.kcal : 1;
      const newKcal = Math.round(picked.kcal * scale);
      const newProtein = Math.round((picked.protein_g || 20) * scale);

      currentMealPlan.days[dayIdx].meals[mealIdx] = {
        type: oldMeal.type,
        name: picked.name,
        desc: picked.desc || '',
        kcal: newKcal,
        protein_g: newProtein,
      };

      // Recalculate day total kcal
      currentMealPlan.days[dayIdx].total_kcal = currentMealPlan.days[dayIdx].meals.reduce((sum, m) => sum + (Number(m.kcal) || 0), 0);

      store.saveMealPlan(currentMealPlan);
      toast(getLang() === 'en' ? `Swapped to: ${picked.name}` : `Lauk ditukar: ${picked.name}`, 'success');
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(12);
      updatePlanViewInPlace();
    }

    function logPlanMeal(dayIdx, mealIdx) {
      const m = currentMealPlan?.days?.[dayIdx]?.meals?.[mealIdx];
      if (!m) return;
      const typeInfo = getMealTypeInfo(m.type);
      const kVal = Number(m.kcal) || 0;
      const pVal = Number(m.protein_g) || 0;
      const cVal = Math.round((kVal * 0.45) / 4);
      const fVal = Math.round((kVal * 0.25) / 9);

      store.addMeal({
        name: m.name,
        kcal: kVal,
        protein: pVal,
        carbs: cVal,
        fat: fVal,
        weight_g: 350,
        mealType: typeInfo.id === 'breakfast' ? 'Breakfast' : typeInfo.id === 'dinner' ? 'Dinner' : typeInfo.id === 'snack' ? 'Snack' : 'Lunch',
      });

      toast(getLang() === 'en' ? `Logged: ${m.name} (+${kVal} kcal)` : `Berjaya log: ${m.name} (+${kVal} kcal)!`, 'success');
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([15, 30]);
    }

    function updatePlanViewInPlace() {
      const wrap = container.querySelector('#plan-content-wrap');
      if (!wrap) {
        render();
        return;
      }

      // 1. Update Day pill active states in-place
      container.querySelectorAll('#day-selector-scroll .plan-pill').forEach((btn) => {
        const didx = Number(btn.dataset.didx);
        btn.classList.toggle('active', didx === selectedDayIndex);
      });

      // 2. Update Meal pill active states in-place
      container.querySelectorAll('#meal-filter-scroll .plan-pill').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.mf === selectedMealFilter);
      });

      // 3. Update Preference chip active states in-place
      container.querySelectorAll('#pref-chips .plan-pref-chip').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.pref === selectedPreference);
      });

      // 4. Update header subtitle if plan summary changed
      const summaryEl = container.querySelector('.plan-header-card p.xs.muted');
      if (summaryEl && currentMealPlan?.summary) {
        summaryEl.textContent = currentMealPlan.summary;
      }

      // 5. Update plan content HTML smoothly without touching the filter dock
      wrap.innerHTML = renderPlanContent(currentMealPlan);

      // 6. Bind plan content actions
      bindPlanContentActions();
    }

    function bindPlanContentActions() {
      // Reset filter button listener
      container.querySelectorAll('.btn-reset-filter').forEach((b) => {
        b.addEventListener('click', () => {
          selectedMealFilter = 'all';
          updatePlanViewInPlace();
        });
      });

      // Log Meal button listener
      container.querySelectorAll('.btn-log-meal').forEach((btn) => {
        btn.addEventListener('click', () => {
          const dayIdx = Number(btn.dataset.didx);
          const mealIdx = Number(btn.dataset.midx);
          logPlanMeal(dayIdx, mealIdx);
        });
      });

      // Swap Meal button listener
      container.querySelectorAll('.btn-swap-meal').forEach((btn) => {
        btn.addEventListener('click', () => {
          const dayIdx = Number(btn.dataset.didx);
          const mealIdx = Number(btn.dataset.midx);
          swapMeal(dayIdx, mealIdx);
        });
      });
    }

    function bindEvents() {
      // Market Guide Touch Card Popup
      container.querySelector('#btn-open-market-guide')?.addEventListener('click', (e) => {
        e.stopPropagation();
        openMarketGuideModal();
        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
      });

      container.querySelectorAll('#recipe-tabs button').forEach((b) => {
        b.addEventListener('click', () => {
          tab = b.dataset.t;
          render();
        });
      });

      if (tab === 'planner') {
        // Track live scrolling on each row so filterScrolls is always accurate
        const dayScroll = container.querySelector('#day-selector-scroll');
        dayScroll?.addEventListener('scroll', () => { filterScrolls.day = dayScroll.scrollLeft; }, { passive: true });

        const mealScroll = container.querySelector('#meal-filter-scroll');
        mealScroll?.addEventListener('scroll', () => { filterScrolls.meal = mealScroll.scrollLeft; }, { passive: true });

        const prefScroll = container.querySelector('#pref-chips');
        prefScroll?.addEventListener('scroll', () => { filterScrolls.pref = prefScroll.scrollLeft; }, { passive: true });

        // Preference chips click (Instantly adapts the plan without jumping)
        container.querySelectorAll('#pref-chips button').forEach((btn) => {
          btn.addEventListener('click', () => {
            selectedPreference = btn.dataset.pref;
            const targetKcal = store.macros?.target || 1800;
            const mealCount = currentMealPlan?.days?.[0]?.meals?.length || 2;
            currentMealPlan = generateSmartPlan(selectedPreference, targetKcal, mealCount);
            store.saveMealPlan(currentMealPlan);
            const prefLabel = getPreferences().find((p) => p.id === selectedPreference)?.label || selectedPreference;
            toast(getLang() === 'en' ? `Plan adapted to: ${prefLabel}!` : `Menu diselaraskan mengikut: ${prefLabel}!`, 'success');
            if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
            updatePlanViewInPlace();
            btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
          });
        });

        // Day selector click (Ikut Hari - Stays in place)
        container.querySelectorAll('#day-selector-scroll button').forEach((btn) => {
          btn.addEventListener('click', () => {
            selectedDayIndex = Number(btn.dataset.didx);
            updatePlanViewInPlace();
            btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
          });
        });

        // Meal filter click (Ikut Waktu Makan - Stays in place)
        container.querySelectorAll('#meal-filter-scroll button').forEach((btn) => {
          btn.addEventListener('click', () => {
            selectedMealFilter = btn.dataset.mf;
            updatePlanViewInPlace();
            btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
          });
        });

        // Refresh / Regenerate suggestions button
        container.querySelector('#btn-refresh-suggestions')?.addEventListener('click', (e) => {
          const btn = e.currentTarget || container.querySelector('#btn-refresh-suggestions');
          btn?.classList.add('spin-active');
          setTimeout(() => btn?.classList.remove('spin-active'), 500);

          const targetKcal = store.macros?.target || 1800;
          const mealCount = currentMealPlan?.days?.[0]?.meals?.length || 2;
          currentMealPlan = generateSmartPlan(selectedPreference, targetKcal, mealCount, { randomize: true });
          store.saveMealPlan(currentMealPlan);
          toast(getLang() === 'en' ? 'New 7-day meal plan generated with fresh Malaysian dishes!' : 'Cadangan menu 7-hari baru telah dijana dengan pilihan lauk segar!', 'success');
          if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([20, 35]);
          updatePlanViewInPlace();
        });

        // Preferences modal trigger
        container.querySelector('#btn-pref-modal')?.addEventListener('click', () => {
          openPreferenceModal();
        });

        // Print / PDF
        container.querySelector('#btn-print-plan')?.addEventListener('click', () => {
          openPrintModal(currentMealPlan);
          if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(15);
        });

        // Quick 1-tap default plan from MCQ page
        container.querySelector('#btn-quick-default-plan')?.addEventListener('click', () => {
          currentMealPlan = generateSmartPlan('all', store.macros?.target || 1800, 2);
          store.saveMealPlan(currentMealPlan);
          toast(getLang() === 'en' ? '7-Day meal plan loaded!' : 'Pelan 7-Hari berjaya dimuatkan!', 'success');
          render();
        });

        // Bind initial plan content actions
        bindPlanContentActions();

      // MCQ navigation if in survey mode
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
          currentMealPlan = res || generateSmartPlan('all', store.macros?.target || 1800, 2);
          store.saveMealPlan(currentMealPlan);
          toast('Pelan 7-Hari berjaya dijana!', 'success');
        } catch {
          currentMealPlan = generateSmartPlan('all', store.macros?.target || 1800, 2);
          store.saveMealPlan(currentMealPlan);
          toast('Pelan 7-Hari dimuatkan!', 'success');
        } finally {
          isGeneratingPlan = false;
          render();
        }
      });
    }

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
