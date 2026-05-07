import React, { useEffect, useState } from "react";
import { users, seasons, promoCodes } from "../services/api";
import { REGIONS } from "../utils/regions";

export default function Users() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [regionFilter, setRegionFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [seasonsList, setSeasonsList] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState("all");

  useEffect(() => { loadSeasons(); load(); }, [regionFilter, roleFilter]);

  const loadSeasons = async () => {
    try { const res = await seasons.getAll(); setSeasonsList(res.data.data || []); } catch {}
  };

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const params = {};
      if (regionFilter) params.region = regionFilter;
      if (roleFilter) params.userType = roleFilter;
      const res = await users.getAll(params);
      setList(res.data.data || []);
    } catch { setError("Ma'lumotlarni yuklashda xatolik"); }
    setLoading(false);
  };

  const loadUserDetails = async (user) => {
    setSelectedUser(user); setShowModal(true); setUserDetails(null);
    try {
      const res = await users.getDetails(user.telegramId, selectedSeason === "all" ? null : selectedSeason);
      setUserDetails(res.data.data);
    } catch (err) { alert("Xatolik: " + (err.response?.data?.message || err.message)); }
  };

  const exportUsers = () => {
    const token = localStorage.getItem("nerobot_token");
    const base = import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1";
    const url = regionFilter ? `${base}/export/users?region=${regionFilter}` : `${base}/export/users`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.blob())
      .then((blob) => { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "users.xlsx"; a.click(); })
      .catch((e) => alert("Xatolik: " + e.message));
  };

  const exportUserHistory = async () => {
    if (!selectedUser) return;
    try {
      const res = await users.exportHistory(selectedUser.telegramId, selectedSeason === "all" ? null : selectedSeason);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(res.data);
      a.download = `user_${selectedUser.telegramId}_codes.xlsx`; a.click();
    } catch (err) { alert("Xatolik: " + (err.response?.data?.message || err.message)); }
  };

  const handleDeleteCode = async (code) => {
    if (!window.confirm(`${code} kodini o'chirmoqchimisiz?`)) return;
    try { await promoCodes.delete(code); loadUserDetails(selectedUser); }
    catch (err) { alert("Xatolik: " + (err.response?.data?.message || err.message)); }
  };

  const blockUser = async (userId) => {
    const reason = prompt("Bloklash sababi (ixtiyoriy):");
    if (reason === null) return;
    try { await users.block(userId, reason || undefined); alert("Bloklandi"); load(); setShowModal(false); }
    catch (err) { alert("Xatolik: " + (err.response?.data?.message || err.message)); }
  };

  const unblockUser = async (userId) => {
    if (!confirm("Blokdan chiqarasizmi?")) return;
    try { await users.unblock(userId); alert("Blokdan chiqarildi"); load(); setShowModal(false); }
    catch (err) { alert("Xatolik: " + (err.response?.data?.message || err.message)); }
  };

  const filtered = list.filter((u) => {
    const q = searchQuery.toLowerCase();
    return !q || u.name?.toLowerCase().includes(q) || u.phone?.includes(searchQuery) ||
      String(u.telegramId).includes(searchQuery) || u.username?.toLowerCase().includes(q);
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">👥 Foydalanuvchilar</h1>
          <p className="page-subtitle">Jami: {filtered.length} ta</p>
        </div>
        <button className="button btn-success btn-sm" onClick={exportUsers}>📥 Excel</button>
      </div>

      <div className="filters-bar">
        <input className="input" placeholder="🔍 Ism, telefon, ID, username..."
          value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ width: 280 }} />
        <select className="input" value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)} style={{ width: 200 }}>
          <option value="">Barcha viloyatlar</option>
          {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <select className="input" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} style={{ width: 180 }}>
          <option value="">Barcha rollar</option>
          <option value="user">👤 Foydalanuvchilar</option>
          <option value="master">👨‍🔧 Ustalar</option>
        </select>
        <button className="button btn-secondary btn-sm" onClick={load}>🔄</button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="table-container">
        {loading ? (
          <div className="loading-center">⏳ Yuklanmoqda...</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">👥</div><p>Foydalanuvchilar topilmadi</p></div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th><th>Ism</th><th>Telefon</th><th>Viloyat</th>
                <th>Username</th><th>Ball</th><th>Rol</th>
                <th>Telegram ID</th><th>Sana</th><th>Amallar</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u, i) => (
                <tr key={u._id}>
                  <td className="text-muted">{i + 1}</td>
                  <td>
                    <strong>{u.name}</strong>
                    {u.isBlocked && <span className="badge badge-danger" style={{ marginLeft: 6, fontSize: 10 }}>🚫 Bloklangan</span>}
                  </td>
                  <td className="monospace">{u.phone}</td>
                  <td>{u.region}</td>
                  <td className="text-muted">{u.username ? `@${u.username}` : "—"}</td>
                  <td>
                    {u.userType === "master"
                      ? <span className="text-success fw-bold">⭐ {u.totalPoints || 0}</span>
                      : <span className="text-muted">—</span>
                    }
                  </td>
                  <td>
                    <span className={`badge ${u.userType === "master" ? "badge-success" : "badge-info"}`}>
                      {u.userType === "master" ? "👨‍🔧 Usta" : "👤 User"}
                    </span>
                  </td>
                  <td className="monospace text-muted" style={{ fontSize: 12 }}>{u.telegramId}</td>
                  <td className="text-muted" style={{ fontSize: 12 }}>{new Date(u.registeredAt).toLocaleDateString("uz-UZ")}</td>
                  <td>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button className="button btn-sm" style={{ background: "var(--primary)" }} onClick={() => loadUserDetails(u)}>📊</button>
                      {u.isBlocked
                        ? <button className="button btn-success btn-sm" onClick={() => unblockUser(u._id)}>✅</button>
                        : <button className="button btn-danger btn-sm" onClick={() => blockUser(u._id)}>🚫</button>
                      }
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Details Modal */}
      {showModal && selectedUser && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); setSelectedUser(null); setUserDetails(null); }}>
          <div className="modal" style={{ maxWidth: 800 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                👤 {selectedUser.name}
                <span className={`badge ${selectedUser.userType === "master" ? "badge-success" : "badge-info"}`} style={{ marginLeft: 10, fontSize: 12 }}>
                  {selectedUser.userType === "master" ? "👨‍🔧 Usta" : "👤 User"}
                </span>
              </h2>
              <button className="modal-close" onClick={() => { setShowModal(false); setSelectedUser(null); setUserDetails(null); }}>✕</button>
            </div>
            <div className="modal-body">
              {/* User info */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20, padding: "14px 16px", background: "#f8fafc", borderRadius: 10, fontSize: 13.5 }}>
                <div>📱 <strong>Telefon:</strong> <a href={`tel:${selectedUser.phone}`} style={{ color: "var(--primary)" }}>{selectedUser.phone}</a></div>
                <div>🗺 <strong>Viloyat:</strong> {selectedUser.region}</div>
                <div>✈️ <strong>Username:</strong> {selectedUser.username ? <a href={`https://t.me/${selectedUser.username}`} target="_blank" rel="noreferrer" style={{ color: "var(--primary)" }}>@{selectedUser.username}</a> : "—"}</div>
                <div>🆔 <strong>Telegram ID:</strong> <span className="monospace">{selectedUser.telegramId}</span></div>
                <div>📅 <strong>Ro'yxat:</strong> {new Date(selectedUser.registeredAt).toLocaleDateString("uz-UZ")}</div>
                {selectedUser.isBlocked && <div>🚫 <strong>Sabab:</strong> {selectedUser.blockedReason || "—"}</div>}
              </div>

              {/* Codes filter */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <strong style={{ fontSize: 14 }}>🎟 Kodlar tarixi</strong>
                  <select className="input" value={selectedSeason}
                    onChange={(e) => { setSelectedSeason(e.target.value); loadUserDetails(selectedUser); }}
                    style={{ minWidth: 180 }}>
                    <option value="all">Barcha mavsumlar</option>
                    {seasonsList.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                  </select>
                </div>
                <button className="button btn-success btn-sm" onClick={exportUserHistory}>📥 Excel</button>
              </div>

              {!userDetails ? (
                <div className="loading-center">⏳ Yuklanmoqda...</div>
              ) : userDetails.usageHistory.length === 0 ? (
                <p className="text-muted">Bu foydalanuvchi hali kod ishlatmagan</p>
              ) : (
                <div>
                  <div style={{ display: "flex", gap: 20, marginBottom: 12, fontSize: 13.5 }}>
                    <span>📊 Kodlar: <strong>{userDetails.totalCodes}</strong></span>
                    <span className="text-success">⭐ Ball: <strong>{userDetails.user?.totalPoints || 0}</strong></span>
                  </div>
                  <table className="data-table">
                    <thead>
                      <tr><th>#</th><th>Promo Kod</th><th>Ball</th><th>Mavsum</th><th>Sana</th><th></th></tr>
                    </thead>
                    <tbody>
                      {userDetails.usageHistory.map((u, i) => (
                        <tr key={u._id}>
                          <td className="text-muted">{i + 1}</td>
                          <td className="monospace fw-bold">{u.promoCode}</td>
                          <td className="text-success fw-bold">{u.points || 0}</td>
                          <td className="text-muted">{u.seasonId?.name || "—"}</td>
                          <td className="text-muted" style={{ fontSize: 12 }}>{new Date(u.usedAt).toLocaleString("uz-UZ")}</td>
                          <td>
                            <button className="button btn-danger btn-sm" title="O'chirish" onClick={() => handleDeleteCode(u.promoCode)}>🗑</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="modal-footer">
              {selectedUser.isBlocked
                ? <button className="button btn-success" onClick={() => unblockUser(selectedUser._id)}>✅ Blokdan chiqarish</button>
                : <button className="button btn-danger" onClick={() => blockUser(selectedUser._id)}>🚫 Bloklash</button>
              }
              <button className="button btn-secondary" onClick={() => { setShowModal(false); setSelectedUser(null); setUserDetails(null); }}>Yopish</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
