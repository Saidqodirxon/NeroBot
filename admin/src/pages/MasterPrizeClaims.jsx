import React, { useEffect, useState } from "react";
import { masterPrizeClaims } from "../services/api";

const STATUS = {
  pending: { label: "Kutayotgan", cls: "badge-warning", icon: "⏳" },
  given:   { label: "Berilgan",   cls: "badge-success", icon: "🎁" },
};

const FILTERS = [
  { value: "pending", label: "⏳ Kutayotgan" },
  { value: "given",   label: "🎁 Berilgan" },
  { value: "all",     label: "📋 Barchasi" },
];

export default function MasterPrizeClaims() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [error, setError] = useState(null);

  useEffect(() => { load(); }, [statusFilter]);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const res = await masterPrizeClaims.getAll({ status: statusFilter });
      setList(res.data.data || []);
    } catch { setError("Ma'lumotlarni yuklashda xatolik"); }
    setLoading(false);
  };

  const handleGive = async (claim) => {
    if (!window.confirm(
      `"${claim.prizeName}" sovg'asini berish va\n${claim.requiredPoints} ball ayirishni tasdiqlaysizmi?\n\nFoydalanuvchi: ${claim.userName}`
    )) return;
    try { await masterPrizeClaims.give(claim._id); load(); }
    catch (err) { alert("Xatolik: " + (err.response?.data?.message || err.message)); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">⭐ Sovg'a Talablari</h1>
          <p className="page-subtitle">Ustalarning sovg'a so'rovlarini boshqaring</p>
        </div>
        <button className="button btn-secondary btn-sm" onClick={load}>🔄 Yangilash</button>
      </div>

      <div className="tabs">
        {FILTERS.map((f) => (
          <button key={f.value} className={`tab-btn ${statusFilter === f.value ? "active" : ""}`}
            onClick={() => setStatusFilter(f.value)}>{f.label}</button>
        ))}
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="table-container">
        {loading ? (
          <div className="loading-center">⏳ Yuklanmoqda...</div>
        ) : list.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">⭐</div><p>Talablar yo'q</p></div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th><th>Ism</th><th>Telefon</th>
                <th>Sovg'a</th><th>Ball</th><th>Status</th>
                <th>Sana</th><th>Amallar</th>
              </tr>
            </thead>
            <tbody>
              {list.map((claim, i) => {
                const st = STATUS[claim.status] || STATUS.pending;
                return (
                  <tr key={claim._id}>
                    <td className="text-muted">{i + 1}</td>
                    <td><strong>{claim.userName || "—"}</strong></td>
                    <td className="monospace">{claim.userPhone || "—"}</td>
                    <td>{claim.prizeName}</td>
                    <td><span className="badge badge-warning">⭐ {claim.requiredPoints}</span></td>
                    <td><span className={`badge ${st.cls}`}>{st.icon} {st.label}</span></td>
                    <td className="text-muted" style={{ fontSize: 12 }}>
                      {new Date(claim.createdAt).toLocaleString("uz-UZ", {
                        day: "2-digit", month: "2-digit", year: "numeric",
                        hour: "2-digit", minute: "2-digit"
                      })}
                    </td>
                    <td>
                      {claim.status === "pending" ? (
                        <button className="button btn-success btn-sm" onClick={() => handleGive(claim)}>
                          🎁 Berish & Ball ayirish
                        </button>
                      ) : (
                        <span className="text-muted" style={{ fontSize: 12 }}>
                          {claim.givenBy || "—"} · {claim.givenAt ? new Date(claim.givenAt).toLocaleDateString("uz-UZ") : ""}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
