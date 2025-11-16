import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../services/api";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await auth.login(username, password);
      if (res.data && res.data.data && res.data.data.token) {
        localStorage.setItem("nerobot_token", res.data.data.token);
        window.location.href = "/app";
      }
    } catch (err) {
      setError(err.response?.data?.message || "Login xatosi");
    }
  };

  return (
    <div className="container">
      <h2>Admin Login</h2>
      <form onSubmit={submit} style={{ maxWidth: 400 }}>
        <div style={{ marginBottom: 8 }}>
          <input
            className="input"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
        <div style={{ marginBottom: 8 }}>
          <input
            type="password"
            className="input"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && <div style={{ color: "red", marginBottom: 8 }}>{error}</div>}
        <button className="button">Kirish</button>
      </form>
    </div>
  );
}
