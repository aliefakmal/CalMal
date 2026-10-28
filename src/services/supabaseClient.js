// Supabase Client — Offline-First & Guest-Friendly Cloud Sync
import { createClient } from '@supabase/supabase-js';
import { getActiveUsername } from './authService.js';

const env = (typeof import.meta !== 'undefined' && import.meta.env) || globalThis.process?.env || {};
const SUPABASE_URL = env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        storageKey: 'calmal-auth',
      },
    })
  : null;

/**
 * Get current authenticated user session if available
 */
export async function getCurrentUser() {
  if (!supabase) return null;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user || null;
  } catch (err) {
    console.warn('[Supabase] Failed to check auth session:', err);
    return null;
  }
}

/**
 * Sync local state to Supabase in the background (debounced)
 */
let syncTimer = null;
export function scheduleCloudSync(localState) {
  const username = getActiveUsername();
  clearTimeout(syncTimer);
  if (!supabase || !username) return;

  syncTimer = setTimeout(async () => {
    syncTimer = null;
    if (getActiveUsername() !== username) return;
    try {
      const user = await getCurrentUser();
      if (!user || getActiveUsername() !== username) return;

      if (localState.profile) {
        const { error } = await supabase.from('profiles').upsert({
          id: user.id,
          username: localState.profile.username || user.user_metadata?.username || user.email?.split('@')[0] || `user_${user.id.slice(0, 8)}`,
          display_name: localState.profile.name || 'Hero',
          gender: localState.profile.gender,
          age: localState.profile.age,
          height_cm: localState.profile.height,
          weight_kg: localState.profile.weight,
          activity_level: localState.profile.activity,
          selected_companion: localState.profile.selectedCompanion || 'deku',
          updated_at: new Date().toISOString(),
        });
        if (error) throw error;
      }

      if (getActiveUsername() !== username) return;
      console.info('[Supabase] Cloud state sync complete.');
    } catch (err) {
      console.warn('[Supabase] Background sync failed:', err.message);
    }
  }, 2500);
}

