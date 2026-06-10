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
  ["Hazmat Spill", "Accidental"],
  ["Structure Fire", "Accidental"],
  ["Power Outage", "Accidental"],
  ["Active Threat", "Intentional"],
  ["Cyber Attack", "Intentional"],
  ["Civil Disturbance", "Intentional"],
  ["Pandemic Influenza", "Biological"],
  ["Food-borne Outbreak", "Biological"],
];

function rnd(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

const hazards = HAZARD_SEED.map(([name, category], i) => ({
  id: i,
  name,
  category,
  probability: Math.round(20 + rnd(i + 1) * 78),
  impact: Math.round(30 + rnd(i + 11) * 68),
  threats: Math.round(1 + rnd(i + 21) * 60),
  mitigations: Math.round(20 + rnd(i + 31) * 480),
  capabilities: CAPABILITIES.map((c, ci) => ({
    name: c,
    score: Math.round(8 + rnd(i * 7 + ci + 3) * 12),
  })),
  description:
    `${name} represents a notable risk to organizational continuity. ` +
    `Assessment factors in historical frequency, geographic exposure, and current preparedness posture.`,
  mitigationList: Array.from({ length: 4 }, (_, m) => ({
    id: m,
    title: `${name} mitigation ${m + 1}`,
    status: ["Planned", "In Progress", "Complete", "Under Review"][m % 4],
  })),
  threatList: Array.from({ length: 3 }, (_, m) => ({
    id: m,
    title: `${name} threat vector ${m + 1}`,
    severity: ["High", "Medium", "Low"][m % 3],
  })),
}));

mkdirSync("public", { recursive: true });
writeFileSync("public/hazards.json", JSON.stringify({ hazards }, null, 2));
console.log(`Wrote public/hazards.json with ${hazards.length} hazards`);
