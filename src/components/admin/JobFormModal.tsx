import React, { useState } from 'react';
import { X, Plus, Sparkles, Calendar, Shield, AlertTriangle, CheckCircle2, UserCheck, Link } from 'lucide-react';
import { Job, Customer, Inspector, Equipment, NdtMethod, JobStatus, AuditEntry, NdtProcedure } from '../../types';
import { StorageService } from '../../services/storage';
import { validateInspectorEligibility, validateSupervisorEligibility, validateLevelCompliance } from '../../utils/validation';
import { Badge } from '../common/Badge';

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

export const JobFormModal: React.FC<JobFormModalProps> = ({
  isOpen, onClose, onJobCreated, customers, inspectors, equipment, procedures, existingJob
}) => {
  const [jobNumber] = useState(existingJob?.jobNumber || StorageService.generateNextJobNumber());
  const [customerId, setCustomerId] = useState(existingJob?.customerId || (customers.length > 0 ? customers[0].id : ''));
  const selectedCustomer = customers.find(c => c.id === customerId);
  const sites = selectedCustomer?.sites || [];
  const [siteId, setSiteId] = useState(existingJob?.siteId || (sites.length > 0 ? sites[0].id : ''));
  const [inspectionDate, setInspectionDate] = useState(existingJob?.inspectionDate || new Date().toISOString().split('T')[0]);
  const [inspectorId, setInspectorId] = useState(existingJob?.inspectorId || '');
  const [supervisorId, setSupervisorId] = useState(existingJob?.supervisorId || '');
  const [method, setMethod] = useState<NdtMethod>(existingJob?.method || 'UT');
  const [scope, setScope] = useState(existingJob?.scope || 'Ultrasonic thickness survey and weld integrity check');
  const [standardSpec, setStandardSpec] = useState(existingJob?.standardSpec || 'ASME Section V / ASME B31.3');
  const [generalNotes, setGeneralNotes] = useState(existingJob?.generalNotes || '');
  const [status] = useState<JobStatus>(existingJob?.status || 'Assigned');
  const [linkedProcedureId, setLinkedProcedureId] = useState(existingJob?.procedureId || '');
  const [equipmentIds, setEquipmentIds] = useState<string[]>(existingJob?.equipmentIds || []);

  if (!isOpen) return null;

  const selectedInspector = inspectors.find(i => i.id === inspectorId);
  const isLevel1 = selectedInspector?.level === 'Level 1';
  const availableEquipment = equipment.filter(
    e => e.status !== 'Out of Service' || equipmentIds.includes(e.id)
  );

  const toggleEquipment = (id: string) => {
    setEquipmentIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // Supervisors: Level 2/3 with same method + valid (non-expired) cert
  const supervisorOptions = inspectors
    .filter(i => i.id !== inspectorId)
    .map(i => ({ inspector: i, eligibility: validateSupervisorEligibility(i, method) }));
  const eligibleSupervisors = supervisorOptions.filter(s => !s.eligibility.blocked);
  const blockedSupervisors = supervisorOptions.filter(s => s.eligibility.blocked && (s.inspector.level === 'Level 2' || s.inspector.level === 'Level 3'));

  // Active procedures for the selected method
  const matchingProcedures = procedures.filter(p => p.method === method && p.status === 'Active');

  const handleCustomerChange = (newCustId: string) => {
    setCustomerId(newCustId);
    const newCust = customers.find(c => c.id === newCustId);
    if (newCust && newCust.sites.length > 0) setSiteId(newCust.sites[0].id);
    else setSiteId('');
  };

  const handleMethodChange = (m: NdtMethod) => {
    setMethod(m);
    setLinkedProcedureId('');
    setInspectorId('');
    setSupervisorId('');
    const defaults: Record<NdtMethod, { scope: string; standard: string }> = {
      UT: { scope: 'Ultrasonic thickness survey and weld volumetric examination', standard: 'ASME Section V / ASME B31.3' },
      MT: { scope: 'Magnetic Particle inspection of structural welds and lifting lugs', standard: 'AWS D1.1 Clause 6 / ISO 17638' },
      PT: { scope: 'Liquid penetrant testing of root and final weld passes', standard: 'ASME Section V Art. 6 / ISO 3452-1' },
      VT: { scope: 'Visual inspection of completed pressure piping fabrication', standard: 'ASME B31.3 Table 341.3.2' }
    };
    setScope(defaults[m].scope);
    setStandardSpec(defaults[m].standard);
  };

  const handleProcedureLink = (procId: string) => {
    setLinkedProcedureId(procId);
    if (!procId) return;
    const proc = procedures.find(p => p.id === procId);
    if (proc) {
      setScope(proc.scope);
      setStandardSpec(proc.standardRef);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || !inspectorId) {
      alert('Please select both a Customer and an Inspector.');
      return;
    }

    const assignedInspector = inspectors.find(i => i.id === inspectorId);
    const assignedSupervisor = inspectors.find(i => i.id === supervisorId);
    const linkedProc = procedures.find(p => p.id === linkedProcedureId);

    if (isLevel1) {
      if (!supervisorId || !assignedSupervisor) {
        alert('A Level 1 technician requires a supervising Level 2 or Level 3 inspector.');
        return;
      }
      const levelCheck = validateLevelCompliance(assignedInspector!, assignedSupervisor, method);
      if (!levelCheck.compliant) {
        alert(levelCheck.reason);
        return;
      }
      const supElig = validateSupervisorEligibility(assignedSupervisor, method);
      if (supElig.blocked) {
        alert(`Supervisor not eligible: ${supElig.reason}`);
        return;
      }
    }

    if (equipmentIds.length === 0) {
      alert('Link at least one equipment item so the job shows full field traceability.');
      return;
    }

    const leadElig = assignedInspector ? validateInspectorEligibility(assignedInspector, method) : null;
    if (leadElig?.blocked) {
      alert(`Inspector not eligible: ${leadElig.reason}`);
      return;
    }

    if (existingJob) {
      const updatedJob: Job = {
        ...existingJob,
        jobNumber,
        customerId,
        siteId,
        inspectionDate,
        inspectorId,
        supervisorId: isLevel1 ? supervisorId : undefined,
        method,
        scope,
        standardSpec,
        procedureId: linkedProcedureId || undefined,
        procedureNumber: linkedProc?.procedureNumber,
        equipmentIds,
        generalNotes,
        status
      };
      StorageService.updateJob(updatedJob);
      onJobCreated(updatedJob);
    } else {
      const auditDetails = [
        `Created job ${jobNumber} for ${selectedCustomer?.companyName || 'Customer'} (Method: ${method}).`,
        `Assigned to ${assignedInspector?.fullName || 'Inspector'} (${assignedInspector?.level || ''}).`,
        isLevel1 && assignedSupervisor ? `Supervisor: ${assignedSupervisor.fullName} (${assignedSupervisor.level}) per ISO 9712 §7.1.` : null,
        linkedProc ? `Linked to written procedure ${linkedProc.procedureNumber}.` : null,
        `Equipment: ${equipmentIds.length} item(s) linked.`
      ].filter(Boolean).join(' ');

      const auditEntries: AuditEntry[] = [
        {
          id: 'aud-' + Date.now(),
          timestamp: new Date().toISOString(),
          actorName: 'Admin',
          actorRole: 'Admin',
          action: 'JOB_CREATED',
          details: auditDetails
        }
      ];

      if (isLevel1 && assignedSupervisor) {
        auditEntries.push({
          id: 'aud-' + (Date.now() + 1),
          timestamp: new Date().toISOString(),
          actorName: 'Admin',
          actorRole: 'Admin',
          action: 'JOB_ASSIGNED',
          details: `Level 1 technician ${assignedInspector?.fullName} assigned with supervisor ${assignedSupervisor.fullName} per ISO 9712 §7.1.`
        });
      }

      const newJob = StorageService.addJob({
        jobNumber,
        customerId,
        siteId,
        inspectionDate,
        inspectorId,
        supervisorId: isLevel1 ? supervisorId : undefined,
        method,
        scope,
        standardSpec,
        procedureId: linkedProcedureId || undefined,
        procedureNumber: linkedProc?.procedureNumber,
        equipmentIds,
        generalNotes,
        surfaceCondition: 'Wire brushed & solvent degreased',
        temperature: '21°C',
        status,
        overallResult: 'PENDING',
        items: [],
        auditTrail: auditEntries
      });
      onJobCreated(newJob);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[94vh] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">{existingJob ? 'Edit Inspection Job' : 'Create New Inspection Job'}</h3>
              <p className="text-xs text-slate-400">Link equipment and WEP so the demo job tells a full story</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5 overflow-y-auto flex-1 text-slate-200">

          {/* Job Number & Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Job Number</label>
              <input
                type="text" value={jobNumber} readOnly
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700 text-slate-300 font-mono font-bold opacity-70 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">NDT Method *</label>
              <div className="grid grid-cols-4 gap-2">
                {(['UT', 'MT', 'PT', 'VT'] as NdtMethod[]).map((m) => (
                  <button key={m} type="button" onClick={() => handleMethodChange(m)}
                    className={`py-2.5 rounded-xl font-black text-xs transition-all active:scale-95 ${
                      method === m ? 'bg-sky-600 text-white ring-2 ring-sky-400 shadow-md shadow-sky-600/30' : 'bg-slate-950 text-slate-400 hover:bg-slate-800 border border-slate-800'
                    }`}>
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Customer & Site */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Customer *</label>
              <select value={customerId} onChange={(e) => handleCustomerChange(e.target.value)} required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-sky-500">
                {customers.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Site / Location *</label>
              <select value={siteId} onChange={(e) => setSiteId(e.target.value)} required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-sky-500">
                {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          {/* Inspection Date */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Inspection Date *</label>
            <input type="date" value={inspectionDate} onChange={(e) => setInspectionDate(e.target.value)} required
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-sky-500" />
          </div>

          {/* Inspector Selection — Intelligent Filtered */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Assigned Inspector * <span className="text-slate-500 font-normal normal-case">(filtered by {method} qualification & cert status)</span>
            </label>
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {inspectors.map(insp => {
                const eligibility = validateInspectorEligibility(insp, method);
                const isSelected = inspectorId === insp.id;
                const isL1 = insp.level === 'Level 1';

                return (
                  <button
                    key={insp.id}
                    type="button"
                    disabled={eligibility.blocked}
                    onClick={() => {
                      setInspectorId(insp.id);
                      if (isL1 && insp.defaultSupervisorId) {
                        const def = inspectors.find(x => x.id === insp.defaultSupervisorId);
                        if (def && !validateSupervisorEligibility(def, method).blocked) {
                          setSupervisorId(insp.defaultSupervisorId);
                        } else {
                          setSupervisorId('');
                        }
                      } else if (!isL1) {
                        setSupervisorId('');
                      }
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-left transition-all ${
                      eligibility.blocked
                        ? 'border-slate-800 bg-slate-950/40 opacity-50 cursor-not-allowed'
                        : isSelected
                        ? 'border-sky-500 bg-sky-500/15 ring-1 ring-sky-500/50'
                        : eligibility.warning
                        ? 'border-amber-500/40 bg-amber-950/10 hover:border-amber-400/60'
                        : 'border-slate-700 bg-slate-950 hover:border-slate-500'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${
                        eligibility.blocked ? 'bg-rose-500' : eligibility.warning ? 'bg-amber-400' : 'bg-emerald-400'
                      }`} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-white">{insp.fullName}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                            isL1 ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                            : insp.level === 'Level 3' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                          }`}>{insp.level}</span>
                          <div className="flex gap-1">
                            {insp.methods.map(m => (
                              <span key={m} className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                m === method ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700 text-slate-400'
                              }`}>{m}</span>
                            ))}
                          </div>
                        </div>
                        <p className={`text-xs mt-0.5 truncate ${
                          eligibility.blocked ? 'text-rose-400' : eligibility.warning ? 'text-amber-400' : 'text-slate-400'
                        }`}>
                          {eligibility.blocked ? '🚫 ' : eligibility.warning ? '⚠️ ' : '✅ '}
                          {eligibility.reason}
                        </p>
                      </div>
                    </div>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Level 1 Supervisor — shown only when L1 selected */}
          {isLevel1 && (
            <div className="bg-violet-950/30 border border-violet-500/30 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-violet-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-violet-300">Supervising Inspector Required</span>
              </div>
              <p className="text-xs text-slate-400">
                ISO 9712: Level 1 technicians must be supervised by a Level 2 or Level 3 with a <strong className="text-slate-200">valid {method} certificate</strong>.
                The supervisor evaluates findings (Pass/Fail/N/A) and completes the inspection record.
              </p>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Supervisor * <span className="text-slate-500 font-normal normal-case">(L2/L3 · {method} · valid cert)</span>
                </label>
                <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                  {eligibleSupervisors.length === 0 && (
                    <p className="text-xs text-rose-400 px-1">
                      No eligible supervisors for {method}. Assign a Level 2/3 with a valid {method} certification.
                    </p>
                  )}
                  {eligibleSupervisors.map(({ inspector: s, eligibility }) => {
                    const isSelected = supervisorId === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSupervisorId(s.id)}
                        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'border-violet-400 bg-violet-500/20 ring-1 ring-violet-400/50'
                            : eligibility.warning
                            ? 'border-amber-500/40 bg-amber-950/10 hover:border-amber-400/60'
                            : 'border-slate-700 bg-slate-950 hover:border-violet-500/40'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm text-white">{s.fullName}</span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-sky-500/20 text-sky-300 border border-sky-500/30">{s.level}</span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300">{method}</span>
                          </div>
                          <p className={`text-xs mt-0.5 ${eligibility.warning ? 'text-amber-400' : 'text-slate-400'}`}>
                            {eligibility.warning ? '⚠️ ' : '✅ '}{eligibility.reason}
                          </p>
                        </div>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-violet-300 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
                {blockedSupervisors.length > 0 && (
                  <p className="text-[11px] text-slate-500 mt-2">
                    {blockedSupervisors.length} Level 2/3 inspector(s) hidden — wrong method or expired certification.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Link to L3 Written Procedure */}
          {matchingProcedures.length > 0 && (
            <div className="bg-amber-950/20 border border-amber-500/25 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Link className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-amber-300">Link to Written Examination Procedure (Recommended)</span>
              </div>
              <select value={linkedProcedureId} onChange={(e) => handleProcedureLink(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-amber-500/30 text-white text-sm focus:outline-none focus:border-amber-400">
                <option value="">— No procedure linked (manual scope/spec) —</option>
                {matchingProcedures.map(p => (
                  <option key={p.id} value={p.id}>{p.procedureNumber} — {p.title} ({p.revisionNumber})</option>
                ))}
              </select>
              {linkedProcedureId && (
                <p className="text-xs text-amber-400/80">✅ Scope and standard specification auto-filled from procedure.</p>
              )}
            </div>
          )}

          {/* Equipment link */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Linked Equipment * <span className="normal-case text-slate-500 font-normal">({equipmentIds.length} selected)</span>
            </label>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {availableEquipment.map(eq => {
                const selected = equipmentIds.includes(eq.id);
                return (
                  <button
                    key={eq.id}
                    type="button"
                    onClick={() => toggleEquipment(eq.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl border text-sm transition-all ${
                      selected
                        ? 'border-sky-500/50 bg-sky-500/10 text-sky-100'
                        : 'border-slate-700 bg-slate-950 text-slate-300 hover:border-sky-500/30'
                    }`}
                  >
                    <span className="font-semibold">{eq.name}</span>
                    <span className="text-xs text-slate-400 block">{eq.serialNumber} · {eq.status}</span>
                  </button>
                );
              })}
              {availableEquipment.length === 0 && (
                <p className="text-xs text-amber-300">No available equipment in register.</p>
              )}
            </div>
          </div>

          {/* Scope & Standard */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Scope of Inspection</label>
              <input type="text" value={scope} onChange={(e) => setScope(e.target.value)}
                placeholder="e.g. Ultrasonic thickness survey of line spools"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-sky-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Standard / Specification</label>
              <input type="text" value={standardSpec} onChange={(e) => setStandardSpec(e.target.value)}
                placeholder="e.g. ASME Section V Art. 4 / AWS D1.1"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-sky-500" />
            </div>
          </div>

          {/* General Notes */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">General Notes & Test Conditions</label>
            <textarea rows={2} value={generalNotes} onChange={(e) => setGeneralNotes(e.target.value)}
              placeholder="e.g. Ambient temp ~20°C. Calibration verified before and after inspection."
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-sky-500" />
          </div>

          {/* Equipment reminder */}
          <div className="flex items-start gap-2.5 px-4 py-3 bg-sky-950/30 border border-sky-500/20 rounded-xl">
            <Sparkles className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
            <p className="text-xs text-sky-300">
              <strong>Equipment is deployed after job creation.</strong> Once this job is saved, use the "Deploy Equipment" button on the job card to check out instruments from the available pool.
            </p>
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
            <button type="button" onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 font-semibold text-sm hover:bg-slate-800 transition-colors">
              Cancel
            </button>
            <button type="submit"
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-500 hover:from-sky-500 hover:to-cyan-400 text-white font-bold text-sm shadow-lg shadow-sky-500/25 active:scale-95 transition-all">
              {existingJob ? 'Update Job' : 'Create Job'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
