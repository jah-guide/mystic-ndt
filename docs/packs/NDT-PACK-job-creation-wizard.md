# NDT Requirements Pack — Job Creation Wizard

## Status
APPROVED by user — 2026-09-14  
Stress-test answers locked to NDT Principal Engineer recommendations (user confirmed).

## Industry basis (summary)
- Standards/practice this pack follows:
  - **ISO/IEC 17020** work-order / contract control and equipment control (resources, unambiguous scope, uniquely identified equipment with significant influence, calibration / fitness for use).
  - **ISO 9712** Level 1 under written instruction + L2/L3 supervision; L2/L3 may lead independently; employer operating authorization (vision, method cert, authorization) remains an assign gate.
  - Employer written practice / ICNDT-style authorization for method-level work.
- Employer-variable choices locked by user:
  1. **Assign** hard-requires an **Active** written examination procedure; **Draft** may omit procedure.
  2. Checked-out equipment: **visible in filtered list, not selectable**, reason includes job reference.
  3. **Draft** minimum = Step 1 only (customer, site, method, inspection date); people / procedure / equipment optional until Assign.
  4. Supervisor UI = **same People step** (panel expands after L1 lead); not a separate wizard page.

## Scope lock
- Stack: frontend + seed/localStorage (no backend)
- Methods in scope: UT, MT, PT, VT (existing)
- Personas: Admin (primary); technician/supervisor/L3 unchanged for field/QA
- Replace long single-page `JobFormModal` create/edit flow with multi-step wizard (edit Draft/Assigned via same wizard where practical)

## Domain rules (normative)
1. Wizard steps (fixed order): **Work → People → Procedure & scope → Equipment → Review & release**.
2. **Step 1 — Work (required for Draft and Assign):** customer, site, method, inspection date; auto job number; optional due date. Changing method clears lead, supervisor, procedure link, and equipment selections.
3. **Step 2 — People:** show only inspectors who have the selected **method** on file (method certificate or legacy `methods[]`). Include **eligible and blocked** rows; blocked not selectable; show reason (cert expired/pending/rejected, vision missing/expired, employer not authorized, etc.). Search by name; default sort A–Z; scrollable list.
4. Selecting a lead who is **Level 1 for that method** expands an inline **supervisor** panel: L2/L3 same method, same list UX (search/sort, blocked visible with reasons). Assign hard-blocks without eligible supervisor when lead is L1.
5. L2/L3 lead: no supervisor required; supervisor panel hidden/cleared.
6. **Step 3 — Procedure & scope:** list Active procedures for selected method. Selecting a procedure prefills scope + standard/spec (Admin may edit). Draft may omit procedure. **Assign hard-requires** linked Active procedure.
7. Procedure must **not** auto-tick equipment. WEP/procedure equipment requirements become **highlighted suggestions** (“From procedure”) on Step 4; Admin must explicitly select.
8. **Step 4 — Equipment:** filter register to equipment whose category matches the selected method **or** category **General**. Show selectable vs not selectable with reasons:
   - Expired calibration → not selectable
   - Out of Service / decommissioned / quarantined (product: `Out of Service` and equivalent) → not selectable
   - Checked out to another job → not selectable; reason **“Checked out to job {jobNumber}”** (or job id if number missing)
   - Calibration due soon → selectable + warn
   - Available / operational / in-cal → selectable
9. **Assign** hard-requires ≥1 selectable equipment item linked (existing product rule retained).
10. **Step 5 — Review:** summary of prior steps + optional general/access notes. CTAs: **Save draft** | **Assign** (create) or **Update draft** / **Assign** (resume). Editing existing Assigned jobs: preserve existing gates; do not silently drop procedure snapshot without re-freeze rules already in product.
11. **Save draft:** status `Draft`; may omit inspector, supervisor, procedure, equipment. Must have Step 1 fields. Draft must not appear as an active technician assignment (exclude Draft from tech “my jobs” / dispatch open board if currently included — align list filters so Draft is Admin-owned until Assign).
12. **Assign:** status `Assigned` (or keep existing status if editing already further along — do not regress Completed). Run full eligibility: lead + supervisor (if L1) + vision/auth + method cert gates; Active procedure required; ≥1 allowed equipment; freeze procedure snapshot on assign as today.
13. Vision / employer authorization continue to use existing helpers (`validateInspectorEligibility` / supervisor validators) — no parallel gate UI.
14. Equipment suggestions from procedure slots remain advisory highlights only until Admin ticks them.

## State machine
- States (existing): `Draft` | `Assigned` | `In Progress` | `Awaiting Supervisor` | `Revision Required` | `Completed`
- Transitions (this pack):
  - Admin → Save draft → (new or existing) → `Draft` → persist Step 1+any filled later steps; no snapshot freeze required
  - Admin → Assign from wizard → from `Draft` (or new) → `Assigned` → hard gates + procedure snapshot freeze (`assign`)
  - Field/QA transitions unchanged (out of scope)

## Permissions matrix
| Actor | Create/edit wizard | Save Draft | Assign | Field findings | Evaluate Pass/Fail |
|-------|--------------------|------------|--------|----------------|--------------------|
| Admin | Yes | Yes | Yes | Via existing admin cockpit if used | No (not this pack) |
| Technician | No | No | No | Existing | L1: no Pass/Fail |
| Supervisor | No | No | No | Existing | Existing |
| L3 QA | No | No | No | Read/review existing | Existing L3 review |

## Data / audit
- Immutable after: findings submit / snapshot freeze rules unchanged
- New/updated job fields: no new required domain entities; reuse `Job` (`status: Draft`, `procedureId`, `equipmentIds`, `supervisorId`, etc.)
- Audit: on create/assign, retain existing audit entry style; Draft save should record actor Admin + “JOB_DRAFT_SAVED” (or equivalent) with job number
- Required on Assign: customerId, siteId, method, inspectionDate, inspectorId, supervisorId if L1-for-method, procedureId (Active), equipmentIds length ≥ 1, all hard eligibility gates pass
- Required on Draft: customerId, siteId, method, inspectionDate (+ jobNumber)

## Certificate / report
- Unchanged by this pack (assignment only)
- What must never show as Pass while Pending: unchanged

## UX constraints (for `ndt-ux-designer` / fullstack)
- Multi-step wizard with clear step indicator; Back/Next; primary sticky actions on Review: Draft vs Assign
- People & supervisor: search field, A–Z list, blocked rows muted + reason text (same pattern as current eligibility copy)
- Equipment: “From procedure” badge/chip on suggested rows; never pre-selected
- Method + General filter explained in one short hint line
- Match existing Admin slate/sky patterns (no new visual system)

## Seed / demo story
- At least one **Draft** job after Reset (Step 1 only or partial) visible in Admin Jobs
- Happy path: UT customer/site → eligible L2 → Active UT procedure → confirm highlighted equipment → Assign
- L1 path: select L1 → supervisor panel → eligible L2/L3 → procedure → equipment → Assign
- Negative: blocked vision/cert lead visible not selectable; checked-out kit visible not selectable with job reason; Assign without procedure blocked

## Explicit non-goals
- Backend / notifications
- Drag-drop dispatch
- Separate wizard page for supervisor (unless list proven huge later)
- Auto-accept procedure equipment
- Multi-method single job
- Client PO / site permit fields (deferred)
- Changing ISO 9712 evaluate/reject/L3 flows

## Open risks (accepted)
- Demo seed may need one checked-out equipment row so reason string is demoable
- Edit path for non-Draft jobs must not wipe snapshot incorrectly
- “General” category misuse for method-specific gauges — accepted; category discipline is Admin data quality

## Handoff
Next: `ndt-ux-designer` (short screen notes OK) → `writing-plans` / `ndt-fullstack-principal` → implement.  
Do not start coding until user says **build** / **approve the plan** after plan exists.
