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

// ---- Design tokens (defined as CSS vars in index.html) ------------
const T = {
  ink: "var(--ink)",
  sub: "var(--slate)",
  subSoft: "var(--slate-soft)",
  line: "var(--hairline)",
  panel: "var(--surface)",
  bg: "var(--canvas)",
  bg2: "var(--canvas-2)",
  accent: "var(--accent)",
  accentSoft: "var(--accent-soft)",
  accentInk: "var(--accent-ink)",
  shadowSm: "var(--shadow-sm)",
  shadowMd: "var(--shadow-md)",
  radius: "var(--radius)",
  radiusSm: "var(--radius-sm)",
  display: "var(--font-display)",
  body: "var(--font-body)",
};

const RISK_COLORS = {
  "Very High": { bg: "var(--risk-vhigh)", fg: "#fff" },
  High: { bg: "var(--risk-high)", fg: "#fff" },
  Medium: { bg: "var(--risk-med)", fg: "#fff" },
  Low: { bg: "var(--risk-low)", fg: "#fff" },
};

// raw hex for chart.js (can't take CSS vars)
const RISK_HEX = {
  vhigh: "#dc2626", high: "#ea580c", med: "#d97706", low: "#16a34a",
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
function StatBox({ label, value, accent }) {
  return (
    <div style={{
      borderRadius: T.radiusSm, padding: "14px 16px",
      background: T.panel, boxShadow: T.shadowSm, border: `1px solid ${T.line}`,
      minWidth: 120, flex: 1,
    }}>
      <div style={{ fontSize: 10.5, color: T.subSoft, textTransform: "uppercase", letterSpacing: 0.6, fontWeight: 600 }}>
        {label}
      </div>
      <div className="tnum" style={{
        fontFamily: T.display, fontSize: 32, fontWeight: 800,
        color: accent ? T.accent : T.ink, lineHeight: 1.05, marginTop: 6, letterSpacing: -0.5,
      }}>
        {value}
      </div>
    </div>
  );
}

function RiskPill({ band, small }) {
  const c = RISK_COLORS[band] || RISK_COLORS.Low;
  return (
    <span style={{
      background: c.bg, color: c.fg,
      padding: small ? "2px 8px" : "3px 11px", borderRadius: 999,
      fontSize: small ? 11 : 11.5, fontWeight: 600, display: "inline-block",
      minWidth: small ? 56 : 68, textAlign: "center", letterSpacing: 0.2,
    }}>
      {band}
    </span>
  );
}

function Panel({ title, action, children, style }) {
  return (
    <section style={{
      background: T.panel, borderRadius: T.radius, boxShadow: T.shadowSm,
      border: `1px solid ${T.line}`, padding: 20, ...style,
    }}>
      {title && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          margin: "0 0 16px",
        }}>
          <h3 style={{
            margin: 0, fontFamily: T.display, fontSize: 13.5, fontWeight: 700,
            color: T.ink, letterSpacing: -0.1,
          }}>{title}</h3>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

// ---- Charts --------------------------------------------------------
const CHART_FONT = { family: "Inter, system-ui, sans-serif", size: 11 };

function CategoryDoughnut({ rows, activeCategory }) {
  const counts = CATEGORIES.map(
    (c) => rows.filter((r) => r.category === c).reduce((a, r) => a + r.risk, 0)
  );
  // indigo-led categorical ramp, calm and distinct
  const palette = ["#4338ca", "#0891b2", "#7c3aed", "#0d9488"];
  const data = {
    labels: CATEGORIES,
    datasets: [{
      data: counts,
      backgroundColor: palette.map((p, i) =>
        activeCategory && CATEGORIES[i] !== activeCategory ? p + "33" : p),
      borderWidth: 3, borderColor: "#fff", hoverOffset: 6,
    }],
  };
  const total = counts.reduce((a, b) => a + b, 0);
  const pct = (v) => (total ? Math.round((v / total) * 100) : 0);
  return (
    <div style={{ position: "relative", height: 210 }}>
      <Doughnut
        data={data}
        options={{
          cutout: "68%", maintainAspectRatio: false,
          plugins: {
            legend: {
              position: "bottom",
              labels: {
                boxWidth: 10, boxHeight: 10, usePointStyle: true, pointStyle: "circle",
                font: CHART_FONT, color: "#475569", padding: 12,
                generateLabels: (chart) => {
                  const ds = chart.data.datasets[0];
                  return chart.data.labels.map((lab, i) => ({
                    text: `${lab} — ${pct(ds.data[i])}%`,
                    fillStyle: palette[i],
                    strokeStyle: palette[i],
                    pointStyle: "circle",
                    index: i,
                  }));
                },
              },
            },
            tooltip: {
              backgroundColor: "#0f172a", padding: 10, cornerRadius: 8,
              titleFont: CHART_FONT, bodyFont: CHART_FONT,
              callbacks: {
                label: (ctx) => ` ${ctx.label}: ${ctx.parsed} (${pct(ctx.parsed)}%)`,
              },
            },
          },
        }}
      />
      <div style={{
        position: "absolute", top: "38%", left: 0, right: 0, textAlign: "center",
        pointerEvents: "none",
      }}>
        <div className="tnum" style={{ fontFamily: T.display, fontSize: 26, fontWeight: 800, color: T.ink, letterSpacing: -0.5 }}>{total}</div>
        <div style={{ fontSize: 9.5, color: T.subSoft, textTransform: "uppercase", letterSpacing: 0.6, fontWeight: 600 }}>Total Risk Index</div>
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
        c.score >= 18 ? RISK_HEX.vhigh : c.score >= 14 ? RISK_HEX.high : RISK_HEX.low),
      borderRadius: 6, borderSkipped: false, barPercentage: 0.7, categoryPercentage: 0.8,
    }],
  };
  return (
    <div style={{ height: 218 }}>
      <Bar
        data={data}
        options={{
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { backgroundColor: "#0f172a", padding: 10, cornerRadius: 8, titleFont: CHART_FONT, bodyFont: CHART_FONT },
          },
          scales: {
            y: { beginAtZero: true, max: 20, grid: { color: "#f1f5f9" }, border: { display: false }, ticks: { font: CHART_FONT, color: "#94a3b8", stepSize: 5 } },
            x: { grid: { display: false }, border: { display: false }, ticks: { font: { ...CHART_FONT, size: 9 }, color: "#64748b", maxRotation: 40, minRotation: 40 } },
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
        textAlign: align, padding: "10px 14px", fontSize: 10.5, color: T.subSoft,
        cursor: "pointer", userSelect: "none", borderBottom: `1px solid ${T.line}`,
        whiteSpace: "nowrap", textTransform: "uppercase", letterSpacing: 0.6, fontWeight: 600,
      }}
    >
      {label}{sort.key === key ? (sort.dir === "asc" ? " ↑" : " ↓") : ""}
    </th>
  );

  return (
    <div style={{ overflowX: "auto", margin: "0 -4px" }}>
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
              onMouseEnter={(e) => { if (selectedId !== r.id) e.currentTarget.style.background = "var(--canvas)"; }}
              onMouseLeave={(e) => { if (selectedId !== r.id) e.currentTarget.style.background = "transparent"; }}
              style={{
                cursor: "pointer",
                background: selectedId === r.id ? "var(--accent-soft)" : "transparent",
                borderBottom: `1px solid ${T.line}`,
                transition: "background 0.12s ease",
              }}
            >
              <td style={{ padding: "11px 14px", fontWeight: 600, color: T.ink }}>{r.name}</td>
              <td style={{ padding: "11px 14px" }}><RiskPill band={r.riskBand} small /></td>
              <td style={{ padding: "11px 14px" }}><RiskPill band={r.probBand} small /></td>
              <td style={{ padding: "11px 14px", color: T.sub }}>{r.impactBand}</td>
              <td className="tnum" style={{ padding: "11px 14px", textAlign: "right", color: T.ink, fontWeight: 600 }}>{r.threats}</td>
              <td className="tnum" style={{ padding: "11px 14px", textAlign: "right", color: T.ink, fontWeight: 600 }}>{r.mitigations}</td>
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
    <ol style={{ margin: 0, padding: 0, listStyle: "none" }}>
      {top.map((r, i) => (
        <li key={r.id} style={{
          display: "flex", alignItems: "center", gap: 10, padding: "7px 0",
          borderBottom: i < top.length - 1 ? `1px solid ${T.line}` : "none",
        }}>
          <span className="tnum" style={{ fontFamily: T.display, fontSize: 12, fontWeight: 700, color: T.subSoft, width: 16 }}>{i + 1}</span>
          <span style={{ fontWeight: 600, color: T.ink, fontSize: 13, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</span>
          <span className="tnum" style={{ color: T.accentInk, fontWeight: 700, fontSize: 13.5 }}>{label(r)}</span>
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
    width: "100%", padding: "8px 10px", border: `1px solid ${T.line}`, borderRadius: 9,
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
          background: "#fff", borderRadius: 16, padding: 24, width: "100%",
          maxWidth: 540, boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
        }}
      >
        <h2 style={{ margin: "0 0 4px", fontFamily: T.display, fontSize: 19, fontWeight: 800, color: T.ink, letterSpacing: -0.3 }}>Add hazard</h2>
        <p style={{ margin: "0 0 18px", fontSize: 12.5, color: T.subSoft }}>Enter the assessment values. Risk score is calculated automatically.</p>

        <div style={{ marginBottom: 12 }}>
          <label style={label}>Hazard name *</label>
          <input style={input} value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Flash Flooding" />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={label}>Category</label>
          <select style={input} value={f.category} onChange={(e) => set("category", e.target.value)}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
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
            style={{ padding: "8px 16px", border: `1px solid ${T.line}`, borderRadius: 9, background: "#fff", cursor: "pointer", fontWeight: 600, fontSize: 13 }}
          >Cancel</button>
          <button
            onClick={submit}
            style={{ padding: "8px 16px", border: "none", borderRadius: 9, background: T.accent, color: "#fff", cursor: "pointer", fontWeight: 600, fontSize: 13 }}
          >Add Hazard</button>
        </div>
      </div>
    </div>
  );
}

// ---- Reusable modal shell -----------------------------------------
function Modal({ title, subtitle, children, onCancel }) {
  return (
    <div
      onClick={onCancel}
      style={{
        position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)",
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        padding: 24, zIndex: 1000, overflowY: "auto",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff", borderRadius: 16, padding: 24, width: "100%",
          maxWidth: 480, boxShadow: "0 10px 40px rgba(0,0,0,0.2)", fontFamily: T.body,
        }}
      >
        <h2 style={{ margin: "0 0 4px", fontFamily: T.display, fontSize: 19, fontWeight: 800, color: T.ink, letterSpacing: -0.3 }}>{title}</h2>
        {subtitle && <p style={{ margin: "0 0 18px", fontSize: 12.5, color: T.subSoft }}>{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}

const fieldLabel = { fontSize: 12, fontWeight: 600, color: "var(--slate)", display: "block", marginBottom: 4 };
const fieldInput = {
  width: "100%", padding: "8px 10px", border: "1px solid var(--hairline)", borderRadius: 9,
  fontSize: 13, boxSizing: "border-box", fontFamily: "inherit",
};
const modalBtnRow = { display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 };
const cancelBtn = { padding: "8px 16px", border: "1px solid var(--hairline)", borderRadius: 9, background: "#fff", cursor: "pointer", fontWeight: 600, fontSize: 13, fontFamily: "inherit" };
const saveBtn = { padding: "8px 16px", border: "none", borderRadius: 9, background: "var(--accent)", color: "#fff", cursor: "pointer", fontWeight: 600, fontSize: 13, fontFamily: "inherit" };

function StatusPill({ status, onChange }) {
  const c = STATUS_COLOR[status] || STATUS_COLOR["Not started"];
  if (onChange) {
    return (
      <select
        value={status}
        onChange={(e) => onChange(e.target.value)}
        style={{
          background: c.bg, color: c.fg, border: "none", borderRadius: 999,
          padding: "3px 10px", fontSize: 11.5, fontWeight: 600, cursor: "pointer",
          fontFamily: "inherit", appearance: "none", textAlign: "center",
        }}
      >
        {ACTION_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
    );
  }
  return (
    <span style={{ background: c.bg, color: c.fg, borderRadius: 999, padding: "3px 10px", fontSize: 11.5, fontWeight: 600 }}>{status}</span>
  );
}

// ---- Add Action form ----------------------------------------------
function AddActionForm({ hazard, onSave, onCancel }) {
  const [f, setF] = useState({ title: "", owner: "", due: "", status: "Not started", notes: "", mitigationId: "" });
  const [err, setErr] = useState("");
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  function submit() {
    if (!f.title.trim()) { setErr("An action title is required."); return; }
    onSave({
      hazardId: hazard.id,
      mitigationId: f.mitigationId === "" ? null : Number(f.mitigationId),
      title: f.title.trim(),
      owner: f.owner.trim(),
      due: f.due,
      status: f.status,
      notes: f.notes.trim(),
    });
  }

  return (
    <Modal title="Assign action" subtitle={`For hazard: ${hazard.name}`} onCancel={onCancel}>
      <div style={{ marginBottom: 12 }}>
        <label style={fieldLabel}>Action *</label>
        <input style={fieldInput} value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Review evacuation routes" />
      </div>
      {hazard.mitigationList && hazard.mitigationList.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <label style={fieldLabel}>Linked mitigation (optional)</label>
          <select style={fieldInput} value={f.mitigationId} onChange={(e) => set("mitigationId", e.target.value)}>
            <option value="">— none —</option>
            {hazard.mitigationList.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
          </select>
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <div>
          <label style={fieldLabel}>Owner</label>
          <input style={fieldInput} value={f.owner} onChange={(e) => set("owner", e.target.value)} placeholder="Name or team" />
        </div>
        <div>
          <label style={fieldLabel}>Due date</label>
          <input type="date" style={fieldInput} value={f.due} onChange={(e) => set("due", e.target.value)} />
        </div>
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={fieldLabel}>Status</label>
        <select style={fieldInput} value={f.status} onChange={(e) => set("status", e.target.value)}>
          {ACTION_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={fieldLabel}>Notes</label>
        <textarea style={{ ...fieldInput, minHeight: 56, resize: "vertical" }} value={f.notes} onChange={(e) => set("notes", e.target.value)} />
      </div>
      {err && <p style={{ color: "#b91c1c", fontSize: 13, margin: "0 0 12px" }}>{err}</p>}
      <p style={{ fontSize: 11, color: "var(--slate-soft)", margin: "0 0 16px" }}>Saved in this browser. Use “Export data” to make it permanent and shared.</p>
      <div style={modalBtnRow}>
        <button onClick={onCancel} style={cancelBtn}>Cancel</button>
        <button onClick={submit} style={saveBtn}>Save action</button>
      </div>
    </Modal>
  );
}

// ---- Attach Document form -----------------------------------------
function AddDocumentForm({ hazard, onSave, onCancel }) {
  const [f, setF] = useState({ label: "", url: "" });
  const [err, setErr] = useState("");
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  function submit() {
    if (!f.label.trim()) { setErr("A document name is required."); return; }
    let url = f.url.trim();
    if (!url) { setErr("Paste a link to the document."); return; }
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;
    onSave({ hazardId: hazard.id, label: f.label.trim(), url });
  }

  return (
    <Modal title="Attach document" subtitle={`For hazard: ${hazard.name}`} onCancel={onCancel}>
      <div style={{ marginBottom: 12 }}>
        <label style={fieldLabel}>Document name *</label>
        <input style={fieldInput} value={f.label} onChange={(e) => set("label", e.target.value)} placeholder="e.g. Evacuation plan (PDF)" />
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={fieldLabel}>Link *</label>
        <input style={fieldInput} value={f.url} onChange={(e) => set("url", e.target.value)} placeholder="SharePoint / Drive / OneDrive URL" />
      </div>
      {err && <p style={{ color: "#b91c1c", fontSize: 13, margin: "0 0 12px" }}>{err}</p>}
      <p style={{ fontSize: 11, color: "var(--slate-soft)", margin: "0 0 16px" }}>
        Links to a document stored elsewhere (no upload). Saved in this browser; use “Export data” to share.
      </p>
      <div style={modalBtnRow}>
        <button onClick={onCancel} style={cancelBtn}>Cancel</button>
        <button onClick={submit} style={saveBtn}>Attach link</button>
      </div>
    </Modal>
  );
}

// ---- localStorage helpers (browser-only additions) ----------------
const LS_KEY = "hva_added_hazards_v1";
const LS_ACTIONS = "hva_actions_v1";
const LS_DOCS = "hva_documents_v1";

function lsLoad(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function lsSave(key, list) {
  try { localStorage.setItem(key, JSON.stringify(list)); } catch { /* ignore */ }
}
// kept for backwards-compatibility with existing calls
function loadAdded() { return lsLoad(LS_KEY); }
function saveAdded(list) { lsSave(LS_KEY, list); }

const ACTION_STATUSES = ["Not started", "In progress", "Blocked", "Complete"];
const STATUS_COLOR = {
  "Not started": { bg: "var(--canvas-2)", fg: "var(--slate)" },
  "In progress": { bg: "var(--accent-soft)", fg: "var(--accent-ink)" },
  "Blocked": { bg: "#fef2f2", fg: "#b91c1c" },
  "Complete": { bg: "#f0fdf4", fg: "#15803d" },
};

// ---- Main component ------------------------------------------------
export default function HVAReport() {
  const [rawHazards, setRawHazards] = useState(null); // source records (file + added)
  const [loadError, setLoadError] = useState(null);
  const [view, setView] = useState("summary"); // summary | category | selected | details
  const [activeCategory, setActiveCategory] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [actions, setActions] = useState([]);     // {id, hazardId, mitigationId?, title, owner, due, status, notes}
  const [documents, setDocuments] = useState([]); // {id, hazardId, label, url}
  const [showActionFor, setShowActionFor] = useState(null); // hazardId when adding an action
  const [showDocFor, setShowDocFor] = useState(null);       // hazardId when adding a document
  const reportRef = useRef(null);

  function addAction(rec) {
    setActions((prev) => {
      const nextId = prev.reduce((m, a) => Math.max(m, a.id), -1) + 1;
      const next = [...prev, { ...rec, id: nextId }];
      lsSave(LS_ACTIONS, next);
      return next;
    });
    setShowActionFor(null);
  }
  function updateActionStatus(id, status) {
    setActions((prev) => {
      const next = prev.map((a) => (a.id === id ? { ...a, status } : a));
      lsSave(LS_ACTIONS, next);
      return next;
    });
  }
  function deleteAction(id) {
    setActions((prev) => {
      const next = prev.filter((a) => a.id !== id);
      lsSave(LS_ACTIONS, next);
      return next;
    });
  }
  function addDocument(rec) {
    setDocuments((prev) => {
      const nextId = prev.reduce((m, d) => Math.max(m, d.id), -1) + 1;
      const next = [...prev, { ...rec, id: nextId }];
      lsSave(LS_DOCS, next);
      return next;
    });
    setShowDocFor(null);
  }
  function deleteDocument(id) {
    setDocuments((prev) => {
      const next = prev.filter((d) => d.id !== id);
      lsSave(LS_DOCS, next);
      return next;
    });
  }

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
        // Merge any actions/documents shipped in the file with local ones,
        // de-duplicating by a stable signature so re-imports don't double up.
        const localActs = lsLoad(LS_ACTIONS);
        const localDocs = lsLoad(LS_DOCS);
        const fileActs = json.actions || [];
        const fileDocs = json.documents || [];
        const sigA = (a) => `${a.hazardId}|${a.title}|${a.owner}|${a.due}`;
        const sigD = (d) => `${d.hazardId}|${d.url}`;
        const seenA = new Set(localActs.map(sigA));
        const seenD = new Set(localDocs.map(sigD));
        const mergedActs = [...localActs, ...fileActs.filter((a) => !seenA.has(sigA(a)))];
        const mergedDocs = [...localDocs, ...fileDocs.filter((d) => !seenD.has(sigD(d)))];
        // reassign ids to stay unique after merge
        const reA = mergedActs.map((a, i) => ({ ...a, id: i }));
        const reD = mergedDocs.map((d, i) => ({ ...d, id: i }));
        setActions(reA); lsSave(LS_ACTIONS, reA);
        setDocuments(reD); lsSave(LS_DOCS, reD);
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
  // fields), including actions and documents. Commit this file to the
  // repo to share everything with everyone.
  function exportData() {
    const clean = (rawHazards || []).map((h) => {
      const { risk, riskBand, probBand, impactBand, ...rest } = h;
      return rest;
    });
    const payload = { hazards: clean, actions, documents };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
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

  const rows = useMemo(() => {
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
    { id: "actions", label: "Action Plan", isActions: true },
  ];

  if (loadError) {
    return (
      <div style={{ fontFamily: T.body, padding: 32, color: T.ink }}>
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
      <div style={{ fontFamily: T.body, padding: 32, color: T.sub }}>
        Loading hazard data…
      </div>
    );
  }

  const todayStr = new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });

  const actionBtn = (extra) => ({
    border: `1px solid ${T.line}`, borderRadius: 8, padding: "7px 13px",
    fontSize: 12.5, cursor: "pointer", fontWeight: 600, background: T.panel,
    color: T.sub, fontFamily: T.body, boxShadow: T.shadowSm, ...extra,
  });

  return (
    <div style={{
      fontFamily: T.body, background: T.bg,
      padding: "20px 24px", color: T.ink, minHeight: 600,
    }}>
      {/* Title block — report identity */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 16, marginBottom: 16, flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {/* logo placeholder — the template calls for a company logo */}
          <div style={{
            width: 44, height: 44, borderRadius: 11, background: T.accent,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontFamily: T.display, fontWeight: 800, fontSize: 18,
            boxShadow: T.shadowMd, flexShrink: 0,
          }}>HV</div>
          <div>
            <h1 style={{
              margin: 0, fontFamily: T.display, fontSize: 21, fontWeight: 800,
              color: T.ink, letterSpacing: -0.4, lineHeight: 1.1,
            }}>Hazard Vulnerability Analysis</h1>
            <div style={{ fontSize: 12.5, color: T.subSoft, marginTop: 2 }}>
              Preparedness report · {todayStr}
            </div>
          </div>
        </div>
        <div className="no-print" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => setShowAdd(true)} style={actionBtn({ background: T.accent, color: "#fff", border: `1px solid ${T.accent}` })}>+ Add hazard</button>
          <button onClick={exportData} style={actionBtn()}>Export data</button>
          <button onClick={exportPdf} disabled={exporting} style={actionBtn()}>{exporting ? "Exporting…" : "Export PDF"}</button>
          <button onClick={clearAdded} title="Remove hazards you added in this browser" style={actionBtn({ color: T.subSoft })}>Reset</button>
        </div>
      </div>

      {/* Segmented navigation */}
      <div className="no-print" style={{
        display: "inline-flex", gap: 3, padding: 4, marginBottom: 18,
        background: T.bg2, borderRadius: 11, flexWrap: "wrap",
      }}>
        {tabs.map((t) => {
          const active = t.isActions ? view === "actions"
            : t.isCat ? (view === "category" && activeCategory === t.id)
            : (view === t.id || (view === "details" && !t.isCat && t.id === "summary"));
          return (
            <button
              key={t.id}
              onClick={() => {
                if (t.isActions) { setView("actions"); setActiveCategory(null); }
                else if (t.isCat) { setView("category"); setActiveCategory(t.id); }
                else { setView("summary"); setActiveCategory(null); }
              }}
              style={{
                border: "none", borderRadius: 8, padding: "7px 15px", fontSize: 12.5,
                cursor: "pointer", fontWeight: 600, fontFamily: T.body,
                background: active ? T.panel : "transparent",
                color: active ? T.accentInk : T.sub,
                boxShadow: active ? T.shadowSm : "none",
                transition: "all 0.15s ease",
              }}
            >{t.label}</button>
          );
        })}
      </div>

      {showAdd && <AddHazardForm onSave={addHazard} onCancel={() => setShowAdd(false)} />}
      {showActionFor != null && data && (
        <AddActionForm hazard={data.find((h) => h.id === showActionFor)} onSave={addAction} onCancel={() => setShowActionFor(null)} />
      )}
      {showDocFor != null && data && (
        <AddDocumentForm hazard={data.find((h) => h.id === showDocFor)} onSave={addDocument} onCancel={() => setShowDocFor(null)} />
      )}

      <div ref={reportRef} style={{ display: "grid", gridTemplateColumns: "168px 1fr", gap: 16 }}>
        {/* Left stat rail */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <StatBox label="Preparedness Index" value={totals.preparedness} accent />
          <StatBox label="Total Hazards" value={totals.hazards} />
          <StatBox label="Total Threats" value={totals.threats} />
          <StatBox label="Total Mitigations" value={totals.mitigations} />
        </div>

        {/* Main column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
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
                  alignSelf: "flex-start", border: `1px solid ${T.line}`, background: T.panel,
                  color: T.sub, cursor: "pointer", fontWeight: 600, fontSize: 12.5,
                  padding: "7px 14px", borderRadius: 8, boxShadow: T.shadowSm, fontFamily: T.body,
                }}
              >← Back to summary</button>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <Panel title={`${selected.name} — Risk Analysis`}>
                  <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
                    <RiskPill band={selected.riskBand} />
                    <span style={{ fontSize: 12, color: T.sub }}>Category: <strong style={{ color: T.ink }}>{selected.category}</strong></span>
                  </div>
                  <div style={{ display: "flex", gap: 20, marginBottom: 14, flexWrap: "wrap" }}>
                    <div><div style={{ fontSize: 10.5, color: T.subSoft, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600 }}>Probability</div><div className="tnum" style={{ fontFamily: T.display, fontWeight: 800, fontSize: 22, color: T.ink }}>{selected.probability}</div></div>
                    <div><div style={{ fontSize: 10.5, color: T.subSoft, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600 }}>Impact</div><div className="tnum" style={{ fontFamily: T.display, fontWeight: 800, fontSize: 22, color: T.ink }}>{selected.impact}</div></div>
                    <div><div style={{ fontSize: 10.5, color: T.subSoft, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600 }}>Current risk</div><div className="tnum" style={{ fontFamily: T.display, fontWeight: 800, fontSize: 22, color: T.accent }}>{selected.risk}</div></div>
                    <div><div style={{ fontSize: 10.5, color: T.subSoft, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600 }}>Target risk</div><div className="tnum" style={{ fontFamily: T.display, fontWeight: 800, fontSize: 22, color: "var(--risk-low)" }}>{selected.targetRisk}</div></div>
                  </div>
                  {/* current vs target benchmark bar */}
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ height: 8, background: T.bg2, borderRadius: 999, position: "relative" }}>
                      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${selected.risk}%`, background: T.accent, borderRadius: 999 }} />
                      <div title="Target" style={{ position: "absolute", left: `${selected.targetRisk}%`, top: -4, bottom: -4, width: 3, background: "var(--risk-low)", borderRadius: 2 }} />
                    </div>
                    <div style={{ fontSize: 10.5, color: T.subSoft, marginTop: 6 }}>Current risk vs target benchmark (green marker)</div>
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

              <Panel
                title="Documents"
                action={<button className="no-print" onClick={() => setShowDocFor(selected.id)} style={{ border: `1px solid ${T.line}`, background: T.panel, color: T.accentInk, borderRadius: 8, padding: "5px 11px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: T.body }}>+ Attach</button>}
              >
                {(() => {
                  const docs = documents.filter((d) => d.hazardId === selected.id);
                  if (!docs.length) return <p style={{ margin: 0, fontSize: 12.5, color: T.subSoft }}>No documents linked. Attach a link to a plan, report, or procedure.</p>;
                  return (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {docs.map((d) => (
                        <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", border: `1px solid ${T.line}`, borderRadius: 9 }}>
                          <a href={d.url} target="_blank" rel="noopener noreferrer" style={{ flex: 1, color: T.accentInk, fontSize: 13, fontWeight: 600, textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.label} ↗</a>
                          <button className="no-print" onClick={() => deleteDocument(d.id)} title="Remove" style={{ border: "none", background: "transparent", color: T.subSoft, cursor: "pointer", fontSize: 13 }}>✕</button>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </Panel>

              <Panel
                title="Actions"
                action={<button className="no-print" onClick={() => setShowActionFor(selected.id)} style={{ border: `1px solid ${T.line}`, background: T.panel, color: T.accentInk, borderRadius: 8, padding: "5px 11px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: T.body }}>+ Assign action</button>}
              >
                {(() => {
                  const acts = actions.filter((a) => a.hazardId === selected.id);
                  if (!acts.length) return <p style={{ margin: 0, fontSize: 12.5, color: T.subSoft }}>No actions assigned. Assign an action to drive risk reduction.</p>;
                  return (
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                        <thead><tr>
                          {["Action", "Owner", "Due", "Status", ""].map((h, i) => (
                            <th key={i} style={{ textAlign: i > 1 && i < 4 ? "left" : "left", padding: "6px 8px", fontSize: 10.5, color: T.subSoft, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600, borderBottom: `1px solid ${T.line}` }}>{h}</th>
                          ))}
                        </tr></thead>
                        <tbody>
                          {acts.map((a) => {
                            const mit = selected.mitigationList?.find((m) => m.id === a.mitigationId);
                            return (
                              <tr key={a.id} style={{ borderBottom: `1px solid ${T.line}` }}>
                                <td style={{ padding: "8px 8px", color: T.ink, fontWeight: 600 }}>
                                  {a.title}
                                  {mit && <div style={{ fontSize: 11, color: T.subSoft, fontWeight: 400 }}>↳ {mit.title}</div>}
                                  {a.notes && <div style={{ fontSize: 11, color: T.subSoft, fontWeight: 400 }}>{a.notes}</div>}
                                </td>
                                <td style={{ padding: "8px 8px", color: T.sub }}>{a.owner || "—"}</td>
                                <td className="tnum" style={{ padding: "8px 8px", color: T.sub }}>{a.due || "—"}</td>
                                <td style={{ padding: "8px 8px" }}><StatusPill status={a.status} onChange={(s) => updateActionStatus(a.id, s)} /></td>
                                <td className="no-print" style={{ padding: "8px 8px", textAlign: "right" }}>
                                  <button onClick={() => deleteAction(a.id)} title="Delete" style={{ border: "none", background: "transparent", color: T.subSoft, cursor: "pointer", fontSize: 13 }}>✕</button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </Panel>
            </>
          )}

          {view === "actions" && (
            <>
              <Panel title="Hazard Mitigation Plan — all actions">
                {actions.length === 0 ? (
                  <p style={{ margin: 0, fontSize: 13, color: T.subSoft }}>
                    No actions yet. Open any hazard and use “Assign action” to build the plan.
                  </p>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <thead><tr>
                        {["Action", "Hazard", "Owner", "Due", "Status", ""].map((h, i) => (
                          <th key={i} style={{ textAlign: "left", padding: "9px 10px", fontSize: 10.5, color: T.subSoft, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600, borderBottom: `1px solid ${T.line}` }}>{h}</th>
                        ))}
                      </tr></thead>
                      <tbody>
                        {[...actions].sort((a, b) => (a.due || "9999").localeCompare(b.due || "9999")).map((a) => {
                          const hz = (data || []).find((h) => h.id === a.hazardId);
                          return (
                            <tr key={a.id} style={{ borderBottom: `1px solid ${T.line}` }}>
                              <td style={{ padding: "9px 10px", color: T.ink, fontWeight: 600 }}>
                                {a.title}
                                {a.notes && <div style={{ fontSize: 11, color: T.subSoft, fontWeight: 400 }}>{a.notes}</div>}
                              </td>
                              <td style={{ padding: "9px 10px", color: T.sub }}>{hz ? hz.name : "—"}</td>
                              <td style={{ padding: "9px 10px", color: T.sub }}>{a.owner || "—"}</td>
                              <td className="tnum" style={{ padding: "9px 10px", color: T.sub }}>{a.due || "—"}</td>
                              <td style={{ padding: "9px 10px" }}><StatusPill status={a.status} onChange={(s) => updateActionStatus(a.id, s)} /></td>
                              <td className="no-print" style={{ padding: "9px 10px", textAlign: "right" }}>
                                <button onClick={() => deleteAction(a.id)} title="Delete" style={{ border: "none", background: "transparent", color: T.subSoft, cursor: "pointer", fontSize: 13 }}>✕</button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </Panel>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
