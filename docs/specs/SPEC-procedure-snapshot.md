# Spec: procedure-snapshot — Job WEP freeze

## Objective
Freeze the linked Written Examination Procedure (revision + structured acceptance criteria + key limits) onto the job at Assign (or first Start if Draft), so field UI and PDF use the snapshot — not the live procedure document.

## Traceability
- Pack: `docs/packs/NDT-PACK-p0-trust-surfaces.md` rules 10–14
- Map: `docs/specs/CAPABILITY-MAP-p0-trust-surfaces.md` module `procedure-snapshot`

## Success criteria
- Assigning a job with a linked Active procedure creates `job.procedureSnapshot` with id, procedureNumber, revisionNumber, title, method, acceptanceCriteria copy, temperatureRanges/temperature as available, snapshotAt, snapshotSource (`assign` | `start` | `replace`)
- First Start on Draft with procedure and no snapshot creates snapshot
- Editing the live WEP after freeze does not change criteria shown on that job or in PDF for that job
- Admin/L3 can Replace procedure revision with mandatory reason; audit event recorded; new snapshot written
- Jobs with no procedure: snapshot null; UI shows “No procedure linked”

## In scope / Out of scope
- **In:** types, freeze helpers, JobFormModal/assign + Start paths, JobDetailView display, PDF criteria/WEP line from snapshot, replace UI (minimal), seed bump jobs key if needed
- **Out:** requiring procedure on every job; backend document control

## Data & state
```ts
interface ProcedureSnapshot {
  procedureId: string;
  procedureNumber: string;
  title: string;
  method: NdtMethod;
  revisionNumber: string;
  standardRef?: string;
  acceptanceCriteria: AcceptanceCriterion[];
  temperatureRanges?: TemperatureRange[];
  temperature?: string;
  equipmentSlots?: ProcedureEquipmentSlot[];
  snapshotAt: string;
  snapshotSource: 'assign' | 'start' | 'replace';
  replacedReason?: string;
}
// Job.procedureSnapshot?: ProcedureSnapshot
```
Bump `ndt_jobs` storage key when shape changes.

## Permissions
- System/Admin assign & Start: create snapshot
- Admin / L3: replace with reason
- Tech: read-only display

## Tech constraints
- React/TS/Vite/Tailwind + localStorage
- Commands: `npx tsc --noEmit`, `npm run build`, `npm run dev`
- Helper e.g. `buildProcedureSnapshot(proc, source, reason?)` in `validation.ts` or `utils/procedureSnapshot.ts`

## Boundaries
- Always: leave app buildable; PDF prefers snapshot when present
- Ask first: forcing procedure mandatory on all jobs
- Never: invent Pass/Fail from criteria; silently mutate snapshot without replace+reason

## Open questions
None — pack locks assign/start timing.
