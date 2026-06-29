// Standalone test for src/crypto.js — run with:  node test/crypto.test.mjs
// Uses Node's built-in Web Crypto (Node 18+). No external deps.
import assert from "node:assert/strict";
import {
  createVault,
  unlockVault,
  unlockWithRecovery,
  rewrapPassphrase,
  rewrapRecovery,
  encryptField,
  decryptField,
  generateRecoveryCode,
  normalizeRecoveryCode,
  decryptAny,
  encryptCode,
  createPinRecord,
  verifyPinRecord,
  encryptBackup,
  decryptBackup,
  isEncryptedBackup,
  isArgon2Record,
} from "../src/crypto.js";

let passed = 0;
async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e) {
    console.error(`  ✗ ${name}\n      ${e.message}`);
    process.exitCode = 1;
  }
}

console.log("crypto.js — envelope encryption");

await test("setup → unlock with passphrase → field round-trips", async () => {
  const recovery = generateRecoveryCode();
  const { dek, keyRecord } = await createVault("correct horse battery", recovery);
  const enc = await encryptField("GIFT-1234-ABCD", dek);
  assert.ok(enc.startsWith("v2:"), "ciphertext should be v2-prefixed");
  assert.notEqual(enc, "GIFT-1234-ABCD", "should not be plaintext");

  const { dek: dek2 } = await unlockVault("correct horse battery", keyRecord);
  assert.equal(await decryptField(enc, dek2), "GIFT-1234-ABCD");
});

await test("wrong passphrase throws (cannot unlock)", async () => {
  const recovery = generateRecoveryCode();
  const { keyRecord } = await createVault("right-pass", recovery);
  await assert.rejects(() => unlockVault("wrong-pass", keyRecord));
});

await test("recovery code unlocks the same DEK", async () => {
  const recovery = generateRecoveryCode();
  const { dek, keyRecord } = await createVault("my-pass", recovery);
  const enc = await encryptField("4040", dek);

  const { dek: dekR } = await unlockWithRecovery(recovery, keyRecord);
  assert.equal(await decryptField(enc, dekR), "4040");

  await assert.rejects(() => unlockWithRecovery("WRONGRECOVERYCODE", keyRecord));
});

await test("change passphrase: new works, old fails, data still readable", async () => {
  const recovery = generateRecoveryCode();
  const { dek, dekRaw, keyRecord } = await createVault("old-pass", recovery);
  const enc = await encryptField("secret-code", dek);

  const updated = await rewrapPassphrase(dekRaw, "new-pass");
  const merged = { ...keyRecord, ...updated };

  const { dek: dekNew } = await unlockVault("new-pass", merged);
  assert.equal(await decryptField(enc, dekNew), "secret-code", "data readable after rewrap");
  await assert.rejects(() => unlockVault("old-pass", merged), "old passphrase must fail");
});

await test("regenerate recovery: old recovery fails, new one works", async () => {
  const recovery = generateRecoveryCode();
  const { dek, dekRaw, keyRecord } = await createVault("pass", recovery);
  const enc = await encryptField("xyz", dek);

  const { recoveryCode: newCode, fields } = await rewrapRecovery(dekRaw);
  const merged = { ...keyRecord, ...fields };

  const { dek: dekNew } = await unlockWithRecovery(newCode, merged);
  assert.equal(await decryptField(enc, dekNew), "xyz");
  await assert.rejects(() => unlockWithRecovery(recovery, merged), "old recovery code must fail");
});

await test("decryptField passes through null/plaintext untouched", async () => {
  const recovery = generateRecoveryCode();
  const { dek } = await createVault("p", recovery);
  assert.equal(await decryptField(null, dek), null);
  assert.equal(await decryptField("", dek), "");
  assert.equal(await decryptField("not-encrypted", dek), "not-encrypted");
});

await test("recovery code format ≈ 100 bits, normalizes round-trip", async () => {
  const code = generateRecoveryCode();
  assert.match(code, /^[A-Z2-9]{5}-[A-Z2-9]{5}-[A-Z2-9]{5}-[A-Z2-9]{5}$/);
  assert.equal(normalizeRecoveryCode(code.toLowerCase().replace(/-/g, " ")), code.replace(/-/g, ""));
});

await test("two vaults produce different ciphertext for same input", async () => {
  const r1 = generateRecoveryCode();
  const r2 = generateRecoveryCode();
  const v1 = await createVault("a", r1);
  const v2 = await createVault("a", r2);
  const e1 = await encryptField("same", v1.dek);
  const e2 = await encryptField("same", v2.dek);
  assert.notEqual(e1, e2, "different DEKs → different ciphertext");
});

await test("decryptAny handles v2, legacy 'enc:', and plaintext", async () => {
  const { dek } = await createVault("pw", generateRecoveryCode());
  const v2 = await encryptField("v2secret", dek);
  assert.equal(await decryptAny(v2, dek, "user-1"), "v2secret");

  const legacy = await encryptCode("legacysecret", "user-1"); // produces old "enc:" format
  assert.ok(legacy.startsWith("enc:"));
  assert.equal(await decryptAny(legacy, dek, "user-1"), "legacysecret");

  assert.equal(await decryptAny("justplain", dek, "user-1"), "justplain");
  assert.equal(await decryptAny(null, dek, "user-1"), null);
});

await test("migration round-trip: legacy 'enc:' → v2 stays readable", async () => {
  const userId = "user-42";
  const stored = await encryptCode("CARD-9999", userId); // simulate an existing legacy row
  const { dek, keyRecord } = await createVault("pw", generateRecoveryCode());

  // mirror migrateLegacyCards: decryptAny(legacy) → encryptField(v2)
  const plain = await decryptAny(stored, dek, userId);
  assert.equal(plain, "CARD-9999");
  const migrated = await encryptField(plain, dek);
  assert.ok(migrated.startsWith("v2:"));

  // after migration, a fresh unlock can still read it
  const { dek: dek2 } = await unlockVault("pw", keyRecord);
  assert.equal(await decryptAny(migrated, dek2, userId), "CARD-9999");
});

await test("reveal PIN: correct verifies, wrong fails, record hides the PIN", async () => {
  const rec = await createPinRecord("135790");
  assert.equal(await verifyPinRecord("135790", rec), true);
  assert.equal(await verifyPinRecord("000000", rec), false);
  assert.equal(await verifyPinRecord("135790", null), false);
  assert.ok(!JSON.stringify(rec).includes("135790"), "stored record must not contain the PIN");
});

await test("encrypts image data-URLs and multiline notes", async () => {
  const { dek } = await createVault("pw", generateRecoveryCode());
  const image = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBD" + "A".repeat(500);
  const note = "שורה ראשונה\nשורה שנייה עם תווים מיוחדים: %$#@\nוסוף";
  const encImg = await encryptField(image, dek);
  const encNote = await encryptField(note, dek);
  assert.ok(encImg.startsWith("v2:") && encNote.startsWith("v2:"));
  assert.equal(await decryptField(encImg, dek), image);
  assert.equal(await decryptField(encNote, dek), note);
});

await test("backup: encrypts, round-trips, wrong password fails, never plaintext", async () => {
  const payload = JSON.stringify({ cards: [{ code: "SECRET-CODE", cvv: "123" }] });
  const enc = await encryptBackup(payload, "backup-pass");
  assert.ok(isEncryptedBackup(enc));
  assert.ok(!JSON.stringify(enc).includes("SECRET-CODE"), "backup file must not contain plaintext");
  assert.equal(await decryptBackup(enc, "backup-pass"), payload);
  await assert.rejects(() => decryptBackup(enc, "wrong-pass"));
});

await test("luhnValid flags mistyped card numbers, ignores non-card codes", async () => {
  const { luhnValid } = await import("../src/shared.js");
  assert.equal(luhnValid("4111111111111111"), true);   // valid checksum
  assert.equal(luhnValid("4111 1111 1111 1111"), true); // spaces ignored
  assert.equal(luhnValid("4111111111111112"), false);   // single-digit typo
  assert.equal(luhnValid("GIFT-1234-ABCD"), true);      // not card-shaped → not flagged
  assert.equal(luhnValid("123"), true);                 // too short → not flagged
  assert.equal(luhnValid(""), true);
});

await test("passphraseScore: long/varied = strong, trivial = weak", async () => {
  const { passphraseScore } = await import("../src/shared.js");
  assert.equal(passphraseScore(""), 0);
  assert.ok(passphraseScore("abc") <= 1);                     // too short
  assert.ok(passphraseScore("password") <= 1);                // common
  assert.ok(passphraseScore("aaaaaaaaaaaa") <= 1);            // repeated char
  assert.ok(passphraseScore("correct horse battery staple") >= 3); // long passphrase
  assert.equal(passphraseScore("Tr0ub4dour&3xtra"), 4);      // long + all classes
});

await test("legacy PBKDF2 record still unlocks (no lockout for existing users)", async () => {
  const subtle = globalThis.crypto.subtle;
  const enc = new TextEncoder();
  const b64 = (u8) => Buffer.from(u8).toString("base64");
  // Build a legacy vault by hand exactly like the old code did: PBKDF2 KEK, no a2$ prefix.
  const dekRaw = crypto.getRandomValues(new Uint8Array(32));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const base = await subtle.importKey("raw", enc.encode("legacy-pass"), { name: "PBKDF2" }, false, ["deriveKey"]);
  const kek = await subtle.deriveKey({ name: "PBKDF2", salt, iterations: 310000, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await subtle.encrypt({ name: "AES-GCM", iv }, kek, dekRaw));
  const combined = new Uint8Array(iv.length + ct.length); combined.set(iv); combined.set(ct, iv.length);
  const keyRecord = { salt: b64(salt), iterations: 310000, wrapped_dek: b64(combined) };

  assert.equal(isArgon2Record(keyRecord), false);
  const { dekRaw: out } = await unlockVault("legacy-pass", keyRecord);
  assert.equal(Buffer.from(out).toString("hex"), Buffer.from(dekRaw).toString("hex"), "legacy DEK recovered");
  await assert.rejects(() => unlockVault("wrong", keyRecord));
});

await test("vault uses Argon2id for the passphrase, round-trips, wrong pass fails", async () => {
  const { dek, keyRecord } = await createVault("correct horse battery", generateRecoveryCode());
  assert.ok(keyRecord.wrapped_dek.startsWith("a2$"), "passphrase wrap should be Argon2id (a2$)");
  assert.equal(isArgon2Record(keyRecord), true);
  const enc = await encryptField("ARGON-CODE", dek);
  const { dek: dek2 } = await unlockVault("correct horse battery", keyRecord);
  assert.equal(await decryptField(enc, dek2), "ARGON-CODE");
  await assert.rejects(() => unlockVault("wrong", keyRecord));
});

console.log(`\n${passed} passed`);
