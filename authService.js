import { getCurrentUser, supabase } from './supabaseClient.js';
import { mergeGuestDataToCloud } from './syncService.js';

const FLAG = 'calmal_biometric_registered';
const usernameEmail = (username) => `${username.trim().toLowerCase()}@users.calmal.app`;
export function validateUsername(username) { return /^[a-z0-9_]{3,32}$/.test(String(username || '').trim().toLowerCase()); }
export function validatePassword(password) { return typeof password === 'string' && password.length >= 10 && /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password); }
function requireClient() { if (!supabase) throw new Error('Cloud authentication is not configured.'); }
export async function signUp(username, password, profile = {}) {
  requireClient(); const normalized = String(username || '').trim().toLowerCase();
  if (!validateUsername(normalized)) throw new Error('Username must be 3–32 lowercase letters, numbers, or underscores.');
  if (!validatePassword(password)) throw new Error('Password must be 10+ characters with uppercase, lowercase, and a number.');
  const { data, error } = await supabase.auth.signUp({ email: usernameEmail(normalized), password, options: { data: { username: normalized, display_name: profile.display_name || profile.name || normalized } } });
  if (error) throw error; if (data.user) await mergeGuestDataToCloud(); return data;
}
export async function signIn(username, password) {
  requireClient(); const normalized = String(username || '').trim().toLowerCase();
  if (!validateUsername(normalized) || !password) throw new Error('Enter a valid username and password.');
  const { data, error } = await supabase.auth.signInWithPassword({ email: usernameEmail(normalized), password });
  if (error) throw error; await mergeGuestDataToCloud(); return data;
}
export async function signOut() { if (supabase) await supabase.auth.signOut(); }
export async function getAuthUser() { return getCurrentUser(); }
export async function isBiometricAvailable() {
  return typeof window !== 'undefined' && !!window.PublicKeyCredential && typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function' && await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
}
function passkeyMethod(name) { return supabase?.auth?.[name]; }
export async function registerBiometrics(options = {}) {
  requireClient(); const method = passkeyMethod('registerPasskey');
  if (typeof method === 'function') { await method.call(supabase.auth, options); localStorage.setItem(FLAG, 'true'); return true; }
  if (!navigator.credentials?.create || !options.publicKey) throw new Error('Passkeys need a configured WebAuthn challenge endpoint.');
  const credential = await navigator.credentials.create({ publicKey: { ...options.publicKey, authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' } } });
  if (!credential) throw new Error('Biometric registration was cancelled.');
  localStorage.setItem(FLAG, 'true'); return credential;
}
export async function signInWithBiometrics(options = {}) {
  requireClient(); const method = passkeyMethod('signInWithPasskey');
  if (typeof method === 'function') { const result = await method.call(supabase.auth, options); await mergeGuestDataToCloud(); return result; }
  if (!navigator.credentials?.get || !options.publicKey) throw new Error('Passkeys need a configured WebAuthn challenge endpoint.');
  const credential = await navigator.credentials.get({ publicKey: options.publicKey });
  if (!credential) throw new Error('Biometric sign-in was cancelled.');
  throw new Error('Biometric assertion verification is not configured on this project.');
}
export function hasRegisteredBiometric() { return typeof localStorage !== 'undefined' && localStorage.getItem(FLAG) === 'true'; }
