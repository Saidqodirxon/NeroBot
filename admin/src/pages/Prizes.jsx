import React, { useEffect, useState } from "react";
import { api, seasons } from "../services/api";

export default function Prizes() {
  const [prizesList, setPrizesList] = useState([]);
  const [seasonsList, setSeasonsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPrize, setEditingPrize] = useState(null);
  const [seasonFilter, setSeasonFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    imageUrl: "",
    seasonId: "",
    isActive: true,
  });

  useEffect(() => {
    loadSeasons();
    loadPrizes();
  }, [seasonFilter]);

  const loadSeasons = async () => {
    try {
      const res = await seasons.getAll();
      setSeasonsList(res.data.data || []);
    } catch (err) {
      console.error("Mavsumlarni yuklab bo'lmadi:", err);
    }
  };

  const loadPrizes = async () => {
    try {
      setLoading(true);
      const params = seasonFilter !== "all" ? { seasonId: seasonFilter } : {};
      const res = await api.get("/prizes", { params });
      setPrizesList(res.data.data || []);
    } catch (err) {
      alert("Xatolik: " + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const validTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
    ];
    if (!validTypes.includes(file.type)) {
      alert("Faqat rasm fayllari (JPEG, PNG, GIF, WEBP) qabul qilinadi");
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("Rasm hajmi 5MB dan oshmasligi kerak");
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("image", file);

      const token = localStorage.getItem("nerobot_token");
      const baseUrl =
        import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1";

      const response = await fetch(`${baseUrl}/prizes/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        setFormData((prev) => ({
          ...prev,
          imageUrl: result.data.fullUrl,
        }));
        alert("Rasm muvaffaqiyatli yuklandi!");
      } else {
        alert("Xatolik: " + result.message);
      }
    } catch (err) {
      console.error("Upload error:", err);
      alert("Rasm yuklashda xatolik: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.imageUrl || !formData.seasonId) {
      alert("Nomi, rasm va mavsum majburiy!");
      return;
    }

    try {
      if (editingPrize) {
        await api.put(`/prizes/${editingPrize._id}`, formData);
        alert("Sovg'a yangilandi!");
      } else {
        await api.post("/prizes", formData);
        alert("Sovg'a yaratildi!");
      }

      setShowModal(false);
      setEditingPrize(null);
      setFormData({
        name: "",
        description: "",
        imageUrl: "",
        seasonId: "",
        isActive: true,
      });
      loadPrizes();
    } catch (err) {
      alert("Xatolik: " + (err.response?.data?.message || err.message));
    }
  };

  const handleEdit = (prize) => {
    setEditingPrize(prize);
    setFormData({
      name: prize.name,
      description: prize.description || "",
      imageUrl: prize.imageUrl,
      seasonId: prize.seasonId?._id || "",
      isActive: prize.isActive,
    });
    setShowModal(true);
  };

  const handleDelete = async (prize) => {
    if (!confirm(`"${prize.name}" sovg'asini o'chirmoqchimisiz?`)) {
      return;
    }

    try {
      await api.delete(`/prizes/${prize._id}`);
      alert("Sovg'a o'chirildi!");
      loadPrizes();
    } catch (err) {
      alert("Xatolik: " + (err.response?.data?.message || err.message));
    }
  };

  const openNewModal = () => {
    setEditingPrize(null);
    setFormData({
      name: "",
      description: "",
      imageUrl: "",
      seasonId: "",
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
        <h3 style={{ margin: 0 }}>🎁 Sovg'alar</h3>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <input
            type="text"
            className="input"
            placeholder="🔍 Qidirish (nom bo'yicha)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: 250 }}
          />
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
          <button className="button" onClick={openNewModal}>
            + Yangi Sovg'a
          </button>
        </div>
      </div>

      {prizesList.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: "#999" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎁</div>
          <div>Hali sovg'alar yo'q</div>
          <div style={{ fontSize: 14, marginTop: 8 }}>
            Birinchi sovg'ani yaratish uchun yuqoridagi tugmani bosing
          </div>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: 16,
          }}
        >
          {prizesList
            .filter((prize) => {
              const searchLower = searchQuery.toLowerCase();
              return (
                prize.name.toLowerCase().includes(searchLower) ||
                (prize.description &&
                  prize.description.toLowerCase().includes(searchLower))
              );
            })
            .map((prize) => (
              <div
                key={prize._id}
                style={{
                  padding: 16,
                  background: prize.isActive ? "#fff" : "#f5f5f5",
                  borderRadius: 8,
                  border: prize.isActive
                    ? "1px solid #4caf50"
                    : "1px solid #ddd",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                }}
              >
                {prize.imageUrl && (
                  <div
                    style={{
                      marginBottom: 12,
                      height: 200,
                      borderRadius: 8,
                      overflow: "hidden",
                      background: "#f0f0f0",
                    }}
                  >
                    <img
                      src={prize.imageUrl}
                      alt={prize.name}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                      onError={(e) => {
                        e.target.style.display = "none";
                        e.target.parentElement.innerHTML =
                          '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#999">🖼 Rasm yuklanmadi</div>';
                      }}
                    />
                  </div>
                )}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 8,
                  }}
                >
                  <h4 style={{ margin: 0, fontSize: 16 }}>{prize.name}</h4>
                  {prize.isActive && (
                    <span
                      style={{
                        padding: "2px 6px",
                        background: "#4caf50",
                        color: "white",
                        borderRadius: 4,
                        fontSize: 10,
                        fontWeight: "bold",
                      }}
                    >
                      AKTIV
                    </span>
                  )}
                </div>
                {prize.description && (
                  <div style={{ color: "#666", fontSize: 13, marginBottom: 8 }}>
                    {prize.description}
                  </div>
                )}
                <div
                  style={{
                    fontSize: 12,
                    color: "#999",
                    marginBottom: 12,
                  }}
                >
                  🎭 {prize.seasonId?.name || "Mavsum ko'rsatilmagan"}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className="button"
                    onClick={() => handleEdit(prize)}
                    style={{
                      flex: 1,
                      background: "#2196F3",
                      padding: "6px 12px",
                      fontSize: 13,
                    }}
                  >
                    ✏️ Tahrirlash
                  </button>
                  <button
                    className="button"
                    onClick={() => handleDelete(prize)}
                    style={{
                      flex: 1,
                      background: "#f44336",
                      padding: "6px 12px",
                      fontSize: 13,
                    }}
                  >
                    🗑 O'chirish
                  </button>
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
              {editingPrize ? "Sovg'ani Tahrirlash" : "Yangi Sovg'a"}
            </h3>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 12 }}>
                <label>Sovg'a nomi *</label>
                <input
                  type="text"
                  className="input"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Masalan: iPhone 15 Pro"
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
                  placeholder="Sovg'a haqida qisqacha ma'lumot"
                  rows={3}
                  style={{ width: "100%", marginTop: 4, fontFamily: "inherit" }}
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label>Rasm *</label>
                <div style={{ marginTop: 4 }}>
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                    onChange={handleImageUpload}
                    disabled={uploading}
                    style={{ marginBottom: 8 }}
                  />
                  {uploading && (
                    <div style={{ color: "#ff9800", fontSize: 14 }}>
                      ⏳ Rasm yuklanmoqda...
                    </div>
                  )}
                  {formData.imageUrl && !uploading && (
                    <div
                      style={{
                        marginTop: 8,
                        padding: 8,
                        background: "#e8f5e9",
                        borderRadius: 4,
                        fontSize: 13,
                      }}
                    >
                      ✅ Rasm yuklandi
                    </div>
                  )}
                </div>
                {formData.imageUrl && (
                  <div
                    style={{
                      marginTop: 8,
                      height: 150,
                      borderRadius: 8,
                      overflow: "hidden",
                      background: "#f0f0f0",
                    }}
                  >
                    <img
                      src={formData.imageUrl}
                      alt="Preview"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                      }}
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                  </div>
                )}
              </div>

              <div style={{ marginBottom: 12 }}>
                <label>Mavsum *</label>
                <select
                  className="input"
                  value={formData.seasonId}
                  onChange={(e) =>
                    setFormData({ ...formData, seasonId: e.target.value })
                  }
                  style={{ width: "100%", marginTop: 4 }}
                >
                  <option value="">Mavsumni tanlang</option>
                  {seasonsList.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name}
                    </option>
                  ))}
                </select>
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
                  <span>Aktiv sovg'a</span>
                </label>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button type="submit" className="button" style={{ flex: 1 }}>
                  {editingPrize ? "Saqlash" : "Yaratish"}
                </button>
                <button
                  type="button"
                  className="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingPrize(null);
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
