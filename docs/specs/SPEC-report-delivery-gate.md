# Spec: report-delivery-gate — Final + Mark delivered

## Objective
Enforce pack delivery rules: Mark delivered only when L3-approved OR Admin sets Final without L3 with reason; store delivery record + audit.

## Traceability
- Pack rules 18–20
- Map module `report-delivery-gate`

## Success criteria
- Job (or report meta on job) supports: `l3Approved` (use existing fields if present), `finalWithoutL3?: boolean`, `finalWithoutL3Reason?: string`, `delivery?: { recipient, channel, deliveredAt, recordedBy }`
- UI: Admin can mark Final without L3 with mandatory reason (modal/prompt)
- Mark delivered control on Report view (or job complete panel) **disabled** until gate open; when open, capture recipient + channel + timestamp
- Audit events for final-without-L3 and mark delivered
- PDF watermark: prefer existing L3-approved = Final behavior; Final-without-L3 allows delivery and shows delivery chip — if watermark still DRAFT, show banner “Final for delivery (Admin waiver)” without claiming L3 technical approval on the certificate face unless product already equates them (default: **do not** strip DRAFT watermark solely for Admin waiver; delivery is commercial handoff)

## In scope / Out of scope
- **In:** types, ReportViewModal (or JobDetailView report section) controls, storage key bump if needed, seed optional delivered example
- **Out:** real email/SMTP; customer portal

## Data & state
```ts
delivery?: {
  recipient: string;
  channel: 'Email mock' | 'Handed over' | 'Other';
  deliveredAt: string;
  recordedBy: string;
};
finalWithoutL3?: boolean;
finalWithoutL3Reason?: string;
```
Reuse existing L3 approval flags on Job if already named differently — map in implementation, don’t duplicate.

## Permissions
- Admin: final without L3 + mark delivered when gate open
- L3: mark delivered when L3-approved
- Tech/Supervisor: view delivery status only

## Tech constraints
- localStorage jobs key bump if schema changes

## Boundaries
- Always: require reason for final without L3
- Never: allow Mark delivered on non-final jobs

## Open questions
None — watermark vs Admin waiver default locked above.
