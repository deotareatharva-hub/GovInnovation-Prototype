# GovInnovate — SIH 2026 · PS 136 Prototype

An Innovation-to-Procurement Lifecycle Platform prototype: Government Departments
discover, verify, pilot, validate and procure solutions from startups.

**Stack:** HTML5, CSS3, vanilla JavaScript, LocalStorage. No backend, no build step.
Chart.js and jsPDF are loaded from CDN purely for charts and PDF export — everything
else runs fully client-side.

## Run it

Just open `index.html` in a browser. For the best experience (and so relative
paths resolve identically to how a judge's laptop will run it), serve it from a
local static server instead of double-clicking the file:

```
cd govinnovate
python3 -m http.server 8000
# then open http://localhost:8000
```

Any static server works (`npx serve`, VS Code "Live Server", etc.).

## Demo

- **Landing → Explore Platform → Demo Login** as Government Department, Startup,
  Program Administrator, or **Expert / Verifier**. No real authentication — this is a prototype.
- **Expert / Verifier** sits between shortlisting and PoC (pre-pilot technical
  evaluation) and again between micro-pilot and government approval (post-pilot
  validation). Log in as the expert to see a pending pre-pilot review for
  AquaSense Technologies (conflict-of-interest declaration → evidence review →
  scored evaluation → recommendation) and an in-progress post-pilot validation
  for HydroVision Labs against its live pilot's target metrics. The Government
  dashboard's **Expert Reviews** page and each Startup's **Expert Review** page
  reflect the expert's decisions read-only; the Admin **Experts** page assigns
  new reviews.
- Click **"Load SIH Demo Scenario"** (top bar or landing page "View Demo") to watch
  the full pipeline run automatically: AI matching → DPIIT verification → waiver
  eligibility → shortlisting → PoC → sandbox → milestone evidence → approval →
  payment release → risk scoring → NDA generation → audit trail. Every step calls
  the real underlying function — nothing is faked for the demo.
- **Reset Demo Data** (sidebar footer) restores the original seeded dataset at
  any time.

## Notes for judges

- All "government registry" and "risk model" content is explicitly labelled as a
  prototype / mock — see the notices on the Verification, Eligibility, Risk and
  Compliance screens.
- Payment can only move to *Released* after a milestone is *Approved* — this is
  enforced in `js/milestone.js`, not just hidden in the UI.
- If the venue has no internet, Chart.js visuals and PDF export degrade gracefully
  (a small notice appears) — the rest of the platform (matching, verification,
  pilots, milestones, risk scoring, audit log) is 100% offline-functional since it
  never depends on the network.
