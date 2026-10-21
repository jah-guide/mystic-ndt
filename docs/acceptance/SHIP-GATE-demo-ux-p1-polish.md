# Ship Gate — Demo UX P1 Polish

**Date:** 2026-09-27  
**Plan:** `docs/plans/PLAN-demo-ux-p1-polish.md`

## Verdict
PASS

## Checklist
| Item | Result | Evidence |
|------|--------|----------|
| P1-1 Admin Jobs cards below `md`, table `md+` | PASS | `JobList.tsx` — `md:hidden` card stack + `hidden md:block` table |
| P1-2 Compact / dismissible demo header; path tip `sm+` | PASS | `Header.tsx` — shorter bar, dismissible amber banner, path `hidden sm:inline` |
| P1-3 No list Edit on Completed | PASS | `renderActions` — Edit only when `status !== 'Completed'` |
| P1-4 Filter empty ≠ create empty | PASS | `jobs.length === 0` → Create; else → No matches + Clear filters |
| P1-5 `inspectorFilter` removed | PASS | Grep clean in `JobList.tsx` |
| tsc / build | PASS | `npm run build` exit 0 |

## How you test
1. Admin → Jobs at phone width: cards, open a job, Edit only when not Completed.  
2. Set filters so zero match → “No matches” + Clear filters.  
3. Clear all jobs path or Reset then filter: create empty only when `jobs.length === 0`.  
4. Dismiss amber banner; personas + path tip still usable on `sm`.  
5. `npm run build`.

## Deferred (P2)
- L3 tab strip / “Update L3 Sign-Off” copy  
- Cancel vs Back modal wording  
- Dense AdminDashboard KPI subtitle
