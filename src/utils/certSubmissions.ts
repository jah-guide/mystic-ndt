import {
  CertDocumentSubmission,
  Inspector,
  MethodCertificate,
  MethodCertVerificationStatus,
  NdtMethod
} from '../types';
import {
  deriveHighestVerifiedMethodLevel,
  getInspectorSummaryExpiryDate,
  getMethodCertificate
} from './validation';

export function hasPendingCertSubmission(mc: MethodCertificate | undefined): boolean {
  return Boolean(mc?.pendingSubmission?.documentDataUrl);
}

export function hasPendingVisionSubmission(inspector: Inspector): boolean {
  return Boolean(inspector.visionPendingSubmission?.documentDataUrl);
}

export function getActiveMethodCert(
  inspector: Inspector,
  method: NdtMethod
): MethodCertificate | undefined {
  return getMethodCertificate(inspector, method);
}

export function inspectorHasAnyPendingSubmission(inspector: Inspector): boolean {
  if (hasPendingVisionSubmission(inspector)) return true;
  return (inspector.methodCertificates || []).some(hasPendingCertSubmission);
}

export function buildCertSubmission(opts: {
  documentDataUrl: string;
  documentFileName?: string;
  proposedExpiryDate: string;
  proposedCertNumber?: string;
  proposedIssueDate?: string;
  submittedByName: string;
}): CertDocumentSubmission {
  return {
    documentDataUrl: opts.documentDataUrl,
    documentFileName: opts.documentFileName,
    proposedExpiryDate: opts.proposedExpiryDate,
    proposedCertNumber: opts.proposedCertNumber,
    proposedIssueDate: opts.proposedIssueDate,
    submittedAt: new Date().toISOString(),
    submittedByName: opts.submittedByName
  };
}

/** Apply employee method-cert renewal upload without changing active Verified fields. */
export function applyMethodCertPendingUpload(
  mc: MethodCertificate,
  submission: CertDocumentSubmission
): MethodCertificate {
  return {
    ...mc,
    pendingSubmission: submission,
    // Keep active verificationStatus; only clear prior rejection note on re-upload intent
    rejectionReason: mc.verificationStatus === 'Rejected' ? undefined : mc.rejectionReason
  };
}

/** First-time / never-verified: upload sets PendingVerification on the active record. */
export function applyMethodCertInitialUpload(
  mc: MethodCertificate,
  submission: CertDocumentSubmission
): MethodCertificate {
  return {
    ...mc,
    documentDataUrl: submission.documentDataUrl,
    documentFileName: submission.documentFileName,
    expiryDate: submission.proposedExpiryDate || mc.expiryDate,
    certNumber: submission.proposedCertNumber || mc.certNumber,
    issueDate: submission.proposedIssueDate || mc.issueDate,
    verificationStatus: 'PendingVerification',
    pendingSubmission: undefined,
    rejectionReason: undefined,
    verifiedAt: undefined,
    verifiedByName: undefined
  };
}

export function approveMethodCertPending(
  mc: MethodCertificate,
  confirmed: {
    expiryDate: string;
    certNumber?: string;
    issueDate?: string;
    verifiedByName: string;
  }
): MethodCertificate {
  const pending = mc.pendingSubmission;
  const fromPending = Boolean(pending);
  return {
    ...mc,
    expiryDate: confirmed.expiryDate,
    certNumber: confirmed.certNumber || pending?.proposedCertNumber || mc.certNumber,
    issueDate: confirmed.issueDate || pending?.proposedIssueDate || mc.issueDate,
    documentDataUrl: pending?.documentDataUrl || mc.documentDataUrl,
    documentFileName: pending?.documentFileName || mc.documentFileName,
    verificationStatus: 'Verified',
    verifiedAt: new Date().toISOString(),
    verifiedByName: confirmed.verifiedByName,
    rejectionReason: undefined,
    pendingSubmission: undefined,
    // If approving a never-verified cert without pending, still mark Verified
    ...(fromPending ? {} : {})
  };
}

export function rejectMethodCertPending(
  mc: MethodCertificate,
  reason: string
): MethodCertificate {
  if (mc.pendingSubmission) {
    return {
      ...mc,
      pendingSubmission: undefined,
      rejectionReason: reason
    };
  }
  return {
    ...mc,
    verificationStatus: 'Rejected',
    rejectionReason: reason,
    verifiedAt: undefined,
    verifiedByName: undefined
  };
}

export function approveVisionPending(
  inspector: Inspector,
  confirmed: { expiryDate: string; verifiedByName?: string }
): Inspector {
  const pending = inspector.visionPendingSubmission;
  return {
    ...inspector,
    visionAcuityExpiryDate: confirmed.expiryDate,
    visionDocumentDataUrl: pending?.documentDataUrl || inspector.visionDocumentDataUrl,
    visionDocumentFileName: pending?.documentFileName || inspector.visionDocumentFileName,
    visionVerificationStatus: 'Verified',
    visionRejectionReason: undefined,
    visionPendingSubmission: undefined
  };
}

export function rejectVisionPending(inspector: Inspector, reason: string): Inspector {
  if (inspector.visionPendingSubmission) {
    return {
      ...inspector,
      visionPendingSubmission: undefined,
      visionRejectionReason: reason
    };
  }
  return {
    ...inspector,
    visionVerificationStatus: 'Rejected',
    visionRejectionReason: reason
  };
}

export function applyVisionPendingUpload(
  inspector: Inspector,
  submission: CertDocumentSubmission
): Inspector {
  const hasActiveVision = Boolean(inspector.visionAcuityExpiryDate);
  if (hasActiveVision && inspector.visionVerificationStatus !== 'Rejected') {
    return {
      ...inspector,
      visionPendingSubmission: submission,
      visionRejectionReason: undefined
    };
  }
  // Missing or rejected active file — treat as initial pending verification
  return {
    ...inspector,
    visionAcuityExpiryDate: submission.proposedExpiryDate,
    visionDocumentDataUrl: submission.documentDataUrl,
    visionDocumentFileName: submission.documentFileName,
    visionVerificationStatus: 'PendingVerification',
    visionPendingSubmission: undefined,
    visionRejectionReason: undefined
  };
}

export function refreshInspectorCertSummary(inspector: Inspector): Inspector {
  return {
    ...inspector,
    level: deriveHighestVerifiedMethodLevel(inspector),
    certExpiryDate: getInspectorSummaryExpiryDate(inspector)
  };
}

export function effectiveVisionStatus(
  inspector: Inspector
): MethodCertVerificationStatus | 'none' {
  if (hasPendingVisionSubmission(inspector)) return 'PendingVerification';
  if (!inspector.visionAcuityExpiryDate) return 'none';
  return inspector.visionVerificationStatus || 'Verified';
}
