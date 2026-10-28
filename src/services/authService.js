import { getCurrentUser, supabase } from './supabaseClient.js';
import { mergeGuestDataToCloud } from './syncService.js';

const VAULT_KEY = 'calmal_auth_vault';
const ACTIVE_KEY = 'calmal_active_auth_key';
const usernameEmail = (username) => `${username.trim().toLowerCase()}@users.calmal.app`;

const bytes = (value) => typeof value === 'string' ? new TextEncoder().encode(value) : new Uint8Array(value);
const base64url = (value) => {
  let binary = '';
  for (const byte of new Uint8Array(value)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const fromBase64url = (value) => {
  const binary = atob(String(value).replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
};
const hex = (value) => [...new Uint8Array(value)].map((byte) => byte.toString(16).padStart(2, '0')).join('');

export function validateUsername(username) { return /^[a-z0-9_]{3,32}$/.test(String(username || '').trim().toLowerCase()); }
export function validatePassword(password) { return typeof password === 'string' && password.length >= 8 && /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password); }
export function getAuthVault() { try { return JSON.parse(localStorage.getItem(VAULT_KEY) || 'null'); } catch { return null; } }
export function isCombinedAuthActive() { return typeof sessionStorage !== 'undefined' && Boolean(sessionStorage.getItem(ACTIVE_KEY)); }
export function hasCombinedAuthVault() { return Boolean(getAuthVault()); }
export function clearActiveAuth() { sessionStorage?.removeItem(ACTIVE_KEY); }

async function derivePasswordKey(username, password) {
  const salt = await crypto.subtle.digest('SHA-256', bytes(`calmal_salt_${username.trim().toLowerCase()}`));
  const material = await crypto.subtle.importKey('raw', bytes(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, material, { name: 'HMAC', hash: 'SHA-256', length: 256 }, false, ['sign']);
}
async function deriveEncryptionKey(username, password) {
  const salt = await crypto.subtle.digest('SHA-256', bytes(`calmal_vault_${username.trim().toLowerCase()}`));
  const material = await crypto.subtle.importKey('raw', bytes(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
async function encryptSecret(username, password, secret) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveEncryptionKey(username, password);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, secret);
  return { iv: base64url(iv), encryptedBioSecret: base64url(ciphertext) };
}
async function decryptSecret(username, password, vault) {
  try {
    const key = await deriveEncryptionKey(username, password);
    return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64url(vault.iv) }, key, fromBase64url(vault.encryptedBioSecret)));
  } catch {
    throw new Error('Incorrect username or password.');
  }
}

export async function isBiometricAvailable() {
  if (typeof window === 'undefined' || !window.PublicKeyCredential) return false;
  if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable !== 'function') return false;
  try { return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable(); } catch { return false; }
}

async function createFallbackDeviceCredential(username) {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent || 'web' : 'web';
  const digest = await crypto.subtle.digest('SHA-256', bytes(`calmal_device_cred_${username}_${ua}`));
  return {
    credentialId: base64url(new Uint8Array(digest).slice(0, 24)),
    biometricSecret: crypto.getRandomValues(new Uint8Array(32)),
    fallback: true,
  };
}

async function registerBiometric(username) {
  const bioAvailable = await isBiometricAvailable();
  if (!bioAvailable || !navigator.credentials?.create || !window.PublicKeyCredential) {
    return createFallbackDeviceCredential(username);
  }
  try {
    const credential = await navigator.credentials.create({ publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rp: { name: 'CalMal', id: location.hostname || 'localhost' },
      user: { id: bytes(username), name: username, displayName: username },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'preferred' },
      timeout: 60000,
    } });
    if (!credential) throw new Error('Biometric registration was cancelled.');
    return { credentialId: base64url(credential.rawId), biometricSecret: crypto.getRandomValues(new Uint8Array(32)), fallback: false };
  } catch (err) {
    if (err?.name === 'NotAllowedError') throw new Error('Biometric scan was cancelled.');
    return createFallbackDeviceCredential(username);
  }
}

async function verifyBiometric(credentialId, isFallback = false) {
  if (isFallback || !(await isBiometricAvailable()) || !navigator.credentials?.get || !window.PublicKeyCredential) {
    return { fallback: true };
  }
  try {
    const assertion = await navigator.credentials.get({ publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rpId: location.hostname || 'localhost',
      allowCredentials: [{ type: 'public-key', id: fromBase64url(credentialId) }],
      userVerification: 'required',
      timeout: 60000,
    } });
    const data = assertion?.response?.authenticatorData;
    if (!data || !(new Uint8Array(data)[32] & 0x04)) throw new Error('Biometric verification failed.');
    return assertion;
  } catch (err) {
    if (err?.name === 'NotAllowedError') throw new Error('Biometric scan was cancelled.');
    throw err;
  }
}

export async function generateCombinedAuthKey(username, password, credentialId, biometricSecret) {
  const key = await derivePasswordKey(username, password);
  const signature = await crypto.subtle.sign('HMAC', key, new Uint8Array([...biometricSecret, ...bytes(credentialId)]));
  const authKey = hex(signature);
  const authKeyVerifier = hex(await crypto.subtle.digest('SHA-256', bytes(authKey)));
  return { authKey, authKeyVerifier };
}

async function optionalCloudSignUp(username, password) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.auth.signUp({ email: usernameEmail(username), password, options: { data: { username } } });
    if (error && !/already registered/i.test(error.message || '')) throw error;
    return data;
  } catch (err) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return null;
    throw err;
  }
}

export async function registerWithCombinedAuth(username, password) {
  const normalized = String(username || '').trim().toLowerCase();
  if (!validateUsername(normalized)) throw new Error('Username must be 3–32 letters, numbers, or underscores.');
  if (!validatePassword(password)) throw new Error('Password needs 8+ characters with uppercase, lowercase, and a number.');
  const existingVault = getAuthVault();
  if (existingVault && existingVault.username === normalized) {
    throw new Error('Account already exists on this device. Switch to Sign In.');
  }
  await optionalCloudSignUp(normalized, password);
  const { credentialId, biometricSecret, fallback } = await registerBiometric(normalized);
  const { authKeyVerifier, authKey } = await generateCombinedAuthKey(normalized, password, credentialId, biometricSecret);
  const encrypted = await encryptSecret(normalized, password, biometricSecret);
  localStorage.setItem(VAULT_KEY, JSON.stringify({ username: normalized, credentialId, authKeyVerifier, fallback: Boolean(fallback), ...encrypted }));
  sessionStorage.setItem(ACTIVE_KEY, authKey);
  await mergeGuestDataToCloud();
  return { success: true, username: normalized, authKey };
}

export async function loginWithCombinedAuth(username, password) {
  const normalized = String(username || '').trim().toLowerCase();
  if (!validateUsername(normalized)) throw new Error('Please enter a valid username.');
  const vault = getAuthVault();
  if (!vault || vault.username !== normalized) throw new Error('No account found for @' + normalized + '. Create an account first.');
  const biometricSecret = await decryptSecret(normalized, password, vault);
  if (supabase && (typeof navigator === 'undefined' || navigator.onLine)) {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: usernameEmail(normalized), password });
      if (error && !/invalid|not confirmed/i.test(error.message || '')) throw error;
    } catch {
      /* offline / local vault verified */
    }
  }
  await verifyBiometric(vault.credentialId, vault.fallback);
  const { authKey, authKeyVerifier } = await generateCombinedAuthKey(normalized, password, vault.credentialId, biometricSecret);
  if (authKeyVerifier !== vault.authKeyVerifier) throw new Error('Authentication key verification failed.');
  sessionStorage.setItem(ACTIVE_KEY, authKey);
  await mergeGuestDataToCloud();
  return { success: true, username: normalized, authKey };
}

export async function signOut() {
  clearActiveAuth();
  if (supabase) {
    try { await supabase.auth.signOut(); } catch {}
  }
}

export async function getAuthUser() {
  const cloudUser = await getCurrentUser();
  if (cloudUser) return cloudUser;
  const vault = getAuthVault();
  if (vault?.username && isCombinedAuthActive()) {
    return { username: vault.username, user_metadata: { username: vault.username } };
  }
  return null;
}

export async function rebindBiometric(username, password) {
  const normalized = username.trim().toLowerCase();
  const vault = getAuthVault();
  if (!vault || vault.username !== normalized) throw new Error('Sign in first.');
  await decryptSecret(normalized, password, vault);
  const { credentialId, biometricSecret, fallback } = await registerBiometric(normalized);
  const { authKeyVerifier, authKey } = await generateCombinedAuthKey(normalized, password, credentialId, biometricSecret);
  const encrypted = await encryptSecret(normalized, password, biometricSecret);
  localStorage.setItem(VAULT_KEY, JSON.stringify({ username: normalized, credentialId, authKeyVerifier, fallback: Boolean(fallback), ...encrypted }));
  sessionStorage.setItem(ACTIVE_KEY, authKey);
  return { success: true };
}
