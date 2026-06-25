// ─── ENCRYPTION ───────────────────────────────────────────────────────────────
// Uses Web Crypto API (built into all modern browsers)
// Each user's data is encrypted with a key derived from their user ID
// Even if the database is breached, codes cannot be read without the user's identity

const APP_SECRET = "giftwalletapp-v1-secret-2024";

async function deriveKey(userId) {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(userId + APP_SECRET),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: new TextEncoder().encode("giftwallet-salt"), iterations: 100000, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptCode(plaintext, userId) {
  if (!plaintext || !userId) return plaintext;
  try {
    const key = await deriveKey(userId);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      new TextEncoder().encode(plaintext)
    );
    // Pack iv + encrypted into base64
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);
    return "enc:" + btoa(String.fromCharCode(...combined));
  } catch {
    return plaintext; // fallback: save as plain if crypto fails
  }
}

export async function decryptCode(ciphertext, userId) {
  if (!ciphertext || !userId || !ciphertext.startsWith("enc:")) return ciphertext;
  try {
    const key = await deriveKey(userId);
    const combined = Uint8Array.from(atob(ciphertext.slice(4)), c => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);
    const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
    return new TextDecoder().decode(decrypted);
  } catch {
    return ciphertext; // fallback: return as-is if decryption fails
  }
}
