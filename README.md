# HVA Readify — Report (standalone)

A standalone React app for the Hazard Vulnerability Analysis report.
No SharePoint, no SPFx — runs anywhere static files can be served.

## Run

```bash
npm install
npm run dev      # local dev server
npm run build    # production build -> dist/
npm run preview  # preview the production build
```

`dist/` is a plain static bundle. Drop it on Netlify, Vercel, an S3
bucket, GitHub Pages, or iframe it into any host.

## Deploy to Netlify

A `netlify.toml` is included, so Netlify picks up the build settings
automatically. Two ways to deploy:

**Git-connected (auto-deploys on every push):** push this folder to a
Git repo, then in Netlify choose *Add new site → Import an existing
project* and pick the repo. The build command (`npm run build`) and
publish directory (`dist`) come from `netlify.toml` — no manual setup.

**Manual:** run `npm install && npm run build` locally, then drag the
`dist` folder onto Netlify's Sites page.

`hazards.json` lives in `public/`, so it ships inside `dist/` and is
served at `/hazards.json` — the app's fetch finds it with no extra config.

## Structure

- `src/HVAReport.jsx` — the whole report (all four sections, charts,
  grid, calc boxes, PDF export, data loading).
- `public/hazards.json` — the hazard data (edit this for real data).
- `gen-data.mjs` — script that generated the sample JSON.
- `src/main.jsx` — React entry point.
- `index.html` — Vite HTML shell.

## Data

The app loads hazard data from `public/hazards.json` at runtime.
**To use real data, just edit that one file** — keep the shape the same
and everything downstream (charts, grid, totals) updates automatically.

Each hazard in `hazards.json` supplies only *raw inputs*:

```json
{
  "id": 0,
  "name": "Hurricane",
  "category": "Natural",
  "probability": 75,
  "impact": 37,
  "threats": 34,
  "mitigations": 319,
  "capabilities": [{ "name": "...", "score": 10 }, ...],
  "description": "...",
  "mitigationList": [{ "id": 0, "title": "...", "status": "Planned" }, ...],
  "threatList": [{ "id": 0, "title": "...", "severity": "High" }, ...]
}
```

The derived fields — `risk`, `riskBand`, `probBand`, `impactBand` — are
computed in `deriveHazard()` inside `HVAReport.jsx`. That's the single
place to drop in the client's real scoring formula.

`category` must be one of: Natural, Accidental, Intentional, Biological.

### Regenerating the sample data

`gen-data.mjs` produced the current sample file. Run `node gen-data.mjs`
to regenerate it. Delete this script once you're on real data.

### Moving to an API later

When you outgrow a static file, change the one `fetch()` call in
`HVAReport.jsx` to hit your endpoint instead. As long as it returns
`{ "hazards": [...] }` with the same per-hazard shape, nothing else
changes.

## Sections

- **HVA Summary** — risk doughnut, capability bars, prioritization grid,
  four calc boxes (Preparedness Index, Total Hazards, Threats, Mitigations).
- **Category tabs** (Natural / Accidental / Intentional / Biological) —
  same layout filtered to one category.
- **Hazard Details** — click any grid row: risk values, description,
  capability bars, mitigations table, threats table.

## Notes

- Risk scoring is a placeholder (`probability·0.45 + impact·0.55`).
  Swap in the real domain formula in the `risk` / `riskBand` logic.
- PDF export uses jsPDF + html2canvas (image snapshot). For
  selectable text instead of a rasterised page, switch to jsPDF
  autoTable driven off the data.
