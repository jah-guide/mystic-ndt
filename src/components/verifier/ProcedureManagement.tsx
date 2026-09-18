import React, { useState } from 'react';
import {
  FileText, Plus, Edit3, CheckCircle2, Clock, Archive, X,
  Award, Search, ChevronDown, ChevronUp, BookOpen, Shield, AlertTriangle
} from 'lucide-react';
import { NdtProcedure, NdtMethod, AcceptanceCriterion, Inspector } from '../../types';
import { StorageService } from '../../services/storage';
import { formatDate, formatDateTime } from '../../utils/formatters';
import { Badge } from '../common/Badge';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';

interface ProcedureManagementProps {
  procedures: NdtProcedure[];
  l3Inspector: Inspector;
  onProceduresUpdated: () => void;
}

const PROCEDURE_STATUS_COLORS = {
  'Draft': 'bg-slate-700/60 text-slate-300 border-slate-600',
  'Active': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  'Superseded': 'bg-slate-800 text-slate-500 border-slate-700'
};

const DEFAULT_CRITERIA: Record<NdtMethod, { label: string; standardRef: string; description: string }> = {
  'UT': { label: 'ASME B31.3 — Minimum Wall Thickness', standardRef: 'ASME B31.3 Table 304.1.2', description: 'Minimum nominal wall thickness ≥ 5.80mm. No planar or laminar indications permitted.' },
  'MT': { label: 'AWS D1.1 — Structural MT (Class B)', standardRef: 'AWS D1.1 Clause 6.10.2', description: 'No cracks, linear indications, or rounded indications > 1.5mm.' },
  'PT': { label: 'ASME Sec V Art. 6 — Penetrant', standardRef: 'ASME Section V Art. 6 / ISO 3452-1', description: 'No relevant linear indications. Rounded indications > 4.8mm not permitted.' },
  'VT': { label: 'ASME B31.3 — Visual (VT)', standardRef: 'ASME B31.3 Table 341.3.2', description: 'No cracks, incomplete fusion, or incomplete penetration. Undercut ≤ 0.8mm.' }
};

export const ProcedureManagement: React.FC<ProcedureManagementProps> = ({
  procedures, l3Inspector, onProceduresUpdated
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProc, setEditingProc] = useState<NdtProcedure | undefined>(undefined);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState<NdtMethod | 'ALL'>('ALL');

  // Form state
  const [title, setTitle] = useState('');
  const [method, setMethod] = useState<NdtMethod>('UT');
  const [revisionNumber, setRevisionNumber] = useState('Rev 1');
  const [scope, setScope] = useState('');
  const [standardRef, setStandardRef] = useState('');
  const [equipmentRequired, setEquipmentRequired] = useState('');
  const [surface, setSurface] = useState('Wire brushed and solvent degreased');
  const [temperature, setTemperature] = useState('0°C – 60°C');
  const [generalNotes, setGeneralNotes] = useState('');
  const [criteriaRows, setCriteriaRows] = useState<AcceptanceCriterion[]>([]);
  const [procStatus, setProcStatus] = useState<NdtProcedure['status']>('Draft');

  useBodyScrollLock(isModalOpen);

  const openCreate = () => {
    setEditingProc(undefined);
    setTitle('');
    setMethod('UT');
    setRevisionNumber('Rev 1');
    setScope('');
    setStandardRef('ASME Section V / ASME B31.3');
    setEquipmentRequired('Ultrasonic Thickness Gauge, Calibration Block');
    setSurface('Wire brushed and solvent degreased');
    setTemperature('0°C – 60°C');
    setGeneralNotes('');
    const def = DEFAULT_CRITERIA['UT'];
    setCriteriaRows([{
      id: 'crit-new-' + Date.now(), label: def.label, method: 'UT',
      standardRef: def.standardRef, description: def.description,
      createdByL3Id: l3Inspector.id, createdAt: new Date().toISOString(), isActive: true
    }]);
    setProcStatus('Draft');
    setIsModalOpen(true);
  };

  const openEdit = (proc: NdtProcedure) => {
    setEditingProc(proc);
    setTitle(proc.title);
    setMethod(proc.method);
    setRevisionNumber(proc.revisionNumber);
    setScope(proc.scope);
    setStandardRef(proc.standardRef);
    setEquipmentRequired(proc.equipmentRequired.join(', '));
    setSurface(proc.surface);
    setTemperature(proc.temperature);
    setGeneralNotes(proc.generalNotes || '');
    setCriteriaRows([...proc.acceptanceCriteria]);
    setProcStatus(proc.status);
    setIsModalOpen(true);
  };

  const handleMethodChange = (m: NdtMethod) => {
    setMethod(m);
    const def = DEFAULT_CRITERIA[m];
    setCriteriaRows([{
      id: 'crit-new-' + Date.now(), label: def.label, method: m,
      standardRef: def.standardRef, description: def.description,
      createdByL3Id: l3Inspector.id, createdAt: new Date().toISOString(), isActive: true
    }]);
    const methodDefaults: Record<NdtMethod, { standard: string; equip: string }> = {
      UT: { standard: 'ASME Section V Art. 4 / ASME B31.3', equip: 'Ultrasonic Thickness Gauge, 5-step Calibration Block, Couplant' },
      MT: { standard: 'AWS D1.1 Clause 6 / ISO 17638', equip: 'AC/DC Electromagnetic Yoke, Black Magnetic Ink, White Contrast Paint, Lux Meter' },
      PT: { standard: 'ASME Section V Art. 6 / ISO 3452-1', equip: 'Dye Penetrant Kit, Developer, Cleaner, Lux Meter, Timer' },
      VT: { standard: 'ASME B31.3 Table 341.3.2', equip: 'Calibrated illumination source (≥1000 lux), Mirror, Magnifier' }
    };
    setStandardRef(methodDefaults[m].standard);
    setEquipmentRequired(methodDefaults[m].equip);
  };

  const addCritRow = () => {
    setCriteriaRows(prev => [...prev, {
      id: 'crit-new-' + Date.now(), label: '', method, standardRef: '', description: '',
      createdByL3Id: l3Inspector.id, createdAt: new Date().toISOString(), isActive: true
    }]);
  };

  const updateCrit = (idx: number, field: keyof AcceptanceCriterion, value: string | boolean) => {
    setCriteriaRows(prev => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c));
  };

  const removeCrit = (idx: number) => {
    if (criteriaRows.length <= 1) return;
    setCriteriaRows(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const procNumber = editingProc?.procedureNumber || StorageService.generateNextProcedureNumber(method);
    const now = new Date().toISOString();

    const base = {
      procedureNumber: procNumber,
      title,
      method,
      revisionNumber,
      scope,
      standardRef,
      equipmentRequired: equipmentRequired.split(',').map(s => s.trim()).filter(Boolean),
      surface,
      temperature,
      acceptanceCriteria: criteriaRows,
      generalNotes,
      status: procStatus,
      authorId: l3Inspector.id,
      approvedByL3Id: procStatus === 'Active' ? l3Inspector.id : editingProc?.approvedByL3Id,
      approvedByL3Name: procStatus === 'Active' ? l3Inspector.fullName : editingProc?.approvedByL3Name,
      approvedAt: procStatus === 'Active' ? (editingProc?.approvedAt || now) : editingProc?.approvedAt
    };

    if (editingProc) {
      StorageService.updateProcedure({ ...editingProc, ...base });
    } else {
      StorageService.addProcedure(base);
    }
    onProceduresUpdated();
    setIsModalOpen(false);
  };

  const handleSupersede = (proc: NdtProcedure) => {
    if (!confirm(`Supersede ${proc.procedureNumber}? This marks it as outdated and prevents it from being linked to new jobs.`)) return;
    StorageService.updateProcedure({ ...proc, status: 'Superseded' });
    onProceduresUpdated();
  };

  const filtered = procedures.filter(p => {
    if (methodFilter !== 'ALL' && p.method !== methodFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return p.title.toLowerCase().includes(q) || p.procedureNumber.toLowerCase().includes(q) || p.standardRef.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white">Written Examination Procedures (WEP)</h2>
          <p className="text-xs text-slate-400 mt-0.5">ISO 9712 §7.4 — L3-authored procedures that govern all field inspections</p>
        </div>
        <button type="button" onClick={openCreate}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-500 hover:to-orange-400 text-white font-bold text-sm shadow-lg shadow-amber-600/20 active:scale-95 transition-all self-start">
          <Plus className="w-4 h-4" />
          Create New Procedure
        </button>
      </div>

      {/* Filter */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex flex-col sm:flex-row items-center gap-3">
        <div className="relative w-full sm:flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search procedures..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-amber-500" />
        </div>
        <div className="flex gap-1">
          {(['ALL', 'UT', 'MT', 'PT', 'VT'] as const).map(m => (
            <button key={m} type="button" onClick={() => setMethodFilter(m as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                methodFilter === m ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}>{m}</button>
          ))}
        </div>
      </div>

      {/* Procedure List */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center text-slate-400">
            <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p className="font-bold text-slate-300 text-sm">No procedures found</p>
            <p className="text-xs text-slate-500 mt-1">Create your first Written Examination Procedure above.</p>
          </div>
        )}
        {filtered.map(proc => {
          const isExpanded = expandedId === proc.id;
          return (
            <div key={proc.id}
              className={`bg-slate-900 border rounded-2xl overflow-hidden transition-all ${
                proc.status === 'Active' ? 'border-amber-500/30' : proc.status === 'Draft' ? 'border-sky-500/20' : 'border-slate-800 opacity-70'
              }`}>
              {/* Procedure Card Header */}
              <div className="p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-black text-sm font-mono text-white">{proc.procedureNumber}</span>
                      <Badge variant="method" value={proc.method} size="sm">{proc.method}</Badge>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${PROCEDURE_STATUS_COLORS[proc.status]}`}>
                        {proc.status}
                      </span>
                      <span className="text-xs text-slate-500">{proc.revisionNumber}</span>
                    </div>
                    <h3 className="font-bold text-base text-white">{proc.title}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{proc.standardRef}</p>
                    {proc.approvedByL3Name && proc.status === 'Active' && (
                      <p className="text-xs text-amber-400 mt-1">✅ Approved by {proc.approvedByL3Name} on {formatDate(proc.approvedAt || '')}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {proc.status !== 'Superseded' && (
                      <button type="button" onClick={() => openEdit(proc)}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors">
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {proc.status === 'Active' && (
                      <button type="button" onClick={() => handleSupersede(proc)}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-semibold border border-slate-700 transition-colors flex items-center gap-1">
                        <Archive className="w-3 h-3" />
                        Supersede
                      </button>
                    )}
                    <button type="button" onClick={() => setExpandedId(isExpanded ? null : proc.id)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors">
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="border-t border-slate-800 p-4 sm:p-5 space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                      <span className="text-slate-400 block mb-1 font-semibold uppercase tracking-wider text-[10px]">Scope</span>
                      <p className="text-slate-200">{proc.scope}</p>
                    </div>
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                      <span className="text-slate-400 block mb-1 font-semibold uppercase tracking-wider text-[10px]">Equipment Required</span>
                      <ul className="space-y-0.5">
                        {proc.equipmentRequired.map((e, i) => <li key={i} className="text-slate-200">• {e}</li>)}
                      </ul>
                    </div>
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                      <span className="text-slate-400 block mb-1 font-semibold uppercase tracking-wider text-[10px]">Surface Preparation</span>
                      <p className="text-slate-200">{proc.surface}</p>
                    </div>
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                      <span className="text-slate-400 block mb-1 font-semibold uppercase tracking-wider text-[10px]">Temperature Range</span>
                      <p className="text-slate-200">{proc.temperature}</p>
                    </div>
                  </div>
                  {/* Acceptance Criteria */}
                  <div>
                    <span className="text-slate-400 block mb-2 font-semibold uppercase tracking-wider text-[10px]">Acceptance Criteria</span>
                    {proc.acceptanceCriteria.map((c, i) => (
                      <div key={i} className="bg-slate-950 border border-slate-800 rounded-xl p-3 mb-2">
                        <div className="flex items-center gap-2 mb-1">
                          <Shield className="w-3 h-3 text-amber-400" />
                          <span className="font-bold text-amber-300">{c.label}</span>
                          <span className="text-slate-500 font-mono">{c.standardRef}</span>
                        </div>
                        <p className="text-slate-300">{c.description}</p>
                      </div>
                    ))}
                  </div>
                  {proc.generalNotes && (
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                      <span className="text-slate-400 block mb-1 font-semibold uppercase tracking-wider text-[10px]">General Notes</span>
                      <p className="text-slate-200">{proc.generalNotes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-3 sm:p-4 overflow-hidden">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden">

            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">{editingProc ? 'Edit Procedure' : 'Create Written Examination Procedure'}</h3>
                  <p className="text-xs text-slate-400">Authored by {l3Inspector.fullName} — {l3Inspector.certNumber}</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 text-slate-200">

              {/* Method */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">NDT Method *</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['UT', 'MT', 'PT', 'VT'] as NdtMethod[]).map(m => (
                    <button key={m} type="button" onClick={() => handleMethodChange(m)}
                      className={`py-2.5 rounded-xl font-black text-xs transition-all active:scale-95 ${
                        method === m ? 'bg-amber-600 text-white ring-2 ring-amber-400' : 'bg-slate-950 text-slate-400 hover:bg-slate-800 border border-slate-800'
                      }`}>{m}</button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Title *</label>
                  <input type="text" value={title} onChange={e => setTitle(e.target.value)} required
                    placeholder={`e.g. ${method} Thickness Survey — Pressure Piping`}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-amber-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Revision No.</label>
                  <input type="text" value={revisionNumber} onChange={e => setRevisionNumber(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-amber-500" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Standard / Specification *</label>
                <input type="text" value={standardRef} onChange={e => setStandardRef(e.target.value)} required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-amber-500" />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Scope</label>
                <textarea rows={2} value={scope} onChange={e => setScope(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-amber-500" />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Equipment Required (comma-separated)</label>
                <input type="text" value={equipmentRequired} onChange={e => setEquipmentRequired(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-amber-500" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Surface Preparation</label>
                  <input type="text" value={surface} onChange={e => setSurface(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-amber-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Temperature Range</label>
                  <input type="text" value={temperature} onChange={e => setTemperature(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-amber-500" />
                </div>
              </div>

              {/* Acceptance Criteria */}
              <div className="border border-amber-500/20 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-300">Acceptance Criteria</span>
                  <button type="button" onClick={addCritRow}
                    className="px-3 py-1 rounded-lg bg-amber-600/20 text-amber-300 text-xs font-semibold hover:bg-amber-600/30 transition-colors flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Add Criterion
                  </button>
                </div>
                {criteriaRows.map((c, i) => (
                  <div key={c.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Criterion {i + 1}</span>
                      {criteriaRows.length > 1 && (
                        <button type="button" onClick={() => removeCrit(i)} className="text-rose-400 hover:text-rose-300 text-xs">Remove</button>
                      )}
                    </div>
                    <input type="text" value={c.label} onChange={e => updateCrit(i, 'label', e.target.value)}
                      placeholder="Label (e.g. ASME B31.3 — Minimum Wall Thickness)"
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500" />
                    <input type="text" value={c.standardRef} onChange={e => updateCrit(i, 'standardRef', e.target.value)}
                      placeholder="Standard Reference (e.g. ASME B31.3 Table 304.1.2)"
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500" />
                    <textarea rows={2} value={c.description} onChange={e => updateCrit(i, 'description', e.target.value)}
                      placeholder="Acceptance description (e.g. Minimum wall ≥ 5.80mm, no planar indications)"
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500" />
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">General Notes</label>
                <textarea rows={2} value={generalNotes} onChange={e => setGeneralNotes(e.target.value)}
                  placeholder="Calibration intervals, dwell times, special conditions..."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-amber-500" />
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Procedure Status</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Draft', 'Active', 'Superseded'] as const).map(s => (
                    <button key={s} type="button" onClick={() => setProcStatus(s)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                        procStatus === s ? PROCEDURE_STATUS_COLORS[s] + ' ring-1 ring-current' : 'border-slate-700 bg-slate-950 text-slate-400 hover:border-slate-500'
                      }`}>{s}</button>
                  ))}
                </div>
                {procStatus === 'Active' && (
                  <p className="text-xs text-amber-400 mt-2">
                    ✅ Setting to Active will record your signature ({l3Inspector.fullName}) as the approving Level 3.
                  </p>
                )}
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 font-semibold text-sm hover:bg-slate-800">
                  Cancel
                </button>
                <button type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-500 hover:to-orange-400 text-white font-bold text-sm shadow-lg active:scale-95 transition-all">
                  {editingProc ? 'Update Procedure' : 'Save Procedure'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
};
