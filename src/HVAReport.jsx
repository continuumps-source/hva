import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Doughnut, Bar } from "react-chartjs-2";

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Tooltip, Legend);

/* ------------------------------------------------------------------ *
 * HVA Readify — Hazard Vulnerability Analysis report
 * Structured to match the HVA report template: Risk Index by Hazard
 * Type, Risk Index by Core Capability, Hazard Prioritization (overall /
 * probability / impact), and per-hazard Risk Analysis, Risk
 * Distribution, Threat Assessment, Mitigation Plan, and References.
 * Categories: Natural, Accidental, Intentional.
 *
 * Loads hazard data from public/hazards.json at runtime. To use real
 * data, point the fetch at your API (or edit hazards.json directly) —
 * the shape and everything downstream stays the same.
 * ------------------------------------------------------------------ */

// ---- Theme tokens (matches the HVA Readify enterprise look) --------
const T = {
  teal: "#0b7c8c",
  tealDark: "#075b66",
  ink: "#1f2a37",
  sub: "#5b6b7b",
  line: "#e3e8ee",
  panel: "#ffffff",
  bg: "#eef2f5",
  chip: "#0b7c8c",
};

const RISK_COLORS = {
  "Very High": { bg: "#c0392b", fg: "#fff" },
  High: { bg: "#e67e22", fg: "#fff" },
  Medium: { bg: "#f1c40f", fg: "#3a2f00" },
  Low: { bg: "#27ae60", fg: "#fff" },
};

const CATEGORIES = ["Natural", "Accidental", "Intentional"];

const CATEGORY_INTRO = {
  Natural: "Natural hazards are events or processes in the natural environment that may cause loss of life, injury, or property damage — geologic, hydrologic, atmospheric, and biological.",
  Accidental: "Accidental hazards originate from technological or industrial accidents, infrastructure failures, or specific human activities causing loss, damage, or environmental degradation.",
  Intentional: "Intentional hazards are dangers created by deliberate human activity that could result in harm to people or the environment, such as terrorism or mass-casualty events.",
};

const CAPABILITIES = [
  "Security & Protective Services",
  "Healthcare Services",
  "Human Resource Management",
  "Logistics & Supply Chain",
  "Environmental Health & Safety",
  "Communication & Information",
  "Infrastructure Systems",
];

// ---- Mock data generation -----------------------------------------
function riskBand(score) {
  if (score >= 75) return "Very High";
  if (score >= 50) return "High";
  if (score >= 25) return "Medium";
  return "Low";
}

function impactBand(score) {
  if (score >= 75) return "Catastrophic";
  if (score >= 50) return "Critical";
  if (score >= 25) return "Limited";
  return "Minor";
}

// Domain scoring lives here. The JSON file supplies raw inputs
// (probability, impact, ...); these derived fields are computed once at
// load. Swap in the client's real formula in `risk` and the band helpers.
function deriveHazard(h) {
  const risk = Math.round(h.probability * 0.45 + h.impact * 0.55);
  return {
    ...h,
    risk,
    riskBand: riskBand(risk),
    probBand: riskBand(h.probability),
    impactBand: impactBand(h.impact),
  };
}

// ---- Small UI atoms ------------------------------------------------
function StatBox({ label, value }) {
  return (
    <div style={{
      border: `1px solid ${T.line}`, borderRadius: 8, padding: "12px 14px",
      background: T.panel, minWidth: 120, flex: 1,
    }}>
      <div style={{ fontSize: 11, color: T.sub, textTransform: "uppercase", letterSpacing: 0.4, fontWeight: 600 }}>
        {label}
      </div>
      <div style={{ fontSize: 30, fontWeight: 700, color: T.teal, lineHeight: 1.1, marginTop: 4 }}>
        {value}
      </div>
    </div>
  );
}

function RiskPill({ band }) {
  const c = RISK_COLORS[band] || RISK_COLORS.Low;
  return (
    <span style={{
      background: c.bg, color: c.fg, padding: "2px 10px", borderRadius: 4,
      fontSize: 12, fontWeight: 600, display: "inline-block", minWidth: 70, textAlign: "center",
    }}>
      {band}
    </span>
  );
}

function Panel({ title, children, style }) {
  return (
    <section style={{
      background: T.panel, border: `1px solid ${T.line}`, borderRadius: 10,
      padding: 16, ...style,
    }}>
      {title && (
        <h3 style={{
          margin: "0 0 12px", fontSize: 14, fontWeight: 700, color: T.ink,
          borderBottom: `2px solid ${T.line}`, paddingBottom: 8,
        }}>{title}</h3>
      )}
      {children}
    </section>
  );
}

// ---- Charts --------------------------------------------------------
function CategoryDoughnut({ rows, activeCategory }) {
  const counts = CATEGORIES.map(
    (c) => rows.filter((r) => r.category === c).reduce((a, r) => a + r.risk, 0)
  );
  const palette = ["#0b7c8c", "#e67e22", "#8e44ad", "#16a085"];
  const data = {
    labels: CATEGORIES,
    datasets: [{
      data: counts,
      backgroundColor: palette.map((p, i) =>
        activeCategory && CATEGORIES[i] !== activeCategory ? p + "44" : p),
      borderWidth: 2, borderColor: "#fff",
    }],
  };
  const total = counts.reduce((a, b) => a + b, 0);
  return (
    <div style={{ position: "relative", height: 200 }}>
      <Doughnut
        data={data}
        options={{
          cutout: "65%", maintainAspectRatio: false,
          plugins: { legend: { position: "bottom", labels: { boxWidth: 12, font: { size: 11 } } } },
        }}
      />
      <div style={{
        position: "absolute", top: "42%", left: 0, right: 0, textAlign: "center",
        pointerEvents: "none",
      }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: T.ink }}>{total}</div>
        <div style={{ fontSize: 10, color: T.sub }}>Total Risk Index</div>
      </div>
    </div>
  );
}

function CapabilitiesBar({ capabilities }) {
  const data = {
    labels: capabilities.map((c) => c.name.split(" ").slice(0, 2).join(" ")),
    datasets: [{
      data: capabilities.map((c) => c.score),
      backgroundColor: capabilities.map((c) =>
        c.score >= 18 ? "#c0392b" : c.score >= 14 ? "#e67e22" : "#27ae60"),
      borderRadius: 4,
    }],
  };
  return (
    <div style={{ height: 210 }}>
      <Bar
        data={data}
        options={{
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, max: 20, ticks: { font: { size: 10 } } },
            x: { ticks: { font: { size: 9 }, maxRotation: 40, minRotation: 40 } },
          },
        }}
      />
    </div>
  );
}

// ---- Hazard prioritization grid -----------------------------------
function HazardGrid({ rows, onSelect, selectedId }) {
  const [sort, setSort] = useState({ key: "risk", dir: "desc" });
  const sorted = useMemo(() => {
    const s = [...rows].sort((a, b) => {
      const av = a[sort.key], bv = b[sort.key];
      if (av === bv) return 0;
      const cmp = av > bv ? 1 : -1;
      return sort.dir === "asc" ? cmp : -cmp;
    });
    return s;
  }, [rows, sort]);

  const head = (label, key, align = "left") => (
    <th
      onClick={() => setSort((s) => ({ key, dir: s.key === key && s.dir === "desc" ? "asc" : "desc" }))}
      style={{
        textAlign: align, padding: "10px 12px", fontSize: 12, color: T.sub,
        cursor: "pointer", userSelect: "none", borderBottom: `2px solid ${T.line}`,
        whiteSpace: "nowrap",
      }}
    >
      {label}{sort.key === key ? (sort.dir === "asc" ? " ▲" : " ▼") : ""}
    </th>
  );

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr>
            {head("Hazard", "name")}
            {head("Risk", "risk")}
            {head("Probability", "probability")}
            {head("Impact", "impact")}
            {head("Threats", "threats", "right")}
            {head("Mitigations", "mitigations", "right")}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr
              key={r.id}
              onClick={() => onSelect(r.id)}
              style={{
                cursor: "pointer",
                background: selectedId === r.id ? "#e6f3f5" : "transparent",
                borderBottom: `1px solid ${T.line}`,
              }}
            >
              <td style={{ padding: "9px 12px", fontWeight: 600, color: T.ink }}>{r.name}</td>
              <td style={{ padding: "9px 12px" }}><RiskPill band={r.riskBand} /></td>
              <td style={{ padding: "9px 12px" }}><RiskPill band={r.probBand} /></td>
              <td style={{ padding: "9px 12px", color: T.sub }}>{r.impactBand}</td>
              <td style={{ padding: "9px 12px", textAlign: "right" }}>{r.threats}</td>
              <td style={{ padding: "9px 12px", textAlign: "right" }}>{r.mitigations}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---- Ranked top-5 list (by a chosen metric) -----------------------
function RankList({ rows, metric }) {
  const top = [...rows].sort((a, b) => b[metric] - a[metric]).slice(0, 5);
  const label = (r) =>
    metric === "risk" ? r.risk : metric === "probability" ? r.probability : r.impact;
  return (
    <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13 }}>
      {top.map((r) => (
        <li key={r.id} style={{ marginBottom: 6, display: "list-item" }}>
          <span style={{ fontWeight: 600, color: T.ink }}>{r.name}</span>
          <span style={{ float: "right", color: T.teal, fontWeight: 700 }}>{label(r)}</span>
        </li>
      ))}
    </ol>
  );
}

// ---- Add Hazard form (modal) --------------------------------------
function AddHazardForm({ onSave, onCancel }) {
  const [f, setF] = useState({
    name: "", category: "Natural", probability: 50, impact: 50,
    threats: 0, mitigations: 0, definition: "", context: "", description: "",
  });
  const [err, setErr] = useState("");
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  function submit() {
    if (!f.name.trim()) { setErr("Name is required."); return; }
    const num = (v) => Math.max(0, Math.min(100, Number(v) || 0));
    const probability = num(f.probability);
    const impact = num(f.impact);
    const record = {
      name: f.name.trim(),
      category: f.category,
      definition: f.definition.trim() || `A ${f.category.toLowerCase()} hazard.`,
      context: f.context.trim() || "Added via the report.",
      probability,
      impact,
      threats: Math.max(0, Number(f.threats) || 0),
      mitigations: Math.max(0, Number(f.mitigations) || 0),
      targetRisk: Math.max(10, Math.round(probability * 0.45 + impact * 0.55) - 15),
      capabilities: CAPABILITIES.map((name) => ({ name, score: 10 })),
      description: f.description.trim() || `${f.name.trim()} represents a risk to organizational continuity.`,
      mitigationList: [],
      threatList: [],
      references: [],
    };
    onSave(record);
  }

  const label = { fontSize: 12, fontWeight: 600, color: T.sub, display: "block", marginBottom: 4 };
  const input = {
    width: "100%", padding: "8px 10px", border: `1px solid ${T.line}`, borderRadius: 6,
    fontSize: 13, boxSizing: "border-box", fontFamily: "inherit",
  };

  return (
    <div
      onClick={onCancel}
      style={{
        position: "fixed", inset: 0, background: "rgba(15,30,40,0.45)",
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        padding: 24, zIndex: 1000, overflowY: "auto",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff", borderRadius: 12, padding: 24, width: "100%",
          maxWidth: 540, boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
        }}
      >
        <h2 style={{ margin: "0 0 16px", fontSize: 18, color: T.teal }}>Add Hazard</h2>

        <div style={{ marginBottom: 12 }}>
          <label style={label}>Hazard name *</label>
          <input style={input} value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Flash Flooding" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <label style={label}>Category</label>
            <select style={input} value={f.category} onChange={(e) => set("category", e.target.value)}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <label style={label}>Probability (0–100)</label>
            <input style={input} type="number" min="0" max="100" value={f.probability} onChange={(e) => set("probability", e.target.value)} />
          </div>
          <div>
            <label style={label}>Impact (0–100)</label>
            <input style={input} type="number" min="0" max="100" value={f.impact} onChange={(e) => set("impact", e.target.value)} />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <label style={label}>Threats (count)</label>
            <input style={input} type="number" min="0" value={f.threats} onChange={(e) => set("threats", e.target.value)} />
          </div>
          <div>
            <label style={label}>Mitigations (count)</label>
            <input style={input} type="number" min="0" value={f.mitigations} onChange={(e) => set("mitigations", e.target.value)} />
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={label}>Definition</label>
          <input style={input} value={f.definition} onChange={(e) => set("definition", e.target.value)} placeholder="What this hazard is" />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={label}>Context</label>
          <input style={input} value={f.context} onChange={(e) => set("context", e.target.value)} placeholder="Scenario / local context" />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={label}>Description</label>
          <textarea style={{ ...input, minHeight: 60, resize: "vertical" }} value={f.description} onChange={(e) => set("description", e.target.value)} />
        </div>

        {err && <p style={{ color: "#c0392b", fontSize: 13, margin: "0 0 12px" }}>{err}</p>}

        <p style={{ fontSize: 11, color: T.sub, margin: "0 0 16px" }}>
          Saved in this browser. Use “Export hazards.json” to make it permanent and shared.
        </p>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            onClick={onCancel}
            style={{ padding: "8px 16px", border: `1px solid ${T.line}`, borderRadius: 6, background: "#fff", cursor: "pointer", fontWeight: 600, fontSize: 13 }}
          >Cancel</button>
          <button
            onClick={submit}
            style={{ padding: "8px 16px", border: "none", borderRadius: 6, background: T.teal, color: "#fff", cursor: "pointer", fontWeight: 600, fontSize: 13 }}
          >Add Hazard</button>
        </div>
      </div>
    </div>
  );
}

// ---- localStorage helpers (browser-only additions) ----------------
const LS_KEY = "hva_added_hazards_v1";
function loadAdded() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function saveAdded(list) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(list)); } catch { /* ignore */ }
}

// ---- Main component ------------------------------------------------
export default function HVAReport() {
  const [rawHazards, setRawHazards] = useState(null); // source records (file + added)
  const [loadError, setLoadError] = useState(null);
  const [view, setView] = useState("summary"); // summary | category | selected | details
  const [activeCategory, setActiveCategory] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const reportRef = useRef(null);

  // Load hazard data from the JSON file, then merge any hazards this
  // browser has added locally (localStorage). Swap the fetch for a real
  // API later — the shape and everything downstream stays the same.
  useEffect(() => {
    let cancelled = false;
    fetch(`${import.meta.env.BASE_URL}hazards.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((json) => {
        if (cancelled) return;
        const fromFile = json.hazards || [];
        const added = loadAdded();
        const merged = [...fromFile, ...added];
        setRawHazards(merged);
        setSelectedId(merged[0]?.id ?? null);
      })
      .catch((e) => { if (!cancelled) setLoadError(e.message); });
    return () => { cancelled = true; };
  }, []);

  // Derived hazards (risk scores + bands) recomputed whenever raw changes.
  const data = useMemo(
    () => (rawHazards ? rawHazards.map(deriveHazard) : null),
    [rawHazards]
  );

  // Add a new hazard: append to raw list and persist the *added* subset.
  function addHazard(record) {
    setRawHazards((prev) => {
      const base = prev || [];
      const nextId = base.reduce((m, h) => Math.max(m, h.id), -1) + 1;
      const full = { ...record, id: nextId };
      const next = [...base, full];
      // Persist only the locally-added ones (everything not from the file
      // is re-derivable, but we track additions by keeping them in LS).
      const added = loadAdded();
      saveAdded([...added, full]);
      return next;
    });
    setShowAdd(false);
  }

  // Export the full current dataset as a clean hazards.json (no derived
  // fields). Commit this file to the repo to share additions with everyone.
  function exportData() {
    const clean = (rawHazards || []).map((h) => {
      const { risk, riskBand, probBand, impactBand, ...rest } = h;
      return rest;
    });
    const blob = new Blob([JSON.stringify({ hazards: clean }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "hazards.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function clearAdded() {
    if (!confirm("Remove hazards added in this browser? Hazards from the published file stay.")) return;
    saveAdded([]);
    window.location.reload();
  }
    if (!data) return [];
    if (view === "category" && activeCategory) {
      return data.filter((r) => r.category === activeCategory);
    }
    return data;
  }, [data, view, activeCategory]);

  const selected = data ? (data.find((r) => r.id === selectedId) || data[0]) : null;

  const totals = useMemo(() => {
    if (!data) return { preparedness: 0, hazards: 0, threats: 0, mitigations: 0 };
    const set = view === "category" && activeCategory ? rows : data;
    if (!set.length) return { preparedness: 0, hazards: 0, threats: 0, mitigations: 0 };
    return {
      preparedness: Math.round(set.reduce((a, r) => a + (100 - r.risk), 0) / set.length),
      hazards: set.length,
      threats: set.reduce((a, r) => a + r.threats, 0),
      mitigations: set.reduce((a, r) => a + r.mitigations, 0),
    };
  }, [data, rows, view, activeCategory]);

  // aggregate capability scores for summary views
  const aggCaps = useMemo(() => {
    if (!data || !data.length) return CAPABILITIES.map((name) => ({ name, score: 0 }));
    const set = view === "category" && activeCategory ? rows : data;
    if (!set.length) return CAPABILITIES.map((name) => ({ name, score: 0 }));
    return CAPABILITIES.map((name, ci) => ({
      name,
      score: Math.round(set.reduce((a, r) => a + r.capabilities[ci].score, 0) / set.length),
    }));
  }, [data, rows, view, activeCategory]);

  async function exportPdf() {
    setExporting(true);
    try {
      const { jsPDF } = await import("jspdf");
      const html2canvas = (await import("html2canvas")).default;
      const node = reportRef.current;
      const canvas = await html2canvas(node, { scale: 2, backgroundColor: "#ffffff" });
      const img = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const w = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const h = (canvas.height * w) / canvas.width;
      let pos = 0;
      pdf.addImage(img, "PNG", 0, pos, w, h);
      let remaining = h - pageH;
      while (remaining > 0) {
        pos -= pageH;
        pdf.addPage();
        pdf.addImage(img, "PNG", 0, pos, w, h);
        remaining -= pageH;
      }
      pdf.save(`HVA_Report_${view}.pdf`);
    } catch (e) {
      console.error(e);
      alert("PDF export failed. Check the console for details.");
    } finally {
      setExporting(false);
    }
  }

  const tabs = [
    { id: "summary", label: "HVA Summary" },
    ...CATEGORIES.map((c) => ({ id: c, label: c, isCat: true })),
  ];

  if (loadError) {
    return (
      <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", padding: 32, color: T.ink }}>
        <h3 style={{ color: "#c0392b", margin: "0 0 8px" }}>Couldn't load hazard data</h3>
        <p style={{ color: T.sub, margin: 0 }}>
          Tried to read <code>hazards.json</code> but got: {loadError}. Make sure the file
          exists in the <code>public/</code> folder and the dev server is running.
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", padding: 32, color: T.sub }}>
        Loading hazard data…
      </div>
    );
  }

  return (
    <div style={{
      fontFamily: "'Segoe UI', system-ui, sans-serif", background: T.bg,
      padding: 16, color: T.ink, minHeight: 600,
    }}>
      {/* Header bar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: T.panel, border: `1px solid ${T.line}`, borderRadius: 10,
        padding: "12px 16px", marginBottom: 12, flexWrap: "wrap", gap: 10,
      }}>
        <strong style={{ color: T.teal, fontSize: 16 }}>Hazard Vulnerability Analysis — Report</strong>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {tabs.map((t) => {
            const active = t.isCat ? (view === "category" && activeCategory === t.id) : view === t.id;
            return (
              <button
                key={t.id}
                onClick={() => {
                  if (t.isCat) { setView("category"); setActiveCategory(t.id); }
                  else { setView("summary"); setActiveCategory(null); }
                }}
                style={{
                  border: "none", borderRadius: 6, padding: "6px 12px", fontSize: 12,
                  cursor: "pointer", fontWeight: 600,
                  background: active ? T.tealDark : T.chip, color: "#fff",
                  opacity: active ? 1 : 0.85,
                }}
              >{t.label}</button>
            );
          })}
          <button
            onClick={() => setShowAdd(true)}
            style={{
              border: "none", borderRadius: 6, padding: "6px 12px",
              fontSize: 12, cursor: "pointer", fontWeight: 600, background: "#27ae60", color: "#fff",
            }}
          >+ Add Hazard</button>
          <button
            onClick={exportData}
            style={{
              border: `1px solid ${T.teal}`, borderRadius: 6, padding: "6px 12px",
              fontSize: 12, cursor: "pointer", fontWeight: 600, background: "#fff", color: T.teal,
            }}
          >Export hazards.json</button>
          <button
            onClick={clearAdded}
            title="Remove hazards you added in this browser"
            style={{
              border: `1px solid ${T.line}`, borderRadius: 6, padding: "6px 12px",
              fontSize: 12, cursor: "pointer", fontWeight: 600, background: "#fff", color: T.sub,
            }}
          >Clear my additions</button>
          <button
            onClick={exportPdf}
            disabled={exporting}
            style={{
              border: `1px solid ${T.teal}`, borderRadius: 6, padding: "6px 12px",
              fontSize: 12, cursor: "pointer", fontWeight: 600, background: "#fff", color: T.teal,
            }}
          >{exporting ? "Exporting…" : "Export PDF"}</button>
        </div>
      </div>

      {showAdd && <AddHazardForm onSave={addHazard} onCancel={() => setShowAdd(false)} />}

      <div ref={reportRef} style={{ display: "grid", gridTemplateColumns: "150px 1fr", gap: 12 }}>
        {/* Left stat rail */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <StatBox label="Preparedness Index" value={totals.preparedness} />
          <StatBox label="Total Hazards" value={totals.hazards} />
          <StatBox label="Total Threats" value={totals.threats} />
          <StatBox label="Total Mitigations" value={totals.mitigations} />
        </div>

        {/* Main column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
          {(view === "summary" || view === "category") && (
            <>
              {view === "category" && (
                <Panel>
                  <p style={{ margin: 0, fontSize: 13, color: T.sub, lineHeight: 1.5 }}>
                    {CATEGORY_INTRO[activeCategory]}
                  </p>
                </Panel>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "minmax(220px,1fr) minmax(280px,1.4fr)", gap: 12 }}>
                <Panel title={view === "category" ? `Risk Index — ${activeCategory}` : "Risk Index by Hazard Type"}>
                  <CategoryDoughnut rows={data} activeCategory={view === "category" ? activeCategory : null} />
                </Panel>
                <Panel title="Risk Index by Core Capability">
                  <CapabilitiesBar capabilities={aggCaps} />
                </Panel>
              </div>

              <Panel title="Hazard Prioritization">
                <HazardGrid
                  rows={rows}
                  selectedId={selectedId}
                  onSelect={(id) => { setSelectedId(id); setView("details"); }}
                />
                <p style={{ fontSize: 11, color: T.sub, margin: "10px 2px 0" }}>
                  Select a hazard row to open its detailed view.
                </p>
              </Panel>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <Panel title="Top 5 by Overall Risk">
                  <RankList rows={rows} metric="risk" />
                </Panel>
                <Panel title="Top 5 by Probability">
                  <RankList rows={rows} metric="probability" />
                </Panel>
                <Panel title="Top 5 by Impact">
                  <RankList rows={rows} metric="impact" />
                </Panel>
              </div>
            </>
          )}

          {view === "details" && (
            <>
              <button
                onClick={() => setView("summary")}
                style={{
                  alignSelf: "flex-start", border: "none", background: "transparent",
                  color: T.teal, cursor: "pointer", fontWeight: 600, fontSize: 13, padding: 0,
                }}
              >← Back to summary</button>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Panel title={`${selected.name} — Risk Analysis`}>
                  <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
                    <RiskPill band={selected.riskBand} />
                    <span style={{ fontSize: 12, color: T.sub }}>Category: <strong>{selected.category}</strong></span>
                  </div>
                  <div style={{ display: "flex", gap: 16, marginBottom: 12, flexWrap: "wrap" }}>
                    <div><div style={{ fontSize: 11, color: T.sub }}>Probability</div><div style={{ fontWeight: 700, fontSize: 20 }}>{selected.probability}</div></div>
                    <div><div style={{ fontSize: 11, color: T.sub }}>Impact</div><div style={{ fontWeight: 700, fontSize: 20 }}>{selected.impact}</div></div>
                    <div><div style={{ fontSize: 11, color: T.sub }}>Current Risk</div><div style={{ fontWeight: 700, fontSize: 20, color: T.teal }}>{selected.risk}</div></div>
                    <div><div style={{ fontSize: 11, color: T.sub }}>Target Risk</div><div style={{ fontWeight: 700, fontSize: 20, color: "#27ae60" }}>{selected.targetRisk}</div></div>
                  </div>
                  {/* current vs target benchmark bar */}
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ height: 10, background: T.line, borderRadius: 5, position: "relative" }}>
                      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${selected.risk}%`, background: T.teal, borderRadius: 5 }} />
                      <div title="Target" style={{ position: "absolute", left: `${selected.targetRisk}%`, top: -3, bottom: -3, width: 2, background: "#27ae60" }} />
                    </div>
                    <div style={{ fontSize: 10, color: T.sub, marginTop: 4 }}>Current risk vs target benchmark (green marker)</div>
                  </div>
                  <p style={{ fontSize: 12, color: T.ink, lineHeight: 1.5, margin: "0 0 6px" }}><strong>Definition:</strong> {selected.definition}</p>
                  <p style={{ fontSize: 12, color: T.sub, lineHeight: 1.5, margin: 0 }}><strong>Context:</strong> {selected.context}</p>
                </Panel>
                <Panel title="Risk Distribution by Core Capability">
                  <CapabilitiesBar capabilities={selected.capabilities} />
                </Panel>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Panel title="Threat Assessment">
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <tbody>
                      {selected.threatList.map((t) => (
                        <tr key={t.id} style={{ borderBottom: `1px solid ${T.line}` }}>
                          <td style={{ padding: "8px 4px" }}>{t.title}</td>
                          <td style={{ padding: "8px 4px", textAlign: "right" }}><RiskPill band={t.severity} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Panel>
                <Panel title="Mitigation Plan (by core capability)">
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: "left", padding: "6px 4px", color: T.sub, borderBottom: `2px solid ${T.line}` }}>Strategy</th>
                        <th style={{ textAlign: "left", padding: "6px 4px", color: T.sub, borderBottom: `2px solid ${T.line}` }}>Capability</th>
                        <th style={{ textAlign: "right", padding: "6px 4px", color: T.sub, borderBottom: `2px solid ${T.line}` }}>Due</th>
                        <th style={{ textAlign: "right", padding: "6px 4px", color: T.sub, borderBottom: `2px solid ${T.line}` }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.mitigationList.map((m) => (
                        <tr key={m.id} style={{ borderBottom: `1px solid ${T.line}` }}>
                          <td style={{ padding: "7px 4px" }}>{m.title}</td>
                          <td style={{ padding: "7px 4px", color: T.sub }}>{m.capability?.split(" ").slice(0, 2).join(" ")}</td>
                          <td style={{ padding: "7px 4px", textAlign: "right", color: T.sub }}>{m.dueDate}</td>
                          <td style={{ padding: "7px 4px", textAlign: "right", color: T.sub }}>{m.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Panel>
              </div>

              <Panel title="References">
                {selected.references && selected.references.length ? (
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: T.sub }}>
                    {selected.references.map((r, i) => (
                      <li key={i} style={{ marginBottom: 4 }}>{r}</li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ margin: 0, fontSize: 12.5, color: T.sub }}>No references recorded.</p>
                )}
              </Panel>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
