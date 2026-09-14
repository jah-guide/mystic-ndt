import {
  AcceptanceCriterion,
  AuditEntry,
  Job,
  NdtProcedure,
  ProcedureEquipmentSlot,
  ProcedureSnapshot,
  TemperatureRange
} from '../types';

function cloneCriteria(list: AcceptanceCriterion[]): AcceptanceCriterion[] {
  return list.map(c => ({ ...c }));
}

function cloneTempRanges(list?: TemperatureRange[]): TemperatureRange[] | undefined {
  return list ? list.map(r => ({ ...r })) : undefined;
}

function cloneSlots(list?: ProcedureEquipmentSlot[]): ProcedureEquipmentSlot[] | undefined {
  return list ? list.map(s => ({ ...s })) : undefined;
}

export function buildProcedureSnapshot(
  proc: NdtProcedure,
  source: ProcedureSnapshot['snapshotSource'],
  reason?: string
): ProcedureSnapshot {
  return {
    procedureId: proc.id,
    procedureNumber: proc.procedureNumber,
    title: proc.title,
    method: proc.method,
    revisionNumber: proc.revisionNumber,
    standardRef: proc.standardRef,
    acceptanceCriteria: cloneCriteria(proc.acceptanceCriteria || []),
    temperatureRanges: cloneTempRanges(proc.temperatureRanges),
    temperature: proc.temperature,
    equipmentSlots: cloneSlots(proc.equipmentSlots),
    snapshotAt: new Date().toISOString(),
    snapshotSource: source,
    replacedReason: reason
  };
}

/** Prefer frozen snapshot; fall back to live procedure for legacy jobs. */
export function getJobProcedureView(
  job: Job,
  liveProcedures: NdtProcedure[]
): { snapshot: ProcedureSnapshot | null; live: NdtProcedure | undefined; displayRevision: string | null } {
  if (job.procedureSnapshot) {
    return {
      snapshot: job.procedureSnapshot,
      live: liveProcedures.find(p => p.id === job.procedureSnapshot!.procedureId),
      displayRevision: job.procedureSnapshot.revisionNumber
    };
  }
  const live = job.procedureId
    ? liveProcedures.find(p => p.id === job.procedureId)
    : undefined;
  return { snapshot: null, live, displayRevision: live?.revisionNumber || null };
}

/** Ensure snapshot exists when assigning or starting; no-op if already frozen or no procedure. */
export function ensureProcedureSnapshotOnJob(
  job: Job,
  procedures: NdtProcedure[],
  source: 'assign' | 'start'
): Job {
  if (job.procedureSnapshot) return job;
  const procId = job.procedureId;
  if (!procId) return job;
  const proc = procedures.find(p => p.id === procId);
  if (!proc) return job;
  const snapshot = buildProcedureSnapshot(proc, source);
  return {
    ...job,
    procedureId: proc.id,
    procedureNumber: proc.procedureNumber,
    procedureSnapshot: snapshot,
    auditTrail: [
      ...(job.auditTrail || []),
      {
        id: 'aud-snap-' + Date.now(),
        timestamp: snapshot.snapshotAt,
        actorName: source === 'assign' ? 'Admin' : 'System',
        actorRole: source === 'assign' ? 'Admin' : 'Inspector',
        action: 'PROCEDURE_SNAPSHOT',
        details: `Frozen WEP ${proc.procedureNumber} ${proc.revisionNumber} on ${source}.`
      }
    ]
  };
}

export function replaceProcedureSnapshot(
  job: Job,
  newProc: NdtProcedure,
  actorName: string,
  actorRole: AuditEntry['actorRole'],
  reason: string
): Job {
  const snapshot = buildProcedureSnapshot(newProc, 'replace', reason);
  return {
    ...job,
    procedureId: newProc.id,
    procedureNumber: newProc.procedureNumber,
    procedureSnapshot: snapshot,
    auditTrail: [
      ...(job.auditTrail || []),
      {
        id: 'aud-snap-repl-' + Date.now(),
        timestamp: snapshot.snapshotAt,
        actorName,
        actorRole,
        action: 'PROCEDURE_SNAPSHOT_REPLACE',
        details: `Replaced procedure snapshot with ${newProc.procedureNumber} ${newProc.revisionNumber}. Reason: ${reason}`
      }
    ]
  };
}
