import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { PROVIDERS, CATEGORIES, CATEGORY_ICONS, fmt, fmtDate, isExpired, S } from "./shared";

// Lazy-loaded so recharts (the app's heaviest dependency) is only fetched when the
// user actually opens the statistics screen.
export default function StatsView({ cards, onBack }) {
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
