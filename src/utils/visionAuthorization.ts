import { Inspector } from '../types';

export type VisionStatus = 'valid' | 'expiring_soon' | 'expired' | 'missing';

function visionExpiry(dateString?: string, warningThresholdDays: number = 30): {
  status: 'valid' | 'expiring_soon' | 'expired';
  formattedText: string;
} {
  if (!dateString) {
    return { status: 'expired', formattedText: 'No date set' };
  }
  const targetDate = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) {
    return { status: 'expired', formattedText: `Expired ${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'} ago` };
  }
  if (diffDays <= warningThresholdDays) {
    return { status: 'expiring_soon', formattedText: `Expires in ${diffDays} day${diffDays === 1 ? '' : 's'}` };
  }
  return { status: 'valid', formattedText: `Valid (${diffDays} days left)` };
}

export function getVisionStatus(inspector: Inspector): VisionStatus {
  if (!inspector.visionAcuityExpiryDate) return 'missing';
  return visionExpiry(inspector.visionAcuityExpiryDate).status;
}

export function isEmployerAuthorized(inspector: Inspector): boolean {
  return inspector.employerAuthorized !== false;
}

/** Person-level assign gate (vision + employer authorization). */
export function validateVisionAuthorization(inspector: Inspector): {
  blocked: boolean;
  warning: boolean;
  reason: string;
  visionStatus: VisionStatus;
} {
  if (!isEmployerAuthorized(inspector)) {
    return {
      blocked: true,
      warning: false,
      reason: 'Employer authorization revoked / not cleared — restore authorization before assignment',
      visionStatus: getVisionStatus(inspector)
    };
  }

  const visionStatus = getVisionStatus(inspector);
  if (visionStatus === 'missing') {
    return {
      blocked: true,
      warning: false,
      reason: 'Near-vision acuity expiry not on file — record vision test date before assignment',
      visionStatus
    };
  }

  const check = visionExpiry(inspector.visionAcuityExpiryDate);
  if (check.status === 'expired') {
    return {
      blocked: true,
      warning: false,
      reason: `Near-vision acuity EXPIRED (${check.formattedText}) — renew employer vision file before assignment`,
      visionStatus: 'expired'
    };
  }

  if (check.status === 'expiring_soon') {
    return {
      blocked: false,
      warning: true,
      reason: `Near-vision acuity due soon (${check.formattedText}) — schedule renewal`,
      visionStatus: 'expiring_soon'
    };
  }

  return {
    blocked: false,
    warning: false,
    reason: `Vision acuity valid (${check.formattedText})`,
    visionStatus: 'valid'
  };
}
