import React, { useState, useEffect, useRef, useCallback } from "react";
import { api, seasons } from "../services/api";
import { REGIONS } from "../utils/regions";

// ── helpers ───────────────────────────────────────────────────────────────────
const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const rndChar = () => CHARS[Math.floor(Math.random() * CHARS.length)];
const keyPos  = (code) => code.split("").reduce((a,c,i) => c!=="-"?[...a,i]:a, []);

// prefix up to and including absolute index (auto-extends over trailing dashes)
const prefixTo = (code, absIdx) => {
  let end = absIdx;
  // also include any immediately following dashes
  while (end + 1 < code.length && code[end + 1] === "-") end++;
  return code.slice(0, end + 1);
};

const uniqueDrawingParticipants = (items) => {
  const seenTelegram = new Set();
  const seenPromo = new Set();
  const result = [];

  for (const item of items || []) {
    const telegramId = item?.telegramId;
    const promoCode = String(item?.promoCode || "").toUpperCase();
    if (!telegramId || !promoCode) continue;
    if (seenTelegram.has(telegramId) || seenPromo.has(promoCode)) continue;
    seenTelegram.add(telegramId);
    seenPromo.add(promoCode);
    result.push({ ...item, promoCode });
  }

  return result;
};

// CSS keyframes injected once
const GLOBAL_CSS = `
  @keyframes cdPop   { 0%{transform:scale(.5);opacity:0} 50%{transform:scale(1.2)} 100%{transform:scale(1);opacity:1} }
  @keyframes cdOut   { 0%{opacity:1;transform:scale(1)} 100%{opacity:0;transform:scale(1.6)} }
  @keyframes spinBox { 0%,100%{transform:scaleY(.9)} 50%{transform:scaleY(1.05)} }
  @keyframes lockIn  { 0%{transform:scale(.7);opacity:.4} 60%{transform:scale(1.12)} 100%{transform:scale(1);opacity:1} }
  @keyframes winPulse{ 0%,100%{box-shadow:0 0 20px rgba(99,102,241,.4)} 50%{box-shadow:0 0 50px rgba(99,102,241,.9)} }
  @keyframes slideUp { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
  @keyframes fall    { 0%{transform:translateY(-10px) rotate(0deg);opacity:1} 100%{transform:translateY(110vh) rotate(720deg);opacity:0} }
  @keyframes blink   { 0%,100%{opacity:1} 50%{opacity:.4} }
  select option { background:#1e293b!important; color:#e2e8f0!important; }
`;

// ── Confetti ──────────────────────────────────────────────────────────────────
function Confetti({ on }) {
  const items = useRef(Array.from({length:80},(_,i)=>({
    id:i, left:Math.random()*100,
    delay:Math.random()*2.5, dur:2.5+Math.random()*2,
    color:["#6366f1","#f59e0b","#10b981","#ef4444","#3b82f6","#ec4899","#a78bfa","#06b6d4"][i%8],
    size:4+Math.random()*8, rot:Math.random()*360,
  }))).current;
  if (!on) return null;
  return (
    <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:9999,overflow:"hidden"}}>
      {items.map(p=>(
        <div key={p.id} style={{
          position:"absolute",top:"-12px",left:`${p.left}%`,
          width:p.size,height:p.size,background:p.color,
          borderRadius:p.size>9?"50%":2,transform:`rotate(${p.rot}deg)`,
          animation:`fall ${p.dur}s ${p.delay}s ease-in forwards`,
        }}/>
      ))}
    </div>
  );
}

// ── Countdown overlay ─────────────────────────────────────────────────────────
function Countdown({ n }) {
  if (n === null) return null;
  const label = n === 0 ? "GO!" : String(n);
  const color  = n === 0 ? "#10b981" : n === 1 ? "#ef4444" : n === 2 ? "#f59e0b" : "#a78bfa";
  return (
    <div style={{
      position:"fixed",inset:0,background:"rgba(0,0,0,.75)",
      display:"flex",alignItems:"center",justifyContent:"center",
      zIndex:500,backdropFilter:"blur(6px)",
    }}>
      <div key={label} style={{
        fontSize:150,fontWeight:900,color,
        animation:`${n===null?"cdOut":"cdPop"} .35s ease`,
        textShadow:`0 0 40px ${color}`,fontFamily:"monospace",
      }}>{label}</div>
    </div>
  );
}

// ── SlotBox ───────────────────────────────────────────────────────────────────
function SlotBox({ ch, locked, active, isDash, stepNum }) {
  const locked_ = locked || isDash;
  const bg = locked_ ? "linear-gradient(135deg,#4338ca,#7c3aed)"
           : active   ? "rgba(6,182,212,.12)"
           :             "rgba(255,255,255,.04)";
  const border = locked_ ? "2px solid #818cf8"
               : active   ? "2px solid #06b6d4"
               :             "2px solid rgba(255,255,255,.1)";
  const shadow = locked_ ? "0 0 16px rgba(99,102,241,.55)"
               : active   ? "0 0 14px rgba(6,182,212,.5)"
               :             "none";
  const clr    = locked_ ? "#fff"
               : active   ? "#06b6d4"
               :             "rgba(255,255,255,.2)";
  const anim   = locked_ ? "lockIn .3s ease"
               : active   ? "spinBox .25s ease infinite"
               :             "none";
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
      <div style={{
        width:isDash?34:68, height:78, borderRadius:12,
        border, background:bg, boxShadow:shadow,
        display:"flex",alignItems:"center",justifyContent:"center",
        fontFamily:"monospace",fontSize:isDash?17:28,fontWeight:900,color:clr,
        animation:locked_?"lockIn .3s ease":active?"spinBox .25s ease infinite":"none",
        position:"relative",overflow:"hidden",transition:"background .1s",
      }}>
        {active && !locked_ && (
          <div style={{
            position:"absolute",inset:0,
            background:"linear-gradient(180deg,transparent,rgba(6,182,212,.1),transparent)",
            animation:"slideUp .5s linear infinite",
          }}/>
        )}
        {ch}
      </div>
      {!isDash && stepNum && (
        <span style={{fontSize:9,color:"rgba(255,255,255,.2)",fontWeight:600}}>{stepNum}</span>
      )}
    </div>
  );
}

// ── DarkSelect ────────────────────────────────────────────────────────────────
function DS({ value, onChange, children, style={} }) {
  return (
    <select value={value} onChange={onChange} style={{
      padding:"9px 32px 9px 12px",
      background:"#0d1b3e",
      border:"1px solid rgba(99,102,241,.3)",
      borderRadius:10,color:"#c7d2fe",
      fontSize:13,fontFamily:"inherit",cursor:"pointer",
      outline:"none",appearance:"none",
      backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='%236366f1' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
      backgroundRepeat:"no-repeat",backgroundPosition:"right 11px center",
      ...style,
    }}>{children}</select>
  );
}

// ── Btn ───────────────────────────────────────────────────────────────────────
function Btn({ onClick, color="#6366f1", disabled, children, style={} }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding:"10px 22px",borderRadius:12,
      background:`${color}22`,border:`1px solid ${color}66`,
      color:"#fff",cursor:disabled?"not-allowed":"pointer",
      fontWeight:700,fontSize:14,fontFamily:"inherit",
      opacity:disabled ? 0.5 : 1,transition:"all .15s",...style,
    }}>{children}</button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function RandomWinner() {
  // ── layout dark mode ───────────────────────────────────────────────────────
  useEffect(() => {
    document.body.classList.add("drawing-page");
    return () => document.body.classList.remove("drawing-page");
  }, []);

  const [tab, setTab] = useState("draw");

  // config
  const [seasonsList, setSeasonsList] = useState([]);
  const [seasonId, setSeasonId] = useState("");
  const [region,   setRegion]   = useState("all");
  const [mode,     setMode]     = useState("count");   // 'count'|'position'
  const [countTarget,   setCountTarget]   = useState(1);
  const [posTarget,     setPosTarget]     = useState(1);
  const [setupConfirmed, setSetupConfirmed] = useState(false);
  const [previewCount, setPreviewCount] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // session (multiple draws)
  const [sessionWinners, setSessionWinners] = useState([]);
  const [excludeIds,     setExcludeIds]     = useState([]);
  const [excludePromoCodes, setExcludePromoCodes] = useState([]);

  // draw state (UI-driving)
  const [phase,       setPhase]     = useState("idle");
  const [countdown,   setCountdown] = useState(null);
  const [winner,      setWinner]    = useState(null);
  const [promoCode,   setPromoCode] = useState("");
  const [participants, setParticipants] = useState([]);
  const [totalPart,   setTotalPart] = useState(0);
  const [revealStep,  setRevealStep]  = useState(0);
  const [lockedUpTo,  setLockedUpTo]  = useState(-1);
  const [slotChars,   setSlotChars]   = useState([]);
  const [matchCount,  setMatchCount]  = useState(0);
  const [matchingPool,setMatchingPool]= useState([]);
  const [showPhone,   setShowPhone]   = useState(false);
  const [showId,      setShowId]      = useState(false);
  const [confetti,    setConfetti]    = useState(false);
  const [loadError,   setLoadError]   = useState("");
  const [poolExhausted, setPoolExhausted] = useState(false);

  // ── REFS (stable values for closures) ─────────────────────────────────────
  const promoRef     = useRef("");
  const participantsRef = useRef([]);
  const sessionWinnersRef = useRef([]);
  const revealRef    = useRef(0);
  const lockedRef    = useRef(-1);
  const drawSeqRef   = useRef(0);
  const spinIv       = useRef(null);
  const settleTO     = useRef(null);
  const cdTO         = useRef(null);
  const chainTO      = useRef(null);

  // saved
  const [sessions,  setSessions]  = useState([]);
  const [sessLoad,  setSessLoad]  = useState(false);
  const [modalSess, setModalSess] = useState(null);

  useEffect(() => { loadSeasons(); }, []);
  useEffect(() => { if (tab==="saved") loadSaved(); }, [tab]);
  useEffect(() => {
    if (setupConfirmed) setSetupConfirmed(false);
  }, [seasonId, region, mode, countTarget, posTarget]);
  useEffect(() => {
    let alive = true;
    const loadPreview = async () => {
      setPreviewLoading(true);
      try {
        const params = { region };
        if (seasonId) params.seasonId = seasonId;
        const res = await api.get("/drawing/preview", { params });
        if (alive) setPreviewCount(res.data.totalParticipants ?? 0);
      } catch {
        if (alive) setPreviewCount(null);
      } finally {
        if (alive) setPreviewLoading(false);
      }
    };
    loadPreview();
    return () => {
      alive = false;
    };
  }, [seasonId, region]);
  useEffect(() => {
    sessionWinnersRef.current = sessionWinners;
  }, [sessionWinners]);

  const loadSeasons = async () => {
    try { const r = await seasons.getAll(); setSeasonsList(r.data.data||[]); } catch {}
  };
  const loadSaved = async () => {
    setSessLoad(true);
    try { const r = await api.get("/winner-sessions"); setSessions(r.data.data||[]); } catch {}
    setSessLoad(false);
  };

  // ── Update matching pool whenever lockedUpTo changes ──────────────────────
  useEffect(() => {
    const code = promoRef.current;
    const pool = participantsRef.current;
    if (!code || !pool.length) { setMatchingPool([]); return; }
    const idx = lockedRef.current;
    if (idx < 0) { setMatchingPool(pool.slice(0, 120)); return; }
    const prefix = prefixTo(code, idx);
    const matches = pool.filter(item => item.promoCode.toUpperCase().startsWith(prefix.toUpperCase()));
    setMatchingPool(matches.slice(0, 120));
  }, [lockedUpTo]);

  // ── Load data ──────────────────────────────────────────────────────────────
  const wait = (ms) => new Promise((resolve) => {
    cdTO.current = setTimeout(resolve, ms);
  });

  const clearAllTimers = () => {
    clearInterval(spinIv.current);
    clearTimeout(settleTO.current);
    clearTimeout(cdTO.current);
    clearTimeout(chainTO.current);
    spinIv.current = settleTO.current = cdTO.current = chainTO.current = null;
    drawSeqRef.current += 1;
  };

  const clearStepTimers = () => {
    clearInterval(spinIv.current);
    clearTimeout(settleTO.current);
    spinIv.current = settleTO.current = null;
  };

  const getNeededCount = () => (
    mode === "count"
      ? parseInt(countTarget, 10) || 1
      : parseInt(posTarget, 10) || 1
  );

  const loadDrawData = async (excludeIdsArg = [], excludePromoCodesArg = []) => {
    const body = {};
    if (seasonId) body.seasonId = seasonId;
    if (region !== "all") body.region = region;
    if (excludeIdsArg.length) body.excludeIds = excludeIdsArg;
    if (excludePromoCodesArg.length) body.excludePromoCodes = excludePromoCodesArg;

    const res = await api.post("/drawing/start", body);
    return res.data;
  };

  const finalizeRound = (roundWinner, finalPool, exhausted = false, roundPlace = null) => {
    if (!roundWinner) return;

    const winnerPromo = String(roundWinner.promoCode || "").toUpperCase();
    const winnerTelegram = roundWinner.telegramId;
    if (
      sessionWinnersRef.current.some((w) =>
        w.telegramId === winnerTelegram ||
        String(w.promoCode || "").toUpperCase() === winnerPromo
      )
    ) {
      return;
    }

    const placedWinner = roundPlace ? { ...roundWinner, place: roundPlace } : roundWinner;
    const updatedWinners = [...sessionWinnersRef.current, placedWinner];
    sessionWinnersRef.current = [...sessionWinnersRef.current, placedWinner];
    setSessionWinners(sessionWinnersRef.current);
    setWinner(placedWinner);
    setPromoCode(placedWinner.promoCode || promoRef.current || "");
    setMatchingPool((finalPool || []).slice(0, 120));
    setPoolExhausted(exhausted);
    setPhase("won");
    setConfetti(false);
    setTimeout(() => setConfetti(true), 300);
    setTimeout(() => setConfetti(false), 4500);

    const updatedExcludeIds = Array.from(new Set([...excludeIds, winnerTelegram].filter(Boolean)));
    const updatedExcludePromoCodes = Array.from(new Set([
      ...excludePromoCodes,
      winnerPromo,
    ].filter(Boolean)));
    setExcludeIds(updatedExcludeIds);
    setExcludePromoCodes(updatedExcludePromoCodes);
  };

  const revealOneStep = async (token) => {
    const code = promoRef.current;
    const codes = participantsRef.current;
    if (!code || !codes.length) return;

    const kp = keyPos(code);
    const step = revealRef.current;
    const nextAbsIdx = kp[step];

    if (nextAbsIdx === undefined) {
      finalizeRound(winner, matchingPool.length ? matchingPool : codes, false, currentRoundPlace());
      return;
    }

    setPhase("spinning");
    setCountdown(null);
    clearStepTimers();

    spinIv.current = setInterval(() => {
      setSlotChars(code.split("").map((c) => (c === "-" ? "-" : rndChar())));
    }, 55);

    await wait(1000 + step * 100);
    if (drawSeqRef.current !== token) return;

    clearStepTimers();

    const newStep = step + 1;
    revealRef.current = newStep;
    setRevealStep(newStep);

    let lockEnd = nextAbsIdx;
    while (lockEnd + 1 < code.length && code[lockEnd + 1] === "-") lockEnd++;
    lockedRef.current = lockEnd;
    setLockedUpTo(lockEnd);

    setSlotChars(code.split("").map((c, i) => {
      if (c === "-") return "-";
      if (i <= lockEnd) return c;
      return "?";
    }));

    const prefix = prefixTo(code, nextAbsIdx);
    const matches = codes.filter((c) => c.promoCode.toUpperCase().startsWith(prefix.toUpperCase()));
    const totalMatches = matches.length;
    setMatchCount(totalMatches);
    setMatchingPool(matches.slice(0, 120));

    if (totalMatches === 1) {
      finalizeRound(matches[0], matches, false, currentRoundPlace());
      return;
    }

    if (newStep >= kp.length) {
      finalizeRound(winner, matches, totalMatches < 1, currentRoundPlace());
      return;
    }

    setPhase("paused");
  };

  // ── Countdown then start ───────────────────────────────────────────────────
  const beginDraw = async ({ preserveSession = false, overrideExcludeIds, overrideExcludePromoCodes } = {}) => {
    clearAllTimers();
    setPhase("loading");
    setLoadError("");
    setWinner(null); setPromoCode(""); setSlotChars([]);
    setParticipants([]);
    setRevealStep(0); setLockedUpTo(-1); setMatchCount(0); setMatchingPool([]);
    setShowPhone(false); setShowId(false); setConfetti(false);
    setPoolExhausted(false);
    revealRef.current = 0; lockedRef.current = -1;
    promoRef.current = ""; participantsRef.current = [];
    if (!preserveSession) {
      sessionWinnersRef.current = [];
      setSessionWinners([]);
      setExcludeIds([]);
      setExcludePromoCodes([]);
    }

    const token = drawSeqRef.current;
    const effectiveExcludeIds = Array.isArray(overrideExcludeIds)
      ? overrideExcludeIds
      : preserveSession
        ? excludeIds
        : [];
    const effectiveExcludePromoCodes = Array.isArray(overrideExcludePromoCodes)
      ? overrideExcludePromoCodes
      : preserveSession
        ? excludePromoCodes
        : [];

    try {
      const payload = await loadDrawData(effectiveExcludeIds, effectiveExcludePromoCodes);
      if (drawSeqRef.current !== token) return;

      if (!payload?.success) {
        if (/qolmadi|topilmadi/i.test(payload?.message || "")) {
          setPoolExhausted(true);
          setPhase("won");
          return;
        }
        throw new Error(payload?.message || "Tanlangan g'olib ma'lumoti topilmadi");
      }

      const w = payload?.winner;
      const rawParticipants = Array.isArray(payload?.participants)
        ? payload.participants
        : Array.isArray(payload?.allCodes)
          ? payload.allCodes.map((code) => ({ promoCode: code }))
          : [];

      const normalizedParticipants = uniqueDrawingParticipants(rawParticipants.map((item) => ({
        telegramId: item.telegramId,
        name: item.name || "—",
        phone: item.phone || "",
        region: item.region || "—",
        username: item.username || "",
        promoCode: String(item.promoCode || "").toUpperCase(),
        seasonName: item.seasonName || "—",
      })));

      const totalParticipants = Number(payload?.totalParticipants || 0);
      const neededCount = getNeededCount();

      if (!w || !w.promoCode) {
        throw new Error("Tanlangan g'olib ma'lumoti topilmadi");
      }

      const code = String(w.promoCode).toUpperCase();

      promoRef.current = code;
      participantsRef.current = normalizedParticipants;
      setTotalPart(totalParticipants);
      setParticipants(normalizedParticipants);
      setPromoCode(code);
      setMatchCount(totalParticipants);
      setMatchingPool(normalizedParticipants.slice(0, 120));
      setSlotChars(code.split("").map(c => c === "-" ? "-" : "?"));

      if (totalParticipants <= 0) {
        setPoolExhausted(true);
        setPhase("won");
        return;
      }

      setPhase("countdown");
      for (let n = 3; n >= 0; n--) {
        if (drawSeqRef.current !== token) return;
        setCountdown(n);
        await wait(n === 0 ? 400 : 900);
      }
      if (drawSeqRef.current !== token) return;

      setCountdown(null);
      await revealOneStep(token);
    } catch (err) {
      setLoadError(err.message || "Noma'lum xatolik");
      alert("Xatolik: " + err.message);
      setPhase("idle");
    }
  };

  const handleContinue = async () => {
    if (phase === "won" && !drawComplete) {
      await beginDraw({
        preserveSession: true,
        overrideExcludeIds: excludeIds,
        overrideExcludePromoCodes: excludePromoCodes,
      });
      return;
    }

    if (phase !== "paused") return;
    const token = drawSeqRef.current;
    await revealOneStep(token);
  };

  useEffect(() => () => clearAllTimers(), []);

  const neededCount  = getNeededCount();
  const currentRoundPlace = () => (
    mode === "position"
      ? Math.max(neededCount - sessionWinnersRef.current.length, 1)
      : sessionWinnersRef.current.length + 1
  );
  const sessionDone  = sessionWinners.length >= neededCount;
  const isLastWinner = (sessionWinners.length + 1) >= neededCount;

  const handleReset = () => {
    clearAllTimers();
    setPhase("idle"); setWinner(null); setPromoCode(""); setSlotChars([]);
    setRevealStep(0); setLockedUpTo(-1); setMatchCount(0); setMatchingPool([]);
    setParticipants([]); setTotalPart(0); setCountdown(null);
    setSessionWinners([]); setExcludeIds([]);
    setExcludePromoCodes([]);
    setShowPhone(false); setShowId(false); setConfetti(false);
    setSetupConfirmed(false);
    setPreviewCount(null);
    setPoolExhausted(false);
    revealRef.current = 0; lockedRef.current = -1;
    promoRef.current = ""; participantsRef.current = [];
    sessionWinnersRef.current = [];
  };

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleNotify = async (list, title="") => {
    try {
      const res = await api.post("/drawing/notify",{winners:list,sessionTitle:title});
      alert(`✅ Guruhga: ${res.data.sent || 0} ta, g'oliblarga: ${res.data.sentToWinners || 0} ta xabar yuborildi!`);
    }
    catch (err) { alert("Xatolik: "+(err.response?.data?.message||err.message)); }
  };

  const handleSave = async (list) => {
    const sName = seasonsList.find(s=>s._id===seasonId)?.name||"Barcha";
    const lbl   = mode==="position"?` | ${posTarget}-o'rin`:` | ${neededCount} g'olib`;
    const title = `${sName} | ${region==="all"?"Barcha":region}${lbl} | ${new Date().toLocaleDateString("uz-UZ")}`;
    try {
      await api.post("/winner-sessions",{
        title, seasonId:seasonId==="all"?null:seasonId,
        region:region==="all"?null:region,
        selectionType:mode, position:mode==="position"?posTarget:null,
        count:neededCount,
        winners:list.map(w=>({telegramId:w.telegramId,name:w.name,phone:w.phone,region:w.region,promoCode:w.promoCode,points:0,prize:""})),
      });
      alert("✅ Saqlandi!");
    } catch (err) { alert("Xatolik: "+(err.response?.data?.message||err.message)); }
  };

  const dlCSV = (data, name) => {
    const rows=[["#","Ism","Telefon","Viloyat","Kod","Mavsum","Sana"]];
    data.forEach((w,i)=>rows.push([i+1,w.name||"—",w.phone||"—",w.region||"—",w.promoCode||"—",w.seasonName||"—",w.usedAt?new Date(w.usedAt).toLocaleDateString("uz-UZ"):"—"]));
    const csv=rows.map(r=>r.map(c=>`"${c}"`).join(",")).join("\n");
    const a=document.createElement("a");a.href="data:text/csv;charset=utf-8,﻿"+encodeURIComponent(csv);a.download=name;a.click();
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const kp         = promoCode ? keyPos(promoCode) : [];
  const totalSteps = kp.length;
  const progress   = totalSteps ? (revealStep / totalSteps) * 100 : 0;
  const isWon      = phase === "won";
  const isSpinning = phase === "spinning";
  const allFound   = sessionDone || (isWon && isLastWinner);
  const visibleWinners = (() => {
    const seenTelegram = new Set();
    const seenPromo = new Set();
    const list = [];

    for (const w of sessionWinners) {
      const promo = String(w?.promoCode || "").toUpperCase();
      if (!w?.telegramId || !promo) continue;
      if (seenTelegram.has(w.telegramId) || seenPromo.has(promo)) continue;
      seenTelegram.add(w.telegramId);
      seenPromo.add(promo);
      list.push(w);
    }

    if (winner?.telegramId) {
      const promo = String(winner.promoCode || "").toUpperCase();
      if (promo && !seenTelegram.has(winner.telegramId) && !seenPromo.has(promo)) {
        list.push(winner);
      }
    }

    return list;
  })();
  const finalList  = visibleWinners;
  const canContinue = true;
  const isBusy      = phase === "loading" || phase === "countdown" || phase === "spinning";
  const drawComplete = sessionDone || poolExhausted;
  const visibleDone  = visibleWinners.length >= neededCount;
  const remainingNeed = Math.max(neededCount - matchCount, 0);
  const showWinnerSlots = setupConfirmed;
  const seasonLabel = seasonId
    ? (seasonId === "all" ? "Barcha mavsumlar" : seasonsList.find(s => s._id === seasonId)?.name || "Tanlangan mavsum")
    : "Barcha mavsumlar";

  const dlXlsx = async (data, name) => {
    try {
      const res = await api.post(
        "/drawing/export-xlsx",
        { winners: data, sessionTitle: name },
        { responseType: "blob" }
      );
      const blob = new Blob([res.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name.endsWith(".xlsx") ? name : `${name}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("XLSX yuklab bo'lmadi: " + (err.response?.data?.message || err.message));
    }
  };

  return (
    <div style={{
      minHeight:"calc(100vh - 58px)",
      background:"linear-gradient(160deg,#030712 0%,#0d1b45 50%,#030712 100%)",
      padding:"24px 20px",color:"#fff",fontFamily:"Inter,Arial,sans-serif",
    }}>
      <style>{GLOBAL_CSS}</style>
      <Confetti on={confetti}/>
      <Countdown n={countdown}/>

      {/* Title */}
      <div style={{textAlign:"center",marginBottom:20}}>
        <h1 style={{
          fontSize:20,fontWeight:800,margin:0,
          background:"linear-gradient(90deg,#a78bfa,#06b6d4)",
          WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",
        }}>🎯 Promo Kod G'olib Tanlash</h1>
        <p style={{color:"rgba(255,255,255,.3)",margin:"4px 0 0",fontSize:11}}>Promotional Code Drawing System</p>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",justifyContent:"center",gap:4,marginBottom:18}}>
        {[{v:"draw",l:"🎯 Tanlash"},{v:"saved",l:"📋 Saqlangan"}].map(t=>(
          <button key={t.v} onClick={()=>setTab(t.v)} style={{
            padding:"7px 22px",borderRadius:20,fontFamily:"inherit",
            border:`1px solid ${tab===t.v?"#6366f1":"rgba(255,255,255,.1)"}`,
            background:tab===t.v?"rgba(99,102,241,.18)":"transparent",
            color:tab===t.v?"#a78bfa":"rgba(255,255,255,.4)",
            cursor:"pointer",fontWeight:600,fontSize:13,
          }}>{t.l}</button>
        ))}
      </div>

      {/* ══════ DRAW TAB ══════ */}
      {tab==="draw" && (
        <div style={{maxWidth:1080,margin:"0 auto"}}>

          {/* Config */}
          <div style={glass(16)}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
              <div>
                <Label>Mavsum</Label>
                <DS value={seasonId} onChange={e=>setSeasonId(e.target.value)} style={{width:"100%"}}>
                  <option value="">🎭 Mavsumni tanlang</option>
                  <option value="all">🎭 Barcha mavsumlar</option>
                  {seasonsList.map(s=><option key={s._id} value={s._id}>{s.name}</option>)}
                </DS>
              </div>
              <div>
                <Label>Viloyat</Label>
                <DS value={region} onChange={e=>setRegion(e.target.value)} style={{width:"100%"}}>
                  <option value="all">📍 Barcha viloyatlar</option>
                  {REGIONS.map(r=><option key={r} value={r}>{r}</option>)}
                </DS>
              </div>
            </div>

            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,marginBottom:14,flexWrap:"wrap"}}>
              <div style={{fontSize:12,color:"rgba(255,255,255,.3)"}}>
                Mavsum tanlanganda ishtirokchilar soni shu yerda ko'rinadi.
              </div>
              <div style={{
                padding:"10px 16px",
                borderRadius:12,
                background:"rgba(99,102,241,.12)",
                border:"1px solid rgba(99,102,241,.22)",
                color:"#c4b5fd",
                fontWeight:800,
                fontSize:14,
              }}>
                {previewLoading ? "Yuklanmoqda..." : previewCount === null ? "Mavsum tanlang" : `${previewCount.toLocaleString()} ta odam`}
              </div>
            </div>

            {/* Mode */}
            <div style={{marginBottom:14}}>
              <Label>Tanlash turi</Label>
              <div style={{display:"flex",gap:8}}>
                {[{v:"count",l:"Soni bo'yicha"},{v:"position",l:"O'rin bo'yicha"}].map(m=>(
                  <button key={m.v} onClick={()=>setMode(m.v)} style={{
                    padding:"7px 16px",borderRadius:8,fontFamily:"inherit",
                    border:`1.5px solid ${mode===m.v?"#6366f1":"rgba(255,255,255,.1)"}`,
                    background:mode===m.v?"rgba(99,102,241,.2)":"rgba(255,255,255,.03)",
                    color:mode===m.v?"#a78bfa":"rgba(255,255,255,.45)",
                    cursor:"pointer",fontWeight:600,fontSize:13,
                  }}>{m.l}</button>
                ))}
              </div>
            </div>

            <div style={{display:"flex",gap:14,alignItems:"flex-end",flexWrap:"wrap"}}>
              {mode==="count" && (
                <div>
                  <Label>Nechta g'olib?</Label>
                  <input type="number" value={countTarget} onChange={e=>setCountTarget(e.target.value)}
                    min="1" max="100" style={{
                      width:80,padding:"9px 12px",background:"#0d1b3e",
                      border:"1px solid rgba(99,102,241,.3)",borderRadius:10,
                      color:"#c7d2fe",fontSize:15,fontFamily:"inherit",outline:"none",textAlign:"center",fontWeight:700,
                    }}/>
                </div>
              )}
              {mode==="position" && (
                <div>
                  <Label>O'rin raqami</Label>
                  <div style={{display:"flex",gap:6,alignItems:"center"}}>
                    {[1,2,3,4,5].map(p=>(
                      <button key={p} onClick={()=>setPosTarget(p)} style={{
                        width:38,height:36,borderRadius:8,
                        border:`1.5px solid ${posTarget===p?"#6366f1":"rgba(255,255,255,.1)"}`,
                        background:posTarget===p?"rgba(99,102,241,.25)":"rgba(255,255,255,.04)",
                        color:posTarget===p?"#a78bfa":"rgba(255,255,255,.4)",
                        cursor:"pointer",fontWeight:700,fontSize:13,fontFamily:"inherit",
                      }}>{["🥇","🥈","🥉","4","5"][p-1]}</button>
                    ))}
                    <input type="number" value={posTarget>5?posTarget:""} min="6"
                      placeholder="6+" onChange={e=>setPosTarget(parseInt(e.target.value)||posTarget)}
                      style={{
                        width:56,padding:"7px 8px",background:"#0d1b3e",
                        border:"1px solid rgba(99,102,241,.3)",borderRadius:8,
                        color:"#c7d2fe",fontSize:13,fontFamily:"inherit",outline:"none",textAlign:"center",
                      }}/>
                  </div>
                </div>
              )}

              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,marginTop:4,flexWrap:"wrap"}}>
                <div style={{fontSize:12,color:"rgba(255,255,255,.28)"}}>
                  Mavsum tanlanmasa ham barcha mavsumlar bo'yicha ishlaydi.
                </div>
                {canContinue ? (
                    <button
                    onClick={()=>setSetupConfirmed(true)}
                    style={{
                      padding:"10px 28px",
                      background:"linear-gradient(135deg,#6366f1,#8b5cf6)",
                      border:"none",
                      borderRadius:10,
                      color:"#fff",
                      fontWeight:700,
                      fontSize:14,
                      cursor:"pointer",
                      fontFamily:"inherit",
                      boxShadow:"0 4px 16px rgba(99,102,241,.4)",
                    }}
                  >
                    Davom etish
                  </button>
                ) : (
                  <span style={{fontSize:12,color:"rgba(255,255,255,.18)"}}>
                    Davom etish tugmasi har doim mavjud, mavsum tanlanmasa barcha mavsumlar bo'yicha ishlaydi.
                  </span>
                )}
              </div>
            </div>

            {setupConfirmed && (
              <div style={{...glass(16),marginTop:16}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap",marginBottom:12}}>
                  <div>
                    <div style={{fontSize:11,color:"rgba(255,255,255,.35)",textTransform:"uppercase",letterSpacing:.6,marginBottom:4}}>
                      Tayyor panel
                    </div>
                  <div style={{fontSize:14,fontWeight:700}}>
                      {seasonLabel}
                    </div>
                    <div style={{fontSize:12,color:"rgba(255,255,255,.3)",marginTop:2}}>
                      {region === "all" ? "Barcha viloyatlar" : region} · {mode === "count" ? `${countTarget} g'olib` : `${posTarget}-o'rin`}
                    </div>
                  </div>
                  <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                    {totalPart>0 && (
                      <span style={{
                        padding:"7px 14px",background:"rgba(99,102,241,.12)",
                        border:"1px solid rgba(99,102,241,.2)",borderRadius:9,
                        fontSize:12.5,color:"#a78bfa",fontWeight:600,whiteSpace:"nowrap",
                      }}>👥 {totalPart.toLocaleString()}</span>
                    )}
                    {drawComplete ? (
                      <span style={{
                        padding:"10px 18px",
                        borderRadius:10,
                        background:"rgba(16,185,129,.12)",
                        border:"1px solid rgba(16,185,129,.25)",
                        color:"#86efac",
                        fontWeight:800,
                        fontSize:14,
                      }}>
                        Tanlov tugadi
                      </span>
                    ) : phase==="idle" ? (
                    <button onClick={() => beginDraw()} disabled={isBusy} style={{
                      padding:"10px 28px",
                      background:"linear-gradient(135deg,#6366f1,#8b5cf6)",
                      border:"none",borderRadius:10,color:"#fff",
                        fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"inherit",
                        boxShadow:"0 4px 16px rgba(99,102,241,.4)",
                        opacity:isBusy ? 0.5 : 1,
                        pointerEvents:isBusy?"none":"auto",
                      }}>🎯 Boshlash</button>
                    ) : (
                      <button onClick={handleReset} disabled={isBusy} style={{
                        padding:"10px 22px",
                        background:"rgba(239,68,68,.1)",border:"1px solid rgba(239,68,68,.3)",
                        borderRadius:10,color:"#f87171",
                        fontWeight:600,fontSize:14,cursor:"pointer",fontFamily:"inherit",
                        opacity:isBusy ? 0.5 : 1,
                        pointerEvents:isBusy?"none":"auto",
                      }}>🔄 Qayta</button>
                    )}
                  </div>
                </div>
                {phase==="idle" && (
                  <div style={{fontSize:12,color:"rgba(255,255,255,.3)"}}>
                    Boshlash bosilgach 3, 2, 1, GO chiqadi va harflar aylana boshlaydi.
                  </div>
                )}
              </div>
            )}

            {/* Session progress */}
            {showWinnerSlots && (
              <div style={{marginTop:14,paddingTop:14,borderTop:"1px solid rgba(255,255,255,.07)"}}>
                <div style={{fontSize:12,color:"rgba(255,255,255,.35)",marginBottom:8}}>
                  ✅ G'oliblar ro'yxati: {visibleWinners.length}/{neededCount}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:10,marginBottom:sessionDone?10:0}}>
                  {Array.from({length: neededCount}).map((_, i) => {
                    const w = visibleWinners[i];
                    const filled = Boolean(w);
                    const slotLabel = mode === "position"
                      ? `${w?.place || (neededCount - i)}-o'rin`
                      : `#${i + 1}`;
                    return (
                      <div key={i} style={{
                        minHeight:96,
                        padding:"12px 14px",
                        borderRadius:14,
                        border:filled ? "1px solid rgba(16,185,129,.25)" : "1px dashed rgba(255,255,255,.14)",
                        background:filled ? "rgba(16,185,129,.12)" : "rgba(255,255,255,.03)",
                        color:filled ? "#d1fae5" : "rgba(255,255,255,.35)",
                      }}>
                        <div style={{fontSize:11,color:"rgba(255,255,255,.32)",marginBottom:6}}>
                          {slotLabel}
                        </div>
                        {filled ? (
                          <>
                            <div style={{fontWeight:900,fontSize:13,marginBottom:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                              {w.name}
                            </div>
                            <div style={{fontSize:12,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                              <span style={{fontFamily:"monospace"}}>{w.promoCode}</span>
                            </div>
                            <div style={{fontSize:11,color:"rgba(255,255,255,.5)",marginTop:6,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                              {w.region}
                            </div>
                          </>
                        ) : (
                          <div style={{height:"100%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,fontWeight:900,color:"rgba(255,255,255,.18)"}}>
                            X
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {visibleDone && (
                  <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                    <Btn onClick={()=>handleNotify(visibleWinners, mode==="position"?`${posTarget}-o'rin`:`${neededCount} g'olib`)} color="#0ea5e9">📤 Xabar yuborish</Btn>
                    <Btn onClick={()=>handleSave(visibleWinners)} color="#10b981">💾 Saqlash</Btn>
                    <Btn onClick={()=>dlXlsx(visibleWinners,`goliblar_${Date.now()}`)} color="#6366f1">📥 XLSX</Btn>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Loading */}
          {phase==="loading" && (
            <div style={{...glass(16),textAlign:"center",padding:"44px 24px",marginTop:16}}>
              <div style={{fontSize:32,marginBottom:12,animation:"blink 1s ease infinite"}}>⚙️</div>
              <div style={{color:"#a78bfa",fontSize:14}}>Ishtirokchilar yuklanmoqda...</div>
              {loadError && (
                <div style={{marginTop:10,fontSize:12,color:"#fca5a5"}}>
                  {loadError}
                </div>
              )}
            </div>
          )}

          {/* Slot machine */}
          {["spinning","won","countdown","paused"].includes(phase) && promoCode && (
            <div style={{...glass(16),marginTop:16}}>

              {/* Step + stats */}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:10}}>
                <div>
                  <span style={{color:"rgba(255,255,255,.35)",fontSize:12}}>Qadam </span>
                  <span style={{color:"#a78bfa",fontWeight:800,fontSize:18}}>{revealStep}</span>
                  <span style={{color:"rgba(255,255,255,.25)",fontSize:13}}> / {totalSteps}</span>
                </div>
                <div style={{display:"flex",gap:12}}>
                  <Stat label="Mos keluvchi" value={matchCount} color="#06b6d4"/>
                  <Stat label="Jami"         value={totalPart}  color="rgba(255,255,255,.5)"/>
                </div>
              </div>
              {phase !== "loading" && (
                <div style={{
                  marginBottom:14,
                  fontSize:12,
                  color: totalSteps && matchCount <= neededCount ? "rgba(255,255,255,.4)" : "rgba(255,255,255,.28)",
                  textAlign:"center",
                }}>
                  {matchCount > neededCount
                    ? `Hozir ${matchCount} ta mos. Yana ${remainingNeed} ta kerak.`
                    : matchCount === neededCount
                      ? `Kerakli son topildi: ${neededCount}. Endi to'xtaydi.`
                      : `Hozir ${matchCount} ta mos. Yana ${remainingNeed} ta kerak.`}
                </div>
              )}

              {/* Progress */}
              <div style={{height:3,background:"rgba(255,255,255,.07)",borderRadius:2,marginBottom:24,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${progress}%`,background:"linear-gradient(90deg,#6366f1,#06b6d4)",borderRadius:2,transition:"width .5s ease"}}/>
              </div>

              {/* Slots */}
              <div style={{display:"flex",justifyContent:"center",gap:7,flexWrap:"wrap",marginBottom:22}}>
                {Array.from({length:promoCode.length}).map((_,i)=>{
                  const isDash = promoCode[i]==="-";
                  const locked = i <= lockedRef.current;
                  const active = !locked && isSpinning;
                  const stepNum = isDash ? null : kp.indexOf(i)+1;
                  return (
                    <SlotBox
                      key={i}
                      ch={slotChars[i]||"?"}
                      locked={locked}
                      active={active}
                      isDash={isDash}
                      stepNum={stepNum}
                    />
                  );
                })}
              </div>

              {isSpinning && (
                <div style={{textAlign:"center",color:"#06b6d4",fontWeight:600,fontSize:14,animation:"blink .6s ease infinite"}}>
                  ⚡ Aylanyapti...
                </div>
              )}

              {phase === "paused" && !drawComplete && (
                <div style={{textAlign:"center",marginBottom:8}}>
                  <button onClick={handleContinue} disabled={isBusy} style={{
                    padding:"14px 56px",
                    background:"linear-gradient(135deg,#6366f1,#06b6d4)",
                    border:"none",borderRadius:14,color:"#fff",
                    fontWeight:900,fontSize:18,cursor:"pointer",fontFamily:"inherit",
                    boxShadow:"0 6px 24px rgba(99,102,241,.5)",letterSpacing:.5,
                    opacity:isBusy ? 0.55 : 1,
                    pointerEvents:isBusy?"none":"auto",
                  }}>▶ Davom etish</button>
                  <div style={{marginTop:8,fontSize:12,color:"rgba(255,255,255,.25)"}}>
                    Faqat 1 ta yangi harf ochiladi
                  </div>
                </div>
              )}

              {phase === "won" && !drawComplete && (
                <div style={{textAlign:"center",marginBottom:8}}>
                  <button onClick={handleContinue} disabled={isBusy} style={{
                    padding:"14px 56px",
                    background:"linear-gradient(135deg,#6366f1,#06b6d4)",
                    border:"none",borderRadius:14,color:"#fff",
                    fontWeight:900,fontSize:18,cursor:"pointer",fontFamily:"inherit",
                    boxShadow:"0 6px 24px rgba(99,102,241,.5)",letterSpacing:.5,
                    opacity:isBusy ? 0.55 : 1,
                    pointerEvents:isBusy?"none":"auto",
                  }}>▶ Davom etish</button>
                  <div style={{marginTop:8,fontSize:12,color:"rgba(255,255,255,.25)"}}>
                    Keyingi countdown shu tugma bilan boshlanadi
                  </div>
                </div>
              )}

              {/* Matching pool */}
              {matchingPool.length > 0 && revealStep > 0 && winner?.promoCode && (
                <div style={{marginTop:18,paddingTop:14,borderTop:"1px solid rgba(255,255,255,.07)"}}>
                  <div style={{fontSize:12,color:"rgba(255,255,255,.3)",marginBottom:8,fontWeight:700,textTransform:"uppercase",letterSpacing:.5}}>
                    Mos keluvchi kodlar ({matchingPool.length}{matchingPool.length===120?"+":""})
                  </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:10,maxHeight:360,overflow:"auto",paddingRight:4}}>
                    {matchingPool.map((item,i)=>{
                      const code = String(item.promoCode || "").toUpperCase();
                      const isWinnerCode = isWon && winner && code === winner.promoCode.toUpperCase();
                      return (
                        <div key={`${code}-${i}`} style={{
                          padding:"12px 14px",
                          background:isWinnerCode ? "rgba(99,102,241,.18)" : "rgba(255,255,255,.05)",
                          border:isWinnerCode ? "1px solid rgba(99,102,241,.45)" : "1px solid rgba(255,255,255,.08)",
                          borderRadius:14,
                          boxShadow:isWinnerCode ? "0 0 0 1px rgba(99,102,241,.18)" : "none",
                        }}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,marginBottom:6}}>
                            <div style={{fontFamily:"monospace",fontWeight:900,letterSpacing:1.5,color:"#e0e7ff",fontSize:15}}>
                              {code}
                            </div>
                            {isWinnerCode && (
                              <span style={{fontSize:10,padding:"2px 7px",borderRadius:999,background:"rgba(99,102,241,.2)",color:"#c4b5fd"}}>
                                G'olib
                              </span>
                            )}
                          </div>
                          <div style={{fontSize:13,fontWeight:800,color:"#fff",marginBottom:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                            {item.name}
                          </div>
                          <div style={{fontSize:12,color:"rgba(255,255,255,.45)",marginBottom:3}}>
                            {item.region}
                          </div>
                          <div style={{fontSize:11,color:"rgba(255,255,255,.35)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                            {item.phone ? item.phone : (item.username ? `@${item.username}` : "—")}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Winner card */}
              {isWon && winner?.promoCode && (
            <div style={{
              ...glass(16),
              border:"2px solid rgba(99,102,241,.4)",
              animation:"winPulse 2.5s ease infinite,slideUp .5s ease",
              marginTop:16,
            }}>
                <div style={{textAlign:"center",marginBottom:18}}>
                <div style={{fontSize:46}}>🏆</div>
                <h2 style={{
                  margin:"8px 0 0",fontSize:22,
                  background:"linear-gradient(90deg,#f59e0b,#ef4444)",
                  WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",
                }}>
                  {mode==="position"
                    ? `${winner?.place || posTarget}-o'rin G'olibi`
                    : neededCount > 1
                      ? `${visibleWinners.length}/${neededCount} G'oliblar`
                      : "G'olib"}
                </h2>
              </div>

              {/* Promo code */}
              <div style={{textAlign:"center",marginBottom:16,padding:"16px 18px",background:"rgba(99,102,241,.1)",borderRadius:16,border:"1px solid rgba(99,102,241,.2)"}}>
                <div style={{fontSize:10,color:"rgba(255,255,255,.3)",marginBottom:5,textTransform:"uppercase",letterSpacing:1}}>Promo Kod</div>
                <div style={{fontSize:32,fontFamily:"monospace",fontWeight:900,letterSpacing:6,color:"#a78bfa"}}>
                  {winner.promoCode.toUpperCase()}
                </div>
              </div>

              <div style={{marginBottom:14,paddingTop:6}}>
                <div style={{fontSize:12,color:"rgba(255,255,255,.35)",marginBottom:8,fontWeight:700,textTransform:"uppercase",letterSpacing:.5}}>
                  G'oliblar kartalari ({finalList.length}/{neededCount})
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:12}}>
                  {Array.from({length: neededCount}).map((_, i) => {
                    const w = finalList[i];
                    const filled = Boolean(w);
                    return (
                      <div key={`winner-card-${i}`} style={{
                        padding:"14px 16px",
                        borderRadius:16,
                        border:filled ? "1px solid rgba(16,185,129,.22)" : "1px dashed rgba(255,255,255,.12)",
                        background:filled ? "rgba(16,185,129,.08)" : "rgba(255,255,255,.03)",
                        minHeight:168,
                      }}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                          <div style={{fontSize:11,color:"rgba(255,255,255,.32)",fontWeight:700}}>
                            {mode==="position" ? `${w?.place || (neededCount - i)}-o'rin` : `#${i + 1}`}
                          </div>
                          {filled ? (
                            <span style={{fontSize:10,padding:"3px 8px",borderRadius:999,background:"rgba(16,185,129,.18)",color:"#86efac"}}>
                              G'olib
                            </span>
                          ) : (
                            <span style={{fontSize:10,padding:"3px 8px",borderRadius:999,background:"rgba(255,255,255,.06)",color:"rgba(255,255,255,.4)"}}>
                              X
                            </span>
                          )}
                        </div>
                        {filled ? (
                          <>
                            <div style={{fontSize:15,fontWeight:900,color:"#fff",marginBottom:8,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                              {w.name}
                            </div>
                            <div style={{fontSize:12,fontFamily:"monospace",fontWeight:800,color:"#a78bfa",marginBottom:6,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                              {w.promoCode}
                            </div>
                            <div style={{fontSize:12,color:"rgba(255,255,255,.55)",marginBottom:5,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                              📞 {w.phone || "—"}
                            </div>
                            <div style={{fontSize:12,color:"rgba(255,255,255,.5)",marginBottom:5,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                              📍 {w.region || "—"}
                            </div>
                            <div style={{fontSize:11,color:"rgba(255,255,255,.4)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                              🆔 {w.telegramId ? String(w.telegramId) : "—"}
                            </div>
                            {w.seasonName && (
                              <div style={{fontSize:10,color:"rgba(255,255,255,.28)",marginTop:8,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                                🎭 {w.seasonName}
                              </div>
                            )}
                          </>
                        ) : (
                          <div style={{height:"100%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:36,fontWeight:900,color:"rgba(255,255,255,.16)"}}>
                            X
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Buttons */}
              <div style={{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"center"}}>
                {(sessionDone || poolExhausted) && (
                  <>
                    <Btn onClick={()=>handleNotify(finalList,mode==="position"?`${posTarget}-o'rin`:`${neededCount} g'olib`)} color="#0ea5e9">📤 Xabar yuborish</Btn>
                    <Btn onClick={()=>handleSave(finalList)} color="#10b981">💾 Saqlash</Btn>
                    <Btn onClick={()=>dlXlsx(finalList,`goliblar_${Date.now()}`)} color="#6366f1">📥 XLSX</Btn>
                  </>
                )}
                <Btn onClick={handleReset} color="#ef4444">🔄 Qayta boshlash</Btn>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════ SAVED TAB ══════ */}
      {tab==="saved" && (
        <div style={{maxWidth:840,margin:"0 auto"}}>
          <button onClick={loadSaved} style={{...Btn.baseStyle,marginBottom:12,padding:"7px 16px",background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.1)",borderRadius:8,color:"rgba(255,255,255,.6)",cursor:"pointer",fontSize:13,fontFamily:"inherit"}}>🔄 Yangilash</button>
          {sessLoad ? (
            <div style={{textAlign:"center",padding:48,color:"rgba(255,255,255,.3)"}}>⏳ Yuklanmoqda...</div>
          ) : sessions.length===0 ? (
            <div style={{textAlign:"center",padding:48,color:"rgba(255,255,255,.25)"}}>
              <div style={{fontSize:40}}>📋</div><p>Saqlangan sessiyalar yo'q</p>
            </div>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {sessions.map(s=>(
                <div key={s._id} style={{...glass(12),display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
                  <div>
                    <div style={{fontWeight:700,fontSize:14}}>{s.title}</div>
                    <div style={{fontSize:12,color:"rgba(255,255,255,.3)",marginTop:3}}>
                      🏆 {s.winners?.length||0} g'olib · {new Date(s.createdAt).toLocaleDateString("uz-UZ")}
                    </div>
                  </div>
                  <div style={{display:"flex",gap:6}}>
                    <Btn onClick={()=>setModalSess(s)} color="#6366f1">👁</Btn>
                    <Btn onClick={()=>handleNotify(s.winners||[],s.title)} color="#0ea5e9">📤</Btn>
                    <Btn onClick={()=>dlXlsx(s.winners||[],`${s.title.replace(/[^\w]/g,"_")}`)} color="#10b981">📥</Btn>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {modalSess && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,backdropFilter:"blur(4px)"}}
          onClick={()=>setModalSess(null)}>
          <div style={{background:"#0f172a",border:"1px solid rgba(255,255,255,.1)",borderRadius:16,padding:22,width:"90%",maxWidth:700,maxHeight:"80vh",overflow:"auto"}}
            onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <h3 style={{margin:0,fontSize:15,color:"#a78bfa"}}>🏆 {modalSess.title}</h3>
              <button onClick={()=>setModalSess(null)} style={{background:"rgba(255,255,255,.07)",border:"none",borderRadius:7,cursor:"pointer",color:"rgba(255,255,255,.5)",fontSize:15,padding:"3px 9px"}}>✕</button>
            </div>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12.5}}>
              <thead>
                <tr style={{borderBottom:"1px solid rgba(255,255,255,.08)"}}>
                  {["#","Ism","Telefon","Viloyat","Kod","Mavsum"].map(h=>(
                    <th key={h} style={{padding:"7px 10px",textAlign:"left",color:"rgba(255,255,255,.3)",fontWeight:600,fontSize:10}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(modalSess.winners||[]).map((w,i)=>(
                  <tr key={i} style={{borderBottom:"1px solid rgba(255,255,255,.05)"}}>
                    <td style={{padding:"8px 10px",color:"rgba(255,255,255,.3)"}}>{i+1}</td>
                    <td style={{padding:"8px 10px",fontWeight:600}}>{w.name}</td>
                    <td style={{padding:"8px 10px",fontFamily:"monospace"}}>{w.phone}</td>
                    <td style={{padding:"8px 10px"}}>{w.region}</td>
                    <td style={{padding:"8px 10px",fontFamily:"monospace",color:"#a78bfa",fontWeight:700}}>{w.promoCode}</td>
                    <td style={{padding:"8px 10px",color:"rgba(255,255,255,.3)",fontSize:11}}>{w.seasonName||"—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{display:"flex",gap:8,marginTop:14,justifyContent:"flex-end"}}>
              <Btn onClick={()=>handleNotify(modalSess.winners||[],modalSess.title)} color="#0ea5e9">📤 Xabar yuborish</Btn>
              <Btn onClick={()=>dlXlsx(modalSess.winners||[],`${modalSess.title.replace(/[^\w]/g,"_")}`)} color="#10b981">📥 XLSX</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Style helpers ────────────────────────────────────────────────────────────
const glass = (r=16) => ({
  background:"rgba(255,255,255,.04)",
  backdropFilter:"blur(14px)",
  border:"1px solid rgba(255,255,255,.08)",
  borderRadius:r, padding:"18px 20px",
});

function Label({children}) {
  return <div style={{fontSize:10,color:"rgba(255,255,255,.35)",marginBottom:6,fontWeight:600,textTransform:"uppercase",letterSpacing:.6}}>{children}</div>;
}

function Stat({label,value,color}) {
  return (
    <div style={{textAlign:"center",padding:"12px 18px",background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.08)",borderRadius:12}}>
      <div style={{fontSize:24,fontWeight:900,color}}>{typeof value==="number"?value.toLocaleString():value}</div>
      <div style={{fontSize:11,color:"rgba(255,255,255,.35)",marginTop:3}}>{label}</div>
    </div>
  );
}
