// Shared constants, helpers and styles used across App.jsx and the lazy-loaded
// views (e.g. StatsView). Kept dependency-free so it can be imported anywhere.

export const PROVIDERS = [
  { id: "buyme", name: "BuyMe", color: "#E91E8C", icon: "🎁", checkUrl: "https://www.buyme.co.il/balance" },
  { id: "dreamcard", name: "Dream Card VIP", color: "#6C3FC5", icon: "💜", checkUrl: "https://www.dreamcard.co.il" },
  { id: "giftcard", name: "Gift Card", color: "#FF6B35", icon: "🃏", checkUrl: null },
  { id: "coupon", name: "קופון", color: "#00B894", icon: "✂️", checkUrl: null },
  { id: "amazon", name: "Amazon", color: "#FF9900", icon: "📦", checkUrl: "https://www.amazon.com/gc/redeem" },
  { id: "google", name: "Google Play", color: "#4285F4", icon: "🎮", checkUrl: "https://play.google.com/store/account/giftcards" },
  { id: "credit", name: "זיכוי חנות", color: "#0ea5e9", icon: "↩️", checkUrl: null },
  { id: "other", name: "אחר", color: "#636E72", icon: "🏷️", checkUrl: null },
];

export const CATEGORIES = ["קניות", "אוכל", "בידור", "טיסות ונסיעות", "טכנולוגיה", "ביגוד", "יופי וטיפוח", "ספרים", "אחר"];
export const CATEGORY_ICONS = { "קניות": "🛍", "אוכל": "🍔", "בידור": "🎭", "טיסות ונסיעות": "✈️", "טכנולוגיה": "💻", "ביגוד": "👗", "יופי וטיפוח": "💄", "ספרים": "📚", "אחר": "📌" };
export const SORT_OPTIONS = [
  { id: "expiry", label: "תוקף קרוב" },
  { id: "amount", label: "סכום גבוה" },
  { id: "newest", label: "חדש ביותר" },
  { id: "name", label: "שם ספק" },
];

export const fmt = (n) => `₪${Number(n).toLocaleString("he-IL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const fmtDate = (d) => d ? new Date(d).toLocaleDateString("he-IL") : "—";
export const daysLeft = (expiry) => { if (!expiry) return null; return Math.ceil((new Date(expiry) - new Date()) / 86400000); };
export const isExpired = (e) => e && new Date(e) < new Date();
export const isExpiringSoon = (e) => { const d = daysLeft(e); return d !== null && d > 0 && d <= 30; };
export const provider = (id) => PROVIDERS.find((p) => p.id === id) || PROVIDERS[PROVIDERS.length - 1];

// Luhn checksum — used as a soft typo check for card-number style codes
// (e.g. Max / Dream Card VIP). Returns true (= "no problem") for anything that
// isn't a 12–19 digit number, so non-card vouchers are never flagged. A false
// result means the digits look like a card number but fail the checksum, i.e.
// the number was probably mistyped. This never proves a card is real/active.
export function luhnValid(input) {
  const digits = String(input || "").replace(/\D/g, "");
  if (digits.length < 12 || digits.length > 19) return true; // not card-shaped → don't flag
  let sum = 0, alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48;
    if (alt) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
    alt = !alt;
  }
  return sum % 10 === 0;
}

export const S = {
  page: { minHeight: "100vh", background: "#0a0f1e", color: "#e8eaf6", fontFamily: "'Segoe UI', 'Arial', sans-serif" },
  container: { maxWidth: 520, margin: "0 auto", padding: "20px 16px 110px" },
  title: { fontSize: 24, fontWeight: 800, color: "#f3f4f6", margin: 0 },
  backBtn: { background: "none", border: "none", color: "#6c63ff", fontSize: 14, cursor: "pointer", padding: "6px 0", fontFamily: "inherit", fontWeight: 600 },
  addBtn: { background: "linear-gradient(135deg, #6c63ff, #a855f7)", border: "none", color: "#fff", padding: "9px 18px", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" },
  chipBtn: { border: "1px solid #1f2937", color: "#9ca3af", padding: "6px 13px", borderRadius: 20, fontSize: 12, cursor: "pointer", fontFamily: "inherit", fontWeight: 600, background: "#111827" },
  card: { background: "#111827", borderRadius: 20, padding: 22, border: "1px solid #1f2937" },
  sectionCard: { background: "#111827", borderRadius: 18, padding: 20, border: "1px solid #1f2937", marginBottom: 16 },
  sectionTitle: { color: "#6b7280", fontSize: 12, fontWeight: 700, marginBottom: 16, textTransform: "uppercase", letterSpacing: 1, margin: 0 },
  formGroup: { marginBottom: 16 },
  label: { display: "block", color: "#9ca3af", fontSize: 12, marginBottom: 7, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 },
  input: { width: "100%", background: "#0a0f1e", border: "1px solid #1f2937", borderRadius: 12, padding: "12px 14px", color: "#e8eaf6", fontSize: 15, fontFamily: "inherit", outline: "none", boxSizing: "border-box" },
  primaryBtn: { width: "100%", background: "linear-gradient(135deg, #6c63ff, #a855f7)", border: "none", color: "#fff", padding: "14px", borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginTop: 6 },
  outlineBtn: { width: "100%", background: "none", border: "1px solid #1f2937", color: "#9ca3af", padding: "11px 14px", borderRadius: 14, fontSize: 14, cursor: "pointer", fontFamily: "inherit", fontWeight: 600 },
  progressBg: { background: "#1f2937", borderRadius: 99, height: 5, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 99, transition: "width 0.6s ease" },
  providerBtn: { border: "none", borderRadius: 12, padding: "12px 6px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", fontFamily: "inherit", color: "#fff", transition: "all 0.15s" },
};
