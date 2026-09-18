import { Equipment, Inspector, NdtMethod, NdtProcedure } from '../types';
import {
  checkExpiry,
  getMethodCertificate,
  isLevel1ForMethod,
  methodToEquipmentCategory,
  validateInspectorEligibility,
  validateSupervisorEligibility
} from './validation';

export type EquipmentAssignKind =
  | 'selectable'
  | 'warn_due_soon'
  | 'blocked_expired'
  | 'blocked_oos'
  | 'blocked_checked_out'
  | 'blocked_other';

export interface EquipmentAssignState {
  kind: EquipmentAssignKind;
  selectable: boolean;
  reason: string;
}

export function inspectorHasMethod(inspector: Inspector, method: NdtMethod): boolean {
  if (getMethodCertificate(inspector, method)) return true;
  return inspector.methods.includes(method);
}

export function inspectorsForMethod(inspectors: Inspector[], method: NdtMethod): Inspector[] {
  return inspectors.filter(i => inspectorHasMethod(i, method));
}

export function sortInspectorsByName(list: Inspector[]): Inspector[] {
  return [...list].sort((a, b) => a.fullName.localeCompare(b.fullName, undefined, { sensitivity: 'base' }));
}

export function filterInspectorsByQuery(list: Inspector[], query: string): Inspector[] {
  const q = query.trim().toLowerCase();
  if (!q) return list;
  return list.filter(i => i.fullName.toLowerCase().includes(q));
}

/** Method category + General. Uncategorized items included (demo safety). */
export function equipmentForMethod(equipment: Equipment[], method: NdtMethod): Equipment[] {
  const cat = methodToEquipmentCategory(method);
  return equipment.filter(eq => {
    if (!eq.category) return true;
    return eq.category === cat || eq.category === 'General';
  });
}

/**
 * @param editingJobId — when set, kit already On Job for this job stays selectable
 */
export function getEquipmentAssignState(
  eq: Equipment,
  editingJobId?: string
): EquipmentAssignState {
  if (eq.status === 'Out of Service') {
    return { kind: 'blocked_oos', selectable: false, reason: 'Out of service' };
  }
  if (eq.checkoutStatus === 'Incident Reported') {
    return { kind: 'blocked_other', selectable: false, reason: 'Quarantined — incident reported' };
  }
  if (eq.checkoutStatus === 'In Maintenance') {
    return { kind: 'blocked_other', selectable: false, reason: 'In maintenance' };
  }
  if (eq.checkoutStatus === 'On Job') {
    const sameJob = editingJobId && eq.currentJobId === editingJobId;
    if (!sameJob) {
      const ref = eq.currentJobNumber || eq.currentJobId || 'another job';
      return {
        kind: 'blocked_checked_out',
        selectable: false,
        reason: `Checked out to job ${ref}`
      };
    }
  }

  const cal = checkExpiry(eq.calibrationExpiryDate);
  if (cal.status === 'expired') {
    return { kind: 'blocked_expired', selectable: false, reason: `Calibration expired (${cal.formattedText})` };
  }
  if (cal.status === 'expiring_soon') {
    return { kind: 'warn_due_soon', selectable: true, reason: `Cal due soon (${cal.formattedText})` };
  }
  return { kind: 'selectable', selectable: true, reason: 'Available' };
}

export interface AssignBlockerInput {
  customerId: string;
  siteId: string;
  method: NdtMethod;
  inspectionDate: string;
  inspectorId: string;
  supervisorId: string;
  linkedProcedureId: string;
  equipmentIds: string[];
  inspectors: Inspector[];
  procedures: NdtProcedure[];
  equipment: Equipment[];
  editingJobId?: string;
  scope?: string;
}

export function getAssignBlockers(input: AssignBlockerInput): string[] {
  const blockers: string[] = [];
  if (!input.customerId) blockers.push('Select a customer');
  if (!input.siteId) blockers.push('Select a site');
  if (!input.method) blockers.push('Select a method');
  if (!input.inspectionDate) blockers.push('Set inspection date');
  if (!input.scope?.trim()) blockers.push('Record scope of examination');

  if (!input.inspectorId) {
    blockers.push('Select a lead inspector');
  } else {
    const lead = input.inspectors.find(i => i.id === input.inspectorId);
    if (!lead) {
      blockers.push('Lead inspector not found');
    } else {
      const elig = validateInspectorEligibility(lead, input.method);
      if (elig.blocked) blockers.push(`Lead: ${elig.reason}`);
      if (isLevel1ForMethod(lead, input.method)) {
        if (!input.supervisorId) {
          blockers.push('Level 1 lead requires a supervisor');
        } else {
          const sup = input.inspectors.find(i => i.id === input.supervisorId);
          if (!sup) blockers.push('Supervisor not found');
          else {
            const sElig = validateSupervisorEligibility(sup, input.method);
            if (sElig.blocked) blockers.push(`Supervisor: ${sElig.reason}`);
          }
        }
      }
    }
  }

  if (!input.linkedProcedureId) {
    blockers.push('Link an Active written examination procedure');
  } else {
    const proc = input.procedures.find(p => p.id === input.linkedProcedureId);
    if (!proc) blockers.push('Linked procedure not found');
    else if (proc.status !== 'Active') blockers.push(`Procedure must be Active (currently ${proc.status})`);
    else if (proc.method !== input.method) blockers.push('Procedure method does not match job method');
  }

  if (input.equipmentIds.length === 0) {
    blockers.push('Select at least one equipment item');
  } else {
    for (const id of input.equipmentIds) {
      const eq = input.equipment.find(e => e.id === id);
      if (!eq) {
        blockers.push(`Equipment ${id} missing from register`);
        continue;
      }
      const st = getEquipmentAssignState(eq, input.editingJobId);
      if (!st.selectable) blockers.push(`${eq.name}: ${st.reason}`);
    }
  }

  return blockers;
}

export const METHOD_SCOPE_DEFAULTS: Record<NdtMethod, { scope: string; standard: string }> = {
  UT: { scope: 'Ultrasonic thickness survey and weld volumetric examination', standard: 'ASME Section V / ASME B31.3' },
  MT: { scope: 'Magnetic Particle inspection of structural welds and lifting lugs', standard: 'AWS D1.1 Clause 6 / ISO 17638' },
  PT: { scope: 'Liquid penetrant testing of root and final weld passes', standard: 'ASME Section V Art. 6 / ISO 3452-1' },
  VT: { scope: 'Visual inspection of completed pressure piping fabrication', standard: 'ASME B31.3 Table 341.3.2' }
};

export const WIZARD_STEPS = [
  { id: 1, label: 'Work' },
  { id: 2, label: 'People' },
  { id: 3, label: 'Procedure' },
  { id: 4, label: 'Equipment' },
  { id: 5, label: 'Review' }
] as const;
