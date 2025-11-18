import React, { useState } from "react";
import { api } from "../services/api";
import { REGIONS } from "../utils/regions";

export default function Broadcast() {
  const [message, setMessage] = useState("");
  const [region, setRegion] = useState("all");
  const [isSending, setIsSending] = useState(false);

  const sendBroadcast = async () => {
    if (!message.trim()) {
      alert("Xabar matni bo'sh!");
      return;
    }

    if (
      !confirm(
        `Xabarni ${
          region === "all" ? "barcha" : region
        } foydalanuvchilarga yuborasizmi?`
      )
    ) {
      return;
    }

    setIsSending(true);

    try {
      const res = await api.post("/broadcast", {
        message,
        region,
      });

      if (res.data.success) {
        alert(
          `✅ Xabar yuborish boshlandi!\n\n` +
            `Jarayon background'da davom etmoqda.\n` +
            `Tugagach Telegram'da xabar olasiz.\n\n` +
            `Sahifadan chiqishingiz mumkin - xabarlar yuborilishda davom etadi.`
        );
        setMessage("");
      }
    } catch (err) {
      alert("Xatolik: " + (err.response?.data?.message || err.message));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div>
      <h3>📢 Yangilik Yuborish</h3>

      <div style={{ maxWidth: 800 }}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>
            Viloyat:
          </label>
          <select
            className="input"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            disabled={isSending}
            style={{ width: "100%" }}
          >
            <option value="all">Barcha viloyatlar</option>
            {REGIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>
            Xabar matni:
          </label>
          <textarea
            className="input"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={isSending}
            rows={8}
            placeholder="Xabar matnini kiriting...&#10;&#10;Markdown qo'llab-quvvatlanadi:&#10;*qalin matn*&#10;_kursiv matn_&#10;`kod`&#10;[link](https://example.com)"
            style={{
              width: "100%",
              fontFamily: "inherit",
              fontSize: 14,
            }}
          />
          <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
            {message.length} ta belgi
          </div>
        </div>

        <button
          className="button"
          onClick={sendBroadcast}
          disabled={isSending || !message.trim()}
          style={{
            width: "100%",
            padding: 12,
            fontSize: 16,
            opacity: isSending || !message.trim() ? 0.5 : 1,
            cursor: isSending || !message.trim() ? "not-allowed" : "pointer",
          }}
        >
          {isSending ? "⏳ Yuborilmoqda..." : "📤 Xabarni yuborish"}
        </button>
      </div>

      <div
        style={{
          marginTop: 24,
          padding: 16,
          background: "#fff3cd",
          borderRadius: 8,
          border: "1px solid #ffc107",
        }}
      >
        <h4 style={{ marginTop: 0 }}>⚠️ Eslatma:</h4>
        <ul style={{ marginBottom: 0, paddingLeft: 20 }}>
          <li>Xabar avtomatik ravishda admin guruhiga ham yuboriladi</li>
          <li>Telegram rate limit: 30 xabar/soniya</li>
          <li>Xabar yuborish vaqt olishi mumkin</li>
          <li>Bloklagan foydalanuvchilarga xabar ketmaydi</li>
        </ul>
      </div>
    </div>
  );
}
