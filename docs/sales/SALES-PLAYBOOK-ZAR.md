# MysticNDT — Sales Playbook & ZAR Pricing Guide

**Product:** MysticNDT inspection workflow system  
**Repo / working name:** `mystic-ndt`  
**Commercial model:** Single-tenant fixed build + monthly retainer *(not SaaS seats yet)*  
**Currency:** South African Rand (ZAR). Add VAT if you are registered.  
**Companion doc:** [PROPOSAL-TEMPLATE-ndt-build.md](./PROPOSAL-TEMPLATE-ndt-build.md)

Use this file before and after demos. Fill the proposal template only after discovery locks the client’s rules.

---

## 1. What you are selling

### One-liner

> We configure the inspection chain to *your* procedures, then build a production system so every job, finding, and certificate is defensible.



### What the demo is

- High-fidelity **frontend workflow prototype**
- Sample / seed data in the browser
- Golden path: job assign → field capture → supervisor → Level 3 → report/PDF (+ trust & ops surfaces as built)



### What the demo is not

- Not multi-user production software
- Not real login / company database
- Not email dispatch or ERP integration
- Not a multi-company SaaS marketplace

**Say this early.** Honesty builds trust and sets up the paid build.

### What production v1 is

- Secure multi-user app for **one company only** (single tenant)
- Auth + roles: Admin / Technician / Supervisor / L3
- Workflow matched to **their** locked rules (WEP, Pass/Fail ownership, L3, methods)
- Admin surfaces: customers, sites, inspectors, equipment, procedures, dispatch/renewals as agreed
- Hosted URL + backups
- Handover: short guides + training session

---



## 2. Positioning (marketing site vs ops system)


| Layer                     | Purpose                               | Example                |
| ------------------------- | ------------------------------------- | ---------------------- |
| Marketing site            | Clients find and trust the company    | Autresonus public site |
| Ops system (this product) | Company runs jobs and defends reports | MysticNDT              |


Pitch: *“Your website sells the service. This runs the service.”*

Lead with buyer pain, not tech stack:

- Who signed Pass/Fail?
- Is the WEP frozen on the job?
- Cert / cal / vision expiry surprises
- Supervisor queue chaos
- Client PDF / audit pack under pressure

Do **not** lead with React, localStorage, or “AI.”

---



## 3. Sales motion (recommended order)

```text
Warm intro / outreach
    → Live demo + discovery (45–90 min)
        → Requirements pack locked (their rules)
            → Fixed proposal + 50% deposit
                → Build backend + auth + DB to pack
                    → UAT
                        → Go-live + balance
                            → Monthly retainer
```



### Phase A — Outreach

Goal: book a **process feedback** call, not a hard close.

- Prefer existing relationships (built their site, did prior work, referral)
- Ask for 30–90 minutes with Admin + someone who signs reports (L2/L3)
- Promise: demo + notes on *their* practice; no obligation



### Phase B — Demo call structure


| Time      | You do                                                         | They do               |
| --------- | -------------------------------------------------------------- | --------------------- |
| 5 min     | Frame: demo validates process before production build          | Listen                |
| 10 min    | Ask how jobs/reports/certs work today                          | Talk (you take notes) |
| 10–15 min | Demo **only** the path that matches what they said             | React / correct you   |
| 5–10 min  | Summarise locked vs open questions; offer written pack + quote | Decide next step      |


**Demo rules**

- Use their words (UT, vessels, pipelines, etc.)
- Say seed data will be replaced with their roster and procedures
- Do not promise multi-tenant plans, native app stores, or full ISO/IEC 17020 QMS in v1
- Role switcher is a **demo tool**, not security



### Phase C — Discovery lock (must freeze before build)

Capture in writing (proposal Section 2 + Requirements Pack):


| Topic                        | Example answers                  |
| ---------------------------- | -------------------------------- |
| Methods in scope             | UT / PAUT / MT / PT / VT         |
| Who leads jobs               | L1 + supervisor / L2 independent |
| Written procedure (WEP)      | Required on every job? Y/N       |
| Who evaluates Pass/Fail      | Supervisor L2+ / lead L2+        |
| Who certifies the report     | Level 3 QA / other               |
| Sites / inspectors (approx.) | Numbers                          |
| Must-have report fields      | Scope, surface, °C, light, etc.  |
| Out of scope for v1          | RT, offline, billing portal, ERP |


**No deposit until this is agreed.** Changes after freeze = change order + fee.

### Phase D — Proposal & payment

1. Send [PROPOSAL-TEMPLATE-ndt-build.md](./PROPOSAL-TEMPLATE-ndt-build.md) filled for that client
2. 50% deposit to start (or 40 / 40 / 20 if they want a UAT milestone)
3. Kickoff within a few business days of cleared funds
4. Balance on go-live acceptance
5. Retainer invoiced monthly in advance from go-live



### Phase E — Acceptance

Go-live when:

- Named roles complete the **agreed golden path** on production (or pilot) data  
- Critical UAT defects fixed or scheduled in writing

Minor polish may roll into the first retainer month by agreement.

---



## 4. Who to sell to



### Ideal buyer

- NDT labs and inspection contractors
- Fabricators / plants with in-house NDT
- Companies already issuing client reports and worrying about competence, cal, vision, and sign-off



### Decision makers


| Role        | Care about                            |
| ----------- | ------------------------------------- |
| Owner / MD  | Risk, client trust, cost vs chaos     |
| L3 / QA     | Procedure, certification, audit trail |
| Ops / Admin | Roster, dispatch, renewals, equipment |
| Field leads | Mobile-friendly capture, less rework  |




### Warm vs cold


| Type                                | Approach                                                            |
| ----------------------------------- | ------------------------------------------------------------------- |
| **Warm** (e.g. built their website) | Soft reopen → process feedback → demo → quote                       |
| **Cold**                            | Referral or industry intro; shorter teaser; paid discovery optional |


---



## 5. Autresonus playbook (existing client)

**Client:** Autresonus — Advanced NDT & ultrasonic inspection  
**Site:** [https://www.autresonus.co.za/](https://www.autresonus.co.za/)  
**Context:** You already built their marketing site. Pitch ops software as the next layer.

### Framing

- Same brand story, different layer: **marketing vs operations**
- They are UT-heavy (pressure vessels, pipelines, corrosion, welds)
- Demo in *their* language; lock methods after the call (don’t assume all methods)



### Outreach message (WhatsApp / email)

> Hi Martin — hope the site’s been useful.  
>
> I’ve been building an NDT field workflow system (jobs, findings, supervisor/L3 sign-off, PDF and audit pack, cert/cal renewals). It’s the ops side of what Autresonus already sells on the website.  
>
> Before I take it further with other labs, I’d value **30 minutes** with you walking how *you* run jobs and reports — so the tool matches real South African practice, not generic software. Happy to show a live demo and take notes on your procedures. No commitment.  
>
> When suits you this week or next?



### Suggested Autresonus commercial band


| Item                        | Guide (ZAR)                                      |
| --------------------------- | ------------------------------------------------ |
| Discovery workshop (90 min) | Free if they sign within 30 days, else ~R 10 000 |
| Standard v1 build           | **R 180 000 – R 220 000** (50 / 50)              |
| Monthly retainer            | **R 5 500 – R 7 000**                            |


Mild relationship discount vs cold quotes is fine; don’t underprice the build.

### Autresonus — do not

- Pitch SaaS “plans” or multi-company marketplace  
- Oversell backend maturity — demo validates process; production auth/DB after deposit  
- Lecture ISO theory — he is the domain expert; you mirror *his* rules

---



## 6. Pricing guide (ZAR)

Bands assume indie / small-vendor SA rates for a **single-tenant** NDT workflow system. Adjust ±20% for experience and client size. **VAT extra** if registered.

### 6.1 Packages


| Offer              | What’s included                                                                                                                    | Guide price (ZAR)                                                |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| **Discovery only** | Live demo + rules workshop + written pack (no build)                                                                               | **R 8 000 – R 18 000** (or waive if they sign v1 within 30 days) |
| **Starter v1**     | Auth + roles, jobs → field → supervisor → L3 → PDF, customers/sites/inspectors/equipment, 1–2 methods, hosting, 1 training         | **R 95 000 – R 160 000**                                         |
| **Standard v1**    | Starter + procedure snapshot, supervisor home, delivery gate, audit pack, renewals + vision gates, dispatch board, branding/import | **R 180 000 – R 280 000**                                        |
| **Extended v1**    | Standard + extra methods, email delivery, offline/PWA, ERP/export, multi-site complexity                                           | **R 300 000 – R 450 000+**                                       |




### 6.2 Default quote anchors

Typical SA NDT shop (~10–40 users, UT/MT/PT/VT, current demo scope → production):


| Line                            | Amount        |
| ------------------------------- | ------------- |
| Fixed build (Standard midpoint) | **R 220 000** |
| Deposit (50%)                   | **R 110 000** |
| Balance on go-live (50%)        | **R 110 000** |
| Monthly retainer                | **R 6 500**   |



| Client size             | Build                | Retainer / month |
| ----------------------- | -------------------- | ---------------- |
| Smaller / thinner scope | ~R 120 000 (Starter) | ~R 3 500         |
| Typical (Standard)      | ~R 220 000           | ~R 6 500         |
| Larger / integrations   | R 320 000+           | ~R 10 000        |




### 6.3 Monthly retainers (from go-live)


| Tier           | Includes                                        | Guide (ZAR / month)     |
| -------------- | ----------------------------------------------- | ----------------------- |
| **Keep-alive** | Hosting, backups, uptime watch, defect fixes    | **R 2 500 – R 4 500**   |
| **Support**    | Above + email support + ≤4 h config/copy tweaks | **R 5 000 – R 8 500**   |
| **Partner**    | Above + ≤8 h small changes / month              | **R 10 000 – R 15 000** |


**Retainer is keep-alive, not unlimited features.** New methods, integrations, redesigns = change requests.

### 6.4 Change requests (after scope freeze)


| Unit                 | Guide (ZAR)             |
| -------------------- | ----------------------- |
| Half-day             | **R 3 500 – R 5 000**   |
| Day                  | **R 6 500 – R 9 500**   |
| Small scoped feature | **R 12 000 – R 45 000** |




### 6.5 Payment options


| Structure              | When to use                                     |
| ---------------------- | ----------------------------------------------- |
| **50% / 50%**          | Default                                         |
| **40% / 40% / 20%**    | Client wants kickoff / UAT / go-live milestones |
| Deposit non-refundable | Once build has started (state in proposal)      |




### 6.6 What not to sell (yet)

- Per-seat SaaS “plans”
- Multi-company marketplace
- Unlimited redesign after sign-off
- Full ISO/IEC 17020 QMS (complaints, impartiality programme, internal audit) unless separately quoted
- Native App Store / Play Store apps (responsive web is in scope)
- Accounting / ERP / SMS unless Extended or change request

---



## 7. Objection handling


| They say                          | You say                                                                                                                                                     |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| “It’s only a demo / seed data.”   | Correct — that’s intentional. We freeze *your* rules on the demo path, then build production against that pack so we don’t bill you for the wrong workflow. |
| “Can’t we just use Excel / Word?” | You can. This is for when jobs, sign-offs, and audits need a single defensible trail.                                                                       |
| “We need it for three companies.” | v1 is single-tenant. Multi-company is a separate product later; quote Extended or a future phase.                                                           |
| “How long?”                       | Typical Standard: ~6–8 weeks from deposit, depending on feedback speed (see proposal timeline).                                                             |
| “Too expensive.”                  | Split Starter vs Standard; or phase Wave A (trust) then Wave B (ops). Don’t slash Standard to Starter price with Standard scope.                            |
| “Can we own the IP?”              | Choose one line in the proposal and stick to it (license vs client owns custom work; you retain framework).                                                 |


---



## 8. Internal checklist (before you send a proposal)

- [ ] Demo honesty stated (prototype vs production)
- [ ] Discovery table filled with *their* answers
- [ ] In-scope / out-of-scope lists match the package priced
- [ ] Timeline weeks filled; go-live depends on deposit + feedback
- [ ] Build fee + deposit + balance + retainer in ZAR
- [ ] Retainer hours (fair use) stated
- [ ] IP clause chosen
- [ ] Golden-path / acceptance criteria attached or linked
- [ ] No accidental promise of SaaS seats or unlimited redesign

---



## 9. Suggested timeline (Standard v1)


| Phase                | Duration  | Deliverable                                |
| -------------------- | --------- | ------------------------------------------ |
| Kickoff & data setup | Week 1    | Branding, roster/kit/procedure import plan |
| Build                | Weeks 2–6 | Working system on staging                  |
| UAT                  | Week 7    | Fixes from agreed test script              |
| Go-live              | Week 8    | Production URL + training                  |


Adjust after deposit date and client response times.

---



## 10. Product capability reference (for demos)

Current stack in repo: frontend + seed/localStorage (no production backend yet). Build backend after pack sign-off.

### Trust surfaces (P0)

- Procedure snapshot (WEP frozen on job)
- Supervisor home / queue
- Report delivery gate
- Audit pack export



### Ops surfaces (P1)

- Vision / employer authorization
- Renewals hub (certs, cal, vision)
- Dispatch board

Demo the modules that match the buyer’s pain; don’t dump every screen.

---



## 11. Copy bank (short)

**Subject lines**

- Ops layer for your NDT reports — 30 min walkthrough?
- From website to job → certificate workflow
- Quick look: supervisor queue + audit pack for your process

**Close**

- Next step: I’ll send a one-page discovery summary and a fixed quote for your company only.
- No seats, no surprise SaaS — fixed build matched to your procedures, then a light monthly keep-alive.

---



## 12. Document map


| File                                                               | Use                                                    |
| ------------------------------------------------------------------ | ------------------------------------------------------ |
| [SALES-PLAYBOOK-ZAR.md](./SALES-PLAYBOOK-ZAR.md)                   | This guide — pricing, pitch, process                   |
| [PROPOSAL-TEMPLATE-ndt-build.md](./PROPOSAL-TEMPLATE-ndt-build.md) | Client-facing proposal (fill per deal)                 |
| `docs/packs/`                                                      | Requirements packs (domain rules)                      |
| `docs/acceptance/`                                                 | Golden path / ship-gate checklists to adapt per client |


---



## 13. Version note

- **Audience:** Vendor (you) — delete internal notes before sending anything external  
- **Pricing:** Guide only; not a public price list  
- **Update when:** Package scope changes, or you move from single-tenant builds to true SaaS seats

**Last aligned with product state:** frontend demo + seed data; production backend quoted per client after discovery freeze.