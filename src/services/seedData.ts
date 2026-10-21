import {
  Customer, Inspector, Equipment, Job, CompanySettings,
  NdtProcedure, EquipmentIncident, AcceptanceCriterion
} from '../types';

import {
  workshopCustomers,
  workshopInspectors,
  workshopEquipment
} from './seedWorkshopRoster';
import { buildSeedJobs } from './seedJobs';
import { daysFromToday, isoDateTime } from './seedDateUtils';

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

/** ~50 jobs: curated walkthrough scenarios + bulk ~90-day history + near-future. */
export const initialJobs: Job[] = buildSeedJobs();

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
    status: 'Active',
    authorId: 'insp-l3-1',
    approvedByL3Id: 'insp-l3-1',
    approvedByL3Name: 'Dr. Johan Pretorius',
    approvedAt: '2026-03-12T10:00:00.000Z',
    createdAt: '2026-03-05T09:00:00.000Z',
    updatedAt: '2026-03-12T10:00:00.000Z'
  },
  {
    id: 'proc-4',
    procedureNumber: 'WEP-VT-001',
    title: 'Visual Inspection — Final Fabrication Welds',
    method: 'VT',
    revisionNumber: 'Rev 1',
    scope: 'Direct visual examination of completed carbon steel and stainless fabrication welds for surface discontinuities per ASME B31.3 / ISO 17637.',
    standardRef: 'ASME B31.3 Table 341.3.2 / ISO 17637 / SANS 17020',
    equipmentRequired: ['Calibrated lux meter (min 500 lux direct VT)', 'Weld gauge / undercut gauge', 'Mirror and flashlight for restricted access'],
    equipmentSlots: [
      { id: 'slot-vt-lux', label: 'Illumination / lux meter', category: 'General', typeHint: 'Lux', quantity: 1, calibrationRequired: true }
    ],
    surface: 'As-welded or lightly cleaned; paint/coating removed in examination zone when specified',
    temperature: '5°C – 40°C ambient',
    temperatureRanges: [{ min: 5, max: 40, unit: '°C', kind: 'ambient', required: true }],
    acceptanceCriteria: [initialAcceptanceCriteria[3]],
    generalNotes: 'Record ambient lux at the examination surface. Photograph any relevant indication with scale reference.',
    status: 'Active',
    authorId: 'insp-l3-1',
    approvedByL3Id: 'insp-l3-1',
    approvedByL3Name: 'Dr. Johan Pretorius',
    approvedAt: '2026-02-20T09:00:00.000Z',
    createdAt: '2026-02-15T09:00:00.000Z',
    updatedAt: '2026-02-20T09:00:00.000Z'
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
    reportedAt: isoDateTime(daysFromToday(-14), 8, 15),
    status: 'Open'
  }
];
