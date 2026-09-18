# Ship Gate — UI Polish (Dates, Modal Scroll Lock, In-Cockpit Edit)

**Date:** 2026-09-15  
**Plan:** `docs/plans/PLAN-ui-polish-dates-modals-edit.md`

## Verdict
PASS

## Checklist
| Item | Result | Evidence |
|------|--------|----------|
| `useBodyScrollLock` hook (ref-counted) | PASS | `src/hooks/useBodyScrollLock.ts` |
| Modal overlays use `overflow-hidden` + lock | PASS | JobForm, InspectionItem, Complete, L3 Review, Report, Equipment Deployment/Incident, Customer/Inspector/Equipment/Incident/Procedure modals; JobDetail reopen/reject/lightbox |
| Custom `DateField` (slate/sky calendar) | PASS | `src/components/common/DateField.tsx` |
| Job wizard date labels + DateField | PASS | “Inspection date (on site)” / “Due date — report / close-out” |
| Inspector + Equipment date inputs → DateField | PASS | Create/edit + cert expiry + cal renewal |
| Admin in-cockpit **Continue setup** / **Edit job** | PASS | `JobDetailView` CTA + `App` `cockpitEditJobId` + `JobFormModal` |
| tsc | PASS | exit 0 |
| build | PASS | exit 0 |

## How you test
1. Admin → Jobs → open a **Draft** job into cockpit → **Continue setup** opens wizard without leaving cockpit; Save draft; due date persists after reopen.
2. Open an **Assigned** job → **Edit job** works the same way.
3. With Jobs list scrolled, open Create Job → background page does not scroll; only modal body scrolls.
4. Job wizard Work step → pick dates via custom calendar (not native OS date picker chrome).
5. Inspectors → Add/Edit → cert / vision expiry via DateField; method cert expiry in registrar too.
6. Equipment → Register / Log calibration → DateFields.

## Deferred
- Native date inputs elsewhere (if any appear later) should reuse `DateField`.
- Technician role does not get in-cockpit Edit (Admin-only by design).
