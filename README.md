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
  "definition": "A natural hazard is ...",
  "context": "Scenario recorded during set-up survey.",
  "probability": 75,
  "impact": 37,
  "threats": 34,
  "mitigations": 319,
  "targetRisk": 40,
  "capabilities": [{ "name": "...", "score": 10 }, ...],
  "description": "...",
  "mitigationList": [
    { "id": 0, "title": "...", "capability": "...", "status": "Planned", "dueDate": "2025-Q1" }, ...
  ],
  "threatList": [{ "id": 0, "title": "...", "severity": "High" }, ...],
  "references": ["FEMA hazard profile — Hurricane", ...]
}
```

The derived fields — `risk`, `riskBand`, `probBand`, `impactBand` — are
computed in `deriveHazard()` inside `HVAReport.jsx`. That's the single
place to drop in the client's real scoring formula.

`category` must be one of: Natural, Accidental, Intentional.

### Adding hazards

The report has an **+ Add Hazard** button. Added hazards:

- appear immediately and update all charts, lists, and totals;
- are saved in **your browser** (localStorage), so they survive reloads
  on that machine — but they are *not* visible to other people yet.

To make additions permanent and shared with everyone:

1. Click **Export data** — it downloads the full current dataset
   (hazards, actions, and documents) as `hazards.json`.
2. Replace `public/hazards.json` in the project with that file.
3. Commit and push (or re-deploy). Now everything ships with the site
   and everyone sees it.

**Reset** removes the hazards, actions, and documents you added in this
browser (the published ones from the file stay).

### Actions and documents

Open any hazard (click a row in Hazard Prioritization) to reach its
detail view, which has two extra panels:

- **Documents** — attach a *link* to a document stored elsewhere
  (SharePoint, Google Drive, OneDrive, etc.). The app stores the label
  and URL and opens it in a new tab. No file upload — links have no size
  limit and keep documents under your organization's own access control.
- **Actions** — assign an action with an owner, due date, status, notes,
  and an optional link to a specific mitigation. Status is editable
  inline (Not started / In progress / Blocked / Complete).

The **Action Plan** tab aggregates every action across all hazards into
one master list sorted by due date — the report template's "Hazard
Mitigation Plan." Actions and documents are saved in your browser and
included in **Export data**, so committing the exported file shares them
with everyone, exactly like hazards.

*(Document upload — storing the actual file rather than a link — needs a
backend and isn't built; the data model already leaves room for it.)*

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
