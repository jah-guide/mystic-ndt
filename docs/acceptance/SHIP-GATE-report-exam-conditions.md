# SHIP-GATE — Examination conditions ownership

Pack: `docs/packs/NDT-PACK-exam-conditions-ownership.md` (APPROVED 2026-09-18)

## Acceptance

- [ ] Job wizard Procedure: scope + standard + WEP + **optional prep instruction only** (no as-found surface/temp/light required at Assign)
- [ ] Assign succeeds without as-found surface / measured °C / light
- [ ] Seed Assigned job (`job-3`) has empty as-found; optional prep instruction only
- [ ] After **Start work**, lead can record as-found surface, numeric °C (unit fixed), light
- [ ] VT/MT: ambient light required before L1 submit / complete; UT optional
- [ ] Supervisor cannot silently edit exam conditions (view only)
- [ ] PDF: Temp from `temperatureC` as `{n}°C`; surface “Not recorded” if empty; no fake Lux; prep instruction **not** on certificate face
- [ ] `npm run build` clean

## Demo walkthrough

1. Admin: open Assigned UT `NDT-2026-0003` — as-found empty; prep instruction visible.
2. Tech (Lesego): Start work → Record as-found conditions (surface + °C) → add item → submit (blocked until conditions saved).
3. MT In Progress `NDT-2026-0002`: light present; complete path not blocked for light.
4. Generate draft PDF — conditions match recorded values only.
