# MysticNDT

Field inspection workflow for NDT companies — from job assign through findings, supervision, Level 3 review, and PDF / audit evidence.

This repo is a **high-fidelity frontend demo** (React + seed data in the browser). It exists to prove and freeze a company’s inspection process before a production backend is built for them.

---

## What it does

MysticNDT models how an inspection company actually runs work:

1. **Admin** creates customers, sites, inspectors, equipment, and jobs  
2. **Assign** checks competence (method certs), vision, employer authorization, kit, and an Active written procedure (WEP)  
3. **Technician** captures findings in the field (mobile-first)  
4. **Supervisor** evaluates Pass/Fail or sends findings back for revision  
5. **Level 3** reviews / certifies the report  
6. **PDF report** and **audit pack** export support client delivery and defensibility  

Methods in the current freeze: **UT, MT, PT, VT**.

Industry practice aligned with (employer-variable choices locked in packs):

- **ISO 9712** — method levels, L1 under instruction, L2 evaluation, L3 procedure / QA authority  
- **ISO/IEC 17020** — work orders, competence records, equipment with significant influence, inspection records and reports  

---

## Who it’s for

| Persona | What they use |
|---------|----------------|
| **Admin** | Jobs, customers, inspectors, equipment, renewals, dispatch, settings |
| **Technician (L1/L2)** | Assigned jobs, findings capture, complete inspection |
| **Supervisor** | Queue for jobs awaiting evaluation / revision |
| **Level 3 QA** | Report review and certification |

The header **role switcher is a demo tool only** — not real security. Production auth comes with the backend build.

---

## What’s in the demo today

### Core workflow
- Job lifecycle: `Draft` → `Assigned` → `In Progress` → `Awaiting Supervisor` ↔ `Revision Required` → `Completed`
- Job creation wizard / assign rules (eligible lead, Active procedure, equipment)
- Findings capture; L1 findings immutable after submit
- Supervisor evaluate vs reject-with-reason (new findings revision; history kept)
- L3 review separate from field supervision
- PDF report generation

### Trust surfaces
- **Procedure snapshot** — WEP + criteria frozen onto the job at assign / first start  
- **Supervisor home** — queue for awaiting supervision / revision  
- **Report delivery gate** — L3-approved or Admin final-without-L3 + reason  
- **Audit pack export** — evidence bundle for the job  

### Ops surfaces
- **Vision / employer authorization** — hard-block or warn on assign  
- **Renewals hub** — method certs, calibration, vision in one place  
- **Dispatch board** — week view of open jobs and assignment  

### Data
- Seed roster and jobs for demos  
- Persistence via **browser localStorage** (reset demo to reload seed)  

---

## What it is not (yet)

- Multi-user production app with real login  
- Shared company database / API  
- Multi-tenant SaaS or subscription “plans”  
- Email / SMS / ERP integrations  
- Methods beyond UT / MT / PT / VT (e.g. RT)  
- Full QMS (complaints, impartiality programme, internal audit)  

Those are quoted per client after discovery freezes **their** procedures. See sales docs below.

---

## Quick start

```bash
npm install
npm run dev
```

Open the local URL Vite prints (usually `http://localhost:5173`).

| Script | Purpose |
|--------|---------|
| `npm run dev` | Development server |
| `npm run build` | Typecheck + production build |
| `npm run preview` | Preview the production build |

**Stack:** React 18, TypeScript, Vite, Tailwind CSS, jsPDF.

---

## Project layout

```text
src/
  components/
    admin/          # Dashboard, jobs, customers, inspectors, equipment, renewals, dispatch
    technician/     # Field dashboard + job detail / findings
    verifier/       # Level 3 review
    reports/        # Report UI
    common/         # Header, badges, date field, signature pad, …
  services/         # localStorage + seed data
  types/            # Domain model (contract for a future backend)
  utils/            # PDF, audit pack, eligibility, snapshots, validation, …
docs/
  packs/            # Approved NDT requirements packs
  specs/            # Module specs
  plans/            # Implementation plans
  acceptance/       # Ship-gate / golden-path checklists
  sales/            # Pricing playbook + proposal template
```

Domain source of truth for a future API: `src/types/index.ts` plus seed services, locked by `docs/packs/NDT-PACK-domain-freeze.md`.

---

## Golden path (demo script)

Use this when walking a client through the product:

1. Switch to **Admin** — create or open a job; assign an eligible inspector + Active procedure + kit  
2. Switch to **Technician** — open the job, capture findings, submit / complete  
3. Switch to **Supervisor** (or open supervisor queue) — evaluate or reject for revision  
4. Switch to **Level 3** — review and approve  
5. Open report / PDF; optionally export audit pack  
6. Show **Renewals** / **Dispatch** if certs or scheduling are the buyer’s pain  

Reset demo data from the UI when you need a clean seed state.

---

## Commercial / sales

This product is sold as a **single-tenant fixed build** matched to one company’s rules, plus a monthly retainer — not seat-based SaaS (yet).

| Doc | Purpose |
|-----|---------|
| [docs/sales/SALES-PLAYBOOK-ZAR.md](docs/sales/SALES-PLAYBOOK-ZAR.md) | How to pitch, Autresonus notes, ZAR pricing |
| [docs/sales/PROPOSAL-TEMPLATE-ndt-build.md](docs/sales/PROPOSAL-TEMPLATE-ndt-build.md) | Client-facing proposal template |

Typical path: demo → lock their policies in a requirements pack → deposit → build backend to that pack → UAT → go-live → retainer.

---

## Spec-driven docs

Work is driven by approved packs and specs under `docs/`:

- Domain freeze: `docs/packs/NDT-PACK-domain-freeze.md`  
- P0 trust surfaces / P1 ops surfaces packs and matching specs  
- Acceptance / ship-gate checklists under `docs/acceptance/`  

Do not invent Pass/Fail ownership or competence rules ad hoc — change the pack first.

---

## Roadmap (high level)

1. **Done (demo):** Frontend domain freeze + seed golden path  
2. **Next (per client):** Backend v0 (auth, DB, multi-user) mirroring the frozen entities  
3. **Later:** Tenancy / packaging only after single-company production mold is proven  

---

## License / status

Private product prototype. Not public production software until a client build is scoped and accepted.
