# Implementation Plan — P1 Ops Surfaces (Wave B)

## Pack + specs
- Pack: [docs/packs/NDT-PACK-p1-ops-surfaces.md](../packs/NDT-PACK-p1-ops-surfaces.md) (**APPROVED**)
- Map: [docs/specs/CAPABILITY-MAP-p1-ops-surfaces.md](../specs/CAPABILITY-MAP-p1-ops-surfaces.md)
- Specs: `SPEC-vision-authorization.md`, `SPEC-renewals-hub.md`, `SPEC-dispatch-board.md`

## Slices

### Slice 0 — `vision-authorization`
- Deliverable: Inspector fields; `getVisionStatus` / eligibility hard-block+warn; registrar UI; seed demos; `ndt_inspectors_v6`; JobForm reasons
- Files likely: `types/index.ts`, `utils/validation.ts` (or `visionAuthorization.ts`), `InspectorManagement.tsx`, `JobFormModal.tsx`, `seedWorkshopRoster.ts`, `storage.ts`
- Verify: `npx tsc --noEmit`; `npm run build`; Reset → assign blocked on expired/missing vision; warn on due soon

### Slice 1 — `renewals-hub`
- Deliverable: Admin Renewals list + filters + navigation to profiles
- Files likely: `RenewalsHub.tsx`, `AdminDashboard.tsx` / `App.tsx`, `Header.tsx` if needed
- Verify: build; hub shows cert + cal + vision rows; filter works

### Slice 2 — `dispatch-board`
- Deliverable: 7-day Admin board; open jobs; eligibility colour; assign via existing form/gates
- Files likely: `DispatchBoard.tsx`, Admin nav, seed job dates if sparse
- Verify: build; Reset → board non-empty; cannot assign vision-blocked person

## Tasks (summary)
- [ ] Types + vision helpers + eligibility integration + storage bump + seed
- [ ] Inspector registrar vision/auth UI + JobForm messaging
- [ ] RenewalsHub aggregation + Admin entry
- [ ] DispatchBoard week UI + JobForm/open wiring
- [ ] Demo script / Header hint for Wave B path

## Risks
| Risk | Mitigation |
|------|------------|
| Seed missing vision dates → mass block | Seed all with dates; only demos missing/expired |
| Dispatch clutter | Open jobs only; 7 days |
| Duplicate eligibility logic | Share helpers with JobFormModal |

## Out of initiative
Backend, notifications, drag-drop mandate, Wave A rework.

---

## HARD GATE
**Do not implement until user says “approve the plan” / “build it”.**
