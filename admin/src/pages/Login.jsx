import React, { useState } from "react";
import { auth } from "../services/api";

const BotIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" style={{ width: 32, height: 32, color: "#fff" }}>
    <rect x="3" y="11" width="18" height="11" rx="2"/>
    <path d="M12 11V7"/><circle cx="12" cy="5" r="2" fill="currentColor" stroke="none"/>
    <circle cx="8.5" cy="16" r="1" fill="currentColor" stroke="none"/>
    <circle cx="15.5" cy="16" r="1" fill="currentColor" stroke="none"/>
    <path d="M9 20h6"/>
  </svg>
);

const EyeIcon = ({ open }) => open ? (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
) : (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState(null);
  const [loading, setLoading]   = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Foydalanuvchi nomi va parolni kiriting");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await auth.login(username.trim(), password);
      if (res.data?.data?.token) {
        localStorage.setItem("nerobot_token", res.data.data.token);
        window.location.href = "/app";
      }
    } catch (err) {
      setError(err.response?.data?.message || "Foydalanuvchi nomi yoki parol noto'g'ri");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
    }}>
      {/* Background decoration */}
      <div style={{
        position: "fixed", inset: 0, overflow: "hidden", pointerEvents: "none",
      }}>
        <div style={{
          position: "absolute", width: 400, height: 400,
          background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)",
          top: "10%", left: "15%", borderRadius: "50%",
        }}/>
        <div style={{
          position: "absolute", width: 300, height: 300,
          background: "radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)",
          bottom: "20%", right: "20%", borderRadius: "50%",
        }}/>
      </div>

      {/* Card */}
      <div style={{
        position: "relative",
        background: "rgba(255,255,255,0.98)",
        borderRadius: 20,
        padding: "44px 40px 36px",
        width: "100%",
        maxWidth: 400,
        boxShadow: "0 32px 80px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.05)",
      }}>

        {/* Brand */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{
            width: 68, height: 68,
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            borderRadius: 18,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
            boxShadow: "0 10px 30px rgba(99,102,241,0.4)",
          }}>
            <BotIcon />
          </div>
          <h1 style={{ margin: "0 0 6px", fontSize: 23, fontWeight: 800, color: "#0f172a", letterSpacing: -0.3 }}>
            NeroBot Admin
          </h1>
          <p style={{ margin: 0, color: "#64748b", fontSize: 13.5 }}>
            Boshqaruv paneliga kirish
          </p>
        </div>

        {/* Form */}
        <form onSubmit={submit}>
          {/* Username */}
          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: "block", marginBottom: 7,
              fontSize: 13, fontWeight: 600, color: "#374151",
            }}>
              Foydalanuvchi nomi
            </label>
            <input
              className="form-control"
              placeholder="username"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError(null); }}
              autoComplete="username"
              autoFocus
              disabled={loading}
              style={{ height: 44, fontSize: 14, borderRadius: 10 }}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: 20 }}>
            <label style={{
              display: "block", marginBottom: 7,
              fontSize: 13, fontWeight: 600, color: "#374151",
            }}>
              Parol
            </label>
            <div style={{ position: "relative" }}>
              <input
                type={showPw ? "text" : "password"}
                className="form-control"
                placeholder="••••••••"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(null); }}
                autoComplete="current-password"
                disabled={loading}
                style={{ height: 44, fontSize: 14, borderRadius: 10, paddingRight: 46 }}
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                tabIndex={-1}
                style={{
                  position: "absolute", right: 0, top: 0, bottom: 0,
                  width: 44, background: "none", border: "none",
                  cursor: "pointer", display: "flex",
                  alignItems: "center", justifyContent: "center",
                  color: "#9ca3af", borderRadius: "0 10px 10px 0",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#6366f1")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#9ca3af")}
              >
                <EyeIcon open={showPw} />
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: 10,
              padding: "10px 14px",
              marginBottom: 16,
              fontSize: 13,
              color: "#dc2626",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}>
              <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: 16, height: 16, flexShrink: 0 }}>
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
              </svg>
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              height: 46,
              background: loading
                ? "#a5b4fc"
                : "linear-gradient(135deg, #6366f1, #8b5cf6)",
              color: "#fff",
              border: "none",
              borderRadius: 12,
              fontSize: 15,
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              letterSpacing: 0.2,
              boxShadow: loading ? "none" : "0 6px 20px rgba(99,102,241,0.35)",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              if (!loading) e.currentTarget.style.boxShadow = "0 8px 28px rgba(99,102,241,0.5)";
            }}
            onMouseLeave={(e) => {
              if (!loading) e.currentTarget.style.boxShadow = "0 6px 20px rgba(99,102,241,0.35)";
            }}
          >
            {loading ? (
              <>
                <svg style={{ width: 18, height: 18, animation: "spin 1s linear infinite" }} viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3"/>
                  <path d="M12 2a10 10 0 010 20" stroke="#fff" strokeWidth="3" strokeLinecap="round"/>
                </svg>
                Kirilmoqda...
              </>
            ) : "Kirish"}
          </button>
        </form>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
