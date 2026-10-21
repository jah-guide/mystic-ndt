# Implementation Plan — Demo UX P1 Polish

> **For agentic workers:** Execute slice-by-slice; verify after each. Do not commit unless the user asks.  
> After build: fill `docs/acceptance/SHIP-GATE-demo-ux-p1-polish.md`.  
> UX intent: `ndt-product-ui-ux` (Admin ergonomics + demo chrome). No domain rule changes.

**Goal:** Fix P1 demo UX gaps — mobile Admin Jobs cards, compact demo header, no Edit on Completed in list, honest filter empty state, remove dead inspector filter state.

**Architecture:** Local UI-only changes in `JobList.tsx` and `Header.tsx`. Match existing slate/sky patterns; mirror technician job cards below `md`.

**Tech stack:** React + TypeScript + Tailwind. No new deps.

## Global constraints

- Do not change assign / eligibility / Pass-Fail domain rules  
- Match existing slate/sky look — no new visual system  
- Cockpit Edit already Draft/Assigned-only — list must match for Completed  
- P1-5: **remove** unused `inspectorFilter` (YAGNI)

## File map

| File | Responsibility |
|------|----------------|
| `src/components/admin/JobList.tsx` | P1-1 cards, P1-3 hide Edit, P1-4 empty states, P1-5 remove inspectorFilter |
| `src/components/common/Header.tsx` | P1-2 compact demo chrome + dismissible banner + path tip from `sm+` |

## Slices

### Slice A — JobList: Completed Edit, empty state, dead filter (P1-3, P1-4, P1-5)

- [ ] Remove `inspectorFilter` state and its filter clause  
- [ ] Empty: if `jobs.length === 0` → create CTA; if filters emptied list → “No matches” + Clear filters (no create push)  
- [ ] Hide list Edit when `job.status === 'Completed'` (PDF + Delete remain)

### Slice B — Header compact (P1-2)

- [ ] Single compact demo row: personas + short “not access control” chip/text  
- [ ] Amber banner dismissible (session `useState`); default visible once per load  
- [ ] Path tip visible from `sm+` (not only `lg`)

### Slice C — JobList mobile cards (P1-1)

- [ ] Below `md`: card list (job #, method, status, customer, site, date, inspector, result, actions)  
- [ ] `md+`: keep existing table  
- [ ] Card open → `onOpenJobDetail`; action buttons `stopPropagation`; no Edit on Completed

## Verify

1. Narrow viewport Admin → Jobs: cards, no horizontal table scroll  
2. Filter to zero jobs: Clear filters, not Create  
3. Completed row/card: no Edit control  
4. Header shorter after dismiss; path tip on `sm`  
5. `npm run build`
