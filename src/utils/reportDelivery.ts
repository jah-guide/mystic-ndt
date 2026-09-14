import { Job } from '../types';
import { isL3Certified } from './validation';

export function isReportDeliveryAllowed(job: Job): boolean {
  if (isL3Certified(job) || job.l3ReviewStatus === 'APPROVED') return true;
  if (job.finalWithoutL3 && (job.finalWithoutL3Reason || '').trim()) return true;
  return false;
}

export function getReportFinalLabel(job: Job): 'Final' | 'Final (Admin waiver)' | 'Field-complete' | 'Draft' {
  if (isL3Certified(job) || job.l3ReviewStatus === 'APPROVED') return 'Final';
  if (job.finalWithoutL3) return 'Final (Admin waiver)';
  if (job.status === 'Completed') return 'Field-complete';
  return 'Draft';
}
