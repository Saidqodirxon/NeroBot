import React, { useEffect, useState } from "react";
import { promoCodes, seasons } from "../services/api";

export default function PromoCodes() {
  // Create state
  const [list, setList] = useState([]);
  const [codes, setCodes] = useState("");
  const [description, setDescription] = useState("");
  const [points, setPoints] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");
  const [seasonsList, setSeasonsList] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState("");
  const [seasonFilter, setSeasonFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Edit state
  const [editingCode, setEditingCode] = useState(null);
  const [editDescription, setEditDescription] = useState("");
  const [editPoints, setEditPoints] = useState("");

  // Bulk update state
  const [bulkPoints, setBulkPoints] = useState("");
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  const limit = 50;

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        limit,
        skip: (page - 1) * limit,
      };
      if (filter !== "all") {
        params.used = filter === "used" ? "true" : "false";
      }
      if (seasonFilter !== "all") {
        params.seasonId = seasonFilter;
      }
      if (searchQuery) {
        params.search = searchQuery;
      }

      const res = await promoCodes.getAll(params);
      setList(res.data.data || []);
      setTotalPages(Math.ceil((res.data.total || 0) / limit));
    } catch (err) {
      console.error("PromoCodes load error:", err);
      setError("Ma'lumotlarni yuklashda xatolik yuz berdi");
    }
    setLoading(false);
  };

  const loadSeasons = async () => {
    try {
      const res = await seasons.getAll();
      setSeasonsList(res.data.data || []);
    } catch (err) {
      console.error("Mavsumlarni yuklab bo'lmadi:", err);
    }
  };

  useEffect(() => {
    loadSeasons();
  }, []);

  // When filters change, reset page to 1. Load will happen due to page or filter change in next effect.
  useEffect(() => {
    setPage(1);
  }, [filter, seasonFilter]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filter, seasonFilter]); // searchQuery is removed, only manual search

  const handleSearch = () => {
    setPage(1);
    load(); // Explicitly call load
  };

  const create = async () => {
    if (!codes.trim()) {
      alert("Iltimos, kod(lar) kiriting");
      return;
    }

    if (!selectedSeason) {
      alert("Iltimos, mavsumni tanlang");
      return;
    }

    try {
      const codeArray = codes
        .split("\n")
        .map((c) => c.trim())
        .filter(Boolean);

      await promoCodes.create({
        codes: codeArray,
        description,
        seasonId: selectedSeason,
        points: points ? Number(points) : 0,
      });
      setCodes("");
      setDescription("");
      setPoints("");
      setSelectedSeason("");
      load();
      alert("Kodlar qo'shildi!");
    } catch (err) {
      alert(err.response?.data?.message || "Xato");
    }
  };

  const startEdit = (code) => {
    setEditingCode(code.code);
    setEditDescription(code.description || "");
    setEditPoints(code.points || 0);
  };

  const cancelEdit = () => {
    setEditingCode(null);
    setEditDescription("");
    setEditPoints("");
  };

  const saveEdit = async () => {
    try {
      await promoCodes.update(editingCode, {
        description: editDescription,
        points: Number(editPoints) || 0,
      });
      setEditingCode(null);
      load(); // Reload to reflect changes (points, user points etc)
    } catch (err) {
      alert(err.response?.data?.message || "Tahrirlashda xatolik");
    }
  };

  const handleBulkUpdate = async () => {
    if (!bulkPoints) {
      alert("Iltimos, ballni kiriting");
      return;
    }

    // Count approximation from total (if filter is applied, total is correct)
    const countText = totalPages * limit;

    if (!confirm(
      `Diqqat! Siz filtrlangan BARCHA kodlarning ballini ${bulkPoints} ga o'zgartirmoqchisiz.\n\n` +
      `Bu jarayon biroz vaqt olishi mumkin. Sahifani yopmang.\n\n` +
      `Davom etasizmi?`
    )) {
      return;
    }

    setIsBulkUpdating(true);
    try {
      const clientFilter = {
        used: filter,
        seasonId: seasonFilter,
        search: searchQuery
      };

      const res = await promoCodes.bulkUpdate({
        filter: clientFilter,
        points: bulkPoints
      });

      alert(res.data.message);
      setBulkPoints("");
      load();
    } catch (err) {
      console.error("Bulk update error:", err);
      // Show more detailed error if checking logs or response
      alert(err.response?.data?.message || "Ommaviy yangilashda xatolik yuz berdi. Iltimos qaytadan urinib ko'ring.");
    }
    setIsBulkUpdating(false);
  };

  const deleteCode = async (code) => {
    if (!confirm(`"${code}" kodni o'chirishga aminmisiz?`)) return;

    try {
      await promoCodes.delete(code);
      load();
    } catch (err) {
      alert(err.response?.data?.message || "Xato");
    }
  };

  const exportCodes = () => {
    const token = localStorage.getItem("nerobot_token");
    const baseUrl =
      import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1";
    const url =
      filter !== "all"
        ? `${baseUrl}/export/codes?used=${filter === "used" ? "true" : "false"}`
        : `${baseUrl}/export/codes`;

    // JWT token'ni header'da yuborish uchun fetch ishlatamiz
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
        a.download = "promocodes.xlsx";
        a.click();
      })
      .catch((err) => alert("Xatolik: " + err.message));
  };

  return (
    <div>
      {/* Loading Overlay */}
      {isBulkUpdating && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          color: 'white'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>⏳</div>
          <h2 style={{ marginBottom: '10px' }}>Ommaviy Yangilash Bajarilmoqda...</h2>
          <p>Iltimos, sahifani yopmang va kuting.</p>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2>Promo Kodlar</h2>
        <div style={{ display: "flex", gap: 10, alignItems: "center", background: "#f5f5f5", padding: "8px", borderRadius: "8px" }}>
          <span style={{ fontWeight: 'bold', fontSize: '14px' }}>Ommaviy Ball:</span>
          <input
            type="number"
            placeholder="Ball..."
            className="input"
            value={bulkPoints}
            onChange={e => setBulkPoints(e.target.value)}
            style={{ width: "80px" }}
          />
          <button
            className="button"
            disabled={isBulkUpdating || !bulkPoints}
            onClick={handleBulkUpdate}
            style={{ background: "#ff9800", fontSize: '13px' }}
          >
            Yangilash (Filtrlanganlar)
          </button>
        </div>
      </div>

      {/* Add codes form */}
      <div
        style={{
          marginBottom: 24,
          padding: 16,
          background: "#f5f5f5",
          borderRadius: 8,
        }}
      >
        <h4 style={{ marginTop: 0 }}>Yangi kodlar qo'shish</h4>

        <select
          className="input"
          value={selectedSeason}
          onChange={(e) => setSelectedSeason(e.target.value)}
          style={{ width: "100%", marginBottom: 8 }}
        >
          <option value="">Mavsumni tanlang *</option>
          {seasonsList.map((s) => (
            <option key={s._id} value={s._id}>
              {s.name} {s.isActive ? "(Faol)" : ""}
            </option>
          ))}
        </select>

        <textarea
          className="input"
          placeholder="Kodlarni har birini yangi qatorga yozing&#10;Masalan:&#10;ABC123&#10;XYZ789&#10;TEST456"
          value={codes}
          onChange={(e) => setCodes(e.target.value)}
          rows={5}
          style={{ width: "100%", fontFamily: "monospace" }}
        />
        <input
          className="input"
          placeholder="Tavsif (ixtiyoriy)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={{ marginTop: 8, width: "100%" }}
        />
        <input
          type="number"
          className="input"
          placeholder="Ball (misol: 10)..."
          value={points}
          onChange={(e) => setPoints(e.target.value)}
          style={{ marginTop: 8, width: "100%" }}
        />
        <button className="button" onClick={create} style={{ marginTop: 8 }}>
          Qo'shish
        </button>
      </div>

      {/* Filter and export */}
      <div
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 12,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="text"
            className="input"
            placeholder="🔍 Kod qidirish..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            style={{ width: 200, fontFamily: "monospace" }}
          />
          <button className="button" onClick={handleSearch} style={{ padding: "8px 12px" }}>
            Qidirish
          </button>
        </div>

        <select
          className="input"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ width: 180 }}
        >
          <option value="all">Barcha kodlar</option>
          <option value="used">Ishlatilgan</option>
          <option value="unused">Ishlatilmagan</option>
        </select>

        <select
          className="input"
          value={seasonFilter}
          onChange={(e) => setSeasonFilter(e.target.value)}
          style={{ width: 200 }}
        >
          <option value="all">Barcha mavsumlar</option>
          {seasonsList.map((s) => (
            <option key={s._id} value={s._id}>
              {s.name}
            </option>
          ))}
        </select>

        <button className="button" onClick={exportCodes}>
          📥 Excel yuklab olish
        </button>
      </div>

      {/* Codes table */}
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
            background: "#ffebee",
            borderRadius: 8,
          }}
        >
          ❌ {error}
        </div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Kod</th>
              <th>Mavsum</th>
              <th>Tavsif</th>
              <th>Ball</th>
              <th>Holat</th>
              <th>Ishlatilgan sana</th>
              <th>Foydalanuvchi</th>
              <th>Telefon</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: "center", padding: 24 }}>
                  Kodlar topilmadi
                </td>
              </tr>
            ) : (
              list.map((code) => (
                <tr key={code._id}>
                  <td style={{ fontFamily: "monospace", fontWeight: "bold" }}>
                    {code.code}
                  </td>
                  <td>{code.seasonId?.name || "-"}</td>
                  <td>
                    {editingCode === code.code ? (
                      <input
                        className="input"
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        style={{ padding: "4px", width: "100%" }}
                      />
                    ) : (
                      code.description || "-"
                    )}
                  </td>
                  <td>
                    {editingCode === code.code ? (
                      <input
                        type="number"
                        className="input"
                        value={editPoints}
                        onChange={(e) => setEditPoints(e.target.value)}
                        style={{ padding: "4px", width: "60px" }}
                      />
                    ) : (
                      code.points || 0
                    )}
                  </td>
                  <td>
                    <span
                      style={{
                        padding: "4px 8px",
                        borderRadius: 4,
                        background: code.isUsed ? "#e8f5e9" : "#fff3e0",
                        color: code.isUsed ? "#2e7d32" : "#e65100",
                        fontSize: 12,
                        fontWeight: 500,
                      }}
                    >
                      {code.isUsed ? "✓ Ishlatilgan" : "⏳ Ishlatilmagan"}
                    </span>
                  </td>
                  <td>
                    {code.usedAt
                      ? new Date(code.usedAt).toLocaleString("uz-UZ")
                      : "-"}
                  </td>
                  <td>{code.usedByName || "-"}</td>
                  <td>{code.usedByPhone || "-"}</td>
                  <td>
                    <div style={{ display: "flex", gap: 4 }}>
                      {editingCode === code.code ? (
                        <>
                          <button
                            className="button"
                            onClick={saveEdit}
                            style={{
                              padding: "4px 8px",
                              fontSize: 12,
                              background: "#4caf50",
                            }}
                          >
                            Saqlash
                          </button>
                          <button
                            className="button"
                            onClick={cancelEdit}
                            style={{
                              padding: "4px 8px",
                              fontSize: 12,
                              background: "#9e9e9e",
                            }}
                          >
                            Bekor
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="button"
                            onClick={() => startEdit(code)}
                            style={{
                              padding: "4px 8px",
                              fontSize: 12,
                              background: "#2196f3",
                            }}
                          >
                            Tahrir
                          </button>
                          <button
                            className="button"
                            onClick={() => deleteCode(code.code)}
                            style={{
                              background: "#f44336",
                              padding: "4px 8px",
                              fontSize: 12,
                            }}
                          >
                            O'chirish
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}

      {totalPages > 1 && (
        <div
          style={{
            marginTop: 24,
            display: "flex",
            justifyContent: "center",
            gap: 8,
            alignItems: "center",
          }}
        >
          <button
            className="button"
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            style={{ opacity: page === 1 ? 0.5 : 1 }}
          >
            Orqaga
          </button>
          <span style={{ fontSize: 14, fontWeight: 500 }}>
            Sahifa {page} / {totalPages}
          </span>
          <button
            className="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            style={{ opacity: page >= totalPages ? 0.5 : 1 }}
          >
            Oldinga
          </button>
        </div>
      )}
    </div>
  );
}
