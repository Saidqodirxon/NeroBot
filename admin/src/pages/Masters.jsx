import React, { useEffect, useState } from "react";
import { masters } from "../services/api";
import { REGIONS } from "../utils/regions";

export default function Masters() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [region, setRegion] = useState("");
  const [modal, setModal] = useState(null); // { master, history, loading }

  useEffect(() => { load(); }, [region]);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const res = await masters.getAll(region ? { region } : {});
      setList(res.data.data || []);
    } catch { setError("Ma'lumotlarni yuklashda xatolik"); }
    setLoading(false);
  };

  const openHistory = async (master) => {
    setModal({ master, history: null, loading: true });
    try {
      const res = await masters.getHistory(master.telegramId);
      setModal({ master, history: res.data, loading: false });
    } catch {
      setModal({ master, history: null, loading: false, error: true });
    }
  };

  const filtered = list.filter((m) => {
    const q = search.toLowerCase();
    return !q || m.name?.toLowerCase().includes(q) || m.phone?.includes(q) ||
      m.profession?.toLowerCase().includes(q) || String(m.telegramId).includes(q);
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">👨‍🔧 Ustalar</h1>
          <p className="page-subtitle">Jami: {filtered.length} ta usta</p>
        </div>
        <button className="button btn-secondary btn-sm" onClick={load}>🔄 Yangilash</button>
      </div>

      <div className="filters-bar">
        <input className="input" placeholder="🔍 Ism, telefon, kasb, ID..."
          value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: 280 }} />
        <select className="input" value={region} onChange={(e) => setRegion(e.target.value)} style={{ width: 200 }}>
          <option value="">Barcha viloyatlar</option>
          {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="table-container">
        {loading ? (
          <div className="loading-center">⏳ Yuklanmoqda...</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">👨‍🔧</div><p>Ustalar topilmadi</p></div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th><th>Ism</th><th>Telefon</th><th>Viloyat</th>
                <th>Kasb</th><th>Ballar</th><th>Telegram ID</th>
                <th>Tasdiqlangan</th><th>Amallar</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m, i) => (
                <tr key={m.telegramId}>
                  <td className="text-muted">{i + 1}</td>
                  <td><strong>{m.name}</strong></td>
                  <td className="monospace">{m.phone}</td>
                  <td>{m.region}</td>
                  <td>{m.profession || <span className="text-muted">—</span>}</td>
                  <td>
                    <span className="badge badge-primary">⭐ {m.totalPoints || 0}</span>
                  </td>
                  <td className="monospace text-muted" style={{ fontSize: 12 }}>{m.telegramId}</td>
                  <td className="text-muted" style={{ fontSize: 12 }}>
                    {m.masterApprovedAt ? new Date(m.masterApprovedAt).toLocaleDateString("uz-UZ") : "—"}
                  </td>
                  <td>
                    <button className="button btn-sm" style={{ background: "var(--primary)" }}
                      onClick={() => openHistory(m)}>📋 Kodlar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* History Modal */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">📋 {modal.master.name} — Kodlar tarixi</h2>
              <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              {modal.loading ? (
                <div className="loading-center">⏳ Yuklanmoqda...</div>
              ) : modal.error ? (
                <div className="alert alert-danger">Xatolik yuz berdi</div>
              ) : (
                <>
                  <div style={{ display: "flex", gap: 20, marginBottom: 16, flexWrap: "wrap" }}>
                    <span>📞 {modal.history?.user?.phone}</span>
                    <span>🔧 {modal.history?.user?.profession || "—"}</span>
                    <span className="text-success fw-bold">⭐ {modal.history?.user?.totalPoints || 0} ball</span>
                  </div>
                  {!modal.history?.data?.length ? (
                    <p className="text-muted">Hali kod yuborilmagan</p>
                  ) : (
                    <table className="data-table">
                      <thead>
                        <tr><th>#</th><th>Kod</th><th>Ball</th><th>Sana</th></tr>
                      </thead>
                      <tbody>
                        {modal.history.data.map((u, i) => (
                          <tr key={u._id}>
                            <td className="text-muted">{i + 1}</td>
                            <td className="monospace fw-bold">{u.promoCode}</td>
                            <td className="text-success fw-bold">+{u.points}</td>
                            <td className="text-muted" style={{ fontSize: 12 }}>
                              {new Date(u.usedAt).toLocaleString("uz-UZ", {
                                day: "2-digit", month: "2-digit", year: "2-digit",
                                hour: "2-digit", minute: "2-digit"
                              })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
