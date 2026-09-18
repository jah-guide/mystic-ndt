# Implementation Plan — Inspector Cert KPI Cards

> **For agentic workers:** Execute slice-by-slice; verify after each. Do not commit unless the user asks.  
> After build: run **`ndt-ship-gate`** (UI CTA reachability + pack/plan checklist) before claiming done.

I'm using the writing-plans skill to create this implementation plan.

**Goal:** Add equipment-style Valid / Due soon / Expired KPI cards on the Inspectors list that filter **people** by method-cert status and **mask method chips** to only matching methods when a card is active.

**Architecture:** Keep filtering in `InspectorManagement.tsx`. Add small pure helpers (method-cert status + person match + chip mask) in `validation.ts` or a tiny `inspectorCertFilters.ts` so list logic is testable and not buried in JSX. Reuse existing `certFilter` state (or rename to match equipment’s toggle pattern). Match Equipment registrar card styling.

**Tech stack:** React + TypeScript + Tailwind (existing Admin slate/sky).

**Spec / intent (locked in chat — UX-only, NDT engineer waived once):**
- KPI counts = **people** with ≥1 method cert in that bucket (a person may increment multiple cards).
- List: person appears if **any** method cert matches selected KPI.
- Chips: when KPI ≠ All, show **only** chips whose tone/status matches the KPI; when All, show all methods as today.
- Click card toggles filter (same card again → All), like Equipment.
- Search + Filters popover + KPI **AND** together; Method filter + KPI → person must have a matching cert **on that method**.
- Expired card includes **expired + pending + rejected** (action queue), labelled **Expired / blocked** to match current Filters copy.
- Valid = verified + in-date only (not pending).
- Due soon = verified + expiring_soon (not pending/rejected).
- Do **not** use `getInspectorSummaryExpiryDate` for KPI membership (that hides mixed-status people).

## Global constraints
- Frontend only; no storage key bump required unless seed demos need new mixed-status people (prefer existing seed: Chris/Lindiwe/Mandla-style mixed certs).
- Preserve Filters popover; sync cert chips there with KPI selection (one source of truth).
- Vision/auth not part of these three cards (Renewals hub already covers vision).
- Ship gate: cards must be clickable in UI; chip masking must be visible on filtered rows.

---

## File map

| File | Responsibility |
|------|----------------|
| `src/utils/inspectorCertFilters.ts` (new) **or** helpers in `validation.ts` | `getMethodCertFilterStatus(insp, method)`, `inspectorMatchesCertFilter(insp, filter, methodFilter?)`, `methodsVisibleForCertFilter(insp, filter)`, KPI count helpers |
| `src/components/admin/InspectorManagement.tsx` | KPI card grid; wire filter + chip mask; sync Filters popover |
| `src/components/admin/EquipmentManagement.tsx` | **Read-only reference** for card markup/toggle behaviour |

---

## Status mapping (normative for this plan)

Per method, derive status from `getMethodCertificate` + `checkExpiry` + `verificationStatus` (align with existing `methodChipTone`):

| Chip tone today | KPI bucket |
|-----------------|------------|
| `emerald` (verified + valid) | `valid` |
| `amber` (verified + due soon) | `expiring_soon` |
| `pending` (PendingVerification) | `expired` (Expired / blocked card) |
| `rose` (expired or Rejected) | `expired` |

If no method cert but method listed on legacy `methods[]`, fall back to summary/legacy expiry for that method only (same as `methodChipTone` today).

---

## Slices

### Slice 0 — Helpers
**Deliverable:** Pure functions for status, person match, visible methods, counts.

- [ ] Add `getMethodCertFilterStatus(inspector, method): 'valid' | 'expiring_soon' | 'expired' | null`  
  - `null` if person does not hold that method  
  - Map pending/rejected → `'expired'` for filter purposes  
- [ ] `inspectorMatchesCertFilter(inspector, filter, methodFilter?: NdtMethod | 'ALL'): boolean`  
  - `filter === 'ALL'` → true (method filter still applied separately)  
  - Else: if `methodFilter` is a method, require that method’s status === filter  
  - Else: any method on inspector has status === filter  
- [ ] `visibleMethodsForCertFilter(inspector, filter): NdtMethod[]`  
  - `ALL` → all `inspector.methods` (or qualified methods)  
  - Else → methods whose status === filter  
- [ ] `countInspectorsByCertFilter(inspectors, filter): number` for KPI digits  
- [ ] Verify: `npx tsc --noEmit`

### Slice 1 — KPI cards + list membership
**Deliverable:** Three cards above Inspectors list; click sets `certFilter`; list uses new matcher (not summary expiry).

- [ ] Copy Equipment card grid pattern into `InspectorManagement` (Valid / Due soon / Expired / blocked)  
- [ ] Toggle: click active card → `ALL`  
- [ ] Replace `checkExpiry(getInspectorSummaryExpiryDate(insp))` in `filteredInspectors` with `inspectorMatchesCertFilter`  
- [ ] Keep search, methodFilter, levelFilter as AND  
- [ ] Filters popover cert buttons set the same `certFilter` state (already do — ensure labels match cards)  
- [ ] Verify: click Due soon → only people with ≥1 due-soon method; counts look plausible vs seed

### Slice 2 — Chip masking
**Deliverable:** List rows only render method chips in `visibleMethodsForCertFilter`.

- [ ] In list row chip map, iterate `visibleMethodsForCertFilter(insp, certFilter)` instead of raw `insp.methods`  
- [ ] Empty visible methods should not happen if membership is correct; if it does, still show name (no chips)  
- [ ] Profile / registrar views unchanged (full method list)  
- [ ] Verify: mixed person on Expired shows only rose/blocked chips; on Valid only emerald

### Slice 3 — Ship gate
**Deliverable:** Acceptance evidence + human walkthrough.

- [ ] `npx tsc --noEmit`; `npm run build`  
- [ ] Grep: KPI labels present in `InspectorManagement.tsx`  
- [ ] Write short note under `docs/acceptance/SHIP-GATE-inspector-cert-kpi.md` (or append) with PASS/FAIL  
- [ ] Demo script below

---

## Smoke script
1. Admin → Inspectors.  
2. See three KPI cards with counts.  
3. Click **Due soon** → card rings; list shorter; each row’s chips are amber/due-soon only.  
4. Click **Expired / blocked** → people with expired/pending/rejected methods; chips only those.  
5. Click same card again → All; all chips return.  
6. Set Method filter UT + Expired → only people with UT in expired/blocked; chips UT-only if matching.  
7. Search still works with KPI active.

---

## Risks
| Risk | Mitigation |
|------|------------|
| Summary-expiry filter left in place | Slice 1 explicitly replaces it |
| Counting certs vs people | Counts are people (`countInspectorsByCertFilter`) |
| Pending not visible on any card | Folded into Expired / blocked |
| Chip mask empty row | Membership requires ≥1 matching method |

## Out of initiative
- Vision KPI cards (Renewals)  
- NDT domain pack (waived)  
- Changing assignment eligibility rules  

---

## HARD GATE
**Do not implement until user says “approve the plan” / “build” / “build it”.**
