# Ship Gate — Inspector Cert KPI Cards

**Date:** 2026-09-14  
**Plan:** `docs/plans/PLAN-inspector-cert-kpi-cards.md`

## Verdict
PASS

## Checklist
| Item | Result | Evidence |
|------|--------|----------|
| Helpers (any-method match, chip mask, counts) | PASS | `src/utils/inspectorCertFilters.ts` |
| KPI cards Valid / Due soon / Expired / blocked | PASS | `InspectorManagement.tsx` — three buttons, toggle to ALL |
| List uses any-method filter (not summary expiry) | PASS | `inspectorMatchesCertFilter` in `filteredInspectors` |
| Chips masked when KPI active | PASS | `visibleMethodsForCertFilter(insp, certFilter)` on list rows |
| Filters popover shares `certFilter` | PASS | Same state as KPI cards |
| tsc | PASS | exit 0 |
| build | PASS | exit 0 |

## How you test
1. Admin → **Inspectors**
2. See three KPI cards with people counts
3. Click **Due soon** → ring highlight; list narrows; chips on each row are due-soon methods only
4. Click **Expired / blocked** → expired/pending/rejected methods only on chips
5. Click same card again → All; full chip sets return
6. Method filter UT + Expired → only people with UT in that bucket

## Deferred
None
