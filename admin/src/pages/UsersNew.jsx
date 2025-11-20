import React, { useEffect, useState } from "react";
import { users, seasons } from "../services/api";
import { REGIONS } from "../utils/regions";

export default function Users() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [regionFilter, setRegionFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [seasonsList, setSeasonsList] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState("all");

  useEffect(() => {
    loadSeasons();
    load();
  }, [regionFilter]);

  const loadSeasons = async () => {
    try {
      const res = await seasons.getAll();
      setSeasonsList(res.data.data || []);
    } catch (err) {
      console.error("Mavsumlarni yuklab bo'lmadi:", err);
    }
  };

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = regionFilter ? { region: regionFilter } : {};
      const res = await users.getAll(params);
      setList(res.data.data || []);
    } catch (err) {
      console.error("Users load error:", err);
      setError("Ma'lumotlarni yuklashda xatolik yuz berdi");
    }
    setLoading(false);
  };

  const loadUserDetails = async (user) => {
    try {
      setSelectedUser(user);
      setShowDetailsModal(true);
      const res = await users.getDetails(
        user.telegramId,
        selectedSeason === "all" ? null : selectedSeason
      );
      setUserDetails(res.data.data);
    } catch (err) {
      alert("Xatolik: " + (err.response?.data?.message || err.message));
    }
  };

  const exportUsers = () => {
    const token = localStorage.getItem("nerobot_token");
    const baseUrl =
      import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1";
    const url = regionFilter
      ? `${baseUrl}/export/users?region=${regionFilter}`
      : `${baseUrl}/export/users`;

    fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.blob())
      .then((blob) => {
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = "users.xlsx";
        a.click();
      })
      .catch((err) => alert("Xatolik: " + err.message));
  };

  const exportUserHistory = async () => {
    if (!selectedUser) return;

    try {
      const seasonId = selectedSeason === "all" ? null : selectedSeason;
      const res = await users.exportHistory(selectedUser.telegramId, seasonId);

      const downloadUrl = window.URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `user_${selectedUser.telegramId}_codes.xlsx`;
      a.click();
    } catch (err) {
      alert("Xatolik: " + (err.response?.data?.message || err.message));
    }
  };

  const blockUser = async (userId) => {
    const reason = prompt("Bloklash sababini kiriting (ixtiyoriy):");
    if (reason === null) return; // Cancel bosilsa

    try {
      await users.block(userId, reason || undefined);
      alert("Foydalanuvchi bloklandi");
      load(); // Ro'yxatni yangilash
      if (showDetailsModal) {
        setShowDetailsModal(false);
        setSelectedUser(null);
      }
    } catch (err) {
      alert("Xatolik: " + (err.response?.data?.message || err.message));
    }
  };

  const unblockUser = async (userId) => {
    if (!confirm("Foydalanuvchini blokdan chiqarasizmi?")) return;

    try {
      await users.unblock(userId);
      alert("Foydalanuvchi blokdan chiqarildi");
      load(); // Ro'yxatni yangilash
      if (showDetailsModal) {
        setShowDetailsModal(false);
        setSelectedUser(null);
      }
    } catch (err) {
      alert("Xatolik: " + (err.response?.data?.message || err.message));
    }
  };

  return (
    <div>
      <h3>👥 Foydalanuvchilar</h3>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 12,
          gap: 12,
          alignItems: "center",
        }}
      >
        <div
          style={{ display: "flex", gap: 12, alignItems: "center", flex: 1 }}
        >
          <input
            type="text"
            className="input"
            placeholder="🔍 Qidirish (ism, telefon, ID)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: 300 }}
          />
          <select
            className="input"
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            style={{ width: 250 }}
          >
            <option value="">Barcha viloyatlar</option>
            {REGIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <div>
            <strong>Natija:</strong>{" "}
            {
              list.filter((user) => {
                const searchLower = searchQuery.toLowerCase();
                return (
                  user.name?.toLowerCase().includes(searchLower) ||
                  user.phone?.includes(searchQuery) ||
                  user.telegramId?.toString().includes(searchQuery) ||
                  user.username?.toLowerCase().includes(searchLower)
                );
              }).length
            }{" "}
            ta foydalanuvchi
          </div>
        </div>
        <button className="button" onClick={exportUsers}>
          📥 Excel yuklab olish
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 40 }}>
          <div>⏳ Yuklanmoqda...</div>
        </div>
      ) : error ? (
        <div
          style={{
            textAlign: "center",
            padding: 40,
            color: "#f44336",
          }}
        >
          {error}
        </div>
      ) : list.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: "#999" }}>
          Foydalanuvchilar topilmadi
        </div>
      ) : (
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 14,
          }}
        >
          <thead>
            <tr
              style={{
                background: "#f5f5f5",
                textAlign: "left",
                borderBottom: "2px solid #ddd",
              }}
            >
              <th style={{ padding: "12px 8px" }}>#</th>
              <th style={{ padding: "12px 8px" }}>Ism</th>
              <th style={{ padding: "12px 8px" }}>Telefon</th>
              <th style={{ padding: "12px 8px" }}>Viloyat</th>
              <th style={{ padding: "12px 8px" }}>Username</th>
              <th style={{ padding: "12px 8px" }}>Telegram ID</th>
              <th style={{ padding: "12px 8px" }}>Sana</th>
              <th style={{ padding: "12px 8px" }}>Amallar</th>
            </tr>
          </thead>
          <tbody>
            {list
              .filter((user) => {
                const searchLower = searchQuery.toLowerCase();
                return (
                  user.name?.toLowerCase().includes(searchLower) ||
                  user.phone?.includes(searchQuery) ||
                  user.telegramId?.toString().includes(searchQuery) ||
                  user.username?.toLowerCase().includes(searchLower)
                );
              })
              .map((user, idx) => (
                <tr
                  key={user._id}
                  style={{
                    borderBottom: "1px solid #eee",
                    background: idx % 2 === 0 ? "#fafafa" : "white",
                  }}
                >
                  <td style={{ padding: "10px 8px" }}>{idx + 1}</td>
                  <td style={{ padding: "10px 8px", fontWeight: 500 }}>
                    {user.name}
                  </td>
                  <td style={{ padding: "10px 8px", fontFamily: "monospace" }}>
                    {user.phone}
                  </td>
                  <td style={{ padding: "10px 8px" }}>{user.region}</td>
                  <td style={{ padding: "10px 8px" }}>
                    {user.username ? `@${user.username}` : "—"}
                  </td>
                  <td style={{ padding: "10px 8px", fontFamily: "monospace" }}>
                    {user.telegramId}
                  </td>
                  <td style={{ padding: "10px 8px", fontSize: 12 }}>
                    {new Date(user.registeredAt).toLocaleDateString("uz-UZ")}
                  </td>
                  <td style={{ padding: "10px 8px" }}>
                    <button
                      className="button"
                      onClick={() => loadUserDetails(user)}
                      style={{
                        padding: "4px 12px",
                        fontSize: 12,
                        background: "#2196F3",
                        marginRight: 8,
                      }}
                    >
                      📊 Tafsilotlar
                    </button>
                    {user.isBlocked ? (
                      <button
                        className="button"
                        onClick={() => unblockUser(user._id)}
                        style={{
                          padding: "4px 12px",
                          fontSize: 12,
                          background: "#4CAF50",
                        }}
                      >
                        ✅ Blokdan chiqarish
                      </button>
                    ) : (
                      <button
                        className="button"
                        onClick={() => blockUser(user._id)}
                        style={{
                          padding: "4px 12px",
                          fontSize: 12,
                          background: "#f44336",
                        }}
                      >
                        🚫 Bloklash
                      </button>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      )}

      {/* User Details Modal */}
      {showDetailsModal && selectedUser && (
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
              minWidth: 700,
              maxWidth: 900,
              maxHeight: "90vh",
              overflow: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <h3 style={{ margin: 0 }}>👤 {selectedUser.name}</h3>
              <button
                className="button"
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedUser(null);
                  setUserDetails(null);
                }}
                style={{ background: "#666" }}
              >
                ✕ Yopish
              </button>
            </div>

            <div
              style={{
                background: "#f5f5f5",
                padding: 16,
                borderRadius: 8,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                  fontSize: 14,
                }}
              >
                <div>
                  <strong>📱 Telefon:</strong>{" "}
                  <a
                    href={`tel:${selectedUser.phone}`}
                    style={{ color: "#1976d2", textDecoration: "none" }}
                  >
                    {selectedUser.phone}
                  </a>
                </div>
                <div>
                  <strong>🗺 Viloyat:</strong> {selectedUser.region}
                </div>
                <div>
                  <strong>✈️ Username:</strong>{" "}
                  {selectedUser.username ? (
                    <a
                      href={`tg://resolve?domain=${selectedUser.username}`}
                      style={{ color: "#1976d2", textDecoration: "none" }}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      @{selectedUser.username}
                    </a>
                  ) : (
                    "Yo'q"
                  )}
                </div>
                <div>
                  <strong>🆔 Telegram ID:</strong> {selectedUser.telegramId}
                </div>
                <div>
                  <strong>📅 Ro'yxatdan o'tgan:</strong>{" "}
                  {new Date(selectedUser.registeredAt).toLocaleString("uz-UZ")}
                </div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <h4 style={{ margin: 0 }}>🎟 Ishlatilgan Kodlar</h4>
                <select
                  className="input"
                  value={selectedSeason}
                  onChange={(e) => {
                    setSelectedSeason(e.target.value);
                    loadUserDetails(selectedUser);
                  }}
                  style={{ minWidth: 200 }}
                >
                  <option value="all">Barcha mavsumlar</option>
                  {seasonsList.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                className="button"
                onClick={exportUserHistory}
                style={{ background: "#4caf50" }}
              >
                📥 Excel yuklab olish
              </button>
            </div>

            {!userDetails ? (
              <div style={{ textAlign: "center", padding: 40 }}>
                <div>⏳ Yuklanmoqda...</div>
              </div>
            ) : userDetails.usageHistory.length === 0 ? (
              <div style={{ textAlign: "center", padding: 40, color: "#999" }}>
                Bu foydalanuvchi hali kod ishlatmagan
              </div>
            ) : (
              <div>
                <div
                  style={{ marginBottom: 12, fontWeight: 500, fontSize: 16 }}
                >
                  📊 Jami: {userDetails.totalCodes} ta kod
                </div>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 14,
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        background: "#f5f5f5",
                        textAlign: "left",
                        borderBottom: "2px solid #ddd",
                      }}
                    >
                      <th style={{ padding: "10px 8px" }}>#</th>
                      <th style={{ padding: "10px 8px" }}>Promo Kod</th>
                      <th style={{ padding: "10px 8px" }}>Mavsum</th>
                      <th style={{ padding: "10px 8px" }}>Sana</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userDetails.usageHistory.map((usage, idx) => (
                      <tr
                        key={usage._id}
                        style={{
                          borderBottom: "1px solid #eee",
                          background: idx % 2 === 0 ? "#fafafa" : "white",
                        }}
                      >
                        <td style={{ padding: "10px 8px" }}>{idx + 1}</td>
                        <td
                          style={{
                            padding: "10px 8px",
                            fontFamily: "monospace",
                            fontWeight: 500,
                          }}
                        >
                          {usage.promoCode}
                        </td>
                        <td style={{ padding: "10px 8px" }}>
                          {usage.seasonId?.name || "—"}
                        </td>
                        <td style={{ padding: "10px 8px", fontSize: 13 }}>
                          {new Date(usage.usedAt).toLocaleString("uz-UZ")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
