import React, { useEffect, useState } from "react";
import { api, seasons } from "../services/api";

const EMPTY_FORM = {
  name: "", description: "", imageUrl: "", seasonId: "",
  isActive: true, prizeType: "random", position: "", requiredPoints: "",
};

export default function Prizes() {
  const [prizesList, setPrizesList]     = useState([]);
  const [seasonsList, setSeasonsList]   = useState([]);
  const [loading, setLoading]           = useState(true);
  const [showModal, setShowModal]       = useState(false);
  const [editingPrize, setEditingPrize] = useState(null);
  const [seasonFilter, setSeasonFilter]       = useState("all");
  const [prizeTypeFilter, setPrizeTypeFilter] = useState("all");
  const [searchQuery, setSearchQuery]         = useState("");
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData]   = useState(EMPTY_FORM);

  useEffect(() => { loadSeasons(); loadPrizes(); }, [seasonFilter]);

  const loadSeasons = async () => {
    try { const r = await seasons.getAll(); setSeasonsList(r.data.data || []); } catch {}
  };

  const loadPrizes = async () => {
    setLoading(true);
    try {
      const params = seasonFilter !== "all" ? { seasonId: seasonFilter } : {};
      const r = await api.get("/prizes", { params });
      setPrizesList(r.data.data || []);
    } catch (err) { alert("Xatolik: " + (err.response?.data?.message || err.message)); }
    setLoading(false);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!["image/jpeg","image/jpg","image/png","image/gif","image/webp"].includes(file.type)) {
      alert("Faqat rasm fayllari qabul qilinadi"); return;
    }
    if (file.size > 5 * 1024 * 1024) { alert("Rasm 5MB dan katta bo'lmasligi kerak"); return; }
    try {
      setUploading(true);
      const fd = new FormData(); fd.append("image", file);
      const token = localStorage.getItem("nerobot_token");
      const base = import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1";
      const r = await fetch(`${base}/prizes/upload`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd });
      const res = await r.json();
      if (res.success) setFormData((p) => ({ ...p, imageUrl: res.data.fullUrl }));
      else alert("Xatolik: " + res.message);
    } catch (err) { alert("Yuklashda xatolik: " + err.message); }
    setUploading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.imageUrl || !formData.seasonId) {
      alert("Nomi, rasm va mavsum majburiy!"); return;
    }
    try {
      if (editingPrize) await api.put(`/prizes/${editingPrize._id}`, formData);
      else await api.post("/prizes", formData);
      setShowModal(false); setEditingPrize(null); setFormData(EMPTY_FORM); loadPrizes();
    } catch (err) { alert("Xatolik: " + (err.response?.data?.message || err.message)); }
  };

  const handleEdit = (p) => {
    setEditingPrize(p);
    setFormData({ name: p.name, description: p.description || "", imageUrl: p.imageUrl, seasonId: p.seasonId?._id || "", isActive: p.isActive, prizeType: p.prizeType || "random", position: p.position ?? "", requiredPoints: p.requiredPoints ?? "" });
    setShowModal(true);
  };

  const handleDelete = async (p) => {
    if (!confirm(`"${p.name}" o'chirilsinmi?`)) return;
    try { await api.delete(`/prizes/${p._id}`); loadPrizes(); }
    catch (err) { alert("Xatolik: " + (err.response?.data?.message || err.message)); }
  };

  const filtered = prizesList.filter((p) => {
    const q = searchQuery.toLowerCase();
    return (!q || p.name.toLowerCase().includes(q) || (p.description || "").toLowerCase().includes(q)) &&
      (prizeTypeFilter === "all" || p.prizeType === prizeTypeFilter);
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">🎁 Sovg'alar</h1>
          <p className="page-subtitle">Barcha sovg'alarni boshqaring</p>
        </div>
        <button className="button" onClick={() => { setEditingPrize(null); setFormData(EMPTY_FORM); setShowModal(true); }}>
          + Yangi Sovg'a
        </button>
      </div>

      <div className="filters-bar">
        <input className="input" placeholder="🔍 Nom bo'yicha..."
          value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ width: 240 }} />
        <select className="input" value={seasonFilter} onChange={(e) => setSeasonFilter(e.target.value)} style={{ width: 180 }}>
          <option value="all">Barcha mavsumlar</option>
          {seasonsList.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
        </select>
        <select className="input" value={prizeTypeFilter} onChange={(e) => setPrizeTypeFilter(e.target.value)} style={{ width: 160 }}>
          <option value="all">Barcha turlar</option>
          <option value="random">🎲 Random</option>
          <option value="points">⭐ Ballik</option>
        </select>
        <button className="button btn-secondary btn-sm" onClick={loadPrizes}>🔄</button>
      </div>

      {loading ? (
        <div className="loading-center">⏳ Yuklanmoqda...</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state"><div className="empty-icon">🎁</div><p>Sovg'alar topilmadi</p></div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {filtered.map((prize) => (
            <div key={prize._id} style={{
              background: "#fff",
              borderRadius: 14,
              overflow: "hidden",
              boxShadow: "var(--shadow)",
              border: prize.isActive ? "2px solid var(--success)" : "2px solid var(--border)",
              transition: "transform 0.15s, box-shadow 0.15s",
            }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "var(--shadow-lg)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "var(--shadow)"; }}
            >
              {/* Image */}
              <div style={{ height: 180, background: "#f1f5f9", overflow: "hidden" }}>
                {prize.imageUrl ? (
                  <img src={prize.imageUrl} alt={prize.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    onError={(e) => { e.target.style.display = "none"; e.target.parentElement.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#94a3b8;font-size:13px">🖼 Rasm yo\'q</div>'; }}
                  />
                ) : (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontSize: 40 }}>🎁</div>
                )}
              </div>

              {/* Content */}
              <div style={{ padding: "14px 16px" }}>
                {/* Tags */}
                <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
                  {prize.isActive && <span className="badge badge-success" style={{ fontSize: 10 }}>✅ Aktiv</span>}
                  <span className={`badge ${prize.prizeType === "points" ? "badge-warning" : "badge-info"}`} style={{ fontSize: 10 }}>
                    {prize.prizeType === "points" ? "⭐ Ballik" : "🎲 Random"}
                  </span>
                </div>

                <h3 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 700 }}>{prize.name}</h3>

                {prize.description && (
                  <p style={{ margin: "0 0 8px", fontSize: 13, color: "var(--text-muted)", lineHeight: 1.4 }}>
                    {prize.description}
                  </p>
                )}

                <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
                  🎭 {prize.seasonId?.name || "Mavsum yo'q"}
                  {prize.prizeType === "random" && prize.position && (
                    <span style={{ marginLeft: 8 }}>🏅 {prize.position}-o'rin</span>
                  )}
                  {prize.prizeType === "points" && prize.requiredPoints && (
                    <span style={{ marginLeft: 8, color: "var(--warning)", fontWeight: 600 }}>⭐ {prize.requiredPoints} ball</span>
                  )}
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button className="button btn-sm" style={{ flex: 1, background: "var(--info)", color: "#fff" }} onClick={() => handleEdit(prize)}>✏️ Tahrirlash</button>
                  <button className="button btn-danger btn-sm" style={{ flex: 1 }} onClick={() => handleDelete(prize)}>🗑 O'chirish</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); setEditingPrize(null); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editingPrize ? "✏️ Sovg'ani Tahrirlash" : "🎁 Yangi Sovg'a"}</h2>
              <button className="modal-close" onClick={() => { setShowModal(false); setEditingPrize(null); }}>✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label">Sovg'a nomi *</label>
                  <input type="text" className="form-control" value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Masalan: iPhone 15 Pro" />
                </div>

                <div className="form-group">
                  <label className="form-label">Tavsif</label>
                  <textarea className="form-control" value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2} style={{ fontFamily: "inherit", resize: "vertical" }}
                    placeholder="Qisqacha ma'lumot" />
                </div>

                <div className="form-group">
                  <label className="form-label">Rasm *</label>
                  <input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploading} style={{ display: "block", marginBottom: 8 }} />
                  {uploading && <div style={{ color: "var(--warning)", fontSize: 13 }}>⏳ Yuklanmoqda...</div>}
                  {formData.imageUrl && !uploading && (
                    <div style={{ marginTop: 8, height: 120, borderRadius: 8, overflow: "hidden", background: "#f1f5f9" }}>
                      <img src={formData.imageUrl} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Mavsum *</label>
                  <select className="form-control" value={formData.seasonId}
                    onChange={(e) => setFormData({ ...formData, seasonId: e.target.value })}>
                    <option value="">Mavsumni tanlang</option>
                    {seasonsList.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Sovg'a turi *</label>
                  <select className="form-control" value={formData.prizeType}
                    onChange={(e) => setFormData({ ...formData, prizeType: e.target.value })}>
                    <option value="random">🎲 Random o'yin sovg'asi (o'rinlar uchun)</option>
                    <option value="points">⭐ Ballik sovg'a (ustalar uchun)</option>
                  </select>
                </div>

                {formData.prizeType === "random" && (
                  <div className="form-group">
                    <label className="form-label">O'rin raqami (1, 2, 3...)</label>
                    <input type="number" className="form-control" value={formData.position}
                      onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                      placeholder="1" min="1" style={{ maxWidth: 120 }} />
                  </div>
                )}

                {formData.prizeType === "points" && (
                  <div className="form-group">
                    <label className="form-label">Kerakli ball miqdori *</label>
                    <input type="number" className="form-control" value={formData.requiredPoints}
                      onChange={(e) => setFormData({ ...formData, requiredPoints: e.target.value })}
                      placeholder="100" min="1" style={{ maxWidth: 160 }} />
                  </div>
                )}

                <div className="form-group">
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13.5 }}>
                    <input type="checkbox" checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      style={{ width: 18, height: 18 }} />
                    Aktiv sovg'a (foydalanuvchilarga ko'rinadi)
                  </label>
                </div>

                <div className="modal-footer" style={{ padding: 0, borderTop: "none", marginTop: 8 }}>
                  <button type="button" className="button btn-secondary" onClick={() => { setShowModal(false); setEditingPrize(null); }}>Bekor qilish</button>
                  <button type="submit" className="button btn-primary">{editingPrize ? "💾 Saqlash" : "✅ Yaratish"}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
