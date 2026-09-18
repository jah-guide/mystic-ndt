# Ship Gate — Micro-FE (Demo sign, F2 banner, Start work)

**Date:** 2026-09-17  
**Pack:** `docs/packs/NDT-PACK-domain-freeze.md` (optional micro-FE F2 + Start work fidelity)  
**Follows:** `docs/acceptance/GOLDEN-PATH-domain-freeze-2026-09-17.md` holes

## Verdict
PASS

## Checklist
| Item | Result | Evidence |
|------|--------|----------|
| **Use demo signature** on SignaturePad | PASS | `SignaturePad.tsx` — Scribble + enables submit CTAs |
| F2 banner: demo ≠ access control | PASS | `Header.tsx` amber banner under chrome |
| **Start work** CTA (Assigned → In Progress) | PASS | `canStartWork` + panel in `JobDetailView` |
| Findings gated until In Progress | PASS | `canEditFindings` / `canSubmitAsL1` no longer allow Assigned |
| Mark delivered → **Delivered** chip | PASS | `ReportViewModal.tsx` disabled after send |
| tsc/build | PASS | exit 0 |

## How you test
1. Reset demo → note amber **Demo role switcher — not access control** under header.
2. Tech Lesego → open Assigned job (e.g. NDT-2026-0003) → see **Start work**; Add Item hidden until Start.
3. Start work → Add Item → Submit → **Use demo signature** → Sign & Submit.
4. Thabo → evaluate → Complete → demo signature.
5. L3 → Sign-Off → demo signature → Certify.
6. Admin → PDF → Mark delivered → button becomes **Delivered**.

## Deferred
- F1 WEP supersede UX (separate if needed)
- Real auth (Backend)
