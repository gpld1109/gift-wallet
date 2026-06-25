export default function TermsOfService({ onBack }) {
  return (
    <div style={{ minHeight: "100vh", background: "#0a0f1e", color: "#e8eaf6", fontFamily: "'Segoe UI', Arial, sans-serif", direction: "rtl" }}>
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "24px 20px 80px" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: "#6c63ff", fontSize: 14, cursor: "pointer", marginBottom: 20, fontWeight: 600, fontFamily: "inherit" }}>
          → חזרה
        </button>
        <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 4 }}>תנאי שימוש</h1>
        <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 32 }}>עודכן לאחרונה: 19 ביוני 2026</p>

        <Section title="1. הסכמה לתנאים">
          השימוש באפליקציית "ארנק הטבות" ("השירות") מהווה הסכמה מלאה לתנאי שימוש אלה. אם אינך מסכים לתנאים, אנא הימנע משימוש בשירות.
        </Section>

        <Section title="2. תיאור השירות">
          השירות מאפשר למשתמשים לנהל, לעקוב ולתעד גיפט קארדים, קופונים וזיכויי חנות באופן אישי. השירות אינו כרוך בעיבוד תשלומים, רכישות, או קשר ישיר עם הספקים המוזכרים בו.
        </Section>

        <Section title="3. אחריות המשתמש">
          <ul style={{ paddingRight: 20, lineHeight: 1.9 }}>
            <li>אתה אחראי לדיוק הנתונים שאתה מזין באפליקציה</li>
            <li>אתה אחראי לשמירה על סודיות פרטי הכניסה לחשבונך</li>
            <li>השירות הוא כלי לתיעוד אישי בלבד ואינו מהווה אישור רשמי ליתרת כרטיס כלשהו מול הספק בפועל</li>
            <li>מומלץ לאמת יתרות מול אתר הספק הרשמי לפני שימוש בכרטיס</li>
          </ul>
        </Section>

        <Section title="4. הגבלת אחריות">
          השירות מסופק "כפי שהוא" (AS IS) ללא כל אחריות מפורשת או משתמעת. <strong>איננו אחראים</strong> לכל נזק, אובדן, או הוצאה הנובעים מ:
          <ul style={{ paddingRight: 20, lineHeight: 1.9, marginTop: 8 }}>
            <li>אי-דיוק בנתונים שהוזנו על ידי המשתמש</li>
            <li>אובדן גישה לחשבון</li>
            <li>תקלות זמינות של השירות או ספקי התשתית שלו</li>
            <li>פג תוקף של כרטיס שהמשתמש לא היה מודע לו</li>
          </ul>
        </Section>

        <Section title="5. קישורים לאתרי צד שלישי">
          השירות עשוי להציג קישורים לאתרי ספקים חיצוניים (כגון BuyMe, Dream Card VIP ועוד) לצורך נוחות בלבד. איננו אחראים לתוכן, מדיניות, או פעילות של אתרים אלה.
        </Section>

        <Section title="6. קניין רוחני">
          כל הזכויות בשירות, לרבות עיצוב, קוד, ולוגו, שמורות לבעלי האפליקציה. אין להעתיק, לשכפל או להפיץ את השירות ללא אישור מראש.
        </Section>

        <Section title="7. שינויים בשירות">
          אנו שומרים לעצמנו את הזכות לשנות, להשהות או להפסיק את השירות (כולו או חלקו) בכל עת וללא הודעה מוקדמת.
        </Section>

        <Section title="8. סיום שימוש">
          אנו רשאים להשעות או לסיים את גישתך לשירות אם תפר תנאים אלה. אתה רשאי להפסיק את השימוש בשירות ולמחוק את חשבונך בכל עת.
        </Section>

        <Section title="9. דין חל">
          תנאים אלה כפופים לדין הישראלי. כל מחלוקת תידון בבתי המשפט המוסמכים בישראל בלבד.
        </Section>

        <Section title="10. יצירת קשר">
          לשאלות בנוגע לתנאי שימוש אלה, ניתן לפנות אלינו בכתובת: <a href="mailto:mygiftwallet2026@gmail.com" style={{ color: "#6c63ff" }}>mygiftwallet2026@gmail.com</a>
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
