import { Job, Inspector, Equipment, OverallResult, NdtMethod, InspectionItem, FindingsRevisionSnapshot, JobViewerRole, JobStatus, AcceptanceCriterion, NdtProcedure, ConstraintFlag, ProcedureEquipmentSlot, MethodCertificate } from '../types';
import { validateVisionAuthorization } from './visionAuthorization';

export type ExpiryStatus = 'valid' | 'expiring_soon' | 'expired';

export interface ExpiryCheckResult {
  status: ExpiryStatus;
  daysRemaining: number;
  formattedText: string;
}

export type JobOnTimeStatus = 'on_time' | 'late' | 'excluded';

/** Ops KPI only — not ISO evaluation. Completed jobs with dueDate: on time if completedAt date ≤ dueDate. */
export function getJobOnTimeStatus(job: Pick<Job, 'status' | 'dueDate' | 'completedAt'>): JobOnTimeStatus {
  if (job.status !== 'Completed' || !job.dueDate || !job.completedAt) return 'excluded';
  const completedDay = job.completedAt.slice(0, 10);
  return completedDay <= job.dueDate ? 'on_time' : 'late';
}

export function getMethodCertificate(inspector: Inspector, method: NdtMethod): MethodCertificate | undefined {
  return inspector.methodCertificates?.find(c => c.method === method);
}

/** Methods from certificates when present, else legacy methods array. */
export function getInspectorQualifiedMethods(inspector: Inspector): NdtMethod[] {
  if (inspector.methodCertificates && inspector.methodCertificates.length > 0) {
    return [...new Set(inspector.methodCertificates.map(c => c.method))];
  }
  return inspector.methods || [];
}

/** Worst-case expiry across method certs (for list chips). Falls back to certExpiryDate. */
export function getInspectorSummaryExpiryDate(inspector: Inspector): string {
  const certs = inspector.methodCertificates;
  if (!certs || certs.length === 0) return inspector.certExpiryDate;
  return certs.reduce((earliest, c) => (c.expiryDate < earliest ? c.expiryDate : earliest), certs[0].expiryDate);
}

export type InspectorLevel = 'Level 1' | 'Level 2' | 'Level 3';

const LEVEL_RANK: Record<InspectorLevel, number> = {
  'Level 1': 1,
  'Level 2': 2,
  'Level 3': 3
};

/** Level on the method certificate for this method (ISO 9712 method-scoped). */
export function getMethodCertLevel(inspector: Inspector, method: NdtMethod): InspectorLevel | undefined {
  const mc = getMethodCertificate(inspector, method);
  if (mc) return mc.level;
  return inspector.level;
}

/** Highest verified method-cert level — summary badge only, not for assignment. */
export function deriveHighestVerifiedMethodLevel(inspector: Inspector): InspectorLevel {
  const verified = (inspector.methodCertificates || []).filter(c => c.verificationStatus === 'Verified');
  if (verified.length === 0) return inspector.level || 'Level 2';
  return verified.reduce<InspectorLevel>((best, c) =>
    LEVEL_RANK[c.level] > LEVEL_RANK[best] ? c.level : best
  , verified[0].level);
}

/** True when this person acts as Level 1 lead for the given job method. */
export function isLevel1ForMethod(inspector: Inspector | undefined, method: NdtMethod): boolean {
  if (!inspector) return false;
  return getMethodCertLevel(inspector, method) === 'Level 1';
}

export function checkExpiry(dateString?: string, warningThresholdDays: number = 30): ExpiryCheckResult {
  if (!dateString) {
    return { status: 'expired', daysRemaining: 0, formattedText: 'No date set' };
  }
  const targetDate = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { status: 'expired', daysRemaining: diffDays, formattedText: `Expired ${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'} ago` };
  } else if (diffDays <= warningThresholdDays) {
    return { status: 'expiring_soon', daysRemaining: diffDays, formattedText: `Expires in ${diffDays} day${diffDays === 1 ? '' : 's'}` };
  } else {
    return { status: 'valid', daysRemaining: diffDays, formattedText: `Valid (${diffDays} days left)` };
  }
}

export function isItemEvaluated(result?: string): boolean {
  return result === 'Pass' || result === 'Fail' || result === 'N/A';
}

export function calculateOverallResult(items: Job['items']): OverallResult {
  if (!items || items.length === 0) return 'PENDING';
  const hasPending = items.some(item => !isItemEvaluated(item.result));
  if (hasPending) return 'PENDING';
  const hasFail = items.some(item => item.result === 'Fail');
  if (hasFail) return 'FAIL';
  const allPassOrNa = items.every(item => item.result === 'Pass' || item.result === 'N/A');
  const hasAtLeastOnePass = items.some(item => item.result === 'Pass');
  if (allPassOrNa && hasAtLeastOnePass) return 'PASS';
  if (allPassOrNa) return 'PASS';
  return 'PENDING';
}

export function resetItemEvaluations(items: InspectionItem[]): InspectionItem[] {
  return items.map(i => ({ ...i, result: 'Pending' as const, updatedAt: new Date().toISOString() }));
}

export function snapshotFindingsRevision(
  job: Job,
  rejection?: { reason: string; rejectedAt: string; rejectedByName: string }
): FindingsRevisionSnapshot {
  // Preserve findings + any evaluations as archived (do not force Pending)
  return {
    revision: job.findingsRevision || 1,
    items: job.items.map(i => ({
      ...i,
      photos: [...(i.photos || [])],
      methodDetails: i.methodDetails ? { ...i.methodDetails } : undefined
    })),
    submittedAt: job.updatedAt || new Date().toISOString(),
    signatureDataUrl: job.signatureDataUrl,
    inspectorComments: job.inspectorComments,
    rejectionReason: rejection?.reason,
    rejectedAt: rejection?.rejectedAt,
    rejectedByName: rejection?.rejectedByName
  };
}

/** Clear L3 certification fields (reopen / reject / re-complete hygiene) */
export function clearL3CertificationFields<T extends Job>(job: T): T {
  return {
    ...job,
    l3ReviewStatus: undefined,
    l3VerifierId: undefined,
    l3VerifierName: undefined,
    l3CertNumber: undefined,
    l3SignatureDataUrl: undefined,
    l3Comments: undefined,
    l3ReviewedAt: undefined,
    l3RejectionReason: undefined
  };
}

/** Clear field completion / dual-sign lock (reopen or L3 reject) */
export function clearFieldCompletionFields<T extends Job>(job: T): T {
  return {
    ...job,
    overallResult: 'PENDING',
    completedAt: undefined,
    reportNumber: undefined,
    signatureDataUrl: undefined,
    inspectorComments: undefined,
    supervisorSignatureDataUrl: undefined,
    supervisorSignedAt: undefined
  };
}

export function isL3Certified(job: Job): boolean {
  return job.l3ReviewStatus === 'APPROVED';
}

export function canReopenJob(viewerRole: JobViewerRole): boolean {
  return viewerRole === 'admin' || viewerRole === 'l3';
}

export function isAssignedSupervisor(job: Job, viewerInspectorId?: string): boolean {
  return Boolean(job.supervisorId && viewerInspectorId && job.supervisorId === viewerInspectorId);
}

export function canEditFindings(viewerRole: JobViewerRole, status: JobStatus, isL1LeadJob: boolean): boolean {
  if (status === 'Completed' || status === 'Awaiting Supervisor') return false;
  // Findings only after Start work (In Progress) or when revising
  const fieldOpen = status === 'In Progress' || status === 'Revision Required';
  if (!fieldOpen) return false;
  if (!isL1LeadJob) {
    // Admin orchestrates only — does not edit field findings in the demo cockpit
    return viewerRole === 'lead_l2_plus';
  }
  return viewerRole === 'lead_l1';
}

export function canEvaluateItems(viewerRole: JobViewerRole, status: JobStatus, isAssignedSup: boolean): boolean {
  return status === 'Awaiting Supervisor' && viewerRole === 'supervisor' && isAssignedSup;
}

export function canRejectToL1(viewerRole: JobViewerRole, status: JobStatus, isAssignedSup: boolean): boolean {
  return canEvaluateItems(viewerRole, status, isAssignedSup);
}

export function canSubmitAsL1(viewerRole: JobViewerRole, status: JobStatus, isL1LeadJob: boolean): boolean {
  if (!isL1LeadJob || viewerRole !== 'lead_l1') return false;
  return status === 'In Progress' || status === 'Revision Required';
}

/** Lead may start Assigned work → In Progress (Domain Freeze). */
export function canStartWork(viewerRole: JobViewerRole, status: JobStatus): boolean {
  if (status !== 'Assigned') return false;
  return viewerRole === 'lead_l1' || viewerRole === 'lead_l2_plus';
}

export interface EligibilityResult {
  eligible: boolean;
  blocked: boolean;
  warning: boolean;
  reason: string;
  certStatus: ExpiryStatus;
  methodMatch: boolean;
}

export function validateInspectorEligibility(
  inspector: Inspector,
  method: NdtMethod
): EligibilityResult {
  const visionGate = validateVisionAuthorization(inspector);
  if (visionGate.blocked) {
    return {
      eligible: false,
      blocked: true,
      warning: false,
      reason: visionGate.reason,
      certStatus: visionGate.visionStatus === 'missing' ? 'expired' : (visionGate.visionStatus === 'expiring_soon' ? 'expiring_soon' : visionGate.visionStatus === 'valid' ? 'valid' : 'expired'),
      methodMatch: Boolean(getMethodCertificate(inspector, method) || inspector.methods.includes(method))
    };
  }

  const methodCerts = inspector.methodCertificates;
  const useMethodCerts = methodCerts && methodCerts.length > 0;

  if (useMethodCerts) {
    const mc = methodCerts.find(c => c.method === method);
    if (!mc) {
      const listed = getInspectorQualifiedMethods(inspector).join(', ') || 'none';
      return {
        eligible: false,
        blocked: true,
        warning: false,
        reason: `Not qualified for ${method} — method certificates on file: ${listed}`,
        certStatus: checkExpiry(getInspectorSummaryExpiryDate(inspector)).status,
        methodMatch: false
      };
    }

    if (mc.verificationStatus === 'PendingVerification') {
      return {
        eligible: false,
        blocked: true,
        warning: false,
        reason: `${method} certificate pending employer verification — Admin must verify before assignment`,
        certStatus: checkExpiry(mc.expiryDate).status,
        methodMatch: true
      };
    }

    if (mc.verificationStatus === 'Rejected') {
      return {
        eligible: false,
        blocked: true,
        warning: false,
        reason: `${method} certificate rejected by employer${mc.rejectionReason ? `: ${mc.rejectionReason}` : ''} — re-upload required`,
        certStatus: checkExpiry(mc.expiryDate).status,
        methodMatch: true
      };
    }

    const certCheck = checkExpiry(mc.expiryDate);
    if (certCheck.status === 'expired') {
      return {
        eligible: false,
        blocked: true,
        warning: false,
        reason: `${method} certification EXPIRED (${certCheck.formattedText}) — renew before appointment`,
        certStatus: 'expired',
        methodMatch: true
      };
    }
    if (certCheck.status === 'expiring_soon' || visionGate.warning) {
      const parts = [
        certCheck.status === 'expiring_soon' ? `${method} ${mc.level} cert expiring soon (${certCheck.formattedText})` : null,
        visionGate.warning ? visionGate.reason : null
      ].filter(Boolean);
      return {
        eligible: true,
        blocked: false,
        warning: true,
        reason: parts.join(' · ') || `Qualified ${method} ${mc.level}`,
        certStatus: certCheck.status === 'expiring_soon' ? 'expiring_soon' : 'valid',
        methodMatch: true
      };
    }
    return {
      eligible: true,
      blocked: false,
      warning: false,
      reason: `Qualified ${method} ${mc.level} — employer-verified cert valid (${certCheck.formattedText})`,
      certStatus: 'valid',
      methodMatch: true
    };
  }

  // Legacy fallback when methodCertificates not populated
  const certCheck = checkExpiry(inspector.certExpiryDate);
  const methodMatch = inspector.methods.includes(method);

  if (!methodMatch) {
    return {
      eligible: false,
      blocked: true,
      warning: false,
      reason: `Not qualified for ${method} — certified in: ${inspector.methods.join(', ')} only`,
      certStatus: certCheck.status,
      methodMatch: false
    };
  }

  if (certCheck.status === 'expired') {
    return {
      eligible: false,
      blocked: true,
      warning: false,
      reason: `Certification EXPIRED (${certCheck.formattedText}) — cert renewal required before appointment`,
      certStatus: 'expired',
      methodMatch: true
    };
  }

  if (certCheck.status === 'expiring_soon' || visionGate.warning) {
    const parts = [
      certCheck.status === 'expiring_soon' ? `Cert expiring soon (${certCheck.formattedText})` : null,
      visionGate.warning ? visionGate.reason : null
    ].filter(Boolean);
    return {
      eligible: true,
      blocked: false,
      warning: true,
      reason: parts.join(' · ') || 'Qualified',
      certStatus: certCheck.status === 'expiring_soon' ? 'expiring_soon' : 'valid',
      methodMatch: true
    };
  }

  return {
    eligible: true,
    blocked: false,
    warning: false,
    reason: `Qualified for ${method} — cert valid (${certCheck.formattedText})`,
    certStatus: 'valid',
    methodMatch: true
  };
}

export function validateSupervisorEligibility(
  supervisor: Inspector,
  method: NdtMethod
): EligibilityResult {
  const methodLevel = getMethodCertLevel(supervisor, method);
  if (methodLevel === 'Level 1') {
    return {
      eligible: false,
      blocked: true,
      warning: false,
      reason: `Supervisor must hold ${method} Level 2 or Level 3 — this person is only ${method} Level 1`,
      certStatus: checkExpiry(getMethodCertificate(supervisor, method)?.expiryDate || supervisor.certExpiryDate).status,
      methodMatch: Boolean(getMethodCertificate(supervisor, method) || supervisor.methods.includes(method))
    };
  }

  const base = validateInspectorEligibility(supervisor, method);
  if (base.blocked) return base;

  // Eligible as inspector but must be L2/L3 for this method to supervise
  if (!methodLevel) {
    return {
      eligible: false,
      blocked: true,
      warning: false,
      reason: `Supervisor must hold ${method} Level 2 or Level 3`,
      certStatus: base.certStatus,
      methodMatch: base.methodMatch
    };
  }

  return {
    ...base,
    reason: base.reason.replace('Qualified', 'Eligible supervisor')
  };
}

export interface LevelComplianceResult {
  compliant: boolean;
  requiresSupervisor: boolean;
  canSignOff: boolean;
  reason: string;
  supervisorEligibility?: EligibilityResult;
}

export function validateLevelCompliance(
  inspector: Inspector,
  supervisor?: Inspector,
  method?: NdtMethod
): LevelComplianceResult {
  const leadLevel = method
    ? (getMethodCertLevel(inspector, method) || inspector.level)
    : (deriveHighestVerifiedMethodLevel(inspector));

  if (leadLevel === 'Level 1') {
    if (!supervisor) {
      return {
        compliant: false,
        requiresSupervisor: true,
        canSignOff: false,
        reason: method
          ? `${method} Level 1 technicians must be supervised by a ${method} Level 2 or Level 3 inspector per ISO 9712. Assign a supervising inspector.`
          : 'Level 1 technicians must be supervised by a Level 2 or Level 3 inspector per ISO 9712. Assign a supervising inspector.'
      };
    }

    if (method) {
      const supervisorEligibility = validateSupervisorEligibility(supervisor, method);
      if (supervisorEligibility.blocked) {
        return {
          compliant: false,
          requiresSupervisor: true,
          canSignOff: false,
          reason: `Assigned supervisor is not eligible: ${supervisorEligibility.reason}`,
          supervisorEligibility
        };
      }
      const supLevel = getMethodCertLevel(supervisor, method);
      return {
        compliant: true,
        requiresSupervisor: true,
        canSignOff: false,
        reason: `${method} Level 1 technician supervised by ${supervisor.fullName} (${method} ${supLevel}). Supervisor must evaluate findings and complete the inspection.`,
        supervisorEligibility
      };
    }

    if (method && (getMethodCertLevel(supervisor, method) === 'Level 1' || (!getMethodCertificate(supervisor, method) && supervisor.level === 'Level 1'))) {
      return {
        compliant: false,
        requiresSupervisor: true,
        canSignOff: false,
        reason: `Supervisor must hold ${method} Level 2 or Level 3. A Level 1 cannot supervise another Level 1.`
      };
    }
    if (!method && supervisor.level === 'Level 1') {
      return {
        compliant: false,
        requiresSupervisor: true,
        canSignOff: false,
        reason: 'Supervisor must be Level 2 or Level 3. A Level 1 cannot supervise another Level 1.'
      };
    }
    return {
      compliant: true,
      requiresSupervisor: true,
      canSignOff: false,
      reason: method
        ? `Level 1 technician supervised by ${supervisor.fullName} (${method} ${getMethodCertLevel(supervisor, method) || supervisor.level}). Supervisor must evaluate findings and complete the inspection.`
        : `Level 1 technician supervised by ${supervisor.fullName} (${supervisor.level}). Supervisor must evaluate findings and complete the inspection.`
    };
  }

  if (leadLevel === 'Level 2') {
    return {
      compliant: true,
      requiresSupervisor: false,
      canSignOff: true,
      reason: method
        ? `${method} Level 2 — authorised to perform, supervise, and sign off ${method} inspection records independently.`
        : 'Level 2 inspector — authorised to perform, supervise, and sign off inspection records independently.'
    };
  }

  return {
    compliant: true,
    requiresSupervisor: false,
    canSignOff: true,
    reason: method
      ? `${method} Level 3 — full ${method} inspection, supervision, and QA authority for this method.`
      : 'Level 3 Technical Authority — full inspection, supervision, and QA certification authority.'
  };
}

export interface JobCompletionValidation {
  canComplete: boolean;
  errors: string[];
  warnings: string[];
}

function pushEquipmentWarnings(equipmentList: Equipment[] | undefined, warnings: string[]) {
  if (!equipmentList || equipmentList.length === 0) return;
  equipmentList.forEach(eq => {
    const calCheck = checkExpiry(eq.calibrationExpiryDate);
    if (calCheck.status === 'expired') {
      warnings.push(`Warning: Equipment ${eq.name} calibration is EXPIRED (${calCheck.formattedText}).`);
    } else if (calCheck.status === 'expiring_soon') {
      warnings.push(`Notice: Equipment ${eq.name} calibration expires soon (${calCheck.formattedText}).`);
    }
    if (eq.checkoutStatus === 'Incident Reported') {
      warnings.push(`Warning: Equipment ${eq.name} has an open incident report. Verify with admin before use.`);
    }
  });
}

/**
 * Field examination conditions (as-found) required before L1 submit / field complete.
 * Scope is work-order; surface + measured °C + light (VT/MT) are field-owned per pack.
 */
export function pushExaminationConditionErrors(job: Job, errors: string[]) {
  if (!job.scope?.trim()) {
    errors.push('Scope of examination must be recorded on the work order before the report can be signed.');
  }
  if (!job.surfaceCondition?.trim()) {
    errors.push('As-found surface condition must be recorded on site before the report can be signed.');
  }
  const tempC = parseTemperatureC(job.temperature, job.temperatureC);
  if (tempC === null) {
    errors.push('Measured temperature (°C) must be recorded on site before the report can be signed.');
  }
  if ((job.method === 'VT' || job.method === 'MT') && !job.ambientLight?.trim()) {
    errors.push(
      `Ambient light must be recorded for ${job.method} examinations before the report can be signed.`
    );
  }
}

export function validateJobForL1Submit(
  job: Job,
  inspector?: Inspector,
  equipmentList?: Equipment[]
): JobCompletionValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!job.customerId) errors.push('Customer is required.');
  if (!job.siteId) errors.push('Inspection site is required.');
  if (!job.inspectionDate) errors.push('Inspection date is required.');
  if (!job.inspectorId) errors.push('Inspector is required.');
  if (!job.method) errors.push('NDT Method is required.');
  if (!job.supervisorId) errors.push('A supervising Level 2/3 inspector must be assigned before submission.');

  if (!job.items || job.items.length === 0) {
    errors.push('At least one inspection item with findings is required before submitting to the supervisor.');
  }

  if (!job.equipmentIds || job.equipmentIds.length === 0) {
    errors.push('At least one calibrated equipment item must be linked before submitting findings.');
  }

  if (!job.signatureDataUrl) {
    errors.push('Your signature is required to submit findings to the supervising inspector.');
  }

  pushExaminationConditionErrors(job, errors);

  if (inspector && !isLevel1ForMethod(inspector, job.method)) {
    errors.push(`Only ${job.method} Level 1 technicians use the submit-to-supervisor path.`);
  }

  const allowed: JobStatus[] = ['Draft', 'Assigned', 'In Progress', 'Revision Required'];
  if (!allowed.includes(job.status)) {
    errors.push(`Cannot submit findings while job status is "${job.status}".`);
  }

  if (inspector) {
    const methodExpiry = getMethodCertificate(inspector, job.method)?.expiryDate || inspector.certExpiryDate;
    const certCheck = checkExpiry(methodExpiry);
    if (certCheck.status === 'expired') {
      warnings.push(`Warning: Your ${job.method} certification is EXPIRED (${certCheck.formattedText}).`);
    } else if (certCheck.status === 'expiring_soon') {
      warnings.push(`Notice: Your ${job.method} certification is expiring soon (${certCheck.formattedText}).`);
    }
  }

  pushEquipmentWarnings(equipmentList, warnings);

  return { canComplete: errors.length === 0, errors, warnings };
}

/** Outer CTA gate: same as submit validation but signature is collected in the modal. */
export function validateJobForL1SubmitPreflight(
  job: Job,
  inspector?: Inspector,
  equipmentList?: Equipment[]
): JobCompletionValidation {
  return validateJobForL1Submit(
    { ...job, signatureDataUrl: job.signatureDataUrl || 'preflight' },
    inspector,
    equipmentList
  );
}

export function validateSupervisorReject(reason: string): JobCompletionValidation {
  const errors: string[] = [];
  if (!reason.trim()) {
    errors.push('A rejection reason is required so the Level 1 technician knows what to correct.');
  }
  return { canComplete: errors.length === 0, errors, warnings: [] };
}

export function validateJobForSupervisorComplete(
  job: Job,
  supervisor?: Inspector,
  equipmentList?: Equipment[],
  actorInspectorId?: string
): JobCompletionValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (job.status !== 'Awaiting Supervisor') {
    errors.push('Job must be Awaiting Supervisor before the supervisor can complete it.');
  }

  if (actorInspectorId && job.supervisorId && actorInspectorId !== job.supervisorId) {
    errors.push('Only the assigned supervising inspector may complete this job.');
  }

  if (!job.items || job.items.length === 0) {
    errors.push('At least one inspection item is required.');
  } else {
    const pending = job.items.filter(i => !isItemEvaluated(i.result));
    if (pending.length > 0) {
      errors.push(`${pending.length} item(s) still Pending — evaluate each as Pass, Fail, or N/A before completing.`);
    }
  }

  if (!job.equipmentIds || job.equipmentIds.length === 0) {
    errors.push('At least one calibrated equipment item must be linked before completing.');
  }

  if (!job.signatureDataUrl) {
    errors.push('Level 1 technician signature is missing — they must submit findings first.');
  }

  if (!job.supervisorSignatureDataUrl) {
    errors.push('Supervisor signature is required to complete and lock this inspection.');
  }

  pushExaminationConditionErrors(job, errors);

  if (supervisor) {
    const elig = validateSupervisorEligibility(supervisor, job.method);
    if (elig.blocked) {
      errors.push(`Supervisor not eligible: ${elig.reason}`);
    } else if (elig.warning) {
      warnings.push(`Notice: ${elig.reason}`);
    }
  } else {
    errors.push('Supervisor inspector record is required.');
  }

  pushEquipmentWarnings(equipmentList, warnings);

  return { canComplete: errors.length === 0, errors, warnings };
}

/** Outer CTA gate: supervisor signature is collected in the modal. */
export function validateJobForSupervisorCompletePreflight(
  job: Job,
  supervisor?: Inspector,
  equipmentList?: Equipment[],
  actorInspectorId?: string
): JobCompletionValidation {
  return validateJobForSupervisorComplete(
    {
      ...job,
      signatureDataUrl: job.signatureDataUrl || 'preflight',
      supervisorSignatureDataUrl: job.supervisorSignatureDataUrl || 'preflight'
    },
    supervisor,
    equipmentList,
    actorInspectorId
  );
}

export function validateJobForCompletion(
  job: Job,
  inspector?: Inspector,
  equipmentList?: Equipment[],
  supervisor?: Inspector
): JobCompletionValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!job.customerId) errors.push('Customer is required.');
  if (!job.siteId) errors.push('Inspection site is required.');
  if (!job.inspectionDate) errors.push('Inspection date is required.');
  if (!job.inspectorId) errors.push('Inspector is required.');
  if (!job.method) errors.push('NDT Method is required.');

  if (!job.items || job.items.length === 0) {
    errors.push('At least one inspection item is required before completing the job.');
  } else {
    const pending = job.items.filter(i => !isItemEvaluated(i.result));
    if (pending.length > 0) {
      errors.push(`${pending.length} inspection item(s) are missing Pass/Fail/N/A results.`);
    }
  }

  if (!job.equipmentIds || job.equipmentIds.length === 0) {
    errors.push('At least one calibrated equipment item must be linked before completing.');
  }

  if (!job.signatureDataUrl) {
    errors.push('Inspector signature is required to sign off and lock the inspection.');
  }

  pushExaminationConditionErrors(job, errors);

  if (inspector) {
    const levelCheck = validateLevelCompliance(inspector, supervisor, job.method);
    if (isLevel1ForMethod(inspector, job.method)) {
      errors.push(`${job.method} Level 1 technicians cannot complete inspections. Submit findings to your supervising Level 2/3 inspector.`);
    } else if (!levelCheck.canSignOff) {
      errors.push(levelCheck.reason);
    }

    const methodExpiry = getMethodCertificate(inspector, job.method)?.expiryDate || inspector.certExpiryDate;
    const certCheck = checkExpiry(methodExpiry);
    if (certCheck.status === 'expired') {
      warnings.push(`Warning: Inspector ${inspector.fullName}'s ${job.method} certification is EXPIRED (${certCheck.formattedText}).`);
    } else if (certCheck.status === 'expiring_soon') {
      warnings.push(`Notice: Inspector ${inspector.fullName}'s ${job.method} certification is expiring soon (${certCheck.formattedText}).`);
    }
  }

  pushEquipmentWarnings(equipmentList, warnings);

  return { canComplete: errors.length === 0, errors, warnings };
}

/** Outer CTA gate: lead signature is collected in the modal. */
export function validateJobForCompletionPreflight(
  job: Job,
  inspector?: Inspector,
  equipmentList?: Equipment[],
  supervisor?: Inspector
): JobCompletionValidation {
  return validateJobForCompletion(
    { ...job, signatureDataUrl: job.signatureDataUrl || 'preflight' },
    inspector,
    equipmentList,
    supervisor
  );
}

// ─── WEP / criteria advisory compare (never auto-writes Pass/Fail) ───────────

export type ComparisonStatus = 'within' | 'outside' | 'unknown';

export interface ComparisonResult {
  status: ComparisonStatus;
  flags: ConstraintFlag[];
  reasons: string[];
  likelyFail: boolean;
}

export function parseNumericReading(reading?: string): number | null {
  if (!reading || !String(reading).trim()) return null;
  const n = parseFloat(String(reading).replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : null;
}

export function parseTemperatureC(temp?: string, temperatureC?: number): number | null {
  if (typeof temperatureC === 'number' && Number.isFinite(temperatureC)) return temperatureC;
  if (!temp) return null;
  const m = String(temp).match(/-?\d+(\.\d+)?/);
  if (!m) return null;
  const n = parseFloat(m[0]);
  return Number.isFinite(n) ? n : null;
}

export function compareReadingToCriterion(
  reading: string | undefined,
  unit: string | undefined,
  criterion: AcceptanceCriterion | undefined
): ComparisonResult {
  const empty: ComparisonResult = { status: 'unknown', flags: [], reasons: [], likelyFail: false };
  if (!criterion || criterion.nonComparable || criterion.ruleType === 'TextOnlyLegacy' || !criterion.ruleType) {
    return { ...empty, reasons: criterion ? ['Criterion is qualitative / not numerically comparable'] : [] };
  }

  const value = parseNumericReading(reading);
  if (value === null) {
    return { ...empty, reasons: ['Reading is not a number — cannot compare'] };
  }

  if (criterion.valueUnit && unit && criterion.valueUnit.toLowerCase() !== unit.toLowerCase()) {
    return {
      status: 'unknown',
      flags: [],
      reasons: [`Unit mismatch (reading ${unit} vs criterion ${criterion.valueUnit})`],
      likelyFail: false
    };
  }

  const min = criterion.valueMin;
  const max = criterion.valueMax;
  const rule = criterion.ruleType;

  let outside = false;
  const reasons: string[] = [];

  if (rule === 'NumericMin' || rule === 'NumericRange') {
    if (typeof min === 'number' && value < min) {
      outside = true;
      reasons.push(`Reading ${value} is below minimum ${min}${criterion.valueUnit ? ` ${criterion.valueUnit}` : ''}`);
    }
  }
  if (rule === 'NumericMax' || rule === 'NumericRange') {
    if (typeof max === 'number' && value > max) {
      outside = true;
      reasons.push(`Reading ${value} exceeds maximum ${max}${criterion.valueUnit ? ` ${criterion.valueUnit}` : ''}`);
    }
  }

  if (outside) {
    return {
      status: 'outside',
      flags: ['OUTSIDE_CRITERION'],
      reasons,
      likelyFail: true
    };
  }

  if (typeof min !== 'number' && typeof max !== 'number') {
    return empty;
  }

  return {
    status: 'within',
    flags: [],
    reasons: ['Reading is within the structured acceptance band'],
    likelyFail: false
  };
}

export function compareJobTempToProcedure(
  job: Pick<Job, 'temperature' | 'temperatureC'>,
  procedure?: NdtProcedure
): ComparisonResult {
  const empty: ComparisonResult = { status: 'unknown', flags: [], reasons: [], likelyFail: false };
  const ranges = procedure?.temperatureRanges;
  if (!ranges || ranges.length === 0) return empty;

  const tempC = parseTemperatureC(job.temperature, job.temperatureC);
  if (tempC === null) {
    return { ...empty, reasons: ['Job temperature not set numerically — cannot compare to WEP'] };
  }

  const primary = ranges[0];
  const outside = tempC < primary.min || tempC > primary.max;
  if (outside) {
    return {
      status: 'outside',
      flags: ['OUTSIDE_PROC_TEMP'],
      reasons: [
        `Job temperature ${tempC}°C is outside WEP ${primary.kind} range ${primary.min}–${primary.max}${primary.unit}`
      ],
      likelyFail: false
    };
  }

  return {
    status: 'within',
    flags: [],
    reasons: [`Job temperature ${tempC}°C is within WEP range`],
    likelyFail: false
  };
}

export function methodToEquipmentCategory(method: NdtMethod): NonNullable<Equipment['category']> {
  switch (method) {
    case 'UT': return 'Ultrasonic';
    case 'MT': return 'Magnetic Particle';
    case 'PT': return 'Liquid Penetrant';
    case 'VT': return 'Visual / Optical';
    default: return 'General';
  }
}

export function suggestEquipmentForSlots(
  slots: ProcedureEquipmentSlot[] | undefined,
  equipment: Equipment[],
  method: NdtMethod
): { slotId: string; candidates: Equipment[] }[] {
  const list = slots && slots.length > 0
    ? slots
    : [{
        id: 'auto-method',
        label: `${method} primary instrument`,
        category: methodToEquipmentCategory(method),
        quantity: 1,
        calibrationRequired: true
      } as ProcedureEquipmentSlot];

  return list.map(slot => {
    const candidates = equipment.filter(eq => {
      if (eq.status === 'Out of Service') return false;
      const cal = checkExpiry(eq.calibrationExpiryDate);
      if (cal.status === 'expired') return false;
      if (eq.category && eq.category !== slot.category) return false;
      if (slot.typeHint) {
        const hay = `${eq.type} ${eq.name}`.toLowerCase();
        if (!hay.includes(slot.typeHint.toLowerCase()) && eq.category !== slot.category) return false;
      }
      return true;
    });
    return { slotId: slot.id, candidates };
  });
}

export function mergeConstraintFlags(
  ...results: ComparisonResult[]
): ConstraintFlag[] {
  const set = new Set<ConstraintFlag>();
  results.forEach(r => r.flags.forEach(f => set.add(f)));
  return [...set];
}

/** L1 submit: if temp outside WEP, require temperatureOutOfRangeReason */
export function validateJobTempForL1Submit(
  job: Job,
  procedure?: NdtProcedure
): JobCompletionValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const cmp = compareJobTempToProcedure(job, procedure);
  if (cmp.status === 'outside') {
    if (!job.temperatureOutOfRangeReason?.trim()) {
      errors.push(
        `Job temperature is outside the WEP range (${cmp.reasons[0] || 'out of range'}). Enter a reason before submitting to the supervisor.`
      );
    } else {
      warnings.push(cmp.reasons[0] || 'Temperature outside WEP range — reason recorded.');
    }
  }
  return { canComplete: errors.length === 0, errors, warnings };
}
