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

console.log(`\n${passed} passed`);
