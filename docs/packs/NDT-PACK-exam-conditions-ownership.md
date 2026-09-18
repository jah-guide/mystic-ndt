# NDT Requirements Pack — Examination Conditions Ownership (Work Order vs Field Record)

## Status
APPROVED by user — 2026-09-18  

Stress-test locks (NDT Principal Engineer recommendations accepted):
1. **Admin surface:** optional prep/client instruction only; **as-found surface is field-only** (not required on Assign).
2. **Temperature:** numeric **°C** only (fixed unit on UI/PDF); no free-text unit typing.
3. **When required:** field conditions editable after **Start work**; **hard-block** L1 submit / lead complete / supervisor complete if missing — not hard-block Assign.
4. **Ambient light:** method-gated — **required for VT + MT (visible)**; optional for UT unless WEP requires; UV intensity deferred (fluorescent path later).

## Industry basis (summary)
- Standards/practice this pack follows:
  - **ISO/IEC 17020** — accurate inspection records/reports; Annex B style elements: description of work ordered, environmental conditions when relevant.
  - **ISO 9712** — L1 records under written instruction; L2 evaluates; L3 owns procedure/technique; office does not invent as-found exam conditions.
  - **ASME Section V** (method articles, e.g. Art. 6 PT pattern) — procedure defines surface-prep and temperature **limits**; examination record captures **as-performed / as-found** values for repeatability.
- Employer-variable choices **locked by user**:
  - Optional admin “prep instruction” separate from as-found surface.
  - Single numeric °C (not °F dual UI in this phase).
  - Light required for VT/MT; UT optional unless WEP says otherwise.
  - Stack remains **frontend + seed/localStorage**.

## Scope lock
- Stack: **frontend + seed/localStorage** (no backend)
- Methods in scope: **UT, MT, PT, VT**
- Personas: Admin (work order), Technician L1, Lead L2+, Supervisor L2|L3, L3 QA
- In: relocate ownership of examination conditions; numeric temp; method-gated light; PDF/report face mapping; assign vs submit gates; seed alignment
- Out: UV-A radiometer workflow, multi-unit temp (°F), weather/wind/rain suite, auto Pass/Fail from conditions, backend API

## Domain rules (normative)

### Three layers (must not conflate)
1. **Work order (Admin)** — client, site, method, dates, people, equipment IDs, **scope of work ordered**, standard/spec, linked Active WEP, optional **surface prep instruction** (client/planned prep note — not certificate as-found).
2. **Procedure limits (WEP → read-only on job via snapshot)** — allowed temperature range, required surface-prep *instruction*, min light if specified on procedure.
3. **Examination conditions (Field)** — **as-found surface condition**, **measured temperature °C**, **ambient light** when required, optional limitations note. Recorded by lead (L1 or L2+) after Start work.

### Assign vs complete gates
4. **Assign hard-block:** customer, site, method, inspection date, eligible lead (+ supervisor if L1), Active WEP, ≥1 equipment, **scope of work ordered**.  
   **Do not** require as-found surface, measured temp, or light at Assign.
5. **L1 submit / lead complete / supervisor complete hard-block** if missing:
   - as-found surface condition (non-empty)
   - measured temperature °C (finite number)
   - ambient light when method is **VT or MT** (non-empty); UT/PT optional unless procedure snapshot requires light (if snapshot has min-light text, treat as required — soft rule: if WEP temperatureRanges/light note exists and product already stores it, prefer require when present; minimum for this pack: VT+MT always).
6. Temp outside WEP range: existing **warn + mandatory reason** path remains; software never auto-Fails.

### Data model
7. Prefer structured fields:
   - `scope` — work order (Admin; field may refine only with audit if extent changes — phase 1: Admin primary, field edit allowed In Progress with `EXAM_CONDITIONS_UPDATED`)
   - `surfacePrepInstruction?: string` — Admin optional (new or rename from misused defaults)
   - `surfaceCondition` — **as-found**, field-owned
   - `temperatureC: number` — measured °C (canonical); display string derived as `${n}°C` for PDF
   - `temperature` — legacy display; keep synced from `temperatureC` for compatibility
   - `ambientLight?: string` — measured/observed light text for phase 1 (e.g. "850 Lux"); numeric lux optional later
8. Remove create-time hardcoding of as-found surface/temp as if already examined.
9. PDF face:
   - Scope of Examination ← `scope` (ordered)
   - Surface Condition ← as-found only; show “Not recorded” if empty (draft); never invent
   - Environmental ← `Temp: {n}°C` + light if present; no fake Lux
   - Optional small line: Prep instruction (if set) as non-certifying note — or omit from certificate face in phase 1 (recommend **omit from certificate face**; show in work-order UI only)

### Permissions
10. Field conditions editable when status is `Assigned` | `In Progress` | `Revision Required` by lead L1 / lead L2+ / Admin; **not** after Completed / L3 approved without reopen.
11. Supervisor does **not** silently rewrite field conditions during evaluation; if correction needed → reject findings or Admin reopen path.
12. Pass/Fail ownership unchanged (ISO 9712): L1 findings immutable after submit; supervisor evaluates or rejects; L3 separate.

## State machine
- States (unchanged): `Draft` → `Assigned` → `In Progress` → (`Awaiting Supervisor` ↔ `Revision Required`) → `Completed` (+ L3)
- Transitions relevant to this pack:
  - Admin → Assign → Draft/… → Assigned — requires work-order fields only (rule 4)
  - Tech → Start work → Assigned → In Progress — unlocks field conditions panel
  - Tech → Save exam conditions → In Progress — audit `EXAM_CONDITIONS_UPDATED`
  - L1 → Submit → blocked if exam conditions incomplete (rule 5)
  - Lead/Supervisor → Complete → blocked if exam conditions incomplete (rule 5)

## Permissions matrix

| Actor | Edit work-order scope / prep instruction | Edit as-found surface / temp°C / light | Evaluate Pass/Fail | Reject to L1 | Complete / L3 |
|-------|------------------------------------------|----------------------------------------|--------------------|--------------|---------------|
| Admin | Yes (Draft/Assigned per existing edit rules) | Yes while not Completed/L3-locked | No (unless acting outside ISO path) | No | Existing Admin paths only |
| Lead L1 | Scope refine In Progress (allowed); not Assign kit | Yes after Start / In Progress / Revision Required | No | No | Submit only |
| Lead L2+ | Same as L1 for conditions | Yes | Yes (own work) | N/A | Complete |
| Supervisor | No (view) | No silent edit | Yes | Yes + reason | Supervisor complete |
| L3 QA | No | No | No (QA review) | Existing L3 reject | Approve/reject certificate |

## Data / audit
- Immutable after: findings after L1 submit (existing); exam conditions should be complete before submit — post-submit edits only via reject/reopen
- Audit action: `EXAM_CONDITIONS_UPDATED` (already introduced)
- Required on reject: existing rejection reason
- Structured: `temperatureC` canonical; surface as-found string (phase 1 free text OK; optional select list later)

## Certificate / report
- Signatories: unchanged (L1 + supervisor + L3 as applicable)
- Never show Pass while Pending
- Never invent surface/temp/light on PDF
- Draft watermark remains until L3 approved
- Acceptance Spec column formatting stays consistent (prior PDF fidelity work)

## Seed / demo story
- Admin creates/assigns job **without** as-found surface/temp
- Tech Starts work → enters surface + °C (+ light if MT/VT) → items → submit/complete
- At least one MT or VT seed job demonstrates light required
- UT seed may omit light
- PDF draft shows recorded conditions only

## Explicit non-goals
- Admin-required as-found surface/temp at Assign
- Free-text temperature with typed “°C”
- Fake environmental values in PDF generator
- UV-A workflow / black-light intensity module
- Auto evaluation from temperature band

## Open risks (accepted)
- Phase-1 light as free text (not calibrated meter ID) — acceptable for demo; harden later
- Optional prep instruction may be confused with as-found if UI labels are weak — mitigate with clear “as-found” / “prep instruction” labels
- PT surface temp vs ambient — phase 1 single `temperatureC`; label as “Measured temperature (°C)”

## UI placement (normative for UX/FS)
| Field | Where |
|-------|--------|
| Scope of work ordered | Admin wizard Basics/Procedure (work order) |
| Standard / WEP link | Admin wizard Procedure |
| Surface prep instruction (optional) | Admin wizard Procedure — clearly labeled optional |
| As-found surface, temp °C, light | **Technician JobDetailView** examination-conditions panel (not Assign-required on wizard) |
| WEP temp range | Read-only chip from procedure snapshot |

## Handoff
Next skill: `ndt-fullstack-principal` (+ `ndt-product-ui-ux` / `ndt-ux-designer` for panel placement).  
Do not start coding until this pack is used as the execution contract (user already APPROVED 2026-09-18).
