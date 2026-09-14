# Spec: supervisor-home — Supervisor queue

## Objective
Give supervising L2/L3 a first-class home: jobs waiting for evaluation (`Awaiting Supervisor`) and awareness of `Revision Required`, with one-tap open into existing JobDetailView (immutability rules unchanged).

## Traceability
- Pack rules 5–9, shared 1–4
- Map module `supervisor-home`

## Success criteria
- When demo persona is a supervisor (e.g. Thabo `insp-1`) under technician role: primary nav/landing shows **Supervisor** queue (or clear tab: My jobs | To supervise)
- Primary list: `supervisorId === currentInspectorId && status === 'Awaiting Supervisor'`
- Secondary section: same supervisor + `Revision Required`
- Row: job number, method, customer/site if available, lead name, status, submitted/updated time
- CTA opens existing JobDetailView — evaluate / reject / complete only via current paths
- Empty states with clear copy
- Header demo script can mention Supervisor home

## In scope / Out of scope
- **In:** TechnicianDashboard (or new `SupervisorHome.tsx` composed into it), queue UI, seed ≥1 awaiting-supervisor job if missing
- **Out:** New evaluation UI; real auth; Admin-wide “all supervisors” board (Wave B dispatch)

## Data & state
No new job fields required. Uses existing `supervisorId`, `status`, timestamps (`updatedAt` / submit fields as available).

## Permissions
- Viewer is demo `currentInspectorId`; only jobs where they are supervisor
- Does not grant evaluate on jobs they don’t supervise

## Tech constraints
- Match existing dark slate / sky patterns
- Mobile-first list; sticky or clear primary CTA per row

## Boundaries
- Always: findings remain immutable after submit in JobDetailView
- Ask first: changing JobStatus enum
- Never: supervisor edit of L1 readings from the home screen

## Open questions
None.
