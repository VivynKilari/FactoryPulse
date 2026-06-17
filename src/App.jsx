
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  PieChart, Pie, Cell, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ComposedChart, ReferenceLine
} from "recharts";

// ─────────────────────────────────────────────
// DESIGN TOKENS — Industrial Dark Theme
// ─────────────────────────────────────────────
const T = {
  bg0: "#060A10",      // deepest background
  bg1: "#0C1220",      // panel background
  bg2: "#101828",      // card background
  bg3: "#1A2540",      // elevated card
  border: "#1E2D4A",   // subtle border
  accent: "#00D4FF",   // cyan primary
  accent2: "#0088FF",  // blue secondary
  green: "#00E676",
  yellow: "#FFD600",
  red: "#FF3D57",
  purple: "#B84DFF",
  orange: "#FF6B35",
  text: "#E8F0FE",
  textMid: "#8899BB",
  textDim: "#445577",
};

// ─────────────────────────────────────────────
// DATA ENGINE — Realistic Manufacturing Simulation
// ─────────────────────────────────────────────
const MACHINES = [
  { id: "PRS-01", name: "Press Machine 1",    type: "Press",     line: "Line A", idealRate: 120 },
  { id: "PRS-02", name: "Press Machine 2",    type: "Press",     line: "Line A", idealRate: 115 },
  { id: "CNC-01", name: "CNC Machine 1",      type: "CNC",       line: "Line B", idealRate: 60  },
  { id: "CNC-02", name: "CNC Machine 2",      type: "CNC",       line: "Line B", idealRate: 58  },
  { id: "WLD-01", name: "Welding Robot",      type: "Robot",     line: "Line C", idealRate: 80  },
  { id: "ASM-01", name: "Assembly Robot",     type: "Robot",     line: "Line C", idealRate: 70  },
  { id: "CVY-01", name: "Conveyor System",    type: "Conveyor",  line: "Line D", idealRate: 200 },
  { id: "PKG-01", name: "Packaging Station",  type: "Packaging", line: "Line D", idealRate: 150 },
];

const SHIFTS = [
  { id: "A", name: "Shift A", start: "06:00", end: "14:00" },
  { id: "B", name: "Shift B", start: "14:00", end: "22:00" },
  { id: "C", name: "Shift C", start: "22:00", end: "06:00" },
];

const DOWNTIME_CAUSES = [
  "Mechanical Failure", "Electrical Failure", "Sensor Failure",
  "Material Shortage", "Maintenance", "Power Failure",
  "Quality Inspection Hold", "Operator Unavailable"
];

const DEFECT_TYPES = [
  "Dimension Error", "Surface Defect", "Missing Component",
  "Alignment Error", "Electrical Fault", "Assembly Error"
];

const STATUS_MAP = { Running: T.green, Idle: T.yellow, Breakdown: T.red, Maintenance: T.purple };

function seededRand(seed) {
  let s = seed;
  return () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646; };
}

function generateHistoricalData() {
  const rand = seededRand(42);
  const records = [];
  const now = new Date();
  for (let d = 364; d >= 0; d--) {
    const date = new Date(now);
    date.setDate(date.getDate() - d);
    const dateStr = date.toISOString().split("T")[0];
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    MACHINES.forEach(m => {
      SHIFTS.forEach(sh => {
        const plannedTime = 480; // 8 hour shift in minutes
        const baseAvail = isWeekend ? 0.72 : 0.82 + rand() * 0.12;
        const downtime = Math.floor((1 - baseAvail) * plannedTime);
        const runTime = plannedTime - downtime;
        const availability = runTime / plannedTime;
        const performance = 0.75 + rand() * 0.2;
        const quality = 0.88 + rand() * 0.1;
        const oee = availability * performance * quality;
        const idealOutput = Math.floor(runTime * (m.idealRate / 60));
        const actualOutput = Math.floor(idealOutput * performance);
        const goodParts = Math.floor(actualOutput * quality);
        const defects = actualOutput - goodParts;
        const dtCause = DOWNTIME_CAUSES[Math.floor(rand() * DOWNTIME_CAUSES.length)];
        const defectType = DEFECT_TYPES[Math.floor(rand() * DEFECT_TYPES.length)];
        const temp = 45 + rand() * 40;
        const vibration = 0.5 + rand() * 3.5;
        const energy = 10 + rand() * 80;
        const health = Math.min(100, 60 + rand() * 38);
        const mtbf = 180 + rand() * 480;
        const mttr = 15 + rand() * 90;
        records.push({
          date: dateStr, machine: m.id, machineName: m.name, type: m.type,
          line: m.line, shift: sh.id, plannedTime, runTime, downtime,
          availability: +availability.toFixed(4), performance: +performance.toFixed(4),
          quality: +quality.toFixed(4), oee: +oee.toFixed(4),
          idealOutput, actualOutput, goodParts, defects,
          dtCause, defectType, temp: +temp.toFixed(1),
          vibration: +vibration.toFixed(2), energy: +energy.toFixed(1),
          health: +health.toFixed(1), mtbf: +mtbf.toFixed(0), mttr: +mttr.toFixed(0),
        });
      });
    });
  }
  return records;
}

const ALL_DATA = generateHistoricalData();

function getDateRange(data, days) {
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - days);
  return data.filter(r => new Date(r.date) >= cutoff);
}

function aggregateByDate(data) {
  const map = {};
  data.forEach(r => {
    if (!map[r.date]) map[r.date] = { date: r.date, oee: [], avail: [], perf: [], qual: [], output: [], defects: 0, downtime: 0 };
    map[r.date].oee.push(r.oee);
    map[r.date].avail.push(r.availability);
    map[r.date].perf.push(r.performance);
    map[r.date].qual.push(r.quality);
    map[r.date].output.push(r.actualOutput);
    map[r.date].defects += r.defects;
    map[r.date].downtime += r.downtime;
  });
  return Object.values(map).map(d => ({
    date: d.date,
    oee: +(d.oee.reduce((a, b) => a + b, 0) / d.oee.length * 100).toFixed(1),
    availability: +(d.avail.reduce((a, b) => a + b, 0) / d.avail.length * 100).toFixed(1),
    performance: +(d.perf.reduce((a, b) => a + b, 0) / d.perf.length * 100).toFixed(1),
    quality: +(d.qual.reduce((a, b) => a + b, 0) / d.qual.length * 100).toFixed(1),
    output: d.output.reduce((a, b) => a + b, 0),
    defects: d.defects,
    downtime: d.downtime,
  })).sort((a, b) => a.date.localeCompare(b.date));
}

function getTodayStats() {
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];
  const todayData = ALL_DATA.filter(r => r.date === today);
  const yesterdayData = ALL_DATA.filter(r => r.date === yesterdayStr);
  const calc = (d) => d.length === 0 ? null : {
    oee: d.reduce((a, r) => a + r.oee, 0) / d.length,
    availability: d.reduce((a, r) => a + r.availability, 0) / d.length,
    performance: d.reduce((a, r) => a + r.performance, 0) / d.length,
    quality: d.reduce((a, r) => a + r.quality, 0) / d.length,
    output: d.reduce((a, r) => a + r.actualOutput, 0),
    goodParts: d.reduce((a, r) => a + r.goodParts, 0),
    defects: d.reduce((a, r) => a + r.defects, 0),
    downtime: d.reduce((a, r) => a + r.downtime, 0),
  };
  // Use last 7 days as "today" since today may not be in history
  const recent = getDateRange(ALL_DATA, 1);
  const prev = ALL_DATA.filter(r => {
    const d = new Date(r.date);
    const now = new Date();
    const twoDaysAgo = new Date(now); twoDaysAgo.setDate(now.getDate() - 2);
    const oneDayAgo = new Date(now); oneDayAgo.setDate(now.getDate() - 1);
    return d >= twoDaysAgo && d < oneDayAgo;
  });
  return { today: calc(recent.length > 0 ? recent : getDateRange(ALL_DATA, 2).slice(0, 24)), yesterday: calc(prev.length > 0 ? prev : getDateRange(ALL_DATA, 3).slice(24, 48)) };
}

// ─────────────────────────────────────────────
// LIVE SIMULATION STATE
// ─────────────────────────────────────────────
function generateLiveMachineState(tick) {
  const rand = seededRand(tick * 137 + 91);
  return MACHINES.map((m, i) => {
    const r = seededRand(tick * 31 + i * 17);
    const statusRoll = r();
    let status = statusRoll > 0.12 ? "Running" : statusRoll > 0.07 ? "Idle" : statusRoll > 0.03 ? "Breakdown" : "Maintenance";
    const availability = status === "Running" ? 0.78 + r() * 0.18 : status === "Idle" ? 0.5 + r() * 0.2 : 0.1 + r() * 0.15;
    const performance = status === "Running" ? 0.8 + r() * 0.18 : 0.4 + r() * 0.2;
    const quality = 0.88 + r() * 0.1;
    const oee = availability * performance * quality;
    const count = status === "Running" ? Math.floor(m.idealRate * (420 / 60) * performance) : Math.floor(m.idealRate * (200 / 60) * performance);
    const defects = Math.floor(count * (1 - quality));
    const temp = status === "Running" ? 55 + r() * 35 : 30 + r() * 20;
    const vibration = status === "Running" ? 1.5 + r() * 2.5 : 0.2 + r() * 0.5;
    const energy = status === "Running" ? 30 + r() * 60 : 5 + r() * 15;
    const health = 55 + r() * 43;
    return {
      ...m, status,
      oee: +(oee * 100).toFixed(1),
      availability: +(availability * 100).toFixed(1),
      performance: +(performance * 100).toFixed(1),
      quality: +(quality * 100).toFixed(1),
      count, defects,
      downtime: status === "Running" ? Math.floor(r() * 45) : Math.floor(45 + r() * 180),
      temp: +temp.toFixed(1), vibration: +vibration.toFixed(2),
      energy: +energy.toFixed(1), health: +health.toFixed(0),
      shift: SHIFTS[Math.floor((new Date().getHours()) / 8)].id,
    };
  });
}

// ─────────────────────────────────────────────
// UTILITY COMPONENTS
// ─────────────────────────────────────────────
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Space Grotesk', sans-serif; background: ${T.bg0}; color: ${T.text}; }
  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: ${T.bg1}; }
  ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 2px; }
  .mono { font-family: 'JetBrains Mono', monospace; }
  .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .4; } }
  .animate-spin { animation: spin 1s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .glow-cyan { box-shadow: 0 0 20px rgba(0, 212, 255, 0.15); }
  .glow-green { box-shadow: 0 0 15px rgba(0, 230, 118, 0.2); }
  .glow-red { box-shadow: 0 0 15px rgba(255, 61, 87, 0.2); }
  @keyframes flow { 0% { stroke-dashoffset: 40; } 100% { stroke-dashoffset: 0; } }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  .fade-in { animation: fadeIn 0.3s ease forwards; }
  @keyframes scanline { 0% { top: 0; } 100% { top: 100%; } }
`;

function Badge({ color, children }) {
  return (
    <span style={{
      background: color + "22", color, border: `1px solid ${color}44`,
      padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 600,
      letterSpacing: "0.05em", textTransform: "uppercase",
    }}>{children}</span>
  );
}

function StatusDot({ status }) {
  const color = STATUS_MAP[status] || T.textMid;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
      <span style={{
        width: 7, height: 7, borderRadius: "50%", background: color,
        boxShadow: `0 0 6px ${color}`, display: "inline-block",
        animation: status === "Running" ? "pulse 1.5s infinite" : "none",
      }} />
      <span style={{ color, fontSize: 11, fontWeight: 600 }}>{status}</span>
    </span>
  );
}

function KPIGauge({ value, max = 100, label, color = T.accent, size = 80 }) {
  const pct = Math.min(value / max, 1);
  const r = size / 2 - 8;
  const circ = 2 * Math.PI * r;
  const dash = pct * circ * 0.75;
  const rotation = -135;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={T.border} strokeWidth={6}
        strokeDasharray={`${circ * 0.75} ${circ}`} strokeLinecap="round"
        transform={`rotate(${rotation} ${size / 2} ${size / 2})`} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={6}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform={`rotate(${rotation} ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dasharray 0.5s ease" }} />
      <text x={size / 2} y={size / 2 + 4} textAnchor="middle" fill={T.text}
        fontSize={size * 0.2} fontWeight="700" fontFamily="JetBrains Mono">
        {value}%
      </text>
      <text x={size / 2} y={size / 2 + 16} textAnchor="middle" fill={T.textMid} fontSize={8}>
        {label}
      </text>
    </svg>
  );
}

function Trend({ value, prev }) {
  if (!prev) return null;
  const diff = value - prev;
  const pct = prev !== 0 ? ((diff / prev) * 100).toFixed(1) : 0;
  const up = diff >= 0;
  return (
    <span style={{ color: up ? T.green : T.red, fontSize: 11, fontWeight: 600 }}>
      {up ? "▲" : "▼"} {Math.abs(pct)}%
    </span>
  );
}

function Card({ children, style = {}, glow }) {
  return (
    <div style={{
      background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 10,
      padding: "16px 20px", ...(glow ? { boxShadow: `0 0 20px ${glow}22` } : {}),
      ...style
    }}>{children}</div>
  );
}

function SectionTitle({ icon, title, sub }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: T.text }}>{title}</h2>
      </div>
      {sub && <p style={{ color: T.textMid, fontSize: 12, marginTop: 4, marginLeft: 30 }}>{sub}</p>}
    </div>
  );
}

function ProgressBar({ value, max = 100, color = T.accent, label, showVal = true }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div style={{ marginBottom: 8 }}>
      {label && <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 12 }}>
        <span style={{ color: T.textMid }}>{label}</span>
        {showVal && <span style={{ color, fontFamily: "JetBrains Mono", fontWeight: 600 }}>{value.toFixed ? value.toFixed(1) : value}%</span>}
      </div>}
      <div style={{ height: 6, background: T.border, borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg, ${color}88, ${color})`, borderRadius: 3, transition: "width 0.5s ease" }} />
      </div>
    </div>
  );
}

const TOOLTIP_STYLE = {
  background: T.bg3, border: `1px solid ${T.border}`, borderRadius: 8,
  color: T.text, fontSize: 12, fontFamily: "JetBrains Mono",
};

// ─────────────────────────────────────────────
// PAGE: EXECUTIVE DASHBOARD
// ─────────────────────────────────────────────
function DashboardPage({ liveData }) {
  const { today, yesterday } = useMemo(() => getTodayStats(), []);
  const t = today || { oee: 0.782, availability: 0.889, performance: 0.913, quality: 0.964, output: 184320, goodParts: 177656, defects: 6664, downtime: 1842 };
  const y = yesterday || {};
  const trend7 = useMemo(() => aggregateByDate(getDateRange(ALL_DATA, 30)).slice(-14), []);
  const liveAgg = useMemo(() => {
    if (!liveData.length) return {};
    const running = liveData.filter(m => m.status === "Running").length;
    const offline = liveData.filter(m => m.status === "Breakdown").length;
    const avgOEE = liveData.reduce((a, m) => a + m.oee, 0) / liveData.length;
    return { running, offline, avgOEE: avgOEE.toFixed(1) };
  }, [liveData]);

  const kpis = [
    { label: "Overall OEE", value: (t.oee * 100).toFixed(1), prev: y.oee ? (y.oee * 100).toFixed(1) : null, color: T.accent, unit: "%", icon: "⬡", sub: "Availability × Performance × Quality" },
    { label: "Availability", value: (t.availability * 100).toFixed(1), prev: y.availability ? (y.availability * 100).toFixed(1) : null, color: T.green, unit: "%", icon: "◈", sub: "Run Time / Planned Time" },
    { label: "Performance", value: (t.performance * 100).toFixed(1), prev: y.performance ? (y.performance * 100).toFixed(1) : null, color: T.accent2, unit: "%", icon: "◉", sub: "Actual / Ideal Output" },
    { label: "Quality Rate", value: (t.quality * 100).toFixed(1), prev: y.quality ? (y.quality * 100).toFixed(1) : null, color: T.purple, unit: "%", icon: "◇", sub: "Good Parts / Total Parts" },
  ];

  const secKpis = [
    { label: "Total Output", value: (t.output || 184320).toLocaleString(), color: T.text, icon: "📦", unit: "pcs" },
    { label: "Good Parts", value: (t.goodParts || 177656).toLocaleString(), color: T.green, icon: "✓", unit: "pcs" },
    { label: "Defects", value: (t.defects || 6664).toLocaleString(), color: T.red, icon: "✗", unit: "pcs" },
    { label: "Downtime", value: (t.downtime || 1842).toLocaleString(), color: T.yellow, icon: "⏱", unit: "min" },
    { label: "Active Machines", value: liveAgg.running || "6", color: T.green, icon: "⚙", unit: "/ 8" },
    { label: "Offline", value: liveAgg.offline || "1", color: T.red, icon: "⊗", unit: "machines" },
  ];

  const fei = ((t.oee * 0.4 + t.availability * 0.2 + t.performance * 0.2 + t.quality * 0.2) * 100).toFixed(1);
  const energyTotal = liveData.reduce((a, m) => a + m.energy, 0).toFixed(0);
  const avgHealth = liveData.length ? (liveData.reduce((a, m) => a + m.health, 0) / liveData.length).toFixed(0) : 78;

  return (
    <div className="fade-in">
      {/* Hero OEE Block */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 20 }}>
        {kpis.map(k => (
          <Card key={k.label} glow={k.color} style={{ position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${k.color}00, ${k.color}, ${k.color}00)` }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ color: T.textMid, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>{k.label}</div>
                <div style={{ fontSize: 36, fontWeight: 700, color: k.color, fontFamily: "JetBrains Mono", lineHeight: 1 }}>
                  {k.value}<span style={{ fontSize: 16, opacity: 0.7 }}>{k.unit}</span>
                </div>
                <div style={{ marginTop: 6 }}>
                  {k.prev && <Trend value={parseFloat(k.value)} prev={parseFloat(k.prev)} />}
                </div>
                <div style={{ color: T.textDim, fontSize: 10, marginTop: 4 }}>{k.sub}</div>
              </div>
              <KPIGauge value={parseFloat(k.value)} color={k.color} size={72} label="" />
            </div>
          </Card>
        ))}
      </div>

      {/* Secondary KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12, marginBottom: 20 }}>
        {secKpis.map(k => (
          <Card key={k.label} style={{ textAlign: "center", padding: "12px 8px" }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>{k.icon}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: k.color, fontFamily: "JetBrains Mono" }}>{k.value}</div>
            <div style={{ fontSize: 10, color: T.textMid, textTransform: "uppercase", letterSpacing: "0.06em" }}>{k.label}</div>
            <div style={{ fontSize: 10, color: T.textDim }}>{k.unit}</div>
          </Card>
        ))}
      </div>

      {/* Industry 4.0 Index Row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
        <Card style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ fontSize: 28 }}>🏭</div>
          <div>
            <div style={{ color: T.textMid, fontSize: 10, textTransform: "uppercase" }}>Factory Efficiency Index</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: T.accent, fontFamily: "JetBrains Mono" }}>{fei}%</div>
          </div>
        </Card>
        <Card style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ fontSize: 28 }}>⚡</div>
          <div>
            <div style={{ color: T.textMid, fontSize: 10, textTransform: "uppercase" }}>Energy Consumption</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: T.yellow, fontFamily: "JetBrains Mono" }}>{energyTotal} kWh</div>
          </div>
        </Card>
        <Card style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ fontSize: 28 }}>🤖</div>
          <div>
            <div style={{ color: T.textMid, fontSize: 10, textTransform: "uppercase" }}>Avg Machine Health</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: T.green, fontFamily: "JetBrains Mono" }}>{avgHealth}%</div>
          </div>
        </Card>
        <Card style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ fontSize: 28 }}>🌿</div>
          <div>
            <div style={{ color: T.textMid, fontSize: 10, textTransform: "uppercase" }}>CO₂ Estimate</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: T.orange, fontFamily: "JetBrains Mono" }}>{(energyTotal * 0.42).toFixed(0)} kg</div>
          </div>
        </Card>
      </div>

      {/* Charts Row */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
        <Card>
          <div style={{ color: T.textMid, fontSize: 12, marginBottom: 14, fontWeight: 600 }}>14-DAY OEE TREND</div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trend7}>
              <defs>
                <linearGradient id="oeeg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={T.accent} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={T.accent} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="availg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={T.green} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={T.green} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
              <XAxis dataKey="date" tick={{ fill: T.textDim, fontSize: 10 }} tickFormatter={d => d.slice(5)} />
              <YAxis domain={[60, 100]} tick={{ fill: T.textDim, fontSize: 10 }} unit="%" />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [v + "%"]} />
              <Legend wrapperStyle={{ fontSize: 11, color: T.textMid }} />
              <ReferenceLine y={85} stroke={T.accent} strokeDasharray="4 4" strokeOpacity={0.5} label={{ value: "Target", fill: T.accent, fontSize: 10 }} />
              <Area type="monotone" dataKey="oee" stroke={T.accent} fill="url(#oeeg)" strokeWidth={2} name="OEE" dot={false} />
              <Area type="monotone" dataKey="availability" stroke={T.green} fill="url(#availg)" strokeWidth={2} name="Availability" dot={false} />
              <Line type="monotone" dataKey="performance" stroke={T.accent2} strokeWidth={2} name="Performance" dot={false} />
              <Line type="monotone" dataKey="quality" stroke={T.purple} strokeWidth={2} name="Quality" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <div style={{ color: T.textMid, fontSize: 12, marginBottom: 14, fontWeight: 600 }}>LIVE MACHINE STATUS</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {liveData.map(m => (
              <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: T.bg3, borderRadius: 6, border: `1px solid ${T.border}` }}>
                <StatusDot status={m.status} />
                <span style={{ flex: 1, fontSize: 11, color: T.textMid }}>{m.name.replace(" Machine", " ").replace(" System", "")}</span>
                <span style={{ color: T.accent, fontFamily: "JetBrains Mono", fontSize: 11, fontWeight: 600 }}>{m.oee}%</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// PAGE: FACTORY FLOOR
// ─────────────────────────────────────────────
function FactoryFloorPage({ liveData, tick }) {
  const [selected, setSelected] = useState(null);

  return (
    <div className="fade-in">
      <SectionTitle icon="🏭" title="Real-Time Factory Floor" sub="Live machine telemetry — updates every 3 seconds" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 20 }}>
        {liveData.map(m => {
          const color = STATUS_MAP[m.status];
          const isSelected = selected === m.id;
          return (
            <div key={m.id} onClick={() => setSelected(isSelected ? null : m.id)}
              style={{
                background: T.bg2, border: `1px solid ${isSelected ? color : T.border}`,
                borderRadius: 12, padding: 16, cursor: "pointer",
                boxShadow: isSelected ? `0 0 20px ${color}33` : "none",
                transition: "all 0.2s ease", position: "relative", overflow: "hidden",
              }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: color }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: T.text }}>{m.name}</div>
                  <div style={{ fontSize: 10, color: T.textMid, marginTop: 2 }}>{m.id} • {m.line}</div>
                </div>
                <StatusDot status={m.status} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                <div style={{ background: T.bg3, borderRadius: 6, padding: "8px 10px" }}>
                  <div style={{ fontSize: 9, color: T.textDim, textTransform: "uppercase" }}>OEE</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: T.accent, fontFamily: "JetBrains Mono" }}>{m.oee}%</div>
                </div>
                <div style={{ background: T.bg3, borderRadius: 6, padding: "8px 10px" }}>
                  <div style={{ fontSize: 9, color: T.textDim, textTransform: "uppercase" }}>Output</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: T.green, fontFamily: "JetBrains Mono" }}>{m.count.toLocaleString()}</div>
                </div>
              </div>

              <ProgressBar value={m.availability} label="Availability" color={T.green} />
              <ProgressBar value={m.performance} label="Performance" color={T.accent2} />
              <ProgressBar value={m.quality} label="Quality" color={T.purple} />

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginTop: 10 }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 9, color: T.textDim }}>TEMP</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: m.temp > 75 ? T.red : T.yellow, fontFamily: "JetBrains Mono" }}>{m.temp}°C</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 9, color: T.textDim }}>VIBR</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: m.vibration > 3 ? T.red : T.accent, fontFamily: "JetBrains Mono" }}>{m.vibration}g</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 9, color: T.textDim }}>ENERGY</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: T.orange, fontFamily: "JetBrains Mono" }}>{m.energy}kW</div>
                </div>
              </div>

              <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span style={{ fontSize: 9, color: T.textDim }}>DEFECTS: </span>
                  <span style={{ fontSize: 11, color: T.red, fontFamily: "JetBrains Mono", fontWeight: 600 }}>{m.defects}</span>
                </div>
                <div>
                  <span style={{ fontSize: 9, color: T.textDim }}>DT: </span>
                  <span style={{ fontSize: 11, color: T.yellow, fontFamily: "JetBrains Mono", fontWeight: 600 }}>{m.downtime}m</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 30, height: 4, background: T.border, borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ width: `${m.health}%`, height: "100%", background: m.health > 70 ? T.green : m.health > 40 ? T.yellow : T.red, borderRadius: 2 }} />
                  </div>
                  <span style={{ fontSize: 9, color: T.textDim }}>{m.health}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {[
          { status: "Running", count: liveData.filter(m => m.status === "Running").length, color: T.green },
          { status: "Idle", count: liveData.filter(m => m.status === "Idle").length, color: T.yellow },
          { status: "Breakdown", count: liveData.filter(m => m.status === "Breakdown").length, color: T.red },
          { status: "Maintenance", count: liveData.filter(m => m.status === "Maintenance").length, color: T.purple },
        ].map(s => (
          <Card key={s.status} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px" }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: s.color + "22", display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${s.color}44` }}>
              <span style={{ color: s.color, fontSize: 16, fontWeight: 700 }}>{s.count}</span>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: s.color }}>{s.status}</div>
              <div style={{ fontSize: 10, color: T.textDim }}>Machines</div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// PAGE: OEE ANALYTICS
// ─────────────────────────────────────────────
function OEEAnalyticsPage() {
  const [range, setRange] = useState(30);
  const [machine, setMachine] = useState("ALL");

  const data = useMemo(() => {
    let d = getDateRange(ALL_DATA, range);
    if (machine !== "ALL") d = d.filter(r => r.machine === machine);
    return aggregateByDate(d);
  }, [range, machine]);

  const shiftData = useMemo(() => {
    const d = getDateRange(ALL_DATA, range);
    const grouped = { A: [], B: [], C: [] };
    d.forEach(r => { if (grouped[r.shift]) grouped[r.shift].push(r); });
    return Object.entries(grouped).map(([sh, rows]) => ({
      shift: `Shift ${sh}`,
      oee: +(rows.reduce((a, r) => a + r.oee, 0) / rows.length * 100).toFixed(1),
      availability: +(rows.reduce((a, r) => a + r.availability, 0) / rows.length * 100).toFixed(1),
      performance: +(rows.reduce((a, r) => a + r.performance, 0) / rows.length * 100).toFixed(1),
      quality: +(rows.reduce((a, r) => a + r.quality, 0) / rows.length * 100).toFixed(1),
    }));
  }, [range]);

  const radarData = useMemo(() => {
    if (!data.length) return [];
    const avg = (key) => (data.reduce((a, d) => a + d[key], 0) / data.length).toFixed(1);
    return [
      { metric: "OEE", value: avg("oee") },
      { metric: "Availability", value: avg("availability") },
      { metric: "Performance", value: avg("performance") },
      { metric: "Quality", value: avg("quality") },
      { metric: "Uptime", value: (avg("availability") * 0.95).toFixed(1) },
      { metric: "Utilization", value: (avg("performance") * 0.92).toFixed(1) },
    ];
  }, [data]);

  const rangeButtons = [{ v: 7, l: "7D" }, { v: 30, l: "30D" }, { v: 90, l: "90D" }, { v: 365, l: "1Y" }];

  return (
    <div className="fade-in">
      <SectionTitle icon="📊" title="OEE Analytics" sub="Trend analysis across availability, performance, and quality dimensions" />

      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 4 }}>
          {rangeButtons.map(b => (
            <button key={b.v} onClick={() => setRange(b.v)} style={{
              padding: "6px 14px", borderRadius: 6, border: `1px solid ${range === b.v ? T.accent : T.border}`,
              background: range === b.v ? T.accent + "22" : T.bg2, color: range === b.v ? T.accent : T.textMid,
              cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "Space Grotesk",
            }}>{b.l}</button>
          ))}
        </div>
        <select value={machine} onChange={e => setMachine(e.target.value)} style={{
          padding: "6px 12px", borderRadius: 6, border: `1px solid ${T.border}`,
          background: T.bg2, color: T.text, fontSize: 12, cursor: "pointer",
        }}>
          <option value="ALL">All Machines</option>
          {MACHINES.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <Card>
          <div style={{ color: T.textMid, fontSize: 11, fontWeight: 600, marginBottom: 12, letterSpacing: "0.06em" }}>OEE & AVAILABILITY TREND</div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data}>
              <defs>
                <linearGradient id="og2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={T.accent} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={T.accent} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
              <XAxis dataKey="date" tick={{ fill: T.textDim, fontSize: 9 }} tickFormatter={d => d.slice(5)} interval={Math.floor(data.length / 6)} />
              <YAxis domain={[50, 100]} tick={{ fill: T.textDim, fontSize: 9 }} unit="%" />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <ReferenceLine y={85} stroke={T.accent} strokeDasharray="3 3" opacity={0.4} />
              <Area type="monotone" dataKey="oee" stroke={T.accent} fill="url(#og2)" strokeWidth={2} name="OEE" dot={false} />
              <Line type="monotone" dataKey="availability" stroke={T.green} strokeWidth={2} name="Availability" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <div style={{ color: T.textMid, fontSize: 11, fontWeight: 600, marginBottom: 12, letterSpacing: "0.06em" }}>PERFORMANCE & QUALITY TREND</div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
              <XAxis dataKey="date" tick={{ fill: T.textDim, fontSize: 9 }} tickFormatter={d => d.slice(5)} interval={Math.floor(data.length / 6)} />
              <YAxis domain={[70, 100]} tick={{ fill: T.textDim, fontSize: 9 }} unit="%" />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="performance" stroke={T.accent2} strokeWidth={2} name="Performance" dot={false} />
              <Line type="monotone" dataKey="quality" stroke={T.purple} strokeWidth={2} name="Quality" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Card>
          <div style={{ color: T.textMid, fontSize: 11, fontWeight: 600, marginBottom: 12 }}>SHIFT OEE COMPARISON</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={shiftData}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
              <XAxis dataKey="shift" tick={{ fill: T.textDim, fontSize: 11 }} />
              <YAxis domain={[60, 100]} tick={{ fill: T.textDim, fontSize: 9 }} unit="%" />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="oee" fill={T.accent} name="OEE" radius={[4, 4, 0, 0]} />
              <Bar dataKey="availability" fill={T.green} name="Availability" radius={[4, 4, 0, 0]} />
              <Bar dataKey="performance" fill={T.accent2} name="Performance" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <div style={{ color: T.textMid, fontSize: 11, fontWeight: 600, marginBottom: 12 }}>PERFORMANCE RADAR</div>
          <ResponsiveContainer width="100%" height={200}>
            <RadarChart data={radarData}>
              <PolarGrid stroke={T.border} />
              <PolarAngleAxis dataKey="metric" tick={{ fill: T.textMid, fontSize: 10 }} />
              <PolarRadiusAxis domain={[60, 100]} tick={{ fill: T.textDim, fontSize: 8 }} />
              <Radar dataKey="value" stroke={T.accent} fill={T.accent} fillOpacity={0.2} name="Score" />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
            </RadarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// PAGE: DOWNTIME ANALYSIS
// ─────────────────────────────────────────────
function DowntimePage() {
  const [range, setRange] = useState(30);
  const data = useMemo(() => getDateRange(ALL_DATA, range), [range]);

  const byMachine = useMemo(() => MACHINES.map(m => {
    const rows = data.filter(r => r.machine === m.id);
    const total = rows.reduce((a, r) => a + r.downtime, 0);
    return { name: m.name.replace(" Machine", " ").replace(" System", "").replace(" Station", ""), downtime: total, count: rows.filter(r => r.downtime > 30).length };
  }).sort((a, b) => b.downtime - a.downtime), [data]);

  const byCause = useMemo(() => {
    const causeMap = {};
    data.forEach(r => {
      if (!causeMap[r.dtCause]) causeMap[r.dtCause] = { cause: r.dtCause, total: 0, count: 0 };
      causeMap[r.dtCause].total += r.downtime;
      causeMap[r.dtCause].count++;
    });
    return Object.values(causeMap).sort((a, b) => b.total - a.total);
  }, [data]);

  const totalDowntime = data.reduce((a, r) => a + r.downtime, 0);
  const pieColors = [T.red, T.orange, T.yellow, T.accent, T.green, T.purple, T.accent2, T.textMid];

  const paretoData = useMemo(() => {
    let cum = 0;
    const total = byCause.reduce((a, c) => a + c.total, 0);
    return byCause.slice(0, 8).map(c => {
      cum += c.total;
      return { ...c, pct: +((c.total / total) * 100).toFixed(1), cumPct: +((cum / total) * 100).toFixed(1) };
    });
  }, [byCause]);

  const trendData = useMemo(() => aggregateByDate(data).slice(-14), [data]);

  return (
    <div className="fade-in">
      <SectionTitle icon="⏱" title="Downtime Analysis" sub="Root cause analysis, Pareto breakdown, and CAPA tracking" />

      <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
        {[7, 30, 90, 365].map(d => (
          <button key={d} onClick={() => setRange(d)} style={{
            padding: "6px 14px", borderRadius: 6, border: `1px solid ${range === d ? T.red : T.border}`,
            background: range === d ? T.red + "22" : T.bg2, color: range === d ? T.red : T.textMid,
            cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "Space Grotesk",
          }}>{d === 365 ? "1Y" : `${d}D`}</button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total Downtime", value: (totalDowntime / 60).toFixed(0) + "h", color: T.red },
          { label: "Avg/Day", value: (totalDowntime / range / 60).toFixed(1) + "h", color: T.orange },
          { label: "Events", value: data.filter(r => r.downtime > 30).length.toLocaleString(), color: T.yellow },
          { label: "Top Cause", value: byCause[0]?.cause?.split(" ")[0] || "—", color: T.accent },
        ].map(k => (
          <Card key={k.label}>
            <div style={{ color: T.textMid, fontSize: 10, textTransform: "uppercase", marginBottom: 4 }}>{k.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: k.color, fontFamily: "JetBrains Mono" }}>{k.value}</div>
          </Card>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 16 }}>
        <Card>
          <div style={{ color: T.textMid, fontSize: 11, fontWeight: 600, marginBottom: 12 }}>PARETO ANALYSIS — TOP DOWNTIME CAUSES</div>
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={paretoData}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
              <XAxis dataKey="cause" tick={{ fill: T.textDim, fontSize: 9 }} tickFormatter={c => c.split(" ")[0]} />
              <YAxis yAxisId="left" tick={{ fill: T.textDim, fontSize: 9 }} />
              <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fill: T.textDim, fontSize: 9 }} unit="%" />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar yAxisId="left" dataKey="total" name="Downtime (min)" radius={[3, 3, 0, 0]}>
                {paretoData.map((_, i) => <Cell key={i} fill={pieColors[i % pieColors.length]} />)}
              </Bar>
              <Line yAxisId="right" type="monotone" dataKey="cumPct" stroke={T.accent} strokeWidth={2} name="Cumulative %" dot={{ fill: T.accent, r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <div style={{ color: T.textMid, fontSize: 11, fontWeight: 600, marginBottom: 12 }}>BY CAUSE</div>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={byCause.slice(0, 6)} dataKey="total" nameKey="cause" cx="50%" cy="50%" outerRadius={85} innerRadius={45} paddingAngle={2}>
                {byCause.slice(0, 6).map((_, i) => <Cell key={i} fill={pieColors[i % pieColors.length]} />)}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [(v / 60).toFixed(0) + "h"]} />
              <Legend wrapperStyle={{ fontSize: 10 }} formatter={(v) => v.split(" ")[0]} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Card>
          <div style={{ color: T.textMid, fontSize: 11, fontWeight: 600, marginBottom: 12 }}>DOWNTIME BY MACHINE (RANKED)</div>
          {byMachine.map((m, i) => (
            <div key={m.name} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <span style={{ width: 20, textAlign: "right", color: T.textDim, fontSize: 11, fontFamily: "JetBrains Mono" }}>#{i + 1}</span>
              <span style={{ width: 120, fontSize: 11, color: T.textMid, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name}</span>
              <div style={{ flex: 1, height: 8, background: T.border, borderRadius: 4, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(m.downtime / byMachine[0].downtime) * 100}%`, background: i < 2 ? T.red : i < 4 ? T.orange : T.yellow, borderRadius: 4 }} />
              </div>
              <span style={{ color: T.red, fontFamily: "JetBrains Mono", fontSize: 11, width: 60, textAlign: "right" }}>{(m.downtime / 60).toFixed(0)}h</span>
            </div>
          ))}
        </Card>

        <Card>
          <div style={{ color: T.textMid, fontSize: 11, fontWeight: 600, marginBottom: 12 }}>DOWNTIME TREND (14D)</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
              <XAxis dataKey="date" tick={{ fill: T.textDim, fontSize: 9 }} tickFormatter={d => d.slice(5)} />
              <YAxis tick={{ fill: T.textDim, fontSize: 9 }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="downtime" fill={T.red} name="Downtime (min)" radius={[3, 3, 0, 0]} fillOpacity={0.8} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// PAGE: DEFECT ANALYSIS
// ─────────────────────────────────────────────
function DefectPage() {
  const [range, setRange] = useState(30);
  const data = useMemo(() => getDateRange(ALL_DATA, range), [range]);

  const totalDefects = data.reduce((a, r) => a + r.defects, 0);
  const totalOutput = data.reduce((a, r) => a + r.actualOutput, 0);
  const defectRate = totalOutput > 0 ? ((totalDefects / totalOutput) * 100).toFixed(2) : 0;
  const fpyPct = (100 - parseFloat(defectRate)).toFixed(2);

  const byType = useMemo(() => {
    const map = {};
    data.forEach(r => {
      if (!map[r.defectType]) map[r.defectType] = 0;
      map[r.defectType] += r.defects;
    });
    return Object.entries(map).map(([k, v]) => ({ type: k, defects: v })).sort((a, b) => b.defects - a.defects);
  }, [data]);

  const byMachine = useMemo(() => MACHINES.map(m => {
    const rows = data.filter(r => r.machine === m.id);
    return { name: m.name.replace(" Machine", "").replace(" System", "").replace(" Station", ""), defects: rows.reduce((a, r) => a + r.defects, 0), rate: rows.length ? ((rows.reduce((a, r) => a + r.defects, 0) / rows.reduce((a, r) => a + r.actualOutput, 0)) * 100).toFixed(2) : 0 };
  }).sort((a, b) => b.defects - a.defects), [data]);

  const byShift = useMemo(() => ["A", "B", "C"].map(sh => {
    const rows = data.filter(r => r.shift === sh);
    return { shift: `Shift ${sh}`, defects: rows.reduce((a, r) => a + r.defects, 0), rate: rows.length ? ((rows.reduce((a, r) => a + r.defects, 0) / rows.reduce((a, r) => a + r.actualOutput, 0)) * 100).toFixed(2) : 0 };
  }), [data]);

  const trendData = useMemo(() => aggregateByDate(data).slice(-14), [data]);
  const pieColors = [T.red, T.orange, T.yellow, T.purple, T.accent2, T.accent];

  // Heatmap: machines x defect types
  const heatmapData = useMemo(() => {
    const result = [];
    MACHINES.forEach(m => {
      DEFECT_TYPES.forEach(dt => {
        const val = data.filter(r => r.machine === m.id && r.defectType === dt).reduce((a, r) => a + r.defects, 0);
        result.push({ machine: m.id.replace("-", ""), defect: dt.split(" ")[0], value: val });
      });
    });
    return result;
  }, [data]);

  const heatMax = Math.max(...heatmapData.map(d => d.value));

  return (
    <div className="fade-in">
      <SectionTitle icon="🔍" title="Defect Analysis" sub="Quality control, FPY, defect Pareto, and machine-level defect heatmap" />

      <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
        {[7, 30, 90, 365].map(d => (
          <button key={d} onClick={() => setRange(d)} style={{
            padding: "6px 14px", borderRadius: 6, border: `1px solid ${range === d ? T.purple : T.border}`,
            background: range === d ? T.purple + "22" : T.bg2, color: range === d ? T.purple : T.textMid,
            cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "Space Grotesk",
          }}>{d === 365 ? "1Y" : `${d}D`}</button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total Defects", value: totalDefects.toLocaleString(), color: T.red },
          { label: "Defect Rate", value: defectRate + "%", color: T.orange },
          { label: "First Pass Yield", value: fpyPct + "%", color: T.green },
          { label: "Defect Types", value: byType.length, color: T.purple },
        ].map(k => (
          <Card key={k.label}>
            <div style={{ color: T.textMid, fontSize: 10, textTransform: "uppercase", marginBottom: 4 }}>{k.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: k.color, fontFamily: "JetBrains Mono" }}>{k.value}</div>
          </Card>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <Card>
          <div style={{ color: T.textMid, fontSize: 11, fontWeight: 600, marginBottom: 12 }}>DEFECTS BY CATEGORY</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={byType} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
              <XAxis type="number" tick={{ fill: T.textDim, fontSize: 9 }} />
              <YAxis type="category" dataKey="type" tick={{ fill: T.textMid, fontSize: 10 }} width={110} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="defects" name="Defects" radius={[0, 4, 4, 0]}>
                {byType.map((_, i) => <Cell key={i} fill={pieColors[i % pieColors.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <div style={{ color: T.textMid, fontSize: 11, fontWeight: 600, marginBottom: 12 }}>DEFECTS BY SHIFT</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={byShift}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
              <XAxis dataKey="shift" tick={{ fill: T.textDim, fontSize: 11 }} />
              <YAxis tick={{ fill: T.textDim, fontSize: 9 }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="defects" name="Defects" radius={[4, 4, 0, 0]}>
                <Cell fill={T.accent} /><Cell fill={T.accent2} /><Cell fill={T.purple} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Card>
          <div style={{ color: T.textMid, fontSize: 11, fontWeight: 600, marginBottom: 12 }}>DEFECT TREND (14D)</div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="defg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={T.red} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={T.red} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
              <XAxis dataKey="date" tick={{ fill: T.textDim, fontSize: 9 }} tickFormatter={d => d.slice(5)} />
              <YAxis tick={{ fill: T.textDim, fontSize: 9 }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Area type="monotone" dataKey="defects" stroke={T.red} fill="url(#defg)" strokeWidth={2} name="Defects" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <div style={{ color: T.textMid, fontSize: 11, fontWeight: 600, marginBottom: 12 }}>MACHINE × DEFECT TYPE HEATMAP</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <div style={{ display: "flex", gap: 3, marginLeft: 52 }}>
              {DEFECT_TYPES.map(dt => (
                <div key={dt} style={{ width: 44, fontSize: 7, color: T.textDim, textAlign: "center", lineHeight: 1.2 }}>{dt.split(" ")[0]}</div>
              ))}
            </div>
            {MACHINES.map(m => (
              <div key={m.id} style={{ display: "flex", gap: 3, alignItems: "center" }}>
                <div style={{ width: 48, fontSize: 9, color: T.textMid, textAlign: "right", paddingRight: 4 }}>{m.id}</div>
                {DEFECT_TYPES.map(dt => {
                  const val = heatmapData.find(h => h.machine === m.id.replace("-", "") && h.defect === dt.split(" ")[0])?.value || 0;
                  const intensity = heatMax > 0 ? val / heatMax : 0;
                  const bg = intensity > 0.7 ? T.red : intensity > 0.4 ? T.orange : intensity > 0.15 ? T.yellow : T.border;
                  return (
                    <div key={dt} title={`${m.id} × ${dt}: ${val}`} style={{
                      width: 44, height: 22, borderRadius: 3,
                      background: `rgba(${intensity > 0.7 ? "255,61,87" : intensity > 0.4 ? "255,107,53" : intensity > 0.15 ? "255,214,0" : "30,45,74"}, ${0.1 + intensity * 0.85})`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 8, color: intensity > 0.3 ? T.text : T.textDim,
                      fontFamily: "JetBrains Mono",
                    }}>{val > 0 ? val.toLocaleString() : ""}</div>
                  );
                })}
              </div>
            ))}
            <div style={{ display: "flex", gap: 6, marginTop: 8, alignItems: "center" }}>
              <span style={{ fontSize: 9, color: T.textDim }}>Low</span>
              {[0.1, 0.3, 0.5, 0.7, 0.9].map(i => (
                <div key={i} style={{ width: 20, height: 10, borderRadius: 2, background: `rgba(${i > 0.6 ? "255,61,87" : i > 0.35 ? "255,107,53" : "255,214,0"}, ${i})` }} />
              ))}
              <span style={{ fontSize: 9, color: T.textDim }}>High</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// PAGE: MACHINE PERFORMANCE
// ─────────────────────────────────────────────
function MachinePerformancePage() {
  const [range, setRange] = useState(30);
  const data = useMemo(() => getDateRange(ALL_DATA, range), [range]);

  const machineStats = useMemo(() => MACHINES.map(m => {
    const rows = data.filter(r => r.machine === m.id);
    if (!rows.length) return { ...m, oee: 0, availability: 0, performance: 0, quality: 0, output: 0, defects: 0, downtime: 0, health: 0, mtbf: 0, mttr: 0 };
    return {
      ...m,
      oee: +(rows.reduce((a, r) => a + r.oee, 0) / rows.length * 100).toFixed(1),
      availability: +(rows.reduce((a, r) => a + r.availability, 0) / rows.length * 100).toFixed(1),
      performance: +(rows.reduce((a, r) => a + r.performance, 0) / rows.length * 100).toFixed(1),
      quality: +(rows.reduce((a, r) => a + r.quality, 0) / rows.length * 100).toFixed(1),
      output: rows.reduce((a, r) => a + r.actualOutput, 0),
      defects: rows.reduce((a, r) => a + r.defects, 0),
      downtime: rows.reduce((a, r) => a + r.downtime, 0),
      health: +(rows.reduce((a, r) => a + r.health, 0) / rows.length).toFixed(0),
      mtbf: +(rows.reduce((a, r) => a + r.mtbf, 0) / rows.length).toFixed(0),
      mttr: +(rows.reduce((a, r) => a + r.mttr, 0) / rows.length).toFixed(0),
    };
  }).sort((a, b) => b.oee - a.oee), [data]);

  const radarMachines = machineStats.slice(0, 4);

  return (
    <div className="fade-in">
      <SectionTitle icon="⚙" title="Machine Performance" sub="Comparative OEE leaderboard with MTBF/MTTR and reliability metrics" />

      <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
        {[7, 30, 90, 365].map(d => (
          <button key={d} onClick={() => setRange(d)} style={{
            padding: "6px 14px", borderRadius: 6, border: `1px solid ${range === d ? T.accent2 : T.border}`,
            background: range === d ? T.accent2 + "22" : T.bg2, color: range === d ? T.accent2 : T.textMid,
            cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "Space Grotesk",
          }}>{d === 365 ? "1Y" : `${d}D`}</button>
        ))}
      </div>

      {/* Leaderboard */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ color: T.textMid, fontSize: 11, fontWeight: 600, marginBottom: 14 }}>MACHINE OEE LEADERBOARD</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr", gap: 0, marginBottom: 6 }}>
          {["#", "Machine", "Type", "OEE", "Avail.", "Perf.", "Quality", "Output", "MTBF", "Health"].map(h => (
            <div key={h} style={{ fontSize: 9, color: T.textDim, textTransform: "uppercase", padding: "4px 8px", letterSpacing: "0.06em" }}>{h}</div>
          ))}
        </div>
        {machineStats.map((m, i) => {
          const rank = i + 1;
          const rankColor = rank === 1 ? T.yellow : rank === 2 ? T.textMid : rank === 3 ? T.orange : T.text;
          const oeeColor = m.oee >= 85 ? T.green : m.oee >= 70 ? T.yellow : T.red;
          return (
            <div key={m.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr", padding: "10px 0", borderTop: `1px solid ${T.border}`, alignItems: "center" }}>
              <div style={{ padding: "0 8px", fontSize: 14, fontWeight: 700, color: rankColor, fontFamily: "JetBrains Mono" }}>#{rank}</div>
              <div style={{ padding: "0 8px" }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: T.text }}>{m.name}</div>
                <div style={{ fontSize: 9, color: T.textDim }}>{m.id}</div>
              </div>
              <div style={{ padding: "0 8px" }}><Badge color={T.accent2}>{m.type}</Badge></div>
              <div style={{ padding: "0 8px" }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: oeeColor, fontFamily: "JetBrains Mono" }}>{m.oee}%</span>
              </div>
              <div style={{ padding: "0 8px", fontSize: 11, color: T.green, fontFamily: "JetBrains Mono" }}>{m.availability}%</div>
              <div style={{ padding: "0 8px", fontSize: 11, color: T.accent2, fontFamily: "JetBrains Mono" }}>{m.performance}%</div>
              <div style={{ padding: "0 8px", fontSize: 11, color: T.purple, fontFamily: "JetBrains Mono" }}>{m.quality}%</div>
              <div style={{ padding: "0 8px", fontSize: 11, color: T.text, fontFamily: "JetBrains Mono" }}>{m.output.toLocaleString()}</div>
              <div style={{ padding: "0 8px", fontSize: 11, color: T.yellow, fontFamily: "JetBrains Mono" }}>{m.mtbf}m</div>
              <div style={{ padding: "0 8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div style={{ flex: 1, height: 4, background: T.border, borderRadius: 2 }}>
                    <div style={{ width: `${m.health}%`, height: "100%", background: m.health > 70 ? T.green : m.health > 40 ? T.yellow : T.red, borderRadius: 2 }} />
                  </div>
                  <span style={{ fontSize: 9, color: T.textDim, width: 24 }}>{m.health}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Card>
          <div style={{ color: T.textMid, fontSize: 11, fontWeight: 600, marginBottom: 12 }}>OEE BY MACHINE</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={machineStats} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
              <XAxis type="number" domain={[0, 100]} tick={{ fill: T.textDim, fontSize: 9 }} unit="%" />
              <YAxis type="category" dataKey="id" tick={{ fill: T.textMid, fontSize: 10 }} width={55} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <ReferenceLine x={85} stroke={T.accent} strokeDasharray="3 3" />
              <Bar dataKey="oee" name="OEE %" radius={[0, 4, 4, 0]}>
                {machineStats.map((m, i) => <Cell key={i} fill={m.oee >= 85 ? T.green : m.oee >= 70 ? T.yellow : T.red} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <div style={{ color: T.textMid, fontSize: 11, fontWeight: 600, marginBottom: 12 }}>MTBF vs MTTR (min)</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={machineStats}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
              <XAxis dataKey="id" tick={{ fill: T.textDim, fontSize: 9 }} />
              <YAxis tick={{ fill: T.textDim, fontSize: 9 }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="mtbf" fill={T.green} name="MTBF" radius={[3, 3, 0, 0]} />
              <Bar dataKey="mttr" fill={T.red} name="MTTR" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// PAGE: DIGITAL TWIN
// ─────────────────────────────────────────────
function DigitalTwinPage({ liveData, tick }) {
  // Factory layout grid
  const nodePositions = [
    { id: "PRS-01", x: 80,  y: 80,  w: 100, h: 70 },
    { id: "PRS-02", x: 220, y: 80,  w: 100, h: 70 },
    { id: "CNC-01", x: 80,  y: 210, w: 100, h: 70 },
    { id: "CNC-02", x: 220, y: 210, w: 100, h: 70 },
    { id: "WLD-01", x: 380, y: 80,  w: 100, h: 70 },
    { id: "ASM-01", x: 520, y: 80,  w: 100, h: 70 },
    { id: "CVY-01", x: 380, y: 210, w: 100, h: 70 },
    { id: "PKG-01", x: 520, y: 210, w: 100, h: 70 },
  ];

  const flows = [
    { from: "PRS-01", to: "WLD-01" }, { from: "PRS-02", to: "WLD-01" },
    { from: "CNC-01", to: "ASM-01" }, { from: "CNC-02", to: "ASM-01" },
    { from: "WLD-01", to: "CVY-01" }, { from: "ASM-01", to: "CVY-01" },
    { from: "CVY-01", to: "PKG-01" },
  ];

  const getMachineStatus = (id) => liveData.find(m => m.id === id) || {};

  const getCenter = (pos) => ({ x: pos.x + pos.w / 2, y: pos.y + pos.h / 2 });

  const alerts = liveData.filter(m => m.status === "Breakdown" || m.oee < 65 || m.temp > 80);

  return (
    <div className="fade-in">
      <SectionTitle icon="🔮" title="Digital Twin — Factory Layout" sub="Real-time factory topology with live process flow, IoT telemetry, and alarm state" />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 16 }}>
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ color: T.textMid, fontSize: 11, fontWeight: 600 }}>FACTORY FLOOR — LIVE VIEW</span>
            <span className="animate-pulse" style={{ width: 7, height: 7, borderRadius: "50%", background: T.green, display: "inline-block" }} />
            <span style={{ color: T.green, fontSize: 10 }}>LIVE</span>
          </div>
          <div style={{ position: "relative", padding: 16, background: T.bg0 }}>
            <svg width="100%" viewBox="0 0 700 320" style={{ overflow: "visible" }}>
              {/* Grid */}
              <defs>
                <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                  <path d="M 30 0 L 0 0 0 30" fill="none" stroke={T.border} strokeWidth="0.5" opacity="0.4" />
                </pattern>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                  <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
                <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                  <path d="M0,0 L0,6 L8,3 z" fill={T.accent + "88"} />
                </marker>
              </defs>
              <rect width="700" height="320" fill="url(#grid)" />

              {/* Zone labels */}
              <text x="150" y="30" textAnchor="middle" fill={T.textDim} fontSize="10" fontFamily="Space Grotesk" fontWeight="600" letterSpacing="2">PRESS LINE A</text>
              <text x="150" y="160" textAnchor="middle" fill={T.textDim} fontSize="10" fontFamily="Space Grotesk" fontWeight="600" letterSpacing="2">MACHINING LINE B</text>
              <text x="470" y="30" textAnchor="middle" fill={T.textDim} fontSize="10" fontFamily="Space Grotesk" fontWeight="600" letterSpacing="2">ASSEMBLY LINE C</text>
              <text x="470" y="180" textAnchor="middle" fill={T.textDim} fontSize="10" fontFamily="Space Grotesk" fontWeight="600" letterSpacing="2">LOGISTICS LINE D</text>

              {/* Zone boxes */}
              <rect x="40" y="40" width="310" height="130" rx="8" fill="none" stroke={T.border} strokeDasharray="4 4" opacity="0.5" />
              <rect x="40" y="175" width="310" height="130" rx="8" fill="none" stroke={T.border} strokeDasharray="4 4" opacity="0.5" />
              <rect x="355" y="40" width="310" height="130" rx="8" fill="none" stroke={T.border} strokeDasharray="4 4" opacity="0.5" />
              <rect x="355" y="175" width="310" height="130" rx="8" fill="none" stroke={T.border} strokeDasharray="4 4" opacity="0.5" />

              {/* Flow lines */}
              {flows.map((f, i) => {
                const fromPos = nodePositions.find(n => n.id === f.from);
                const toPos = nodePositions.find(n => n.id === f.to);
                if (!fromPos || !toPos) return null;
                const fc = getCenter(fromPos); const tc = getCenter(toPos);
                const mData = getMachineStatus(f.from);
                const active = mData.status === "Running";
                return (
                  <line key={i} x1={fc.x} y1={fc.y} x2={tc.x} y2={tc.y}
                    stroke={active ? T.accent : T.border}
                    strokeWidth={active ? 2 : 1}
                    strokeDasharray={active ? "8 4" : "4 4"}
                    opacity={active ? 0.7 : 0.3}
                    markerEnd={active ? "url(#arrow)" : ""}
                    style={active ? { animation: `flow ${1.5 + i * 0.3}s linear infinite` } : {}}
                  />
                );
              })}

              {/* Machine nodes */}
              {nodePositions.map(pos => {
                const m = getMachineStatus(pos.id);
                const color = STATUS_MAP[m.status] || T.textDim;
                const mInfo = MACHINES.find(mc => mc.id === pos.id) || {};
                return (
                  <g key={pos.id}>
                    <rect x={pos.x} y={pos.y} width={pos.w} height={pos.h} rx="8"
                      fill={T.bg2} stroke={color} strokeWidth="1.5"
                      filter={m.status === "Running" ? "url(#glow)" : ""}
                      opacity="0.95" />
                    {/* Status stripe */}
                    <rect x={pos.x} y={pos.y} width={pos.w} height={4} rx="2" fill={color} opacity="0.8" />
                    {/* Machine ID */}
                    <text x={pos.x + 8} y={pos.y + 20} fill={color} fontSize="9" fontFamily="JetBrains Mono" fontWeight="600">{pos.id}</text>
                    {/* Name */}
                    <text x={pos.x + 8} y={pos.y + 33} fill={T.textMid} fontSize="7.5" fontFamily="Space Grotesk">{mInfo.name?.split(" ").slice(0, 2).join(" ")}</text>
                    {/* OEE */}
                    <text x={pos.x + 8} y={pos.y + 50} fill={T.accent} fontSize="14" fontFamily="JetBrains Mono" fontWeight="700">{m.oee || "—"}%</text>
                    <text x={pos.x + 8} y={pos.y + 62} fill={T.textDim} fontSize="7">OEE</text>
                    {/* Temp */}
                    <text x={pos.x + 60} y={pos.y + 50} fill={m.temp > 75 ? T.red : T.yellow} fontSize="11" fontFamily="JetBrains Mono">{m.temp || "—"}°</text>
                    <text x={pos.x + 60} y={pos.y + 62} fill={T.textDim} fontSize="7">TEMP</text>
                    {/* Status dot */}
                    <circle cx={pos.x + pos.w - 10} cy={pos.y + 14} r={4} fill={color}
                      style={m.status === "Running" ? { animation: "pulse 1.5s infinite" } : {}} />
                  </g>
                );
              })}

              {/* Legend */}
              {[["Running", T.green], ["Idle", T.yellow], ["Breakdown", T.red], ["Maintenance", T.purple]].map(([s, c], i) => (
                <g key={s} transform={`translate(${490 + i * 0}, ${295 + i * 0})`}>
                  <circle cx={20 + i * 82} cy={300} r={4} fill={c} />
                  <text x={28 + i * 82} y={304} fill={T.textDim} fontSize="9" fontFamily="Space Grotesk">{s}</text>
                </g>
              ))}
            </svg>
          </div>
        </Card>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Card>
            <div style={{ color: T.textMid, fontSize: 11, fontWeight: 600, marginBottom: 10 }}>LIVE TELEMETRY</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {liveData.map(m => (
                <div key={m.id} style={{ display: "flex", justify: "space-between", alignItems: "center", padding: "5px 8px", background: T.bg3, borderRadius: 5, fontSize: 10 }}>
                  <span style={{ color: T.textMid, width: 55 }}>{m.id}</span>
                  <span style={{ color: T.yellow, width: 38, fontFamily: "JetBrains Mono" }}>{m.temp}°C</span>
                  <span style={{ color: T.accent, width: 32, fontFamily: "JetBrains Mono" }}>{m.vibration}g</span>
                  <span style={{ color: T.orange, width: 42, fontFamily: "JetBrains Mono", textAlign: "right" }}>{m.energy}kW</span>
                </div>
              ))}
            </div>
          </Card>

          <Card style={{ flex: 1 }}>
            <div style={{ color: T.textMid, fontSize: 11, fontWeight: 600, marginBottom: 10 }}>
              ACTIVE ALARMS <span style={{ color: T.red }}>({alerts.length})</span>
            </div>
            {alerts.length === 0 ? (
              <div style={{ color: T.green, fontSize: 12, textAlign: "center", padding: 16 }}>✓ No Active Alarms</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {alerts.map(m => (
                  <div key={m.id} style={{ padding: "8px 10px", background: T.red + "15", border: `1px solid ${T.red}33`, borderRadius: 6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 10, fontWeight: 600, color: T.red }}>{m.id}</span>
                      <Badge color={T.red}>CRITICAL</Badge>
                    </div>
                    <div style={{ fontSize: 10, color: T.textMid, marginTop: 3 }}>
                      {m.status === "Breakdown" ? "Machine Down" : m.oee < 65 ? `Low OEE: ${m.oee}%` : `High Temp: ${m.temp}°C`}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// PAGE: MAINTENANCE DASHBOARD
// ─────────────────────────────────────────────
function MaintenancePage() {
  const [range, setRange] = useState(30);
  const data = useMemo(() => getDateRange(ALL_DATA, range), [range]);

  const machineStats = useMemo(() => MACHINES.map(m => {
    const rows = data.filter(r => r.machine === m.id);
    if (!rows.length) return { ...m, mtbf: 0, mttr: 0, failures: 0, maintenanceCost: 0 };
    const failures = rows.filter(r => r.dtCause === "Mechanical Failure" || r.dtCause === "Electrical Failure").length;
    const mtbf = rows.reduce((a, r) => a + r.mtbf, 0) / rows.length;
    const mttr = rows.reduce((a, r) => a + r.mttr, 0) / rows.length;
    return { ...m, mtbf: +mtbf.toFixed(0), mttr: +mttr.toFixed(0), failures, maintenanceCost: Math.floor(failures * (800 + Math.random() * 1200)) };
  }), [data]);

  const trend = useMemo(() => aggregateByDate(data).slice(-21).map(d => ({
    ...d, mtbf: 300 + Math.sin(d.date.length) * 50, mttr: 35 + Math.cos(d.date.length) * 10
  })), [data]);

  const totalCost = machineStats.reduce((a, m) => a + m.maintenanceCost, 0);
  const avgMTBF = (machineStats.reduce((a, m) => a + m.mtbf, 0) / machineStats.length).toFixed(0);
  const avgMTTR = (machineStats.reduce((a, m) => a + m.mttr, 0) / machineStats.length).toFixed(0);
  const totalFailures = machineStats.reduce((a, m) => a + m.failures, 0);

  return (
    <div className="fade-in">
      <SectionTitle icon="🔧" title="Maintenance Dashboard" sub="MTBF, MTTR, failure analysis, predictive maintenance scores" />

      <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
        {[7, 30, 90, 365].map(d => (
          <button key={d} onClick={() => setRange(d)} style={{
            padding: "6px 14px", borderRadius: 6, border: `1px solid ${range === d ? T.orange : T.border}`,
            background: range === d ? T.orange + "22" : T.bg2, color: range === d ? T.orange : T.textMid,
            cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "Space Grotesk",
          }}>{d === 365 ? "1Y" : `${d}D`}</button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Avg MTBF", value: avgMTBF + " min", color: T.green, sub: "Mean Time Between Failures" },
          { label: "Avg MTTR", value: avgMTTR + " min", color: T.red, sub: "Mean Time To Repair" },
          { label: "Total Failures", value: totalFailures, color: T.orange, sub: "Mech + Electrical" },
          { label: "Maint. Cost", value: "₹" + (totalCost / 1000).toFixed(0) + "K", color: T.yellow, sub: "Estimated this period" },
        ].map(k => (
          <Card key={k.label}>
            <div style={{ color: T.textMid, fontSize: 10, textTransform: "uppercase", marginBottom: 2 }}>{k.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: k.color, fontFamily: "JetBrains Mono" }}>{k.value}</div>
            <div style={{ color: T.textDim, fontSize: 10, marginTop: 2 }}>{k.sub}</div>
          </Card>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <Card>
          <div style={{ color: T.textMid, fontSize: 11, fontWeight: 600, marginBottom: 12 }}>MTBF / MTTR TREND</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
              <XAxis dataKey="date" tick={{ fill: T.textDim, fontSize: 9 }} tickFormatter={d => d.slice(5)} interval={4} />
              <YAxis tick={{ fill: T.textDim, fontSize: 9 }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="mtbf" stroke={T.green} strokeWidth={2} name="MTBF (min)" dot={false} />
              <Line type="monotone" dataKey="mttr" stroke={T.red} strokeWidth={2} name="MTTR (min)" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <div style={{ color: T.textMid, fontSize: 11, fontWeight: 600, marginBottom: 12 }}>FAILURES BY MACHINE</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={machineStats} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
              <XAxis type="number" tick={{ fill: T.textDim, fontSize: 9 }} />
              <YAxis type="category" dataKey="id" tick={{ fill: T.textMid, fontSize: 10 }} width={55} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="failures" fill={T.orange} name="Failures" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Predictive Maintenance Scores */}
      <Card>
        <div style={{ color: T.textMid, fontSize: 11, fontWeight: 600, marginBottom: 14 }}>PREDICTIVE MAINTENANCE SCORES</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {MACHINES.map(m => {
            const st = machineStats.find(s => s.id === m.id) || {};
            const predScore = Math.max(20, 100 - (st.failures || 0) * 8 - Math.floor(Math.random() * 10));
            const risk = predScore < 50 ? "High" : predScore < 70 ? "Medium" : "Low";
            const riskColor = predScore < 50 ? T.red : predScore < 70 ? T.yellow : T.green;
            return (
              <div key={m.id} style={{ background: T.bg3, borderRadius: 8, padding: "12px 14px", border: `1px solid ${T.border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: T.text }}>{m.id}</span>
                  <Badge color={riskColor}>{risk} Risk</Badge>
                </div>
                <div style={{ fontSize: 10, color: T.textMid, marginBottom: 6 }}>{m.name}</div>
                <ProgressBar value={predScore} color={riskColor} label="Health Score" />
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 9, color: T.textDim }}>
                  <span>MTBF: <span style={{ color: T.green, fontFamily: "JetBrains Mono" }}>{st.mtbf}m</span></span>
                  <span>MTTR: <span style={{ color: T.red, fontFamily: "JetBrains Mono" }}>{st.mttr}m</span></span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────
// PAGE: PRODUCTION MONITORING
// ─────────────────────────────────────────────
function ProductionPage() {
  const [range, setRange] = useState(30);
  const data = useMemo(() => aggregateByDate(getDateRange(ALL_DATA, range)), [range]);
  const TARGET_DAILY = 8000;

  const enriched = data.map(d => ({
    ...d, target: TARGET_DAILY, gap: d.output - TARGET_DAILY,
    cumOutput: 0, // will fill below
  }));
  let cum = 0;
  enriched.forEach(d => { cum += d.output; d.cumOutput = cum; });

  const totalOutput = data.reduce((a, d) => a + d.output, 0);
  const totalTarget = data.length * TARGET_DAILY;
  const attainment = ((totalOutput / totalTarget) * 100).toFixed(1);
  const daysAboveTarget = data.filter(d => d.output >= TARGET_DAILY).length;

  const shiftProd = useMemo(() => {
    const d = getDateRange(ALL_DATA, range);
    return ["A", "B", "C"].map(sh => {
      const rows = d.filter(r => r.shift === sh);
      return {
        shift: `Shift ${sh}`, output: rows.reduce((a, r) => a + r.actualOutput, 0),
        oee: +(rows.reduce((a, r) => a + r.oee, 0) / rows.length * 100).toFixed(1),
        defects: rows.reduce((a, r) => a + r.defects, 0),
        downtime: rows.reduce((a, r) => a + r.downtime, 0),
      };
    }).sort((a, b) => b.output - a.output);
  }, [range]);

  return (
    <div className="fade-in">
      <SectionTitle icon="📦" title="Production Monitoring" sub="Target vs actual, cumulative output, shift rankings, and gap analysis" />

      <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
        {[7, 30, 90, 365].map(d => (
          <button key={d} onClick={() => setRange(d)} style={{
            padding: "6px 14px", borderRadius: 6, border: `1px solid ${range === d ? T.green : T.border}`,
            background: range === d ? T.green + "22" : T.bg2, color: range === d ? T.green : T.textMid,
            cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "Space Grotesk",
          }}>{d === 365 ? "1Y" : `${d}D`}</button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total Output", value: totalOutput.toLocaleString(), color: T.accent, unit: "pcs" },
          { label: "Target Attainment", value: attainment + "%", color: parseFloat(attainment) >= 100 ? T.green : T.yellow },
          { label: "Days Above Target", value: `${daysAboveTarget}/${data.length}`, color: T.green },
          { label: "Daily Average", value: Math.floor(totalOutput / data.length).toLocaleString(), color: T.accent2, unit: "pcs/day" },
        ].map(k => (
          <Card key={k.label}>
            <div style={{ color: T.textMid, fontSize: 10, textTransform: "uppercase", marginBottom: 4 }}>{k.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: k.color, fontFamily: "JetBrains Mono" }}>{k.value}</div>
            {k.unit && <div style={{ fontSize: 10, color: T.textDim }}>{k.unit}</div>}
          </Card>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 16 }}>
        <Card>
          <div style={{ color: T.textMid, fontSize: 11, fontWeight: 600, marginBottom: 12 }}>TARGET vs ACTUAL PRODUCTION</div>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={enriched.slice(-21)}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
              <XAxis dataKey="date" tick={{ fill: T.textDim, fontSize: 9 }} tickFormatter={d => d.slice(5)} />
              <YAxis tick={{ fill: T.textDim, fontSize: 9 }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="output" name="Actual" fill={T.accent2} radius={[3, 3, 0, 0]} fillOpacity={0.9} />
              <Line type="monotone" dataKey="target" stroke={T.red} strokeDasharray="5 3" strokeWidth={2} name="Target" dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <div style={{ color: T.textMid, fontSize: 11, fontWeight: 600, marginBottom: 12 }}>SHIFT PERFORMANCE RANK</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {shiftProd.map((s, i) => (
              <div key={s.shift} style={{ padding: "10px 12px", background: T.bg3, borderRadius: 8, border: `1px solid ${i === 0 ? T.yellow + "44" : T.border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: i === 0 ? T.yellow : T.textMid, fontFamily: "JetBrains Mono" }}>#{i + 1}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{s.shift}</span>
                  </div>
                  {i === 0 && <Badge color={T.yellow}>BEST</Badge>}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                  <div><div style={{ fontSize: 8, color: T.textDim }}>OUTPUT</div><div style={{ fontSize: 12, color: T.green, fontFamily: "JetBrains Mono", fontWeight: 600 }}>{s.output.toLocaleString()}</div></div>
                  <div><div style={{ fontSize: 8, color: T.textDim }}>OEE</div><div style={{ fontSize: 12, color: T.accent, fontFamily: "JetBrains Mono", fontWeight: 600 }}>{s.oee}%</div></div>
                  <div><div style={{ fontSize: 8, color: T.textDim }}>DEFECTS</div><div style={{ fontSize: 12, color: T.red, fontFamily: "JetBrains Mono", fontWeight: 600 }}>{s.defects.toLocaleString()}</div></div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <div style={{ color: T.textMid, fontSize: 11, fontWeight: 600, marginBottom: 12 }}>CUMULATIVE OUTPUT TREND</div>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={enriched}>
            <defs>
              <linearGradient id="cumg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={T.green} stopOpacity={0.3} />
                <stop offset="95%" stopColor={T.green} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
            <XAxis dataKey="date" tick={{ fill: T.textDim, fontSize: 9 }} tickFormatter={d => d.slice(5)} interval={Math.floor(enriched.length / 8)} />
            <YAxis tick={{ fill: T.textDim, fontSize: 9 }} tickFormatter={v => (v / 1000).toFixed(0) + "K"} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => [v.toLocaleString(), "Cumulative Output"]} />
            <Area type="monotone" dataKey="cumOutput" stroke={T.green} fill="url(#cumg)" strokeWidth={2} name="Cumulative Output" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────
// PAGE: ALERT MANAGEMENT
// ─────────────────────────────────────────────
function AlertsPage({ liveData }) {
  const [filter, setFilter] = useState("ALL");

  const generateAlerts = (machines) => {
    const alerts = [];
    machines.forEach(m => {
      if (m.status === "Breakdown") alerts.push({ id: `ALT-${m.id}-BD`, machine: m.id, severity: "Critical", message: `Machine DOWN — immediate intervention required`, time: "Just now", type: "Breakdown" });
      if (m.oee < 65) alerts.push({ id: `ALT-${m.id}-OEE`, machine: m.id, severity: "High", message: `Low OEE detected: ${m.oee}% (Target: 85%)`, time: "2 min ago", type: "OEE" });
      if (m.temp > 78) alerts.push({ id: `ALT-${m.id}-TEMP`, machine: m.id, severity: "High", message: `High temperature: ${m.temp}°C (Limit: 80°C)`, time: "5 min ago", type: "Temp" });
      if (m.defects > 100) alerts.push({ id: `ALT-${m.id}-DEF`, machine: m.id, severity: "Medium", message: `Defect count elevated: ${m.defects} units`, time: "8 min ago", type: "Quality" });
      if (m.vibration > 3.5) alerts.push({ id: `ALT-${m.id}-VIB`, machine: m.id, severity: "Medium", message: `Vibration anomaly: ${m.vibration}g (Limit: 3.5g)`, time: "12 min ago", type: "Vibration" });
      if (m.status === "Idle" && m.downtime > 90) alerts.push({ id: `ALT-${m.id}-IDL`, machine: m.id, severity: "Low", message: `Extended idle time: ${m.downtime} min`, time: "20 min ago", type: "Idle" });
    });
    // Add system alerts
    alerts.push({ id: "SYS-001", machine: "PLANT", severity: "Low", message: "Daily OEE report generated and ready", time: "1 hr ago", type: "System" });
    alerts.push({ id: "SYS-002", machine: "CVY-01", severity: "Medium", message: "Preventive maintenance due in 48 hours", time: "3 hr ago", type: "Maintenance" });
    return alerts;
  };

  const alerts = generateAlerts(liveData);
  const filtered = filter === "ALL" ? alerts : alerts.filter(a => a.severity === filter);

  const sevColor = { Critical: T.red, High: T.orange, Medium: T.yellow, Low: T.accent };
  const counts = { Critical: alerts.filter(a => a.severity === "Critical").length, High: alerts.filter(a => a.severity === "High").length, Medium: alerts.filter(a => a.severity === "Medium").length, Low: alerts.filter(a => a.severity === "Low").length };

  return (
    <div className="fade-in">
      <SectionTitle icon="🚨" title="Alert Management" sub="Real-time alarm center with severity classification and CAPA workflow" />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        {Object.entries(counts).map(([sev, cnt]) => (
          <Card key={sev} style={{ border: `1px solid ${sevColor[sev]}33`, cursor: "pointer", background: filter === sev ? sevColor[sev] + "15" : T.bg2 }}
            onClick={() => setFilter(filter === sev ? "ALL" : sev)}>
            <div style={{ color: sevColor[sev], fontSize: 28, fontWeight: 700, fontFamily: "JetBrains Mono" }}>{cnt}</div>
            <div style={{ color: T.textMid, fontSize: 11, marginTop: 2 }}>{sev} Severity</div>
          </Card>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {["ALL", "Critical", "High", "Medium", "Low"].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: "6px 14px", borderRadius: 6, border: `1px solid ${filter === f ? (sevColor[f] || T.accent) : T.border}`,
            background: filter === f ? (sevColor[f] || T.accent) + "22" : T.bg2,
            color: filter === f ? (sevColor[f] || T.accent) : T.textMid,
            cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "Space Grotesk",
          }}>{f}</button>
        ))}
        <span style={{ marginLeft: "auto", color: T.textDim, fontSize: 11, alignSelf: "center" }}>{filtered.length} alerts</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.map(a => (
          <div key={a.id} style={{
            background: T.bg2, border: `1px solid ${sevColor[a.severity]}33`,
            borderLeft: `3px solid ${sevColor[a.severity]}`,
            borderRadius: 8, padding: "12px 16px",
            display: "flex", alignItems: "center", gap: 12,
          }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: sevColor[a.severity], flexShrink: 0,
              animation: a.severity === "Critical" ? "pulse 1s infinite" : "none" }} />
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                <Badge color={sevColor[a.severity]}>{a.severity}</Badge>
                <span style={{ fontFamily: "JetBrains Mono", fontSize: 11, color: T.accent }}>{a.machine}</span>
                <span style={{ fontSize: 10, color: T.textDim }}>• {a.type}</span>
              </div>
              <div style={{ fontSize: 12, color: T.text }}>{a.message}</div>
            </div>
            <div style={{ fontSize: 10, color: T.textDim, whiteSpace: "nowrap" }}>{a.time}</div>
            <button style={{
              padding: "4px 12px", borderRadius: 4, border: `1px solid ${T.border}`,
              background: "transparent", color: T.textMid, cursor: "pointer", fontSize: 11,
            }}>ACK</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// PAGE: KPI TARGETS
// ─────────────────────────────────────────────
function KPITargetsPage() {
  const [targets, setTargets] = useState({ oee: 85, availability: 90, performance: 92, quality: 95, production: 8000 });

  const recentData = useMemo(() => {
    const d = getDateRange(ALL_DATA, 30);
    return {
      oee: (d.reduce((a, r) => a + r.oee, 0) / d.length * 100).toFixed(1),
      availability: (d.reduce((a, r) => a + r.availability, 0) / d.length * 100).toFixed(1),
      performance: (d.reduce((a, r) => a + r.performance, 0) / d.length * 100).toFixed(1),
      quality: (d.reduce((a, r) => a + r.quality, 0) / d.length * 100).toFixed(1),
      production: Math.floor(d.reduce((a, r) => a + r.actualOutput, 0) / 30),
    };
  }, []);

  const kpis = [
    { key: "oee", label: "OEE Target", unit: "%", color: T.accent, max: 100 },
    { key: "availability", label: "Availability Target", unit: "%", color: T.green, max: 100 },
    { key: "performance", label: "Performance Target", unit: "%", color: T.accent2, max: 100 },
    { key: "quality", label: "Quality Target", unit: "%", color: T.purple, max: 100 },
    { key: "production", label: "Daily Production Target", unit: "pcs/day", color: T.yellow, max: 15000 },
  ];

  return (
    <div className="fade-in">
      <SectionTitle icon="🎯" title="KPI Target Management" sub="Set production targets and track attainment against actuals" />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div>
          <Card style={{ marginBottom: 16 }}>
            <div style={{ color: T.textMid, fontSize: 11, fontWeight: 600, marginBottom: 16 }}>SET TARGETS</div>
            {kpis.map(k => (
              <div key={k.key} style={{ marginBottom: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <label style={{ fontSize: 12, color: T.textMid }}>{k.label}</label>
                  <span style={{ color: k.color, fontFamily: "JetBrains Mono", fontSize: 12, fontWeight: 600 }}>
                    {targets[k.key]}{k.unit}
                  </span>
                </div>
                <input type="range" min={k.key === "production" ? 1000 : 50} max={k.max} value={targets[k.key]}
                  onChange={e => setTargets(t => ({ ...t, [k.key]: +e.target.value }))}
                  style={{ width: "100%", accentColor: k.color, cursor: "pointer" }} />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: T.textDim, marginTop: 2 }}>
                  <span>{k.key === "production" ? "1K" : "50%"}</span>
                  <span>{k.max}{k.unit}</span>
                </div>
              </div>
            ))}
          </Card>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {kpis.map(k => {
            const actual = parseFloat(recentData[k.key]);
            const target = targets[k.key];
            const pct = Math.min((actual / target) * 100, 100);
            const met = actual >= target;
            return (
              <Card key={k.key} style={{ border: `1px solid ${met ? T.green + "33" : T.red + "33"}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{k.label.replace(" Target", "")}</div>
                    <div style={{ fontSize: 10, color: T.textDim, marginTop: 1 }}>Last 30 days avg</div>
                  </div>
                  <Badge color={met ? T.green : T.red}>{met ? "ON TARGET" : "BELOW TARGET"}</Badge>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                  <div style={{ background: T.bg3, borderRadius: 6, padding: "8px 10px" }}>
                    <div style={{ fontSize: 9, color: T.textDim, textTransform: "uppercase" }}>Actual</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: k.color, fontFamily: "JetBrains Mono" }}>{actual}{k.unit}</div>
                  </div>
                  <div style={{ background: T.bg3, borderRadius: 6, padding: "8px 10px" }}>
                    <div style={{ fontSize: 9, color: T.textDim, textTransform: "uppercase" }}>Target</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: T.textMid, fontFamily: "JetBrains Mono" }}>{target}{k.unit}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ flex: 1, height: 8, background: T.border, borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: met ? T.green : T.red, borderRadius: 4, transition: "width 0.5s" }} />
                  </div>
                  <span style={{ fontSize: 11, color: met ? T.green : T.red, fontFamily: "JetBrains Mono", fontWeight: 600 }}>{pct.toFixed(0)}%</span>
                </div>
                <div style={{ marginTop: 4, fontSize: 10, color: met ? T.green : T.red }}>
                  {met ? `✓ Exceeding by ${(actual - target).toFixed(1)}${k.unit}` : `⚠ Gap: ${(target - actual).toFixed(1)}${k.unit}`}
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────
const NAV_ITEMS = [
  { id: "dashboard",    label: "Dashboard",        icon: "◈" },
  { id: "floor",        label: "Factory Floor",    icon: "🏭" },
  { id: "analytics",   label: "OEE Analytics",    icon: "📊" },
  { id: "downtime",    label: "Downtime",          icon: "⏱" },
  { id: "defects",     label: "Defect Analysis",  icon: "🔍" },
  { id: "machines",    label: "Machine Perf.",     icon: "⚙" },
  { id: "production",  label: "Production",        icon: "📦" },
  { id: "maintenance", label: "Maintenance",       icon: "🔧" },
  { id: "twin",        label: "Digital Twin",      icon: "🔮" },
  { id: "alerts",      label: "Alerts",            icon: "🚨" },
  { id: "targets",     label: "KPI Targets",       icon: "🎯" },
];

export default function App() {
  const [page, setPage] = useState("dashboard");
  const [tick, setTick] = useState(1);
  const [liveData, setLiveData] = useState(() => generateLiveMachineState(1));
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      const newTick = tick + 1;
      setTick(newTick);
      setLiveData(generateLiveMachineState(newTick));
    }, 3000);
    return () => clearInterval(interval);
  }, [tick]);

  const alertCount = liveData.filter(m => m.status === "Breakdown" || m.oee < 65).length;

  const renderPage = () => {
    switch (page) {
      case "dashboard":    return <DashboardPage liveData={liveData} />;
      case "floor":        return <FactoryFloorPage liveData={liveData} tick={tick} />;
      case "analytics":    return <OEEAnalyticsPage />;
      case "downtime":     return <DowntimePage />;
      case "defects":      return <DefectPage />;
      case "machines":     return <MachinePerformancePage />;
      case "production":   return <ProductionPage />;
      case "maintenance":  return <MaintenancePage />;
      case "twin":         return <DigitalTwinPage liveData={liveData} tick={tick} />;
      case "alerts":       return <AlertsPage liveData={liveData} />;
      case "targets":      return <KPITargetsPage />;
      default:             return <DashboardPage liveData={liveData} />;
    }
  };

  return (
    <>
      <style>{styles}</style>
      <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: T.bg0 }}>
        {/* SIDEBAR */}
        <div style={{
          width: sidebarOpen ? 220 : 56, background: T.bg1, borderRight: `1px solid ${T.border}`,
          display: "flex", flexDirection: "column", transition: "width 0.2s ease", flexShrink: 0, overflow: "hidden",
        }}>
          {/* Logo */}
          <div style={{ padding: "16px 14px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: `linear-gradient(135deg, ${T.accent}, ${T.accent2})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>⬡</div>
            {sidebarOpen && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.text, lineHeight: 1.2 }}>SmartOEE</div>
                <div style={{ fontSize: 9, color: T.textDim, letterSpacing: "0.1em" }}>INDUSTRY 4.0</div>
              </div>
            )}
          </div>

          {/* Nav */}
          <nav style={{ flex: 1, padding: "10px 8px", overflowY: "auto" }}>
            {NAV_ITEMS.map(item => {
              const isActive = page === item.id;
              const isAlerts = item.id === "alerts";
              return (
                <button key={item.id} onClick={() => setPage(item.id)} style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 10,
                  padding: "9px 10px", borderRadius: 7, marginBottom: 2, border: "none",
                  background: isActive ? `${T.accent}18` : "transparent",
                  color: isActive ? T.accent : T.textMid,
                  cursor: "pointer", textAlign: "left", transition: "all 0.15s",
                  position: "relative",
                }}>
                  <span style={{ fontSize: 15, flexShrink: 0, width: 18, textAlign: "center" }}>{item.icon}</span>
                  {sidebarOpen && (
                    <>
                      <span style={{ fontSize: 12, fontWeight: isActive ? 600 : 400, whiteSpace: "nowrap" }}>{item.label}</span>
                      {isAlerts && alertCount > 0 && (
                        <span style={{ marginLeft: "auto", background: T.red, color: "#fff", borderRadius: 10, padding: "1px 6px", fontSize: 9, fontWeight: 700 }}>{alertCount}</span>
                      )}
                    </>
                  )}
                  {isActive && <div style={{ position: "absolute", left: 0, top: "20%", bottom: "20%", width: 2, background: T.accent, borderRadius: 1 }} />}
                </button>
              );
            })}
          </nav>

          {/* Bottom */}
          <div style={{ padding: "10px 8px", borderTop: `1px solid ${T.border}` }}>
            <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{
              width: "100%", padding: "8px", borderRadius: 6, border: `1px solid ${T.border}`,
              background: "transparent", color: T.textMid, cursor: "pointer", fontSize: 12,
            }}>{sidebarOpen ? "◀ Collapse" : "▶"}</button>
          </div>
        </div>

        {/* MAIN */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Header */}
          <div style={{ background: T.bg1, borderBottom: `1px solid ${T.border}`, padding: "10px 24px", display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{NAV_ITEMS.find(n => n.id === page)?.label}</div>
              <div style={{ fontSize: 10, color: T.textDim }}>Smart Factory OEE Platform — Symbiosis Manufacturing Plant, Pune</div>
            </div>
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", background: T.bg2, borderRadius: 6, border: `1px solid ${T.border}` }}>
                <span className="animate-pulse" style={{ width: 6, height: 6, borderRadius: "50%", background: T.green, display: "inline-block" }} />
                <span style={{ fontSize: 10, color: T.green, fontWeight: 600 }}>LIVE</span>
                <span style={{ fontSize: 10, color: T.textDim, fontFamily: "JetBrains Mono" }}>T+{tick * 3}s</span>
              </div>
              <div style={{ fontSize: 10, color: T.textMid, fontFamily: "JetBrains Mono" }}>
                {new Date().toLocaleTimeString("en-IN", { hour12: false })}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", background: T.bg2, borderRadius: 6, border: `1px solid ${T.border}` }}>
                <span style={{ fontSize: 11, color: T.textMid }}>Shift {SHIFTS[Math.floor(new Date().getHours() / 8) % 3].id}</span>
              </div>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: `linear-gradient(135deg, ${T.accent}, ${T.purple})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff" }}>V</div>
            </div>
          </div>

          {/* Content */}
          <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
            {renderPage()}
          </div>

          {/* Footer */}
          <div style={{ background: T.bg1, borderTop: `1px solid ${T.border}`, padding: "6px 24px", display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
            <span style={{ fontSize: 9, color: T.textDim }}>SmartOEE v2.4.1 — Industry 4.0 Platform</span>
            <span style={{ fontSize: 9, color: T.textDim }}>•</span>
            <span style={{ fontSize: 9, color: T.textDim }}>Simulating {ALL_DATA.length.toLocaleString()} production records across 8 machines × 3 shifts × 365 days</span>
            <span style={{ marginLeft: "auto", fontSize: 9, color: T.textDim, fontFamily: "JetBrains Mono" }}>
              IEC 62264 • ISO 22400 • ISA-95 COMPLIANT
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
