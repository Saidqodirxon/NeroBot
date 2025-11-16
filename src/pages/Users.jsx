import React, { useEffect, useState } from "react";
import { api } from "../services/api";
import { REGIONS } from "../utils/regions";

export default function Users() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [regionFilter, setRegionFilter] = useState("");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = regionFilter ? { region: regionFilter } : {};
      const res = await api.get("/users", { params });
      setList(res.data.data || []);
    } catch (err) {
      console.error("Users load error:", err);
      setError("Ma'lumotlarni yuklashda xatolik yuz berdi");
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [regionFilter]);

  const exportUsers = () => {
    const token = localStorage.getItem("nerobot_token");
    const baseUrl =
      import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1";
    const url = regionFilter
      ? `${baseUrl}/export/users?region=${regionFilter}`
      : `${baseUrl}/export/users`;

    // JWT token'ni header'da yuborish
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

  return (
    <div>
      <h3>Foydalanuvchilar</h3>

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
            <strong>Natija:</strong> {list.length} ta foydalanuvchi
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
              <th>Ism</th>
              <th>Telefon</th>
              <th>Viloyat</th>
              <th>Username</th>
              <th>Promo Kod</th>
              <th>Ro'yxatdan o'tgan</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: 24 }}>
                  Foydalanuvchilar topilmadi
                </td>
              </tr>
            ) : (
              list.map((u) => (
                <tr key={u._id}>
                  <td>{u.name}</td>
                  <td>{u.phone}</td>
                  <td>{u.region || "-"}</td>
                  <td>{u.username || "-"}</td>
                  <td style={{ fontFamily: "monospace", fontWeight: "bold" }}>
                    {u.usedPromoCode}
                  </td>
                  <td>
                    {u.registeredAt
                      ? new Date(u.registeredAt).toLocaleString("uz-UZ")
                      : "-"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
