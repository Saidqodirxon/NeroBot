import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const NAV_ITEMS = [
  { section: "Asosiy" },
  { path: "/app/stats",    icon: "📊", label: "Statistika" },
  { path: "/app/seasons",  icon: "🎭", label: "Mavsumlar" },
  { path: "/app/codes",    icon: "📝", label: "Promo Kodlar" },
  { path: "/app/users",    icon: "👥", label: "Foydalanuvchilar" },
  { path: "/app/prizes",   icon: "🎁", label: "Sovg'alar" },
  { path: "/app/winner",   icon: "🎯", label: "G'olib Tanlash" },
  { section: "Usta Tizimi" },
  { path: "/app/master-apps",  icon: "📋", label: "Usta Arizalari" },
  { path: "/app/masters",      icon: "👨‍🔧", label: "Ustalar" },
  { path: "/app/prize-claims", icon: "⭐", label: "Sovg'a Talablari" },
  { section: "Boshqaruv" },
  { path: "/app/broadcast", icon: "📢", label: "Yangilik Yuborish" },
  { path: "/app/settings",  icon: "⚙️", label: "Sozlamalar" },
];

export default function Layout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [adminName] = useState(() => {
    try {
      const token = localStorage.getItem("nerobot_token");
      if (!token) return "Admin";
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload.username || "Admin";
    } catch { return "Admin"; }
  });

  const handleLogout = () => {
    localStorage.removeItem("nerobot_token");
    window.location.href = "/login";
  };

  const currentLabel = NAV_ITEMS.find(
    (item) => item.path && location.pathname.startsWith(item.path)
  )?.label || "NeroBot Admin";

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="app-sidebar">
        <div className="sidebar-logo">
          <h1>🤖 NeroBot</h1>
          <p>Admin boshqaruv paneli</p>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item, i) => {
            if (item.section) {
              return (
                <div key={i} className="sidebar-section">{item.section}</div>
              );
            }
            const isActive = location.pathname === item.path ||
              location.pathname.startsWith(item.path + "/");
            return (
              <button
                key={item.path}
                className={`sidebar-link ${isActive ? "active" : ""}`}
                onClick={() => navigate(item.path)}
              >
                <span className="icon">{item.icon}</span>
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <button
            onClick={handleLogout}
            className="sidebar-link"
            style={{ width: "100%", color: "#ef4444" }}
          >
            <span className="icon">🚪</span>
            Chiqish
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="app-main">
        <header className="app-topbar">
          <span className="topbar-title">{currentLabel}</span>
          <div className="topbar-right">
            <span className="admin-badge">
              👤 {adminName}
            </span>
          </div>
        </header>

        <div className="app-content">
          {children}
        </div>
      </main>
    </div>
  );
}
