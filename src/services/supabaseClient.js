// Supabase Client — Offline-First & Guest-Friendly Cloud Sync
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || '';
const SUPABASE_ANON_KEY = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || '';

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
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
  if (!supabase) return; // Silent no-op for guest/offline mode

  clearTimeout(syncTimer);
  syncTimer = setTimeout(async () => {
    try {
      const user = await getCurrentUser();
      if (!user) return; // User is not logged in, keep data local

      // 1. Upsert profile
      if (localState.profile) {
        await supabase.from('profiles').upsert({
          id: user.id,
          display_name: localState.profile.name || 'Hero',
          gender: localState.profile.gender,
          age: localState.profile.age,
          height_cm: localState.profile.height,
          weight_kg: localState.profile.weight,
          target_weight_kg: localState.profile.targetWeight,
          activity_level: localState.profile.activity,
          fitness_goal: localState.profile.goal,
          selected_companion: localState.profile.selectedCompanion || 'deku',
          sound_enabled: localState.settings?.soundEnabled !== false,
          updated_at: new Date().toISOString(),
        });
      }

      console.info('[Supabase] Cloud state sync complete.');
    } catch (err) {
      console.warn('[Supabase] Background sync failed:', err.message);
    }
  }, 2500);
}
