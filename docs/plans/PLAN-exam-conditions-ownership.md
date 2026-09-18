# Implementation Phases — Examination Conditions Ownership

## Phase status
- Phase 0–3: **implemented** 2026-09-18 (gates, wizard, field °C panel, PDF, SHIP-GATE)
- Verify: `npm run build` clean; walk `docs/acceptance/SHIP-GATE-report-exam-conditions.md`

## Pack reference
`docs/packs/NDT-PACK-exam-conditions-ownership.md` (APPROVED 2026-09-18)

Key rules: Admin = work order + optional prep instruction; Field = as-found surface + numeric °C + light (VT/MT); Assign does **not** require exam conditions; submit/complete does; PDF never invents.

## Stress-test verdict (Full-Stack Principal)
**Code contradicts pack today.** Highest risk if we flip gates without seed: MT `job-2` / `job-5` and VT `job-1b` lack `ambientLight`. Old `SHIP-GATE-report-exam-conditions.md` still asserts assign-requires-surface/temp — must retire/rewrite with Phase A/D.

| Risk | Severity | Mitigation in phases |
|------|----------|----------------------|
| Assign still requires surface/temp | High | Phase A: strip from `getAssignBlockers` |
| Wizard defaults invent as-found | High | Phase B: remove defaults; add `surfacePrepInstruction` |
| Free-text temp; `temperatureC` derived | High | Phase C: number input → canonical °C |
| No VT/MT light hard-block on submit | High | Phase A: extend `pushExaminationConditionErrors` |
| `canEditExamConditions` too broad (status-only) | Med | Phase C: lead L1 / L2+ / Admin only; after Start (Assigned edit Admin-only optional) |
| Seed MT/VT missing light | High | Phase A seed in same slice as light gate |
| Dual capture (wizard + cockpit) | Med | Phase B remove Assign-required exam block |
| Acceptance doc drift | Med | Phase D rewrite SHIP-GATE |

## Phase 0 — Types & validation (gates + seed)
**Deliverable:** `surfacePrepInstruction?: string` on Job; `getAssignBlockers` keeps scope, drops surface/temp; `pushExaminationConditionErrors` requires surface + finite `temperatureC` + ambientLight for VT/MT; seed MT/VT get light + `temperatureC` where needed.
**Acceptance:** Assign possible without as-found; L1 submit / complete blocked without field conditions; `tsc` clean.

## Phase 1 — Admin work-order UI
**Deliverable:** Procedure step: scope + standard + WEP + optional prep instruction only; remove as-found surface/temp/light as Assign fields; no inventing defaults on create.
**Acceptance:** New Assigned job has empty as-found; prep instruction optional and not on PDF face.

## Phase 2 — Field panel + °C UX
**Deliverable:** JobDetailView examination conditions: as-found surface, number °C (unit fixed), light when VT/MT; sync `temperature = \`${n}°C\``; tighten edit permissions; WEP temp-range chip read-only.
**Acceptance:** After Start work, tech can save conditions; supervisor cannot silently edit; submit still gated.

## Phase 3 — PDF + acceptance
**Deliverable:** PDF env from `temperatureC`; surface Not recorded if empty; no prep on certificate; rewrite `SHIP-GATE-report-exam-conditions.md` to pack contract.
**Acceptance:** Draft PDF honest; ship-gate checklist matches pack; build green.

## Phase N — Demo path
Admin assign without conditions → Start work → enter surface + °C (+ light MT/VT) → items → submit/complete → PDF.
