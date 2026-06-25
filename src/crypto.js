// ─── ENCRYPTION ───────────────────────────────────────────────────────────────
// Envelope encryption (Web Crypto API, built into all modern browsers).
//
//   • Each user has a random 256-bit Data Encryption Key (DEK) that encrypts every
//     card field (code, CVV, ...).
//   • The DEK is itself encrypted ("wrapped") with a Key-Encryption-Key (KEK) that
//     is derived from the user's PASSPHRASE via PBKDF2. The passphrase never leaves
//     the device and is never stored.
//   • A second copy of the DEK is wrapped with a KEK derived from a one-time
//     RECOVERY CODE, so a user who forgets the passphrase can still get back in.
//   • Only the wrapped DEKs + random salts are stored on the server (user_keys).
//
// Consequence: even with a full database dump, card codes cannot be read without
// the passphrase or the recovery code — neither of which is on the server.
//
// Wire format for a stored field:  "v2:" + base64( iv(12 bytes) || ciphertext )
// ──────────────────────────────────────────────────────────────────────────────

const KDF_ITERATIONS = 310000;
const FIELD_PREFIX = "v2:";

const subtle = globalThis.crypto.subtle;
const randomBytes = (n) => globalThis.crypto.getRandomValues(new Uint8Array(n));

// ── base64 <-> bytes ──
function bytesToB64(bytes) {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}
function b64ToBytes(b64) {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

// ── PBKDF2: derive a wrapping key (KEK) from a human secret ──
async function deriveKEK(secret, saltBytes, iterations = KDF_ITERATIONS) {
  const base = await subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  return subtle.deriveKey(
    { name: "PBKDF2", salt: saltBytes, iterations, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

// ── low-level AES-GCM with a given CryptoKey; output/input is base64(iv||ct) ──
async function aesEncrypt(key, dataBytes) {
  const iv = randomBytes(12);
  const ct = new Uint8Array(await subtle.encrypt({ name: "AES-GCM", iv }, key, dataBytes));
  const out = new Uint8Array(iv.length + ct.length);
  out.set(iv);
  out.set(ct, iv.length);
  return bytesToB64(out);
}
async function aesDecrypt(key, b64) {
  const raw = b64ToBytes(b64);
  const iv = raw.slice(0, 12);
  const ct = raw.slice(12);
  // Throws (GCM auth failure) if the key is wrong — that's how we detect a bad passphrase.
  return new Uint8Array(await subtle.decrypt({ name: "AES-GCM", iv }, key, ct));
}

async function importDEK(rawBytes) {
  return subtle.importKey("raw", rawBytes, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

// ── Vault lifecycle ───────────────────────────────────────────────────────────

// Create a brand-new vault. Returns the in-memory keys plus the record to persist
// in the user_keys table. `dekRaw` is kept only in memory (needed to re-wrap on
// passphrase change); never send it to the server.
export async function createVault(passphrase, recoveryCode) {
  const dekRaw = randomBytes(32);
  const salt = randomBytes(16);
  const recoverySalt = randomBytes(16);
  const kek = await deriveKEK(passphrase, salt);
  const rkek = await deriveKEK(normalizeRecoveryCode(recoveryCode), recoverySalt);
  return {
    dek: await importDEK(dekRaw),
    dekRaw,
    keyRecord: {
      salt: bytesToB64(salt),
      iterations: KDF_ITERATIONS,
      wrapped_dek: await aesEncrypt(kek, dekRaw),
      recovery_salt: bytesToB64(recoverySalt),
      recovery_wrapped_dek: await aesEncrypt(rkek, dekRaw),
    },
  };
}

// Unlock with the passphrase. Throws if the passphrase is wrong.
export async function unlockVault(passphrase, keyRecord) {
  const kek = await deriveKEK(passphrase, b64ToBytes(keyRecord.salt), keyRecord.iterations || KDF_ITERATIONS);
  const dekRaw = await aesDecrypt(kek, keyRecord.wrapped_dek);
  return { dek: await importDEK(dekRaw), dekRaw };
}

// Unlock with the one-time recovery code. Throws if the code is wrong.
export async function unlockWithRecovery(recoveryCode, keyRecord) {
  const rkek = await deriveKEK(normalizeRecoveryCode(recoveryCode), b64ToBytes(keyRecord.recovery_salt), keyRecord.iterations || KDF_ITERATIONS);
  const dekRaw = await aesDecrypt(rkek, keyRecord.recovery_wrapped_dek);
  return { dek: await importDEK(dekRaw), dekRaw };
}

// Re-wrap the existing DEK under a new passphrase (used by "change passphrase").
// Returns the passphrase-side fields to update in user_keys. The recovery copy is
// untouched, so the existing recovery code keeps working.
export async function rewrapPassphrase(dekRaw, newPassphrase) {
  const salt = randomBytes(16);
  const kek = await deriveKEK(newPassphrase, salt);
  return {
    salt: bytesToB64(salt),
    iterations: KDF_ITERATIONS,
    wrapped_dek: await aesEncrypt(kek, dekRaw),
  };
}

// Re-wrap the DEK under a freshly generated recovery code (used to regenerate the
// recovery code). Returns { recoveryCode, fields } — show recoveryCode once.
export async function rewrapRecovery(dekRaw) {
  const recoveryCode = generateRecoveryCode();
  const recoverySalt = randomBytes(16);
  const rkek = await deriveKEK(normalizeRecoveryCode(recoveryCode), recoverySalt);
  return {
    recoveryCode,
    fields: {
      recovery_salt: bytesToB64(recoverySalt),
      recovery_wrapped_dek: await aesEncrypt(rkek, dekRaw),
    },
  };
}

// ── Field encryption (uses the unlocked DEK) ──────────────────────────────────

export async function encryptField(plaintext, dek) {
  if (plaintext === null || plaintext === undefined || plaintext === "") return plaintext;
  return FIELD_PREFIX + (await aesEncrypt(dek, new TextEncoder().encode(String(plaintext))));
}

export async function decryptField(value, dek) {
  if (!value || typeof value !== "string" || !value.startsWith(FIELD_PREFIX)) return value;
  const bytes = await aesDecrypt(dek, value.slice(FIELD_PREFIX.length));
  return new TextDecoder().decode(bytes);
}

export function isEncryptedField(value) {
  return typeof value === "string" && value.startsWith(FIELD_PREFIX);
}

// Decrypt a stored field that may be in any of three states:
//   • v2 (current)   → decrypt with the unlocked DEK
//   • legacy "enc:"  → decrypt with the old per-user key (for migration reads)
//   • plaintext      → return as-is
// Never throws: if a legacy value can't be read it is returned unchanged.
export async function decryptAny(value, dek, userId) {
  if (isEncryptedField(value)) return decryptField(value, dek);
  if (isLegacyField(value)) {
    try { return await decryptLegacy(value, userId); } catch { return value; }
  }
  return value;
}

// ── Recovery code generator ───────────────────────────────────────────────────
// 20 chars from a 32-symbol alphabet ≈ 100 bits of entropy. No 0/O/1/I to avoid
// transcription mistakes. Formatted as XXXXX-XXXXX-XXXXX-XXXXX.
export function generateRecoveryCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(20);
  let out = "";
  for (let i = 0; i < 20; i++) out += alphabet[bytes[i] & 31];
  return out.match(/.{1,5}/g).join("-");
}

// Normalize a recovery code typed by the user (case / spaces / dashes) before use.
// All vault functions call this internally, so callers can pass the code exactly
// as it was shown to / typed by the user.
export function normalizeRecoveryCode(input) {
  return String(input || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

// ── LEGACY (v1) — kept ONLY to migrate old data ───────────────────────────────
// Old scheme: key = PBKDF2(userId + APP_SECRET). Insecure (APP_SECRET shipped in
// the bundle, userId stored next to the data) — used only to read existing cards
// during the one-time migration to v2, then no longer written.

const LEGACY_APP_SECRET = "giftwalletapp-v1-secret-2024";

async function deriveLegacyKey(userId) {
  const baseKey = await subtle.importKey(
    "raw",
    new TextEncoder().encode(userId + LEGACY_APP_SECRET),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  return subtle.deriveKey(
    { name: "PBKDF2", salt: new TextEncoder().encode("giftwallet-salt"), iterations: 100000, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export function isLegacyField(value) {
  return typeof value === "string" && value.startsWith("enc:");
}

// Decrypt a legacy "enc:" value. Plaintext (no prefix) passes through unchanged.
// Throws if a legacy value cannot be decrypted (so migration can detect trouble).
export async function decryptLegacy(ciphertext, userId) {
  if (!ciphertext || !userId || !ciphertext.startsWith("enc:")) return ciphertext;
  const key = await deriveLegacyKey(userId);
  const combined = b64ToBytes(ciphertext.slice(4));
  const iv = combined.slice(0, 12);
  const data = combined.slice(12);
  const decrypted = await subtle.decrypt({ name: "AES-GCM", iv }, key, data);
  return new TextDecoder().decode(decrypted);
}

// ── Backwards-compatible exports (still used by App.jsx until the vault flow is
//    wired in). These keep the v1 behavior so the app keeps running mid-migration.
export async function encryptCode(plaintext, userId) {
  if (!plaintext || !userId) return plaintext;
  try {
    const key = await deriveLegacyKey(userId);
    const iv = randomBytes(12);
    const encrypted = await subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plaintext));
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);
    return "enc:" + bytesToB64(combined);
  } catch {
    return plaintext;
  }
}

export async function decryptCode(ciphertext, userId) {
  if (!ciphertext || !userId || !ciphertext.startsWith("enc:")) return ciphertext;
  try {
    return await decryptLegacy(ciphertext, userId);
  } catch {
    return ciphertext;
  }
}
