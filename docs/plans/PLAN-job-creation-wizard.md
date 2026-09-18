# Implementation Plan — Job Creation Wizard

> **For agentic workers:** Execute slice-by-slice; verify after each slice. Do not commit unless the user asks.  
> **REQUIRED:** Read pack + UX spec before coding.

**Goal:** Replace the long Admin job form with a 5-step wizard (Work → People → Procedure → Equipment → Review) supporting Draft save and gated Assign.

**Architecture:** Keep `JobFormModal` as the entry shell (open/close, props). Replace inner single-page form with step state + shared form state. Reuse `validateInspectorEligibility`, `validateSupervisorEligibility`, `isLevel1ForMethod`, `suggestEquipmentForSlots`, `methodToEquipmentCategory`, `ensureProcedureSnapshotOnJob`. No backend.

**Tech stack:** React + TypeScript + existing Tailwind Admin patterns + localStorage via `StorageService`.

**Spec / pack:**
- Pack: [docs/packs/NDT-PACK-job-creation-wizard.md](../packs/NDT-PACK-job-creation-wizard.md) (**APPROVED**)
- UX: [docs/specs/SPEC-job-creation-wizard-ux.md](../specs/SPEC-job-creation-wizard-ux.md)

## Global constraints
- Draft minimum = customer + site + method + inspection date (+ job number)
- Assign hard-requires: lead (+ supervisor if L1-for-method), Active procedure, ≥1 selectable equipment, all eligibility hard gates
- Procedure must **not** auto-tick equipment (highlight “From procedure” only)
- People list = method-qualified only (eligible + blocked visible)
- Equipment list = method category **or** General
- Checked-out kit: visible, not selectable, reason `Checked out to job {jobNumber}`
- Draft excluded from technician active jobs and Dispatch open board
- Match existing slate/sky Admin UI
- Stack: frontend + seed only

---

## File map

| File | Responsibility |
|------|----------------|
| `src/components/admin/JobFormModal.tsx` | Wizard shell OR thin wrapper; step state; Draft/Assign submit paths |
| `src/components/admin/jobWizard/*` (new, optional split) | Step components if modal grows too large — OK to keep in one file if &lt; ~600 lines |
| `src/utils/jobWizard.ts` (new) | Pure helpers: method change clear, assign blockers list, equipment row state, method-filtered inspectors |
| `src/utils/validation.ts` | Reuse only; extend helpers only if needed for equipment checkout gate |
| `src/components/technician/TechnicianDashboard.tsx` | Exclude `Draft` from tech “my jobs” active list |
| `src/components/admin/DispatchBoard.tsx` | Remove `Draft` from `OPEN` statuses |
| `src/components/admin/JobList.tsx` | Draft badge; open wizard for drafts (already opens modal) |
| `src/services/seedData.ts` / `seedWorkshopRoster.ts` | Seed Draft job; ensure ≥1 checked-out equipment demo |
| Call sites unchanged API: `AdminDashboard`, `JobList`, `DispatchBoard` keep `<JobFormModal … />` |

---

## Slices

### Slice 0 — Helpers + Draft visibility
**Deliverable:** Pure helpers for wizard gates; Draft hidden from tech + dispatch.

**Tasks:**
- [ ] Add `src/utils/jobWizard.ts`:
  - `inspectorsForMethod(inspectors, method)` — has method cert or `methods.includes`
  - `sortInspectorsByName(list)` — localeCompare A–Z
  - `filterInspectorsByQuery(list, q)` — name substring
  - `equipmentForMethod(equipment, method)` — `category === methodToEquipmentCategory(method) || category === 'General' || !category` (decide: prefer include missing category as General for demo safety — document choice in code comment; **recommend include uncategorized**)
  - `getEquipmentAssignState(eq, currentJobId?)` → `'selectable' | 'warn_due_soon' | 'blocked_expired' | 'blocked_oos' | 'blocked_checked_out'` + `reason: string`
  - `getAssignBlockers(state)` → `string[]` from pack rules
  - `clearMethodDependentFields()` shape for reset on method change
- [ ] `TechnicianDashboard`: `activeJobs` exclude `status === 'Draft'` (and jobs with empty/`Draft` lead optional — if Draft has no inspectorId, it already won’t show; still exclude Draft explicitly)
- [ ] `DispatchBoard`: `OPEN` without `'Draft'`
- [ ] Verify: `npx tsc --noEmit`

### Slice 1 — Wizard shell + Step 1 Work + Draft save
**Deliverable:** Modal is stepped; Step 1 works; **Save draft** from Review **or** early path that can reach Review with empty later steps / optional “Save draft” available once Step 1 valid (UX: Draft CTA on Review; allow Next with empty people).

**Tasks:**
- [ ] Refactor `JobFormModal` to `step: 1|2|3|4|5` with indicator matching UX spec
- [ ] Step 1 UI: customer, site, method, inspection date, optional due date; method-change confirm clears dependent fields
- [ ] Persist Draft via `StorageService`: `status: 'Draft'`; allow empty `inspectorId` — **if Job type requires `inspectorId: string`, use `''` and ensure consumers tolerate empty** (grep and fix crash sites) OR make `inspectorId?` optional — **prefer optional `inspectorId?: string` in types if needed**
- [ ] Audit entry `JOB_DRAFT_SAVED` on draft save
- [ ] Default new job path no longer forces `Assigned` until Assign CTA
- [ ] Verify: create Draft from Step 1→…→Review Save draft; appears in Admin Jobs with Draft badge; not on tech home / dispatch

### Slice 2 — Step 2 People (+ L1 supervisor panel)
**Deliverable:** Method-filtered searchable A–Z lists; blocked visible; L1 expands supervisor.

**Tasks:**
- [ ] Lead list from helpers + `validateInspectorEligibility`; blocked `disabled`
- [ ] Search + A–Z
- [ ] L1 → supervisor panel; `validateSupervisorEligibility`; clear supervisor when lead not L1
- [ ] Next allowed without lead (amber hint)
- [ ] Verify: UT list has no MT-only people; Chris/Lindiwe-style blocked rows visible; L1 shows supervisor panel

### Slice 3 — Step 3 Procedure & scope
**Deliverable:** Active procedures for method; prefills scope/spec; no equipment auto-select.

**Tasks:**
- [ ] Procedure list; select sets `linkedProcedureId`, scope, standardSpec
- [ ] **Remove** auto-merge of `suggestEquipmentForSlots` into `equipmentIds` (current `handleProcedureLink` behaviour)
- [ ] Store suggestion IDs in wizard-local `suggestedEquipmentIds` for Step 4 chips only
- [ ] Amber if none selected
- [ ] Verify: picking procedure does not tick equipment

### Slice 4 — Step 4 Equipment
**Deliverable:** Method+General list; From procedure chips; checkout/expired/OOS blocked.

**Tasks:**
- [ ] Render equipment via `getEquipmentAssignState`; checkboxes only when selectable/warn
- [ ] “From procedure” chip when id in `suggestedEquipmentIds`
- [ ] Seed: one item `checkoutStatus: 'Checked Out'` with `currentJobNumber` set if missing
- [ ] Verify: checked-out shows reason; expired not selectable; suggestions unchecked by default

### Slice 5 — Step 5 Review + Assign + edit paths
**Deliverable:** Summary, blockers panel, Assign freezes snapshot; edit Draft vs Assigned labels.

**Tasks:**
- [ ] Review summary + Edit jump links (`setStep`)
- [ ] General notes field
- [ ] `getAssignBlockers` rose panel; Assign disabled while blockers
- [ ] Assign: same gates as pack; `ensureProcedureSnapshotOnJob(..., 'assign')`; status `Assigned` from Draft/new
- [ ] Edit non-Draft: primary **Save changes** (not Assign); do not regress status; re-freeze snapshot only when appropriate (existing assign/start behaviour)
- [ ] Wire JobList Draft badge if missing
- [ ] Seed ≥1 Draft job after Reset
- [ ] Verify: `npx tsc --noEmit`; `npm run build`; Reset demo smoke script below

---

## Smoke script (after Reset demo)
1. Admin → Jobs → New job → Step 1 only → jump/Next to Review → Save draft → Draft in list; tech home empty for that job; Dispatch no Draft card.
2. Resume Draft → People (UT) → pick eligible L2 → Procedure Active UT → Equipment: see “From procedure” unchecked → tick kit → Assign → status Assigned + snapshot.
3. New job → L1 lead → supervisor panel → complete Assign.
4. Equipment step: checked-out row disabled with job number reason.
5. Assign without procedure → blocked on Review.

---

## Risks
| Risk | Mitigation |
|------|------------|
| `inspectorId` required on `Job` | Use `''` for Draft; guard UI that assumes a lead name |
| Call sites assume always Assigned | Draft filters on tech/dispatch |
| Modal file size | Prefer single `JobFormModal` rewrite; split only if unreadable |
| Snapshot wipe on edit | Reuse `ensureProcedureSnapshotOnJob`; don’t clear snapshot on Draft save |
| Kit checked out to **this** job | `getEquipmentAssignState(eq, editingJobId)` — allow select when `currentJobId === editingJobId` |
| Linked but Superseded procedure | Assign blocker if procedure missing or `status !== 'Active'` |
| Supervisor blocked rows | Same as lead: show method L2/L3 blocked with reasons (not “hidden”) |

## Stress-test (2026-09-14) — PASSED with patches above
- Pack coverage: steps, Draft/Assign gates, method people filter, procedure→highlight equipment, method+General kit, checkout reason, L1 inline supervisor — covered.
- Gaps closed: own-job checkout exception; Active procedure check; supervisor blocked visibility; empty `inspectorId` for Draft.
- Proceed to build.

## Out of initiative
Backend, drag-drop, separate supervisor page, client PO fields, Wave B rework.

---

## HARD GATE
**Unlocked — user asked to stress-test then build (2026-09-14).**
