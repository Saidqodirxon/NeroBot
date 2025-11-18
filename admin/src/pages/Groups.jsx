import React, { useEffect, useState } from "react";
import { promoCodes, seasons } from "../services/api";

export default function PromoCodes() {
  const [list, setList] = useState([]);
  const [codes, setCodes] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all"); // all, used, unused
  const [seasonsList, setSeasonsList] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState("");
  const [seasonFilter, setSeasonFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (filter !== "all") {
        params.used = filter === "used" ? "true" : "false";
      }
      if (seasonFilter !== "all") {
        params.seasonId = seasonFilter;
      }
      const res = await promoCodes.getAll(params);
      setList(res.data.data || []);
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
    load();
  }, [filter, seasonFilter]);

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
      });
      setCodes("");
      setDescription("");
      setSelectedSeason("");
      load();
      alert("Kodlar qo'shildi!");
    } catch (err) {
      alert(err.response?.data?.message || "Xato");
    }
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
      <h3>Promo Kodlar</h3>

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
        <input
          type="text"
          className="input"
          placeholder="🔍 Kod qidirish..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ width: 200, fontFamily: "monospace" }}
        />

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
              <th>Holat</th>
              <th>Ishlatilgan sana</th>
              <th>Foydalanuvchi</th>
              <th>Telefon</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              const filteredList = searchQuery
                ? list.filter((code) =>
                    code.code.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                : list;

              return filteredList.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: 24 }}>
                    {searchQuery
                      ? "Qidiruv bo'yicha kod topilmadi"
                      : "Kodlar topilmadi"}
                  </td>
                </tr>
              ) : (
                filteredList.map((code) => (
                  <tr key={code._id}>
                    <td style={{ fontFamily: "monospace", fontWeight: "bold" }}>
                      {code.code}
                    </td>
                    <td>{code.seasonId?.name || "-"}</td>
                    <td>{code.description || "-"}</td>
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
                      {!code.isUsed && (
                        <button
                          className="button"
                          onClick={() => deleteCode(code.code)}
                          style={{
                            background: "#f44336",
                            padding: "4px 12px",
                            fontSize: 13,
                          }}
                        >
                          O'chirish
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              );
            })()}
          </tbody>
        </table>
      )}
    </div>
  );
}
