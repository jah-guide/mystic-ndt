# Ship Gate — Job Creation Wizard

**Date:** 2026-09-14  
**Pack:** `docs/packs/NDT-PACK-job-creation-wizard.md`  
**UX:** `docs/specs/SPEC-job-creation-wizard-ux.md`  
**Plan:** `docs/plans/PLAN-job-creation-wizard.md`

## Round 1 — FAIL (why your doubt was correct)

| Item | Result | Evidence |
|------|--------|----------|
| Save draft CTA | **FAIL** | Implemented in `persistJob('draft')` but button only rendered when `step === 5`. Pack/UX: Draft needs only Step 1 — CTA was not reachable without Next×4. Felt “missing.” |
| tsc/build alone | Insufficient | Prior “complete” claim violated ship-gate spirit |

## Round 2 — Builder fix

- `Save draft` footer button on **every** step when creating/editing Draft (`isDraftEdit`), enabled once Step 1 valid
- Hint copy on Step 1
- Jobs storage key → `ndt_jobs_v9` so Reset loads seed draft `NDT-2026-0006`
- Skill: `ndt-ship-gate` + wired into spec-driven / product pipeline / fullstack / acceptance verifier

## Round 2 — Verifier PASS

| Item | Result | Evidence |
|------|--------|----------|
| Save draft reachable on Step 1 | PASS | `JobFormModal.tsx` footer: `isDraftEdit &&` Save draft (not step===5 only) |
| Assign on Review | PASS | Step 5 + blockers gate |
| Method-filtered people | PASS | `inspectorsForMethod` + Step 2 UI |
| Procedure no auto-tick | PASS | `handleProcedureSelect` sets `suggestedEquipmentIds` only; “From procedure” chip |
| Equipment method+General + checkout reason | PASS | `equipmentForMethod` + `Checked out to job …` |
| Draft off tech / dispatch | PASS | Tech excludes Draft; Dispatch `OPEN` has no Draft |
| Seed draft | PASS | `job-draft-1` / `NDT-2026-0006` + `ndt_jobs_v9` |
| tsc | PASS | exit 0 |
| build | PASS | exit 0 |

## How you test

1. Header → **Reset demo** (loads `ndt_jobs_v9` seed including Draft `NDT-2026-0006`).
2. Role **Admin** → **Jobs**.
3. Confirm Draft row / filter **Draft**.
4. **Create New Job** → on Step 1 (Work) footer shows **Save draft** (enabled) beside Next.
5. Fill customer/site/method/date → **Save draft** → modal closes → new Draft in list.
6. Edit that Draft → continue People → Procedure → Equipment → Review → **Assign** when blockers clear.
7. Equipment: Parker yoke on job-2 shows “Checked out to job NDT-2026-0002” and cannot be selected for a new job.
8. Tech role: Drafts do not appear as active lead jobs. **Dispatch** has no Draft cards.

## Deferred
None for Save draft (was in scope; was a discoverability bug, not a later phase).
