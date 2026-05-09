import React, { useEffect, useState, useCallback, useRef } from "react";
import { users, seasons, promoCodes, phoneUpdate } from "../services/api";
import { REGIONS } from "../utils/regions";

const PAGE_SIZE = 50;

function isValidPhoneFE(phone) {
  if (!phone) return false;
  const c = phone.replace(/[\s\-\(\)]/g, "");
  return /^\+998\d{9}$/.test(c) || /^998\d{9}$/.test(c) || /^0\d{9}$/.test(c) || /^\d{9}$/.test(c);
}

function Pagination({ page, totalPages, total, onChange }) {
  if (totalPages <= 1) return null;
  const pages = [];
  let start = Math.max(1, page - 2), end = Math.min(totalPages, page + 2);
  if (end - start < 4) { start = Math.max(1, end - 4); end = Math.min(totalPages, start + 4); }
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "12px 16px", borderTop: "1px solid var(--border)", background: "#f8fafc",
      fontSize: 13, flexWrap: "wrap", gap: 8,
    }}>
      <span style={{ color: "var(--text-muted)" }}>
        Jami: <strong>{total}</strong> ta · Sahifa <strong>{page}</strong> / <strong>{totalPages}</strong>
      </span>
      <div style={{ display: "flex", gap: 4 }}>
        <button className="btn btn-secondary btn-sm" onClick={() => onChange(1)} disabled={page === 1}>«</button>
        <button className="btn btn-secondary btn-sm" onClick={() => onChange(page - 1)} disabled={page === 1}>‹</button>
        {pages.map((p) => (
          <button
            key={p}
            className={`btn btn-sm ${p === page ? "btn-primary" : "btn-secondary"}`}
            onClick={() => onChange(p)}
          >{p}</button>
        ))}
        <button className="btn btn-secondary btn-sm" onClick={() => onChange(page + 1)} disabled={page === totalPages}>›</button>
        <button className="btn btn-secondary btn-sm" onClick={() => onChange(totalPages)} disabled={page === totalPages}>»</button>
      </div>
    </div>
  );
}

export default function Users() {
  const [list, setList]           = useState([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);

  const [regionFilter, setRegionFilter] = useState("");
  const [roleFilter, setRoleFilter]     = useState("");
  const [phoneFilter, setPhoneFilter]   = useState("");
  const [searchQuery, setSearchQuery]   = useState("");
  const [searchInput, setSearchInput]   = useState("");
  const searchTimer = useRef(null);

  const [showModal, setShowModal]   = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetails, setUserDetails]   = useState(null);
  const [seasonsList, setSeasonsList]   = useState([]);
  const [selectedSeason, setSelectedSeason] = useState("all");

  const [editPhoneUser, setEditPhoneUser]     = useState(null);
  const [editPhoneValue, setEditPhoneValue]   = useState("");
  const [editPhoneSaving, setEditPhoneSaving] = useState(false);
  const [editPhoneError, setEditPhoneError]   = useState(null);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  useEffect(() => { loadSeasons(); }, []);
  useEffect(() => { load(); }, [page, regionFilter, roleFilter, searchQuery]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [regionFilter, roleFilter, searchQuery]);

  const loadSeasons = async () => {
    try { const r = await seasons.getAll(); setSeasonsList(r.data.data || []); } catch {}
  };

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = {
        limit: PAGE_SIZE,
        skip: (page - 1) * PAGE_SIZE,
      };
      if (regionFilter) params.region = regionFilter;
      if (roleFilter)   params.userType = roleFilter;
      if (searchQuery)  params.search = searchQuery;
      const res = await users.getAll(params);
      setList(res.data.data || []);
      setTotal(res.data.total || 0);
    } catch { setError("Ma'lumotlarni yuklashda xatolik"); }
    setLoading(false);
  }, [page, regionFilter, roleFilter, searchQuery]);

  // Debounced search
  const handleSearchInput = (val) => {
    setSearchInput(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setSearchQuery(val), 450);
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
    const base  = import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1";
    const q     = regionFilter ? `?region=${regionFilter}` : "";
    fetch(`${base}/export/users${q}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.blob())
      .then((blob) => { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "users.xlsx"; a.click(); })
      .catch((e) => alert("Xatolik: " + e.message));
  };

  const exportUserHistory = async () => {
    if (!selectedUser) return;
    try {
      const res = await users.exportHistory(selectedUser.telegramId, selectedSeason === "all" ? null : selectedSeason);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(res.data); a.download = `user_${selectedUser.telegramId}_codes.xlsx`; a.click();
    } catch (err) { alert("Xatolik: " + (err.response?.data?.message || err.message)); }
  };

  const handleDeleteCode = async (code) => {
    if (!window.confirm(`${code} kodini o'chirmoqchimisiz?`)) return;
    try { await promoCodes.delete(code); loadUserDetails(selectedUser); }
    catch (err) { alert("Xatolik: " + (err.response?.data?.message || err.message)); }
  };

  const blockUser = async (userId) => {
    const reason = prompt("Bloklash sababi (ixtiyoriy):"); if (reason === null) return;
    try { await users.block(userId, reason || undefined); alert("Bloklandi"); load(); setShowModal(false); }
    catch (err) { alert("Xatolik: " + (err.response?.data?.message || err.message)); }
  };

  const unblockUser = async (userId) => {
    if (!confirm("Blokdan chiqarasizmi?")) return;
    try { await users.unblock(userId); alert("Blokdan chiqarildi"); load(); setShowModal(false); }
    catch (err) { alert("Xatolik: " + (err.response?.data?.message || err.message)); }
  };

  const openEditPhone = (u) => { setEditPhoneUser(u); setEditPhoneValue(u.phone || ""); setEditPhoneError(null); };
  const saveEditPhone = async () => {
    if (!editPhoneUser) return;
    setEditPhoneSaving(true); setEditPhoneError(null);
    try { await phoneUpdate.updateUserPhone(editPhoneUser.telegramId, editPhoneValue); setEditPhoneUser(null); load(); }
    catch (err) { setEditPhoneError(err.response?.data?.message || "Xatolik yuz berdi"); }
    finally { setEditPhoneSaving(false); }
  };

  // Client-side phone filter (on current page only)
  const filtered = phoneFilter === "invalid" ? list.filter((u) => !isValidPhoneFE(u.phone))
    : phoneFilter === "valid"   ? list.filter((u) => isValidPhoneFE(u.phone))
    : list;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">👥 Foydalanuvchilar</h1>
          <p className="page-subtitle">Jami: {total} ta · Ko'rsatilmoqda: {filtered.length} ta</p>
        </div>
        <button className="btn btn-success btn-sm" onClick={exportUsers}>📥 Excel</button>
      </div>

      <div className="filters-bar">
        <input
          className="input"
          placeholder="🔍 Ism, telefon, ID, username..."
          value={searchInput}
          onChange={(e) => handleSearchInput(e.target.value)}
          style={{ width: 260 }}
        />
        <select className="input" value={regionFilter} onChange={(e) => { setRegionFilter(e.target.value); }} style={{ width: 190 }}>
          <option value="">Barcha viloyatlar</option>
          {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <select className="input" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} style={{ width: 170 }}>
          <option value="">Barcha rollar</option>
          <option value="user">👤 Foydalanuvchilar</option>
          <option value="master">👨‍🔧 Ustalar</option>
        </select>
        <select className="input" value={phoneFilter} onChange={(e) => setPhoneFilter(e.target.value)} style={{ width: 180 }}>
          <option value="">Barcha raqamlar</option>
          <option value="invalid">📵 Noto'g'ri raqam</option>
          <option value="valid">✅ To'g'ri raqam</option>
        </select>
        <button className="btn btn-secondary btn-sm" onClick={load}>🔄</button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="table-container">
        {loading ? (
          <div className="loading-center">⏳ Yuklanmoqda...</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">👥</div><p>Foydalanuvchilar topilmadi</p></div>
        ) : (
          <>
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
                    <td className="text-muted">{(page - 1) * PAGE_SIZE + i + 1}</td>
                    <td>
                      <strong>{u.name}</strong>
                      {u.isBlocked && <span className="badge badge-danger" style={{ marginLeft: 6, fontSize: 10 }}>🚫</span>}
                    </td>
                    <td>
                      <span className="monospace" style={{ color: isValidPhoneFE(u.phone) ? "inherit" : "var(--danger)", fontWeight: isValidPhoneFE(u.phone) ? "normal" : 600 }}>
                        {u.phone || "—"}
                      </span>
                      {!isValidPhoneFE(u.phone) && (
                        <span className="badge badge-danger" style={{ marginLeft: 4, fontSize: 10 }}>!</span>
                      )}
                    </td>
                    <td>{u.region}</td>
                    <td className="text-muted">{u.username ? `@${u.username}` : "—"}</td>
                    <td>
                      {u.userType === "master"
                        ? <span className="text-success fw-bold">⭐ {u.totalPoints || 0}</span>
                        : <span className="text-muted">—</span>}
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
                        <button className="btn btn-sm btn-primary" title="Batafsil" onClick={() => loadUserDetails(u)}>📊</button>
                        <button className="btn btn-sm btn-secondary" title="Telefon tahrirlash" onClick={() => openEditPhone(u)}>✏️</button>
                        {u.isBlocked
                          ? <button className="btn btn-success btn-sm" onClick={() => unblockUser(u._id)}>✅</button>
                          : <button className="btn btn-danger btn-sm" onClick={() => blockUser(u._id)}>🚫</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={page} totalPages={totalPages} total={total} onChange={setPage} />
          </>
        )}
      </div>

      {/* Edit Phone Modal */}
      {editPhoneUser && (
        <div className="modal-overlay" onClick={() => setEditPhoneUser(null)}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">✏️ Telefon Tahrirlash</h3>
              <button className="modal-close" onClick={() => setEditPhoneUser(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ margin: "0 0 14px", color: "var(--text-muted)", fontSize: 13 }}>
                <strong>{editPhoneUser.name}</strong> — joriy: <code>{editPhoneUser.phone || "yo'q"}</code>
              </p>
              <div className="form-group">
                <label className="form-label">Yangi telefon raqam</label>
                <input className="form-control" value={editPhoneValue}
                  onChange={(e) => { setEditPhoneValue(e.target.value); setEditPhoneError(null); }}
                  placeholder="+998901234567" autoFocus />
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 5 }}>
                  Format: +998901234567 · 998901234567 · 901234567
                </div>
              </div>
              {editPhoneError && <div className="alert alert-danger">{editPhoneError}</div>}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setEditPhoneUser(null)}>Bekor</button>
              <button className="btn btn-primary" onClick={saveEditPhone}
                disabled={editPhoneSaving || !editPhoneValue.trim()}>
                {editPhoneSaving ? "Saqlanmoqda..." : "✅ Saqlash"}
              </button>
            </div>
          </div>
        </div>
      )}

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
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20, padding: "14px 16px", background: "#f8fafc", borderRadius: 10, fontSize: 13.5 }}>
                <div>📱 <strong>Telefon:</strong> <a href={`tel:${selectedUser.phone}`} style={{ color: "var(--primary)" }}>{selectedUser.phone}</a></div>
                <div>🗺 <strong>Viloyat:</strong> {selectedUser.region}</div>
                <div>✈️ <strong>Username:</strong> {selectedUser.username ? <a href={`https://t.me/${selectedUser.username}`} target="_blank" rel="noreferrer" style={{ color: "var(--primary)" }}>@{selectedUser.username}</a> : "—"}</div>
                <div>🆔 <strong>Telegram ID:</strong> <span className="monospace">{selectedUser.telegramId}</span></div>
                <div>📅 <strong>Ro'yxat:</strong> {new Date(selectedUser.registeredAt).toLocaleDateString("uz-UZ")}</div>
                {selectedUser.isBlocked && <div>🚫 <strong>Sabab:</strong> {selectedUser.blockedReason || "—"}</div>}
              </div>
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
                <button className="btn btn-success btn-sm" onClick={exportUserHistory}>📥 Excel</button>
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
                    <thead><tr><th>#</th><th>Promo Kod</th><th>Ball</th><th>Mavsum</th><th>Sana</th><th></th></tr></thead>
                    <tbody>
                      {userDetails.usageHistory.map((u, i) => (
                        <tr key={u._id}>
                          <td className="text-muted">{i + 1}</td>
                          <td className="monospace fw-bold">{u.promoCode}</td>
                          <td className="text-success fw-bold">{u.points || 0}</td>
                          <td className="text-muted">{u.seasonId?.name || "—"}</td>
                          <td className="text-muted" style={{ fontSize: 12 }}>{new Date(u.usedAt).toLocaleString("uz-UZ")}</td>
                          <td><button className="btn btn-danger btn-sm" onClick={() => handleDeleteCode(u.promoCode)}>🗑</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="modal-footer">
              {selectedUser.isBlocked
                ? <button className="btn btn-success" onClick={() => unblockUser(selectedUser._id)}>✅ Blokdan chiqarish</button>
                : <button className="btn btn-danger" onClick={() => blockUser(selectedUser._id)}>🚫 Bloklash</button>}
              <button className="btn btn-secondary" onClick={() => { setShowModal(false); setSelectedUser(null); setUserDetails(null); }}>Yopish</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
