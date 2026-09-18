# NDT Requirements Pack — Domain Freeze (FE + Seed → Backend Mold)

## Status
APPROVED by user — 2026-09-14  

Stress-test locks (NDT Principal Engineer recommendations accepted):
1. **Primary buyer focus:** single inspection-company ops demo until this freeze is complete (not multi-tenant sales shell).
2. **Backend timing:** Domain Freeze + golden path first; API only after.
3. **FE gap budget:** freeze with documented permissions/actors + procedure supersede clarity; no large new feature wave. Optional micro-FE only if golden path exposes a hole.

**Next (not this pack):** Backend v0 mirroring these entities → later tenancy/pricing wrapping them.

## Industry basis (summary)
- Standards/practice this freeze follows:
  - **ISO/IEC 17020** — work-order control, competence/authorization records, equipment with significant influence, inspection records, reports, document/record control concepts.
  - **ISO 9712** — method-scoped levels; L1 under written instruction + L2/L3 supervision; L2 evaluates; L3 technique/procedure authority; employer operating authorization (vision, authorization to work).
  - Employer written practice / ICNDT-style authorization retained by the employer (this product models employer file, not CB issuance).
- Employer-variable choices **locked for freeze**:
  - Methods in product: **UT, MT, PT, VT** only.
  - Stack until API: **frontend + seed/localStorage**.
  - Report delivery: L3-approved **or** Admin Final-without-L3 + reason (P0 pack).
  - Vision missing/expired / employerAuthorized false = assign hard-block; due soon = warn (P1 pack).
  - Assign requires Active procedure; Draft may omit (Job Creation Wizard pack).
  - Single-company demo identity until backend auth (role switcher is **demo only**).

## Scope lock
- **In:** Freeze the domain model as the contract for Backend v0; document invariants, state machines, permissions; golden-path demo script; procedure **Superseded** rules vs job snapshots; actor/permission matrix (even while UI uses role toggle).
- **Out:** Multi-tenant orgs, subscription plan limits, billing, real auth/SSO, email/SMS, new NDT methods (RT/ET/…), full QMS (complaints, internal audit, impartiality programme), inspector monitoring hours / continuity module.
- Personas (logical): Technician L1, Supervisor L2|L3 (same method), Admin, L3 QA Verifier, (future) System — mapped today via demo `UserRole` + job viewer role.

## Canonical entities (mold for Backend v0)

Source of truth in code: `src/types/index.ts` + seed (`seedData.ts`, `seedWorkshopRoster.ts`).

| Entity | Purpose | Key invariants |
|--------|---------|----------------|
| **Customer** / **Site** | Client + locations | Job references `customerId` + `siteId` |
| **Inspector** | Person in employer roster | Competence via **methodCertificates**; `level` / `certExpiryDate` are summaries |
| **MethodCertificate** | Employer-held method cert | Assign uses Verified + not expired + method match; Pending/Rejected block |
| **Equipment** | Apparatus | Unique id/serial; cal expiry; checkout state |
| **EquipmentIncident** | Defective/lost/etc. | Can quarantine kit (`Incident Reported` / Out of Service) |
| **NdtProcedure** (WEP) | Controlled written procedure | Status Draft \| Active \| **Superseded**; L3 approve to Active |
| **AcceptanceCriterion** | Library criteria | Linked into procedures; snapshot copies onto job |
| **Job** | Work order / inspection | Status machine below; optional Draft without lead |
| **InspectionItem** | Findings line | L1 immutable after submit; supervisor evaluates or rejects set |
| **ProcedureSnapshot** | Frozen WEP on job | Set on Assign (or first Start); field/PDF prefer snapshot over live WEP |
| **FindingsRevisionSnapshot** | Superseded findings history | Reject creates new revision; prior retained |
| **CompanySettings** | Single-tenant company profile | Becomes Org settings after tenancy |
| **AuditEntry** | Append-only trail on job (and related actions) | Actor name/role recorded (demo until auth) |

## Domain rules (normative — freeze)

### Competence & authorization
1. Assignment eligibility is **per method certificate** (+ vision + employerAuthorized), not `inspector.level` alone.
2. Vision missing/expired or `employerAuthorized === false` → **hard-block** assign; vision due soon → **warn**.
3. Supervisor for L1 must be L2/L3 **same method**, eligible cert/auth.

### Work order
4. Job statuses: `Draft` → `Assigned` → `In Progress` → (`Awaiting Supervisor` ↔ `Revision Required`) → `Completed` (+ L3 review fields).
5. **Draft:** requires customer, site, method, inspection date; may omit lead/procedure/equipment.
6. **Assign:** requires eligible lead (+ supervisor if L1), **Active** procedure, ≥1 selectable equipment; freeze **procedureSnapshot**.
7. Draft jobs are Admin-owned (not tech active queue / not dispatch open board).

### Findings & evaluation (ISO 9712)
8. L1 (or lead) captures findings; **no Pass/Fail ownership** for L1 evaluation of acceptance.
9. After L1 submit → `Awaiting Supervisor`; findings **immutable**.
10. Supervisor may **evaluate** item results or **reject with reason** → `Revision Required`; new findings revision **supersedes**; history retained.
11. Acceptance **Fail** ≠ supervision **Reject**.
12. Independent L2/L3 lead may complete without L1 supervision path where product already allows.
13. L3 QA review is **separate** from field supervision (`l3ReviewStatus`, signatures).
14. Constraint flags / out-of-range hints are **advisory only** — never auto-write Pass/Fail.

### Procedures (document control — freeze clarity)
15. Only **Active** procedures may be newly linked on Assign.
16. Approving a new revision: prior Active for same procedure identity should become **Superseded** (employer document control). Live register shows Active for new jobs.
17. Jobs already snapshotted **keep** their `procedureSnapshot`; they do **not** silently adopt a newer Active revision.
18. Editing live WEP after snapshot does not change in-progress/completed job criteria unless product explicitly replaces snapshot (audit `PROCEDURE_SNAPSHOT_REPLACE` — rare Admin/L3 action).

### Equipment
19. Kit with significant influence is identified on the job (`equipmentIds`).
20. Expired cal / Out of Service / checked out to another job → not selectable on assign; due soon → warn.
21. Incidents can remove kit from Available; prior-job impact review is **deferred** (non-goal for freeze).

### Records & delivery
22. Job `auditTrail` is append-only for significant actions.
23. Mark delivered only if L3 **APPROVED** or Admin **finalWithoutL3** + reason.
24. Audit pack / PDF must not present Pending as Pass.

## State machine (Job — summary)

| From | Actor | Action | To | Side effects |
|------|-------|--------|-----|--------------|
| (new) | Admin | Save draft | Draft | Optional incomplete resources |
| Draft / new | Admin | Assign | Assigned | Snapshot WEP; eligibility gates |
| Assigned | Lead | Start work | In Progress | Snapshot if missing |
| In Progress | L1 lead | Submit findings | Awaiting Supervisor | Lock findings |
| In Progress | L2+ lead | Complete & sign | Completed | Field complete |
| Awaiting Supervisor | Supervisor | Evaluate all + sign | Completed | Co-sign |
| Awaiting Supervisor | Supervisor | Reject | Revision Required | Reason required; history |
| Revision Required | L1 | Resubmit | Awaiting Supervisor | New revision |
| Completed | L3 | Approve / Reject | (l3 fields) | Delivery gate |
| * | Admin | Final without L3 | (flag) | Reason; not a fake L3 approve |

## Permissions matrix (logical actors — freeze for Backend auth)

Demo UI may use role switcher; **Backend v0 must implement this matrix**, not the toggle.

| Actor | Draft/Assign jobs | Edit findings (open) | Submit L1 | Evaluate / Reject | L3 review | Manage WEP | Manage roster/kit | Mark delivered |
|-------|-------------------|----------------------|-----------|-------------------|-----------|------------|-------------------|----------------|
| Admin | Yes | Via admin cockpit as today | Demo | No (not field eval) | No | Yes | Yes | Yes (gates) |
| Lead L1 | No | Yes until submit | Yes | No | No | No | No | No |
| Supervisor | No | No (immutable) | No | Yes on supervised jobs | No | No | No | No |
| Lead L2+ | No | Own jobs | N/A path | Own eval if product path | No | No | No | No |
| L3 QA | No | No | No | No | Yes | Approve/author | No* | No |

\*L3 may manage procedures; roster/kit remain Admin unless employer practice says otherwise (locked: Admin).

**Demo caveat:** Header role switcher is **not** security. Domain Freeze treats it as a preview of personas only.

## Data / audit
- Immutable after: L1 submit (findings); procedureSnapshot after freeze (unless explicit replace).
- Supersede: findings revisions; procedure Active→Superseded for register (jobs keep snapshots).
- Required on reject: reason + actor.
- Backend mold: persist entities as typed today; add `organizationId` **only** in tenancy phase (not now).

## Certificate / report
- Signatories: lead (+ supervisor if L1) + L3 when approved.
- Never show Pending items as Pass on certificate/PDF.
- Delivery commercial gate separate from technical approval.

## Golden path (must pass on Reset demo before Backend v0)

1. Reset demo.  
2. Admin: open Draft or Create job wizard → Save draft → Assign with Active WEP + eligible lead + kit.  
3. Tech (L1 or L2 per seed story): capture items → submit/complete per level rules.  
4. If L1: supervisor queue → evaluate or reject→resubmit→complete.  
5. L3: review → approve.  
6. Admin: mark delivered (or Final without L3 path once).  
7. Export audit pack / PDF — snapshot procedure & kit visible; Pending ≠ Pass.

**Freeze exit criteria:** golden path walked once without domain contradiction; this pack APPROVED; types unchanged except bugfixes.

## Optional micro-FE (only if golden path fails)

| ID | If broken | Fix |
|----|-----------|-----|
| F1 | Supersede unclear in UI | When activating new WEP revision, auto-mark previous Active same `procedureNumber` as Superseded + banner on job “using snapshot Rev X” |
| F2 | Actor confusion | Small banner: “Demo role switcher — not access control” on Header |

No other FE features in this initiative.

## Explicit non-goals
- Tenancy, seats, plan limits, pricing UI  
- Real authentication / RBAC enforcement in FE  
- Backend/API (until freeze exit)  
- RT/ET/UTPA/… methods  
- Full ISO 17020 QMS (complaints, internal audit, impartiality records)  
- Defective-equipment prior-job mass review workflow  
- Offline sync / multi-device conflict resolution  

## Open risks (accepted)
- localStorage single-browser is not multi-user proof — acceptable until API.  
- Role switcher can confuse buyers — mitigated by F2 if needed.  
- Seed dates are demo-relative — Reset required after storage key bumps.

## Handoff
1. User walks **golden path** (above) and notes friction.  
2. If F1/F2 needed → short plan → build → `ndt-ship-gate`.  
3. Else → Backend v0 initiative: OpenAPI/DB schema **1:1** with frozen entities.  
4. Tenancy initiative **after** Backend v0 persists single-tenant successfully.

Do not start tenancy or backend coding from this pack alone without golden-path confirmation.
