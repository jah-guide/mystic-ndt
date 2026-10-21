# Oct 22 Seed Data — ship notes

Regenerated demo seed for a general walkthrough (Admin → Tech → L3) with ~50 jobs over ~90 days.

## What changed

- Certs/cals/vision and job dates are **relative to today** (`seedDateUtils.ts`).
- Roster: 8 customers (added Anglo Waterval + Transnet Pipelines), inspectors/equipment at ~70% valid / ~20% due soon / ~10% expired.
- Jobs: curated scenarios + deterministic bulk history (`seedJobs.ts` → `buildSeedJobs()`).
- Storage keys bumped so demo browsers auto-refresh: `ndt_customers_v4`, `ndt_inspectors_v7`, `ndt_equipment_v5`, `ndt_jobs_v11`, `ndt_incidents_v2`.

## Demo cast (always valid)

- Lesego `insp-4`, Thabo `insp-1`, Johan L3 `insp-l3-1`
- Happy-path gear: `eq-1` (UT), `eq-2` (MT On Job for job-2)

## Gate fodder (blocked assign)

- Pieter `insp-3` expired cert · Chris `insp-14` expired vision · Lindiwe `insp-13` missing vision · Kabelo `insp-6` expired
- Expired cal: `eq-5`, `eq-9`, `eq-12`, … · Incident lockout: `eq-3`

## After deploy

Hard refresh is enough (key bump). Or **Reset Demo Data**. Default inspector remains Lesego (`insp-4`).
