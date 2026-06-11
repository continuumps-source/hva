// Generates public/hazards.json containing only the RAW input fields.
// Derived fields (risk, bands) are computed in the app at load time so
// the scoring formula lives in one place.
import { writeFileSync, mkdirSync } from "fs";

const CAPABILITIES = [
  "Security & Protective Services",
  "Healthcare Services",
  "Human Resource Management",
  "Logistics & Supply Chain",
  "Environmental Health & Safety",
  "Communication & Information",
  "Infrastructure Systems",
];

const HAZARD_SEED = [
  ["Hurricane", "Natural"],
  ["Severe Thunderstorm", "Natural"],
  ["Tornado", "Natural"],
  ["Coastal Flooding", "Natural"],
  ["Wildfire", "Natural"],
  ["Earthquake", "Natural"],
  ["Hazmat Spill", "Accidental"],
  ["Structure Fire", "Accidental"],
  ["Power Outage", "Accidental"],
  ["Transport Accident", "Accidental"],
  ["Active Threat", "Intentional"],
  ["Cyber Attack", "Intentional"],
  ["Civil Disturbance", "Intentional"],
  ["Terrorism", "Intentional"],
];

const DEFINITIONS = {
  Natural: "A natural hazard is an event or process in the natural environment that may cause loss of life, injury, or property damage.",
  Accidental: "An accidental hazard originates from technological or industrial accidents, infrastructure failures, or human activities causing harm or disruption.",
  Intentional: "An intentional hazard is a danger created by deliberate human activity that could result in harm to people or the environment.",
};

function rnd(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

const hazards = HAZARD_SEED.map(([name, category], i) => {
  const probability = Math.round(20 + rnd(i + 1) * 78);
  const impact = Math.round(30 + rnd(i + 11) * 68);
  const threats = Math.round(1 + rnd(i + 21) * 60);
  const mitigations = Math.round(20 + rnd(i + 31) * 480);
  const capabilities = CAPABILITIES.map((c, ci) => ({
    name: c,
    score: Math.round(8 + rnd(i * 7 + ci + 3) * 12),
  }));
  const risk = Math.round(probability * 0.45 + impact * 0.55);
  return {
    id: i,
    name,
    category,
    definition: DEFINITIONS[category],
    context: `${name} scenario as recorded during the organizational set-up survey.`,
    probability,
    impact,
    threats,
    mitigations,
    targetRisk: Math.max(10, risk - Math.round(15 + rnd(i + 41) * 20)),
    capabilities,
    description:
      `${name} represents a notable risk to organizational continuity. ` +
      `Assessment factors in historical frequency, geographic exposure, and current preparedness posture.`,
    mitigationList: CAPABILITIES.slice(0, 4).map((cap, m) => ({
      id: m,
      title: `${name} mitigation ${m + 1}`,
      capability: cap,
      status: ["Planned", "In Progress", "Complete", "Under Review"][m % 4],
      dueDate: `2025-Q${(m % 4) + 1}`,
    })),
    threatList: Array.from({ length: 3 }, (_, m) => ({
      id: m,
      title: `${name} threat vector ${m + 1}`,
      severity: ["High", "Medium", "Low"][m % 3],
    })),
    references: [
      `FEMA hazard profile — ${name}`,
      `Organizational set-up survey (2023)`,
    ],
  };
});

mkdirSync("public", { recursive: true });
writeFileSync("public/hazards.json", JSON.stringify({ hazards }, null, 2));
console.log(`Wrote public/hazards.json with ${hazards.length} hazards`);
