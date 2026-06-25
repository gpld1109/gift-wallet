export default function PrivacyPolicy({ onBack }) {
  return (
    <div style={{ minHeight: "100vh", background: "#0a0f1e", color: "#e8eaf6", fontFamily: "'Segoe UI', Arial, sans-serif", direction: "rtl" }}>
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "24px 20px 80px" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: "#6c63ff", fontSize: 14, cursor: "pointer", marginBottom: 20, fontWeight: 600, fontFamily: "inherit" }}>
          → חזרה
        </button>
        <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 4 }}>מדיניות פרטיות</h1>
        <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 32 }}>עודכן לאחרונה: 19 ביוני 2026</p>

        <Section title="1. כללי">
          מדיניות פרטיות זו מתארת כיצד "ארנק הטבות" ("האפליקציה", "אנחנו") אוספת, משתמשת, מאחסנת ומגנה על המידע האישי שלך. השימוש באפליקציה מהווה הסכמה למדיניות זו.
        </Section>

        <Section title="2. איזה מידע אנו אוספים">
          <ul style={{ paddingRight: 20, lineHeight: 1.9 }}>
            <li><strong>פרטי חשבון:</strong> כתובת אימייל לצורך זיהוי והתחברות</li>
            <li><strong>נתוני גיפט קארדים וקופונים:</strong> קוד, סכום, ספק, תאריך תוקף, הערות שהזנת</li>
            <li><strong>היסטוריית שימוש:</strong> פרטי עסקאות שרשמת (חנות, סכום, תאריך, קטגוריה)</li>
            <li><strong>תמונות:</strong> תמונות כרטיסים שבחרת להעלות (מאוחסנות מוצפנות)</li>
          </ul>
        </Section>

        <Section title="3. כיצד אנו משתמשים במידע">
          המידע משמש אך ורק לצורך הפעלת השירות: שמירת הכרטיסים שלך, מעקב אחר יתרות, וסנכרון בין המכשירים שלך. <strong>אנו לא מוכרים, משכירים או חולקים את המידע שלך עם צדדים שלישיים למטרות שיווקיות.</strong>
        </Section>

        <Section title="4. אבטחת מידע">
          <ul style={{ paddingRight: 20, lineHeight: 1.9 }}>
            <li>קודי הגיפט קארדים מוצפנים (AES-256) לפני האחסון — גם לנו אין גישה ישירה אליהם בטקסט גלוי</li>
            <li>כל התקשורת מוצפנת באמצעות HTTPS/TLS</li>
            <li>גישה למידע מוגבלת ברמת מסד הנתונים כך שכל משתמש רואה רק את הנתונים שלו (Row Level Security)</li>
            <li>הכניסה מתבצעת ללא סיסמה, באמצעות קוד חד-פעמי הנשלח למייל</li>
          </ul>
          חרף האמצעים הללו, אין מערכת מאובטחת ב-100%. השימוש באפליקציה הוא על אחריותך.
        </Section>

        <Section title="5. שירותי צד שלישי">
          האפליקציה משתמשת בספקי תשתית הבאים לצורך אחסון נתונים ושליחת מיילים:
          <ul style={{ paddingRight: 20, lineHeight: 1.9, marginTop: 8 }}>
            <li><strong>Supabase</strong> — אחסון מסד נתונים והרשאות</li>
            <li><strong>Vercel</strong> — אחסון והפעלת האפליקציה</li>
          </ul>
          לכל אחד ממדיניות הפרטיות שלו, החלה על האופן בו הם מטפלים בנתונים בשרתיהם.
        </Section>

        <Section title="6. זכויותיך">
          <ul style={{ paddingRight: 20, lineHeight: 1.9 }}>
            <li>הזכות לעיין במידע שלך — דרך מסך "גיבוי" באפליקציה</li>
            <li>הזכות לתקן או למחוק כרטיסים בכל עת</li>
            <li>הזכות למחוק את חשבונך וכל המידע הקשור אליו — פנה אלינו בכתובת המופיעה למטה</li>
            <li>הזכות לייצא את הנתונים שלך בפורמט JSON בכל עת</li>
          </ul>
        </Section>

        <Section title="7. שמירת מידע">
          המידע שלך נשמר כל עוד חשבונך פעיל. במידה ותבקש מחיקת חשבון, נמחק את כל הנתונים הקשורים אליך תוך 30 יום.
        </Section>

        <Section title="8. קטינים">
          השירות אינו מיועד לשימוש על ידי ילדים מתחת לגיל 16 ללא פיקוח הורי.
        </Section>

        <Section title="9. שינויים במדיניות">
          אנו עשויים לעדכן מדיניות זו מעת לעת. שינויים מהותיים יובאו לידיעתך באמצעות הודעה באפליקציה או במייל.
        </Section>

        <Section title="10. יצירת קשר">
          לכל שאלה בנוגע למדיניות פרטיות זו או למימוש זכויותיך, ניתן לפנות אלינו בכתובת: <a href="mailto:mygiftwallet2026@gmail.com" style={{ color: "#6c63ff" }}>mygiftwallet2026@gmail.com</a>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 26 }}>
      <h2 style={{ fontSize: 17, fontWeight: 700, color: "#a8b2d8", marginBottom: 10 }}>{title}</h2>
      <div style={{ fontSize: 14, color: "#c5cce0", lineHeight: 1.8 }}>{children}</div>
    </div>
  );
}
