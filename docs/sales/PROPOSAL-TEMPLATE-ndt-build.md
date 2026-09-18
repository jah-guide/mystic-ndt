# Proposal — NDT Inspection Workflow System  
**Client:** [Company name]  
**Prepared by:** [Your name / trading name]  
**Date:** [YYYY-MM-DD]  
**Valid for:** 30 days  

---

## 1. What you saw (the demo)

You were shown a **high-fidelity frontend workflow prototype** of an NDT field inspection system (job assign → field capture → supervision → Level 3 certification → report/PDF).

**Important:** The demo runs in the browser with sample data. It is **not** multi-user production software (no real login, no shared company database, no email dispatch). It exists to validate **your** process before we build the real system.

---

## 2. Discovery outcome (what we locked for you)

| Topic | Your practice (fill after demo) |
|--------|----------------------------------|
| Methods in scope | e.g. UT / MT / PT / VT |
| Who leads jobs | e.g. L1 + supervisor / L2 independent |
| Written procedure (WEP) | Required on every job? Y/N |
| Who evaluates Pass/Fail | Supervisor L2+ / lead L2+ |
| Who certifies the report | Level 3 QA / other |
| Sites / inspectors (approx.) | |
| Must-have report fields | e.g. scope, as-found surface, °C, light |
| Must-not / out of scope for v1 | e.g. RT, offline sync, billing portal |

*(Attach or link your Requirements Pack / notes from the demo call.)*

---

## 3. What we will build (v1 production)

**In scope**

- Secure multi-user application for **your company only** (single tenant)
- Real authentication and role permissions (Admin / Technician / Supervisor / L3)
- Workflow matching the locked rules above (jobs, findings, supervision, L3, PDF/certificate)
- Admin: customers, sites, inspectors, equipment, procedures, dispatch/renewals as agreed
- Hosted deployment (URL) + basic backup
- Handover: short admin + field user guide; 1 training session ([X] hours)

**Out of scope (unless quoted separately)**

- Multi-company / marketplace SaaS “plans”
- Methods beyond those listed above
- Full ISO/IEC 17020 QMS (complaints, impartiality programme, internal audit)
- Email/SMS gateways, accounting/ERP integration
- Native mobile app stores (responsive web is included)
- Unlimited redesign after scope sign-off

---

## 4. Timeline

| Phase | Duration | Deliverable |
|--------|----------|-------------|
| Kickoff & data setup | [e.g. Week 1] | Branding, roster/kit/procedure import plan |
| Build | [e.g. Weeks 2–6] | Working system on staging |
| UAT with your team | [e.g. Week 7] | Fixes from agreed test script |
| Go-live | [e.g. Week 8] | Production URL + training |

**Target go-live:** [date] *(depends on deposit date and timely client feedback)*

---

## 5. Investment

| Item | Amount (ZAR / currency) |
|------|-------------------------|
| **Fixed build fee (v1)** | **R [XXXX]** |
| Deposit to start (50%) | R [XXXX] |
| Balance on go-live (50%) | R [XXXX] |
| **Monthly retainer** (from go-live) | **R [XXX] / month** |

**Retainer includes:** hosting, uptime monitoring, backups, email support for defects, minor text/config tweaks (fair use, [e.g. ≤ 4 hours]/month).

**Not included in retainer:** new features, new methods, integrations, redesigns — quoted as change requests.

---

## 6. How we work together

1. You sign this proposal (or issue a PO) and pay the **50% deposit**.  
2. We freeze scope to Section 2–3. Changes after freeze = written change order + fee/time.  
3. You provide logos, inspector/equipment lists, and procedure samples within [5] business days of kickoff.  
4. You nominate one product owner for decisions (max [2] business day response).  
5. On go-live acceptance, you pay the **balance**; retainer invoiced monthly in advance.

---

## 7. Acceptance

Go-live is accepted when:

- Named roles can complete the **agreed golden path** on production data (or agreed pilot jobs), and  
- Critical defects from UAT are fixed or scheduled in writing.

Minor polish items may roll into the first retainer month by agreement.

---

## 8. Commercial terms (short)

- Demo and discovery materials remain illustrative until v1 is built.  
- Source / IP: [choose one and delete the other]  
  - *Work product licensed to Client for internal use; vendor retains reusable framework.*  
  - *or* *Client owns custom work product on full payment; vendor retains pre-existing tools/libraries.*  
- Either party may pause if invoices are overdue > [14] days.  
- Either party may terminate with [30] days’ notice after go-live; deposit is non-refundable once build has started; unused retainer is not refunded.

---

## 9. Sign-off

| | Client | Vendor |
|--|--------|--------|
| Name | | |
| Signature | | |
| Date | | |

**Next step:** Return signed copy + pay deposit to [bank / payment link]. Kickoff within [3] business days of cleared funds.

---

### Internal note (delete before sending)

- Do **not** promise multi-tenant “plans” in this proposal.  
- Price the **build** for their rules; retainer is keep-alive, not SaaS seats.  
- Attach golden-path checklist from `docs/acceptance/` adapted to their methods.
