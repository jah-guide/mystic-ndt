# Spec: vision-authorization — Employer file gate

## Objective
Add per-inspector vision acuity expiry and employer authorization; hard-block job assign when vision expired/missing or not authorized; warn when vision due soon.

## Traceability
- Pack: `NDT-PACK-p1-ops-surfaces.md` rules 5–11
- Map: `vision-authorization`

## Success criteria
- Inspector has `visionAcuityExpiryDate?`, `employerAuthorized?` (default true), `authorizationNotes?`
- Helper `getVisionStatus(inspector)` → valid | expiring_soon | expired | missing (30-day window via `checkExpiry`)
- `validateInspectorEligibility` / supervisor eligibility (or shared assign gate) hard-blocks when vision missing/expired or `employerAuthorized === false`, with clear reason string
- Due soon → warning only (still eligible)
- Inspector registrar/profile: edit vision date + authorized checkbox + notes; status chip visible
- Seed: all workshop inspectors have vision dates except intentional demos; ≥1 expired vision (valid method certs); ≥1 due soon
- Storage bump e.g. `ndt_inspectors_v6`
- JobForm shows block/warn for vision like method certs

## In scope / Out of scope
- **In:** types, validation, InspectorManagement UI, seed, JobFormModal wiring
- **Out:** per-method vision; medical forms; backend reminders

## Tech constraints
- React/TS/Vite/Tailwind + localStorage
- Commands: `npx tsc --noEmit`, `npm run build`

## Boundaries
- Always: method-cert rules still apply alongside vision
- Never: auto Pass/Fail from vision; soften missing-vision without pack change

## Open questions
None.
