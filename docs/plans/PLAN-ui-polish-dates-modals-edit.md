# Implementation Plan — UI Polish: Date Picker, Modal Scroll Lock, In-Cockpit Edit

> **For agentic workers:** Execute slice-by-slice; verify after each. Do not commit unless the user asks.  
> After build: run **`ndt-ship-gate`** before claiming done.  
> UX intent: `ndt-product-ui-ux` (Admin ergonomics). Domain dates meaning locked in chat (inspection = on-site day; due = close-out/delivery KPI).

**Goal:** Shared custom date control matching Admin slate/sky UI; lock page scroll while any modal is open; Admin can **Edit job / Continue setup** from Draft (and Assigned) cockpit without returning to the Jobs list; clearer job date labels.

**Architecture:**
- `useBodyScrollLock(active)` hook — toggles `document.body.style.overflow` (and padding compensation if needed) on mount/unmount.
- `DateField` presentational component — controlled `value`/`onChange` as `YYYY-MM-DD` strings (same contract as `input type="date"`); popover calendar styled like the app; keyboard-accessible; does not change domain validation.
- Wire `DateField` into existing date inputs (Job wizard, Inspector registrar, Equipment registrar).
- Admin `JobDetailView`: header CTA opens job wizard via callback from `App` (lift lightweight edit modal state beside `activeJobId`).

**Tech stack:** React + TypeScript + Tailwind (no new date library required — prefer lightweight custom month grid; if a dependency is needed, ask user first — **default: no new npm deps**).

**References:**
- Product UI/UX: in-context Edit; modal body-only scroll  
- Types: `Job.inspectionDate`, `Job.dueDate?` unchanged  

## Global constraints
- Do not change job assign/eligibility domain rules  
- Date values remain `YYYY-MM-DD` strings  
- Match existing slate/sky look — no new visual system  
- Modal: backdrop + page do not scroll; modal panel scrolls only if content exceeds `max-h`  
- Edit-in-cockpit: Admin + `Draft` required; also allow `Assigned` (wizard already edits Assigned); hide primary Edit on `Completed` (optional secondary later — **out**: edit completed)  
- Ship-gate: CTAs visible without list backtrack; date popover usable in Job Form Step 1  

---

## File map

| File | Responsibility |
|------|----------------|
| `src/hooks/useBodyScrollLock.ts` (new) | Lock/unlock `document.body` overflow while `locked === true` |
| `src/components/common/DateField.tsx` (new) | Custom date input + calendar popover |
| `src/components/admin/JobFormModal.tsx` | Use DateField; clearer labels; call scroll lock |
| `src/components/admin/InspectorManagement.tsx` | DateField for cert/vision dates; scroll lock on modals |
| `src/components/admin/EquipmentManagement.tsx` | DateField for cal dates; scroll lock on modals |
| Other `*Modal*.tsx` / overlay hosts | `useBodyScrollLock(true)` while open (list below) |
| `src/components/technician/JobDetailView.tsx` | Admin header **Edit job** / **Continue setup** when Draft/Assigned |
| `src/App.tsx` | `editingJobFromCockpit` state + `JobFormModal` when editing from cockpit |

### Modals to scroll-lock (minimum set)
- `JobFormModal`, `InspectionItemModal`, `CompleteInspectionModal`, `Level3ReviewModal`, `ReportViewModal`, `EquipmentDeploymentModal`, `EquipmentIncidentModal`, Inspector/Equipment/Customer/Procedure create-edit overlays, `IncidentManagement` overlays, any `fixed inset-0 z-50` in `JobDetailView`.

Pattern: overlay root `overflow-hidden` (not `overflow-y-auto`); inner panel `max-h-[94vh] flex flex-col`; body `overflow-y-auto flex-1` only when needed.

---

## Slices

### Slice 0 — `useBodyScrollLock` + apply to JobFormModal (proof)
**Deliverable:** Hook works; Create Job modal no longer scrolls the Jobs list behind it.

- [ ] Create `useBodyScrollLock(locked: boolean)` — on true set `document.body.style.overflow = 'hidden'`; cleanup restore previous value; support nested modals via simple ref-count **or** document that only one modal at a time (prefer **ref-count** so stacked modals stay locked).
- [ ] `JobFormModal`: call hook when `isOpen`; change outer overlay from `overflow-y-auto` to `overflow-hidden`; keep inner content scroll.
- [ ] Verify manually: open Create Job, try scroll wheel on background — page stays put; tall wizard steps still scroll inside.

### Slice 1 — Roll scroll lock to remaining overlays
**Deliverable:** All listed modals use the hook + overlay `overflow-hidden` pattern.

- [ ] Apply to each file in the minimum set (batch PRs OK in one slice).
- [ ] Verify: open Inspection item modal from tech job; background locked.

### Slice 2 — `DateField` component
**Deliverable:** Shared control: text/button showing formatted date; opens month calendar; prev/next month; select day; optional clear if `clearable`; `min`/`max` optional unused for now unless trivial.

- [ ] Props: `value: string`, `onChange: (yyyyMmDd: string) => void`, `label?`, `required?`, `disabled?`, `clearable?`, `id?`, `className?`
- [ ] Display uses existing `formatDate` where helpful; storage always ISO date string
- [ ] Close on outside click / Escape
- [ ] Keyboard: open on Enter/Space from trigger; Esc closes
- [ ] Visual: slate-950 field, sky focus ring, emerald today marker optional, selected day sky fill
- [ ] Verify: Story not required; use in JobFormModal Step 1 only first

### Slice 3 — Wire DateField + job date copy
**Deliverable:** All `type="date"` in the three admin files replaced; Job wizard labels clarified.

- [ ] JobFormModal Step 1 labels:
  - **Inspection date (on site) \***  
  - **Due date — report / close-out (optional)**
- [ ] InspectorManagement: cert expiry, vision expiry (+ any other date inputs in that file)
- [ ] EquipmentManagement: calibration date / expiry
- [ ] Verify: pick custom due date → Save draft → reopen draft → due date still present (regression on draft persistence)

### Slice 4 — In-cockpit Edit job (Admin)
**Deliverable:** From Admin job cockpit on Draft/Assigned, **Continue setup** / **Edit job** opens wizard without going back to list.

- [ ] `JobDetailView` props: `onEditJob?: () => void` (or `onEditJob?: (job: Job) => void`)
- [ ] Show button when `userRole === 'admin'` && (`job.status === 'Draft' | 'Assigned'`)
  - Draft label: **Continue setup**
  - Assigned label: **Edit job**
- [ ] `App.tsx`: when Admin has `activeJob` and user clicks Edit → set `cockpitEditJob` to that job, render `JobFormModal` with `existingJob`; on close/save → `loadAllData` / `handleJobUpdated`, keep cockpit open on same `activeJobId` (refresh job from storage)
- [ ] Do **not** remove list-row Edit3 — keep both paths
- [ ] Verify: Admin → Jobs → open Draft row → Continue setup → change due date → Save draft → still in cockpit / list shows update without “must click pencil on list”

### Slice 5 — Ship gate
- [ ] `npx tsc --noEmit`; `npm run build`
- [ ] Grep: `Continue setup` / `DateField` / `useBodyScrollLock` present
- [ ] Write `docs/acceptance/SHIP-GATE-ui-polish-dates-modals-edit.md`

---

## Smoke script
1. Admin → Jobs → Create job → confirm background does not scroll; Step 1 shows new date labels + custom picker.  
2. Set due date via picker → Save draft → appears in list with that due date.  
3. Open that Draft (row click) → header **Continue setup** → wizard opens → Save → values stick.  
4. Tech/Admin open any other modal (item / report) → background locked.  
5. Equipment/Inspector date fields use same picker look.

---

## Risks
| Risk | Mitigation |
|------|------------|
| Nested modals unlock body early | Ref-count in hook |
| Native date used on mobile intentionally | Custom picker still fine on tablet Admin; ensure tap targets ≥40px |
| Cockpit edit loses `activeJob` after save | Re-read job by id after `onJobCreated` |
| Calendar z-index under modal | Popover `z-[60]` inside modal stacking context |

## Out of initiative
- Date range / multi-day inspection window field  
- Editing Completed jobs via wizard  
- New npm date libraries (unless blocked — then ask)  
- Tenancy / backend  

---

## HARD GATE
**Do not implement until user says “approve the plan” / “build” / “go” / “build it”.**
