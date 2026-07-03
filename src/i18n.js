// Lightweight bilingual (he / en) layer.
// Keys are the Hebrew source strings; English is looked up in EN with a fallback
// to the Hebrew key, so a not-yet-translated string simply stays Hebrew rather
// than breaking. The whole React tree re-renders on language change (App holds a
// langTick state), so module-level t()/dir() always reflect the current language.

export const LANGS = { he: "עברית", en: "English" };
const STORAGE_KEY = "gw_lang";

let _lang = (() => {
  try { return localStorage.getItem(STORAGE_KEY) || "he"; } catch { return "he"; }
})();

export function getLang() { return _lang; }
export function dir() { return _lang === "he" ? "rtl" : "ltr"; }
export function isRTL() { return _lang === "he"; }

export function setLang(lang) {
  _lang = lang === "en" ? "en" : "he";
  try { localStorage.setItem(STORAGE_KEY, _lang); } catch {}
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("lang", _lang);
    document.documentElement.setAttribute("dir", dir());
  }
}

export function t(s) {
  if (_lang === "he") return s;
  return EN[s] !== undefined ? EN[s] : s;
}

// Interpolating translate: ti("יובאו {n} כרטיסים", { n: 3 })
export function ti(s, vars) {
  let out = t(s);
  if (vars) for (const k in vars) out = out.split(`{${k}}`).join(vars[k]);
  return out;
}

const EN = {
  // ── App / generic ──
  "ארנק הטבות": "Gift Wallet",
  "טוען...": "Loading...",
  "ביטול": "Cancel",
  "סגור": "Close",
  "← חזרה": "← Back",
  "→ חזרה": "← Back",
  "שמור": "Save",

  // ── Auth ──
  "גיפט קארדים · קופונים · זיכויים": "Gift cards · Coupons · Credits",
  "כניסה / הרשמה": "Sign in / Sign up",
  "נשלח לך קוד 6 ספרות למייל": "We'll email you a 6-digit code",
  "אימייל": "Email",
  "כתובת אימייל לכניסה": "Email address for sign-in",
  "נא להכניס אימייל": "Please enter an email",
  "שלח קוד אימות לאימייל": "Send a verification code to your email",
  "שולח...": "Sending...",
  "שלח קוד ✉️": "Send code ✉️",
  "קוד חד פעמי — אין צורך בסיסמה": "One-time code — no password needed",
  "בהרשמה אתה מאשר את ": "By signing up you agree to the ",
  "קראתי ואני מאשר/ת את ": "I have read and agree to the ",
  "יש לאשר את תנאי השימוש ומדיניות הפרטיות": "You must accept the Terms of Service and Privacy Policy",
  "תנאי השימוש": "Terms of Service",
  " ואת ": " and ",
  "מדיניות הפרטיות": "Privacy Policy",
  "הכנס קוד": "Enter code",
  "קוד חייב להיות 6 ספרות": "Code must be 6 digits",
  "קוד שגוי או פג תוקף, נסה שוב": "Wrong or expired code, try again",
  "שגיאה בשליחת הקוד, נסה שוב מאוחר יותר": "Couldn't send the code, please try again later",
  "שלחנו קוד 6 ספרות ל-": "We sent a 6-digit code to ",
  "קוד אימות": "Verification code",
  "מאמת...": "Verifying...",
  "כניסה →": "Sign in →",
  "← חזרה לשינוי אימייל": "← Back to change email",
  "הקוד תקף ל-10 דקות": "The code is valid for 10 minutes",

  // ── Vault: setup / unlock / recovery / change ──
  "הגדרת סיסמת הצפנה": "Set encryption password",
  "הסיסמה הזו מצפינה את הקודים שלך. היא ": "This password encrypts your codes. It is ",
  "נשמרת רק אצלך": "stored only on your device",
  " ולא נשלחת לשרת — כך שגם אם מישהו יפרוץ למסד הנתונים, הוא לא יוכל לקרוא את הקודים בלעדיה.": " and never sent to the server — so even if someone breaches the database, they can't read your codes without it.",
  "סיסמה (לפחות 8 תווים)": "Password (at least 8 characters)",
  "אימות סיסמה": "Confirm password",
  "הצג סיסמה": "Show password",
  "הסתר סיסמה": "Hide password",
  "חוזק הסיסמה": "Password strength",
  "חלשה מאוד": "Very weak",
  "חלשה": "Weak",
  "בינונית": "Fair",
  "טובה": "Good",
  "חזקה": "Strong",
  "הסיסמה חייבת להיות לפחות 8 תווים": "Password must be at least 8 characters",
  "הסיסמאות לא תואמות": "Passwords don't match",
  "מצפין...": "Encrypting...",
  "הגדר והמשך →": "Set & continue →",
  "⚠️ אם תשכח את הסיסמה תצטרך את קוד השחזור שיוצג בשלב הבא. בלי אחד מהם לא ניתן לשחזר את הקודים.": "⚠️ If you forget the password you'll need the recovery code shown next. Without one of them, your codes can't be recovered.",
  "קוד השחזור שלך": "Your recovery code",
  "זה הגיבוי היחיד אם תשכח את הסיסמה. ": "This is your only backup if you forget the password. ",
  "שמור אותו עכשיו במקום בטוח": "Save it now somewhere safe",
  " (צילום מסך / מנהל סיסמאות). הוא לא יוצג שוב.": " (screenshot / password manager). It won't be shown again.",
  "✓ הועתק": "✓ Copied",
  "📋 העתק קוד": "📋 Copy code",
  "שמרתי את קוד השחזור במקום בטוח": "I saved the recovery code somewhere safe",
  "סיימתי, כניסה לארנק →": "Done — enter wallet →",
  "פתיחת הארנק": "Unlock wallet",
  "סיסמת הצפנה": "Encryption password",
  "סיסמה שגויה": "Wrong password",
  "פותח...": "Unlocking...",
  "🔓 פתח": "🔓 Unlock",
  "שכחת סיסמה? שחזור עם קוד": "Forgot password? Recover with a code",
  "🚪 התנתק": "🚪 Sign out",
  "שחזור באמצעות קוד": "Recover with a code",
  "הכנס את קוד השחזור שקיבלת, ובחר סיסמה חדשה.": "Enter the recovery code you received, then choose a new password.",
  "קוד שחזור": "Recovery code",
  "סיסמה חדשה": "New password",
  "אימות סיסמה חדשה": "Confirm new password",
  "הסיסמה החדשה חייבת להיות לפחות 8 תווים": "New password must be at least 8 characters",
  "הסיסמאות החדשות לא תואמות": "New passwords don't match",
  "קוד שחזור שגוי": "Wrong recovery code",
  "משחזר...": "Recovering...",
  "שחזר והגדר סיסמה →": "Recover & set password →",
  "סיסמה חדשה (לפחות 8 תווים)": "New password (at least 8 characters)",
  "שמור סיסמה חדשה": "Save new password",
  "הסיסמה אופסה בהצלחה ✓": "Password reset successfully ✓",

  // ── Reveal PIN ──
  "הכנס קוד חשיפה": "Enter reveal code",
  "הפרטים יוצגו ל-30 שניות": "Details will show for 30 seconds",
  "קוד שגוי": "Wrong code",
  "הקודים לא תואמים": "Codes don't match",
  "יותר מדי ניסיונות — המתן 30 שניות": "Too many attempts — wait 30 seconds",
  "אמת את הקוד שוב": "Confirm the code again",
  "בחר קוד חשיפה": "Choose a reveal code",
  "אמת את הקוד הנוכחי": "Confirm the current code",
  "בחר קוד ({n} ספרות)": "Choose a code ({n} digits)",

  // ── Backup ──
  "סיסמה של לפחות 6 תווים": "Password of at least 6 characters",
  "סיסמת גיבוי שגויה": "Wrong backup password",
  "בחר סיסמה להצפנת קובץ הגיבוי. ": "Choose a password to encrypt the backup file. ",
  "תצטרך אותה כדי לשחזר": "You'll need it to restore",
  " — שמור אותה.": " — keep it safe.",
  "סיסמת גיבוי (6+ תווים)": "Backup password (6+ characters)",
  "סיסמת הגיבוי": "Backup password",
  "מעבד...": "Processing...",
  "📥 ייצא גיבוי מוצפן": "📥 Export encrypted backup",
  "🔓 שחזר": "🔓 Restore",
  "ייצוא גיבוי מוצפן": "Export encrypted backup",
  "שחזור מגיבוי מוצפן": "Restore from encrypted backup",
  "קובץ לא תקין": "Invalid file",
  "שגיאה בקריאת הקובץ": "Error reading the file",
  "מייבא נתונים...": "Importing data...",
  "גיבוי מוצפן הורד ✓": "Encrypted backup downloaded ✓",

  // ── Settings ──
  "⚙️ הגדרות": "⚙️ Settings",
  "🔒 אבטחה והצפנה": "🔒 Security & encryption",
  "✓ הקודים שלך מוצפנים בסיסמה (נדרשת בכל כניסה)": "✓ Your codes are encrypted with a password (required on every sign-in)",
  "🔑 שנה סיסמת הצפנה": "🔑 Change encryption password",
  "♻️ צור קוד שחזור חדש": "♻️ Generate a new recovery code",
  "קוד חשיפה — נדרש לפני הצגת קוד של כרטיס": "Reveal code — required before showing a card's code",
  "✓ קוד חשיפה פעיל": "✓ Reveal code is active",
  "שנה קוד חשיפה": "Change reveal code",
  "הסר קוד חשיפה": "Remove reveal code",
  "🔢 הגדר קוד חשיפה (PIN)": "🔢 Set a reveal code (PIN)",
  "🌐 שפה": "🌐 Language",
  "📄 משפטי": "📄 Legal",
  "🔒 מדיניות פרטיות": "🔒 Privacy Policy",
  "📋 תנאי שימוש": "📋 Terms of Service",
  "👤 חשבון": "👤 Account",
  "מחובר כ: ": "Signed in as: ",
  "🚪 התנתק": "🚪 Sign out",
  "💾 גיבוי והעברת נתונים": "💾 Backup & data transfer",
  "הקובץ מוצפן בסיסמה שתבחר — בטוח לשמירה בענן או במייל": "The file is encrypted with a password you choose — safe to store in the cloud or email",
  "📤 ייבא גיבוי": "📤 Import backup",
  "תומך בגיבוי מוצפן וגם בגיבוי ישן. הנתונים מסונכרנים בין כל המכשירים": "Supports encrypted and legacy backups. Your data syncs across all devices",
  "📊 נתונים": "📊 Data",
  "סה״כ כרטיסים": "Total cards",
  "סה״כ עסקאות": "Total transactions",
  "גרסה": "Version",
  "שנה סיסמת הצפנה": "Change encryption password",
  "צור קוד שחזור חדש": "Generate a new recovery code",
  "יצירת קוד שחזור חדש ": "Generating a new recovery code ",
  "תבטל את הקוד הישן": "will invalidate the old code",
  ". רק הקוד החדש יעבוד מעכשיו.": ". Only the new code will work from now on.",
  "צור קוד חדש": "Generate new code",
  "קוד חשיפה": "Reveal code",
  "קוד שחזור חדש": "New recovery code",
  "הסר קוד חשיפה": "Remove reveal code",

  // ── Toast messages ──
  "שגיאה בטעינת מפתח האבטחה": "Error loading the security key",
  "שגיאה בטעינת נתונים": "Error loading data",
  "שגיאה בשמירת המפתח": "Error saving the key",
  "שגיאה בעדכון הסיסמה": "Error updating the password",
  "שגיאה בעדכון": "Update error",
  "שגיאה בהוספה": "Error adding",
  "כרטיס עודכן ✓": "Card updated ✓",
  "כרטיס נוסף! 🎉": "Card added! 🎉",
  "נא למלא קוד כרטיס": "Please enter a card code",
  "נא למלא סכום": "Please enter an amount",
  "נא למלא שם חנות": "Please enter a store name",
  "נא למלא חנות וסכום": "Please enter a store and amount",
  "סכום חייב להיות חיובי": "Amount must be positive",
  "הסכום גדול מהיתרה": "Amount exceeds the balance",
  "שגיאה ברישום שימוש": "Error recording usage",
  "שגיאה בעדכון יתרה": "Error updating balance",
  "שימוש נרשם ✓": "Usage recorded ✓",
  "כרטיס נמחק": "Card deleted",
  "עסקה נמחקה": "Transaction deleted",
  "הקוד הועתק ✓": "Code copied ✓",
  "ההעתקה נכשלה": "Copy failed",
  "הפרטים הועתקו ✓": "Details copied ✓",
  "קוד חשיפה הוגדר 🔒": "Reveal code set 🔒",
  "קוד החשיפה הוסר": "Reveal code removed",
  "הסיסמה עודכנה ✓": "Password updated ✓",
  "צריך לפתוח את הארנק קודם": "Unlock the wallet first",
  "שגיאה ביצירת קוד שחזור": "Error generating a recovery code",
  "הפרטים הוסתרו אוטומטית 🔒": "Details hidden automatically 🔒",
  "פרטים גלויים ל-30 שניות 🔓": "Details visible for 30 seconds 🔓",
  "גיבוי הורד ✓": "Backup downloaded ✓",
  "{n} כרטיסים דולגו": "{n} cards skipped",
  "⚠️ {n} כרטיס/ים פגי תוקף בקרוב!": "⚠️ {n} card(s) expiring soon!",
  "יובאו {n} כרטיסים בהצלחה! 🎉": "Imported {n} cards successfully! 🎉",
  "תמונה הוכנסה ({kb}KB) ✓": "Image added ({kb}KB) ✓",

  // ── Add / edit card ──
  "ערוך כרטיס": "Edit card",
  "הוסף זיכוי": "Add credit",
  "הוסף כרטיס": "Add card",
  "ספק": "Provider",
  "קוד הכרטיס ": "Card code ",
  "/ מספר זיכוי (אופציונלי)": "/ credit number (optional)",
  "שם החנות": "Store name",
  "סכום (₪)": "Amount (₪)",
  "תוקף (MM/YY)": "Expiry (MM/YY)",
  "שם בעל הכרטיס": "Cardholder name",
  "צבע מותאם": "Custom color",
  "תמונת כרטיס (אופציונלי)": "Card image (optional)",
  "📷 העלה תמונה": "📷 Upload image",
  "הסר": "Remove",
  "הערות": "Notes",
  "✓ שמור שינויים": "✓ Save changes",
  "+ הוסף": "+ Add",
  "ללא קוד": "No code",
  "⚠️ מספר הכרטיס לא עובר בדיקת תקינות — ודא שלא נפלה טעות בהקלדה (אפשר לשמור בכל זאת)": "⚠️ This card number fails the checksum — double-check for a typo (you can still save)",
  "מספר זיכוי (אופציונלי)": "Credit number (optional)",
  "לדוגמה: GIFT-1234-ABCD": "e.g. GIFT-1234-ABCD",
  "לדוגמה: זארה, H&M, קסטרו...": "e.g. Zara, H&M, Castro...",
  "ישראל ישראלי": "John Doe",
  "מאיפה קיבלת? לאיזה מטרה?": "Where from? What for?",
  "לדוגמה: זארה, ספרים ועוד...": "e.g. Zara, books...",

  // ── Use card ──
  "רישום שימוש": "Record usage",
  "יתרה זמינה": "Available balance",
  "חנות / עסק": "Store / business",
  "תאריך": "Date",
  "קטגוריה": "Category",
  "מה קנית?": "What did you buy?",
  "✓ רשום שימוש": "✓ Record usage",
  "+ רשום שימוש חדש": "+ Record new usage",

  // ── Detail ──
  "✏️ ערוך": "✏️ Edit",
  "🔗 שתף": "🔗 Share",
  "👁 הצג": "👁 Show",
  "👁 הצג תמונה": "👁 Show image",
  "🔍 לחץ להגדלה": "🔍 Tap to enlarge",
  "פרטים מוגנים": "Protected details",
  "🔓 גלוי — נסתר בקרוב": "🔓 Visible — hiding soon",
  "🔓 גלוי": "🔓 Visible",
  "תוקף": "Expiry",
  "קוד כרטיס": "Card code",
  "נוצל": "Used",
  "מתוך ": "of ",
  "נוצל {n}%": "Used {n}%",
  "⚠ {n} ימים!": "⚠ {n} days!",
  "⚠ {n} ימים": "⚠ {n} days",
  "פג תוקף": "Expired",
  "נוצל במלואו": "Fully used",
  "היסטוריית שימוש": "Usage history",
  "היסטוריית שימוש ({n})": "Usage history ({n})",
  "🔍 בדוק יתרה באתר {name} ↗": "🔍 Check balance at {name} ↗",
  "אין שימוש רשום עדיין": "No usage recorded yet",
  "מחק כרטיס?": "Delete card?",
  "פעולה זו לא ניתנת לביטול.": "This action cannot be undone.",
  "מחק": "Delete",
  "שתף כרטיס": "Share card",
  "שתף את פרטי הכרטיס עם מישהו אחר": "Share the card details with someone",
  "📤 שתף": "📤 Share",
  "📋 העתק פרטים": "📋 Copy details",
  "קוד: ": "Code: ",
  "יתרה: ": "Balance: ",
  "תוקף: ": "Expiry: ",
  "אמת זהות": "Verify identity",
  "הצגת קוד": "Show code",

  // ── Dashboard ──
  "🎁 ארנק הטבות": "🎁 Gift Wallet",
  "🔍 חיפוש...": "🔍 Search...",
  "הכל": "All",
  "הכל ({n})": "All ({n})",
  "נוצל {n}% · {m} עסקאות": "Used {n}% · {m} transactions",
  "עד {date}": "Until {date}",
  "הצג שנוצלו / פגו": "Show used / expired",
  "אין כרטיסים עדיין": "No cards yet",
  "לא נמצאו תוצאות": "No results found",
  "לחץ + הוסף כדי להתחיל": "Tap + Add to get started",
  "יתרה": "Balance",
  "פעילים": "Active",
  "פגי תוקף": "Expiring",
  "סה״כ ערך": "Total value",
  "עסקאות": "Transactions",

  // ── Stats ──
  "📊 סטטיסטיקות": "📊 Statistics",
  "סה״כ נוצל": "Total used",
  "יתרה פעילה": "Active balance",
  "כרטיסים פעילים": "Active cards",
  "שימוש לפי חודש": "Usage by month",
  "שימוש לפי קטגוריה": "Usage by category",
  "שימוש לפי ספק": "Usage by provider",
  "עסקאות אחרונות": "Recent transactions",
  "אין עדיין נתונים להצגה": "No data to show yet",
  "סכום": "Amount",

  // ── Providers (display names) ──
  "קופון": "Coupon",
  "זיכוי חנות": "Store credit",
  "אחר": "Other",
  "↩️ זיכוי חנות": "↩️ Store credit",
  "↩️ זיכוי": "↩️ Credit",

  // ── Categories ──
  "קניות": "Shopping",
  "אוכל": "Food",
  "בידור": "Entertainment",
  "טיסות ונסיעות": "Flights & travel",
  "טכנולוגיה": "Tech",
  "ביגוד": "Clothing",
  "יופי וטיפוח": "Beauty",
  "ספרים": "Books",

  // ── Sort options ──
  "תוקף קרוב": "Expiring soon",
  "סכום גבוה": "Highest amount",
  "חדש ביותר": "Newest",
  "שם ספק": "Provider name",

  // ── Plan / Premium ──
  "⭐ תוכנית": "⭐ Plan",
  "✓ אתה מנוי Premium — כל הפיצ'רים פתוחים": "✓ You're a Premium member — all features unlocked",
  "תוכנית חינמית · עד {n} כרטיסים": "Free plan · up to {n} cards",
  "✨ שדרג ל-Premium": "✨ Upgrade to Premium",
  "שדרג ל-Premium ✨": "Upgrade to Premium ✨",
  "בתוכנית החינמית אפשר לשמור עד 2 כרטיסים. שדרג ל-Premium וקבל:": "The free plan lets you keep up to 2 cards. Upgrade to Premium and get:",
  "כרטיסים ללא הגבלה": "Unlimited cards",
  "התראות לפני פקיעת תוקף": "Expiry reminders",
  "העברת כרטיס מוצפן לארנק אחר": "Encrypted card transfer to another wallet",
  "איגוד כרטיסים מאותו ספק": "Group cards by provider",
  "תצוגת כרטיס אשראי עם לוגו": "Credit-card view with logo",
  "חודש": "month",
  "שנה": "year",
  "הבנתי": "Got it",
  "התשלום ייפתח בקרוב": "Payments coming soon",

  // ── Card transfer (Premium) ──
  "📤 העבר כרטיס לארנק אחר": "📤 Transfer card to another wallet",
  "העברת כרטיס מוצפן": "Encrypted card transfer",
  "בחר סיסמת העברה. הכרטיס ייוצא כקובץ מוצפן — הנמען יזדקק לסיסמה כדי לייבא אותו. מסור לו אותה בערוץ נפרד (לא באותה הודעה).": "Choose a transfer password. The card is exported as an encrypted file — the recipient needs the password to import it. Share it via a separate channel (not the same message).",
  "📤 צור קובץ העברה": "📤 Create transfer file",
  "קובץ העברה מוצפן נוצר ✓": "Encrypted transfer file created ✓",
  "הכרטיס הועבר": "Card transferred",
  "נוצר קובץ מוצפן. שלח אותו לנמען (WhatsApp / מייל) ומסור לו את סיסמת ההעברה בערוץ נפרד. למחוק את הכרטיס מהארנק שלך?": "An encrypted file was created. Send it to the recipient (WhatsApp / email) and share the transfer password separately. Delete the card from your wallet?",
  "מחק מהארנק": "Delete from wallet",
  "השאר אצלי": "Keep it",

  // ── Provider bundles (Premium) ──
  "{n} כרטיסים": "{n} cards",
  "לחץ לפתיחת הכרטיסים": "Tap to open the cards",
  "לחץ לסגירה": "Tap to collapse",

  // ── Auto-lock ──
  "⏱️ נעילה אוטומטית": "⏱️ Auto-lock",
  "האפליקציה תבקש סיסמה מחדש רק אם היא הייתה ברקע יותר מהזמן הזה.": "The app will ask for the password again only if it was in the background longer than this.",
  "דק'": "min",
  "הפרטים יוצגו ל-60 שניות": "Details will show for 60 seconds",
  "פרטים גלויים ל-60 שניות 🔓": "Details visible for 60 seconds 🔓",

  // ── Analytics opt-out ──
  "📈 שיפור המוצר": "📈 Product improvement",
  "שיתוף נתוני שימוש אנונימיים לשיפור האפליקציה": "Share anonymous usage data to improve the app",
  "נאסף רק שימוש כללי (מסכים ופעולות) — לעולם לא הקודים, הסכומים או תוכן הכרטיסים.": "Only general usage (screens & actions) is collected — never your codes, amounts, or card contents.",
};
