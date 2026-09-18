# Spec: renewals-hub — Unified due list

## Objective
Admin “Renewals” surface listing method certs, equipment calibrations, and vision items that are expired, due soon, pending verify, or rejected — with filters and links into existing profiles.

## Traceability
- Pack rules 12–16
- Depends on `vision-authorization`

## Success criteria
- Admin nav/tab or dashboard entry: **Renewals**
- Aggregated rows from inspectors’ methodCertificates + vision + equipment cal
- Columns/fields: type, name, detail (method/serial/vision), status, date, open action
- Filters: All | People certs | Equipment | Vision; status All | Expired | Due soon | Pending verify (Pending+Rejected for certs)
- Quiet counts for expired / due soon
- CTA opens Inspector profile (registrar) or Equipment profile — no duplicate renew wizard required
- Empty state when nothing due

## In scope / Out of scope
- **In:** new component e.g. `RenewalsHub.tsx`, wire into AdminDashboard/App
- **Out:** email digests; auto-extend dates without opening registrar

## Tech constraints
- Reuse `checkExpiry`, method cert verificationStatus, vision helpers
- Match existing Admin slate/sky styling

## Boundaries
- Always: read-only aggregation except navigation to editors
- Never: invent renew without Admin confirmation in existing UI

## Open questions
None.
