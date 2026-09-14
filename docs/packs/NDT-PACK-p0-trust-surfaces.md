# NDT Requirements Pack — P0 Trust Surfaces (Wave A)

## Status
APPROVED by user — 2026-09-13  
Wave: **A = P0 only**. Wave B (P1: dispatch, renewals hub, vision/authorization) is **deferred** — separate pack later.  
Orchestration: `ndt-spec-driven-delivery` (Spec → Plan → user approves plan → build). **Do not code until Spec/Plan gates pass.**

## Industry basis (summary)
- Standards/practice: ISO 9712 (L1 capture vs L2/L3 evaluation/supervision); employer written practice / controlled procedures; ISO/SANS 17020-style records & traceability for inspection bodies.
- Employer-variable choices **locked by user**:
  1. **Report delivery gate:** Mark delivered only when **L3-approved** OR Admin marks **Final without L3** with mandatory reason.
  2. **Vision/authorization on assign:** Hard-block if vision expired; warn if due soon — **deferred to Wave B** (not implemented in P0).
  3. **Procedure snapshot timing:** Freeze WEP + acceptance criteria on **Assign**, or on **first Start** if job still Draft.

## Scope lock
- Stack: **frontend + seed/localStorage only** (no backend, auth, email SMTP, billing)
- Methods in scope: existing UT / MT / PT / VT
- Personas: Technician L1, Supervisor L2|L3 (same method), Admin, L3 QA Verifier
- Features in this pack (P0):
  1. **Supervisor home** — first-class queue for work awaiting supervisor
  2. **Job procedure snapshot** — freeze WEP + criteria on assign / first start
  3. **Audit pack export** — evidence bundle for completed / final jobs

## Domain rules (normative)

### Shared (protect existing)
1. Competence for assignment remains **per-method certificate** (verified + not expired + level rules). `inspector.level` is summary only.
2. L1 findings are **immutable after submit**. Supervisor may **evaluate** (Pass/Fail/N/A) or **reject with reason** only — never silently edit readings/photos/notes.
3. Acceptance Fail ≠ supervision Reject.
4. L3 report review remains **separate** from field supervision/evaluation.

### Supervisor home
5. Supervisor home is the primary landing surface for the supervising persona when acting as supervisor (role/demo switch or job viewer role).
6. Queue includes jobs where the current user is `supervisorId` and status is **`Awaiting Supervisor`** (primary). Also list **`Revision Required`** jobs they supervise (secondary — awareness that L1 is fixing).
7. Each row shows at minimum: job number, method, site/customer (if available), L1/lead name, status, time in queue (or submitted/updated timestamp).
8. Primary CTA: **Open job** → existing JobDetailView supervision path (evaluate / reject / complete). No alternate evaluation UI that bypasses immutability rules.
9. Empty state: clear copy + no inventing jobs.

### Procedure snapshot
10. When a job is **Assigned** (transition into Assigned) with a linked procedure: copy onto the job a **procedureSnapshot** including at least: procedure id, revision/version, title, method, acceptance criteria (structured copy), key process limits already used by the app (e.g. temp range if present), snapshotAt, snapshotByRole.
11. If job is still **Draft** and has no snapshot: freeze on **first Start** (enter In Progress) if a procedure is linked.
12. After freeze: field UI, validation advisories, and PDF/report **read snapshot**, not live procedure document.
13. Changing procedure after freeze requires explicit Admin (or L3) action **Replace procedure revision** with mandatory reason + audit event; creates a **new** snapshot (retain prior snapshot in audit/history if feasible; minimum: audit log entry of old revision → new revision).
14. Jobs without a procedure: allowed only if product already allows it; if no procedure, snapshot is null and UI shows “No procedure linked” (no fake criteria).

### Audit pack export
15. Available on jobs that are **`Completed`**, and preferably after **L3 approved** when L3 is in play. Admin may export Completed jobs; label pack as **DRAFT/field-complete** vs **Final** consistently with report watermark rules already in product.
16. **Export audit pack** produces a downloadable evidence set (frontend-only): at minimum (a) certificate/report PDF as currently generated, (b) human-readable summary of current findings + superseded findings / reject reasons if present, (c) equipment used with cal expiry, (d) lead + supervisor method cert summary for job method, (e) procedure snapshot reference (revision/title/criteria summary), (f) key audit trail events. Implementation may be multi-PDF, print HTML, or client-side ZIP if practical without new backend.
17. Pack must **not** show Pending items as Pass. Advisory constraint flags ≠ evaluated result.

### Report delivery (rules locked now; UI may be thin in P0)
18. **Mark delivered** only if: report/job is **L3-approved**, OR Admin has set **finalWithoutL3 = true** with **finalWithoutL3Reason** (mandatory).
19. Delivery record stores: recipient, channel (e.g. Email mock / Handed over / Other), deliveredAt, recordedBy. Audit event required.
20. Full “delivery inbox” UX is optional in P0; minimum is gate + fields + status chip on report/job if delivery UI is touched. If delivery UI is deferred inside P0, still implement the **gate fields on the job/report model** so Wave B/commercial work does not re-litigate rules. Prefer a minimal Mark delivered control on Report view when Final.

## State machine
- Existing states remain: Draft → Assigned → In Progress → Awaiting Supervisor → Revision Required → Completed (+ L3 review states as today).
- Transitions (P0-relevant):
  - Admin/system → **Assign** → Draft/… → **Assigned**: create/update **procedureSnapshot** if procedure linked.
  - Lead → **Start** → → **In Progress**: if snapshot missing and procedure linked → create snapshot.
  - L1 → **Submit** → In Progress → **Awaiting Supervisor**: job appears on Supervisor home.
  - Supervisor → **Reject** → Awaiting Supervisor → **Revision Required**: reason required; L1 notified via existing banner/path; job visible on supervisor secondary list.
  - Supervisor → **Complete** → → **Completed**: eligible for audit pack (field-complete).
  - L3 → **Approve** → Final certificate path; delivery gate opens; audit pack labeled Final when applicable.
  - Admin → **Final without L3** (reason) → delivery gate opens without L3 approve.
  - Authorized role → **Mark delivered** (only if gate open) → delivery record + audit.
  - Authorized role → **Export audit pack** → download only (no state change required).

## Permissions matrix

| Actor | View findings | Edit findings | Evaluate | Reject | Complete field | L3 approve | Export audit pack | Mark delivered | Replace procedure snapshot |
|-------|---------------|---------------|----------|--------|----------------|------------|-------------------|----------------|----------------------------|
| L1 lead | Yes (own) | Yes only before submit / after reject on new set | No | No | No | No | No | No | No |
| Supervisor | Yes (supervised) | No after submit | Yes | Yes + reason | Yes when evaluated | No | Yes (supervised jobs) | No | No |
| Admin | Yes | No (use existing admin powers only as today) | No* | No* | No* | No | Yes | Yes if gate open | Yes + reason |
| L3 QA | Yes (review queue) | No | No | No (L3 reject path as today) | No | Yes | Yes | Yes if L3-approved path | Yes + reason |

\*Unless existing product already grants Admin field actions — do not expand Admin into silent findings editor.

## Data / audit
- Immutable after L1 submit: findings set (existing rule).
- Supersede: reject → L1 new findings set; retain prior (existing).
- Reject: mandatory reason (existing).
- **procedureSnapshot** on Job (new): structured copy; source of truth for criteria after freeze.
- **finalWithoutL3** + **finalWithoutL3Reason** (new, optional fields).
- **delivery** record (new, optional): recipient, channel, deliveredAt, recordedBy.
- Audit trail entries for: snapshot created/replaced, finalWithoutL3, mark delivered, audit pack exported (optional log).

## Certificate / report
- Signatories: unchanged (L1 + supervisor + L3 as today).
- PDF/criteria text must use **procedureSnapshot** when present.
- Never show Pending as Pass; advisory flags ≠ Pass/Fail.
- Watermark/DRAFT behavior: keep existing until L3 approved (or Admin final-without-L3 if product treats that as Final — if so, document in implementation; default: Final without L3 allows delivery but PDF Final treatment follows existing L3 watermark rules unless pack amended).

## Seed / demo story
1. Reset demo.
2. As Supervisor (e.g. Thabo): open **Supervisor home** → see ≥1 `Awaiting Supervisor` job (seed or create via L1 submit path).
3. Open job → evaluate or reject with reason → confirm queue updates.
4. Assign new job with procedure → confirm snapshot revision shown on job/report; edit live procedure → old job criteria unchanged.
5. Complete + (L3 approve or Admin final-without-L3) → **Export audit pack** → download opens; optional Mark delivered when gate open.

## Explicit non-goals (Wave A)
- Backend, real email, customer portal, PWA sync
- Dispatch board, renewals hub, vision/authorization hard-block (Wave B)
- New NDT methods (RT/ET/PAUT)
- Billing / pricing UI
- Replacing JobDetailView supervision logic (home is a queue, not a second evaluator)

## Open risks (accepted)
- Frontend-only “ZIP” may be multi-file download or print bundle if ZIP libs are heavy — acceptable if contents meet rule 16.
- Demo role switcher remains; Supervisor home keyed off supervisorId + demo persona, not real auth.
- Final-without-L3 vs PDF watermark edge case may need a one-line product decision during Spec if ambiguous in code.

## Wave B preview (not in this pack)
- Dispatch board, cert/cal renewals hub, vision/employer authorization hard-block + due-soon warn (locks already chosen).

## Next gate (orchestration)
1. Spec-Driven: **Capability map** for modules `supervisor-home` | `procedure-snapshot` | `audit-pack-export` (+ thin `report-delivery-gate` if split).
2. Module specs → Implementation plan/tasks.
3. **User approves plan** → Full-Stack builds one module at a time → Acceptance verifier.
