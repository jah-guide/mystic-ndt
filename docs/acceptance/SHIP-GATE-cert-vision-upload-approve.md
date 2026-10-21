# Acceptance — Inspector cert & vision upload / approve

## Domain rules checked
- Active `Verified` method cert + active vision expiry drive assign gates.
- Employee upload creates `pendingSubmission` without flipping active Verified → Pending.
- Admin approve copies confirmed expiry into active fields and clears pending.
- Admin reject clears pending only (active Verified unchanged); reason required.

## Demo path
1. Tech persona (Lesego) → **Certs** tab → upload renewal on a due-soon method → amber “Pending Admin”.
2. Admin → Renewals → People → Pending / rejected → open Mandla (UT pending) or Chris (vision pending).
3. Inspector detail registrar → **Reject** with reason → pending cleared; active expiry unchanged.
4. Tech re-uploads → Admin **Verify** → confirm expiry (edit if needed) → Approve.
5. Assign gates use confirmed expiry; dual-state seed demos still assignable when active Verified is valid.

## Seed demos (ndt_inspectors_v8)
- Mandla (`insp-8`): Verified UT due-soon + pending renewal submission.
- Chris (`insp-14`): expired vision + pending vision renewal (assign remains blocked until approve).

## Helper smoke (automated)

```bash
npx tsx scripts/smoke-cert-submissions.mjs
```

Expect: `cert-vision acceptance smoke: PASS`
