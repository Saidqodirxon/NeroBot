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

    // Parol o'zgartirilayotgan bo'lsa validation
    if (formData.newPassword || formData.confirmPassword) {
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

      // Faqat yangi parol kiritilgan bo'lsa yuborish
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
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      <div
        style={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          padding: "32px 24px",
          borderRadius: 12,
          marginBottom: 32,
          color: "white",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        }}
      >
        <h2 style={{ margin: 0, fontSize: 28, fontWeight: 600 }}>
          ⚙️ Sozlamalar
        </h2>
        <p style={{ margin: "8px 0 0 0", opacity: 0.9, fontSize: 14 }}>
          Profilingizni boshqaring va xavfsizligingizni ta'minlang
        </p>
      </div>

      {currentAdmin && (
        <div
          style={{
            marginBottom: 32,
            padding: 24,
            background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
            borderRadius: 12,
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          }}
        >
          <h3
            style={{
              margin: "0 0 16px 0",
              fontSize: 18,
              color: "#2d3748",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            👤 Profil Ma'lumotlari
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 16,
            }}
          >
            <div
              style={{
                padding: 16,
                background: "white",
                borderRadius: 8,
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: "#718096",
                  marginBottom: 4,
                  fontWeight: 500,
                }}
              >
                🆔 Telegram ID
              </div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: "#2d3748",
                  fontFamily: "monospace",
                }}
              >
                {currentAdmin.telegramId}
              </div>
            </div>
            <div
              style={{
                padding: 16,
                background: "white",
                borderRadius: 8,
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: "#718096",
                  marginBottom: 4,
                  fontWeight: 500,
                }}
              >
                👔 Rol
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "#2d3748" }}>
                {currentAdmin.role === "admin" ? "🔑 Admin" : "⭐ Moderator"}
              </div>
            </div>
          </div>
        </div>
      )}

      <div
        style={{
          background: "white",
          padding: 32,
          borderRadius: 12,
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        }}
      >
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 32 }}>
            <h3
              style={{
                margin: "0 0 20px 0",
                fontSize: 20,
                color: "#2d3748",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              👤 Asosiy Ma'lumotlar
            </h3>
            <div className="form-group">
              <label
                style={{
                  display: "block",
                  marginBottom: 8,
                  fontWeight: 600,
                  color: "#2d3748",
                }}
              >
                Username <span style={{ color: "#e53e3e" }}>*</span>
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="Username kiriting"
                required
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  borderRadius: 8,
                  border: "2px solid #e2e8f0",
                  fontSize: 16,
                  transition: "all 0.2s",
                  outline: "none",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#667eea")}
                onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
              />
            </div>
          </div>

          <div
            style={{
              borderTop: "2px solid #e2e8f0",
              paddingTop: 32,
              marginBottom: 24,
            }}
          >
            <h3
              style={{
                margin: "0 0 8px 0",
                fontSize: 20,
                color: "#2d3748",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              🔐 Parolni O'zgartirish
            </h3>
            <p
              style={{
                color: "#718096",
                fontSize: 14,
                marginBottom: 20,
                lineHeight: 1.6,
              }}
            >
              Xavfsizligingiz uchun parolni vaqti-vaqti bilan yangilab turing.
              Parol kamida 6 belgidan iborat bo'lishi kerak.
            </p>

            <div className="form-group" style={{ marginBottom: 20 }}>
              <label
                style={{
                  display: "block",
                  marginBottom: 8,
                  fontWeight: 600,
                  color: "#2d3748",
                }}
              >
                🔑 Yangi Parol
              </label>
              <input
                type="password"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                placeholder="Yangi parol kiriting (kamida 6 ta belgi)"
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  borderRadius: 8,
                  border: "2px solid #e2e8f0",
                  fontSize: 16,
                  transition: "all 0.2s",
                  outline: "none",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#667eea")}
                onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
              />
            </div>

            <div className="form-group">
              <label
                style={{
                  display: "block",
                  marginBottom: 8,
                  fontWeight: 600,
                  color: "#2d3748",
                }}
              >
                ✅ Parolni Tasdiqlash
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Yangi parolni qayta kiriting"
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  borderRadius: 8,
                  border: "2px solid #e2e8f0",
                  fontSize: 16,
                  transition: "all 0.2s",
                  outline: "none",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#667eea")}
                onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
              />
            </div>
          </div>

          {message.text && (
            <div
              style={{
                padding: 16,
                marginBottom: 24,
                borderRadius: 8,
                backgroundColor:
                  message.type === "success" ? "#c6f6d5" : "#fed7d7",
                color: message.type === "success" ? "#22543d" : "#742a2a",
                border: `2px solid ${
                  message.type === "success" ? "#9ae6b4" : "#fc8181"
                }`,
                display: "flex",
                alignItems: "center",
                gap: 12,
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              <span style={{ fontSize: 20 }}>
                {message.type === "success" ? "✅" : "❌"}
              </span>
              {message.text}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px 24px",
              background: loading
                ? "#cbd5e0"
                : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
              border: "none",
              borderRadius: 8,
              fontSize: 16,
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              transition: "all 0.3s",
              boxShadow: loading
                ? "none"
                : "0 4px 12px rgba(102, 126, 234, 0.4)",
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.target.style.transform = "translateY(-2px)";
                e.target.style.boxShadow =
                  "0 6px 20px rgba(102, 126, 234, 0.5)";
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.target.style.transform = "translateY(0)";
                e.target.style.boxShadow =
                  "0 4px 12px rgba(102, 126, 234, 0.4)";
              }
            }}
          >
            {loading ? "⏳ Saqlanmoqda..." : "💾 Saqlash"}
          </button>
        </form>
      </div>
    </div>
  );
}
