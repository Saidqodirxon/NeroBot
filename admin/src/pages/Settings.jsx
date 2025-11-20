import React, { useState, useEffect } from "react";
import api from "../services/api";

export default function Settings() {
  const [loading, setLoading] = useState(false);
  const [currentAdmin, setCurrentAdmin] = useState(null);
  const [formData, setFormData] = useState({
    username: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await api.get("/auth/profile");
      setCurrentAdmin(response.data.data);
      setFormData((prev) => ({
        ...prev,
        username: response.data.data.username,
      }));
    } catch (error) {
      console.error("Profile yuklashda xatolik:", error);
      setMessage({
        type: "error",
        text: "Profil ma'lumotlarini yuklashda xatolik",
      });
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setMessage({ type: "", text: "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    // Validation
    if (!formData.username.trim()) {
      setMessage({ type: "error", text: "Username kiritilmagan" });
      setLoading(false);
      return;
    }

    if (formData.newPassword || formData.confirmPassword) {
      if (!formData.currentPassword) {
        setMessage({
          type: "error",
          text: "Yangi parol o'rnatish uchun joriy parolni kiriting",
        });
        setLoading(false);
        return;
      }

      if (formData.newPassword.length < 6) {
        setMessage({
          type: "error",
          text: "Yangi parol kamida 6 ta belgidan iborat bo'lishi kerak",
        });
        setLoading(false);
        return;
      }

      if (formData.newPassword !== formData.confirmPassword) {
        setMessage({ type: "error", text: "Parollar mos kelmayapti" });
        setLoading(false);
        return;
      }
    }

    try {
      const updateData = {
        username: formData.username,
      };

      if (formData.newPassword) {
        updateData.password = formData.newPassword;
      }

      console.log("Sending update request:", updateData);

      const response = await api.patch("/auth/profile", updateData);

      console.log("Update response:", response.data);

      if (response.data.success) {
        setMessage({
          type: "success",
          text: "Ma'lumotlar muvaffaqiyatli yangilandi!",
        });
        setFormData({
          ...formData,
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
        fetchProfile();
      }
    } catch (error) {
      console.error("Yangilashda xatolik:", error);
      console.error("Error response:", error.response);
      const errorMsg =
        error.response?.data?.message ||
        error.message ||
        "Yangilashda xatolik yuz berdi";
      setMessage({
        type: "error",
        text: errorMsg,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>⚙️ Sozlamalar</h2>

      {currentAdmin && (
        <div
          style={{
            marginBottom: 24,
            padding: 16,
            backgroundColor: "#f5f5f5",
            borderRadius: 8,
          }}
        >
          <p style={{ margin: 0, marginBottom: 8 }}>
            <strong>Telegram ID:</strong> {currentAdmin.telegramId}
          </p>
          <p style={{ margin: 0 }}>
            <strong>Rol:</strong>{" "}
            {currentAdmin.role === "admin" ? "Admin" : "Moderator"}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>
            Username <span style={{ color: "red" }}>*</span>
          </label>
          <input
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            placeholder="Username kiriting"
            required
          />
        </div>

        <hr
          style={{
            margin: "24px 0",
            border: "none",
            borderTop: "1px solid #e0e0e0",
          }}
        />

        <h3 style={{ marginBottom: 16 }}>Parolni o'zgartirish</h3>
        <p style={{ color: "#666", fontSize: 14, marginBottom: 16 }}>
          Parolni o'zgartirmoqchi bo'lsangiz, quyidagi maydonlarni to'ldiring
        </p>

        <div className="form-group">
          <label>Joriy parol</label>
          <input
            type="password"
            name="currentPassword"
            value={formData.currentPassword}
            onChange={handleChange}
            placeholder="Joriy parolingizni kiriting"
          />
        </div>

        <div className="form-group">
          <label>Yangi parol</label>
          <input
            type="password"
            name="newPassword"
            value={formData.newPassword}
            onChange={handleChange}
            placeholder="Yangi parol kiriting (kamida 6 ta belgi)"
          />
        </div>

        <div className="form-group">
          <label>Yangi parolni tasdiqlash</label>
          <input
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder="Yangi parolni qayta kiriting"
          />
        </div>

        {message.text && (
          <div
            style={{
              padding: 12,
              marginBottom: 16,
              borderRadius: 4,
              backgroundColor:
                message.type === "success" ? "#d4edda" : "#f8d7da",
              color: message.type === "success" ? "#155724" : "#721c24",
              border: `1px solid ${
                message.type === "success" ? "#c3e6cb" : "#f5c6cb"
              }`,
            }}
          >
            {message.text}
          </div>
        )}

        <button
          type="submit"
          className="button button-primary"
          disabled={loading}
        >
          {loading ? "Yuklanmoqda..." : "Saqlash"}
        </button>
      </form>
    </div>
  );
}
