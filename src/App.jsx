import { useState, useEffect, useRef, useCallback } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { supabase } from "./supabase";
import {
  createVault, unlockVault, unlockWithRecovery, rewrapPassphrase, rewrapRecovery,
  encryptField, decryptAny, generateRecoveryCode,
  createPinRecord, verifyPinRecord,
  encryptBackup, decryptBackup, isEncryptedBackup,
} from "./crypto";
import PrivacyPolicy from "./legal/PrivacyPolicy";
import TermsOfService from "./legal/TermsOfService";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const PROVIDERS = [
  { id: "buyme", name: "BuyMe", color: "#E91E8C", icon: "🎁", checkUrl: "https://www.buyme.co.il/balance" },
  { id: "dreamcard", name: "Dream Card VIP", color: "#6C3FC5", icon: "💜", checkUrl: "https://www.dreamcard.co.il" },
  { id: "giftcard", name: "Gift Card", color: "#FF6B35", icon: "🃏", checkUrl: null },
  { id: "coupon", name: "קופון", color: "#00B894", icon: "✂️", checkUrl: null },
  { id: "amazon", name: "Amazon", color: "#FF9900", icon: "📦", checkUrl: "https://www.amazon.com/gc/redeem" },
  { id: "google", name: "Google Play", color: "#4285F4", icon: "🎮", checkUrl: "https://play.google.com/store/account/giftcards" },
  { id: "credit", name: "זיכוי חנות", color: "#0ea5e9", icon: "↩️", checkUrl: null },
  { id: "other", name: "אחר", color: "#636E72", icon: "🏷️", checkUrl: null },
];

const CATEGORIES = ["קניות", "אוכל", "בידור", "טיסות ונסיעות", "טכנולוגיה", "ביגוד", "יופי וטיפוח", "ספרים", "אחר"];
const CATEGORY_ICONS = { "קניות": "🛍", "אוכל": "🍔", "בידור": "🎭", "טיסות ונסיעות": "✈️", "טכנולוגיה": "💻", "ביגוד": "👗", "יופי וטיפוח": "💄", "ספרים": "📚", "אחר": "📌" };
const SORT_OPTIONS = [
  { id: "expiry", label: "תוקף קרוב" },
  { id: "amount", label: "סכום גבוה" },
  { id: "newest", label: "חדש ביותר" },
  { id: "name", label: "שם ספק" },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const fmt = (n) => `₪${Number(n).toLocaleString("he-IL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("he-IL") : "—";
const daysLeft = (expiry) => { if (!expiry) return null; return Math.ceil((new Date(expiry) - new Date()) / 86400000); };
const isExpired = (e) => e && new Date(e) < new Date();
const isExpiringSoon = (e) => { const d = daysLeft(e); return d !== null && d > 0 && d <= 30; };
const provider = (id) => PROVIDERS.find((p) => p.id === id) || PROVIDERS[PROVIDERS.length - 1];

// ─── COMPONENTS ───────────────────────────────────────────────────────────────

function Toast({ toast }) {
  return (
    <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", background: toast.type === "error" ? "#ef4444" : toast.type === "warn" ? "#f59e0b" : "#10b981", color: "#fff", padding: "12px 28px", borderRadius: 40, fontWeight: 700, fontSize: 14, zIndex: 9999, maxWidth: "90vw", textAlign: "center", boxShadow: "0 8px 32px #0008", fontFamily: "inherit" }}>
      {toast.msg}
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "#000a", zIndex: 1000, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={onClose}>
      <div style={{ background: "#111827", borderRadius: "24px 24px 0 0", padding: 28, width: "100%", maxWidth: 520, maxHeight: "85vh", overflowY: "auto", boxShadow: "0 -8px 40px #0008" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#e8eaf6" }}>{title}</h3>
          <button style={{ background: "none", border: "none", color: "#8892b0", fontSize: 22, cursor: "pointer" }} onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── VAULT (passphrase + recovery code) ───────────────────────────────────────

const vaultInput = { width: "100%", background: "#0a0f1e", border: "1px solid #1f2937", borderRadius: 12, padding: "13px 14px", color: "#e8eaf6", fontSize: 15, fontFamily: "inherit", outline: "none", boxSizing: "border-box", marginBottom: 12 };
const vaultLabel = { display: "block", color: "#9ca3af", fontSize: 12, fontWeight: 700, marginBottom: 7 };
const vaultBtn = (disabled) => ({ width: "100%", background: disabled ? "#374151" : "linear-gradient(135deg, #6c63ff, #a855f7)", border: "none", color: "#fff", padding: 14, borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer", fontFamily: "inherit" });

function VaultShell({ children }) {
  return (
    <div style={{ minHeight: "100vh", background: "#0a0f1e", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "'Segoe UI', Arial, sans-serif", direction: "rtl" }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>🔐</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#f3f4f6", margin: 0 }}>ארנק הטבות</h1>
        </div>
        <div style={{ background: "#111827", borderRadius: 20, padding: 28, border: "1px solid #1f2937" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function VaultSetup({ onCreate, busy }) {
  const [pass, setPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const submit = () => {
    if (pass.length < 8) return setError("הסיסמה חייבת להיות לפחות 8 תווים");
    if (pass !== confirm) return setError("הסיסמאות לא תואמות");
    setError("");
    onCreate(pass);
  };
  return (
    <>
      <h2 style={{ color: "#e8eaf6", fontSize: 18, fontWeight: 700, marginTop: 0, marginBottom: 6 }}>הגדרת סיסמת הצפנה</h2>
      <p style={{ color: "#8892b0", fontSize: 13, lineHeight: 1.6, marginTop: 0, marginBottom: 20 }}>
        הסיסמה הזו מצפינה את הקודים שלך. היא <strong style={{ color: "#a8b2d8" }}>נשמרת רק אצלך</strong> ולא נשלחת לשרת — כך שגם אם מישהו יפרוץ למסד הנתונים, הוא לא יוכל לקרוא את הקודים בלעדיה.
      </p>
      <label htmlFor="vault-pass" style={vaultLabel}>סיסמה (לפחות 8 תווים)</label>
      <input id="vault-pass" type="password" autoComplete="new-password" style={vaultInput} value={pass} onChange={e => { setPass(e.target.value); setError(""); }} dir="ltr" />
      <label htmlFor="vault-pass2" style={vaultLabel}>אימות סיסמה</label>
      <input id="vault-pass2" type="password" autoComplete="new-password" style={vaultInput} value={confirm} onChange={e => { setConfirm(e.target.value); setError(""); }} onKeyDown={e => e.key === "Enter" && submit()} dir="ltr" />
      {error && <div role="alert" style={{ color: "#ef4444", fontSize: 13, marginBottom: 12 }}>{error}</div>}
      <button style={vaultBtn(busy)} onClick={submit} disabled={busy}>{busy ? "מצפין..." : "הגדר והמשך →"}</button>
      <p style={{ color: "#4b5563", fontSize: 11, textAlign: "center", marginTop: 14, marginBottom: 0, lineHeight: 1.6 }}>
        ⚠️ אם תשכח את הסיסמה תצטרך את קוד השחזור שיוצג בשלב הבא. בלי אחד מהם לא ניתן לשחזר את הקודים.
      </p>
    </>
  );
}

function RecoveryScreen({ code, onDone, inModal }) {
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const copy = () => { try { navigator.clipboard?.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {} };
  return (
    <>
      <h2 style={{ color: "#e8eaf6", fontSize: 18, fontWeight: 700, marginTop: 0, marginBottom: 6 }}>קוד השחזור שלך</h2>
      <p style={{ color: "#8892b0", fontSize: 13, lineHeight: 1.6, marginTop: 0, marginBottom: 18 }}>
        זה הגיבוי היחיד אם תשכח את הסיסמה. <strong style={{ color: "#fbbf24" }}>שמור אותו עכשיו במקום בטוח</strong> (צילום מסך / מנהל סיסמאות). הוא לא יוצג שוב.
      </p>
      <div style={{ background: "#0a0f1e", border: "1px dashed #2d3250", borderRadius: 12, padding: "18px 14px", textAlign: "center", marginBottom: 12 }}>
        <div style={{ fontFamily: "monospace", fontSize: 20, fontWeight: 700, color: "#a5f3fc", letterSpacing: 2, direction: "ltr", userSelect: "all" }}>{code}</div>
      </div>
      <button style={{ ...vaultBtn(false), background: "#1e2235", marginBottom: 16 }} onClick={copy}>{copied ? "✓ הועתק" : "📋 העתק קוד"}</button>
      <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", color: "#ccd6f6", fontSize: 14, marginBottom: 16 }}>
        <input type="checkbox" checked={saved} onChange={e => setSaved(e.target.checked)} style={{ accentColor: "#6c63ff", width: 18, height: 18 }} />
        שמרתי את קוד השחזור במקום בטוח
      </label>
      <button style={vaultBtn(!saved)} onClick={() => saved && onDone()} disabled={!saved}>{inModal ? "סגור" : "סיימתי, כניסה לארנק →"}</button>
    </>
  );
}

function VaultUnlock({ email, onUnlock, onRecover, onSignOut }) {
  const [mode, setMode] = useState("pass"); // pass | recovery
  const [pass, setPass] = useState("");
  const [recovery, setRecovery] = useState("");
  const [newPass, setNewPass] = useState("");
  const [newPass2, setNewPass2] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const doUnlock = async () => {
    if (!pass) return;
    setBusy(true); setError("");
    const ok = await onUnlock(pass);
    setBusy(false);
    if (!ok) { setError("סיסמה שגויה"); setPass(""); }
  };
  const doRecover = async () => {
    if (newPass.length < 8) return setError("הסיסמה החדשה חייבת להיות לפחות 8 תווים");
    if (newPass !== newPass2) return setError("הסיסמאות החדשות לא תואמות");
    setBusy(true); setError("");
    const ok = await onRecover(recovery, newPass);
    setBusy(false);
    if (!ok) setError("קוד שחזור שגוי");
  };

  if (mode === "recovery") {
    return (
      <>
        <h2 style={{ color: "#e8eaf6", fontSize: 18, fontWeight: 700, marginTop: 0, marginBottom: 6 }}>שחזור באמצעות קוד</h2>
        <p style={{ color: "#8892b0", fontSize: 13, lineHeight: 1.6, marginTop: 0, marginBottom: 18 }}>הכנס את קוד השחזור שקיבלת, ובחר סיסמה חדשה.</p>
        <label htmlFor="rec-code" style={vaultLabel}>קוד שחזור</label>
        <input id="rec-code" style={{ ...vaultInput, fontFamily: "monospace", letterSpacing: 1 }} value={recovery} onChange={e => { setRecovery(e.target.value); setError(""); }} dir="ltr" placeholder="XXXXX-XXXXX-XXXXX-XXXXX" />
        <label htmlFor="rec-new" style={vaultLabel}>סיסמה חדשה</label>
        <input id="rec-new" type="password" autoComplete="new-password" style={vaultInput} value={newPass} onChange={e => { setNewPass(e.target.value); setError(""); }} dir="ltr" />
        <label htmlFor="rec-new2" style={vaultLabel}>אימות סיסמה חדשה</label>
        <input id="rec-new2" type="password" autoComplete="new-password" style={vaultInput} value={newPass2} onChange={e => { setNewPass2(e.target.value); setError(""); }} onKeyDown={e => e.key === "Enter" && doRecover()} dir="ltr" />
        {error && <div role="alert" style={{ color: "#ef4444", fontSize: 13, marginBottom: 12 }}>{error}</div>}
        <button style={vaultBtn(busy)} onClick={doRecover} disabled={busy}>{busy ? "משחזר..." : "שחזר והגדר סיסמה →"}</button>
        <button style={{ width: "100%", background: "none", border: "none", color: "#6b7280", fontSize: 13, cursor: "pointer", fontFamily: "inherit", marginTop: 14 }} onClick={() => { setMode("pass"); setError(""); }}>← חזרה</button>
      </>
    );
  }

  return (
    <>
      <h2 style={{ color: "#e8eaf6", fontSize: 18, fontWeight: 700, marginTop: 0, marginBottom: 6 }}>פתיחת הארנק</h2>
      <p style={{ color: "#8892b0", fontSize: 13, marginTop: 0, marginBottom: 18 }}>{email}</p>
      <label htmlFor="unlock-pass" style={vaultLabel}>סיסמת הצפנה</label>
      <input id="unlock-pass" type="password" autoComplete="current-password" autoFocus style={vaultInput} value={pass} onChange={e => { setPass(e.target.value); setError(""); }} onKeyDown={e => e.key === "Enter" && doUnlock()} dir="ltr" />
      {error && <div role="alert" style={{ color: "#ef4444", fontSize: 13, marginBottom: 12 }}>{error}</div>}
      <button style={vaultBtn(busy)} onClick={doUnlock} disabled={busy}>{busy ? "פותח..." : "🔓 פתח"}</button>
      <button style={{ width: "100%", background: "none", border: "none", color: "#6c63ff", fontSize: 13, cursor: "pointer", fontFamily: "inherit", marginTop: 14, fontWeight: 600 }} onClick={() => { setMode("recovery"); setError(""); }}>שכחת סיסמה? שחזור עם קוד</button>
      <button style={{ width: "100%", background: "none", border: "none", color: "#4b5563", fontSize: 12, cursor: "pointer", fontFamily: "inherit", marginTop: 16 }} onClick={onSignOut}>🚪 התנתק</button>
    </>
  );
}

function ChangePassphraseForm({ onSave }) {
  const [pass, setPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const submit = () => {
    if (pass.length < 8) return setError("הסיסמה חייבת להיות לפחות 8 תווים");
    if (pass !== confirm) return setError("הסיסמאות לא תואמות");
    onSave(pass);
  };
  return (
    <>
      <label htmlFor="ch-pass" style={vaultLabel}>סיסמה חדשה (לפחות 8 תווים)</label>
      <input id="ch-pass" type="password" autoComplete="new-password" style={vaultInput} value={pass} onChange={e => { setPass(e.target.value); setError(""); }} dir="ltr" />
      <label htmlFor="ch-pass2" style={vaultLabel}>אימות סיסמה</label>
      <input id="ch-pass2" type="password" autoComplete="new-password" style={vaultInput} value={confirm} onChange={e => { setConfirm(e.target.value); setError(""); }} onKeyDown={e => e.key === "Enter" && submit()} dir="ltr" />
      {error && <div role="alert" style={{ color: "#ef4444", fontSize: 13, marginBottom: 12 }}>{error}</div>}
      <button style={vaultBtn(false)} onClick={submit}>שמור סיסמה חדשה</button>
    </>
  );
}

// Numeric keypad used as a quick "reveal" gate. mode="verify" calls onVerify(pin)
// (async → boolean); mode="set" collects + confirms then calls onSet(pin).
function RevealPinPad({ mode = "verify", length = 6, title, subtitle, onVerify, onSet, onCancel }) {
  const [digits, setDigits] = useState("");
  const [confirm, setConfirm] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [fails, setFails] = useState(0);
  const [lockUntil, setLockUntil] = useState(0);
  const locked = Date.now() < lockUntil;

  const submit = async (pin) => {
    if (mode === "verify") {
      setBusy(true);
      const ok = await onVerify(pin);
      setBusy(false);
      if (!ok) {
        const f = fails + 1;
        setDigits("");
        if (f >= 5) { setLockUntil(Date.now() + 30000); setFails(0); setError("יותר מדי ניסיונות — המתן 30 שניות"); }
        else { setFails(f); setError("קוד שגוי"); }
      }
    } else if (confirm === null) {
      setConfirm(pin); setDigits(""); setError("");
    } else if (confirm === pin) {
      onSet(pin);
    } else {
      setConfirm(null); setDigits(""); setError("הקודים לא תואמים");
    }
  };

  const press = (d) => {
    if (busy || locked) return;
    const next = digits + d;
    if (next.length > length) return;
    setDigits(next); setError("");
    if (next.length === length) setTimeout(() => submit(next), 120);
  };

  const sub = mode === "set"
    ? (confirm === null ? `בחר קוד (${length} ספרות)` : "אמת את הקוד שוב")
    : (subtitle || "");

  return (
    <div style={{ textAlign: "center", padding: "6px 0" }}>
      <div style={{ fontSize: 38, marginBottom: 8 }}>🔢</div>
      <div style={{ fontSize: 17, fontWeight: 700, color: "#e8eaf6", marginBottom: 4 }}>{title || "הכנס קוד"}</div>
      {sub && <div style={{ color: "#8892b0", fontSize: 13, marginBottom: 20 }}>{sub}</div>}
      <div style={{ display: "flex", gap: 12, justifyContent: "center", marginBottom: 22 }}>
        {Array.from({ length }).map((_, i) => (
          <div key={i} style={{ width: 16, height: 16, borderRadius: "50%", background: digits.length > i ? "#6c63ff" : "#2d3250", border: "2px solid #2d3250", transition: "all 0.2s" }} />
        ))}
      </div>
      {error && <div role="alert" style={{ color: "#ef4444", fontSize: 13, marginBottom: 14 }}>{error}</div>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, maxWidth: 260, margin: "0 auto" }}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, "", 0, "⌫"].map((d, i) => (
          <button key={i} disabled={busy || locked}
            style={{ padding: "16px 0", borderRadius: 14, background: d === "" ? "transparent" : "#1e2235", border: "none", color: "#e8eaf6", fontSize: 21, fontWeight: 700, cursor: d === "" || busy || locked ? "default" : "pointer", fontFamily: "inherit", opacity: busy || locked ? 0.5 : 1 }}
            onClick={() => { if (d === "⌫") setDigits(p => p.slice(0, -1)); else if (d !== "") press(String(d)); }}>
            {d}
          </button>
        ))}
      </div>
      {onCancel && <button style={{ marginTop: 18, background: "none", border: "none", color: "#8892b0", fontSize: 14, cursor: "pointer", fontFamily: "inherit" }} onClick={onCancel}>ביטול</button>}
    </div>
  );
}

// Password form for encrypted backup export ("export": password + confirm) and
// import ("import": single password). onSubmit returns false on a wrong password.
function BackupPasswordForm({ mode, onSubmit }) {
  const [pass, setPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (pass.length < 6) return setError("סיסמה של לפחות 6 תווים");
    if (mode === "export" && pass !== confirm) return setError("הסיסמאות לא תואמות");
    setBusy(true); setError("");
    const ok = await onSubmit(pass);
    setBusy(false);
    if (ok === false) setError("סיסמת גיבוי שגויה");
  };
  return (
    <>
      {mode === "export" && (
        <p style={{ color: "#8892b0", fontSize: 13, lineHeight: 1.6, marginTop: 0, marginBottom: 16 }}>
          בחר סיסמה להצפנת קובץ הגיבוי. <strong style={{ color: "#a8b2d8" }}>תצטרך אותה כדי לשחזר</strong> — שמור אותה.
        </p>
      )}
      <label htmlFor="bk-pass" style={vaultLabel}>{mode === "export" ? "סיסמת גיבוי (6+ תווים)" : "סיסמת הגיבוי"}</label>
      <input id="bk-pass" type="password" autoComplete={mode === "export" ? "new-password" : "current-password"} style={vaultInput} value={pass} onChange={e => { setPass(e.target.value); setError(""); }} onKeyDown={e => { if (e.key === "Enter" && mode === "import") submit(); }} dir="ltr" />
      {mode === "export" && (
        <>
          <label htmlFor="bk-pass2" style={vaultLabel}>אימות סיסמה</label>
          <input id="bk-pass2" type="password" autoComplete="new-password" style={vaultInput} value={confirm} onChange={e => { setConfirm(e.target.value); setError(""); }} onKeyDown={e => e.key === "Enter" && submit()} dir="ltr" />
        </>
      )}
      {error && <div role="alert" style={{ color: "#ef4444", fontSize: 13, marginBottom: 12 }}>{error}</div>}
      <button style={vaultBtn(busy)} onClick={submit} disabled={busy}>{busy ? "מעבד..." : (mode === "export" ? "📥 ייצא גיבוי מוצפן" : "🔓 שחזר")}</button>
    </>
  );
}

// ─── AUTH SCREEN ──────────────────────────────────────────────────────────────

function AuthScreen() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState("email"); // email | code
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [legalView, setLegalView] = useState(null); // null | "privacy" | "terms"

  const sendOtp = async () => {
    if (!email.trim()) return setError("נא להכניס אימייל");
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true }
    });
    setLoading(false);
    if (error) setError(error.message);
    else setStep("code");
  };

  const verifyOtp = async () => {
    if (code.length !== 6) return setError("קוד חייב להיות 6 ספרות");
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: "email"
    });
    setLoading(false);
    if (error) setError("קוד שגוי או פג תוקף, נסה שוב");
  };

  if (legalView === "privacy") return <PrivacyPolicy onBack={() => setLegalView(null)} />;
  if (legalView === "terms") return <TermsOfService onBack={() => setLegalView(null)} />;

  return (
    <div style={{ minHeight: "100vh", background: "#0a0f1e", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "'Segoe UI', Arial, sans-serif", direction: "rtl" }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🎁</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "#f3f4f6", margin: 0 }}>ארנק הטבות</h1>
          <p style={{ color: "#6b7280", marginTop: 8, fontSize: 15 }}>גיפט קארדים · קופונים · זיכויים</p>
        </div>

        <div style={{ background: "#111827", borderRadius: 20, padding: 28, border: "1px solid #1f2937" }}>
          {step === "email" ? (
            <>
              <h2 style={{ color: "#e8eaf6", fontSize: 18, fontWeight: 700, marginBottom: 6, marginTop: 0 }}>כניסה / הרשמה</h2>
              <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 20, marginTop: 0 }}>נשלח לך קוד 6 ספרות למייל</p>
              <label htmlFor="email-input" style={{ display: "block", color: "#9ca3af", fontSize: 12, fontWeight: 700, marginBottom: 7, textTransform: "uppercase", letterSpacing: 0.5 }}>אימייל</label>
              <input
                id="email-input"
                aria-label="כתובת אימייל לכניסה"
                style={{ width: "100%", background: "#0a0f1e", border: "1px solid #1f2937", borderRadius: 12, padding: "13px 14px", color: "#e8eaf6", fontSize: 15, fontFamily: "inherit", outline: "none", boxSizing: "border-box", marginBottom: 12 }}
                type="email" placeholder="your@email.com" value={email}
                onChange={e => { setEmail(e.target.value); setError(""); }}
                onKeyDown={e => e.key === "Enter" && sendOtp()}
                dir="ltr"
              />
              {error && <div role="alert" style={{ color: "#ef4444", fontSize: 13, marginBottom: 12 }}>{error}</div>}
              <button
                aria-label="שלח קוד אימות לאימייל"
                style={{ width: "100%", background: loading ? "#374151" : "linear-gradient(135deg, #6c63ff, #a855f7)", border: "none", color: "#fff", padding: 14, borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit" }}
                onClick={sendOtp} disabled={loading}
              >
                {loading ? "שולח..." : "שלח קוד ✉️"}
              </button>
              <p style={{ color: "#4b5563", fontSize: 12, textAlign: "center", marginTop: 16, marginBottom: 0 }}>קוד חד פעמי — אין צורך בסיסמה</p>
              <p style={{ color: "#4b5563", fontSize: 11, textAlign: "center", marginTop: 12, marginBottom: 0, lineHeight: 1.6 }}>
                בהרשמה אתה מאשר את <a href="#" onClick={(e) => { e.preventDefault(); setLegalView("terms"); }} style={{ color: "#6c63ff" }}>תנאי השימוש</a> ואת <a href="#" onClick={(e) => { e.preventDefault(); setLegalView("privacy"); }} style={{ color: "#6c63ff" }}>מדיניות הפרטיות</a>
              </p>
            </>
          ) : (
            <>
              <h2 style={{ color: "#e8eaf6", fontSize: 18, fontWeight: 700, marginBottom: 6, marginTop: 0 }}>הכנס קוד</h2>
              <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 20, marginTop: 0 }}>שלחנו קוד 6 ספרות ל-<strong style={{ color: "#a8b2d8" }}>{email}</strong></p>
              <label style={{ display: "block", color: "#9ca3af", fontSize: 12, fontWeight: 700, marginBottom: 7, textTransform: "uppercase", letterSpacing: 0.5 }}>קוד אימות</label>
              <input
                style={{ width: "100%", background: "#0a0f1e", border: "1px solid #1f2937", borderRadius: 12, padding: "16px 14px", color: "#e8eaf6", fontSize: 28, fontFamily: "monospace", outline: "none", boxSizing: "border-box", marginBottom: 12, textAlign: "center", letterSpacing: 12 }}
                type="number" placeholder="000000" value={code}
                onChange={e => { setCode(e.target.value.slice(0, 6)); setError(""); }}
                onKeyDown={e => e.key === "Enter" && verifyOtp()}
                dir="ltr" autoFocus
              />
              {error && <div style={{ color: "#ef4444", fontSize: 13, marginBottom: 12 }}>{error}</div>}
              <button
                style={{ width: "100%", background: loading ? "#374151" : "linear-gradient(135deg, #6c63ff, #a855f7)", border: "none", color: "#fff", padding: 14, borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", marginBottom: 12 }}
                onClick={verifyOtp} disabled={loading}
              >
                {loading ? "מאמת..." : "כניסה →"}
              </button>
              <button
                style={{ width: "100%", background: "none", border: "1px solid #1f2937", color: "#6b7280", padding: "11px", borderRadius: 14, cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}
                onClick={() => { setStep("email"); setCode(""); setError(""); }}
              >
                ← חזרה לשינוי אימייל
              </button>
              <p style={{ color: "#4b5563", fontSize: 11, textAlign: "center", marginTop: 12, marginBottom: 0 }}>הקוד תקף ל-10 דקות</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── STATS VIEW ───────────────────────────────────────────────────────────────

function StatsView({ cards, onBack }) {
  const allTx = cards.flatMap(c => (c.transactions || []).map(t => ({ ...t, provider: c.provider })));
  const totalSpent = allTx.reduce((s, t) => s + t.amount, 0);
  const totalRemaining = cards.filter(c => !c.fullyUsed).reduce((s, c) => s + c.remainingAmount, 0);

  const byCategory = CATEGORIES.map(cat => ({
    name: cat, value: allTx.filter(t => t.purpose === cat).reduce((s, t) => s + t.amount, 0)
  })).filter(d => d.value > 0).sort((a, b) => b.value - a.value);

  const byProvider = PROVIDERS.map(p => ({
    name: p.name, value: cards.filter(c => c.provider === p.id).reduce((s, c) => s + (c.originalAmount - c.remainingAmount), 0), color: p.color
  })).filter(d => d.value > 0);

  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - (5 - i));
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("he-IL", { month: "short", year: "2-digit" });
    const value = allTx.filter(t => t.date?.startsWith(key)).reduce((s, t) => s + t.amount, 0);
    return { name: label, value };
  });

  const COLORS = ["#6c63ff", "#E91E8C", "#FF6B35", "#00B894", "#FF9900", "#4285F4", "#a855f7"];

  return (
    <div style={S.page}>
      <div style={S.container}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <button style={S.backBtn} onClick={onBack}>→ חזרה</button>
          <h1 style={{ ...S.title, margin: 0 }}>📊 סטטיסטיקות</h1>
        </header>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
          {[
            { label: "סה״כ נוצל", value: fmt(totalSpent), color: "#ef4444" },
            { label: "יתרה פעילה", value: fmt(totalRemaining), color: "#10b981" },
            { label: "כרטיסים פעילים", value: cards.filter(c => !c.fullyUsed && !isExpired(c.expiry)).length, color: "#6c63ff" },
            { label: "עסקאות", value: allTx.length, color: "#f59e0b" },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: "#111827", borderRadius: 16, padding: "16px 14px", border: "1px solid #1f2937", textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
              <div style={{ fontSize: 11, color: "#8892b0", marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>
        {allTx.length > 0 && (
          <>
            <div style={S.sectionCard}>
              <h3 style={S.sectionTitle}>שימוש לפי חודש</h3>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={last6Months} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="name" tick={{ fill: "#8892b0", fontSize: 11 }} />
                  <YAxis tick={{ fill: "#8892b0", fontSize: 11 }} />
                  <Tooltip formatter={(v) => [fmt(v), "סכום"]} contentStyle={{ background: "#111827", border: "1px solid #2d3250", borderRadius: 10, color: "#e8eaf6", fontFamily: "inherit", direction: "rtl" }} />
                  <Bar dataKey="value" fill="#6c63ff" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {byCategory.length > 0 && (
              <div style={S.sectionCard}>
                <h3 style={S.sectionTitle}>שימוש לפי קטגוריה</h3>
                <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                  <ResponsiveContainer width={140} height={140}>
                    <PieChart>
                      <Pie data={byCategory} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value">
                        {byCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v) => [fmt(v)]} contentStyle={{ background: "#111827", border: "1px solid #2d3250", borderRadius: 10, color: "#e8eaf6", fontFamily: "inherit", direction: "rtl" }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                    {byCategory.slice(0, 5).map((d, i) => (
                      <div key={d.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div style={{ width: 10, height: 10, borderRadius: 3, background: COLORS[i % COLORS.length] }} />
                          <span style={{ fontSize: 13, color: "#ccd6f6" }}>{CATEGORY_ICONS[d.name]} {d.name}</span>
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#e8eaf6" }}>{fmt(d.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {byProvider.length > 1 && (
              <div style={S.sectionCard}>
                <h3 style={S.sectionTitle}>שימוש לפי ספק</h3>
                {byProvider.map(p => (
                  <div key={p.name} style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                      <span style={{ fontSize: 13, color: "#ccd6f6" }}>{p.name}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#e8eaf6" }}>{fmt(p.value)}</span>
                    </div>
                    <div style={S.progressBg}>
                      <div style={{ ...S.progressFill, width: `${Math.min(100, (p.value / totalSpent) * 100)}%`, background: p.color }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div style={S.sectionCard}>
              <h3 style={S.sectionTitle}>עסקאות אחרונות</h3>
              {[...allTx].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10).map(tx => (
                <div key={tx.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #1f2937" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: "#ccd6f6" }}>{tx.store}</div>
                    <div style={{ fontSize: 12, color: "#8892b0" }}>{CATEGORY_ICONS[tx.purpose]} {tx.purpose} · {fmtDate(tx.date)}</div>
                  </div>
                  <div style={{ color: "#ef4444", fontWeight: 700 }}>-{fmt(tx.amount)}</div>
                </div>
              ))}
            </div>
          </>
        )}
        {allTx.length === 0 && (
          <div style={{ textAlign: "center", padding: 60, color: "#8892b0" }}>
            <div style={{ fontSize: 48 }}>📊</div>
            <div style={{ marginTop: 12 }}>אין עדיין נתונים להצגה</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────

export default function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  // Vault (envelope encryption): the DEK lives only in memory while the app is open.
  const [vaultState, setVaultState] = useState("loading"); // loading | setup | recovery | locked | open
  const [dek, setDek] = useState(null);
  const dekRawRef = useRef(null); // raw DEK bytes, kept in memory for re-wrapping (change passphrase / new recovery)
  const [keyRecord, setKeyRecord] = useState(null);
  const [recoveryCodeToShow, setRecoveryCodeToShow] = useState(null);
  const [securityModal, setSecurityModal] = useState(null); // null | "change" | "regen"
  const [vaultBusy, setVaultBusy] = useState(false);
  // Optional reveal PIN: a quick local gate before a card code is shown on screen.
  const [revealPinRecord, setRevealPinRecord] = useState(() => {
    try { return JSON.parse(localStorage.getItem("gw_reveal_pin")); } catch { return null; }
  });
  const [revealPinModal, setRevealPinModal] = useState(null); // cardId awaiting the reveal PIN
  const [pinSetModal, setPinSetModal] = useState(null);       // null | "set" | "remove"
  const [backupModal, setBackupModal] = useState(null);       // null | "export" | "import"
  const [pendingImport, setPendingImport] = useState(null);   // parsed encrypted backup awaiting password
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState("dashboard");
  const [selectedId, setSelectedId] = useState(null);
  const [filterProvider, setFilterProvider] = useState("all");
  const [showUsed, setShowUsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("expiry");
  const [toast, setToast] = useState(null);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [editingCard, setEditingCard] = useState(null);
  const [lightbox, setLightbox] = useState(null);
  const [shareModal, setShareModal] = useState(null);
  const [form, setForm] = useState({ provider: "buyme", code: "", originalAmount: "", expiry: "", expiryDisplay: "", notes: "", image: null, color: "", storeName: "", cvv: "", cardHolder: "" });
  const [useForm, setUseForm] = useState({ store: "", purpose: "קניות", amount: "", date: new Date().toISOString().split("T")[0], notes: "" });
  const [revealedCards, setRevealedCards] = useState({}); // cardId -> { code, image, cvv, expiresAt }
  const fileRef = useRef();
  const importRef = useRef();

  // ── Auth listener ──
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setAuthLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  // ── Load the vault key record; decide whether the user needs setup or unlock ──
  useEffect(() => {
    if (!session) {
      setDek(null); dekRawRef.current = null; setKeyRecord(null); setCards([]); setVaultState("loading");
      return;
    }
    let cancelled = false;
    (async () => {
      setVaultState("loading");
      const { data, error } = await supabase
        .from("user_keys").select("*").eq("user_id", session.user.id).maybeSingle();
      if (cancelled) return;
      if (error) { showToast("שגיאה בטעינת מפתח האבטחה", "error"); return; }
      if (!data) setVaultState("setup");
      else { setKeyRecord(data); setVaultState("locked"); }
    })();
    return () => { cancelled = true; };
  }, [session]);

  // ── Load cards once the vault is unlocked (DEK in memory) ──
  useEffect(() => {
    if (session && dek) loadCardsFromDB();
  }, [session, dek]);

  // ── Expiry alerts ──
  useEffect(() => {
    if (cards.length === 0) return;
    const soon = cards.filter(c => !c.fullyUsed && isExpiringSoon(c.expiry));
    if (soon.length > 0) showToast(`⚠️ ${soon.length} כרטיס/ים פגי תוקף בקרוב!`, "warn");
  }, [cards]);

  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // ─── Vault: setup / unlock / recovery / key rotation ────────────────────────

  // One-time migration: re-encrypt any card fields still in the legacy "enc:" form
  // (or left as plaintext) into the new v2 format using the unlocked DEK. Idempotent.
  const migrateLegacyCards = async (dekKey) => {
    try {
      const { data: rows } = await supabase
        .from("cards").select("id, code, cvv, image, notes, card_holder, store_name").eq("user_id", session.user.id);
      for (const r of rows || []) {
        const updates = {};
        for (const field of ["code", "cvv", "image", "notes", "card_holder", "store_name"]) {
          const val = r[field];
          if (typeof val !== "string" || !val || val.startsWith("v2:")) continue; // already migrated or empty
          const plain = await decryptAny(val, dekKey, session.user.id);
          // Guard: only re-encrypt if we actually recovered plaintext. If legacy
          // decryption failed, decryptAny returns the original "enc:" string — never
          // overwrite that, or the real value would be lost.
          if (typeof plain === "string" && plain.startsWith("enc:")) continue;
          updates[field] = await encryptField(plain, dekKey);
        }
        if (Object.keys(updates).length) await supabase.from("cards").update(updates).eq("id", r.id);
      }
    } catch {
      // Non-fatal: reads still work via decryptAny; migration will retry on next unlock.
    }
  };

  const handleCreateVault = async (passphrase) => {
    setVaultBusy(true);
    try {
      const recoveryCode = generateRecoveryCode();
      const { dek: newDek, dekRaw, keyRecord: rec } = await createVault(passphrase, recoveryCode);
      const { error } = await supabase.from("user_keys").insert({ user_id: session.user.id, ...rec });
      if (error) { showToast("שגיאה בשמירת המפתח", "error"); setVaultBusy(false); return; }
      dekRawRef.current = dekRaw;
      setKeyRecord({ user_id: session.user.id, ...rec });
      setDek(newDek);
      await migrateLegacyCards(newDek);
      setRecoveryCodeToShow(recoveryCode);
      setVaultState("recovery");
    } finally {
      setVaultBusy(false);
    }
  };

  const handleUnlock = async (passphrase) => {
    try {
      const { dek: d, dekRaw } = await unlockVault(passphrase, keyRecord);
      dekRawRef.current = dekRaw;
      setDek(d);
      setVaultState("open");
      migrateLegacyCards(d); // finish any interrupted migration in the background
      return true;
    } catch {
      return false;
    }
  };

  const handleRecover = async (recoveryCode, newPassphrase) => {
    try {
      const { dek: d, dekRaw } = await unlockWithRecovery(recoveryCode, keyRecord);
      const upd = await rewrapPassphrase(dekRaw, newPassphrase);
      const { error } = await supabase.from("user_keys").update(upd).eq("user_id", session.user.id);
      if (error) { showToast("שגיאה בעדכון הסיסמה", "error"); return false; }
      dekRawRef.current = dekRaw;
      setKeyRecord({ ...keyRecord, ...upd });
      setDek(d);
      setVaultState("open");
      showToast("הסיסמה אופסה בהצלחה ✓");
      return true;
    } catch {
      return false;
    }
  };

  const handleChangePassphrase = async (newPassphrase) => {
    if (!dekRawRef.current) return showToast("צריך לפתוח את הארנק קודם", "error");
    const upd = await rewrapPassphrase(dekRawRef.current, newPassphrase);
    const { error } = await supabase.from("user_keys").update(upd).eq("user_id", session.user.id);
    if (error) return showToast("שגיאה בעדכון הסיסמה", "error");
    setKeyRecord(k => ({ ...k, ...upd }));
    setSecurityModal(null);
    showToast("הסיסמה עודכנה ✓");
  };

  const handleRegenerateRecovery = async () => {
    if (!dekRawRef.current) return showToast("צריך לפתוח את הארנק קודם", "error");
    const { recoveryCode, fields } = await rewrapRecovery(dekRawRef.current);
    const { error } = await supabase.from("user_keys").update(fields).eq("user_id", session.user.id);
    if (error) return showToast("שגיאה ביצירת קוד שחזור", "error");
    setKeyRecord(k => ({ ...k, ...fields }));
    setSecurityModal(null);
    setRecoveryCodeToShow(recoveryCode); // shown in a modal while vaultState === "open"
  };

  // Lock the vault: wipe the in-memory DEK and decrypted cards, show the unlock screen.
  const lockVault = useCallback(() => {
    setDek(null);
    dekRawRef.current = null;
    setRevealedCards({});
    setCards([]);
    setVaultState("locked");
  }, []);

  // Auto-lock: if the app sits in the background for more than 60s, require the
  // passphrase again on return. (A full reload already requires it — the DEK is
  // never persisted.) The short grace avoids re-locking on quick app switches.
  useEffect(() => {
    if (vaultState !== "open") return;
    let hiddenAt = 0;
    const onVisibility = () => {
      if (document.hidden) hiddenAt = Date.now();
      else if (hiddenAt && Date.now() - hiddenAt > 60000) lockVault();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [vaultState, lockVault]);

  // ─── DB Operations ─────────────────────────────────────────────────────────

  const loadCardsFromDB = async () => {
    setLoading(true);
    try {
      const { data: cardsData, error: cardsError } = await supabase
        .from("cards").select("*").order("created_at", { ascending: false });
      if (cardsError) throw cardsError;

      const { data: txData, error: txError } = await supabase
        .from("transactions").select("*").order("date", { ascending: false });
      if (txError) throw txError;

      // Merge transactions into cards + decrypt codes
      const merged = await Promise.all((cardsData || []).map(async card => ({
        ...card,
        originalAmount: card.original_amount,
        remainingAmount: card.remaining_amount,
        fullyUsed: card.fully_used,
        createdAt: card.created_at,
        code: await decryptAny(card.code, dek, session.user.id),
        cvv: await decryptAny(card.cvv, dek, session.user.id),
        image: await decryptAny(card.image, dek, session.user.id),
        notes: await decryptAny(card.notes, dek, session.user.id),
        storeName: await decryptAny(card.store_name, dek, session.user.id),
        cardHolder: await decryptAny(card.card_holder, dek, session.user.id),
        transactions: (txData || []).filter(t => t.card_id === card.id).map(t => ({
          id: t.id, date: t.date, store: t.store, purpose: t.purpose, amount: t.amount, notes: t.notes
        }))
      })));
      setCards(merged);
    } catch (e) {
      showToast("שגיאה בטעינת נתונים", "error");
    }
    setLoading(false);
  };

  const selectedCard = cards.find(c => c.id === selectedId);

  // ── Add / Edit card ──
  const addCard = async () => {
    const needsCode = form.provider !== "credit";
    if (needsCode && !form.code.trim()) return showToast("נא למלא קוד כרטיס", "error");
    if (!form.originalAmount) return showToast("נא למלא סכום", "error");
    if (form.provider === "credit" && !form.storeName?.trim()) return showToast("נא למלא שם חנות", "error");

    const amount = parseFloat(form.originalAmount);

    if (editingCard) {
      const { error } = await supabase.from("cards").update({
        provider: form.provider,
        code: await encryptField(form.code.trim(), dek),
        cvv: await encryptField(form.cvv.trim(), dek),
        card_holder: await encryptField(form.cardHolder.trim() || null, dek),
        original_amount: amount,
        remaining_amount: editingCard.remainingAmount + (amount - editingCard.originalAmount),
        expiry: form.expiry || null,
        notes: await encryptField(form.notes, dek),
        image: await encryptField(form.image !== undefined ? form.image : editingCard.image, dek),
        color: form.color || null,
        store_name: await encryptField(form.storeName || null, dek),
        fully_used: editingCard.remainingAmount + (amount - editingCard.originalAmount) <= 0,
      }).eq("id", editingCard.id);
      if (error) return showToast("שגיאה בעדכון", "error");
      showToast("כרטיס עודכן ✓");
    } else {
      const { error } = await supabase.from("cards").insert({
        user_id: session.user.id, provider: form.provider,
        code: await encryptField(form.code.trim(), dek),
        cvv: await encryptField(form.cvv.trim(), dek),
        card_holder: await encryptField(form.cardHolder.trim() || null, dek),
        original_amount: amount, remaining_amount: amount,
        expiry: form.expiry || null, notes: await encryptField(form.notes, dek), fully_used: false,
        image: await encryptField(form.image || null, dek), color: form.color || null,
        store_name: await encryptField(form.storeName || null, dek),
      });
      if (error) return showToast("שגיאה בהוספה", "error");
      showToast("כרטיס נוסף! 🎉");
    }

    setForm({ provider: "buyme", code: "", originalAmount: "", expiry: "", expiryDisplay: "", notes: "", image: null, color: "", storeName: "", cvv: "", cardHolder: "" });
    setEditingCard(null);
    setView("dashboard");
    await loadCardsFromDB();
  };

  // ── Record use ──
  const recordUse = async () => {
    if (!useForm.store.trim() || !useForm.amount) return showToast("נא למלא חנות וסכום", "error");
    const amount = parseFloat(useForm.amount);
    if (amount <= 0) return showToast("סכום חייב להיות חיובי", "error");
    if (amount > selectedCard.remainingAmount) return showToast("הסכום גדול מהיתרה", "error");

    const newRemaining = selectedCard.remainingAmount - amount;

    const { error: txError } = await supabase.from("transactions").insert({
      card_id: selectedCard.id, user_id: session.user.id,
      store: useForm.store.trim(), purpose: useForm.purpose,
      amount, date: useForm.date, notes: useForm.notes,
    });
    if (txError) return showToast("שגיאה ברישום שימוש", "error");

    const { error: cardError } = await supabase.from("cards").update({
      remaining_amount: newRemaining, fully_used: newRemaining <= 0
    }).eq("id", selectedCard.id);
    if (cardError) return showToast("שגיאה בעדכון יתרה", "error");

    setUseForm({ store: "", purpose: "קניות", amount: "", date: new Date().toISOString().split("T")[0], notes: "" });
    showToast("שימוש נרשם ✓");
    await loadCardsFromDB();
    setView("detail");
  };

  // ── Delete card ──
  const deleteCard = async (id) => {
    await supabase.from("transactions").delete().eq("card_id", id);
    await supabase.from("cards").delete().eq("id", id);
    setConfirmDeleteId(null);
    setView("dashboard");
    showToast("כרטיס נמחק");
    await loadCardsFromDB();
  };

  // ── Delete transaction ──
  const deleteTx = async (cardId, txId, amount) => {
    await supabase.from("transactions").delete().eq("id", txId);
    const card = cards.find(c => c.id === cardId);
    await supabase.from("cards").update({
      remaining_amount: card.remainingAmount + amount, fully_used: false
    }).eq("id", cardId);
    showToast("עסקה נמחקה");
    await loadCardsFromDB();
  };

  // ── Image upload with compression ──
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 800;
        let { width, height } = img;
        if (width > height) { if (width > MAX) { height = Math.round(height * MAX / width); width = MAX; } }
        else { if (height > MAX) { width = Math.round(width * MAX / height); height = MAX; } }
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL("image/jpeg", 0.7);
        const kb = Math.round(compressed.length * 0.75 / 1024);
        setForm(f => ({ ...f, image: compressed }));
        showToast(`תמונה הוכנסה (${kb}KB) ✓`);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  // ── Share card ──
  const shareCard = (card) => {
    const prov = provider(card.provider);
    const text = `🎁 ${prov.name}\nקוד: ${card.code}\nיתרה: ${fmt(card.remainingAmount)}${card.expiry ? `\nתוקף: ${fmtDate(card.expiry)}` : ""}`;
    if (navigator.share) {
      navigator.share({ title: "ארנק הטבות", text });
    } else {
      navigator.clipboard.writeText(text);
      showToast("הפרטים הועתקו ✓");
    }
    setShareModal(null);
  };

  // ── Reveal sensitive data ──
  // The vault is already unlocked (passphrase entered at login), so the data is in
  // memory. If a reveal PIN is set, require it first (shoulder-surf gate); otherwise
  // reveal directly. Either way the data auto-hides after 30s.
  const revealSensitiveData = (card) => {
    if (revealPinRecord) { setRevealPinModal(card.id); return; }
    doReveal(card.id, card);
  };

  const handleSetRevealPin = async (pin) => {
    const rec = await createPinRecord(pin);
    localStorage.setItem("gw_reveal_pin", JSON.stringify(rec));
    setRevealPinRecord(rec);
    setPinSetModal(null);
    showToast("קוד חשיפה הוגדר 🔒");
  };

  const handleRemoveRevealPin = () => {
    localStorage.removeItem("gw_reveal_pin");
    setRevealPinRecord(null);
    setPinSetModal(null);
    showToast("קוד החשיפה הוסר");
  };

  const doReveal = (cardId, card) => {
    setRevealedCards(prev => ({
      ...prev,
      [cardId]: { code: card.code, cvv: card.cvv, image: card.image, expiresAt: Date.now() + 30000 }
    }));
    setTimeout(() => {
      setRevealedCards(prev => { const next = { ...prev }; delete next[cardId]; return next; });
      showToast("הפרטים הוסתרו אוטומטית 🔒");
    }, 30000);
    showToast("פרטים גלויים ל-30 שניות 🔓");
  };

  // ── Copy to clipboard ──
  const copyText = (text) => {
    try { navigator.clipboard?.writeText(text); showToast("הקוד הועתק ✓"); }
    catch { showToast("ההעתקה נכשלה", "error"); }
  };

  // ── Export (password-encrypted backup) ──
  const exportData = () => setBackupModal("export");

  const doExport = async (password) => {
    const payload = JSON.stringify({ cards, exportedAt: new Date().toISOString() });
    const enc = await encryptBackup(payload, password);
    const blob = new Blob([JSON.stringify(enc, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `gift-cards-backup-${new Date().toISOString().split("T")[0]}.json`; a.click();
    URL.revokeObjectURL(url);
    setBackupModal(null);
    showToast("גיבוי מוצפן הורד ✓");
  };

  // ── Import backup ──
  // Handles both the new encrypted format (prompts for the backup password) and
  // the legacy plaintext format (older localStorage exports).
  const importOldBackup = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (isEncryptedBackup(data)) { setPendingImport(data); setBackupModal("import"); return; }
        const oldCards = data.cards || (Array.isArray(data) ? data : null);
        if (!oldCards || !Array.isArray(oldCards)) return showToast("קובץ לא תקין", "error");
        await runImport(oldCards);
      } catch {
        showToast("שגיאה בקריאת הקובץ", "error");
      }
    };
    reader.readAsText(file);
    e.target.value = ""; // reset input
  };

  const doImport = async (password) => {
    try {
      const json = await decryptBackup(pendingImport, password);
      const data = JSON.parse(json);
      const oldCards = data.cards || (Array.isArray(data) ? data : null);
      if (!oldCards || !Array.isArray(oldCards)) { showToast("קובץ לא תקין", "error"); return true; }
      setBackupModal(null);
      setPendingImport(null);
      await runImport(oldCards);
      return true;
    } catch {
      return false; // wrong password
    }
  };

  const runImport = async (oldCards) => {
    showToast("מייבא נתונים...", "warn");
    let imported = 0, skipped = 0;
    for (const card of oldCards) {
      if (card.id === "demo1" || card.id === "demo2") { skipped++; continue; }
      const amount = card.originalAmount || card.original_amount || 0;
      const remaining = card.remainingAmount || card.remaining_amount || amount;
      const { data: newCard, error: cardError } = await supabase.from("cards").insert({
        user_id: session.user.id,
        provider: card.provider || "other",
        code: await encryptField(card.code || "", dek),
        cvv: await encryptField(card.cvv || "", dek),
        card_holder: await encryptField(card.cardHolder || card.card_holder || null, dek),
        original_amount: amount,
        remaining_amount: remaining,
        expiry: card.expiry || null,
        notes: await encryptField(card.notes || "", dek),
        fully_used: card.fullyUsed || card.fully_used || false,
        image: await encryptField(card.image || null, dek),
        color: card.color || null,
        store_name: await encryptField(card.storeName || card.store_name || null, dek),
      }).select().single();
      if (cardError) { skipped++; continue; }
      for (const tx of (card.transactions || [])) {
        await supabase.from("transactions").insert({
          card_id: newCard.id, user_id: session.user.id,
          store: tx.store || "", purpose: tx.purpose || "אחר",
          amount: tx.amount || 0, date: tx.date || new Date().toISOString().split("T")[0],
          notes: tx.notes || "",
        });
      }
      imported++;
    }
    await loadCardsFromDB();
    showToast(`יובאו ${imported} כרטיסים בהצלחה! 🎉`);
    if (skipped > 0) showToast(`${skipped} כרטיסים דולגו`, "warn");
    setView("dashboard");
  };

  // ── Sorting & Filtering ──
  const filteredCards = cards.filter(c => {
    if (!showUsed && c.fullyUsed) return false;
    if (filterProvider !== "all" && c.provider !== filterProvider) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!c.code?.toLowerCase().includes(q) && !c.notes?.toLowerCase().includes(q) && !provider(c.provider).name.toLowerCase().includes(q) && !c.storeName?.toLowerCase().includes(q)) return false;
    }
    return true;
  }).sort((a, b) => {
    if (sortBy === "expiry") { if (!a.expiry) return 1; if (!b.expiry) return -1; return new Date(a.expiry) - new Date(b.expiry); }
    if (sortBy === "amount") return b.remainingAmount - a.remainingAmount;
    if (sortBy === "newest") return new Date(b.createdAt) - new Date(a.createdAt);
    if (sortBy === "name") return provider(a.provider).name.localeCompare(provider(b.provider).name);
    return 0;
  });

  // ─── LOADING / AUTH ───────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0f1e", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", color: "#6b7280" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎁</div>
          <div style={{ fontSize: 16 }}>טוען...</div>
        </div>
      </div>
    );
  }

  if (!session) return <AuthScreen />;

  // ─── VAULT GATES (must unlock before any card data is shown) ────────────────
  if (vaultState === "loading") {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0f1e", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", color: "#6b7280" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔐</div>
          <div style={{ fontSize: 16 }}>טוען...</div>
        </div>
      </div>
    );
  }
  if (vaultState === "setup") {
    return <VaultShell><VaultSetup onCreate={handleCreateVault} busy={vaultBusy} /></VaultShell>;
  }
  if (vaultState === "recovery") {
    return (
      <VaultShell>
        <RecoveryScreen code={recoveryCodeToShow} onDone={() => { setRecoveryCodeToShow(null); setVaultState("open"); }} />
      </VaultShell>
    );
  }
  if (vaultState === "locked") {
    return (
      <VaultShell>
        <VaultUnlock
          email={session.user.email}
          onUnlock={handleUnlock}
          onRecover={handleRecover}
          onSignOut={() => supabase.auth.signOut()}
        />
      </VaultShell>
    );
  }

  // ─── LEGAL PAGES ──────────────────────────────────────────────────────────
  if (view === "privacy") return <PrivacyPolicy onBack={() => setView("settings")} />;
  if (view === "terms") return <TermsOfService onBack={() => setView("settings")} />;

  // ─── STATS ────────────────────────────────────────────────────────────────
  if (view === "stats") return <StatsView cards={cards} onBack={() => setView("dashboard")} />;

  // ─── SETTINGS ─────────────────────────────────────────────────────────────
  if (view === "settings") {
    return (
      <div style={S.page}>
        <div style={S.container}>
          <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
            <button style={S.backBtn} onClick={() => setView("dashboard")}>→ חזרה</button>
            <h1 style={{ ...S.title, margin: 0 }}>⚙️ הגדרות</h1>
          </header>

          <div style={S.sectionCard}>
            <h3 style={S.sectionTitle}>🔒 אבטחה והצפנה</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ color: "#10b981", fontSize: 14 }}>✓ הקודים שלך מוצפנים בסיסמה (נדרשת בכל כניסה)</div>
              <button style={S.outlineBtn} onClick={() => setSecurityModal("change")}>🔑 שנה סיסמת הצפנה</button>
              <button style={S.outlineBtn} onClick={() => setSecurityModal("regen")}>♻️ צור קוד שחזור חדש</button>
              <div style={{ height: 1, background: "#1f2937", margin: "4px 0" }} />
              <div style={{ color: "#9ca3af", fontSize: 13 }}>קוד חשיפה — נדרש לפני הצגת קוד של כרטיס</div>
              {revealPinRecord ? (
                <>
                  <div style={{ color: "#10b981", fontSize: 14 }}>✓ קוד חשיפה פעיל</div>
                  <button style={S.outlineBtn} onClick={() => setPinSetModal("set")}>שנה קוד חשיפה</button>
                  <button style={{ ...S.outlineBtn, borderColor: "#ef4444", color: "#ef4444" }} onClick={() => setPinSetModal("remove")}>הסר קוד חשיפה</button>
                </>
              ) : (
                <button style={S.outlineBtn} onClick={() => setPinSetModal("set")}>🔢 הגדר קוד חשיפה (PIN)</button>
              )}
            </div>
          </div>

          <div style={S.sectionCard}>
            <h3 style={S.sectionTitle}>📄 משפטי</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button style={{ ...S.outlineBtn, textAlign: "right" }} onClick={() => setView("privacy")}>🔒 מדיניות פרטיות</button>
              <button style={{ ...S.outlineBtn, textAlign: "right" }} onClick={() => setView("terms")}>📋 תנאי שימוש</button>
            </div>
          </div>

          <div style={S.sectionCard}>
            <h3 style={S.sectionTitle}>👤 חשבון</h3>
            <div style={{ color: "#9ca3af", fontSize: 14, marginBottom: 12 }}>מחובר כ: <strong style={{ color: "#e8eaf6" }}>{session.user.email}</strong></div>
            <button style={{ ...S.outlineBtn, borderColor: "#ef4444", color: "#ef4444" }} onClick={async () => { await supabase.auth.signOut(); }}>
              🚪 התנתק
            </button>
          </div>

          <div style={S.sectionCard}>
            <h3 style={S.sectionTitle}>💾 גיבוי והעברת נתונים</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button style={S.primaryBtn} onClick={exportData}>📥 ייצא גיבוי מוצפן</button>
              <div style={{ color: "#4b5563", fontSize: 11, marginBottom: 4 }}>הקובץ מוצפן בסיסמה שתבחר — בטוח לשמירה בענן או במייל</div>
              <div style={{ height: 1, background: "#1f2937", margin: "4px 0" }} />
              <button style={S.outlineBtn} onClick={() => importRef.current?.click()}>
                📤 ייבא גיבוי
              </button>
              <input ref={importRef} type="file" accept=".json" style={{ display: "none" }} onChange={importOldBackup} />
              <div style={{ color: "#4b5563", fontSize: 11 }}>תומך בגיבוי מוצפן וגם בגיבוי ישן. הנתונים מסונכרנים בין כל המכשירים</div>
            </div>
          </div>

          <div style={S.sectionCard}>
            <h3 style={S.sectionTitle}>📊 נתונים</h3>
            <div style={{ display: "flex", justifyContent: "space-between", color: "#ccd6f6", fontSize: 14, marginBottom: 10 }}>
              <span>סה״כ כרטיסים</span><span style={{ fontWeight: 700 }}>{cards.length}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", color: "#ccd6f6", fontSize: 14 }}>
              <span>סה״כ עסקאות</span><span style={{ fontWeight: 700 }}>{cards.flatMap(c => c.transactions || []).length}</span>
            </div>
          </div>
        </div>

        {securityModal === "change" && (
          <Modal title="שנה סיסמת הצפנה" onClose={() => setSecurityModal(null)}>
            <ChangePassphraseForm onSave={handleChangePassphrase} />
          </Modal>
        )}

        {securityModal === "regen" && (
          <Modal title="צור קוד שחזור חדש" onClose={() => setSecurityModal(null)}>
            <p style={{ color: "#9ca3af", fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
              יצירת קוד שחזור חדש <strong style={{ color: "#fbbf24" }}>תבטל את הקוד הישן</strong>. רק הקוד החדש יעבוד מעכשיו.
            </p>
            <button style={S.primaryBtn} onClick={handleRegenerateRecovery}>צור קוד חדש</button>
            <button style={{ ...S.outlineBtn, marginTop: 10 }} onClick={() => setSecurityModal(null)}>ביטול</button>
          </Modal>
        )}

        {recoveryCodeToShow && (
          <Modal title="קוד שחזור חדש" onClose={() => setRecoveryCodeToShow(null)}>
            <RecoveryScreen code={recoveryCodeToShow} inModal onDone={() => setRecoveryCodeToShow(null)} />
          </Modal>
        )}

        {pinSetModal === "set" && (
          <Modal title="קוד חשיפה" onClose={() => setPinSetModal(null)}>
            <RevealPinPad mode="set" title="בחר קוד חשיפה" onSet={handleSetRevealPin} onCancel={() => setPinSetModal(null)} />
          </Modal>
        )}

        {pinSetModal === "remove" && (
          <Modal title="הסר קוד חשיפה" onClose={() => setPinSetModal(null)}>
            <RevealPinPad mode="verify" title="אמת את הקוד הנוכחי"
              onVerify={async (pin) => {
                const ok = await verifyPinRecord(pin, revealPinRecord);
                if (ok) handleRemoveRevealPin();
                return ok;
              }}
              onCancel={() => setPinSetModal(null)} />
          </Modal>
        )}

        {backupModal === "export" && (
          <Modal title="ייצוא גיבוי מוצפן" onClose={() => setBackupModal(null)}>
            <BackupPasswordForm mode="export" onSubmit={doExport} />
          </Modal>
        )}

        {backupModal === "import" && (
          <Modal title="שחזור מגיבוי מוצפן" onClose={() => { setBackupModal(null); setPendingImport(null); }}>
            <BackupPasswordForm mode="import" onSubmit={doImport} />
          </Modal>
        )}

        {toast && <Toast toast={toast} />}
      </div>
    );
  }
  if (view === "add") {
    const prov = provider(form.provider);
    const cardBg = form.color || prov.color;
    return (
      <div style={S.page}>
        <div style={S.container}>
          <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <button style={S.backBtn} onClick={() => { setView(editingCard ? "detail" : "dashboard"); setEditingCard(null); setForm({ provider: "buyme", code: "", originalAmount: "", expiry: "", expiryDisplay: "", notes: "", image: null, color: "", storeName: "", cvv: "", cardHolder: "" }); }}>→ חזרה</button>
            <h1 style={{ ...S.title, margin: 0 }}>{editingCard ? "ערוך כרטיס" : form.provider === "credit" ? "הוסף זיכוי" : "הוסף כרטיס"}</h1>
          </header>

          <div style={{ background: `linear-gradient(135deg, ${cardBg}ee, ${cardBg}88)`, borderRadius: 20, padding: "20px 22px", marginBottom: 20, color: "#fff" }}>
            <div style={{ fontSize: 28 }}>{prov.icon}</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginTop: 6 }}>{form.provider === "credit" && form.storeName ? form.storeName : prov.name}</div>
            {form.provider === "credit" && <div style={{ background: "#ffffff33", display: "inline-block", padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, marginTop: 4 }}>↩️ זיכוי חנות</div>}
            <div style={{ fontSize: 13, opacity: 0.8, marginTop: 4, fontFamily: "monospace" }}>{form.code || (form.provider === "credit" ? "ללא קוד" : "XXXX-XXXX-XXXX")}</div>
            <div style={{ fontSize: 26, fontWeight: 800, marginTop: 12 }}>{form.originalAmount ? fmt(form.originalAmount) : "₪0.00"}</div>
          </div>

          <div style={S.card}>
            <div style={S.formGroup}>
              <label style={S.label}>ספק</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                {PROVIDERS.map((p) => (
                  <button key={p.id} style={{ ...S.providerBtn, background: form.provider === p.id ? p.color : "#0d1117", border: `2px solid ${form.provider === p.id ? p.color : "#2d3250"}` }} onClick={() => setForm(f => ({ ...f, provider: p.id }))}>
                    <span style={{ fontSize: 18 }}>{p.icon}</span>
                    <span style={{ fontSize: 10, marginTop: 3, color: form.provider === p.id ? "#fff" : "#8892b0" }}>{p.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div style={S.formGroup}>
              <label style={S.label}>קוד הכרטיס {form.provider === "credit" ? "/ מספר זיכוי (אופציונלי)" : ""}</label>
              <input style={S.input} placeholder={form.provider === "credit" ? "מספר זיכוי (אופציונלי)" : "לדוגמה: GIFT-1234-ABCD"} value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} dir="ltr" />
            </div>

            {form.provider === "credit" && (
              <div style={S.formGroup}>
                <label style={S.label}>שם החנות</label>
                <input style={S.input} placeholder="לדוגמה: זארה, H&M, קסטרו..." value={form.storeName} onChange={e => setForm(f => ({ ...f, storeName: e.target.value }))} />
              </div>
            )}

            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ ...S.formGroup, flex: 1, minWidth: 0 }}>
                <label style={S.label}>סכום (₪)</label>
                <input style={S.input} type="number" placeholder="0.00" value={form.originalAmount} onChange={e => setForm(f => ({ ...f, originalAmount: e.target.value }))} />
              </div>
              <div style={{ ...S.formGroup, flex: 1, minWidth: 0 }}>
                <label style={S.label}>תוקף (MM/YY)</label>
                <input
                  style={{ ...S.input, width: "100%" }}
                  type="text"
                  placeholder="06/28"
                  maxLength={5}
                  value={form.expiryDisplay || ""}
                  dir="ltr"
                  onChange={e => {
                    let v = e.target.value.replace(/\D/g, "");
                    if (v.length >= 3) v = v.slice(0, 2) + "/" + v.slice(2, 4);
                    const parts = v.split("/");
                    let isoDate = "";
                    if (parts.length === 2 && parts[0].length === 2 && parts[1].length === 2) {
                      isoDate = `20${parts[1]}-${parts[0]}-01`;
                    }
                    setForm(f => ({ ...f, expiryDisplay: v, expiry: isoDate }));
                  }}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ ...S.formGroup, flex: 1, minWidth: 0 }}>
                <label style={S.label}>CVV 🔒</label>
                <input style={S.input} type="password" placeholder="•••" maxLength={4} value={form.cvv} onChange={e => setForm(f => ({ ...f, cvv: e.target.value }))} dir="ltr" />
              </div>
              <div style={{ ...S.formGroup, flex: 2, minWidth: 0 }}>
                <label style={S.label}>שם בעל הכרטיס</label>
                <input style={S.input} placeholder="ישראל ישראלי" value={form.cardHolder} onChange={e => setForm(f => ({ ...f, cardHolder: e.target.value }))} />
              </div>
            </div>

            <div style={S.formGroup}>
              <label style={S.label}>צבע מותאם</label>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {["", "#E91E8C", "#6C3FC5", "#FF6B35", "#00B894", "#FF9900", "#4285F4", "#ef4444", "#0ea5e9"].map(c => (
                  <button key={c} style={{ width: 32, height: 32, borderRadius: "50%", background: c || "#2d3250", border: form.color === c ? "3px solid #fff" : "2px solid #2d3250", cursor: "pointer", flexShrink: 0 }} onClick={() => setForm(f => ({ ...f, color: c }))} />
                ))}
              </div>
            </div>

            <div style={S.formGroup}>
              <label style={S.label}>תמונת כרטיס (אופציונלי)</label>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <button style={S.outlineBtn} onClick={() => fileRef.current?.click()}>📷 העלה תמונה</button>
                {form.image && <button style={{ ...S.outlineBtn, borderColor: "#ef4444", color: "#ef4444" }} onClick={() => setForm(f => ({ ...f, image: null }))}>הסר</button>}
                <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageUpload} />
              </div>
              {form.image && <img src={form.image} alt="" style={{ marginTop: 10, width: "100%", borderRadius: 12, maxHeight: 120, objectFit: "cover" }} />}
            </div>

            <div style={S.formGroup}>
              <label style={S.label}>הערות</label>
              <input style={S.input} placeholder="מאיפה קיבלת? לאיזה מטרה?" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>

            <button style={S.primaryBtn} onClick={addCard}>{editingCard ? "✓ שמור שינויים" : "+ הוסף"}</button>
          </div>
        </div>
        {toast && <Toast toast={toast} />}
      </div>
    );
  }

  // ─── USE ─────────────────────────────────────────────────────────────────
  if (view === "use" && selectedCard) {
    const prov = provider(selectedCard.provider);
    const cardColor = selectedCard.color || prov.color;
    return (
      <div style={S.page}>
        <div style={S.container}>
          <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <button style={S.backBtn} onClick={() => setView("detail")}>→ חזרה</button>
            <h1 style={{ ...S.title, margin: 0 }}>רישום שימוש</h1>
          </header>
          <div style={{ background: `linear-gradient(135deg, ${cardColor}ee, ${cardColor}88)`, borderRadius: 20, padding: "20px 22px", marginBottom: 20, color: "#fff", textAlign: "center" }}>
            <div style={{ opacity: 0.8, fontSize: 13 }}>יתרה זמינה</div>
            <div style={{ fontSize: 36, fontWeight: 800 }}>{fmt(selectedCard.remainingAmount)}</div>
            <div style={{ opacity: 0.7, fontSize: 13 }}>{prov.icon} {prov.name}</div>
          </div>
          <div style={S.card}>
            <div style={S.formGroup}>
              <label style={S.label}>חנות / עסק</label>
              <input style={S.input} placeholder="לדוגמה: זארה, ספרים ועוד..." value={useForm.store} onChange={e => setUseForm(f => ({ ...f, store: e.target.value }))} />
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ ...S.formGroup, flex: 1 }}>
                <label style={S.label}>סכום (₪)</label>
                <input style={S.input} type="number" placeholder="0.00" value={useForm.amount} onChange={e => setUseForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
              <div style={{ ...S.formGroup, flex: 1 }}>
                <label style={S.label}>תאריך</label>
                <input style={S.input} type="date" value={useForm.date} onChange={e => setUseForm(f => ({ ...f, date: e.target.value }))} />
              </div>
            </div>
            <div style={S.formGroup}>
              <label style={S.label}>קטגוריה</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {CATEGORIES.map(cat => (
                  <button key={cat} style={{ border: "none", borderRadius: 20, padding: "7px 14px", cursor: "pointer", fontFamily: "inherit", fontSize: 13, background: useForm.purpose === cat ? "#6c63ff" : "#0d1117", color: useForm.purpose === cat ? "#fff" : "#8892b0", borderWidth: 2, borderStyle: "solid", borderColor: useForm.purpose === cat ? "#6c63ff" : "#2d3250" }} onClick={() => setUseForm(f => ({ ...f, purpose: cat }))}>
                    {CATEGORY_ICONS[cat]} {cat}
                  </button>
                ))}
              </div>
            </div>
            <div style={S.formGroup}>
              <label style={S.label}>הערות</label>
              <input style={S.input} placeholder="מה קנית?" value={useForm.notes} onChange={e => setUseForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <button style={S.primaryBtn} onClick={recordUse}>✓ רשום שימוש</button>
          </div>
        </div>
        {toast && <Toast toast={toast} />}
      </div>
    );
  }

  // ─── DETAIL ───────────────────────────────────────────────────────────────
  if (view === "detail" && selectedCard) {
    const prov = provider(selectedCard.provider);
    const cardColor = selectedCard.color || prov.color;
    const usedPct = Math.round(((selectedCard.originalAmount - selectedCard.remainingAmount) / selectedCard.originalAmount) * 100);
    const expired = isExpired(selectedCard.expiry);
    const dl = daysLeft(selectedCard.expiry);

    return (
      <div style={S.page}>
        <div style={S.container}>
          <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <button style={S.backBtn} onClick={() => setView("dashboard")}>→ חזרה</button>
            <div style={{ display: "flex", gap: 12 }}>
              <button style={S.backBtn} onClick={() => { setForm({ provider: selectedCard.provider, code: selectedCard.code || "", originalAmount: String(selectedCard.originalAmount), expiry: selectedCard.expiry || "", expiryDisplay: selectedCard.expiry ? `${selectedCard.expiry.slice(5, 7)}/${selectedCard.expiry.slice(2, 4)}` : "", notes: selectedCard.notes || "", image: selectedCard.image, color: selectedCard.color || "", storeName: selectedCard.storeName || "", cvv: selectedCard.cvv || "", cardHolder: selectedCard.cardHolder || "" }); setEditingCard(selectedCard); setView("add"); }}>✏️ ערוך</button>
              <button style={{ ...S.backBtn }} onClick={() => setShareModal(selectedCard)}>🔗 שתף</button>
              <button style={{ ...S.backBtn, color: "#ef4444" }} onClick={() => setConfirmDeleteId(selectedCard.id)}>🗑</button>
            </div>
          </header>

          <div style={{ background: `linear-gradient(135deg, ${cardColor}ee, ${cardColor}66)`, borderRadius: 24, padding: 24, color: "#fff", marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 30 }}>{prov.icon}</div>
                <div style={{ fontSize: 20, fontWeight: 800, marginTop: 6 }}>{selectedCard.provider === "credit" && selectedCard.storeName ? selectedCard.storeName : prov.name}</div>
                {selectedCard.provider === "credit" && <div style={{ background: "#ffffff33", display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, marginTop: 4 }}>↩️ זיכוי חנות</div>}
                <div style={{ opacity: 0.75, fontSize: 13, fontFamily: "monospace", marginTop: 4 }}>
                  {revealedCards[selectedCard.id] ? selectedCard.code : "•••• •••• ••••"}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
                {selectedCard.fullyUsed && <span style={{ background: "#ffffff33", padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700 }}>נוצל במלואו</span>}
                {expired && !selectedCard.fullyUsed && <span style={{ background: "#ef444433", color: "#fca5a5", padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700 }}>פג תוקף</span>}
                {isExpiringSoon(selectedCard.expiry) && !selectedCard.fullyUsed && <span style={{ background: "#f59e0b33", color: "#fcd34d", padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700 }}>⚠ {dl} ימים!</span>}
              </div>
            </div>
            <div style={{ marginTop: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, opacity: 0.8, fontSize: 13 }}>
                <span>נוצל {usedPct}%</span>
                <span>תוקף: {fmtDate(selectedCard.expiry)}</span>
              </div>
              <div style={{ ...S.progressBg, background: "#ffffff22" }}>
                <div style={{ ...S.progressFill, width: `${usedPct}%`, background: "#ffffff" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14 }}>
                <div>
                  <div style={{ fontSize: 34, fontWeight: 800 }}>{fmt(selectedCard.remainingAmount)}</div>
                  <div style={{ opacity: 0.7, fontSize: 12 }}>מתוך {fmt(selectedCard.originalAmount)}</div>
                </div>
                <div style={{ textAlign: "left" }}>
                  <div style={{ opacity: 0.7, fontSize: 12 }}>נוצל</div>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>{fmt(selectedCard.originalAmount - selectedCard.remainingAmount)}</div>
                </div>
              </div>
            </div>
          </div>

          {selectedCard.image && (
            <>
              {revealedCards[selectedCard.id] ? (
                <div style={{ marginBottom: 14, borderRadius: 18, overflow: "hidden", border: "1px solid #1f2937", cursor: "zoom-in", position: "relative" }} onClick={() => setLightbox(selectedCard.image)}>
                  <img src={selectedCard.image} alt="תמונת כרטיס" style={{ width: "100%", display: "block", objectFit: "contain", background: "#0a0f1e" }} />
                  <div style={{ position: "absolute", bottom: 8, left: 8, background: "#000a", color: "#fff", fontSize: 11, padding: "4px 10px", borderRadius: 20, fontWeight: 600 }}>🔍 לחץ להגדלה</div>
                </div>
              ) : (
                <div style={{ marginBottom: 14, borderRadius: 18, overflow: "hidden", border: "1px solid #1f2937", position: "relative", background: "#111827", height: 120, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ filter: "blur(12px)", position: "absolute", inset: 0, backgroundImage: `url(${selectedCard.image})`, backgroundSize: "cover", backgroundPosition: "center", opacity: 0.4 }} />
                  <button style={{ position: "relative", zIndex: 1, background: "#000a", border: "1px solid #2d3250", color: "#fff", padding: "10px 20px", borderRadius: 20, cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: "inherit" }} onClick={() => revealSensitiveData(selectedCard)}>
                    👁 הצג תמונה
                  </button>
                </div>
              )}
              {lightbox && (
                <div style={{ position: "fixed", inset: 0, background: "#000d", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={() => setLightbox(null)}>
                  <img src={lightbox} alt="" style={{ maxWidth: "100%", maxHeight: "100%", borderRadius: 14, objectFit: "contain" }} />
                  <button style={{ position: "absolute", top: 20, left: 20, background: "#ffffff22", border: "none", color: "#fff", fontSize: 24, width: 44, height: 44, borderRadius: "50%", cursor: "pointer" }} onClick={() => setLightbox(null)}>✕</button>
                </div>
              )}
            </>
          )}

          {/* Sensitive data: Code + CVV */}
          <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 16, padding: 16, marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ color: "#6b7280", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>פרטים מוגנים</span>
              {revealedCards[selectedCard.id] ? (
                <span style={{ color: "#10b981", fontSize: 11, fontWeight: 600 }}>🔓 גלוי — נסתר בקרוב</span>
              ) : (
                <button style={{ background: "linear-gradient(135deg, #6c63ff, #a855f7)", border: "none", color: "#fff", padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }} onClick={() => revealSensitiveData(selectedCard)}>
                  👁 הצג
                </button>
              )}
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 2, minWidth: 0 }}>
                <div style={{ color: "#6b7280", fontSize: 11, marginBottom: 4 }}>קוד כרטיס</div>
                <div style={{ fontFamily: "monospace", fontSize: 15, color: "#e8eaf6", letterSpacing: 2, overflowWrap: "anywhere" }}>
                  {revealedCards[selectedCard.id] ? selectedCard.code : "•••• •••• ••••"}
                </div>
                {revealedCards[selectedCard.id] && selectedCard.code && (
                  <button onClick={() => copyText(selectedCard.code)} style={{ marginTop: 8, background: "#1e2235", border: "1px solid #2d3250", color: "#a8b2d8", padding: "5px 12px", borderRadius: 18, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>📋 העתק קוד</button>
                )}
              </div>
              {selectedCard.cvv && (
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: "#6b7280", fontSize: 11, marginBottom: 4 }}>CVV</div>
                  <div style={{ fontFamily: "monospace", fontSize: 15, color: "#e8eaf6", letterSpacing: 2 }}>
                    {revealedCards[selectedCard.id] ? selectedCard.cvv : "•••"}
                  </div>
                </div>
              )}
            </div>
            {selectedCard.cardHolder && (
              <div style={{ marginTop: 10 }}>
                <div style={{ color: "#6b7280", fontSize: 11, marginBottom: 4 }}>שם בעל הכרטיס</div>
                <div style={{ fontSize: 14, color: "#e8eaf6" }}>{selectedCard.cardHolder}</div>
              </div>
            )}
          </div>

          {selectedCard.notes && <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 12, padding: "12px 16px", fontSize: 14, color: "#a8b2d8", marginBottom: 12 }}>📝 {selectedCard.notes}</div>}

          {prov.checkUrl && (
            <a href={prov.checkUrl} target="_blank" rel="noreferrer" style={{ display: "block", textAlign: "center", background: "#111827", border: "1px solid #1f2937", color: "#a8b2d8", padding: "12px", borderRadius: 14, fontSize: 14, textDecoration: "none", marginBottom: 12 }}>
              🔍 בדוק יתרה באתר {prov.name} ↗
            </a>
          )}

          {!selectedCard.fullyUsed && !expired && (
            <button style={S.primaryBtn} onClick={() => setView("use")}>+ רשום שימוש חדש</button>
          )}

          <div style={{ marginTop: 28 }}>
            <h3 style={{ ...S.sectionTitle, marginBottom: 12 }}>היסטוריית שימוש ({(selectedCard.transactions || []).length})</h3>
            {(selectedCard.transactions || []).length === 0 ? (
              <div style={{ textAlign: "center", color: "#8892b0", padding: "28px", fontSize: 14 }}>אין שימוש רשום עדיין</div>
            ) : [...(selectedCard.transactions || [])].sort((a, b) => new Date(b.date) - new Date(a.date)).map(tx => (
              <div key={tx.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", borderBottom: "1px solid #1f2937" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, color: "#ccd6f6" }}>{tx.store}</div>
                  <div style={{ color: "#8892b0", fontSize: 12, marginTop: 3 }}>{CATEGORY_ICONS[tx.purpose]} {tx.purpose} · {fmtDate(tx.date)}{tx.notes ? ` · ${tx.notes}` : ""}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ color: "#ef4444", fontWeight: 700, fontSize: 16 }}>-{fmt(tx.amount)}</span>
                  <button style={{ background: "none", border: "none", color: "#4b5563", cursor: "pointer", fontSize: 16, padding: 4 }} onClick={() => deleteTx(selectedCard.id, tx.id, tx.amount)}>🗑</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {revealPinModal && (
          <Modal title="הצגת קוד" onClose={() => setRevealPinModal(null)}>
            <RevealPinPad
              mode="verify"
              title="הכנס קוד חשיפה"
              subtitle="הפרטים יוצגו ל-30 שניות"
              onVerify={async (pin) => {
                const ok = await verifyPinRecord(pin, revealPinRecord);
                if (ok) {
                  const c = cards.find(x => x.id === revealPinModal);
                  setRevealPinModal(null);
                  if (c) doReveal(c.id, c);
                }
                return ok;
              }}
              onCancel={() => setRevealPinModal(null)}
            />
          </Modal>
        )}

        {confirmDeleteId && (
          <Modal title="מחק כרטיס?" onClose={() => setConfirmDeleteId(null)}>
            <p style={{ color: "#9ca3af", textAlign: "center", marginBottom: 24 }}>פעולה זו לא ניתנת לביטול.</p>
            <div style={{ display: "flex", gap: 12 }}>
              <button style={{ ...S.primaryBtn, background: "#ef4444", flex: 1, marginTop: 0 }} onClick={() => deleteCard(confirmDeleteId)}>מחק</button>
              <button style={{ ...S.outlineBtn, flex: 1 }} onClick={() => setConfirmDeleteId(null)}>ביטול</button>
            </div>
          </Modal>
        )}

        {shareModal && (
          <Modal title="שתף כרטיס" onClose={() => setShareModal(null)}>
            <p style={{ color: "#9ca3af", fontSize: 14, marginBottom: 20 }}>שתף את פרטי הכרטיס עם מישהו אחר</p>
            <div style={{ background: "#0a0f1e", borderRadius: 12, padding: 16, marginBottom: 20, fontFamily: "monospace", fontSize: 13, color: "#a8b2d8", lineHeight: 1.8 }}>
              🎁 {provider(shareModal.provider).name}<br />
              קוד: {shareModal.code}<br />
              יתרה: {fmt(shareModal.remainingAmount)}<br />
              {shareModal.expiry && `תוקף: ${fmtDate(shareModal.expiry)}`}
            </div>
            <button style={S.primaryBtn} onClick={() => shareCard(shareModal)}>
              {navigator.share ? "📤 שתף" : "📋 העתק פרטים"}
            </button>
          </Modal>
        )}

        {toast && <Toast toast={toast} />}
      </div>
    );
  }

  // ─── DASHBOARD ────────────────────────────────────────────────────────────
  const totalRemaining = cards.filter(c => !c.fullyUsed && !isExpired(c.expiry)).reduce((s, c) => s + c.remainingAmount, 0);
  const activeCount = cards.filter(c => !c.fullyUsed && !isExpired(c.expiry)).length;
  const expiringSoonCount = cards.filter(c => !c.fullyUsed && isExpiringSoon(c.expiry)).length;
  const totalSaved = cards.reduce((s, c) => s + c.originalAmount, 0);

  return (
    <div style={{ ...S.page, display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
      {/* STICKY HEADER */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, background: "#0a0f1e", borderBottom: "1px solid #1f2937", padding: "16px 16px 12px", maxWidth: 520, width: "100%", margin: "0 auto", boxSizing: "border-box" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <h1 style={{ ...S.title, marginBottom: 2, fontSize: 22 }}>🎁 ארנק הטבות</h1>
            <div style={{ color: "#6b7280", fontSize: 11 }}>{session.user.email}</div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer" }} onClick={() => setView("stats")}>📊</button>
            <button style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer" }} onClick={() => setView("settings")}>⚙️</button>
            <button style={S.addBtn} onClick={() => { setEditingCard(null); setForm({ provider: "buyme", code: "", originalAmount: "", expiry: "", expiryDisplay: "", notes: "", image: null, color: "", storeName: "", cvv: "", cardHolder: "" }); setView("add"); }}>+ הוסף</button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
          {[
            { label: "יתרה", value: fmt(totalRemaining), color: "#10b981" },
            { label: "פעילים", value: activeCount, color: "#6c63ff" },
            { label: "פגי תוקף", value: expiringSoonCount, color: expiringSoonCount > 0 ? "#f59e0b" : "#374151" },
            { label: "סה״כ ערך", value: `₪${Math.round(totalSaved / 1000) > 0 ? (totalSaved / 1000).toFixed(1) + "k" : totalSaved}`, color: "#a855f7" },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: "#111827", borderRadius: 12, padding: "10px 8px", textAlign: "center", border: "1px solid #1f2937" }}>
              <div style={{ fontSize: 14, fontWeight: 800, color }}>{value}</div>
              <div style={{ fontSize: 10, color: "#6b7280", marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>

        <div style={{ position: "relative", marginBottom: 10 }}>
          <input style={{ ...S.input, paddingRight: 40 }} placeholder="🔍 חיפוש..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          {searchQuery && <button style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: 16 }} onClick={() => setSearchQuery("")}>✕</button>}
        </div>
      </div>

      {/* SCROLLABLE */}
      <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
        <div style={{ maxWidth: 520, margin: "0 auto", padding: "12px 16px 80px", boxSizing: "border-box" }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 12, overflowX: "auto", paddingBottom: 4 }}>
            <button style={{ ...S.chipBtn, background: filterProvider === "all" ? "#6c63ff" : "#111827", flexShrink: 0 }} onClick={() => setFilterProvider("all")}>הכל ({cards.filter(c => showUsed || !c.fullyUsed).length})</button>
            {PROVIDERS.filter(p => cards.some(c => c.provider === p.id)).map(p => (
              <button key={p.id} style={{ ...S.chipBtn, background: filterProvider === p.id ? p.color : "#111827", flexShrink: 0 }} onClick={() => setFilterProvider(filterProvider === p.id ? "all" : p.id)}>
                {p.icon} {p.name}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", color: "#9ca3af", fontSize: 13 }}>
              <input type="checkbox" checked={showUsed} onChange={e => setShowUsed(e.target.checked)} style={{ accentColor: "#6c63ff" }} />
              הצג שנוצלו / פגו
            </label>
            <div style={{ position: "relative" }}>
              <button style={{ ...S.chipBtn, display: "flex", alignItems: "center", gap: 6 }} onClick={() => setShowSortMenu(v => !v)}>
                ⇅ {SORT_OPTIONS.find(s => s.id === sortBy)?.label}
              </button>
              {showSortMenu && (
                <div style={{ position: "absolute", left: 0, top: "110%", background: "#111827", border: "1px solid #1f2937", borderRadius: 12, padding: 8, zIndex: 100, minWidth: 150 }}>
                  {SORT_OPTIONS.map(opt => (
                    <button key={opt.id} style={{ display: "block", width: "100%", background: sortBy === opt.id ? "#6c63ff" : "none", border: "none", color: sortBy === opt.id ? "#fff" : "#9ca3af", padding: "8px 14px", borderRadius: 8, cursor: "pointer", fontFamily: "inherit", fontSize: 13, textAlign: "right" }} onClick={() => { setSortBy(opt.id); setShowSortMenu(false); }}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {loading && <div style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>טוען...</div>}

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {!loading && filteredCards.length === 0 && (
              <div style={{ textAlign: "center", padding: "60px 20px", color: "#6b7280" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🃏</div>
                <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 8, color: "#9ca3af" }}>{searchQuery ? "לא נמצאו תוצאות" : "אין כרטיסים עדיין"}</div>
                <div style={{ fontSize: 13 }}>לחץ + הוסף כדי להתחיל</div>
              </div>
            )}
            {filteredCards.map(card => {
              const prov = provider(card.provider);
              const cardColor = card.color || prov.color;
              const usedPct = Math.round(((card.originalAmount - card.remainingAmount) / card.originalAmount) * 100);
              const expired = isExpired(card.expiry);
              const expiring = isExpiringSoon(card.expiry);
              const dl = daysLeft(card.expiry);
              return (
                <button key={card.id} style={{ background: "#111827", borderRadius: 18, padding: 0, border: `1px solid ${expiring ? "#f59e0b44" : "#1f2937"}`, cursor: "pointer", width: "100%", textAlign: "right", fontFamily: "inherit", overflow: "hidden", opacity: card.fullyUsed || expired ? 0.55 : 1 }}
                  onClick={() => { setSelectedId(card.id); setView("detail"); }}>
                  <div style={{ height: 4, background: `linear-gradient(90deg, ${cardColor}, ${cardColor}44)` }} />
                  <div style={{ padding: "16px 18px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <div style={{ width: 48, height: 48, borderRadius: 13, background: `linear-gradient(135deg, ${cardColor}, ${cardColor}88)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
                        {prov.icon}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <div style={{ fontWeight: 800, fontSize: 19, color: card.fullyUsed ? "#6b7280" : "#f3f4f6" }}>{fmt(card.remainingAmount)}</div>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
                            <div style={{ fontWeight: 600, fontSize: 14, color: "#9ca3af" }}>{card.provider === "credit" && card.storeName ? card.storeName : prov.name}</div>
                            {card.provider === "credit" && <span style={{ background: "#0ea5e922", color: "#38bdf8", padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700 }}>↩️ זיכוי</span>}
                          </div>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 3 }}>
                          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                            {card.fullyUsed && <span style={{ background: "#1f2937", color: "#6b7280", padding: "2px 8px", borderRadius: 20, fontSize: 10 }}>נוצל במלואו</span>}
                            {expired && !card.fullyUsed && <span style={{ background: "#ef444422", color: "#f87171", padding: "2px 8px", borderRadius: 20, fontSize: 10 }}>פג תוקף</span>}
                            {expiring && !card.fullyUsed && <span style={{ background: "#f59e0b22", color: "#fcd34d", padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700 }}>⚠ {dl} ימים</span>}
                          </div>
                          <div style={{ color: "#4b5563", fontSize: 11, fontFamily: "monospace" }}>{prov.name}</div>
                        </div>
                        <div style={{ marginTop: 10 }}>
                          <div style={S.progressBg}>
                            <div style={{ ...S.progressFill, width: `${usedPct}%`, background: cardColor }} />
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3, color: "#4b5563", fontSize: 10 }}>
                            <span>נוצל {usedPct}% · {(card.transactions || []).length} עסקאות</span>
                            {card.expiry && <span>עד {fmtDate(card.expiry)}</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      {toast && <Toast toast={toast} />}
    </div>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────

const S = {
  page: { minHeight: "100vh", background: "#0a0f1e", color: "#e8eaf6", fontFamily: "'Segoe UI', 'Arial', sans-serif", direction: "rtl" },
  container: { maxWidth: 520, margin: "0 auto", padding: "20px 16px 80px" },
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
