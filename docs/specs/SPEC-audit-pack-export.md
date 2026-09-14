# Spec: audit-pack-export — Evidence bundle

## Objective
One-click export of an inspection evidence pack for Completed (and Final when applicable) jobs: report PDF + findings/history + equipment/cal + method certs + procedure snapshot + key audit events.

## Traceability
- Pack rules 15–17
- Map module `audit-pack-export` (depends on `procedure-snapshot`, `report-delivery-gate`)

## Success criteria
- Action **Export audit pack** on Completed jobs (Admin, supervising L2/L3 for that job, L3 reviewer)
- Bundle includes at minimum:
  1. Certificate/report PDF (existing generator)
  2. Findings summary (current items + superseded revisions / reject reasons if any)
  3. Equipment used + cal expiry
  4. Lead + supervisor method cert summary for job.method
  5. Procedure snapshot revision/title/criteria summary (or “none linked”)
  6. Key audit trail lines
- Label pack header: **Field-complete** vs **Final** (L3-approved) vs **Final (Admin waiver)** consistently
- Never list Pending item results as Pass
- Frontend-only: prefer single printable HTML or multi-step PDF download; ZIP optional if low-friction (e.g. existing libs only — do not add heavy deps without ask)

## In scope / Out of scope
- **In:** `utils/auditPack.ts` (or similar), button on ReportViewModal / JobDetailView, demo path after Complete
- **Out:** server-side archive; emailing the pack

## Data & state
Read-only aggregation from Job, inspectors, equipment, procedureSnapshot, delivery fields. Optional audit log entry `audit_pack_exported`.

## Permissions
Per pack matrix: Admin; Supervisor on supervised jobs; L3 on reviewable jobs. Not L1.

## Tech constraints
- Reuse `pdfGenerator` where possible
- Keep under localStorage size sense (don’t re-embed huge duplicate photo sets in HTML if avoidable — summarize photo counts)

## Boundaries
- Always: build stays green; pack reflects snapshot not live WEP
- Ask first: new npm dependency for ZIP
- Never: auto-evaluate Pass/Fail in the pack narrative

## Open questions
None — ZIP vs HTML/PDF left as implementer choice within “Ask first” for new deps.
