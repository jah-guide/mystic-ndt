# Spec: dispatch-board — Week assignment board

## Objective
Admin week board of open jobs by day with eligibility-aware assign path (method cert + vision/authorization + existing equipment rules).

## Traceability
- Pack rules 17–22
- Depends on `vision-authorization`

## Success criteria
- Admin **Dispatch** view: 7-day window (document start = today or Monday in implementation)
- Cards for open jobs (not Completed) placed by `dueDate` if set else `inspectionDate`
- Card shows job number, method, lead (or Unassigned), status; traffic colour from lead eligibility for that method (green/amber/rose/slate)
- Click card → open JobForm edit or job cockpit (prefer JobForm for assign; JobDetail if already fully assigned — implementer picks one primary)
- Assign lead/supervisor uses same gates as JobFormModal (including vision hard-block)
- Blocked candidates show reason text
- Seed: multiple open jobs spanning the visible week after Reset demo
- Empty day columns allowed

## In scope / Out of scope
- **In:** `DispatchBoard.tsx`, Admin nav entry, seed date spread if needed
- **Out:** drag-drop required (click-to-assign OK); AI scheduling; multi-week Gantt

## Tech constraints
- No new JobStatus; prefer no jobs storage bump
- Mobile: horizontal scroll days OK

## Boundaries
- Always: no second evaluation UI
- Never: assign expired vision / pending method cert

## Open questions
None — drag-drop optional.
