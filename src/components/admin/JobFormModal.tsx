import React, { useMemo, useState } from 'react';
import {
  X, Plus, AlertTriangle, CheckCircle2, UserCheck, Link, ChevronLeft, ChevronRight, Search
} from 'lucide-react';
import { Job, Customer, Inspector, Equipment, NdtMethod, AuditEntry, NdtProcedure } from '../../types';
import { StorageService } from '../../services/storage';
import {
  validateInspectorEligibility,
  validateSupervisorEligibility,
  validateLevelCompliance,
  suggestEquipmentForSlots,
  isLevel1ForMethod,
  getMethodCertLevel
} from '../../utils/validation';
import { ensureProcedureSnapshotOnJob } from '../../utils/procedureSnapshot';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { DateField, todayKey, addDaysToKey } from '../common/DateField';
import {
  WIZARD_STEPS,
  METHOD_SCOPE_DEFAULTS,
  inspectorsForMethod,
  sortInspectorsByName,
  filterInspectorsByQuery,
  equipmentForMethod,
  getEquipmentAssignState,
  getAssignBlockers
} from '../../utils/jobWizard';

interface JobFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJobCreated: (job: Job) => void;
  customers: Customer[];
  inspectors: Inspector[];
  equipment: Equipment[];
  procedures: NdtProcedure[];
  existingJob?: Job;
}

function buildSuggestedIds(
  proc: NdtProcedure | undefined,
  equipmentList: Equipment[]
): string[] {
  if (!proc) return [];
  const suggestions = suggestEquipmentForSlots(proc.equipmentSlots, equipmentList, proc.method);
  return suggestions
    .map(s => s.candidates[0]?.id)
    .filter((id): id is string => Boolean(id));
}

export const JobFormModal: React.FC<JobFormModalProps> = ({
  isOpen, onClose, onJobCreated, customers, inspectors, equipment, procedures, existingJob
}) => {
  const [step, setStep] = useState(1);
  const [jobNumber] = useState(existingJob?.jobNumber || StorageService.generateNextJobNumber());
  const [customerId, setCustomerId] = useState(existingJob?.customerId || (customers[0]?.id || ''));
  const selectedCustomer = customers.find(c => c.id === customerId);
  const sites = selectedCustomer?.sites || [];
  const [siteId, setSiteId] = useState(existingJob?.siteId || (sites[0]?.id || ''));
  const [inspectionDate, setInspectionDate] = useState(() => {
    const today = todayKey();
    const existing = existingJob?.inspectionDate;
    if (existing && existing >= today) return existing;
    return today;
  });
  const [dueDate, setDueDate] = useState(() => {
    const insp = existingJob?.inspectionDate || todayKey();
    const due = existingJob?.dueDate || '';
    if (due && due > insp) return due;
    return '';
  });
  const [inspectorId, setInspectorId] = useState(existingJob?.inspectorId || '');
  const [supervisorId, setSupervisorId] = useState(existingJob?.supervisorId || '');
  const [method, setMethod] = useState<NdtMethod>(existingJob?.method || 'UT');
  const [scope, setScope] = useState(existingJob?.scope || METHOD_SCOPE_DEFAULTS.UT.scope);
  const [standardSpec, setStandardSpec] = useState(
    existingJob?.standardSpec || METHOD_SCOPE_DEFAULTS.UT.standard
  );
  const [generalNotes, setGeneralNotes] = useState(existingJob?.generalNotes || '');
  const [surfacePrepInstruction, setSurfacePrepInstruction] = useState(
    existingJob?.surfacePrepInstruction || ''
  );
  const [linkedProcedureId, setLinkedProcedureId] = useState(existingJob?.procedureId || '');
  const [equipmentIds, setEquipmentIds] = useState<string[]>(existingJob?.equipmentIds || []);
  const [suggestedEquipmentIds, setSuggestedEquipmentIds] = useState<string[]>(() =>
    buildSuggestedIds(
      procedures.find(p => p.id === existingJob?.procedureId),
      equipment
    )
  );
  const [leadQuery, setLeadQuery] = useState('');
  const [supQuery, setSupQuery] = useState('');
  const [equipQuery, setEquipQuery] = useState('');

  useBodyScrollLock(isOpen);

  const today = todayKey();
  const dueMinDate = inspectionDate ? addDaysToKey(inspectionDate, 1) : undefined;

  const handleInspectionDateChange = (next: string) => {
    setInspectionDate(next);
    if (dueDate && dueDate <= next) {
      setDueDate('');
    }
  };

  const selectedInspector = inspectors.find(i => i.id === inspectorId);
  const isLevel1 = selectedInspector ? isLevel1ForMethod(selectedInspector, method) : false;
  const isDraftEdit = existingJob?.status === 'Draft' || !existingJob;
  const editingNonDraft = Boolean(existingJob && existingJob.status !== 'Draft');

  const matchingProcedures = procedures.filter(p => p.method === method && p.status === 'Active');
  const linkedProc = procedures.find(p => p.id === linkedProcedureId);

  const leadList = useMemo(() => {
    const base = sortInspectorsByName(inspectorsForMethod(inspectors, method));
    return filterInspectorsByQuery(base, leadQuery);
  }, [inspectors, method, leadQuery]);

  const supervisorCandidates = useMemo(() => {
    const base = sortInspectorsByName(
      inspectorsForMethod(inspectors, method).filter(i => {
        if (i.id === inspectorId) return false;
        const lvl = getMethodCertLevel(i, method) || i.level;
        return lvl === 'Level 2' || lvl === 'Level 3';
      })
    );
    return filterInspectorsByQuery(base, supQuery);
  }, [inspectors, method, inspectorId, supQuery]);

  const equipmentList = useMemo(() => {
    let list = equipmentForMethod(equipment, method);
    const q = equipQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        e =>
          e.name.toLowerCase().includes(q) ||
          e.serialNumber.toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [equipment, method, equipQuery]);

  if (!isOpen) return null;

  const assignBlockers = getAssignBlockers({
    customerId,
    siteId,
    method,
    inspectionDate,
    inspectorId,
    supervisorId,
    linkedProcedureId,
    equipmentIds,
    inspectors,
    procedures,
    equipment,
    editingJobId: existingJob?.id,
    scope
  });

  const step1Valid = Boolean(customerId && siteId && method && inspectionDate);

  const handleCustomerChange = (newCustId: string) => {
    setCustomerId(newCustId);
    const newCust = customers.find(c => c.id === newCustId);
    setSiteId(newCust?.sites[0]?.id || '');
  };

  const handleMethodChange = (m: NdtMethod) => {
    if (m === method) return;
    const hasDeps = inspectorId || supervisorId || linkedProcedureId || equipmentIds.length > 0;
    if (hasDeps && !window.confirm('Changing method clears inspector, supervisor, procedure, and equipment.')) {
      return;
    }
    setMethod(m);
    setLinkedProcedureId('');
    setInspectorId('');
    setSupervisorId('');
    setEquipmentIds([]);
    setSuggestedEquipmentIds([]);
    setScope(METHOD_SCOPE_DEFAULTS[m].scope);
    setStandardSpec(METHOD_SCOPE_DEFAULTS[m].standard);
  };

  const handleProcedureSelect = (procId: string) => {
    setLinkedProcedureId(procId);
    if (!procId) {
      setSuggestedEquipmentIds([]);
      return;
    }
    const proc = procedures.find(p => p.id === procId);
    if (proc) {
      setScope(proc.scope);
      setStandardSpec(proc.standardRef);
      setSuggestedEquipmentIds(buildSuggestedIds(proc, equipment));
      // Do NOT auto-tick equipment
    }
  };

  const toggleEquipment = (id: string) => {
    const eq = equipment.find(e => e.id === id);
    if (!eq) return;
    const st = getEquipmentAssignState(eq, existingJob?.id);
    if (!st.selectable && !equipmentIds.includes(id)) return;
    setEquipmentIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  const tryClose = () => {
    if (step > 1 || inspectorId || linkedProcedureId || equipmentIds.length > 0) {
      if (!window.confirm('Close wizard? Unsaved changes will be lost.')) return;
    }
    onClose();
  };

  const persistJob = (mode: 'draft' | 'assign' | 'save') => {
    if (!step1Valid) {
      alert('Customer, site, method, and inspection date are required.');
      setStep(1);
      return;
    }

    if (mode === 'assign' || (mode === 'save' && existingJob && existingJob.status !== 'Draft')) {
      if (assignBlockers.length > 0) {
        alert(`Cannot save yet:\n• ${assignBlockers.join('\n• ')}`);
        setStep(5);
        return;
      }
      const lead = inspectors.find(i => i.id === inspectorId)!;
      const sup = inspectors.find(i => i.id === supervisorId);
      if (isLevel1ForMethod(lead, method) && sup) {
        const levelCheck = validateLevelCompliance(lead, sup, method);
        if (!levelCheck.compliant) {
          alert(levelCheck.reason);
          return;
        }
      }
    }

    const assignedInspector = inspectors.find(i => i.id === inspectorId);
    const assignedSupervisor = inspectors.find(i => i.id === supervisorId);
    const leadIsL1 = assignedInspector ? isLevel1ForMethod(assignedInspector, method) : false;

    let nextStatus = existingJob?.status || 'Draft';
    if (mode === 'draft') nextStatus = 'Draft';
    if (mode === 'assign') nextStatus = existingJob && existingJob.status !== 'Draft' ? existingJob.status : 'Assigned';
    if (mode === 'save' && existingJob) nextStatus = existingJob.status;

    const baseFields = {
      jobNumber,
      customerId,
      siteId,
      inspectionDate,
      dueDate: dueDate || undefined,
      inspectorId: inspectorId || '',
      supervisorId: leadIsL1 ? supervisorId || undefined : undefined,
      method,
      scope,
      standardSpec,
      procedureId: linkedProcedureId || undefined,
      procedureNumber: linkedProc?.procedureNumber,
      equipmentIds,
      generalNotes,
      surfacePrepInstruction: surfacePrepInstruction.trim() || undefined,
      status: nextStatus
    };

    if (existingJob) {
      let updatedJob: Job = {
        ...existingJob,
        ...baseFields
      };

      const audit: AuditEntry = {
        id: 'aud-' + Date.now(),
        timestamp: new Date().toISOString(),
        actorName: 'Admin',
        actorRole: 'Admin',
        action: mode === 'draft' ? 'JOB_DRAFT_SAVED' : mode === 'assign' ? 'JOB_ASSIGNED' : 'JOB_CREATED',
        details:
          mode === 'draft'
            ? `Draft ${jobNumber} updated.`
            : mode === 'assign'
            ? `Job ${jobNumber} assigned to ${assignedInspector?.fullName || 'lead'} (${method}).`
            : `Job ${jobNumber} updated.`
      };
      updatedJob.auditTrail = [...(updatedJob.auditTrail || []), audit];

      if (mode === 'assign' || (mode === 'save' && (nextStatus === 'Assigned' || nextStatus === 'In Progress'))) {
        updatedJob = ensureProcedureSnapshotOnJob(updatedJob, procedures, 'assign');
      }

      StorageService.updateJob(updatedJob);
      onJobCreated(updatedJob);
    } else {
      const auditEntries: AuditEntry[] = [
        {
          id: 'aud-' + Date.now(),
          timestamp: new Date().toISOString(),
          actorName: 'Admin',
          actorRole: 'Admin',
          action: mode === 'draft' ? 'JOB_DRAFT_SAVED' : 'JOB_CREATED',
          details:
            mode === 'draft'
              ? `Draft job ${jobNumber} saved for ${selectedCustomer?.companyName || 'Customer'} (${method}).`
              : `Created and assigned job ${jobNumber} for ${selectedCustomer?.companyName || 'Customer'} (${method}) to ${assignedInspector?.fullName || 'lead'}.`
        }
      ];
      if (mode === 'assign' && leadIsL1 && assignedSupervisor) {
        auditEntries.push({
          id: 'aud-' + (Date.now() + 1),
          timestamp: new Date().toISOString(),
          actorName: 'Admin',
          actorRole: 'Admin',
          action: 'JOB_ASSIGNED',
          details: `Level 1 ${assignedInspector?.fullName} with supervisor ${assignedSupervisor.fullName} (${method}).`
        });
      }

      let newJobPayload: Omit<Job, 'id' | 'createdAt' | 'updatedAt'> = {
        ...baseFields,
        overallResult: 'PENDING',
        items: [],
        auditTrail: auditEntries
      };

      if (mode === 'assign') {
        newJobPayload = ensureProcedureSnapshotOnJob(
          { ...newJobPayload, id: 'temp', createdAt: '', updatedAt: '' } as Job,
          procedures,
          'assign'
        );
        const { id: _i, createdAt: _c, updatedAt: _u, ...rest } = newJobPayload as Job;
        newJobPayload = rest;
      }

      const newJob = StorageService.addJob(newJobPayload);
      onJobCreated(newJob);
    }

    onClose();
  };

  const title = existingJob
    ? existingJob.status === 'Draft'
      ? 'Edit draft'
      : 'Edit job'
    : 'Create job';

  const renderPersonRow = (
    insp: Inspector,
    selected: boolean,
    onSelect: () => void,
    eligibility: ReturnType<typeof validateInspectorEligibility>
  ) => {
    const isL1 = isLevel1ForMethod(insp, method);
    return (
      <button
        key={insp.id}
        type="button"
        disabled={eligibility.blocked}
        onClick={onSelect}
        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-left transition-all ${
          eligibility.blocked
            ? 'border-slate-800 bg-slate-950/40 opacity-55 cursor-not-allowed'
            : selected
            ? 'border-sky-500 bg-sky-500/15 ring-1 ring-sky-500/50'
            : eligibility.warning
            ? 'border-amber-500/40 bg-amber-950/10 hover:border-amber-400/60'
            : 'border-slate-700 bg-slate-950 hover:border-slate-500'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-2 h-2 rounded-full shrink-0 ${
              eligibility.blocked ? 'bg-rose-500' : eligibility.warning ? 'bg-amber-400' : 'bg-emerald-400'
            }`}
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm text-white">{insp.fullName}</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                  isL1
                    ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                    : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                }`}
              >
                {method} {getMethodCertLevel(insp, method) || insp.level}
              </span>
            </div>
            <p
              className={`text-xs mt-0.5 truncate ${
                eligibility.blocked ? 'text-rose-400' : eligibility.warning ? 'text-amber-400' : 'text-slate-400'
              }`}
            >
              {eligibility.reason}
            </p>
          </div>
        </div>
        {selected && <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />}
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-3 sm:p-4 overflow-hidden">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[94vh] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
              <Plus className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-base text-white">{title}</h3>
              <p className="text-xs text-slate-400 font-mono">{jobNumber}</p>
            </div>
          </div>
          <button type="button" onClick={tryClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 pt-3 pb-2 border-b border-slate-800/80 flex gap-1 overflow-x-auto">
          {WIZARD_STEPS.map(s => {
            const done = s.id < step;
            const current = s.id === step;
            return (
              <button
                key={s.id}
                type="button"
                disabled={s.id > step}
                onClick={() => s.id < step && setStep(s.id)}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold shrink-0 transition-colors ${
                  current
                    ? 'bg-sky-600 text-white'
                    : done
                    ? 'bg-slate-800 text-sky-300 hover:bg-slate-700'
                    : 'bg-slate-950 text-slate-600 cursor-not-allowed'
                }`}
              >
                {s.id} {s.label}
              </button>
            );
          })}
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-slate-200">
          {step === 1 && (
            <div className="space-y-4">
              <h4 className="text-sm font-black text-white uppercase tracking-wide">Work</h4>
              <p className="text-xs text-slate-400">
                After these fields are set, use <span className="text-slate-200 font-semibold">Save draft</span> anytime in the footer — you do not need to finish People / Procedure / Equipment first.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Customer *</label>
                  <select
                    value={customerId}
                    onChange={e => handleCustomerChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-sky-500"
                  >
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.companyName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Site *</label>
                  {sites.length === 0 ? (
                    <p className="text-xs text-amber-300 py-2">Add a site on the customer record.</p>
                  ) : (
                    <select
                      value={siteId}
                      onChange={e => setSiteId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-sky-500"
                    >
                      {sites.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Method *</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['UT', 'MT', 'PT', 'VT'] as NdtMethod[]).map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => handleMethodChange(m)}
                      className={`py-2.5 rounded-xl font-black text-xs ${
                        method === m
                          ? 'bg-sky-600 text-white ring-2 ring-sky-400'
                          : 'bg-slate-950 text-slate-400 border border-slate-800'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5">People and equipment lists will match this method.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <DateField
                  label="Inspection date (on site)"
                  required
                  value={inspectionDate}
                  onChange={handleInspectionDateChange}
                  minDate={today}
                  hint="Today or later — past dates are blocked"
                />
                <DateField
                  label="Due date — report / close-out"
                  clearable
                  value={dueDate}
                  onChange={setDueDate}
                  disabled={!inspectionDate}
                  minDate={dueMinDate}
                  hint={
                    inspectionDate
                      ? `Optional — must be after ${inspectionDate}`
                      : 'Set inspection date first'
                  }
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h4 className="text-sm font-black text-white uppercase tracking-wide">People · {method}</h4>
              {!inspectorId && (
                <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-amber-950/30 border border-amber-500/30 text-xs text-amber-200">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  No lead yet — required before Assign.
                </div>
              )}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="search"
                  value={leadQuery}
                  onChange={e => setLeadQuery(e.target.value)}
                  placeholder="Search inspectors"
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-sky-500"
                />
              </div>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {leadList.length === 0 && (
                  <p className="text-xs text-slate-500">No {method}-qualified inspectors match.</p>
                )}
                {leadList.map(insp => {
                  const eligibility = validateInspectorEligibility(insp, method);
                  return renderPersonRow(insp, inspectorId === insp.id, () => {
                    setInspectorId(insp.id);
                    if (isLevel1ForMethod(insp, method) && insp.defaultSupervisorId) {
                      const def = inspectors.find(x => x.id === insp.defaultSupervisorId);
                      if (def && !validateSupervisorEligibility(def, method).blocked) {
                        setSupervisorId(insp.defaultSupervisorId!);
                      } else setSupervisorId('');
                    } else {
                      setSupervisorId('');
                    }
                  }, eligibility);
                })}
              </div>

              {isLevel1 && (
                <div className="bg-violet-950/30 border border-violet-500/30 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-violet-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-violet-300">
                      Level 1 lead — select supervisor
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Select a Level 2 or 3 supervisor for this method (valid cert / vision / authorization).
                  </p>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="search"
                      value={supQuery}
                      onChange={e => setSupQuery(e.target.value)}
                      placeholder="Search supervisors"
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-violet-400"
                    />
                  </div>
                  <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                    {supervisorCandidates.map(s => {
                      const eligibility = validateSupervisorEligibility(s, method);
                      return renderPersonRow(s, supervisorId === s.id, () => setSupervisorId(s.id), eligibility);
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h4 className="text-sm font-black text-white uppercase tracking-wide">Procedure & scope</h4>
              {!linkedProcedureId && (
                <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-amber-950/30 border border-amber-500/30 text-xs text-amber-200">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  Procedure required before Assign. Draft may skip.
                </div>
              )}
              {matchingProcedures.length === 0 ? (
                <p className="text-xs text-amber-300">
                  No Active {method} procedures — create one in L3 Procedures or save as Draft.
                </p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {matchingProcedures.map(p => {
                    const selected = linkedProcedureId === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleProcedureSelect(p.id)}
                        className={`w-full text-left px-3.5 py-2.5 rounded-xl border ${
                          selected
                            ? 'border-amber-400 bg-amber-500/15 ring-1 ring-amber-400/40'
                            : 'border-slate-700 bg-slate-950 hover:border-amber-500/40'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Link className="w-3.5 h-3.5 text-amber-400" />
                          <span className="font-bold text-sm text-white">{p.procedureNumber}</span>
                          <span className="text-[10px] text-slate-500">{p.revisionNumber}</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5 truncate">{p.title}</p>
                      </button>
                    );
                  })}
                </div>
              )}
              {linkedProcedureId && (
                <button
                  type="button"
                  onClick={() => handleProcedureSelect('')}
                  className="text-xs text-slate-400 hover:text-sky-300 font-semibold"
                >
                  Skip for now (Draft)
                </button>
              )}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Scope of inspection</label>
                <input
                  type="text"
                  value={scope}
                  onChange={e => setScope(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Standard / specification</label>
                <input
                  type="text"
                  value={standardSpec}
                  onChange={e => setStandardSpec(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Surface prep instruction <span className="text-slate-500 font-normal normal-case">(optional)</span>
                </label>
                <input
                  type="text"
                  value={surfacePrepInstruction}
                  onChange={e => setSurfacePrepInstruction(e.target.value)}
                  placeholder="Client/planned prep — not as-found certificate data"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-sky-500"
                />
                <p className="mt-1.5 text-[10px] text-slate-500">
                  As-found surface, measured °C, and light are recorded by the inspector on site after Start work — not at assign.
                </p>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-sm font-black text-white uppercase tracking-wide">Equipment</h4>
                <span className="text-xs text-slate-400">{equipmentIds.length} selected</span>
              </div>
              <p className="text-[11px] text-slate-500">Showing {method} and General equipment.</p>
              {equipmentIds.length === 0 && (
                <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-amber-950/30 border border-amber-500/30 text-xs text-amber-200">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  At least one equipment item required before Assign.
                </div>
              )}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="search"
                  value={equipQuery}
                  onChange={e => setEquipQuery(e.target.value)}
                  placeholder="Search equipment"
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-sky-500"
                />
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {equipmentList.map(eq => {
                  const st = getEquipmentAssignState(eq, existingJob?.id);
                  const selected = equipmentIds.includes(eq.id);
                  const fromProc = suggestedEquipmentIds.includes(eq.id);
                  const canToggle = st.selectable || selected;
                  return (
                    <button
                      key={eq.id}
                      type="button"
                      disabled={!canToggle}
                      onClick={() => toggleEquipment(eq.id)}
                      className={`w-full text-left px-3 py-2.5 rounded-xl border text-sm transition-all ${
                        !st.selectable && !selected
                          ? 'border-slate-800 bg-slate-950/40 opacity-55 cursor-not-allowed'
                          : selected
                          ? 'border-sky-500/50 bg-sky-500/10 text-sky-100'
                          : fromProc
                          ? 'border-amber-500/40 bg-amber-950/15 hover:border-amber-400/60'
                          : 'border-slate-700 bg-slate-950 text-slate-300 hover:border-sky-500/30'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold">{eq.name}</span>
                        {fromProc && (
                          <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/40 shrink-0">
                            From procedure
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-400 block mt-0.5">
                        {eq.serialNumber} · {eq.category || '—'}
                      </span>
                      <span
                        className={`text-[11px] font-semibold block mt-0.5 ${
                          st.selectable
                            ? st.kind === 'warn_due_soon'
                              ? 'text-amber-400'
                              : 'text-emerald-400/80'
                            : 'text-rose-400'
                        }`}
                      >
                        {st.reason}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <h4 className="text-sm font-black text-white uppercase tracking-wide">Review & release</h4>
              {assignBlockers.length > 0 && (
                <div className="rounded-xl border border-rose-500/40 bg-rose-950/30 px-3 py-2.5 space-y-1">
                  <p className="text-xs font-bold text-rose-300">
                    {editingNonDraft ? 'Cannot save yet' : 'Cannot assign yet'}
                  </p>
                  <ul className="text-xs text-rose-200/90 list-disc pl-4 space-y-0.5">
                    {assignBlockers.map(b => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>
                </div>
              )}
              {[
                {
                  step: 1,
                  label: 'Work',
                  body: `${selectedCustomer?.companyName || '—'} · ${sites.find(s => s.id === siteId)?.name || '—'} · ${method} · ${inspectionDate}`
                },
                {
                  step: 2,
                  label: 'People',
                  body: selectedInspector
                    ? `${selectedInspector.fullName}${isLevel1 ? ` · Sup: ${inspectors.find(i => i.id === supervisorId)?.fullName || '—'}` : ''}`
                    : 'No lead'
                },
                {
                  step: 3,
                  label: 'Procedure',
                  body: linkedProc ? `${linkedProc.procedureNumber} — ${linkedProc.title}` : 'None linked'
                },
                {
                  step: 4,
                  label: 'Equipment',
                  body: equipmentIds.length
                    ? equipment
                        .filter(e => equipmentIds.includes(e.id))
                        .map(e => e.name)
                        .join(', ')
                    : 'None selected'
                }
              ].map(block => (
                <div key={block.step} className="rounded-xl border border-slate-800 bg-slate-950/60 px-3.5 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase text-slate-500">{block.label}</span>
                    <button type="button" onClick={() => setStep(block.step)} className="text-[11px] font-bold text-sky-400">
                      Edit
                    </button>
                  </div>
                  <p className="text-sm text-slate-200 mt-0.5">{block.body}</p>
                  {block.step === 3 && (
                    <p className="text-xs text-slate-500 mt-1 truncate">{scope} · {standardSpec}</p>
                  )}
                </div>
              ))}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">General notes</label>
                <textarea
                  rows={2}
                  value={generalNotes}
                  onChange={e => setGeneralNotes(e.target.value)}
                  placeholder="Access, site conditions, client notes…"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-slate-800 flex items-center justify-between gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => (step === 1 ? tryClose() : setStep(step - 1))}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-700 text-slate-300 text-sm font-semibold hover:bg-slate-800"
          >
            {step === 1 ? 'Cancel' : <><ChevronLeft className="w-4 h-4" /> Back</>}
          </button>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* Save draft available on every step once Work is valid — pack: Draft = Step 1 only */}
            {isDraftEdit && (
              <button
                type="button"
                disabled={!step1Valid}
                onClick={() => persistJob('draft')}
                title={!step1Valid ? 'Complete customer, site, method, and inspection date first' : 'Save as Draft and close'}
                className="px-4 py-2 rounded-xl border border-slate-600 text-slate-200 text-sm font-bold hover:bg-slate-800 disabled:opacity-40"
              >
                Save draft
              </button>
            )}
            {step < 5 && (
              <button
                type="button"
                disabled={step === 1 && !step1Valid}
                onClick={() => setStep(step + 1)}
                className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-sky-600 text-white text-sm font-bold disabled:opacity-40"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            )}
            {step === 5 && isDraftEdit && (
              <button
                type="button"
                disabled={assignBlockers.length > 0}
                onClick={() => persistJob('assign')}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-500 text-white text-sm font-bold disabled:opacity-40 shadow-lg shadow-sky-500/20"
              >
                Assign
              </button>
            )}
            {step === 5 && editingNonDraft && (
              <button
                type="button"
                disabled={assignBlockers.length > 0}
                onClick={() => persistJob('save')}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-500 text-white text-sm font-bold disabled:opacity-40 shadow-lg shadow-sky-500/20"
              >
                Save changes
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
