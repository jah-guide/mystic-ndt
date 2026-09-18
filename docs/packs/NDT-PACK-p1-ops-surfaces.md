# NDT Requirements Pack — P1 Ops Surfaces (Wave B)

## Status
APPROVED by user — 2026-09-14  
Wave: **B = P1** (after shipped P0 Trust Surfaces).  
Locks: missing vision date = **hard-block** (same as expired).  
Orchestration: `ndt-spec-driven-delivery` (Spec → Plan → user approves plan → build). **Do not code until Spec/Plan gates pass.**

## Industry basis (summary)
- Standards/practice: ISO 9712 personnel competence is method/level-specific; **employer written practice / operating authorization** still gates who may work (vision acuity and employer authorization are common file requirements, separate from SAQCC/ISO wallet cards); ISO/SANS 17020-style bodies keep **equipment calibration** and **personnel competence** under continuous control; dispatch is operational use of those controls.
- Employer-variable choices **locked by user** (from Wave A stress-test + Wave B scope):
  1. **Vision / employer authorization on assign:** **Hard-block** if vision expired; **warn** if due soon (~30 days, same window as cert/cal).
  2. Renewals hub and dispatch board are **ops UX** over existing competence/equipment data — they do not invent Pass/Fail evaluation.
  3. Stack remains **frontend + seed/localStorage** (no backend).

## Scope lock
- Stack: **frontend + seed/localStorage only** (no backend, auth, real email, billing, PWA sync)
- Methods in scope: existing UT / MT / PT / VT
- Personas: Admin (primary for dispatch + renewals + registrar edits); Technician / Supervisor (consume eligibility); L3 (may view renewals; not required to edit vision unless Admin)
- Features in this pack (P1):
  1. **Vision / employer authorization file** — per-inspector dates + assign hard-block / due-soon warn
  2. **Renewals hub** — unified “due this month / expired / pending verify” for method certs + equipment cal (+ vision)
  3. **Dispatch board** — week-oriented job × people view with eligibility colouring and blocked reasons

## Domain rules (normative)

### Shared (protect existing — do not regress)
1. Competence for **job method** remains `methodCertificates[]`: Verified + not expired + level rules for supervisor/L1. `inspector.level` is summary only.
2. L1 findings immutable after submit; supervisor evaluate or reject-with-reason only.
3. Equipment expired cal remains **hard-block** for assign/complete of that instrument (existing product rule).
4. PendingVerification / Rejected method certs remain **hard-block** for that method.

### Vision / employer authorization
5. Add employer-file fields on Inspector (not a medical module): at minimum  
   - `visionAcuityExpiryDate` (YYYY-MM-DD)  
   - optional `visionAcuityStatus` derived from expiry (valid / expiring_soon / expired / missing)  
   - optional `employerAuthorized` boolean default true for seed; if false → hard-block assign  
   - optional `authorizationNotes` (free text, Admin-only)
6. **Missing vision date:** **hard-block** for new job assignment (same severity as expired) — locked by user 2026-09-14.
7. **Expired vision** or `employerAuthorized === false`: **hard-block** lead assign and supervisor assign in JobForm (and any dispatch assign path).
8. **Due soon** (≤30 days): **warn** on JobForm / dispatch (eligible but amber reason).
9. Vision/authorization is **person-level** for this pack (not per-method), unless a later pack adds method-scoped medicals.
10. Registrar UI (Inspector profile): edit vision expiry + employer authorized flag; show status chip next to method certs area.
11. Seed: most inspectors valid vision; ≥1 **expired vision** with otherwise valid method certs; ≥1 **due soon** vision — so block/warn demos are obvious.

### Renewals hub
12. Admin surface (new view or AdminDashboard section): single list of renewal/attention items from:
    - Method certificates: expired, expiring_soon, PendingVerification, Rejected  
    - Equipment: cal expired, expiring_soon  
    - Vision: expired, expiring_soon, missing  
13. Each row: entity type (Inspector method / Equipment / Vision), name, method or serial, status, date, deep link/open profile or equipment profile.
14. Filters: type chips (People / Equipment / Vision / All); status chips (Expired / Due soon / Pending verify / All).
15. Hub does **not** auto-renew; CTAs open existing registrar/edit flows (or inline date edit if already available).
16. Optional KPI counts at top of hub (expired / due soon) — quiet, not three giant cards repeating the old inspector list pattern.

### Dispatch board
17. Admin **Dispatch** view: show a **7-day window** (default starting today or week start — implementer choice; document in spec) of jobs that are not Completed (or include Completed as muted optional — default: open jobs only: Draft/Assigned/In Progress/Awaiting Supervisor/Revision Required).
18. Layout: columns = days; cells/cards = jobs (job number, method, lead name or “Unassigned”, eligibility traffic light).
19. Selecting a person for assign (or opening Job Form from board) must run the **same** eligibility helpers as JobFormModal: method cert + vision/authorization + equipment rules already in product.
20. Blocked people show **why** (reuse eligibility reason strings); cannot assign blocked lead/supervisor.
21. Board may link “Open job” / “Edit assignment” into existing JobFormModal or JobDetailView — do not invent a second evaluation cockpit.
22. Seed: enough open jobs across dates (inspectionDate and/or dueDate) so the week board is non-empty after Reset demo.

## State machine
- No new JobStatus values.
- Assign path side effects:
  - Admin → Assign/update job lead or supervisor → **blocked** if vision expired/missing or not employer-authorized or method cert ineligible (existing + new checks).
  - Warn-only path: vision due soon or cert due soon → allow with visible warning (existing pattern).
- Renewals hub and dispatch are read/ops surfaces; they do not change findings states.

## Permissions matrix

| Actor | Edit vision/auth | View renewals hub | Use dispatch board | Assign jobs |
|-------|------------------|-------------------|--------------------|-------------|
| Admin | Yes | Yes | Yes | Yes (gated) |
| L3 QA | View on profiles | Yes (view) | Optional view | No (unless already Admin-capable in demo) |
| Technician / Supervisor | View own status chips | No (or own items only — default **No**) | No | No |

Findings evaluate/reject/complete permissions unchanged from P0/existing product.

## Data / audit
- Inspector: `visionAcuityExpiryDate?`, `employerAuthorized?` (default true), `authorizationNotes?`
- Derived status via `checkExpiry` (same 30-day window)
- Audit (optional but recommended): `VISION_UPDATED`, `AUTHORIZATION_UPDATED` when Admin saves registrar
- Storage key bump for inspectors if shape changes (e.g. `ndt_inspectors_v6`)
- Jobs key bump only if dispatch needs new fields (prefer reuse `inspectionDate` / `dueDate` — no bump if possible)

## Certificate / report
- Unchanged. Vision/authorization are **dispatch gates**, not certificate signatories.
- Never show Pending findings as Pass (unchanged).

## Seed / demo story
1. Reset demo.
2. Open inspector with **expired vision** → try assign UT job → **hard-block** with vision reason (method cert may be valid).
3. Open inspector with **due soon** vision → assign allowed with **warn**.
4. Open **Renewals hub** → see vision + cert + cal rows; open one profile/equipment and renew date → row clears/updates.
5. Open **Dispatch** → see week board; drag/click assign only eligibility-green/amber people; blocked rows show reason.

## Explicit non-goals (Wave B)
- Backend, auth, real notifications/email
- Per-method vision tests / full medical module
- Auto-scheduling optimization / AI crew suggestions
- Wave A rework (supervisor home, snapshot, audit pack) except wiring eligibility into JobForm/dispatch
- Pricing UI

## Open risks (accepted)
- Demo role switcher still not real auth; Admin-only surfaces are demo-gated.
- “Missing vision = hard-block” may surprise if seed incomplete — seed must set dates for all workshop inspectors except intentional demos.
- Dispatch UX may be list-by-day rather than full calendar drag-drop if drag is costly — **acceptable** if assign gate + eligibility colouring meet rules 17–21.

## Proposed modules (for Spec map after pack approval)
| Module id | Responsibility |
|-----------|----------------|
| `vision-authorization` | Inspector fields, registrar UI, eligibility hard-block/warn |
| `renewals-hub` | Unified Admin renewals list + filters |
| `dispatch-board` | Week board + assign via existing eligibility |

Suggested build order: `vision-authorization` → `renewals-hub` → `dispatch-board` (dispatch depends on vision gates).

## Next gate (orchestration)
1. User **approves this pack** (or amends).  
2. Spec-Driven: capability map → module specs → implementation plan.  
3. User **approves plan** → Full-Stack builds one module at a time → Acceptance verifier.

## Handoff
After pack APPROVED: `ndt-spec-driven-delivery` Stages C–D, then `ndt-fullstack-principal`.  
Do not start coding until pack + plan are approved.
