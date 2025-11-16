import React, { useEffect, useState } from "react";
import { stats, api } from "../services/api";
import { REGIONS } from "../utils/regions";

export default function Stats() {
  const [data, setData] = useState(null);
  const [showRandomModal, setShowRandomModal] = useState(false);
  const [randomRegion, setRandomRegion] = useState("all");
  const [randomCount, setRandomCount] = useState(1);
  const [winners, setWinners] = useState(null);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastRegion, setBroadcastRegion] = useState("all");

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const res = await stats.get();
      setData(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const selectRandomWinner = async () => {
    try {
      const res = await api.post("/random-winner", {
        region: randomRegion,
        count: parseInt(randomCount),
      });
      setWinners(res.data.data);
    } catch (err) {
      alert("Xatolik: " + (err.response?.data?.message || err.message));
    }
  };

  const sendBroadcast = async () => {
    if (!broadcastMessage.trim()) {
      alert("Xabar matni bo'sh!");
      return;
    }

    if (
      !confirm(
        `Xabarni ${
          broadcastRegion === "all" ? "barcha" : broadcastRegion
        } foydalanuvchilarga yuborasizmi?`
      )
    ) {
      return;
    }

    try {
      await api.post("/broadcast", {
        message: broadcastMessage,
        region: broadcastRegion,
      });
      alert("Xabar yuborish boshlandi!");
      setShowBroadcastModal(false);
      setBroadcastMessage("");
    } catch (err) {
      alert("Xatolik: " + (err.response?.data?.message || err.message));
    }
  };

  if (!data) return <div>Yuklanmoqda...</div>;

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <h3 style={{ margin: 0 }}>Statistika</h3>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="button" onClick={() => setShowRandomModal(true)}>
            🎲 Random tanlash
          </button>
          <button
            className="button"
            onClick={() => setShowBroadcastModal(true)}
          >
            📢 Yangilik yuborish
          </button>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: 12,
          marginBottom: 24,
        }}
      >
        <div style={{ padding: 16, background: "#e3f2fd", borderRadius: 8 }}>
          <div style={{ fontSize: 24, fontWeight: "bold" }}>
            {data.totalCodes}
          </div>
          <div>Jami kodlar</div>
        </div>
        <div style={{ padding: 16, background: "#e8f5e9", borderRadius: 8 }}>
          <div style={{ fontSize: 24, fontWeight: "bold" }}>
            {data.usedCodes}
          </div>
          <div>Ishlatilgan</div>
        </div>
        <div style={{ padding: 16, background: "#fff3e0", borderRadius: 8 }}>
          <div style={{ fontSize: 24, fontWeight: "bold" }}>
            {data.unusedCodes}
          </div>
          <div>Ishlatilmagan</div>
        </div>
        <div style={{ padding: 16, background: "#f3e5f5", borderRadius: 8 }}>
          <div style={{ fontSize: 24, fontWeight: "bold" }}>
            {data.totalUsers}
          </div>
          <div>Foydalanuvchilar</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        {/* Top Users */}
        <div style={{ background: "#f5f5f5", padding: 16, borderRadius: 8 }}>
          <h4 style={{ marginTop: 0 }}>🏆 Eng ko'p kod ishlatganlar</h4>
          {data.topUsers && data.topUsers.length > 0 ? (
            <table style={{ width: "100%", fontSize: 14 }}>
              <thead>
                <tr
                  style={{ textAlign: "left", borderBottom: "2px solid #ddd" }}
                >
                  <th style={{ padding: "8px 4px" }}>Ism</th>
                  <th style={{ padding: "8px 4px" }}>Viloyat</th>
                  <th style={{ padding: "8px 4px" }}>Kodlar</th>
                </tr>
              </thead>
              <tbody>
                {data.topUsers.map((user, idx) => (
                  <tr
                    key={user.telegramId}
                    style={{ borderBottom: "1px solid #eee" }}
                  >
                    <td style={{ padding: "8px 4px" }}>
                      {idx + 1}. {user.name}
                    </td>
                    <td style={{ padding: "8px 4px" }}>{user.region}</td>
                    <td style={{ padding: "8px 4px", fontWeight: "bold" }}>
                      {user.codeCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div>Ma'lumot yo'q</div>
          )}
        </div>

        {/* Users by Region */}
        <div style={{ background: "#f5f5f5", padding: 16, borderRadius: 8 }}>
          <h4 style={{ marginTop: 0 }}>📍 Viloyatlar bo'yicha</h4>
          {data.usersByRegion && data.usersByRegion.length > 0 ? (
            <table style={{ width: "100%", fontSize: 14 }}>
              <thead>
                <tr
                  style={{ textAlign: "left", borderBottom: "2px solid #ddd" }}
                >
                  <th style={{ padding: "8px 4px" }}>Viloyat</th>
                  <th style={{ padding: "8px 4px" }}>Foydalanuvchilar</th>
                </tr>
              </thead>
              <tbody>
                {data.usersByRegion.map((item) => (
                  <tr key={item._id} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: "8px 4px" }}>
                      {item._id || "Noma'lum"}
                    </td>
                    <td style={{ padding: "8px 4px", fontWeight: "bold" }}>
                      {item.count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div>Ma'lumot yo'q</div>
          )}
        </div>
      </div>

      {/* Random Winner Modal */}
      {showRandomModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "white",
              padding: 24,
              borderRadius: 8,
              minWidth: 400,
              maxWidth: 600,
              maxHeight: "80vh",
              overflow: "auto",
            }}
          >
            <h3 style={{ marginTop: 0 }}>🎲 Random Foydalanuvchi Tanlash</h3>

            <div style={{ marginBottom: 12 }}>
              <label>Viloyat:</label>
              <select
                className="input"
                value={randomRegion}
                onChange={(e) => setRandomRegion(e.target.value)}
                style={{ width: "100%", marginTop: 4 }}
              >
                <option value="all">Barcha viloyatlar</option>
                {REGIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label>Nechta tanlash:</label>
              <input
                type="number"
                className="input"
                min="1"
                max="50"
                value={randomCount}
                onChange={(e) => setRandomCount(e.target.value)}
                style={{ width: "100%", marginTop: 4 }}
              />
            </div>

            <button
              className="button"
              onClick={selectRandomWinner}
              style={{ width: "100%", marginBottom: 12 }}
            >
              Tanlash
            </button>

            {winners && winners.length > 0 && (
              <div
                style={{
                  marginTop: 16,
                  padding: 12,
                  background: "#f5f5f5",
                  borderRadius: 4,
                }}
              >
                <h4 style={{ marginTop: 0 }}>🎉 G'oliblar:</h4>
                {winners.map((w, idx) => (
                  <div
                    key={w.telegramId}
                    style={{
                      padding: 8,
                      marginBottom: 8,
                      background: "white",
                      borderRadius: 4,
                      border: "2px solid #4caf50",
                    }}
                  >
                    <div>
                      <strong>
                        {idx + 1}. {w.name}
                      </strong>
                    </div>
                    <div style={{ fontSize: 13, color: "#666" }}>
                      📱 {w.phone} | 🗺 {w.region}{" "}
                      {w.city ? `| 🏙 ${w.city}` : ""}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "#999",
                        fontFamily: "monospace",
                      }}
                    >
                      Telegram ID: {w.telegramId}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              className="button"
              onClick={() => {
                setShowRandomModal(false);
                setWinners(null);
              }}
              style={{ width: "100%", background: "#666" }}
            >
              Yopish
            </button>
          </div>
        </div>
      )}

      {/* Broadcast Modal */}
      {showBroadcastModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "white",
              padding: 24,
              borderRadius: 8,
              minWidth: 500,
              maxWidth: 700,
            }}
          >
            <h3 style={{ marginTop: 0 }}>📢 Yangilik Yuborish</h3>

            <div style={{ marginBottom: 12 }}>
              <label>Viloyat:</label>
              <select
                className="input"
                value={broadcastRegion}
                onChange={(e) => setBroadcastRegion(e.target.value)}
                style={{ width: "100%", marginTop: 4 }}
              >
                <option value="all">Barcha viloyatlar</option>
                {REGIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label>Xabar matni:</label>
              <textarea
                className="input"
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                rows={6}
                placeholder="Xabar matnini kiriting... (Markdown qo'llab-quvvatlanadi)"
                style={{ width: "100%", marginTop: 4, fontFamily: "inherit" }}
              />
              <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
                Markdown: *qalin*, _kursiv_, `kod`, [link](url)
              </div>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="button"
                onClick={sendBroadcast}
                style={{ flex: 1 }}
              >
                Yuborish
              </button>
              <button
                className="button"
                onClick={() => {
                  setShowBroadcastModal(false);
                  setBroadcastMessage("");
                }}
                style={{ flex: 1, background: "#666" }}
              >
                Bekor qilish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
