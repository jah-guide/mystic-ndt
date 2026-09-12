import { Job, Inspector, Equipment, OverallResult, NdtMethod, InspectionItem, FindingsRevisionSnapshot, JobViewerRole, JobStatus } from '../types';

export type ExpiryStatus = 'valid' | 'expiring_soon' | 'expired';

export interface ExpiryCheckResult {
  status: ExpiryStatus;
  daysRemaining: number;
  formattedText: string;
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
  if (!isL1LeadJob) {
    // Admin orchestrates only — does not edit field findings in the demo cockpit
    return viewerRole === 'lead_l2_plus';
  }
  return viewerRole === 'lead_l1' && (
    status === 'Draft' || status === 'Assigned' || status === 'In Progress' || status === 'Revision Required'
  );
}

export function canEvaluateItems(viewerRole: JobViewerRole, status: JobStatus, isAssignedSup: boolean): boolean {
  return status === 'Awaiting Supervisor' && viewerRole === 'supervisor' && isAssignedSup;
}

export function canRejectToL1(viewerRole: JobViewerRole, status: JobStatus, isAssignedSup: boolean): boolean {
  return canEvaluateItems(viewerRole, status, isAssignedSup);
}

export function canSubmitAsL1(viewerRole: JobViewerRole, status: JobStatus, isL1LeadJob: boolean): boolean {
  if (!isL1LeadJob || viewerRole !== 'lead_l1') return false;
  return status === 'Draft' || status === 'Assigned' || status === 'In Progress' || status === 'Revision Required';
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

  if (certCheck.status === 'expiring_soon') {
    return {
      eligible: true,
      blocked: false,
      warning: true,
      reason: `Cert expiring soon (${certCheck.formattedText}) — plan renewal`,
      certStatus: 'expiring_soon',
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
  if (supervisor.level === 'Level 1') {
    return {
      eligible: false,
      blocked: true,
      warning: false,
      reason: 'Supervisor must be Level 2 or Level 3 — a Level 1 cannot supervise another Level 1',
      certStatus: checkExpiry(supervisor.certExpiryDate).status,
      methodMatch: supervisor.methods.includes(method)
    };
  }
  return validateInspectorEligibility(supervisor, method);
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
  if (inspector.level === 'Level 1') {
    if (!supervisor) {
      return {
        compliant: false,
        requiresSupervisor: true,
        canSignOff: false,
        reason: 'Level 1 technicians must be supervised by a Level 2 or Level 3 inspector per ISO 9712. Assign a supervising inspector.'
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
      return {
        compliant: true,
        requiresSupervisor: true,
        canSignOff: false,
        reason: `Level 1 technician supervised by ${supervisor.fullName} (${supervisor.level}). Supervisor must evaluate findings and complete the inspection.`,
        supervisorEligibility
      };
    }

    if (supervisor.level === 'Level 1') {
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
      reason: `Level 1 technician supervised by ${supervisor.fullName} (${supervisor.level}). Supervisor must evaluate findings and complete the inspection.`
    };
  }

  if (inspector.level === 'Level 2') {
    return {
      compliant: true,
      requiresSupervisor: false,
      canSignOff: true,
      reason: 'Level 2 inspector — authorised to perform, supervise, and sign off inspection records independently.'
    };
  }

  return {
    compliant: true,
    requiresSupervisor: false,
    canSignOff: true,
    reason: 'Level 3 Technical Authority — full inspection, supervision, and QA certification authority.'
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

  if (inspector && inspector.level !== 'Level 1') {
    errors.push('Only Level 1 technicians use the submit-to-supervisor path.');
  }

  const allowed: JobStatus[] = ['Draft', 'Assigned', 'In Progress', 'Revision Required'];
  if (!allowed.includes(job.status)) {
    errors.push(`Cannot submit findings while job status is "${job.status}".`);
  }

  if (inspector) {
    const certCheck = checkExpiry(inspector.certExpiryDate);
    if (certCheck.status === 'expired') {
      warnings.push(`Warning: Your certification is EXPIRED (${certCheck.formattedText}).`);
    } else if (certCheck.status === 'expiring_soon') {
      warnings.push(`Notice: Your certification is expiring soon (${certCheck.formattedText}).`);
    }
  }

  pushEquipmentWarnings(equipmentList, warnings);

  return { canComplete: errors.length === 0, errors, warnings };
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

  if (inspector) {
    const levelCheck = validateLevelCompliance(inspector, supervisor, job.method);
    if (inspector.level === 'Level 1') {
      errors.push('Level 1 technicians cannot complete inspections. Submit findings to your supervising Level 2/3 inspector.');
    } else if (!levelCheck.canSignOff) {
      errors.push(levelCheck.reason);
    }

    const certCheck = checkExpiry(inspector.certExpiryDate);
    if (certCheck.status === 'expired') {
      warnings.push(`Warning: Inspector ${inspector.fullName}'s certification is EXPIRED (${certCheck.formattedText}).`);
    } else if (certCheck.status === 'expiring_soon') {
      warnings.push(`Notice: Inspector ${inspector.fullName}'s certification is expiring soon (${certCheck.formattedText}).`);
    }
  }

  pushEquipmentWarnings(equipmentList, warnings);

  return { canComplete: errors.length === 0, errors, warnings };
}
