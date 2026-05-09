import React, { useEffect, useState, useRef, useCallback } from "react";
import { masters } from "../services/api";
import { REGIONS } from "../utils/regions";

const PAGE_SIZE = 50;

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
        Jami: <strong>{total}</strong> ta usta · Sahifa <strong>{page}</strong> / <strong>{totalPages}</strong>
      </span>
      <div style={{ display: "flex", gap: 4 }}>
        <button className="btn btn-secondary btn-sm" onClick={() => onChange(1)} disabled={page === 1}>«</button>
        <button className="btn btn-secondary btn-sm" onClick={() => onChange(page - 1)} disabled={page === 1}>‹</button>
        {pages.map((p) => (
          <button key={p} className={`btn btn-sm ${p === page ? "btn-primary" : "btn-secondary"}`} onClick={() => onChange(p)}>{p}</button>
        ))}
        <button className="btn btn-secondary btn-sm" onClick={() => onChange(page + 1)} disabled={page === totalPages}>›</button>
        <button className="btn btn-secondary btn-sm" onClick={() => onChange(totalPages)} disabled={page === totalPages}>»</button>
      </div>
    </div>
  );
}

export default function Masters() {
  const [list, setList]         = useState([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch]           = useState("");
  const [region, setRegion]           = useState("");
  const [modal, setModal]             = useState(null);
  const searchTimer = useRef(null);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  useEffect(() => { load(); }, [page, region, search]);
  useEffect(() => { setPage(1); }, [region, search]);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = { page, limit: PAGE_SIZE };
      if (region) params.region = region;
      if (search) params.search = search;
      const res = await masters.getAll(params);
      setList(res.data.data || []);
      setTotal(res.data.total || 0);
    } catch { setError("Ma'lumotlarni yuklashda xatolik"); }
    setLoading(false);
  }, [page, region, search]);

  const handleSearchInput = (val) => {
    setSearchInput(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setSearch(val), 450);
  };

  const openHistory = async (master) => {
    setModal({ master, history: null, loading: true });
    try {
      const res = await masters.getHistory(master.telegramId);
      setModal({ master, history: res.data, loading: false });
    } catch { setModal((m) => ({ ...m, loading: false, error: true })); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">👨‍🔧 Ustalar</h1>
          <p className="page-subtitle">Jami: {total} ta usta</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={load}>🔄 Yangilash</button>
      </div>

      <div className="filters-bar">
        <input className="input" placeholder="🔍 Ism, telefon, kasb, ID..."
          value={searchInput} onChange={(e) => handleSearchInput(e.target.value)} style={{ width: 280 }} />
        <select className="input" value={region} onChange={(e) => setRegion(e.target.value)} style={{ width: 200 }}>
          <option value="">Barcha viloyatlar</option>
          {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="table-container">
        {loading ? (
          <div className="loading-center">⏳ Yuklanmoqda...</div>
        ) : list.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">👨‍🔧</div><p>Ustalar topilmadi</p></div>
        ) : (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th><th>Ism</th><th>Telefon</th><th>Viloyat</th>
                  <th>Kasb</th><th>Ballar</th><th>Telegram ID</th>
                  <th>Tasdiqlangan</th><th>Amallar</th>
                </tr>
              </thead>
              <tbody>
                {list.map((m, i) => (
                  <tr key={m.telegramId}>
                    <td className="text-muted">{(page - 1) * PAGE_SIZE + i + 1}</td>
                    <td><strong>{m.name}</strong></td>
                    <td className="monospace">{m.phone}</td>
                    <td>{m.region}</td>
                    <td>{m.profession || <span className="text-muted">—</span>}</td>
                    <td><span className="badge badge-primary">⭐ {m.totalPoints || 0}</span></td>
                    <td className="monospace text-muted" style={{ fontSize: 12 }}>{m.telegramId}</td>
                    <td className="text-muted" style={{ fontSize: 12 }}>
                      {m.masterApprovedAt ? new Date(m.masterApprovedAt).toLocaleDateString("uz-UZ") : "—"}
                    </td>
                    <td>
                      <button className="btn btn-sm btn-primary" onClick={() => openHistory(m)}>📋 Kodlar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={page} totalPages={totalPages} total={total} onChange={setPage} />
          </>
        )}
      </div>

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
                      <thead><tr><th>#</th><th>Kod</th><th>Ball</th><th>Sana</th></tr></thead>
                      <tbody>
                        {modal.history.data.map((u, i) => (
                          <tr key={u._id}>
                            <td className="text-muted">{i + 1}</td>
                            <td className="monospace fw-bold">{u.promoCode}</td>
                            <td className="text-success fw-bold">+{u.points}</td>
                            <td className="text-muted" style={{ fontSize: 12 }}>
                              {new Date(u.usedAt).toLocaleString("uz-UZ", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}
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
