import { Inspector, NdtMethod } from '../types';
import {
  checkExpiry,
  getInspectorQualifiedMethods,
  getInspectorSummaryExpiryDate,
  getMethodCertificate
} from './validation';

/** KPI / list filter buckets (pending + rejected fold into expired). */
export type CertFilterBucket = 'valid' | 'expiring_soon' | 'expired';
export type CertFilter = 'ALL' | CertFilterBucket;

/**
 * Status of one method for KPI filtering.
 * Aligns with list chip tones: pending/rejected → expired (action queue).
 */
export function getMethodCertFilterStatus(
  inspector: Inspector,
  method: NdtMethod
): CertFilterBucket | null {
  const qualified = getInspectorQualifiedMethods(inspector);
  if (!qualified.includes(method) && !(inspector.methods || []).includes(method)) {
    return null;
  }

  const mc = getMethodCertificate(inspector, method);
  if (!mc) {
    // Legacy method listing without a method certificate row
    if (!(inspector.methods || []).includes(method)) return null;
    const summary = checkExpiry(getInspectorSummaryExpiryDate(inspector)).status;
    return summary;
  }

  if (mc.verificationStatus === 'Rejected' || mc.verificationStatus === 'PendingVerification') {
    return 'expired';
  }

  return checkExpiry(mc.expiryDate).status;
}

export function inspectorMatchesCertFilter(
  inspector: Inspector,
  filter: CertFilter,
  methodFilter: NdtMethod | 'ALL' = 'ALL'
): boolean {
  if (filter === 'ALL') return true;

  if (methodFilter !== 'ALL') {
    return getMethodCertFilterStatus(inspector, methodFilter) === filter;
  }

  const methods = getInspectorQualifiedMethods(inspector);
  const legacy = inspector.methods || [];
  const all = [...new Set([...methods, ...legacy])];
  return all.some(m => getMethodCertFilterStatus(inspector, m) === filter);
}

/** Methods to show as chips when a KPI card is active. */
export function visibleMethodsForCertFilter(
  inspector: Inspector,
  filter: CertFilter
): NdtMethod[] {
  const methods = getInspectorQualifiedMethods(inspector);
  const legacy = inspector.methods || [];
  const all = [...new Set([...methods, ...legacy])] as NdtMethod[];

  if (filter === 'ALL') return all;
  return all.filter(m => getMethodCertFilterStatus(inspector, m) === filter);
}

export function countInspectorsByCertFilter(
  inspectors: Inspector[],
  filter: CertFilterBucket
): number {
  return inspectors.filter(i => inspectorMatchesCertFilter(i, filter, 'ALL')).length;
}
