// Gemini AI & Gemma Model Configuration with Multi-Tier Fallback Cascade
export const GeminiConfig = {
  // Model Fallback Hierarchy:
  // 1. Primary: Gemini 3.5 Flash Lite (ultra-fast, multimodal)
  // 2. Fallback 1: Gemini 3.1 Flash Lite (if quota or rate limit is reached)
  // 3. Fallback 2: Gemma 4 31B (open weights powerhouse for complex reasoning)
  models: [
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite',
    'gemma-4-31b',
  ],
  defaultModel: 'gemini-3.5-flash-lite',
  modelName: 'gemini-3.5-flash-lite',
  activeModel: 'gemini-3.5-flash-lite',

  getEndpoint(model = this.activeModel) {
    return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  },

  get apiEndpoint() {
    return this.getEndpoint(this.activeModel);
  },

  // Environment key from .env (VITE_GEMINI_API_KEY) — can be overridden in Profile > Settings
  envApiKey: import.meta.env.VITE_GEMINI_API_KEY || '',
};

export const AppConstants = {
  appName: 'CalMal',
  version: '2.5.0',
};
