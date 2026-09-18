export type NdtMethod = 'UT' | 'MT' | 'PT' | 'VT';

export type JobStatus = 'Draft' | 'Assigned' | 'In Progress' | 'Awaiting Supervisor' | 'Revision Required' | 'Completed';

export type OverallResult = 'PASS' | 'FAIL' | 'PENDING';

export type ItemResult = 'Pass' | 'Fail' | 'N/A' | 'Pending';

/** Who is viewing/acting on a job in the field cockpit */
export type JobViewerRole = 'lead_l1' | 'supervisor' | 'lead_l2_plus' | 'admin' | 'l3';

export type L3ReviewStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';

/** Equipment checkout/traceability status */
export type EquipmentCheckoutStatus =
  | 'Available'
  | 'On Job'
  | 'In Maintenance'
  | 'Incident Reported';

/** Incident severity/type for equipment */
export type EquipmentIncidentType =
  | 'Stolen'
  | 'Broken'
  | 'Lost'
  | 'Tampered'
  | 'Damaged'
  | 'Other';

export type IncidentStatus = 'Open' | 'Under Review' | 'Resolved';

/** Status of a written examination procedure */
export type ProcedureStatus = 'Draft' | 'Active' | 'Superseded';

export type AuditAction =
  | 'JOB_CREATED'
  | 'JOB_ASSIGNED'
  | 'JOB_STARTED'
  | 'ITEM_ADDED'
  | 'ITEM_UPDATED'
  | 'ITEM_DELETED'
  | 'INSPECTOR_SIGNED'
  | 'SUBMITTED_TO_SUPERVISOR'
  | 'ITEM_EVALUATED'
  | 'SUPERVISOR_REJECTED'
  | 'FINDINGS_SUPERSEDED'
  | 'SUPERVISOR_SIGNED'
  | 'L3_APPROVED'
  | 'L3_REJECTED'
  | 'L3_REVOKED'
  | 'JOB_REOPENED'
  | 'CALIBRATION_RENEWED'
  | 'REPORT_GENERATED'
  | 'EQUIPMENT_CHECKED_OUT'
  | 'EQUIPMENT_RETURNED'
  | 'INCIDENT_REPORTED'
  | 'INCIDENT_RESOLVED'
  | 'PROCEDURE_CREATED'
  | 'PROCEDURE_UPDATED'
  | 'PROCEDURE_APPROVED'
  | 'PROCEDURE_SNAPSHOT'
  | 'PROCEDURE_SNAPSHOT_REPLACE'
  | 'FINAL_WITHOUT_L3'
  | 'MARK_DELIVERED'
  | 'AUDIT_PACK_EXPORTED'
  | 'JOB_DRAFT_SAVED'
  | 'EXAM_CONDITIONS_UPDATED';

export interface AuditEntry {
  id: string;
  timestamp: string;
  actorName: string;
  actorRole: 'Inspector' | 'Level 3 Verifier' | 'Admin' | 'Supervisor';
  action: AuditAction;
  details: string;
  rejectionReason?: string;
}

export interface Site {
  id: string;
  name: string;
  address: string;
}

export interface Customer {
  id: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  sites: Site[];
  notes?: string;
  createdAt: string;
}

export interface Inspector {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  certification: string; // e.g., "SAQCC / ISO 9712 Level 2" or "ISO 9712 Level 3"
  certNumber: string;    // e.g., "SAQCC-NDT-8492"
  level: 'Level 1' | 'Level 2' | 'Level 3';
  certExpiryDate: string; // YYYY-MM-DD — legacy summary; assignment uses methodCertificates
  methods: NdtMethod[];  // UT, MT, PT, VT — derived from methodCertificates when present
  /** Per-method ISO 9712 / SAQCC certificates (assignment source of truth) */
  methodCertificates?: MethodCertificate[];
  /** For Level 1 technicians: the ID of their supervising Level 2 or Level 3 */
  defaultSupervisorId?: string;
  notes?: string;
  /** Employer near-vision acuity expiry (YYYY-MM-DD) — assign hard-block if missing/expired */
  visionAcuityExpiryDate?: string;
  /** Employer operating authorization cleared (default true when undefined) */
  employerAuthorized?: boolean;
  authorizationNotes?: string;
}

export type MethodCertVerificationStatus = 'PendingVerification' | 'Verified' | 'Rejected';

/** Employer-held method certificate record (upload + verify). Verified ≠ certification-body issuance. */
export interface MethodCertificate {
  id: string;
  method: NdtMethod;
  level: 'Level 1' | 'Level 2' | 'Level 3';
  certNumber: string;
  issuer: string;
  issueDate: string;
  expiryDate: string;
  documentDataUrl?: string;
  documentFileName?: string;
  verificationStatus: MethodCertVerificationStatus;
  verifiedAt?: string;
  verifiedByName?: string;
  rejectionReason?: string;
}

export interface CalibrationRecord {
  id: string;
  calDate: string;
  calExpiryDate: string;
  certificateNumber: string; // e.g. "CAL-SANAS-2026-904"
  laboratory: string;        // e.g. "Fluke Cal Lab / SANAS Accredited"
  referenceStandard: string; // e.g. "5-step carbon steel calibration block"
  performedBy: string;       // e.g. "K. Naidoo (SANAS Metrologist)"
  result: 'PASS' | 'FAIL';
  notes?: string;
  timestamp: string;
}

/** Traceability log entry for equipment checkout/return */
export interface EquipmentTraceabilityEntry {
  id: string;
  timestamp: string;
  action: 'Checked Out' | 'Returned' | 'Incident Reported' | 'Incident Resolved' | 'Maintenance In' | 'Maintenance Out';
  jobId?: string;
  jobNumber?: string;
  inspectorName?: string;
  notes?: string;
}

export interface Equipment {
  id: string;
  name: string;          // e.g., "Olympus 27MG Ultrasonic Gauge"
  type: string;          // e.g., "Ultrasonic Thickness Gauge"
  serialNumber: string;  // e.g., "SN-849201-UT"
  category?: 'Ultrasonic' | 'Magnetic Particle' | 'Liquid Penetrant' | 'Visual / Optical' | 'General';
  status?: 'Operational' | 'Due Soon' | 'Expired' | 'Out of Service';
  calibrationDate: string; // YYYY-MM-DD
  calibrationExpiryDate: string; // YYYY-MM-DD
  calibrationHistory?: CalibrationRecord[];

  /** Live traceability / possession state */
  checkoutStatus?: EquipmentCheckoutStatus;
  currentJobId?: string;   // Job ID it's currently deployed on
  currentJobNumber?: string;
  checkedOutTo?: string;   // Inspector name
  checkedOutAt?: string;   // ISO timestamp

  /** Full possession history */
  traceabilityLog?: EquipmentTraceabilityEntry[];

  /** Current calibration certificate document (employer file — mock upload) */
  calibrationCertificate?: {
    certificateNumber: string;
    laboratory: string;
    documentDataUrl?: string;
    documentFileName?: string;
    uploadedAt?: string;
  };

  notes?: string;
}

/** An equipment incident report raised by a technician or admin */
export interface EquipmentIncident {
  id: string;
  equipmentId: string;
  equipmentName: string;
  serialNumber: string;
  type: EquipmentIncidentType;
  description: string;
  reportedByName: string;
  reportedByRole: string;
  reportedAt: string;
  jobId?: string;          // Job during which the incident occurred
  jobNumber?: string;
  status: IncidentStatus;
  adminNotes?: string;
  resolvedAt?: string;
  resolvedByName?: string;
}

/** A reusable acceptance criterion from the L3-managed library */
export type CriterionRuleType = 'NumericMin' | 'NumericMax' | 'NumericRange' | 'TextOnlyLegacy';

export interface AcceptanceCriterion {
  id: string;
  label: string;          // e.g., "ASME B31.3 — Minimum Wall Thickness"
  method: NdtMethod;
  standardRef: string;    // e.g., "ASME B31.3 Table 304.1.2"
  description: string;    // e.g., "Minimum nominal wall thickness 5.50mm; no planar indications"
  createdByL3Id: string;
  createdAt: string;
  isActive: boolean;
  /** Structured compare rule — TextOnlyLegacy / missing = non-comparable */
  ruleType?: CriterionRuleType;
  valueMin?: number;
  valueMax?: number;
  valueUnit?: string;
  /** Explicit skip for auto-compare (qualitative-only criteria) */
  nonComparable?: boolean;
}

export type TempRangeKind = 'ambient' | 'surface' | 'couplant';

export interface TemperatureRange {
  min: number;
  max: number;
  unit: '°C' | '°F';
  kind: TempRangeKind;
  required?: boolean;
}

export interface ProcedureEquipmentSlot {
  id: string;
  label: string;
  category: NonNullable<Equipment['category']>;
  typeHint?: string;
  quantity: number;
  calibrationRequired: boolean;
  notes?: string;
}

/** Advisory flags from procedure / criteria compare (never auto-write Pass/Fail) */
export type ConstraintFlag =
  | 'OUTSIDE_CRITERION'
  | 'OUTSIDE_PROC_TEMP'
  | 'EQUIP_SLOT_MISMATCH';

/** Written Examination Procedure (WEP) — authored and approved by Level 3 */
export interface NdtProcedure {
  id: string;
  procedureNumber: string;  // e.g., "WEP-UT-001"
  title: string;            // e.g., "Ultrasonic Thickness Survey — Pressure Piping"
  method: NdtMethod;
  revisionNumber: string;   // e.g., "Rev 3"
  scope: string;            // e.g., "Applies to ASME B31.3 carbon steel piping ≥ DN50"
  standardRef: string;      // e.g., "ASME Section V Art. 4 / ASME B31.3"
  /** Legacy free-text list — prefer equipmentSlots for compare/suggest */
  equipmentRequired: string[];
  /** Structured equipment requirement slots (category → register suggest) */
  equipmentSlots?: ProcedureEquipmentSlot[];
  surface: string;          // e.g., "Wire brushed and solvent degreased"
  /** Legacy display string — prefer temperatureRanges for compare */
  temperature: string;
  temperatureRanges?: TemperatureRange[];
  acceptanceCriteria: AcceptanceCriterion[];
  generalNotes?: string;
  status: ProcedureStatus;
  authorId: string;         // L3 who wrote it
  approvedByL3Id?: string;  // L3 who approved it (may differ)
  approvedByL3Name?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ItemMethodDetails {
  // UT specific
  thickness?: string;
  probe?: string;
  couplant?: string;
  surfaceCondition?: string;
  // MT / PT specific
  technique?: string;     // e.g., "AC Yoke / Fluorescent Wet"
  indication?: string;    // e.g., "Linear crack at weld toe"
  location?: string;      // e.g., "Clock 3 o'clock position"
  dwellTime?: string;     // e.g., "15 mins"
  lightLevel?: string;    // e.g., "1150 Lux"
  // VT specific
  observation?: string;   // e.g., "Undercutting < 0.5mm"
  defectType?: string;    // e.g., "Lack of fusion"
}

export interface InspectionPhoto {
  id: string;
  dataUrl: string;
  caption?: string;
  timestamp: string;
}

export interface InspectionItem {
  id: string;
  itemNumber: string;       // e.g., "Weld 001", "Pipe Section A"
  description: string;      // e.g., "6-inch Schedule 40 Butt Weld"
  reading?: string;         // e.g., "7.11"
  unit?: string;            // e.g., "mm", "dB", "Lux", "kg", "%"
  acceptanceCriteria: string; // e.g., "ASME B31.3 Table 341.3.2" or "Min 5.5mm"
  /** Optional link back to the library criterion used */
  criterionId?: string;
  /** Advisory compare flags — never treated as evaluated Pass/Fail */
  constraintFlags?: ConstraintFlag[];
  /** Operator note when proceeding outside advisory band / temp */
  operatorNote?: string;
  result: ItemResult;
  indication?: string;      // defect or indication note
  notes?: string;
  methodDetails?: ItemMethodDetails;
  photos: InspectionPhoto[];
  updatedAt: string;
}

/** Frozen copy of WEP + criteria bound to a job (procedure control) */
export interface ProcedureSnapshot {
  procedureId: string;
  procedureNumber: string;
  title: string;
  method: NdtMethod;
  revisionNumber: string;
  standardRef?: string;
  acceptanceCriteria: AcceptanceCriterion[];
  temperatureRanges?: TemperatureRange[];
  temperature?: string;
  equipmentSlots?: ProcedureEquipmentSlot[];
  snapshotAt: string;
  snapshotSource: 'assign' | 'start' | 'replace';
  replacedReason?: string;
}

export interface FindingsRevisionSnapshot {
  revision: number;
  items: InspectionItem[];
  submittedAt: string;
  signatureDataUrl?: string;
  inspectorComments?: string;
  rejectionReason?: string;
  rejectedAt?: string;
  rejectedByName?: string;
}

export interface Job {
  id: string;
  jobNumber: string;        // e.g., "NDT-2026-0001"
  customerId: string;
  siteId: string;
  inspectionDate: string;   // YYYY-MM-DD
  /** Optional client / internal delivery due date (YYYY-MM-DD) — ops KPI only */
  dueDate?: string;
  inspectorId: string;
  method: NdtMethod;
  scope: string;            // e.g., "Ultrasonic thickness measurement of boiler feed lines"
  standardSpec: string;     // e.g., "ASME Section V / SANS 17020"

  /** Multi-equipment support — replaces the old single equipmentId */
  equipmentIds: string[];

  /** Level 1 supervision — required when lead inspector is Level 1 */
  supervisorId?: string;

  /** Optional link to the L3-approved written examination procedure */
  procedureId?: string;
  procedureNumber?: string;
  /** Frozen WEP + criteria at assign/start — source of truth for field/PDF after freeze */
  procedureSnapshot?: ProcedureSnapshot;

  generalNotes?: string;
  /** Client / planned surface prep note (work order) — not certificate as-found */
  surfacePrepInstruction?: string;
  /** As-found surface condition recorded on site for the examination */
  surfaceCondition?: string;
  /** Legacy display string — keep synced from temperatureC as `${n}°C` */
  temperature?: string;
  /** Measured examination temperature (°C) — canonical */
  temperatureC?: number;
  /** Ambient / examination light as recorded (e.g. "850 Lux") — required for VT/MT at submit */
  ambientLight?: string;
  /** Required when submitting L1 findings while outside WEP temp range */
  temperatureOutOfRangeReason?: string;
  /** Optional slot → equipment assignment from WEP */
  equipmentBySlot?: { slotId: string; equipmentId: string }[];
  status: JobStatus;
  overallResult: OverallResult;
  items: InspectionItem[];

  /** Current findings revision number (starts at 1) */
  findingsRevision?: number;
  /** Prior submitted findings sets (audit history only — not editable) */
  findingsHistory?: FindingsRevisionSnapshot[];

  // Level 2 Field Sign-off
  signatureDataUrl?: string;
  inspectorComments?: string;
  completedAt?: string;
  reportNumber?: string;    // e.g., "REP-2026-0001"

  // Supervisor co-sign (when lead is Level 1)
  supervisorSignatureDataUrl?: string;
  supervisorSignedAt?: string;

  /** Supervisor rejected this revision — L1 must revise */
  supervisorRejectionReason?: string;
  supervisorRejectedAt?: string;
  supervisorRejectedByName?: string;

  // Level 3 Multi-Sign QA Reviewer Verification
  l3ReviewStatus?: L3ReviewStatus;
  l3VerifierId?: string;
  l3VerifierName?: string;
  l3CertNumber?: string;
  l3SignatureDataUrl?: string;
  l3Comments?: string;
  l3ReviewedAt?: string;
  l3RejectionReason?: string;

  /** Admin waiver: treat as Final for delivery without L3 approve (does not strip PDF DRAFT watermark) */
  finalWithoutL3?: boolean;
  finalWithoutL3Reason?: string;
  /** Commercial delivery record (gate: L3 approved OR finalWithoutL3) */
  delivery?: {
    recipient: string;
    channel: 'Email mock' | 'Handed over' | 'Other';
    deliveredAt: string;
    recordedBy: string;
  };

  // Complete Audit Trail
  auditTrail: AuditEntry[];

  createdAt: string;
  updatedAt: string;
}

export interface CompanySettings {
  companyName: string;
  logoUrl?: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  sanasAccreditation?: string;
  reportFooter: string;
  defaultReportNotes: string;
  reportPrefix: string;
}

export type UserRole = 'technician' | 'l3_verifier' | 'admin';
