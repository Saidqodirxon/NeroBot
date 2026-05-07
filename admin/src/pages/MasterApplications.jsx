import React, { useEffect, useState } from "react";
import { masterApplications } from "../services/api";

const STATUS = {
  pending:  { label: "Kutayotgan", cls: "badge-warning",  icon: "⏳" },
  approved: { label: "Tasdiqlangan", cls: "badge-success", icon: "✅" },
  rejected: { label: "Rad etilgan",  cls: "badge-danger",  icon: "❌" },
};

const FILTERS = [
  { value: "pending",  label: "⏳ Kutayotgan" },
  { value: "approved", label: "✅ Tasdiqlangan" },
  { value: "rejected", label: "❌ Rad etilgan" },
  { value: "all",      label: "📋 Barchasi" },
];

export default function MasterApplications() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [error, setError] = useState(null);

  useEffect(() => { load(); }, [statusFilter]);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const res = await masterApplications.getAll({ status: statusFilter });
      setList(res.data.data || []);
    } catch { setError("Ma'lumotlarni yuklashda xatolik"); }
    setLoading(false);
  };

  const handleApprove = async (id) => {
    if (!window.confirm("Arizani tasdiqlashni xohlaysizmi?")) return;
    try { await masterApplications.approve(id); load(); }
    catch (err) { alert("Xatolik: " + (err.response?.data?.message || err.message)); }
  };

  const handleReject = async (id) => {
    const reason = window.prompt("Rad etish sababini kiriting:");
    if (reason === null) return;
    try { await masterApplications.reject(id, reason); load(); }
    catch (err) { alert("Xatolik: " + (err.response?.data?.message || err.message)); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">📋 Usta Arizalari</h1>
          <p className="page-subtitle">Foydalanuvchilarning usta bo'lish arizalarini boshqaring</p>
        </div>
        <button className="button btn-secondary btn-sm" onClick={load}>🔄 Yangilash</button>
      </div>

      {/* Filtrlar */}
      <div className="tabs">
        {FILTERS.map((f) => (
          <button key={f.value} className={`tab-btn ${statusFilter === f.value ? "active" : ""}`}
            onClick={() => setStatusFilter(f.value)}>
            {f.label}
          </button>
        ))}
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="table-container">
        {loading ? (
          <div className="loading-center">⏳ Yuklanmoqda...</div>
        ) : list.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">📋</div><p>Arizalar yo'q</p></div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Ism</th>
                <th>Telefon</th>
                <th>Kasb</th>
                <th>Telegram ID</th>
                <th>Status</th>
                <th>Ariza sanasi</th>
                <th>Amallar</th>
              </tr>
            </thead>
            <tbody>
              {list.map((app, i) => {
                const st = STATUS[app.status] || STATUS.pending;
                return (
                  <tr key={app._id}>
                    <td className="text-muted">{i + 1}</td>
                    <td><strong>{app.name}</strong></td>
                    <td className="monospace">{app.phone}</td>
                    <td>{app.profession}</td>
                    <td className="monospace text-muted">{app.telegramId}</td>
                    <td>
                      <span className={`badge ${st.cls}`}>{st.icon} {st.label}</span>
                    </td>
                    <td className="text-muted" style={{ fontSize: 12 }}>
                      {new Date(app.createdAt).toLocaleString("uz-UZ", {
                        day: "2-digit", month: "2-digit", year: "numeric",
                        hour: "2-digit", minute: "2-digit"
                      })}
                    </td>
                    <td>
                      {app.status === "pending" ? (
                        <div style={{ display: "flex", gap: 6 }}>
                          <button className="button btn-success btn-sm" onClick={() => handleApprove(app._id)}>✅ Tasdiqlash</button>
                          <button className="button btn-danger btn-sm" onClick={() => handleReject(app._id)}>❌ Rad</button>
                        </div>
                      ) : (
                        <span className="text-muted" style={{ fontSize: 12 }}>
                          {app.reviewedBy || "—"}
                          {app.rejectionReason && (
                            <span title={`Sabab: ${app.rejectionReason}`} style={{ cursor: "help", marginLeft: 4 }}>ℹ️</span>
                          )}
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
