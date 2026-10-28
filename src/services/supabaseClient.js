const env = (typeof import.meta !== 'undefined' && import.meta.env) || globalThis.process?.env || {};
const SUPABASE_URL = env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
export const supabase = null;

// Local accounts never initialize Supabase or reuse its persisted session.
export async function getCurrentUser() {
  return null;
}

export function scheduleCloudSync() {}

