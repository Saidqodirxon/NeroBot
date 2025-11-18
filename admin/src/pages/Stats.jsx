import React, { useEffect, useState } from "react";
import { stats, seasons } from "../services/api";

export default function Stats() {
  const [data, setData] = useState(null);
  const [seasonsList, setSeasonsList] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState("all");

  useEffect(() => {
    loadSeasons();
    loadStats();
  }, []);

  useEffect(() => {
    if (seasonsList.length > 0) {
      loadStats();
    }
  }, [selectedSeason]);

  const loadSeasons = async () => {
    try {
      const res = await seasons.getAll();
      setSeasonsList(res.data.data || []);
    } catch (err) {
      console.error("Mavsumlarni yuklab bo'lmadi:", err);
    }
  };

  const loadStats = async () => {
    try {
      const seasonId = selectedSeason === "all" ? null : selectedSeason;
      const res = await stats.get(seasonId);
      setData(res.data.data);
    } catch (err) {
      console.error(err);
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
        <h3 style={{ margin: 0 }}>📊 Statistika</h3>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <label style={{ fontSize: 14, fontWeight: 500 }}>Mavsum:</label>
          <select
            className="input"
            value={selectedSeason}
            onChange={(e) => setSelectedSeason(e.target.value)}
            style={{ minWidth: 200 }}
          >
            <option value="all">Barcha mavsumlar</option>
            {seasonsList.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name} {s.isActive ? "✓" : ""}
              </option>
            ))}
          </select>
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
                  <tr key={idx} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: "8px 4px" }}>
                      {idx + 1}. {user.userName}
                    </td>
                    <td style={{ padding: "8px 4px" }}>{user.userRegion}</td>
                    <td style={{ padding: "8px 4px", fontWeight: "bold" }}>
                      {user.count}
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
    </div>
  );
}
