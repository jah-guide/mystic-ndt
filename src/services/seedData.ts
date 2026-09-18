import {
  Customer, Inspector, Equipment, Job, CompanySettings,
  NdtProcedure, EquipmentIncident, AcceptanceCriterion
} from '../types';

import {
  workshopCustomers,
  workshopInspectors,
  workshopEquipment
} from './seedWorkshopRoster';

export const initialCompanySettings: CompanySettings = {
  companyName: 'Apex NDT & Engineering Services (Pty) Ltd',
  logoUrl: '',
  address: '14 Albatross Road, Kempton Park, Gauteng, 1619, South Africa',
  phone: '+27 (0) 11 974 5520',
  email: 'reports@apexndt.co.za',
  website: 'www.apexndt.co.za',
  sanasAccreditation: 'SANAS / SAQCC Accredited Type A Inspection Body (ISO 17020 / SANS 17020)',
  reportFooter: 'This NDT certificate relates exclusively to the items examined under the specified procedure. Compliant with SANS 17020, SAQCC-NDT, and ASME/ISO specifications. Unauthorized alteration invalidates this certificate.',
  defaultReportNotes: 'Surface condition was prepared by wire brushing and solvent cleaning prior to examination. Calibration checks performed before and after inspection with zero drift observed.',
  reportPrefix: 'REP-2026-'
};

export const initialCustomers: Customer[] = workshopCustomers;
export const initialInspectors: Inspector[] = workshopInspectors;
export const initialEquipment: Equipment[] = workshopEquipment;

const sampleWeldPhoto1 = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" fill="%231e293b"/><path d="M50 150 L350 150" stroke="%23f59e0b" stroke-width="12" stroke-linecap="round"/><circle cx="200" cy="150" r="30" fill="none" stroke="%2338bdf8" stroke-width="4"/><text x="200" y="240" font-family="sans-serif" font-size="16" fill="%2394a3b8" text-anchor="middle">Weld 001 - UT Scan Zone</text></svg>';
const sampleWeldPhoto2 = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" fill="%231e293b"/><path d="M50 150 L350 150" stroke="%23ef4444" stroke-width="12" stroke-linecap="round"/><path d="M190 140 L210 160 M210 140 L190 160" stroke="%23ef4444" stroke-width="5"/><circle cx="200" cy="150" r="25" fill="none" stroke="%23ef4444" stroke-width="3" stroke-dasharray="4,4"/><text x="200" y="240" font-family="sans-serif" font-size="16" fill="%23f87171" text-anchor="middle">Weld 002 - Defect: Lack of Fusion</text></svg>';

export const initialJobs: Job[] = [
  {
    id: 'job-1',
    jobNumber: 'NDT-2026-0001',
    customerId: 'cust-1',
    siteId: 'site-1-1',
    inspectionDate: '2026-09-10',
    dueDate: '2026-09-12',
    inspectorId: 'insp-1',
    method: 'UT',
    scope: 'Ultrasonic thickness survey and weld integrity check on 6-inch high-pressure steam manifold spools.',
    standardSpec: 'ASME Section V Art. 4 & 5 / ASME B31.3 Table 341.3.2',
    equipmentIds: ['eq-1'],
    procedureId: 'proc-1',
    procedureNumber: 'WEP-UT-001',
    generalNotes: 'Inspections carried out at ambient temperature (~22°C). High-temperature couplant used where required.',
    surfaceCondition: 'Wire brushed & solvent degreased',
    temperature: '22°C',
    temperatureC: 22,
    ambientLight: 'Daylight / shop lighting',
    status: 'Completed',
    overallResult: 'PASS',
    reportNumber: 'REP-2026-0001',
    completedAt: '2026-09-10T14:45:00.000Z',
    inspectorComments: 'All measured thickness readings exceeded minimum design nominal (5.80mm). No laminar defects or recordable volumetric indications found. Approved for service.',
    signatureDataUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="260" height="80" viewBox="0 0 260 80"><path d="M 20,40 Q 50,10 80,45 T 140,35 Q 180,60 220,30 Q 240,40 250,20" fill="none" stroke="%230284c7" stroke-width="3" stroke-linecap="round"/></svg>',
    l3ReviewStatus: 'APPROVED',
    l3VerifierId: 'insp-l3-1',
    l3VerifierName: 'Dr. Johan Pretorius',
    l3CertNumber: 'ISO-9712-L3-ZA-0412',
    l3SignatureDataUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="260" height="80" viewBox="0 0 260 80"><path d="M 30,50 Q 70,20 100,55 T 160,30 Q 200,45 240,25" fill="none" stroke="%23059669" stroke-width="3" stroke-linecap="round"/></svg>',
    l3Comments: 'Verified calibration records, ASME B31.3 acceptance criteria, and probe certifications. Full technical approval granted.',
    l3ReviewedAt: '2026-09-10T16:15:00.000Z',
    auditTrail: [
      { id: 'aud-1', timestamp: '2026-09-09T08:00:00.000Z', actorName: 'System Admin', actorRole: 'Admin', action: 'JOB_CREATED', details: 'Job created and assigned to Thabo Mokoena (Method: UT). Linked to WEP-UT-001.' },
      { id: 'aud-1b', timestamp: '2026-09-09T08:05:00.000Z', actorName: 'System Admin', actorRole: 'Admin', action: 'EQUIPMENT_CHECKED_OUT', details: 'Olympus 27MG [SN-OLY-27MG-9482] deployed to job.' },
      { id: 'aud-2', timestamp: '2026-09-10T10:15:00.000Z', actorName: 'Thabo Mokoena', actorRole: 'Inspector', action: 'ITEM_ADDED', details: 'Added Weld 001 with 7.11mm reading (Pass).' },
      { id: 'aud-3', timestamp: '2026-09-10T14:45:00.000Z', actorName: 'Thabo Mokoena', actorRole: 'Inspector', action: 'INSPECTOR_SIGNED', details: 'Field inspection completed with Level 2 signature. Submitted for Level 3 QA review.' },
      { id: 'aud-4', timestamp: '2026-09-10T16:15:00.000Z', actorName: 'Dr. Johan Pretorius', actorRole: 'Level 3 Verifier', action: 'L3_APPROVED', details: 'Level 3 technical review passed. Certificate officially certified and released.' }
    ],
    items: [
      {
        id: 'item-1-1',
        itemNumber: 'Weld 001',
        description: '6-inch Schedule 40 Butt Weld - Line A Spool',
        reading: '7.11',
        unit: 'mm',
        acceptanceCriteria: 'Min wall 5.80mm / No planar flaws (ASME B31.3)',
        criterionId: 'crit-1',
        result: 'Pass',
        notes: 'Sound weld profile. Base metal thickness consistent at 7.11mm.',
        methodDetails: { thickness: '7.11', probe: 'Olympus 5MHz 0.5" Dual Element', surfaceCondition: 'Smooth / Wire brushed' },
        photos: [{ id: 'p-1', dataUrl: sampleWeldPhoto1, caption: 'Ultrasonic scanning grid across circumferential weld toe', timestamp: '2026-09-10T10:15:00.000Z' }],
        updatedAt: '2026-09-10T10:15:00.000Z'
      },
      {
        id: 'item-1-2',
        itemNumber: 'Weld 002',
        description: '6-inch Schedule 40 Elbow to Pipe Weld',
        reading: '6.95',
        unit: 'mm',
        acceptanceCriteria: 'Min wall 5.80mm / No planar flaws (ASME B31.3)',
        criterionId: 'crit-1',
        result: 'Pass',
        notes: 'Good penetration. No backwall attenuation detected.',
        methodDetails: { thickness: '6.95', probe: 'Olympus 5MHz 0.5" Dual Element', surfaceCondition: 'Cleaned' },
        photos: [],
        updatedAt: '2026-09-10T10:45:00.000Z'
      },
      {
        id: 'item-1-3',
        itemNumber: 'Pipe Section 04',
        description: 'Extrados bend curvature section',
        reading: '6.42',
        unit: 'mm',
        acceptanceCriteria: 'Min wall 5.50mm nominal',
        result: 'Pass',
        notes: 'Expected thinning on outer bend extrados within allowable design tolerance.',
        methodDetails: { thickness: '6.42', probe: 'Olympus 5MHz 0.5" Dual Element' },
        photos: [],
        updatedAt: '2026-09-10T11:10:00.000Z'
      }
    ],
    createdAt: '2026-09-09T08:00:00.000Z',
    updatedAt: '2026-09-10T16:15:00.000Z'
  },
  {
    id: 'job-1b',
    jobNumber: 'NDT-2026-0001B',
    customerId: 'cust-3',
    siteId: 'site-3-1',
    inspectionDate: '2026-08-20',
    dueDate: '2026-08-22',
    inspectorId: 'insp-1',
    method: 'VT',
    scope: 'Visual inspection of bogey frame welds — late completion demo for on-time KPI.',
    standardSpec: 'ISO 17637 / AWS D1.1 visual criteria',
    equipmentIds: ['eq-22'],
    generalNotes: 'Demo: completed after due date for inspector on-time chart.',
    surfaceCondition: 'As-welded',
    temperature: '18°C',
    temperatureC: 18,
    ambientLight: '950 Lux (shop)',
    status: 'Completed',
    overallResult: 'PASS',
    reportNumber: 'REP-2026-0001B',
    completedAt: '2026-08-25T11:00:00.000Z',
    inspectorComments: 'No relevant visual indications. Certificate issued after delayed site access.',
    signatureDataUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="260" height="80" viewBox="0 0 260 80"><path d="M 20,40 Q 50,10 80,45 T 140,35" fill="none" stroke="%230284c7" stroke-width="3"/></svg>',
    auditTrail: [
      { id: 'aud-1b-1', timestamp: '2026-08-18T08:00:00.000Z', actorName: 'System Admin', actorRole: 'Admin', action: 'JOB_CREATED', details: 'VT job created for Transnet yard.' },
      { id: 'aud-1b-2', timestamp: '2026-08-25T11:00:00.000Z', actorName: 'Thabo Mokoena', actorRole: 'Inspector', action: 'INSPECTOR_SIGNED', details: 'Completed after due date (site access delay).' }
    ],
    items: [
      {
        id: 'item-1b-1',
        itemNumber: 'Frame Weld A',
        description: 'Bogey side-frame fillet weld',
        acceptanceCriteria: 'No cracks, undercut ≤ 1mm',
        result: 'Pass',
        notes: 'No undercut beyond acceptance.',
        photos: [],
        updatedAt: '2026-08-25T10:30:00.000Z'
      }
    ],
    createdAt: '2026-08-18T08:00:00.000Z',
    updatedAt: '2026-08-25T11:00:00.000Z'
  },
  {
    id: 'job-2',
    jobNumber: 'NDT-2026-0002',
    customerId: 'cust-1',
    siteId: 'site-1-1',
    inspectionDate: '2026-09-11',
    dueDate: '2026-09-15',
    inspectorId: 'insp-1',
    method: 'MT',
    scope: 'Magnetic Particle inspection of structural lifting lugs & pad eyes on pressure vessel skid.',
    standardSpec: 'AWS D1.1 Clause 6 / ISO 17638 Level B',
    equipmentIds: ['eq-2'],
    generalNotes: 'Continuous AC wet method using black ink on white contrast paint.',
    surfaceCondition: 'White contrast paint applied on wire-brushed weld',
    temperature: '21°C',
    temperatureC: 21,
    ambientLight: '1200 Lux',
    status: 'In Progress',
    overallResult: 'PENDING',
    auditTrail: [
      { id: 'aud-2-1', timestamp: '2026-09-11T07:30:00.000Z', actorName: 'System Admin', actorRole: 'Admin', action: 'JOB_CREATED', details: 'Job created for Magnetic Testing.' },
      { id: 'aud-2-1b', timestamp: '2026-09-11T07:35:00.000Z', actorName: 'System Admin', actorRole: 'Admin', action: 'EQUIPMENT_CHECKED_OUT', details: 'Parker B300 Yoke [SN-PKR-B300-4821] deployed to job.' },
      { id: 'aud-2-2', timestamp: '2026-09-11T08:30:00.000Z', actorName: 'Thabo Mokoena', actorRole: 'Inspector', action: 'ITEM_ADDED', details: 'Lug 01 - North inspected (Pass).' },
      { id: 'aud-2-3', timestamp: '2026-09-11T08:45:00.000Z', actorName: 'Thabo Mokoena', actorRole: 'Inspector', action: 'ITEM_ADDED', details: 'Lug 02 - South inspected: 18mm crack indication recorded (Fail).' }
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
        photos: [{ id: 'p-2-1', dataUrl: sampleWeldPhoto1, caption: 'North lifting lug magnetic yoke testing under 1200 lux light', timestamp: '2026-09-11T08:30:00.000Z' }],
        updatedAt: '2026-09-11T08:30:00.000Z'
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
        methodDetails: { technique: 'AC Contour Yoke', indication: '18mm toe crack', location: 'South gusset 3 o\'clock position', lightLevel: '1150 Lux' },
        photos: [{ id: 'p-2-2', dataUrl: sampleWeldPhoto2, caption: '18mm linear crack indication highlighted by magnetic particle buildup', timestamp: '2026-09-11T08:45:00.000Z' }],
        updatedAt: '2026-09-11T08:45:00.000Z'
      }
    ],
    createdAt: '2026-09-11T07:30:00.000Z',
    updatedAt: '2026-09-11T08:45:00.000Z'
  },
  {
    id: 'job-3',
    jobNumber: 'NDT-2026-0003',
    customerId: 'cust-2',
    siteId: 'site-2-1',
    inspectionDate: '2026-09-12',
    dueDate: '2026-09-18',
    inspectorId: 'insp-4',           // Level 1 technician (UT/MT)
    supervisorId: 'insp-1',          // Thabo Mokoena L2 — valid UT supervisor
    method: 'UT',
    scope: 'Ultrasonic thickness survey of newly installed carbon steel process piping spools under Level 2 supervision.',
    standardSpec: 'ASME Section V Art. 4 / ASME B31.3',
    equipmentIds: ['eq-1'],
    generalNotes: 'Level 1 records readings only. Supervising Level 2 evaluates acceptance.',
    surfacePrepInstruction: 'Client to wire brush and degrease prior to arrival',
    status: 'Assigned',
    overallResult: 'PENDING',
    procedureId: 'proc-1',
    procedureNumber: 'WEP-UT-001',
    auditTrail: [
      { id: 'aud-3-1', timestamp: '2026-09-11T09:00:00.000Z', actorName: 'System Admin', actorRole: 'Admin', action: 'JOB_CREATED', details: 'UT job created for Sasol site — Level 1 with supervisor.' },
      { id: 'aud-3-2', timestamp: '2026-09-11T09:00:00.000Z', actorName: 'System Admin', actorRole: 'Admin', action: 'JOB_ASSIGNED', details: 'Level 1 technician Lesego Nkosi assigned. Supervisor: Thabo Mokoena (valid UT cert). Field records as-found conditions after Start work.' }
    ],
    items: [],
    createdAt: '2026-09-11T09:00:00.000Z',
    updatedAt: '2026-09-11T09:00:00.000Z'
  },
  {
    id: 'job-4',
    jobNumber: 'NDT-2026-0004',
    customerId: 'cust-1',
    siteId: 'site-1-1',
    inspectionDate: '2026-09-12',
    dueDate: '2026-09-13',
    inspectorId: 'insp-4',
    supervisorId: 'insp-1',
    method: 'UT',
    scope: 'Ultrasonic thickness survey — Level 1 findings awaiting supervising Level 2 evaluation.',
    standardSpec: 'ASME Section V / ASME B31.3',
    equipmentIds: ['eq-1'],
    procedureId: 'proc-1',
    procedureNumber: 'WEP-UT-001',
    generalNotes: 'Demo job: Lesego submitted findings; Thabo must evaluate Pass/Fail on each item.',
    surfaceCondition: 'Wire brushed',
    temperature: '22°C',
    temperatureC: 22,
    status: 'Awaiting Supervisor',
    overallResult: 'PENDING',
    findingsRevision: 1,
    findingsHistory: [],
    signatureDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mNk+M9Qz0AEYBxVSF+FABJADveWkH6dAAAAAElFTkSuQmCC',
    inspectorComments: 'Findings recorded per written instruction. Submitted for supervisor evaluation.',
    auditTrail: [
      { id: 'aud-4-1', timestamp: '2026-09-12T07:00:00.000Z', actorName: 'System Admin', actorRole: 'Admin', action: 'JOB_CREATED', details: 'L1 supervised UT job created for demo handoff.' },
      { id: 'aud-4-2', timestamp: '2026-09-12T08:30:00.000Z', actorName: 'Lesego Nkosi', actorRole: 'Inspector', action: 'ITEM_ADDED', details: 'Added inspection item Weld 001 (Pending — 6.12 mm).' },
      { id: 'aud-4-3', timestamp: '2026-09-12T08:45:00.000Z', actorName: 'Lesego Nkosi', actorRole: 'Inspector', action: 'ITEM_ADDED', details: 'Added inspection item Weld 002 (Pending — 5.95 mm).' },
      { id: 'aud-4-4', timestamp: '2026-09-12T09:00:00.000Z', actorName: 'Lesego Nkosi', actorRole: 'Inspector', action: 'SUBMITTED_TO_SUPERVISOR', details: 'Level 1 findings submitted to supervisor Thabo Mokoena for evaluation (2 items).' },
      { id: 'aud-4-5', timestamp: '2026-09-12T09:00:00.000Z', actorName: 'Lesego Nkosi', actorRole: 'Inspector', action: 'INSPECTOR_SIGNED', details: 'Level 1 technician signed findings record.' }
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
        photos: [{ id: 'p-4-1', dataUrl: sampleWeldPhoto1, caption: 'UT scan zone — Weld 001', timestamp: '2026-09-12T08:30:00.000Z' }],
        updatedAt: '2026-09-12T08:30:00.000Z'
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
        indication: 'Reading near minimum; no planar indication classified by Level 1',
        notes: 'Supervisor to confirm acceptance against ASME B31.3',
        methodDetails: { thickness: '5.95', probe: 'Olympus 5MHz 0.5" Dual Element', couplant: 'Ultragel II' },
        photos: [{ id: 'p-4-2', dataUrl: sampleWeldPhoto1, caption: 'UT scan zone — Weld 002', timestamp: '2026-09-12T08:45:00.000Z' }],
        updatedAt: '2026-09-12T08:45:00.000Z'
      }
    ],
    createdAt: '2026-09-12T07:00:00.000Z',
    updatedAt: '2026-09-12T09:00:00.000Z'
  },
  {
    id: 'job-5',
    jobNumber: 'NDT-2026-0005',
    customerId: 'cust-2',
    siteId: 'site-2-1',
    inspectionDate: '2026-09-12',
    dueDate: '2026-09-16',
    inspectorId: 'insp-4',
    supervisorId: 'insp-1',
    method: 'MT',
    scope: 'Magnetic particle — Level 1 findings rejected; revision required.',
    standardSpec: 'AWS D1.1 Clause 6 / ISO 17638',
    equipmentIds: ['eq-2'],
    procedureId: 'proc-2',
    procedureNumber: 'WEP-MT-001',
    generalNotes: 'Demo reject path: Thabo rejected rev 1; Lesego must revise.',
    surfaceCondition: 'Contrast paint applied',
    temperature: '23°C',
    temperatureC: 23,
    ambientLight: '1100 Lux',
    status: 'Revision Required',
    overallResult: 'PENDING',
    findingsRevision: 1,
    supervisorRejectionReason: 'Indication notes incomplete on Weld 001 — re-scan stop-start and record indication length/location before resubmit.',
    supervisorRejectedAt: '2026-09-12T10:15:00.000Z',
    supervisorRejectedByName: 'Thabo Mokoena',
    signatureDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mNk+M9Qz0AEYBxVSF+FABJADveWkH6dAAAAAElFTkSuQmCC',
    inspectorComments: 'Initial findings submitted.',
    findingsHistory: [
      {
        revision: 1,
        submittedAt: '2026-09-12T09:30:00.000Z',
        signatureDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mNk+M9Qz0AEYBxVSF+FABJADveWkH6dAAAAAElFTkSuQmCC',
        inspectorComments: 'Initial findings submitted.',
        rejectionReason: 'Indication notes incomplete on Weld 001 — re-scan stop-start and record indication length/location before resubmit.',
        rejectedAt: '2026-09-12T10:15:00.000Z',
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
            updatedAt: '2026-09-12T09:20:00.000Z'
          }
        ]
      }
    ],
    auditTrail: [
      { id: 'aud-5-1', timestamp: '2026-09-12T08:00:00.000Z', actorName: 'System Admin', actorRole: 'Admin', action: 'JOB_CREATED', details: 'MT L1 job for reject/supersede demo.' },
      { id: 'aud-5-2', timestamp: '2026-09-12T09:30:00.000Z', actorName: 'Lesego Nkosi', actorRole: 'Inspector', action: 'SUBMITTED_TO_SUPERVISOR', details: 'Findings rev 1 submitted.' },
      { id: 'aud-5-3', timestamp: '2026-09-12T10:15:00.000Z', actorName: 'Thabo Mokoena', actorRole: 'Supervisor', action: 'SUPERVISOR_REJECTED', details: 'Rejected rev 1 — incomplete indication notes.', rejectionReason: 'Indication notes incomplete on Weld 001 — re-scan stop-start and record indication length/location before resubmit.' }
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
        photos: [{ id: 'p-5-1', dataUrl: sampleWeldPhoto2, caption: 'MT indication zone — needs clearer length note', timestamp: '2026-09-12T09:20:00.000Z' }],
        updatedAt: '2026-09-12T10:15:00.000Z'
      }
    ],
    createdAt: '2026-09-12T08:00:00.000Z',
    updatedAt: '2026-09-12T10:15:00.000Z'
  },
  {
    id: 'job-draft-1',
    jobNumber: 'NDT-2026-0006',
    customerId: 'cust-2',
    siteId: 'site-2-1',
    inspectionDate: '2026-09-16',
    dueDate: '2026-09-20',
    inspectorId: '',
    method: 'UT',
    scope: 'Ultrasonic thickness survey and weld volumetric examination',
    standardSpec: 'ASME Section V / ASME B31.3',
    equipmentIds: [],
    generalNotes: 'Draft work order — finish people, procedure, and kit before Assign.',
    status: 'Draft',
    overallResult: 'PENDING',
    auditTrail: [
      {
        id: 'aud-draft-1',
        timestamp: '2026-09-14T10:00:00.000Z',
        actorName: 'System Admin',
        actorRole: 'Admin',
        action: 'JOB_DRAFT_SAVED',
        details: 'Draft job NDT-2026-0006 saved (Work step only) for wizard demo.'
      }
    ],
    items: [],
    createdAt: '2026-09-14T10:00:00.000Z',
    updatedAt: '2026-09-14T10:00:00.000Z'
  }
];

// ─── Acceptance Criteria Library ─────────────────────────────────────────────

export const initialAcceptanceCriteria: AcceptanceCriterion[] = [
  {
    id: 'crit-1',
    label: 'ASME B31.3 — Pressure Piping Minimum Wall',
    method: 'UT',
    standardRef: 'ASME B31.3 Table 304.1.2 / Table 341.3.2',
    description: 'Minimum nominal wall thickness ≥ 5.80mm for Schedule 40 carbon steel piping DN150. No planar or laminar indications permitted.',
    createdByL3Id: 'insp-l3-1',
    createdAt: '2026-01-10T09:00:00.000Z',
    isActive: true,
    ruleType: 'NumericMin',
    valueMin: 5.8,
    valueUnit: 'mm'
  },
  {
    id: 'crit-2',
    label: 'AWS D1.1 — Structural MT Welds (Class B)',
    method: 'MT',
    standardRef: 'AWS D1.1 Clause 6.10.2 (Visual & MT)',
    description: 'No cracks, linear indications, or rounded indications > 1.5mm. No groups of more than 4 aligned pores in any 150mm length of weld.',
    createdByL3Id: 'insp-l3-1',
    createdAt: '2026-01-10T09:30:00.000Z',
    isActive: true,
    ruleType: 'NumericMax',
    valueMax: 1.5,
    valueUnit: 'mm'
  },
  {
    id: 'crit-3',
    label: 'ASME Section V Art. 6 — Liquid Penetrant (PT)',
    method: 'PT',
    standardRef: 'ASME Section V Art. 6 / ISO 3452-1',
    description: 'No relevant linear indications. Rounded indications > 4.8mm not permitted. Adjacent relevant indications < 1.6mm edge-to-edge separation treated as single indication.',
    createdByL3Id: 'insp-l3-1',
    createdAt: '2026-01-10T10:00:00.000Z',
    isActive: true,
    ruleType: 'NumericMax',
    valueMax: 4.8,
    valueUnit: 'mm'
  },
  {
    id: 'crit-4',
    label: 'ASME B31.3 — Visual Inspection (VT) Final Welds',
    method: 'VT',
    standardRef: 'ASME B31.3 Table 341.3.2',
    description: 'No cracks, incomplete fusion, or incomplete penetration. Undercut ≤ 0.8mm depth for single pass welds. Cap reinforcement ≤ 3mm above base metal surface.',
    createdByL3Id: 'insp-l3-1',
    createdAt: '2026-01-10T10:30:00.000Z',
    isActive: true,
    ruleType: 'NumericMax',
    valueMax: 0.8,
    valueUnit: 'mm'
  }
];

// ─── Written Examination Procedures ──────────────────────────────────────────

export const initialProcedures: NdtProcedure[] = [
  {
    id: 'proc-1',
    procedureNumber: 'WEP-UT-001',
    title: 'Ultrasonic Thickness Survey — Carbon Steel Pressure Piping',
    method: 'UT',
    revisionNumber: 'Rev 3',
    scope: 'Applies to ASME B31.3 carbon steel pressure piping ≥ DN50. Manual contact pulse-echo and dual-element techniques for remaining wall thickness measurement.',
    standardRef: 'ASME Section V Art. 4 & 5 / ASME B31.3 / SANS 17020',
    equipmentRequired: ['Ultrasonic Thickness Gauge (A-scan capable)', '5-step carbon steel calibration block', 'High-temperature couplant gel'],
    equipmentSlots: [
      { id: 'slot-ut-gauge', label: 'Ultrasonic thickness gauge', category: 'Ultrasonic', typeHint: 'Thickness', quantity: 1, calibrationRequired: true },
      { id: 'slot-ut-block', label: 'Calibration / reference block', category: 'General', typeHint: 'block', quantity: 1, calibrationRequired: false, notes: '5-step carbon steel preferred' }
    ],
    surface: 'Wire brushed, solvent degreased (no loose mill scale or moisture)',
    temperature: '0°C – 60°C surface temperature',
    temperatureRanges: [{ min: 0, max: 60, unit: '°C', kind: 'surface', required: true }],
    acceptanceCriteria: [initialAcceptanceCriteria[0]],
    generalNotes: 'Calibrate before first measurement and after every 30-minute interval or significant temperature change. Record pre- and post-calibration checks.',
    status: 'Active',
    authorId: 'insp-l3-1',
    approvedByL3Id: 'insp-l3-1',
    approvedByL3Name: 'Dr. Johan Pretorius',
    approvedAt: '2026-01-15T14:00:00.000Z',
    createdAt: '2026-01-10T09:00:00.000Z',
    updatedAt: '2026-01-15T14:00:00.000Z'
  },
  {
    id: 'proc-2',
    procedureNumber: 'WEP-MT-001',
    title: 'Magnetic Particle Inspection — Structural Welds & Lifting Lugs',
    method: 'MT',
    revisionNumber: 'Rev 2',
    scope: 'Surface-breaking and near-surface discontinuity detection on carbon steel structural welds per AWS D1.1. Wet continuous AC yoke technique with black ink on white contrast.',
    standardRef: 'AWS D1.1 Clause 6 / ISO 17638 / SANS 17020',
    equipmentRequired: ['AC/DC Electromagnetic Yoke (min 4.5kg lift force verified)', 'Black magnetic ink (water-based)', 'White contrast paint', 'Calibrated lux meter (min 1000 lux)'],
    equipmentSlots: [
      { id: 'slot-mt-yoke', label: 'Electromagnetic yoke', category: 'Magnetic Particle', typeHint: 'Yoke', quantity: 1, calibrationRequired: true },
      { id: 'slot-mt-lux', label: 'Illumination / lux meter', category: 'General', typeHint: 'Lux', quantity: 1, calibrationRequired: true }
    ],
    surface: 'Contrast paint applied over wire-brushed and degreased surface',
    temperature: '10°C – 50°C',
    temperatureRanges: [{ min: 10, max: 50, unit: '°C', kind: 'ambient', required: true }],
    acceptanceCriteria: [initialAcceptanceCriteria[1]],
    generalNotes: 'Perform lift test at start and end of each shift. Overlap inspection paths by minimum 10%. Observe dwell time ≥ 5 seconds per yoke position.',
    status: 'Active',
    authorId: 'insp-l3-1',
    approvedByL3Id: 'insp-l3-1',
    approvedByL3Name: 'Dr. Johan Pretorius',
    approvedAt: '2026-02-01T11:00:00.000Z',
    createdAt: '2026-01-28T10:00:00.000Z',
    updatedAt: '2026-02-01T11:00:00.000Z'
  },
  {
    id: 'proc-3',
    procedureNumber: 'WEP-PT-001',
    title: 'Liquid Penetrant Testing — Stainless Steel & Aluminium Welds',
    method: 'PT',
    revisionNumber: 'Rev 1',
    scope: 'Visible and fluorescent dye penetrant testing for surface-breaking defects on austenitic stainless steel, aluminium, and non-magnetic materials.',
    standardRef: 'ASME Section V Art. 6 / ISO 3452-1 / SANS 17020',
    equipmentRequired: ['Type II visible red dye penetrant (SKL-SP2)', 'Non-aqueous developer (SKD-S2)', 'Cleaner/remover (SKC-S)', 'Calibrated white light meter (≥1000 lux)', 'Timer'],
    equipmentSlots: [
      { id: 'slot-pt-kit', label: 'Penetrant system / kit', category: 'Liquid Penetrant', typeHint: 'Penetrant', quantity: 1, calibrationRequired: false },
      { id: 'slot-pt-lux', label: 'White light / lux meter', category: 'General', typeHint: 'Lux', quantity: 1, calibrationRequired: true }
    ],
    surface: 'Solvent cleaned, free from oil, grease, coatings, and moisture',
    temperature: '10°C – 50°C',
    temperatureRanges: [{ min: 10, max: 50, unit: '°C', kind: 'ambient', required: true }],
    acceptanceCriteria: [initialAcceptanceCriteria[2]],
    generalNotes: 'Penetrant dwell time: minimum 10 minutes. Developer dwell time: minimum 7 minutes before interpretation. Record ambient light level in lux.',
    status: 'Draft',
    authorId: 'insp-l3-1',
    createdAt: '2026-03-05T09:00:00.000Z',
    updatedAt: '2026-03-05T09:00:00.000Z'
  }
];

// ─── Equipment Incidents ──────────────────────────────────────────────────────

export const initialIncidents: EquipmentIncident[] = [
  {
    id: 'inc-1',
    equipmentId: 'eq-3',
    equipmentName: 'Magnaflux Spotcheck Penetrant Kit & Lux Meter',
    serialNumber: 'SN-MAG-SKL-0192',
    type: 'Broken',
    description: 'Lux meter screen cracked during site transport. The display is unreadable. Equipment cannot be used for PT inspections requiring light level verification.',
    reportedByName: 'Sipho Zulu',
    reportedByRole: 'Inspector',
    reportedAt: '2026-09-12T08:15:00.000Z',
    status: 'Open'
  }
];
