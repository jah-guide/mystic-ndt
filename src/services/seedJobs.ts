/**
 * Demo job seed: curated walkthrough scenarios + deterministic bulk history.
 * All dates are relative to "today" so dispatch / overdue / L3 queues stay correct.
 */
import { Job, NdtMethod, InspectionItem } from '../types';
import {
  daysFromToday,
  isoDateTime,
  startOfWeekMonday,
  todayISO,
  addDays,
  SEED_OFFSETS,
} from './seedDateUtils';

const sampleWeldPhoto1 =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" fill="%231e293b"/><path d="M50 150 L350 150" stroke="%23f59e0b" stroke-width="12" stroke-linecap="round"/><circle cx="200" cy="150" r="30" fill="none" stroke="%2338bdf8" stroke-width="4"/><text x="200" y="240" font-family="sans-serif" font-size="16" fill="%2394a3b8" text-anchor="middle">Weld 001 - UT Scan Zone</text></svg>';
const sampleWeldPhoto2 =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" fill="%231e293b"/><path d="M50 150 L350 150" stroke="%23ef4444" stroke-width="12" stroke-linecap="round"/><path d="M190 140 L210 160 M210 140 L190 160" stroke="%23ef4444" stroke-width="5"/><circle cx="200" cy="150" r="25" fill="none" stroke="%23ef4444" stroke-width="3" stroke-dasharray="4,4"/><text x="200" y="240" font-family="sans-serif" font-size="16" fill="%23f87171" text-anchor="middle">Weld 002 - Defect: Lack of Fusion</text></svg>';

const SIG_L2 =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="260" height="80" viewBox="0 0 260 80"><path d="M 20,40 Q 50,10 80,45 T 140,35 Q 180,60 220,30 Q 240,40 250,20" fill="none" stroke="%230284c7" stroke-width="3" stroke-linecap="round"/></svg>';
const SIG_L3 =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="260" height="80" viewBox="0 0 260 80"><path d="M 30,50 Q 70,20 100,55 T 160,30 Q 200,45 240,25" fill="none" stroke="%23059669" stroke-width="3" stroke-linecap="round"/></svg>';
const SIG_TINY =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mNk+M9Qz0AEYBxVSF+FABJADveWkH6dAAAAAElFTkSuQmCC';

const METHOD_META: Record<
  NdtMethod,
  { procedureId: string; procedureNumber: string; standardSpec: string; equipmentId: string; criterionId: string }
> = {
  UT: {
    procedureId: 'proc-1',
    procedureNumber: 'WEP-UT-001',
    standardSpec: 'ASME Section V Art. 4 & 5 / ASME B31.3',
    equipmentId: 'eq-1',
    criterionId: 'crit-1',
  },
  MT: {
    procedureId: 'proc-2',
    procedureNumber: 'WEP-MT-001',
    standardSpec: 'AWS D1.1 Clause 6 / ISO 17638 Level B',
    equipmentId: 'eq-11',
    criterionId: 'crit-2',
  },
  PT: {
    procedureId: 'proc-3',
    procedureNumber: 'WEP-PT-001',
    standardSpec: 'ASME Section V Art. 6 / ISO 3452-1',
    equipmentId: 'eq-17',
    criterionId: 'crit-3',
  },
  VT: {
    procedureId: 'proc-4',
    procedureNumber: 'WEP-VT-001',
    standardSpec: 'ASME B31.3 Table 341.3.2 / ISO 17637',
    equipmentId: 'eq-22',
    criterionId: 'crit-4',
  },
};

type SiteRef = { customerId: string; siteId: string };

const SITES: SiteRef[] = [
  { customerId: 'cust-1', siteId: 'site-1-1' },
  { customerId: 'cust-1', siteId: 'site-1-2' },
  { customerId: 'cust-2', siteId: 'site-2-1' },
  { customerId: 'cust-3', siteId: 'site-3-1' },
  { customerId: 'cust-4', siteId: 'site-4-1' },
  { customerId: 'cust-4', siteId: 'site-4-2' },
  { customerId: 'cust-5', siteId: 'site-5-1' },
  { customerId: 'cust-6', siteId: 'site-6-1' },
  { customerId: 'cust-7', siteId: 'site-7-1' },
  { customerId: 'cust-7', siteId: 'site-7-2' },
  { customerId: 'cust-8', siteId: 'site-8-1' },
];

/** Valid inspectors preferred for completed history */
const HISTORY_INSPECTORS = [
  { id: 'insp-1', name: 'Thabo Mokoena' },
  { id: 'insp-5', name: 'Amina Jacobs' },
  { id: 'insp-7', name: 'Nadia Ferreira' },
  { id: 'insp-15', name: 'Precious Ndlovu' },
  { id: 'insp-9', name: 'Fatima Essop' },
];

const METHODS: NdtMethod[] = ['UT', 'MT', 'PT', 'VT'];

const SCOPES: Record<NdtMethod, string[]> = {
  UT: [
    'Ultrasonic thickness survey on carbon steel process piping',
    'UT weld integrity check on pressure vessel nozzle welds',
    'Corrosion mapping UT campaign on digester shell courses',
  ],
  MT: [
    'Magnetic particle inspection of structural lifting lugs',
    'MT examination of pad eyes and gusset plate welds',
    'Wet AC yoke MT on boiler support steelwork',
  ],
  PT: [
    'Liquid penetrant examination of stainless root and final passes',
    'Visible dye PT on aluminium fabrication welds',
    'PT of heat-exchanger tube-to-tubesheet welds',
  ],
  VT: [
    'Visual inspection of final fabrication welds',
    'VT of bogey frame welds after shop assembly',
    'Direct visual examination of tank shell seams',
  ],
};

/** Mulberry32 deterministic PRNG */
function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function padJobNum(n: number): string {
  return `NDT-2026-${String(n).padStart(4, '0')}`;
}

function passItems(jobId: string, method: NdtMethod, count: number, at: string): InspectionItem[] {
  const meta = METHOD_META[method];
  return Array.from({ length: count }, (_, i) => ({
    id: `item-${jobId}-${i + 1}`,
    itemNumber: method === 'UT' ? `Weld ${String(i + 1).padStart(3, '0')}` : `Location ${i + 1}`,
    description: `${method} examination location ${i + 1}`,
    reading: method === 'UT' ? (6.2 + i * 0.15).toFixed(2) : method === 'MT' ? '0' : undefined,
    unit: method === 'UT' || method === 'MT' ? 'mm' : undefined,
    acceptanceCriteria:
      method === 'UT'
        ? 'Min wall 5.80mm / No planar flaws'
        : method === 'MT'
          ? 'No cracks or linear indications > 1.5mm'
          : 'Per written examination procedure',
    criterionId: meta.criterionId,
    result: 'Pass' as const,
    notes: 'No relevant indications.',
    photos: i === 0 ? [{ id: `p-${jobId}-1`, dataUrl: sampleWeldPhoto1, caption: `${method} scan zone`, timestamp: at }] : [],
    updatedAt: at,
  }));
}

function failItem(jobId: string, method: NdtMethod, at: string): InspectionItem {
  return {
    id: `item-${jobId}-fail`,
    itemNumber: 'Indication 01',
    description: `${method} reject indication`,
    reading: method === 'MT' ? '18' : '4.2',
    unit: 'mm',
    acceptanceCriteria: METHOD_META[method].criterionId === 'crit-1' ? 'Min wall 5.80mm' : 'No cracks > 1.5mm',
    criterionId: METHOD_META[method].criterionId,
    result: 'Fail',
    indication: 'Linear indication recorded — repair and re-inspect required.',
    notes: 'FAIL teaching beat for history filters.',
    photos: [{ id: `p-${jobId}-fail`, dataUrl: sampleWeldPhoto2, caption: 'Reject indication', timestamp: at }],
    updatedAt: at,
  };
}

/** Curated scenario jobs for the live walkthrough (stable IDs). */
function buildScenarioJobs(): Job[] {
  const today = todayISO();
  const weekStart = startOfWeekMonday(today);
  // Spread open jobs across current week for dispatch board
  const mon = weekStart;
  const tue = addDays(weekStart, 1);
  const wed = addDays(weekStart, 2);
  const thu = addDays(weekStart, 3);
  const fri = addDays(weekStart, 4);
  const nextMon = addDays(weekStart, 7);
  const nextWed = addDays(weekStart, 9);

  const jobs: Job[] = [
    // Full L3-approved showcase (recent past)
    {
      id: 'job-1',
      jobNumber: 'NDT-2026-0001',
      customerId: 'cust-1',
      siteId: 'site-1-1',
      inspectionDate: daysFromToday(-12),
      dueDate: daysFromToday(-10),
      inspectorId: 'insp-1',
      method: 'UT',
      scope: 'Ultrasonic thickness survey and weld integrity check on 6-inch high-pressure steam manifold spools.',
      standardSpec: METHOD_META.UT.standardSpec,
      equipmentIds: ['eq-1'],
      procedureId: 'proc-1',
      procedureNumber: 'WEP-UT-001',
      generalNotes: 'Inspections carried out at ambient temperature (~22°C).',
      surfaceCondition: 'Wire brushed & solvent degreased',
      temperature: '22°C',
      temperatureC: 22,
      ambientLight: 'Daylight / shop lighting',
      status: 'Completed',
      overallResult: 'PASS',
      reportNumber: 'REP-2026-0001',
      completedAt: isoDateTime(daysFromToday(-12), 14, 45),
      inspectorComments: 'All measured thickness readings exceeded minimum design nominal. No laminar defects found.',
      signatureDataUrl: SIG_L2,
      l3ReviewStatus: 'APPROVED',
      l3VerifierId: 'insp-l3-1',
      l3VerifierName: 'Dr. Johan Pretorius',
      l3CertNumber: 'ISO-9712-L3-ZA-0412',
      l3SignatureDataUrl: SIG_L3,
      l3Comments: 'Verified calibration records and acceptance criteria. Full technical approval granted.',
      l3ReviewedAt: isoDateTime(daysFromToday(-12), 16, 15),
      auditTrail: [
        { id: 'aud-1', timestamp: isoDateTime(daysFromToday(-13), 8, 0), actorName: 'System Admin', actorRole: 'Admin', action: 'JOB_CREATED', details: 'Job created and assigned to Thabo Mokoena (Method: UT).' },
        { id: 'aud-2', timestamp: isoDateTime(daysFromToday(-12), 14, 45), actorName: 'Thabo Mokoena', actorRole: 'Inspector', action: 'INSPECTOR_SIGNED', details: 'Field inspection completed. Submitted for Level 3 QA review.' },
        { id: 'aud-3', timestamp: isoDateTime(daysFromToday(-12), 16, 15), actorName: 'Dr. Johan Pretorius', actorRole: 'Level 3 Verifier', action: 'L3_APPROVED', details: 'Level 3 technical review passed.' },
      ],
      items: passItems('job-1', 'UT', 3, isoDateTime(daysFromToday(-12), 10, 15)),
      createdAt: isoDateTime(daysFromToday(-13), 8, 0),
      updatedAt: isoDateTime(daysFromToday(-12), 16, 15),
    },

    // L3 pending — overdue late-complete (L3 approve demo)
    {
      id: 'job-1b',
      jobNumber: 'NDT-2026-0001B',
      customerId: 'cust-3',
      siteId: 'site-3-1',
      inspectionDate: daysFromToday(-8),
      dueDate: daysFromToday(-7),
      inspectorId: 'insp-1',
      method: 'VT',
      scope: 'Visual inspection of bogey frame welds after delayed site access.',
      standardSpec: METHOD_META.VT.standardSpec,
      equipmentIds: ['eq-22'],
      procedureId: 'proc-4',
      procedureNumber: 'WEP-VT-001',
      generalNotes: 'Completed after due date — site access delay. Awaiting Level 3 review.',
      surfaceCondition: 'As-welded',
      temperature: '18°C',
      temperatureC: 18,
      ambientLight: '950 Lux (shop)',
      status: 'Completed',
      overallResult: 'PASS',
      reportNumber: 'REP-2026-0001B',
      completedAt: isoDateTime(daysFromToday(-5), 11, 0),
      inspectorComments: 'No relevant visual indications. Submitted for Level 3 review after delayed site access.',
      signatureDataUrl: SIG_L2,
      auditTrail: [
        { id: 'aud-1b-1', timestamp: isoDateTime(daysFromToday(-9), 8, 0), actorName: 'System Admin', actorRole: 'Admin', action: 'JOB_CREATED', details: 'VT job created for Transnet yard.' },
        { id: 'aud-1b-2', timestamp: isoDateTime(daysFromToday(-5), 11, 0), actorName: 'Thabo Mokoena', actorRole: 'Inspector', action: 'INSPECTOR_SIGNED', details: 'Completed after due date. Awaiting Level 3 review.' },
      ],
      items: passItems('job-1b', 'VT', 1, isoDateTime(daysFromToday(-5), 10, 30)),
      createdAt: isoDateTime(daysFromToday(-9), 8, 0),
      updatedAt: isoDateTime(daysFromToday(-5), 11, 0),
    },

    // In Progress — tech complete demo (Thabo + eq-2 checked out)
    {
      id: 'job-2',
      jobNumber: 'NDT-2026-0002',
      customerId: 'cust-1',
      siteId: 'site-1-1',
      inspectionDate: tue,
      dueDate: fri,
      inspectorId: 'insp-1',
      method: 'MT',
      scope: 'Magnetic Particle inspection of structural lifting lugs & pad eyes on pressure vessel skid.',
      standardSpec: METHOD_META.MT.standardSpec,
      equipmentIds: ['eq-2'],
      procedureId: 'proc-2',
      procedureNumber: 'WEP-MT-001',
      generalNotes: 'Continuous AC wet method using black ink on white contrast paint.',
      surfaceCondition: 'White contrast paint applied on wire-brushed weld',
      temperature: '21°C',
      temperatureC: 21,
      ambientLight: '1200 Lux',
      status: 'In Progress',
      overallResult: 'PENDING',
      auditTrail: [
        { id: 'aud-2-1', timestamp: isoDateTime(tue, 7, 30), actorName: 'System Admin', actorRole: 'Admin', action: 'JOB_CREATED', details: 'Job created for Magnetic Testing.' },
        { id: 'aud-2-1b', timestamp: isoDateTime(tue, 7, 35), actorName: 'System Admin', actorRole: 'Admin', action: 'EQUIPMENT_CHECKED_OUT', details: 'Parker B300 Yoke deployed to job.' },
        { id: 'aud-2-2', timestamp: isoDateTime(tue, 8, 30), actorName: 'Thabo Mokoena', actorRole: 'Inspector', action: 'ITEM_ADDED', details: 'Lug 01 - North inspected (Pass).' },
        { id: 'aud-2-3', timestamp: isoDateTime(tue, 8, 45), actorName: 'Thabo Mokoena', actorRole: 'Inspector', action: 'ITEM_ADDED', details: 'Lug 02 - South: 18mm crack indication (Fail).' },
      ],
      items: [
        {
          id: 'item-2-1',
          itemNumber: 'Lug 01 - North',
          description: 'Heavy lifting lug fillet weld toe (Left & Right)',
          reading: '0',
          unit: 'mm',
          acceptanceCriteria: 'No cracks or linear indications > 1.5mm (AWS D1.1 Clause 6)',
          criterionId: 'crit-2',
          result: 'Pass',
          notes: 'Full circumference tested. No surface breaking defects.',
          methodDetails: { technique: 'AC Contour Yoke (Black ink on White Contrast)', location: 'Fillet weld base transition', lightLevel: '1200 Lux' },
          photos: [{ id: 'p-2-1', dataUrl: sampleWeldPhoto1, caption: 'North lifting lug magnetic yoke testing', timestamp: isoDateTime(tue, 8, 30) }],
          updatedAt: isoDateTime(tue, 8, 30),
        },
        {
          id: 'item-2-2',
          itemNumber: 'Lug 02 - South',
          description: 'Pad eye gusset plate connection weld',
          reading: '18',
          unit: 'mm',
          acceptanceCriteria: 'No cracks or linear indications > 1.5mm (AWS D1.1 Clause 6)',
          criterionId: 'crit-2',
          result: 'Fail',
          indication: 'Linear crack indication 18mm in length at toe of weld stop-start.',
          notes: 'Crack visible upon magnetisation. Grinding and re-weld repair required before re-inspection.',
          methodDetails: { technique: 'AC Contour Yoke', indication: '18mm toe crack', location: "South gusset 3 o'clock position", lightLevel: '1150 Lux' },
          photos: [{ id: 'p-2-2', dataUrl: sampleWeldPhoto2, caption: '18mm linear crack indication', timestamp: isoDateTime(tue, 8, 45) }],
          updatedAt: isoDateTime(tue, 8, 45),
        },
      ],
      createdAt: isoDateTime(tue, 7, 30),
      updatedAt: isoDateTime(tue, 8, 45),
    },

    // Assigned L1 — start work (Lesego + Thabo supervisor)
    {
      id: 'job-3',
      jobNumber: 'NDT-2026-0003',
      customerId: 'cust-2',
      siteId: 'site-2-1',
      inspectionDate: wed,
      dueDate: addDays(weekStart, 5),
      inspectorId: 'insp-4',
      supervisorId: 'insp-1',
      method: 'UT',
      scope: 'Ultrasonic thickness survey of newly installed carbon steel process piping spools under Level 2 supervision.',
      standardSpec: METHOD_META.UT.standardSpec,
      equipmentIds: ['eq-1'],
      generalNotes: 'Level 1 records readings only. Supervising Level 2 evaluates acceptance.',
      surfacePrepInstruction: 'Client to wire brush and degrease prior to arrival',
      status: 'Assigned',
      overallResult: 'PENDING',
      procedureId: 'proc-1',
      procedureNumber: 'WEP-UT-001',
      auditTrail: [
        { id: 'aud-3-1', timestamp: isoDateTime(mon, 9, 0), actorName: 'System Admin', actorRole: 'Admin', action: 'JOB_CREATED', details: 'UT job created for Sasol site — Level 1 with supervisor.' },
        { id: 'aud-3-2', timestamp: isoDateTime(mon, 9, 0), actorName: 'System Admin', actorRole: 'Admin', action: 'JOB_ASSIGNED', details: 'Lesego Nkosi assigned. Supervisor: Thabo Mokoena.' },
      ],
      items: [],
      createdAt: isoDateTime(mon, 9, 0),
      updatedAt: isoDateTime(mon, 9, 0),
    },

    // Awaiting Supervisor
    {
      id: 'job-4',
      jobNumber: 'NDT-2026-0004',
      customerId: 'cust-1',
      siteId: 'site-1-1',
      inspectionDate: mon,
      dueDate: tue,
      inspectorId: 'insp-4',
      supervisorId: 'insp-1',
      method: 'UT',
      scope: 'Ultrasonic thickness survey — Level 1 findings awaiting supervising Level 2 evaluation.',
      standardSpec: METHOD_META.UT.standardSpec,
      equipmentIds: ['eq-1'],
      procedureId: 'proc-1',
      procedureNumber: 'WEP-UT-001',
      generalNotes: 'Lesego submitted findings; Thabo must evaluate Pass/Fail on each item.',
      surfaceCondition: 'Wire brushed',
      temperature: '22°C',
      temperatureC: 22,
      status: 'Awaiting Supervisor',
      overallResult: 'PENDING',
      findingsRevision: 1,
      findingsHistory: [],
      signatureDataUrl: SIG_TINY,
      inspectorComments: 'Findings recorded per written instruction. Submitted for supervisor evaluation.',
      auditTrail: [
        { id: 'aud-4-1', timestamp: isoDateTime(mon, 7, 0), actorName: 'System Admin', actorRole: 'Admin', action: 'JOB_CREATED', details: 'L1 supervised UT job created.' },
        { id: 'aud-4-4', timestamp: isoDateTime(mon, 9, 0), actorName: 'Lesego Nkosi', actorRole: 'Inspector', action: 'SUBMITTED_TO_SUPERVISOR', details: 'Level 1 findings submitted to Thabo Mokoena (2 items).' },
      ],
      items: [
        {
          id: 'item-4-1',
          itemNumber: 'Weld 001',
          description: '6-inch Sch 40 butt weld — boiler feed line',
          reading: '6.12',
          unit: 'mm',
          acceptanceCriteria: 'Min 5.80mm / No planar flaws',
          criterionId: 'crit-1',
          result: 'Pending',
          indication: 'Clear backwall echo; no relevant indication observed',
          notes: 'Calibration verified on 5-step block before scan',
          methodDetails: { thickness: '6.12', probe: 'Olympus 5MHz 0.5" Dual Element', couplant: 'Ultragel II' },
          photos: [{ id: 'p-4-1', dataUrl: sampleWeldPhoto1, caption: 'UT scan zone — Weld 001', timestamp: isoDateTime(mon, 8, 30) }],
          updatedAt: isoDateTime(mon, 8, 30),
        },
        {
          id: 'item-4-2',
          itemNumber: 'Weld 002',
          description: '6-inch Sch 40 butt weld — adjacent spool',
          reading: '5.95',
          unit: 'mm',
          acceptanceCriteria: 'Min 5.80mm / No planar flaws',
          criterionId: 'crit-1',
          result: 'Pending',
          indication: 'Reading near minimum; supervisor to confirm acceptance',
          notes: 'Supervisor to confirm acceptance against ASME B31.3',
          methodDetails: { thickness: '5.95', probe: 'Olympus 5MHz 0.5" Dual Element', couplant: 'Ultragel II' },
          photos: [],
          updatedAt: isoDateTime(mon, 8, 45),
        },
      ],
      createdAt: isoDateTime(mon, 7, 0),
      updatedAt: isoDateTime(mon, 9, 0),
    },

    // Revision Required
    {
      id: 'job-5',
      jobNumber: 'NDT-2026-0005',
      customerId: 'cust-2',
      siteId: 'site-2-1',
      inspectionDate: mon,
      dueDate: thu,
      inspectorId: 'insp-4',
      supervisorId: 'insp-1',
      method: 'MT',
      scope: 'Magnetic particle — Level 1 findings rejected; revision required.',
      standardSpec: METHOD_META.MT.standardSpec,
      equipmentIds: ['eq-11'],
      procedureId: 'proc-2',
      procedureNumber: 'WEP-MT-001',
      generalNotes: 'Supervisor rejected rev 1 — Lesego must revise indication notes before resubmit.',
      surfaceCondition: 'Contrast paint applied',
      temperature: '23°C',
      temperatureC: 23,
      ambientLight: '1100 Lux',
      status: 'Revision Required',
      overallResult: 'PENDING',
      findingsRevision: 1,
      supervisorRejectionReason:
        'Indication notes incomplete on Weld 001 — re-scan stop-start and record indication length/location before resubmit.',
      supervisorRejectedAt: isoDateTime(mon, 10, 15),
      supervisorRejectedByName: 'Thabo Mokoena',
      signatureDataUrl: SIG_TINY,
      inspectorComments: 'Initial findings submitted.',
      findingsHistory: [
        {
          revision: 1,
          submittedAt: isoDateTime(mon, 9, 30),
          signatureDataUrl: SIG_TINY,
          inspectorComments: 'Initial findings submitted.',
          rejectionReason:
            'Indication notes incomplete on Weld 001 — re-scan stop-start and record indication length/location before resubmit.',
          rejectedAt: isoDateTime(mon, 10, 15),
          rejectedByName: 'Thabo Mokoena',
          items: [
            {
              id: 'item-5-1-hist',
              itemNumber: 'Weld 001',
              description: 'Pad eye gusset — stop-start',
              reading: '',
              unit: 'mm',
              acceptanceCriteria: 'No cracks or linear indications > 1.5mm',
              criterionId: 'crit-2',
              result: 'Pending',
              indication: 'Possible indication',
              notes: '',
              methodDetails: { technique: 'AC Contour Yoke' },
              photos: [],
              updatedAt: isoDateTime(mon, 9, 20),
            },
          ],
        },
      ],
      auditTrail: [
        { id: 'aud-5-1', timestamp: isoDateTime(mon, 8, 0), actorName: 'System Admin', actorRole: 'Admin', action: 'JOB_CREATED', details: 'MT L1 job for supervisor reject / revise path.' },
        { id: 'aud-5-2', timestamp: isoDateTime(mon, 9, 30), actorName: 'Lesego Nkosi', actorRole: 'Inspector', action: 'SUBMITTED_TO_SUPERVISOR', details: 'Findings rev 1 submitted.' },
        {
          id: 'aud-5-3',
          timestamp: isoDateTime(mon, 10, 15),
          actorName: 'Thabo Mokoena',
          actorRole: 'Supervisor',
          action: 'SUPERVISOR_REJECTED',
          details: 'Rejected rev 1 — incomplete indication notes.',
          rejectionReason:
            'Indication notes incomplete on Weld 001 — re-scan stop-start and record indication length/location before resubmit.',
        },
      ],
      items: [
        {
          id: 'item-5-1',
          itemNumber: 'Weld 001',
          description: 'Pad eye gusset — stop-start',
          reading: '',
          unit: 'mm',
          acceptanceCriteria: 'No cracks or linear indications > 1.5mm',
          criterionId: 'crit-2',
          result: 'Pending',
          indication: 'Possible indication',
          notes: 'Awaiting re-scan per supervisor rejection',
          methodDetails: { technique: 'AC Contour Yoke' },
          photos: [{ id: 'p-5-1', dataUrl: sampleWeldPhoto2, caption: 'MT indication zone', timestamp: isoDateTime(mon, 9, 20) }],
          updatedAt: isoDateTime(mon, 10, 15),
        },
      ],
      createdAt: isoDateTime(mon, 8, 0),
      updatedAt: isoDateTime(mon, 10, 15),
    },

    // Draft — admin create/assign golden path
    {
      id: 'job-draft-1',
      jobNumber: 'NDT-2026-0006',
      customerId: 'cust-2',
      siteId: 'site-2-1',
      inspectionDate: fri,
      dueDate: nextMon,
      inspectorId: '',
      method: 'UT',
      scope: 'Ultrasonic thickness survey and weld volumetric examination',
      standardSpec: METHOD_META.UT.standardSpec,
      equipmentIds: [],
      generalNotes: 'Draft work order — finish people, procedure, and kit before Assign.',
      status: 'Draft',
      overallResult: 'PENDING',
      auditTrail: [
        {
          id: 'aud-draft-1',
          timestamp: isoDateTime(mon, 10, 0),
          actorName: 'System Admin',
          actorRole: 'Admin',
          action: 'JOB_DRAFT_SAVED',
          details: 'Draft job NDT-2026-0006 saved (Work step only).',
        },
      ],
      items: [],
      createdAt: isoDateTime(mon, 10, 0),
      updatedAt: isoDateTime(mon, 10, 0),
    },

    // Assigned PT — Nadia (valid)
    {
      id: 'job-pt-1',
      jobNumber: 'NDT-2026-0007',
      customerId: 'cust-2',
      siteId: 'site-2-1',
      inspectionDate: thu,
      dueDate: fri,
      inspectorId: 'insp-7',
      method: 'PT',
      scope: 'Liquid penetrant examination of stainless root and final weld passes on process spool fabrication.',
      standardSpec: METHOD_META.PT.standardSpec,
      equipmentIds: ['eq-17'],
      procedureId: 'proc-3',
      procedureNumber: 'WEP-PT-001',
      generalNotes: 'Visible red dye — solvent removable. Record ambient lux before interpretation.',
      surfacePrepInstruction: 'Solvent clean; free from oil, grease, and coatings',
      status: 'Assigned',
      overallResult: 'PENDING',
      auditTrail: [
        { id: 'aud-pt-1', timestamp: isoDateTime(tue, 11, 0), actorName: 'System Admin', actorRole: 'Admin', action: 'JOB_CREATED', details: 'PT job created for Sasol fabrication bay.' },
        { id: 'aud-pt-2', timestamp: isoDateTime(tue, 11, 0), actorName: 'System Admin', actorRole: 'Admin', action: 'JOB_ASSIGNED', details: 'Assigned to Nadia Ferreira (PT Level 2).' },
      ],
      items: [],
      createdAt: isoDateTime(tue, 11, 0),
      updatedAt: isoDateTime(tue, 11, 0),
    },

    // Extra In Progress — Lesego current week (dispatch density)
    {
      id: 'job-ip-lesego',
      jobNumber: 'NDT-2026-0008',
      customerId: 'cust-4',
      siteId: 'site-4-1',
      inspectionDate: wed,
      dueDate: fri,
      inspectorId: 'insp-4',
      supervisorId: 'insp-1',
      method: 'MT',
      scope: 'MT of outage support steelwork under L2 supervision — in progress.',
      standardSpec: METHOD_META.MT.standardSpec,
      equipmentIds: ['eq-11'],
      procedureId: 'proc-2',
      procedureNumber: 'WEP-MT-001',
      status: 'In Progress',
      overallResult: 'PENDING',
      surfaceCondition: 'Contrast paint applied',
      temperature: '20°C',
      temperatureC: 20,
      ambientLight: '1050 Lux',
      auditTrail: [
        { id: 'aud-ip-1', timestamp: isoDateTime(wed, 7, 0), actorName: 'System Admin', actorRole: 'Admin', action: 'JOB_CREATED', details: 'Outage MT job for Tutuka.' },
        { id: 'aud-ip-2', timestamp: isoDateTime(wed, 7, 30), actorName: 'Lesego Nkosi', actorRole: 'Inspector', action: 'JOB_STARTED', details: 'Started work on site.' },
      ],
      items: [
        {
          id: 'item-ip-1',
          itemNumber: 'Brace 01',
          description: 'Boiler island brace fillet',
          reading: '0',
          unit: 'mm',
          acceptanceCriteria: 'No cracks > 1.5mm',
          criterionId: 'crit-2',
          result: 'Pass',
          notes: 'First brace complete.',
          photos: [],
          updatedAt: isoDateTime(wed, 8, 0),
        },
      ],
      createdAt: isoDateTime(wed, 7, 0),
      updatedAt: isoDateTime(wed, 8, 0),
    },

    // Overdue open — Assigned past due
    {
      id: 'job-overdue-1',
      jobNumber: 'NDT-2026-0009',
      customerId: 'cust-5',
      siteId: 'site-5-1',
      inspectionDate: daysFromToday(-10),
      dueDate: daysFromToday(-3),
      inspectorId: 'insp-15',
      method: 'MT',
      scope: 'Structural MT on shaft headgear lifting lugs — overdue delivery.',
      standardSpec: METHOD_META.MT.standardSpec,
      equipmentIds: ['eq-14'],
      procedureId: 'proc-2',
      procedureNumber: 'WEP-MT-001',
      status: 'Assigned',
      overallResult: 'PENDING',
      generalNotes: 'Site access delayed — due date slipped. Show overdue on board.',
      auditTrail: [
        { id: 'aud-od-1', timestamp: isoDateTime(daysFromToday(-12), 8, 0), actorName: 'System Admin', actorRole: 'Admin', action: 'JOB_CREATED', details: 'Headgear MT job created.' },
        { id: 'aud-od-2', timestamp: isoDateTime(daysFromToday(-12), 8, 0), actorName: 'System Admin', actorRole: 'Admin', action: 'JOB_ASSIGNED', details: 'Assigned to Precious Ndlovu.' },
      ],
      items: [],
      createdAt: isoDateTime(daysFromToday(-12), 8, 0),
      updatedAt: isoDateTime(daysFromToday(-12), 8, 0),
    },

    // Overdue open — In Progress past due
    {
      id: 'job-overdue-2',
      jobNumber: 'NDT-2026-0010',
      customerId: 'cust-6',
      siteId: 'site-6-1',
      inspectionDate: daysFromToday(-6),
      dueDate: daysFromToday(-2),
      inspectorId: 'insp-5',
      method: 'UT',
      scope: 'Digester shell UT corrosion mapping — overdue in progress.',
      standardSpec: METHOD_META.UT.standardSpec,
      equipmentIds: ['eq-7'],
      procedureId: 'proc-1',
      procedureNumber: 'WEP-UT-001',
      status: 'In Progress',
      overallResult: 'PENDING',
      surfaceCondition: 'Wire brushed',
      temperature: '24°C',
      temperatureC: 24,
      auditTrail: [
        { id: 'aud-od2-1', timestamp: isoDateTime(daysFromToday(-7), 8, 0), actorName: 'System Admin', actorRole: 'Admin', action: 'JOB_CREATED', details: 'Saiccor UT campaign.' },
        { id: 'aud-od2-2', timestamp: isoDateTime(daysFromToday(-6), 7, 30), actorName: 'Amina Jacobs', actorRole: 'Inspector', action: 'JOB_STARTED', details: 'Started digester mapping.' },
      ],
      items: passItems('job-overdue-2', 'UT', 1, isoDateTime(daysFromToday(-6), 9, 0)).map((it) => ({
        ...it,
        result: 'Pending' as const,
      })),
      createdAt: isoDateTime(daysFromToday(-7), 8, 0),
      updatedAt: isoDateTime(daysFromToday(-6), 9, 0),
    },

    // Overdue Assigned — third overdue
    {
      id: 'job-overdue-3',
      jobNumber: 'NDT-2026-0011',
      customerId: 'cust-8',
      siteId: 'site-8-1',
      inspectionDate: daysFromToday(-14),
      dueDate: daysFromToday(-5),
      inspectorId: 'insp-1',
      method: 'VT',
      scope: 'Terminal tank seam VT — overdue assignment.',
      standardSpec: METHOD_META.VT.standardSpec,
      equipmentIds: ['eq-22'],
      procedureId: 'proc-4',
      procedureNumber: 'WEP-VT-001',
      status: 'Assigned',
      overallResult: 'PENDING',
      auditTrail: [
        { id: 'aud-od3-1', timestamp: isoDateTime(daysFromToday(-15), 9, 0), actorName: 'System Admin', actorRole: 'Admin', action: 'JOB_CREATED', details: 'Island View VT job.' },
        { id: 'aud-od3-2', timestamp: isoDateTime(daysFromToday(-15), 9, 0), actorName: 'System Admin', actorRole: 'Admin', action: 'JOB_ASSIGNED', details: 'Assigned to Thabo Mokoena.' },
      ],
      items: [],
      createdAt: isoDateTime(daysFromToday(-15), 9, 0),
      updatedAt: isoDateTime(daysFromToday(-15), 9, 0),
    },

    // Second L3 pending
    {
      id: 'job-l3-pending-2',
      jobNumber: 'NDT-2026-0012',
      customerId: 'cust-7',
      siteId: 'site-7-1',
      inspectionDate: daysFromToday(-3),
      dueDate: daysFromToday(-1),
      inspectorId: 'insp-15',
      method: 'PT',
      scope: 'PT of converter aisle stainless tie-ins — awaiting L3.',
      standardSpec: METHOD_META.PT.standardSpec,
      equipmentIds: ['eq-17'],
      procedureId: 'proc-3',
      procedureNumber: 'WEP-PT-001',
      status: 'Completed',
      overallResult: 'PASS',
      reportNumber: 'REP-2026-0012',
      completedAt: isoDateTime(daysFromToday(-2), 15, 0),
      inspectorComments: 'No relevant PT indications. Ready for L3.',
      signatureDataUrl: SIG_L2,
      surfaceCondition: 'Solvent cleaned',
      temperature: '22°C',
      temperatureC: 22,
      ambientLight: '1100 Lux',
      auditTrail: [
        { id: 'aud-l3p-1', timestamp: isoDateTime(daysFromToday(-4), 8, 0), actorName: 'System Admin', actorRole: 'Admin', action: 'JOB_CREATED', details: 'Waterval PT job.' },
        { id: 'aud-l3p-2', timestamp: isoDateTime(daysFromToday(-2), 15, 0), actorName: 'Precious Ndlovu', actorRole: 'Inspector', action: 'INSPECTOR_SIGNED', details: 'Completed — awaiting L3.' },
      ],
      items: passItems('job-l3-pending-2', 'PT', 2, isoDateTime(daysFromToday(-2), 12, 0)),
      createdAt: isoDateTime(daysFromToday(-4), 8, 0),
      updatedAt: isoDateTime(daysFromToday(-2), 15, 0),
    },

    // Future Assigned
    {
      id: 'job-future-1',
      jobNumber: 'NDT-2026-0013',
      customerId: 'cust-4',
      siteId: 'site-4-2',
      inspectionDate: nextMon,
      dueDate: nextWed,
      inspectorId: 'insp-1',
      method: 'UT',
      scope: 'Ash handling plant UT thickness survey — scheduled next week.',
      standardSpec: METHOD_META.UT.standardSpec,
      equipmentIds: ['eq-4'],
      procedureId: 'proc-1',
      procedureNumber: 'WEP-UT-001',
      status: 'Assigned',
      overallResult: 'PENDING',
      auditTrail: [
        { id: 'aud-fut-1', timestamp: isoDateTime(today, 8, 0), actorName: 'System Admin', actorRole: 'Admin', action: 'JOB_CREATED', details: 'Future Tutuka UT job scheduled.' },
        { id: 'aud-fut-2', timestamp: isoDateTime(today, 8, 0), actorName: 'System Admin', actorRole: 'Admin', action: 'JOB_ASSIGNED', details: 'Assigned to Thabo Mokoena.' },
      ],
      items: [],
      createdAt: isoDateTime(today, 8, 0),
      updatedAt: isoDateTime(today, 8, 0),
    },

    // Future Assigned — Lesego
    {
      id: 'job-future-2',
      jobNumber: 'NDT-2026-0014',
      customerId: 'cust-7',
      siteId: 'site-7-2',
      inspectionDate: addDays(weekStart, 10),
      dueDate: addDays(weekStart, 12),
      inspectorId: 'insp-4',
      supervisorId: 'insp-1',
      method: 'UT',
      scope: 'Flash furnace deck UT under L2 supervision — scheduled future.',
      standardSpec: METHOD_META.UT.standardSpec,
      equipmentIds: ['eq-8'],
      procedureId: 'proc-1',
      procedureNumber: 'WEP-UT-001',
      status: 'Assigned',
      overallResult: 'PENDING',
      auditTrail: [
        { id: 'aud-fut2-1', timestamp: isoDateTime(today, 9, 0), actorName: 'System Admin', actorRole: 'Admin', action: 'JOB_CREATED', details: 'Future Waterval UT.' },
        { id: 'aud-fut2-2', timestamp: isoDateTime(today, 9, 0), actorName: 'System Admin', actorRole: 'Admin', action: 'JOB_ASSIGNED', details: 'Lesego + Thabo supervisor.' },
      ],
      items: [],
      createdAt: isoDateTime(today, 9, 0),
      updatedAt: isoDateTime(today, 9, 0),
    },

    // Current-week Assigned for dispatch density
    {
      id: 'job-week-vt',
      jobNumber: 'NDT-2026-0015',
      customerId: 'cust-1',
      siteId: 'site-1-2',
      inspectionDate: thu,
      dueDate: fri,
      inspectorId: 'insp-7',
      method: 'VT',
      scope: 'Secunda Unit 4 final weld VT — this week.',
      standardSpec: METHOD_META.VT.standardSpec,
      equipmentIds: ['eq-22'],
      procedureId: 'proc-4',
      procedureNumber: 'WEP-VT-001',
      status: 'Assigned',
      overallResult: 'PENDING',
      auditTrail: [
        { id: 'aud-wk-1', timestamp: isoDateTime(tue, 10, 0), actorName: 'System Admin', actorRole: 'Admin', action: 'JOB_CREATED', details: 'Week VT job.' },
        { id: 'aud-wk-2', timestamp: isoDateTime(tue, 10, 0), actorName: 'System Admin', actorRole: 'Admin', action: 'JOB_ASSIGNED', details: 'Assigned to Nadia Ferreira.' },
      ],
      items: [],
      createdAt: isoDateTime(tue, 10, 0),
      updatedAt: isoDateTime(tue, 10, 0),
    },
  ];

  return jobs;
}

/** Bulk Completed + L3 Approved history to reach ~50 total jobs. */
function buildBulkHistory(startNumber: number, count: number, seed = 20261022): Job[] {
  const rand = mulberry32(seed);
  const jobs: Job[] = [];

  for (let i = 0; i < count; i++) {
    const n = startNumber + i;
    const jobId = `job-hist-${n}`;
    const method = METHODS[Math.floor(rand() * METHODS.length)];
    const meta = METHOD_META[method];
    const site = SITES[Math.floor(rand() * SITES.length)];
    const insp = HISTORY_INSPECTORS[Math.floor(rand() * HISTORY_INSPECTORS.length)];
    const dayOffset = -(Math.floor(rand() * (SEED_OFFSETS.HISTORY_START * -1 - 5)) + 5); // -5 … -90
    const inspDate = daysFromToday(dayOffset);
    const dueDate = addDays(inspDate, 2 + Math.floor(rand() * 4));
    const completedAt = isoDateTime(inspDate, 14, Math.floor(rand() * 50));
    const l3At = isoDateTime(addDays(inspDate, 1), 10, 0);
    const isFail = rand() < 0.12;
    const items = isFail
      ? [...passItems(jobId, method, 1, completedAt), failItem(jobId, method, completedAt)]
      : passItems(jobId, method, 1 + Math.floor(rand() * 3), completedAt);
    const scopeList = SCOPES[method];
    const scope = scopeList[Math.floor(rand() * scopeList.length)];

    jobs.push({
      id: jobId,
      jobNumber: padJobNum(n),
      customerId: site.customerId,
      siteId: site.siteId,
      inspectionDate: inspDate,
      dueDate,
      inspectorId: insp.id,
      method,
      scope,
      standardSpec: meta.standardSpec,
      equipmentIds: [meta.equipmentId],
      procedureId: meta.procedureId,
      procedureNumber: meta.procedureNumber,
      generalNotes: 'Historical campaign inspection — demo seed.',
      surfaceCondition: method === 'MT' ? 'Contrast paint applied' : 'Wire brushed',
      temperature: '22°C',
      temperatureC: 22,
      ambientLight: method === 'VT' || method === 'MT' ? '1000 Lux' : undefined,
      status: 'Completed',
      overallResult: isFail ? 'FAIL' : 'PASS',
      reportNumber: `REP-2026-${String(n).padStart(4, '0')}`,
      completedAt,
      inspectorComments: isFail
        ? 'Reject indication recorded. Repair and re-inspect required.'
        : 'No relevant indications. Approved for service pending L3.',
      signatureDataUrl: SIG_L2,
      l3ReviewStatus: 'APPROVED',
      l3VerifierId: 'insp-l3-1',
      l3VerifierName: 'Dr. Johan Pretorius',
      l3CertNumber: 'ISO-9712-L3-ZA-0412',
      l3SignatureDataUrl: SIG_L3,
      l3Comments: 'Technical review complete. Certificate released.',
      l3ReviewedAt: l3At,
      auditTrail: [
        {
          id: `aud-${jobId}-1`,
          timestamp: isoDateTime(addDays(inspDate, -1), 8, 0),
          actorName: 'System Admin',
          actorRole: 'Admin',
          action: 'JOB_CREATED',
          details: `Historical ${method} job created.`,
        },
        {
          id: `aud-${jobId}-2`,
          timestamp: completedAt,
          actorName: insp.name,
          actorRole: 'Inspector',
          action: 'INSPECTOR_SIGNED',
          details: 'Field inspection completed.',
        },
        {
          id: `aud-${jobId}-3`,
          timestamp: l3At,
          actorName: 'Dr. Johan Pretorius',
          actorRole: 'Level 3 Verifier',
          action: 'L3_APPROVED',
          details: 'Level 3 approved.',
        },
      ],
      items,
      createdAt: isoDateTime(addDays(inspDate, -1), 8, 0),
      updatedAt: l3At,
    });
  }

  return jobs;
}

/** A few extra future scheduled jobs beyond the curated set. */
function buildExtraFuture(startNumber: number): Job[] {
  const today = todayISO();
  return [
    {
      id: 'job-future-3',
      jobNumber: padJobNum(startNumber),
      customerId: 'cust-3',
      siteId: 'site-3-1',
      inspectionDate: daysFromToday(5),
      dueDate: daysFromToday(8),
      inspectorId: 'insp-15',
      method: 'MT',
      scope: 'Rail yard MT campaign — scheduled next week.',
      standardSpec: METHOD_META.MT.standardSpec,
      equipmentIds: ['eq-15'],
      procedureId: 'proc-2',
      procedureNumber: 'WEP-MT-001',
      status: 'Assigned',
      overallResult: 'PENDING',
      auditTrail: [
        { id: 'aud-fut3-1', timestamp: isoDateTime(today, 11, 0), actorName: 'System Admin', actorRole: 'Admin', action: 'JOB_CREATED', details: 'Future Transnet MT.' },
        { id: 'aud-fut3-2', timestamp: isoDateTime(today, 11, 0), actorName: 'System Admin', actorRole: 'Admin', action: 'JOB_ASSIGNED', details: 'Assigned to Precious Ndlovu.' },
      ],
      items: [],
      createdAt: isoDateTime(today, 11, 0),
      updatedAt: isoDateTime(today, 11, 0),
    },
    {
      id: 'job-future-4',
      jobNumber: padJobNum(startNumber + 1),
      customerId: 'cust-8',
      siteId: 'site-8-1',
      inspectionDate: daysFromToday(10),
      dueDate: daysFromToday(14),
      inspectorId: 'insp-5',
      method: 'UT',
      scope: 'Island View tank floor UT — scheduled +10d.',
      standardSpec: METHOD_META.UT.standardSpec,
      equipmentIds: ['eq-10'],
      procedureId: 'proc-1',
      procedureNumber: 'WEP-UT-001',
      status: 'Assigned',
      overallResult: 'PENDING',
      auditTrail: [
        { id: 'aud-fut4-1', timestamp: isoDateTime(today, 12, 0), actorName: 'System Admin', actorRole: 'Admin', action: 'JOB_CREATED', details: 'Future midstream UT.' },
        { id: 'aud-fut4-2', timestamp: isoDateTime(today, 12, 0), actorName: 'System Admin', actorRole: 'Admin', action: 'JOB_ASSIGNED', details: 'Assigned to Amina Jacobs.' },
      ],
      items: [],
      createdAt: isoDateTime(today, 12, 0),
      updatedAt: isoDateTime(today, 12, 0),
    },
  ];
}

/**
 * Build full seed job set (~50): curated scenarios + bulk history + future.
 */
export function buildSeedJobs(): Job[] {
  const scenarios = buildScenarioJobs();
  // Scenario job numbers use 0001–0015 (and 0001B). Bulk starts at 0020.
  const bulk = buildBulkHistory(20, 32);
  const future = buildExtraFuture(52);
  const all = [...scenarios, ...bulk, ...future];
  // Stable order: newest inspectionDate first-ish for lists; keep curated first for familiarity
  return all;
}

/** Target count for smoke checks (~50). */
export const SEED_JOB_TARGET = 50;
