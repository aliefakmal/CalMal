# CalMal: Combined Username/Password + Biometric Authentication Key Specification

## 1. The Core Idea: How to Combine Both Methods into One Authentication Key

To require and combine **both** Username/Password (Knowledge Factor) and Biometrics (Inherence/Possession Factor) to produce a single **Composite Authentication Key**, we use a **Dual-Factor Cryptographic Key Derivation** workflow built on native browser standards (**Web Crypto API** + **WebAuthn API**) alongside your existing **Supabase** setup.

### How the Key Generation Works

1. **Step 1: Username & Password Derivation ($K_{\text{pwd}}$)**
   * The user enters their `username` (or email) and `password`.
   * The app authenticates the credentials against Supabase Auth (or local credential store if running in offline/PWA mode).
   * Using the browser's native **Web Crypto API (`PBKDF2`)**, the app hashes the `password` using the normalized `username` as a salt ($100,000$ iterations, $\text{SHA-256}$) to derive a 256-bit **Password Key ($K_{\text{pwd}}$)**.

2. **Step 2: Biometric Hardware Verification ($S_{\text{bio}}$)**
   * Using the **WebAuthn API (`navigator.credentials.create` / `navigator.credentials.get`)** with `authenticatorAttachment: "platform"` and `userVerification: "required"`, the device prompts for **Face ID, Touch ID, Windows Hello, or Android Fingerprint**.
   * Upon registration, a high-entropy 256-bit **Biometric Secret ($S_{\text{bio}}$)** and hardware `credentialId` are bound to the user's device.
   * Upon login, the biometric sensor unlocks and signs a challenge, releasing $S_{\text{bio}}$.

3. **Step 3: Combining Both into the Master Authentication Key ($K_{\text{auth}}$)**
   * Neither the password alone nor the biometric scan alone can generate the final key.
   * Once both steps succeed, the app combines $K_{\text{pwd}}$ and $S_{\text{bio}}$ using $\text{HMAC-SHA256}$ (or $\text{HKDF}$):
     $$K_{\text{auth}} = \text{HMAC-SHA256}(K_{\text{pwd}}, S_{\text{bio}} \parallel \text{credentialId})$$
   * This resulting 64-character hex string is your **Composite Authentication Key**. It can be used to:
     * Unlock the user's session in `src/main.js`.
     * Encrypt/decrypt sensitive local profile and meal data in `src/services/store.js`.
     * Authenticate API requests to `api/gemini.js`.

---

## 2. Ready-to-Use Prompt for Codex

Copy and paste the prompt block below directly into **Codex / Cursor / Copilot**, and attach this `.md` file as context:

> **Prompt for Codex:**
> 
> Please implement a Dual-Factor Combined Authentication System (Username/Password + WebAuthn Biometric) that generates a unified cryptographic Authentication Key for the **CalMal** app, following the specification in `biometric_auth_plan.md`.
> 
> Specifically:
> 1. Create `src/services/authService.js` implementing Web Crypto API (`PBKDF2` + `HMAC-SHA256`) and WebAuthn (`navigator.credentials.create` & `navigator.credentials.get` with platform biometrics) to derive a combined `authKey` from both username/password and biometric verification, integrating with `src/services/supabaseClient.js`.
> 2. Create `src/screens/auth.js` providing a sleek mobile-first UI (matching CalMal's existing CSS variables in `src/styles/index.css` and `src/styles/screens.css`) for Registration and Login that walks the user through Step 1 (Username + Password) and Step 2 (Biometric Fingerprint/FaceID scan) to generate and verify their combined Authentication Key.
> 3. Update `src/main.js` so unauthenticated users are routed to the Auth screen before accessing the dashboard, while preserving existing onboarding and companion flows.
> 4. Update `src/screens/profile.js` to display the user's Masked Auth Key status, Biometric binding status, and a "Re-bind Biometric Key" / "Logout" button.
> 5. Add English and Bahasa Melayu translations for all new authentication strings in `src/utils/i18n.js`.

---

## 3. Technical Implementation Blueprint (For Codex Reference)

### A. File Architecture Changes in `CalMal`

* **NEW:** `src/services/authService.js` — Core cryptographic + WebAuthn + Supabase auth logic.
* **NEW:** `src/screens/auth.js` — Dual-step Login & Registration screen UI.
* **MODIFY:** `src/services/store.js` — Store auth session metadata and verify the derived `authKey`.
* **MODIFY:** `src/main.js` — Gate app initialization behind `authService.isAuthenticated()`.
* **MODIFY:** `src/screens/profile.js` — Add Security & Auth Key management card.
* **MODIFY:** `src/utils/i18n.js` — Add `en` and `ms` localization keys for authentication.
* **MODIFY:** `src/styles/screens.css` — Add styles for the biometric scanner pulse animation and auth card.

---

### B. Detailed Specification for `src/services/authService.js`

Codex should implement the following methods using the native browser `window.crypto.subtle` and `window.PublicKeyCredential` APIs (no external npm packages required):

#### 1. Helper: Buffer Conversions
* `bufferToBase64Url(buffer)` and `base64UrlToBuffer(base64url)`
* `bufferToHex(buffer)`

#### 2. Password Key Derivation (`derivePasswordKey(username, password)`)
* Normalize `username` (lowercase, trimmed).
* Encode `password` as `Uint8Array` and import via `crypto.subtle.importKey('raw', ..., 'PBKDF2', false, ['deriveBits', 'deriveKey'])`.
* Salt: `SHA-256` hash of `'calmal_salt_' + username`.
* Derive a `CryptoKey` for `HMAC` (`SHA-256`, 256 bits, $100,000$ iterations).

#### 3. Biometric Registration (`registerBiometric(username)`)
* Check if `window.PublicKeyCredential` is available and `PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()` resolves to `true`.
* Generate a random 32-byte `challenge` and a random 32-byte `biometricSecret` ($S_{\text{bio}}$) via `crypto.getRandomValues(new Uint8Array(32))`.
* Call `navigator.credentials.create({ publicKey })`:
  ```javascript
  const publicKey = {
    challenge: challengeBuffer,
    rp: { name: "CalMal", id: window.location.hostname },
    user: {
      id: new TextEncoder().encode(username),
      name: username,
      displayName: username
    },
    pubKeyCredParams: [
      { type: "public-key", alg: -7 },   // ES256
      { type: "public-key", alg: -257 }  // RS256
    ],
    authenticatorSelection: {
      authenticatorAttachment: "platform",
      userVerification: "required",
      residentKey: "preferred"
    },
    timeout: 60000
  };
  ```
* Return `{ credentialId, biometricSecret }`.

#### 4. Biometric Verification (`verifyBiometric(credentialId)`)
* Generate a random 32-byte `challenge`.
* Call `navigator.credentials.get({ publicKey })`:
  ```javascript
  const publicKey = {
    challenge: challengeBuffer,
    rpId: window.location.hostname,
    allowCredentials: [{
      type: "public-key",
      id: base64UrlToBuffer(credentialId)
    }],
    userVerification: "required",
    timeout: 60000
  };
  ```
* Verify that the assertion response (`authenticatorData` and `signature`) is present and the `User Verified (UV)` bit (`0x04`) in `authenticatorData[32]` is set.

#### 5. Combining Both into the Master Authentication Key (`generateCombinedAuthKey(username, password, credentialId, biometricSecret)`)
* Derive the `hmacKey` ($K_{\text{pwd}}$) using `derivePasswordKey(username, password)`.
* Create the message payload combining `biometricSecret` + `credentialId`.
* Compute signature via `crypto.subtle.sign('HMAC', hmacKey, payloadBuffer)`.
* Convert the resulting 256-bit signature to a 64-character hex string (`authKey`).
* Compute a verification hash $\text{SHA-256}(\text{authKey})$ (`authKeyVerifier`) to store in `localStorage` (and optionally Supabase `user_metadata`) so the raw `authKey` is never stored in plain text at rest, only in `sessionStorage` or memory while logged in.

#### 6. Unified Registration & Login Flows
* **`registerWithCombinedAuth(username, password)`**:
  1. Validate username (min 3 chars) and password (min 8 chars).
  2. If Supabase is configured (`supabaseClient.js`), sign up / sign in the user, or store a salted password verifier locally if in offline mode.
  3. Trigger `registerBiometric(username)`.
  4. Generate the `authKey` using `generateCombinedAuthKey(...)`.
  5. Encrypt the `biometricSecret` using a key derived from the password (`AES-GCM`) and store `{ username, credentialId, encryptedBioSecret, iv, authKeyVerifier }` in `localStorage` under `calmal_auth_vault`.
  6. Store active `authKey` in `sessionStorage.setItem('calmal_active_auth_key', authKey)`.
  7. Return `{ success: true, authKey }`.

* **`loginWithCombinedAuth(username, password)`**:
  1. Retrieve `calmal_auth_vault` for `username`.
  2. Decrypt `encryptedBioSecret` using the password-derived `AES-GCM` key (if the password is wrong, `AES-GCM` decryption will immediately throw an authentication tag error, rejecting Step 1 before or after biometric).
  3. Trigger `verifyBiometric(credentialId)` to require live Fingerprint / FaceID confirmation.
  4. Reconstruct `authKey` via `generateCombinedAuthKey(username, password, credentialId, biometricSecret)`.
  5. Verify $\text{SHA-256}(\text{authKey}) === \text{authKeyVerifier}$.
  6. Store active `authKey` in `sessionStorage` and return `{ success: true, authKey }`.

---

### C. UI/UX Flow in `src/screens/auth.js`

1. **Dual-Step Visual Progress Indicator**:
   * **Step 1 Badge**: `1. Username & Password`
   * **Step 2 Badge**: `2. Biometric Scan`
   * **Result Badge**: `3. Auth Key Unlocked`
2. **Form Controls**:
   * Username input (`#auth-username`)
   * Password input (`#auth-password`) with show/hide toggle
   * Biometric status indicator showing whether platform biometrics (FaceID / TouchID / Fingerprint) are detected on the device.
   * Primary CTA Button: **"Verify Password & Scan Biometric"** (or **"Register Password + Biometric Key"** in Sign-Up tab).
3. **Interactive Companion Integration**:
   * Trigger `companionService` audio/dialogue on successful authentication (e.g., Deku or Bakugou greeting the user once both factors unlock the key).

---

### D. Edge Cases & Security Requirements for Codex

1. **Zero Plaintext Storage**: Never store the raw password or the raw final `authKey` in `localStorage`. Store only the `AES-GCM` encrypted biometric secret (locked by the password) and the `SHA-256` verifier hash of the final composite key.
2. **Cryptographic Binding**: Because `encryptedBioSecret` is encrypted with `AES-GCM` using a key derived from `username + password`, and unlocking it requires passing the WebAuthn `verifyBiometric()` hardware check, an attacker cannot forge the `authKey` if they only steal `localStorage` or only spoof one factor.
3. **Unsupported Device Fallback**: If a desktop browser lacks a biometric sensor (`isUserVerifyingPlatformAuthenticatorAvailable() === false`), allow registration using an external USB/NFC security key or a virtual WebAuthn passkey prompt so development and testing on any laptop work seamlessly.