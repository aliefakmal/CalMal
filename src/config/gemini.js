// Konfigurasi Gemini (pelan §1.2) — model lalai: Gemini 3.5 Flash Lite.
export const GeminiConfig = {
  modelName: 'gemini-3.5-flash-lite',
  get apiEndpoint() {
    return `https://generativelanguage.googleapis.com/v1beta/models/${this.modelName}:generateContent`;
  },
  // Kunci daripada .env.local (VITE_GEMINI_API_KEY) — boleh ditindih dalam Profil > Tetapan.
  envApiKey: import.meta.env.VITE_GEMINI_API_KEY || '',
};

export const AppConstants = {
  appName: 'CalMal',
  version: '2.0.0',
};
