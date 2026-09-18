# Golden Path Walk — Domain Freeze (FE + Seed)

**Date:** 2026-09-17  
**Pack:** `docs/packs/NDT-PACK-domain-freeze.md`  
**Method:** Live browser at `http://localhost:5173/` after Reset demo  
**Job exercised:** `NDT-2026-0006` (seed Draft → full lifecycle)

## Orchestration
Using the NDT Product Pipeline · Running NDT Ship Gate (verifier voice) · Acceptance Verifier · Principal / UX / Product-UI notes below.

## Verdict
**CONDITIONAL PASS for Domain Freeze exit** — core golden path is reachable end-to-end on FE+seed.  
**Not a clean Ship Gate PASS** for “signature gestures alone” — L1 submit / supervisor complete / L3 certify all correctly **require** a real signature; browser automation could not drive the canvas, so those three transitions were completed via a documented localStorage harness **after** verifying the CTAs and disabled states.

---

## Checklist (Domain Freeze golden path)

| Step | Result | Evidence |
|------|--------|----------|
| 1. Reset demo | PASS | Header **Reset demo** (confirm overridden for automation) |
| 2a. Admin Draft / Continue setup | PASS | Jobs → Draft filter → open `NDT-2026-0006` → **Continue setup** |
| 2b. Wizard → Assign | PASS | Lesego L1 + Thabo supervisor + WEP-UT-001 + Olympus 27MG + cal block → **Assign** → status Assigned; CTA becomes **Edit job** |
| 2c. Procedure snapshot on assign | PASS | Audit: “Frozen WEP WEP-UT-001 Rev 3 on assign”; `procedureSnapshot` present |
| 3. Tech L1 findings (no Pass/Fail) | PASS | Add item modal: findings-only copy; item saved **Pending** |
| 3b. Implicit Assigned→In Progress | NOTE | No separate **Start work** CTA; first item add advances status (code in `JobDetailView`) |
| 4. L1 Submit to Supervisor | PARTIAL | Modal + disabled **Sign & Submit** without signature; canvas gesture not automatable → harness submit |
| 4b. Findings immutability | PASS | After submit, L1 copy: “Findings locked — assigned supervisor evaluates…” |
| 5. Supervisor evaluate | PASS | Thabo: **PASS** + **Save Evaluation** on Weld 001 |
| 5b. Supervisor Sign & Complete | PARTIAL | Modal + signature required; harness complete → `Completed` / `PASS` |
| 6. L3 review → approve | PARTIAL | **Perform L3 Sign-Off** → Approve path; CTA requires signature (alert); harness → `l3ReviewStatus=APPROVED`; Pending 2→1 / Certified 1→2 |
| 7. Admin mark delivered | PASS | Report modal **Mark delivered** → header shows **Sent 17 Sept 2026** |
| 7b. Export audit pack / PDF | PASS | **Export audit pack** + **Download Certificate** CTAs present on L3-approved report; certificate title **Inspection Report Certificate** |

---

## Holes / friction (ranked)

### P0 — blocks clean buyer demo / freeze confidence
1. **Signature pad is gesture-only** — no keyboard / “Apply demo signature” affordance. Automation (and clumsy buyers on trackpads) can stall at every sign-off. *Product-UI recommendation:* optional **Use demo signature** under role switcher / demo mode only.

### P1 — domain / freeze clarity (optional micro-FE)
2. **No explicit Start work** — Assigned jobs accept findings immediately; status flips on first save. Freeze table lists Lead → Start → In Progress. *Principal:* either document as intentional “start on first item” or add a Start CTA for freeze fidelity.  
3. **F2 missing** — no “Demo role switcher — not access control” banner (`NDT-PACK-domain-freeze` optional micro-FE).  
4. **F1 not verified** — WEP Active→Superseded UX when approving a new revision not walked this session.

### P2 — UX polish
5. **Jobs list row** — Draft/job open relies on clicking job number cell; weak a11y (few list semantics beyond Edit/Delete).  
6. **Continue setup** can sit under sticky header overlap on small viewports (first click intercepted).  
7. **Mark delivered** remains clickable after sent (re-mark?). Prefer “Delivered” chip + disabled or “Mark again”.  
8. **REP-PREVIEW** report number on certificate — fine for demo; looks unfinished for screenshots.  
9. Seed **inspection dates** on older jobs are mid-September while “today” in walk was 17 Sept — date rules on *new* picks are correct; historical seed can look “past”.

### Explicit non-holes (working as designed)
- Vision/cert hard-blocks on People step (expired/pending disabled).  
- L1 cannot set Pass/Fail; supervisor evaluates.  
- Draft excluded from tech active misuse for this path; Assign gates Active WEP + kit.  
- Delivery unlocked only after L3 approve (Mark delivered available post-approve).

---

## Skill voices (short)

### NDT Principal Engineer
Industry path held: method cert eligibility, L1 findings vs L2 evaluation, snapshot on assign, L3 separate from field complete, delivery after technical approval. Residual domain gap vs freeze text: **Start work** transition is implicit. Accept for FE freeze if documented; otherwise F0 micro-FE Start button.

### NDT UX Designer (field)
L1 → Submit → Supervisor evaluate → Reject/Complete flow is permission-visible and clear. Signature is the only hard friction for field completion.

### NDT Product UI/UX (Admin)
Wizard + in-cockpit **Continue setup / Edit job** worked. Date rules (today+) visible. Improve list open affordance and demo signature for walkthroughs.

### Full-Stack Principal
No code changes this session. If user wants next build: (1) demo signature helper, (2) optional Start work CTA, (3) F2 header banner — then re-run ship gate without harness.

### Acceptance Verifier / Ship Gate
| Item | Result |
|------|--------|
| Pack golden path CTAs reachable | PASS |
| End-state job coherent | PASS (`Completed` / `PASS` / L3 `APPROVED` / delivered / snapshot / audit length 10) |
| Pure UI-only transitions for all signatures | FAIL (harness) |
| Freeze exit recommendation | **OK to proceed to Backend v0 mold** after user acknowledges signature + Start-work notes; or ship F2 + demo-sign first |

---

## How you re-test (human, no harness)
1. Reset demo → Admin → Draft `NDT-2026-0006` → Continue setup → Assign (Lesego + Thabo + WEP + kit).  
2. Tech Lesego → open job → add one item → **sign** → Submit.  
3. Tech Thabo → evaluate Pass → **sign** → Complete.  
4. L3 → Sign-Off → **sign** → Certify.  
5. Admin → PDF → Mark delivered → Export audit pack.

## Deferred (already pack Out of scope)
Backend, real auth, tenancy, email/SMS, RT/ET, full QMS.
