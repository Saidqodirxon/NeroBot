import React, { useState, useEffect } from "react";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import ClassicEditor from "@ckeditor/ckeditor5-build-classic";
import { api, phoneUpdate, broadcast } from "../services/api";
import { REGIONS } from "../utils/regions";

const TABS = [
  { key: "message", label: "📢 Umumiy Xabar" },
  { key: "phone",   label: "📱 Telefon Yangilash" },
];

// CKEditor HTML → Telegram HTML
function toTelegramHTML(html) {
  if (!html) return "";
  const div = document.createElement("div");
  div.innerHTML = html;
  function walk(node) {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent;
    const tag = node.tagName?.toLowerCase();
    const inner = Array.from(node.childNodes).map(walk).join("");
    switch (tag) {
      case "strong": case "b": return `<b>${inner}</b>`;
      case "em":     case "i": return `<i>${inner}</i>`;
      case "u":                return `<u>${inner}</u>`;
      case "s": case "strike": return `<s>${inner}</s>`;
      case "a":                return `<a href="${node.getAttribute("href")}">${inner}</a>`;
      case "code":             return `<code>${inner}</code>`;
      case "pre":              return `<pre>${inner}</pre>`;
      case "blockquote":       return `<blockquote>${inner}</blockquote>`;
      case "li":               return `• ${inner}\n`;
      case "ul": case "ol":    return inner;
      case "h1": case "h2": case "h3":
      case "h4": case "h5": case "h6": return `<b>${inner}</b>\n`;
      case "p":                return inner ? `${inner}\n` : "";
      case "br":               return "\n";
      case "figure": case "figcaption": case "div": return inner;
      default:                 return inner;
    }
  }
  return Array.from(div.childNodes).map(walk).join("").replace(/\n{3,}/g, "\n\n").trim();
}

const CK_TOOLBAR = [
  "bold", "italic", "underline", "strikethrough",
  "|", "bulletedList", "numberedList",
  "|", "blockQuote", "code",
  "|", "undo", "redo",
];

function EditorField({ value, onChange, placeholder = "Xabar matnini kiriting..." }) {
  return (
    <div style={{ border: "1.5px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
      <CKEditor
        editor={ClassicEditor}
        data={value}
        config={{ toolbar: CK_TOOLBAR, placeholder }}
        onChange={(_, editor) => onChange(editor.getData())}
      />
    </div>
  );
}

function StatCard({ icon, label, value, color }) {
  const colors = {
    danger:  { bg: "var(--danger-light)",  text: "#991b1b" },
    warning: { bg: "var(--warning-light)", text: "#92400e" },
    success: { bg: "var(--success-light)", text: "#065f46" },
    info:    { bg: "var(--info-light)",    text: "#1e40af" },
  };
  const c = colors[color] || colors.info;
  return (
    <div className="stat-card" style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <div className="stat-icon" style={{ background: c.bg, color: c.text, fontSize: 20 }}>{icon}</div>
      <div>
        <div className="stat-value">{value ?? "—"}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
}

// Reusable full-width button
function FullBtn({ onClick, disabled, variant = "primary", children }) {
  const bg = variant === "secondary"
    ? { background: "#f1f5f9", color: "var(--text)", border: "1.5px solid var(--border)" }
    : { background: "var(--primary)", color: "#fff", border: "none" };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: "100%",
        height: 42,
        borderRadius: 9,
        cursor: disabled ? "not-allowed" : "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 7,
        fontWeight: 600,
        fontSize: 13.5,
        fontFamily: "inherit",
        opacity: disabled ? 0.5 : 1,
        transition: "opacity 0.15s",
        ...bg,
      }}
    >
      {children}
    </button>
  );
}

const DEFAULT_PHONE_MSG =
  "<p>📱 <strong>Telefon raqamingizni yangilang</strong></p>" +
  "<p>Botdagi telefon raqamingiz noto'g'ri yoki eskirgan formatda.</p>" +
  "<p>Quyidagi tugmani bosing va yangi raqamingizni yuboring 👇</p>";

export default function Broadcast() {
  const [tab, setTab] = useState("message");

  // ── Umumiy xabar ──
  const [msgData, setMsgData]       = useState("");
  const [region, setRegion]         = useState("all");
  const [isSending, setIsSending]   = useState(false);
  const [singleBroadcastId, setSingleBroadcastId] = useState("");
  const [sendingOneBroadcast, setSendingOneBroadcast] = useState(false);
  const [oneBroadcastResult, setOneBroadcastResult] = useState(null);

  // ── Telefon yangilash ──
  const [stats, setStats]             = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [sendingTarget, setSendingTarget] = useState(null);
  const [sendResult, setSendResult]   = useState(null);
  const [phoneMsg, setPhoneMsg]       = useState(DEFAULT_PHONE_MSG);

  // ── Bitta usergа ──
  const [singleId, setSingleId]       = useState("");
  const [sendingOne, setSendingOne]   = useState(false);
  const [oneResult, setOneResult]     = useState(null);

  const loadStats = async () => {
    setStatsLoading(true);
    try { const r = await phoneUpdate.getStats(); setStats(r.data.data); }
    catch { setStats(null); }
    finally { setStatsLoading(false); }
  };

  useEffect(() => { if (tab === "phone") loadStats(); }, [tab]);

  // ── Bitta usergа (umumiy xabar) ──
  const sendOneBroadcast = async () => {
    if (!singleBroadcastId.trim()) { alert("Telegram ID kiriting"); return; }
    const text = toTelegramHTML(msgData);
    if (!text.trim()) { alert("Xabar matni bo'sh!"); return; }
    if (!confirm(`${singleBroadcastId} IDli foydalanuvchiga xabar yuborilsinmi?`)) return;
    setSendingOneBroadcast(true); setOneBroadcastResult(null);
    try {
      const res = await broadcast.sendOne(singleBroadcastId.trim(), text);
      setOneBroadcastResult({ success: true, message: res.data.message });
    } catch (err) {
      setOneBroadcastResult({ success: false, message: err.response?.data?.message || err.message });
    } finally { setSendingOneBroadcast(false); }
  };

  // ── Umumiy xabar yuborish ──
  const sendBroadcast = async () => {
    const text = toTelegramHTML(msgData);
    if (!text.trim()) { alert("Xabar matni bo'sh!"); return; }
    if (!confirm(`Xabarni ${region === "all" ? "barcha" : region} foydalanuvchilarga yuborasizmi?`)) return;
    setIsSending(true);
    try {
      const res = await api.post("/broadcast", { message: text, region });
      if (res.data.success) {
        alert("✅ Xabar yuborish boshlandi!\nJarayon background'da davom etmoqda.\nTugagach Telegram'da xabar olasiz.");
        setMsgData("");
      }
    } catch (err) { alert("Xatolik: " + (err.response?.data?.message || err.message)); }
    finally { setIsSending(false); }
  };

  // ── Telefon yangilash (ko'p userga) ──
  const sendPhoneUpdate = async (target) => {
    const count = target === "unsent" ? stats?.notSentYet : stats?.sentButNotUpdated;
    if (!count) return alert("Yuborish uchun foydalanuvchi yo'q.");
    const text = toTelegramHTML(phoneMsg);
    if (!text.trim()) return alert("Xabar matni bo'sh!");
    if (!confirm(`${count} ta foydalanuvchiga telefon yangilash xabari yuborilsinmi?`)) return;
    setSendingTarget(target); setSendResult(null);
    try {
      const res = await phoneUpdate.send(target, text);
      setSendResult({ success: true, ...res.data });
      await loadStats();
    } catch (err) {
      setSendResult({ success: false, message: err.response?.data?.message || err.message });
    } finally { setSendingTarget(null); }
  };

  // ── Bitta usergа ──
  const sendToOne = async () => {
    if (!singleId.trim()) return alert("Telegram ID kiriting");
    const text = toTelegramHTML(phoneMsg);
    if (!text.trim()) return alert("Xabar matni bo'sh!");
    if (!confirm(`${singleId} IDli foydalanuvchiga xabar yuborilsinmi?`)) return;
    setSendingOne(true); setOneResult(null);
    try {
      const res = await phoneUpdate.sendOne(singleId.trim(), text);
      setOneResult({ success: true, message: res.data.message || "Xabar yuborildi" });
    } catch (err) {
      setOneResult({ success: false, message: err.response?.data?.message || err.message });
    } finally { setSendingOne(false); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Xabar Yuborish</h2>
          <p className="page-subtitle">Foydalanuvchilarga xabar va bildirishnomalar yuborish</p>
        </div>
      </div>

      <div className="tabs" style={{ marginBottom: 20 }}>
        {TABS.map((t) => (
          <button key={t.key} className={`tab-btn${tab === t.key ? " active" : ""}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ══ TAB 1: Umumiy Xabar ══ */}
      {tab === "message" && (
        <div style={{ maxWidth: 720 }}>
          <div className="card">
            <div className="card-body">
              <div className="form-group">
                <label className="form-label">Viloyat</label>
                <select className="form-control" value={region} onChange={(e) => setRegion(e.target.value)} disabled={isSending}>
                  <option value="all">Barcha viloyatlar</option>
                  {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Xabar matni</label>
                <EditorField
                  value={msgData}
                  onChange={setMsgData}
                  placeholder="Xabar matnini kiriting... Bold, italic, underline tugmalari orqali formatlang."
                />
                <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "6px 0 0" }}>
                  Telegram'da ko'rinish: <b>qalin</b>, <i>kursiv</i>, <u>tagiga chizilgan</u>, <s>o'chirilgan</s>
                </p>
              </div>

              <FullBtn onClick={sendBroadcast} disabled={isSending}>
                {isSending ? "⏳ Yuborilmoqda..." : "📤 Barchaga Yuborish"}
              </FullBtn>
            </div>
          </div>

          {/* Bitta usergа */}
          <div className="card" style={{ marginBottom: 14 }}>
            <div className="card-body">
              <h4 style={{ margin: "0 0 6px", fontSize: 14, fontWeight: 700 }}>👤 Bitta Foydalanuvchiga</h4>
              <p style={{ color: "var(--text-muted)", fontSize: 13, margin: "0 0 12px" }}>
                Yuqoridagi xabarni muayyan foydalanuvchiga Telegram ID orqali yuborish
              </p>
              <div style={{ display: "flex", gap: 10 }}>
                <input
                  className="form-control"
                  placeholder="Telegram ID (masalan: 1551855614)"
                  value={singleBroadcastId}
                  onChange={(e) => { setSingleBroadcastId(e.target.value); setOneBroadcastResult(null); }}
                  style={{ flex: 1 }}
                />
                <button
                  onClick={sendOneBroadcast}
                  disabled={sendingOneBroadcast || !singleBroadcastId.trim()}
                  style={{
                    height: 38, padding: "0 20px",
                    background: "var(--primary)", color: "#fff", border: "none",
                    borderRadius: 8, fontWeight: 600, fontSize: 13.5,
                    cursor: sendingOneBroadcast || !singleBroadcastId.trim() ? "not-allowed" : "pointer",
                    opacity: sendingOneBroadcast || !singleBroadcastId.trim() ? 0.5 : 1,
                    whiteSpace: "nowrap", fontFamily: "inherit",
                  }}
                >
                  {sendingOneBroadcast ? "⏳..." : "📤 Yuborish"}
                </button>
              </div>
              {oneBroadcastResult && (
                <div className={`alert ${oneBroadcastResult.success ? "alert-success" : "alert-danger"}`} style={{ marginTop: 10, marginBottom: 0 }}>
                  {oneBroadcastResult.success ? `✅ ${oneBroadcastResult.message}` : `❌ ${oneBroadcastResult.message}`}
                </div>
              )}
            </div>
          </div>

          <div className="alert alert-warning" style={{ marginTop: 14 }}>
            <div><strong>Eslatma:</strong>
              <ul style={{ margin: "5px 0 0", paddingLeft: 18 }}>
                <li>Xabar barcha foydalanuvchilarga ketadi — diqqat bilan yozing</li>
                <li>Telegram cheklovi: 30 xabar/soniya</li>
                <li>Bloklagan foydalanuvchilarga xabar ketmaydi</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ══ TAB 2: Telefon Yangilash ══ */}
      {tab === "phone" && (
        <div style={{ maxWidth: 720 }}>
          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12, marginBottom: 18 }}>
            <StatCard icon="📵" label="Noto'g'ri raqam (jami)"   value={statsLoading ? "..." : stats?.totalInvalid}     color="danger" />
            <StatCard icon="⏳" label="Hali so'rov yuborilmagan" value={statsLoading ? "..." : stats?.notSentYet}        color="warning" />
            <StatCard icon="🔄" label="Boshlagan, tugatmagan"    value={statsLoading ? "..." : stats?.sentButNotUpdated} color="info" />
            <StatCard icon="✅" label="Yangilangan"              value={statsLoading ? "..." : stats?.alreadyUpdated}    color="success" />
          </div>

          {/* Xabar matni (CKEditor) */}
          <div className="card" style={{ marginBottom: 14 }}>
            <div className="card-body">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  Xabar matni
                  <span style={{ color: "var(--text-muted)", fontWeight: 400, fontSize: 12, marginLeft: 8 }}>
                    — barcha quyidagi yuborishlarda ishlatiladi
                  </span>
                </label>
                <EditorField
                  value={phoneMsg}
                  onChange={setPhoneMsg}
                  placeholder="Foydalanuvchiga yuboriladigan xabarni kiriting..."
                />
                <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "6px 0 0" }}>
                  Telegram inline tugma avtomatik qo'shiladi: [📱 Raqamni yangilash]
                </p>
              </div>
            </div>
          </div>

          {sendResult && (
            <div className={`alert ${sendResult.success ? "alert-success" : "alert-danger"}`} style={{ marginBottom: 14 }}>
              {sendResult.success
                ? `✅ ${sendResult.sent} ta foydalanuvchiga xabar yuborildi (${sendResult.skipped} ta o'tkazib yuborildi)`
                : `❌ ${sendResult.message}`}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            {/* Birinchi so'rov */}
            <div className="card">
              <div className="card-body">
                <h4 style={{ margin: "0 0 6px", fontSize: 14, fontWeight: 700 }}>📤 Birinchi So'rov</h4>
                <p style={{ color: "var(--text-muted)", fontSize: 13, margin: "0 0 14px", lineHeight: 1.5 }}>
                  Hali xabar olmagan <strong>{stats?.notSentYet ?? "?"}</strong> ta foydalanuvchiga yuboriladi. Har biri faqat <strong>1 marta</strong> oladi.
                </p>
                <FullBtn
                  onClick={() => sendPhoneUpdate("unsent")}
                  disabled={sendingTarget !== null || !stats?.notSentYet}
                >
                  {sendingTarget === "unsent" ? "⏳ Yuborilmoqda..." : `📤 Yuborish (${stats?.notSentYet ?? 0} ta)`}
                </FullBtn>
              </div>
            </div>

            {/* Qayta eslatma */}
            <div className="card">
              <div className="card-body">
                <h4 style={{ margin: "0 0 6px", fontSize: 14, fontWeight: 700 }}>🔄 Qayta Eslatma</h4>
                <p style={{ color: "var(--text-muted)", fontSize: 13, margin: "0 0 14px", lineHeight: 1.5 }}>
                  Tugmani bosdi, lekin yangilamagan <strong>{stats?.sentButNotUpdated ?? "?"}</strong> ta user. <strong>24 soat</strong> limit bor.
                </p>
                <FullBtn
                  onClick={() => sendPhoneUpdate("incomplete")}
                  disabled={sendingTarget !== null || !stats?.sentButNotUpdated}
                  variant="secondary"
                >
                  {sendingTarget === "incomplete" ? "⏳ Yuborilmoqda..." : `🔄 Eslatma (${stats?.sentButNotUpdated ?? 0} ta)`}
                </FullBtn>
              </div>
            </div>
          </div>

          {/* Bitta usergа */}
          <div className="card">
            <div className="card-body">
              <h4 style={{ margin: "0 0 6px", fontSize: 14, fontWeight: 700 }}>👤 Bitta Foydalanuvchiga</h4>
              <p style={{ color: "var(--text-muted)", fontSize: 13, margin: "0 0 12px" }}>
                Muayyan foydalanuvchiga Telegram ID orqali xabar yuborish
              </p>
              <div style={{ display: "flex", gap: 10 }}>
                <input
                  className="form-control"
                  placeholder="Telegram ID (masalan: 123456789)"
                  value={singleId}
                  onChange={(e) => { setSingleId(e.target.value); setOneResult(null); }}
                  style={{ flex: 1 }}
                />
                <button
                  onClick={sendToOne}
                  disabled={sendingOne || !singleId.trim()}
                  style={{
                    height: 38,
                    padding: "0 20px",
                    background: "var(--primary)",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    fontWeight: 600,
                    fontSize: 13.5,
                    cursor: sendingOne || !singleId.trim() ? "not-allowed" : "pointer",
                    opacity: sendingOne || !singleId.trim() ? 0.5 : 1,
                    whiteSpace: "nowrap",
                    fontFamily: "inherit",
                  }}
                >
                  {sendingOne ? "⏳..." : "📤 Yuborish"}
                </button>
              </div>
              {oneResult && (
                <div className={`alert ${oneResult.success ? "alert-success" : "alert-danger"}`} style={{ marginTop: 10, marginBottom: 0 }}>
                  {oneResult.success ? `✅ ${oneResult.message}` : `❌ ${oneResult.message}`}
                </div>
              )}
            </div>
          </div>

          <div className="alert alert-warning" style={{ marginTop: 14 }}>
            Xabar HTML formatda yuboriladi. Telegram cheklovi: 30 xabar/soniya.
          </div>
        </div>
      )}
    </div>
  );
}
