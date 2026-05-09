import React, { useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";

// ── SVG icon set ──────────────────────────────────────────────────────────────
const Icon = ({ name, size = 18 }) => {
  const icons = {
    stats: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
        <line x1="6" y1="20" x2="6" y2="14"/>
      </svg>
    ),
    seasons: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
    codes: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 12V22H4V12"/><path d="M22 7H2v5h20V7z"/>
        <path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/>
        <path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/>
      </svg>
    ),
    users: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
      </svg>
    ),
    prizes: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 12V22H4V12"/><path d="M22 7H2v5h20V7z"/>
        <path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/>
        <path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/>
      </svg>
    ),
    trophy: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9H4.5a2.5 2.5 0 010-5H6"/><path d="M18 9h1.5a2.5 2.5 0 000-5H18"/>
        <path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
        <path d="M18 2H6v7a6 6 0 0012 0V2z"/>
      </svg>
    ),
    clipboard: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/>
        <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
      </svg>
    ),
    wrench: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>
      </svg>
    ),
    star: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
    ),
    send: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <line x1="22" y1="2" x2="11" y2="13"/>
        <polygon points="22 2 15 22 11 13 2 9 22 2"/>
      </svg>
    ),
    settings: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
      </svg>
    ),
    logout: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
        <polyline points="16 17 21 12 16 7"/>
        <line x1="21" y1="12" x2="9" y2="12"/>
      </svg>
    ),
    bot: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2"/>
        <path d="M12 11V7"/><circle cx="12" cy="5" r="2"/>
        <line x1="8" y1="15" x2="8.01" y2="15"/><line x1="16" y1="15" x2="16.01" y2="15"/>
      </svg>
    ),
    menu: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
        <line x1="3" y1="6" x2="21" y2="6"/>
        <line x1="3" y1="12" x2="21" y2="12"/>
        <line x1="3" y1="18" x2="21" y2="18"/>
      </svg>
    ),
    chevronLeft: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <polyline points="15 18 9 12 15 6"/>
      </svg>
    ),
  };
  return (
    <span style={{ width: size, height: size, display: "inline-flex", flexShrink: 0 }}>
      {icons[name] || icons.star}
    </span>
  );
};

// ── Nav items with SVG icon keys ──────────────────────────────────────────────
const NAV_ITEMS = [
  { section: "Asosiy" },
  { path: "/app/stats",        icon: "stats",     label: "Statistika" },
  { path: "/app/seasons",      icon: "seasons",   label: "Mavsumlar" },
  { path: "/app/codes",        icon: "codes",     label: "Promo Kodlar" },
  { path: "/app/users",        icon: "users",     label: "Foydalanuvchilar" },
  { path: "/app/prizes",       icon: "prizes",    label: "Sovg'alar" },
  { path: "/app/winner",       icon: "trophy",    label: "G'olib Tanlash" },
  { section: "Usta Tizimi" },
  { path: "/app/master-apps",  icon: "clipboard", label: "Usta Arizalari" },
  { path: "/app/masters",      icon: "wrench",    label: "Ustalar" },
  { path: "/app/prize-claims", icon: "star",      label: "Sovg'a Talablari" },
  { section: "Boshqaruv" },
  { path: "/app/broadcast",    icon: "send",      label: "Yangilik Yuborish" },
  { path: "/app/settings",     icon: "settings",  label: "Sozlamalar" },
];

const FULL = 240;
const MINI = 64;

export default function Layout({ children }) {
  const navigate  = useNavigate();
  const location  = useLocation();

  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem("sb_c") === "1"
  );
  const [tooltip, setTooltip] = useState({ label: "", y: 0 });

  const [adminName] = useState(() => {
    try {
      const token = localStorage.getItem("nerobot_token");
      if (!token) return "Admin";
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload.username || "Admin";
    } catch { return "Admin"; }
  });

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("sb_c", next ? "1" : "0");
    if (!next) setTooltip({ label: "", y: 0 });
  };

  const handleLogout = () => {
    localStorage.removeItem("nerobot_token");
    window.location.href = "/login";
  };

  const currentLabel =
    NAV_ITEMS.find(
      (item) => item.path && location.pathname.startsWith(item.path)
    )?.label || "NeroBot Admin";

  const W = collapsed ? MINI : FULL;

  return (
    <div className="app-layout">
      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <aside
        className="app-sidebar"
        style={{ width: W, transition: "width 0.2s ease", overflow: "hidden" }}
      >
        {/* Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: collapsed ? "18px 0" : "18px 16px",
            justifyContent: collapsed ? "center" : "flex-start",
            gap: 10,
            borderBottom: "1px solid rgba(255,255,255,0.07)",
            minHeight: 64,
          }}
        >
          <span style={{ color: "#818cf8", flexShrink: 0 }}>
            <Icon name="bot" size={22} />
          </span>
          {!collapsed && (
            <div style={{ overflow: "hidden", whiteSpace: "nowrap" }}>
              <div style={{ color: "#f8fafc", fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>
                NeroBot
              </div>
              <div style={{ color: "#475569", fontSize: 11, marginTop: 2 }}>
                Admin panel
              </div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="sidebar-nav" style={{ flex: 1, padding: "8px 0" }}>
          {NAV_ITEMS.map((item, i) => {
            if (item.section) {
              return collapsed ? (
                <div
                  key={i}
                  style={{
                    height: 1,
                    background: "rgba(255,255,255,0.06)",
                    margin: "6px 12px",
                  }}
                />
              ) : (
                <div key={i} className="sidebar-section">{item.section}</div>
              );
            }

            const isActive =
              location.pathname === item.path ||
              location.pathname.startsWith(item.path + "/");

            return (
              <button
                key={item.path}
                className={`sidebar-link${isActive ? " active" : ""}`}
                onClick={() => navigate(item.path)}
                onMouseEnter={(e) => {
                  if (collapsed) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setTooltip({ label: item.label, y: rect.top + rect.height / 2 });
                  }
                }}
                onMouseLeave={() => setTooltip({ label: "", y: 0 })}
                style={{
                  justifyContent: collapsed ? "center" : "flex-start",
                  padding: collapsed ? "10px 0" : "9px 14px",
                  margin: collapsed ? "1px 8px" : "1px 8px",
                  width: collapsed ? `calc(100% - 16px)` : "calc(100% - 16px)",
                  gap: 10,
                }}
              >
                <Icon name={item.icon} size={17} />
                {!collapsed && (
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {item.label}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div
          style={{ padding: "12px 0", borderTop: "1px solid rgba(255,255,255,0.07)" }}
        >
          <button
            onClick={handleLogout}
            className="sidebar-link"
            onMouseEnter={(e) => {
              if (collapsed) {
                const rect = e.currentTarget.getBoundingClientRect();
                setTooltip({ label: "Chiqish", y: rect.top + rect.height / 2 });
              }
            }}
            onMouseLeave={() => setTooltip({ label: "", y: 0 })}
            style={{
              width: "calc(100% - 16px)",
              color: "#ef4444",
              justifyContent: collapsed ? "center" : "flex-start",
              padding: collapsed ? "10px 0" : "9px 14px",
              margin: "0 8px",
              gap: 10,
            }}
          >
            <Icon name="logout" size={17} />
            {!collapsed && "Chiqish"}
          </button>
        </div>
      </aside>

      {/* Collapsed tooltip */}
      {collapsed && tooltip.label && (
        <div
          style={{
            position: "fixed",
            left: MINI + 10,
            top: tooltip.y - 15,
            background: "#1e293b",
            color: "#f8fafc",
            padding: "6px 12px",
            borderRadius: 7,
            fontSize: 12.5,
            fontWeight: 500,
            zIndex: 9999,
            pointerEvents: "none",
            whiteSpace: "nowrap",
            boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          {tooltip.label}
          <span
            style={{
              position: "absolute",
              left: -5,
              top: "50%",
              transform: "translateY(-50%)",
              width: 0,
              height: 0,
              borderTop: "5px solid transparent",
              borderBottom: "5px solid transparent",
              borderRight: "5px solid #1e293b",
            }}
          />
        </div>
      )}

      {/* ── Main ─────────────────────────────────────────────────── */}
      <main
        className="app-main"
        style={{ marginLeft: W, transition: "margin-left 0.2s ease" }}
      >
        <header className="app-topbar">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              onClick={toggle}
              style={{
                background: "none",
                border: "1.5px solid var(--border)",
                borderRadius: 8,
                width: 34,
                height: 34,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--text-muted)",
                flexShrink: 0,
                transition: "background 0.15s",
              }}
              title={collapsed ? "Panelni ochish" : "Panelni yopish"}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5f9")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
            >
              <Icon name="menu" size={16} />
            </button>
            <span className="topbar-title">{currentLabel}</span>
          </div>

          <div className="topbar-right">
            <span className="admin-badge">
              <Icon name="bot" size={14} />
              {adminName}
            </span>
          </div>
        </header>

        <div className="app-content">{children}</div>
      </main>
    </div>
  );
}
