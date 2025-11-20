import React, { useEffect, useState } from "react";
import { seasons } from "../services/api";

export default function Seasons() {
  const [seasonsList, setSeasonsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSeason, setEditingSeason] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    isActive: true,
  });

  useEffect(() => {
    loadSeasons();
  }, []);

  const loadSeasons = async () => {
    try {
      setLoading(true);
      const res = await seasons.getAll();
      setSeasonsList(res.data.data || []);
    } catch (err) {
      alert("Xatolik: " + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingSeason) {
        await seasons.update(editingSeason._id, formData);
        alert("Mavsum yangilandi!");
      } else {
        await seasons.create(formData);
        alert("Mavsum yaratildi!");
      }

      setShowModal(false);
      setEditingSeason(null);
      setFormData({
        name: "",
        description: "",
        isActive: true,
      });
      loadSeasons();
    } catch (err) {
      alert("Xatolik: " + (err.response?.data?.message || err.message));
    }
  };

  const handleEdit = (season) => {
    setEditingSeason(season);
    setFormData({
      name: season.name,
      description: season.description || "",
      isActive: season.isActive,
    });
    setShowModal(true);
  };

  const handleDelete = async (season) => {
    if (
      !confirm(
        `"${season.name}" mavsumni o'chirmoqchimisiz?\n\n⚠️ OGOHLANTIRISH: Bu mavsum bilan bog'liq BARCHA promo kodlar va usage recordlar ham o'chadi!\n\nBu qaytarilmaydi!`
      )
    ) {
      return;
    }

    if (
      !confirm(
        `Yana bir bor tasdiqlang: "${season.name}" va barcha ma'lumotlarni o'chirish`
      )
    ) {
      return;
    }

    try {
      await seasons.delete(season._id);
      alert("Mavsum va barcha bog'liq ma'lumotlar o'chirildi!");
      loadSeasons();
    } catch (err) {
      alert("Xatolik: " + (err.response?.data?.message || err.message));
    }
  };

  const openNewModal = () => {
    setEditingSeason(null);
    setFormData({
      name: "",
      description: "",
      isActive: true,
    });
    setShowModal(true);
  };

  if (loading) return <div>Yuklanmoqda...</div>;

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <h3 style={{ margin: 0 }}>🎭 Mavsumlar</h3>
        <button className="button" onClick={openNewModal}>
          + Yangi Mavsum
        </button>
      </div>

      {seasonsList.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: "#999" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎭</div>
          <div>Hali mavsumlar yo'q</div>
          <div style={{ fontSize: 14, marginTop: 8 }}>
            Birinchi mavsumni yaratish uchun yuqoridagi tugmani bosing
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {seasonsList.map((season) => (
            <div
              key={season._id}
              style={{
                padding: 20,
                background: season.isActive ? "#e8f5e9" : "#f5f5f5",
                borderRadius: 8,
                border: season.isActive
                  ? "2px solid #4caf50"
                  : "1px solid #ddd",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <div style={{ flex: 1 }}>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <h4 style={{ margin: 0, fontSize: 18 }}>{season.name}</h4>
                    {season.isActive && (
                      <span
                        style={{
                          padding: "2px 8px",
                          background: "#4caf50",
                          color: "white",
                          borderRadius: 4,
                          fontSize: 12,
                          fontWeight: "bold",
                        }}
                      >
                        AKTIV
                      </span>
                    )}
                  </div>
                  {season.description && (
                    <div style={{ color: "#666", marginTop: 4, fontSize: 14 }}>
                      {season.description}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className="button"
                    onClick={() => handleEdit(season)}
                    style={{ background: "#2196F3" }}
                  >
                    ✏️ Tahrirlash
                  </button>
                  <button
                    className="button"
                    onClick={() => handleDelete(season)}
                    style={{ background: "#f44336" }}
                  >
                    🗑 O'chirish
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "white",
              padding: 24,
              borderRadius: 8,
              minWidth: 500,
              maxWidth: 700,
            }}
          >
            <h3 style={{ marginTop: 0 }}>
              {editingSeason ? "Mavsumni Tahrirlash" : "Yangi Mavsum"}
            </h3>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 12 }}>
                <label>Mavsum nomi</label>
                <input
                  type="text"
                  className="input"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Masalan: Yangi Yil 2025"
                  style={{ width: "100%", marginTop: 4 }}
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label>Tavsif</label>
                <textarea
                  className="input"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Mavsum haqida qisqacha ma'lumot"
                  rows={3}
                  style={{ width: "100%", marginTop: 4, fontFamily: "inherit" }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) =>
                      setFormData({ ...formData, isActive: e.target.checked })
                    }
                    style={{ width: 20, height: 20 }}
                  />
                  <span>Aktiv mavsum</span>
                </label>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button type="submit" className="button" style={{ flex: 1 }}>
                  {editingSeason ? "Saqlash" : "Yaratish"}
                </button>
                <button
                  type="button"
                  className="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingSeason(null);
                  }}
                  style={{ flex: 1, background: "#666" }}
                >
                  Bekor qilish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
