# UX Spec — Job Creation Wizard

**Pack:** [NDT-PACK-job-creation-wizard.md](../packs/NDT-PACK-job-creation-wizard.md) (APPROVED)  
**Surface:** Admin · desktop/tablet denser OK · match existing slate/sky Admin UI  
**Status:** Ready for implementation plan

## Personas & goals

| Persona | Goal |
|---------|------|
| Admin | Create or finish a job without scrolling a wall of fields; only see relevant people/kit for the method; save incomplete work as Draft; Assign only when procedure + people + kit clear gates. |

**Jobs-to-be-done:** (1) Book work identity → (2) book people → (3) lock controlling procedure/scope → (4) confirm kit → (5) Draft or Assign.

---

## Shell (all steps)

- **Container:** Modal (reuse Job Form modal footprint) or full-width Admin panel — prefer **modal** to match create-job entry points (Jobs list, Dashboard, Dispatch).
- **Header:** Job number (read-only) · title “Create job” / “Edit draft” / “Edit job” · step indicator `1 Work · 2 People · 3 Procedure · 4 Equipment · 5 Review` (current step emphasized; completed steps tappable to jump **back** only, not skip ahead past incomplete required fields on forward path).
- **Footer:** `Back` (hidden on step 1 → Cancel) · **`Save draft`** (secondary, enabled once Step 1 valid — **visible on every step**, not only Review) · `Next` (steps 1–4) · on step 5: `Assign` (primary). `Cancel`/`X` closes with confirm if dirty.
- **Method change (step 1):** if people/procedure/equipment already chosen, confirm: “Changing method clears inspector, supervisor, procedure, and equipment.”
- **Forbidden:** Pass/Fail, findings, L3 controls anywhere in wizard.

---

## Key screens (ordered)

### Step 1 — Work
- **Purpose:** Establish who/where/what method/when.
- **Layout:** Customer select → site select (sites of customer only) → method chips (UT/MT/PT/VT) → inspection date · optional due date. Short hint under method: “People and equipment lists will match this method.”
- **Primary CTA:** Next (enabled when customer, site, method, inspection date set).
- **Secondary:** Cancel.
- **Forbidden:** Selecting people/kit here.
- **Empty/error:** No sites → “Add a site on the customer record” + disable Next.
- **Copy:** Title “Work”; labels plain (“Customer”, “Site”, “Method”, “Inspection date”, “Due date (optional)”).

### Step 2 — People
- **Purpose:** Assign lead for the method; if L1, assign supervisor on the same screen.
- **Layout:**
  1. Search input (“Search inspectors”) · list A–Z of **method-qualified** people only.
  2. Each row: name · `METHOD · Level` chip · status dot (green / amber / rose) · one-line reason · select control.
  3. Blocked rows: muted, not selectable, reason always visible (cert / vision / auth).
  4. After eligible L1 selected: **Supervisor** panel expands below (same search + A–Z list pattern, L2/L3 same method). Collapse/clear if lead changed to non-L1.
- **Primary CTA:** Next (lead required to proceed if aiming for Assign later — **allow Next without lead** so Draft path can skip; show amber banner “No lead yet — required before Assign”).
- **Secondary:** Back.
- **Forbidden:** Showing inspectors without the selected method; separate supervisor-only wizard page.
- **Copy:** Banner if L1: “Level 1 lead — select a Level 2 or 3 supervisor for this method.” Blocked example: “Near-vision acuity expired — renew before assignment.”

### Step 3 — Procedure & scope
- **Purpose:** Link Active WEP and confirm scope / standard.
- **Layout:** List Active procedures for method (search if many) · selected card highlighted · below: editable **Scope** and **Standard / specification** (prefilled from procedure; Admin may edit). Optional “Skip for now” text link for Draft (clears selection).
- **Primary CTA:** Next (always allowed for Draft; if none selected, amber hint “Procedure required before Assign”).
- **Secondary:** Back.
- **Forbidden:** Auto-ticking equipment on select; inventing procedures.
- **Empty:** “No Active {method} procedures — create one in L3 Procedures or save as Draft.”
- **Copy:** “Written examination procedure”; “Scope of inspection”; “Standard / specification”.

### Step 4 — Equipment
- **Purpose:** Confirm kit from register; honour procedure suggestions without auto-accept.
- **Layout:** Hint: “Showing {method} and General equipment.” Search · scrollable checklist. Suggested/WEP-matched rows: sky/amber **“From procedure”** chip + slight border emphasis — **unchecked by default**. Selected count in header (“2 selected”).
- **Row states:**
  | State | UI |
  |-------|-----|
  | Selectable, in-cal | Normal checkbox |
  | Due soon | Checkbox + amber “Cal due soon” |
  | Expired cal | Disabled + rose “Calibration expired” |
  | Out of Service | Disabled + rose “Out of service” |
  | Checked out | Disabled + rose “Checked out to job {jobNumber}” |
- **Primary CTA:** Next (allow with zero selected for Draft; amber “At least one equipment item required before Assign”).
- **Secondary:** Back.
- **Forbidden:** Pre-selecting procedure suggestions; showing other-method categories (except General).

### Step 5 — Review & release
- **Purpose:** Confirm story; Draft or Assign.
- **Layout:** Read-only summary blocks (Work / People / Procedure / Equipment) with “Edit” jump links to that step. Optional **General notes** textarea. If Assign blockers exist, list them in a rose panel above CTAs (procedure missing, no lead, L1 no supervisor, no equipment, blocked eligibility).
- **Primary CTA:** **Assign** (disabled while blockers listed; tooltip/list explains why).
- **Secondary:** **Save draft** (enabled when Step 1 complete). Cancel.
- **Forbidden:** Silent Assign with missing procedure/kit/people.
- **Copy:**
  - Draft success toast/alert: “Draft saved — finish assignment when ready.”
  - Assign success: “Job assigned.”
  - Assign blocked header: “Cannot assign yet”

---

## Entry & list behaviour (outside modal)

- **Jobs list / Dashboard / Dispatch:** “New job” opens wizard at step 1. Draft rows: badge **Draft** · open wizard resume (step with first incomplete section or Review).
- **Technician home / Dispatch open board:** **exclude Draft** (Admin-owned until Assign).
- **Edit Assigned+:** same wizard; title “Edit job”; Save draft only if status is still Draft; otherwise primary = **Save** (update) and Assign only when promoting Draft → Assigned.

---

## Motion / feedback (minimal)

- Step change: short fade/slide (150–200ms), no decorative motion.
- Selecting lead/supervisor/equipment: immediate row highlight (existing sky selected ring).
- Expanding supervisor panel: height expand, no bounce.
- Blocked row click: no action (optional brief shake unnecessary — rely on muted + reason).

---

## Colour tokens (existing)

- Eligible / OK → emerald  
- Warn (due soon, incomplete for Assign) → amber  
- Blocked / hard fail → rose  
- Selected / focus → sky  
- Draft badge → slate

---

## Open UX risks

- Long inspector lists on small laptop height → keep lists `max-h` + search mandatory.
- Admin may Next through empty People/Equipment and only discover blockers on Review — acceptable; blockers must be explicit on step 5.
- Editing in-progress jobs via wizard could confuse “Assign” label → use **Save changes** when status ≠ Draft.

## Handoff
Next: implementation plan (`writing-plans`) → user **approve / build**.
