import React, { useEffect, useState } from "react";
import { api, seasons } from "../services/api";

export default function RandomWinner() {
  const [count, setCount] = useState(10);
  const [region, setRegion] = useState("");
  const [seasonId, setSeasonId] = useState("");
  const [seasonsList, setSeasonsList] = useState([]);
  const [winners, setWinners] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentDisplay, setCurrentDisplay] = useState([]);
  const [revealedPhones, setRevealedPhones] = useState({});
  const [revealedIds, setRevealedIds] = useState({});

  const REGIONS = [
    "Toshkent",
    "Andijon",
    "Farg'ona",
    "Namangan",
    "Samarqand",
    "Buxoro",
    "Xorazm",
    "Qashqadaryo",
    "Surxondaryo",
    "Jizzax",
    "Sirdaryo",
    "Navoiy",
    "Qoraqalpog'iston",
  ];

  useEffect(() => {
    loadSeasons();
  }, []);

  const loadSeasons = async () => {
    try {
      const res = await seasons.getAll();
      setSeasonsList(res.data.data || []);
    } catch (err) {
      console.error("Mavsumlarni yuklab bo'lmadi:", err);
    }
  };

  const selectWinners = async () => {
    if (count < 1) {
      alert("Kamida 1 ta g'olib tanlang");
      return;
    }

    setLoading(true);
    setIsAnimating(true);
    setWinners([]);
    setRevealedPhones({});
    setRevealedIds({});

    try {
      const params = { count };
      if (region) params.region = region;
      if (seasonId) params.seasonId = seasonId;

      const res = await api.post("/random-winner", params);
      const selectedWinners = res.data.data || [];

      // Animatsiya: Random nomlar ko'rsatish
      let iterations = 0;
      const maxIterations = 30;
      const animationInterval = setInterval(() => {
        iterations++;

        // Random foydalanuvchilar yaratish (vizual effekt)
        const fakeUsers = Array(count)
          .fill(null)
          .map(() => ({
            _id: Math.random().toString(),
            name: "Tanlanmoqda...",
            phone: "+998 XX XXX XX XX",
            region: REGIONS[Math.floor(Math.random() * REGIONS.length)],
            telegramId: "--------",
            promoCode: "XXXXXX",
            usedAt: new Date(),
          }));

        setCurrentDisplay(fakeUsers);

        if (iterations >= maxIterations) {
          clearInterval(animationInterval);
          // Haqiqiy g'oliblarni ko'rsatish
          setWinners(selectedWinners);
          setCurrentDisplay(selectedWinners);
          setIsAnimating(false);
        }
      }, 80);
    } catch (err) {
      alert(err.response?.data?.message || "Xato");
      setIsAnimating(false);
    }
    setLoading(false);
  };

  const maskPhone = (phone) => {
    if (!phone) return "";
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length >= 4) {
      return phone.slice(0, -4) + "****";
    }
    return phone;
  };

  const maskTelegramId = (id) => {
    if (!id) return "";
    const idStr = id.toString();
    if (idStr.length >= 4) {
      return idStr.slice(0, -4) + "****";
    }
    return idStr;
  };

  const togglePhoneReveal = (winnerId) => {
    setRevealedPhones((prev) => ({
      ...prev,
      [winnerId]: !prev[winnerId],
    }));
  };

  const toggleIdReveal = (winnerId) => {
    setRevealedIds((prev) => ({
      ...prev,
      [winnerId]: !prev[winnerId],
    }));
  };

  const displayList = isAnimating ? currentDisplay : winners;

  return (
    <div>
      <h3>🎲 Tasodifiy G'olib Tanlash</h3>

      <div
        style={{
          marginBottom: 24,
          padding: 20,
          background: "#f5f5f5",
          borderRadius: 8,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 12,
            marginBottom: 12,
          }}
        >
          <div>
            <label
              style={{ display: "block", marginBottom: 4, fontWeight: 500 }}
            >
              G'oliblar soni:
            </label>
            <input
              type="number"
              className="input"
              min={1}
              value={count}
              onChange={(e) => setCount(parseInt(e.target.value) || 1)}
              style={{ width: "100%" }}
            />
          </div>

          <div>
            <label
              style={{ display: "block", marginBottom: 4, fontWeight: 500 }}
            >
              Viloyat (ixtiyoriy):
            </label>
            <select
              className="input"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              style={{ width: "100%" }}
            >
              <option value="">Barcha viloyatlar</option>
              {REGIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              style={{ display: "block", marginBottom: 4, fontWeight: 500 }}
            >
              Mavsum (ixtiyoriy):
            </label>
            <select
              className="input"
              value={seasonId}
              onChange={(e) => setSeasonId(e.target.value)}
              style={{ width: "100%" }}
            >
              <option value="">Barcha mavsumlar</option>
              {seasonsList.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          className="button"
          onClick={selectWinners}
          disabled={loading || isAnimating}
          style={{
            width: "100%",
            padding: 12,
            fontSize: 16,
            fontWeight: 600,
            background: isAnimating ? "#ff9800" : "#4caf50",
            cursor: loading || isAnimating ? "not-allowed" : "pointer",
          }}
        >
          {isAnimating
            ? "🎰 Tanlanmoqda..."
            : loading
            ? "⏳ Yuklanmoqda..."
            : "🎲 G'oliblarni tanlash"}
        </button>
      </div>

      {/* Winners Display */}
      {displayList.length > 0 && (
        <div>
          <h4 style={{ marginBottom: 16 }}>
            {isAnimating ? (
              <span style={{ color: "#ff9800" }}>🎰 Tanlanmoqda...</span>
            ) : (
              <span style={{ color: "#4caf50" }}>🎉 Tanlangan G'oliblar</span>
            )}
          </h4>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: 16,
            }}
          >
            {displayList.map((winner, idx) => (
              <div
                key={winner._id}
                style={{
                  padding: 16,
                  background: isAnimating ? "#fff3e0" : "#e8f5e9",
                  borderRadius: 8,
                  border: isAnimating
                    ? "2px solid #ff9800"
                    : "2px solid #4caf50",
                  animation: isAnimating
                    ? "pulse 0.5s ease-in-out infinite"
                    : "fadeIn 0.5s ease-in",
                  transition: "all 0.3s ease",
                }}
              >
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 600,
                    marginBottom: 8,
                    color: isAnimating ? "#ff9800" : "#2e7d32",
                  }}
                >
                  🏆 G'olib #{idx + 1}
                </div>
                <div style={{ fontSize: 14, marginBottom: 4 }}>
                  <strong>👤 Ism:</strong> {winner.name}
                </div>
                <div
                  style={{
                    fontSize: 14,
                    marginBottom: 4,
                    fontFamily: "monospace",
                  }}
                >
                  <strong>📱 Telefon:</strong>{" "}
                  {!isAnimating ? (
                    <span
                      onClick={() => togglePhoneReveal(winner._id)}
                      style={{
                        cursor: "pointer",
                        color: "#1976d2",
                        textDecoration: "underline",
                        userSelect: "none",
                      }}
                      title="Ko'rish uchun bosing"
                    >
                      {revealedPhones[winner._id]
                        ? winner.phone
                        : maskPhone(winner.phone)}
                    </span>
                  ) : (
                    winner.phone
                  )}
                </div>
                <div style={{ fontSize: 14, marginBottom: 4 }}>
                  <strong>🗺 Viloyat:</strong> {winner.region}
                </div>
                {winner.username && (
                  <div style={{ fontSize: 14, marginBottom: 4 }}>
                    <strong>✈️ Username:</strong>{" "}
                    {!isAnimating ? (
                      <a
                        href={`tg://resolve?domain=${winner.username}`}
                        style={{ color: "#1976d2", textDecoration: "none" }}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        @{winner.username}
                      </a>
                    ) : (
                      `@${winner.username}`
                    )}
                  </div>
                )}
                <div
                  style={{
                    fontSize: 14,
                    marginBottom: 4,
                    fontFamily: "monospace",
                  }}
                >
                  <strong>🆔 Telegram ID:</strong>{" "}
                  {!isAnimating ? (
                    <span
                      onClick={() => toggleIdReveal(winner._id)}
                      style={{
                        cursor: "pointer",
                        color: "#1976d2",
                        textDecoration: "underline",
                        userSelect: "none",
                      }}
                      title="Ko'rish uchun bosing"
                    >
                      {revealedIds[winner._id]
                        ? winner.telegramId
                        : maskTelegramId(winner.telegramId)}
                    </span>
                  ) : (
                    winner.telegramId
                  )}
                </div>
                {winner.promoCode && !isAnimating && (
                  <>
                    <div
                      style={{
                        fontSize: 14,
                        marginBottom: 4,
                        marginTop: 8,
                        paddingTop: 8,
                        borderTop: "1px solid #4caf50",
                      }}
                    >
                      <strong>🎟 Tanlangan Kod:</strong>{" "}
                      <span
                        style={{
                          fontFamily: "monospace",
                          background: "#fff",
                          padding: "2px 6px",
                          borderRadius: 4,
                          fontWeight: 600,
                        }}
                      >
                        {winner.promoCode}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: "#666" }}>
                      <strong>📅 Kiritilgan:</strong>{" "}
                      {new Date(winner.usedAt).toLocaleString("uz-UZ", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                    {winner.seasonName && winner.seasonName !== "-" && (
                      <div style={{ fontSize: 12, color: "#666" }}>
                        <strong>🎭 Mavsum:</strong> {winner.seasonName}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.02);
            opacity: 0.9;
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
