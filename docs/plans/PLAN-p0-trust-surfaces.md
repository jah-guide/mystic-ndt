# Implementation Plan — P0 Trust Surfaces (Wave A)

## Pack + specs referenced
- Pack: [docs/packs/NDT-PACK-p0-trust-surfaces.md](../packs/NDT-PACK-p0-trust-surfaces.md)
- Map: [docs/specs/CAPABILITY-MAP-p0-trust-surfaces.md](../specs/CAPABILITY-MAP-p0-trust-surfaces.md) (**APPROVED**)
- Specs: `SPEC-procedure-snapshot.md`, `SPEC-supervisor-home.md`, `SPEC-report-delivery-gate.md`, `SPEC-audit-pack-export.md`

## Phase / slice list (dependency order)

### Slice 0 — `procedure-snapshot`
- **Deliverable:** `ProcedureSnapshot` on Job; freeze on Assign / first Start; JobDetail + PDF read snapshot; Replace revision + reason + audit; jobs storage key bump
- **Files likely:** `src/types/index.ts`, `src/utils/procedureSnapshot.ts` (new), `src/components/admin/JobFormModal.tsx`, `src/components/technician/JobDetailView.tsx`, `src/utils/pdfGenerator.ts`, `src/services/storage.ts`, seed jobs if needed
- **Acceptance:** Spec success criteria for procedure-snapshot
- **Verify:** `npx tsc --noEmit`; `npm run build`; Reset demo → assign with WEP → edit live procedure → job criteria unchanged

### Slice 1 — `supervisor-home`
- **Deliverable:** Supervisor queue UI (Awaiting Supervisor + Revision Required) for current demo inspector; open JobDetailView
- **Files likely:** `src/components/technician/TechnicianDashboard.tsx` and/or `SupervisorHome.tsx`, `Header.tsx` (script hint), `seedData.ts` if queue empty
- **Acceptance:** Spec success criteria for supervisor-home
- **Verify:** build; persona Thabo → see queue → open → evaluate/reject path still works

### Slice 2 — `report-delivery-gate`
- **Deliverable:** finalWithoutL3 + reason; delivery record; Mark delivered gated; audit events; status chip
- **Files likely:** `types`, `ReportViewModal.tsx`, maybe `JobDetailView.tsx` / L3 approve path, `storage` jobs key if not bumped, `validation` helpers `isReportDeliveryAllowed(job)`
- **Acceptance:** Spec success criteria for report-delivery-gate
- **Verify:** build; cannot Mark delivered until L3 approve or Admin waiver; then can

### Slice 3 — `audit-pack-export`
- **Deliverable:** Export audit pack action + generated bundle using snapshot + delivery/Final labeling
- **Files likely:** `src/utils/auditPack.ts` (new), `ReportViewModal.tsx` / JobDetailView, maybe thin reuse of pdfGenerator
- **Acceptance:** Spec success criteria for audit-pack-export
- **Verify:** build; Complete job → Export → contents include snapshot revision + equipment + cert summary

## Risks & mitigations
| Risk | Mitigation |
|------|------------|
| Jobs key migration loses demo data | Bump key + Reset demo in scripts; document in Header |
| PDF still reads live procedure | Centralize `getJobProcedureView(job)` helper used by JobDetail + PDF |
| ZIP dependency bloat | Default HTML/print or sequential PDFs; ask before jszip |
| Supervisor home buried | Tab or default section when persona has supervise queue > 0 |

## Explicitly not in this initiative
Wave B: dispatch board, renewals hub, vision/authorization hard-block. Backend/auth/email.

---

## Tasks

### Slice 0 — procedure-snapshot
- [ ] Task: Add `ProcedureSnapshot` type + `buildProcedureSnapshot` / `getJobProcedureView` helpers
  - Acceptance: Types compile; helper copies criteria deeply
  - Verify: `npx tsc --noEmit`
  - Files: `src/types/index.ts`, `src/utils/procedureSnapshot.ts`
- [ ] Task: Freeze on Assign (JobFormModal create/update assign) and first Start (JobDetailView)
  - Acceptance: Snapshot written with correct `snapshotSource`
  - Verify: Manual assign + start paths
  - Files: `JobFormModal.tsx`, `JobDetailView.tsx`, `storage.ts` (jobs key)
- [ ] Task: JobDetail + PDF consume snapshot; Replace revision UI + audit
  - Acceptance: Live WEP edit doesn’t change frozen job; replace requires reason
  - Verify: build + demo
  - Files: `JobDetailView.tsx`, `pdfGenerator.ts`

### Slice 1 — supervisor-home
- [ ] Task: Supervisor queue sections + empty states + open job
  - Acceptance: Pack rules 5–9 met for Thabo persona
  - Verify: build + Reset demo persona path
  - Files: `TechnicianDashboard.tsx` / `SupervisorHome.tsx`, seed if needed, `Header.tsx` hint

### Slice 2 — report-delivery-gate
- [ ] Task: Job delivery/final-without-L3 fields + `isReportDeliveryAllowed`
  - Acceptance: Gate logic matches pack 18
  - Verify: tsc
  - Files: `types`, `validation.ts` or small helper
- [ ] Task: Admin Final-without-L3 + Mark delivered UI + audit + chip
  - Acceptance: Disabled until gate open; reason required for waiver
  - Verify: build + manual
  - Files: `ReportViewModal.tsx` (+ Admin/L3 surfaces as needed)

### Slice 3 — audit-pack-export
- [ ] Task: Build pack document generator + Export button
  - Acceptance: Pack rule 16 contents present; Final labeling correct
  - Verify: build + export on completed seeded/created job
  - Files: `auditPack.ts`, `ReportViewModal.tsx` / `JobDetailView.tsx`

---

## HARD GATE
**Do not implement until the user explicitly approves this plan** (e.g. “approve the plan” / “build it”).
