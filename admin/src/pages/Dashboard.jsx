import React from "react";
import { Link, Routes, Route, Navigate } from "react-router-dom";
import PromoCodes from "./Groups";
import Stats from "./Stats";
import Users from "./UsersNew";
import Broadcast from "./Broadcast";
import Seasons from "./Seasons";
import RandomWinner from "./RandomWinner";

export default function Dashboard() {
  const logout = () => {
    localStorage.removeItem("nerobot_token");
    window.location.href = "/login";
  };

  return (
    <div className="container">
      <div className="header">
        <h2>NeroBot Admin</h2>
        <div>
          <button className="button" onClick={logout}>
            Chiqish
          </button>
        </div>
      </div>

      <nav
        style={{
          marginBottom: 24,
          borderBottom: "2px solid #eee",
          paddingBottom: 12,
        }}
      >
        <Link
          to="/app/stats"
          style={{
            marginRight: 24,
            padding: "8px 16px",
            textDecoration: "none",
            fontWeight: 500,
          }}
        >
          📊 Statistika
        </Link>
        <Link
          to="/app/seasons"
          style={{
            marginRight: 24,
            padding: "8px 16px",
            textDecoration: "none",
            fontWeight: 500,
          }}
        >
          🎭 Mavsumlar
        </Link>
        <Link
          to="/app/codes"
          style={{
            marginRight: 24,
            padding: "8px 16px",
            textDecoration: "none",
            fontWeight: 500,
          }}
        >
          📝 Promo Kodlar
        </Link>
        <Link
          to="/app/users"
          style={{
            marginRight: 24,
            padding: "8px 16px",
            textDecoration: "none",
            fontWeight: 500,
          }}
        >
          👥 Foydalanuvchilar
        </Link>
        <Link
          to="/app/winner"
          style={{
            marginRight: 24,
            padding: "8px 16px",
            textDecoration: "none",
            fontWeight: 500,
          }}
        >
          🎲 G'olib Tanlash
        </Link>
        <Link
          to="/app/broadcast"
          style={{
            padding: "8px 16px",
            textDecoration: "none",
            fontWeight: 500,
          }}
        >
          📢 Yangilik Yuborish
        </Link>
      </nav>

      <Routes>
        <Route path="/stats" element={<Stats />} />
        <Route path="/seasons" element={<Seasons />} />
        <Route path="/codes" element={<PromoCodes />} />
        <Route path="/users" element={<Users />} />
        <Route path="/winner" element={<RandomWinner />} />
        <Route path="/broadcast" element={<Broadcast />} />
        <Route path="/" element={<Navigate to="/app/stats" replace />} />
      </Routes>
    </div>
  );
}
