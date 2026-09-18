import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Award, Plus, Edit3, Mail, Phone, AlertTriangle, X, ArrowLeft, ChevronRight, Search, FileText, CheckCircle2, Filter
} from 'lucide-react';
import { Inspector, Job, NdtMethod, JobStatus, MethodCertificate } from '../../types';
import {
  checkExpiry,
  getJobOnTimeStatus,
  getInspectorSummaryExpiryDate,
  getInspectorQualifiedMethods,
  deriveHighestVerifiedMethodLevel,
  getMethodCertLevel,
  getMethodCertificate
} from '../../utils/validation';
import { getVisionStatus } from '../../utils/visionAuthorization';
import {
  CertFilter,
  countInspectorsByCertFilter,
  inspectorMatchesCertFilter,
  visibleMethodsForCertFilter
} from '../../utils/inspectorCertFilters';
import { formatDate } from '../../utils/formatters';
import { Badge } from '../common/Badge';
import { SimpleBarChart } from '../common/SimpleBarChart';
import { StorageService } from '../../services/storage';
import { PLACEHOLDER_CERT_DOC } from '../../services/seedWorkshopRoster';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { DateField } from '../common/DateField';

const METHOD_FILTERS: Array<NdtMethod | 'ALL'> = ['ALL', 'UT', 'MT', 'PT', 'VT'];
type MethodChipTone = 'emerald' | 'amber' | 'rose' | 'pending';

function methodChipTone(inspector: Inspector, method: NdtMethod): MethodChipTone {
  const mc = getMethodCertificate(inspector, method);
  if (!mc) {
    const summary = checkExpiry(getInspectorSummaryExpiryDate(inspector)).status;
    if (summary === 'expired') return 'rose';
    if (summary === 'expiring_soon') return 'amber';
    return 'emerald';
  }
  if (mc.verificationStatus === 'Rejected') return 'rose';
  if (mc.verificationStatus === 'PendingVerification') return 'pending';
  const expiry = checkExpiry(mc.expiryDate).status;
  if (expiry === 'expired') return 'rose';
  if (expiry === 'expiring_soon') return 'amber';
  return 'emerald';
}

function methodChipClass(tone: MethodChipTone): string {
  const base = 'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold border';
  if (tone === 'emerald') return `${base} bg-emerald-500/20 text-emerald-300 border-emerald-500/40`;
  if (tone === 'amber') return `${base} bg-amber-500/20 text-amber-300 border-amber-500/40`;
  if (tone === 'pending') return `${base} bg-amber-500/10 text-amber-200/80 border-amber-500/50 border-dashed`;
  return `${base} bg-rose-500/20 text-rose-300 border-rose-500/40`;
}

interface InspectorManagementProps {
  inspectors: Inspector[];
  jobs: Job[];
  onInspectorUpdated: () => void;
  onOpenJob?: (jobId: string) => void;
  focusInspectorId?: string | null;
  onFocusConsumed?: () => void;
}

export const InspectorManagement: React.FC<InspectorManagementProps> = ({
  inspectors,
  jobs,
  onInspectorUpdated,
  onOpenJob,
  focusInspectorId
}) => {
  const [selectedInspectorId, setSelectedInspectorId] = useState<string | null>(
    () => focusInspectorId ?? null
  );

  useEffect(() => {
    if (!focusInspectorId) return;
    setSelectedInspectorId(focusInspectorId);
  }, [focusInspectorId]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInspector, setEditingInspector] = useState<Inspector | undefined>(undefined);
  const [methodFilter, setMethodFilter] = useState<NdtMethod | 'ALL'>('ALL');
  const [certFilter, setCertFilter] = useState<CertFilter>('ALL');
  const [levelFilter, setLevelFilter] = useState<'ALL' | 'Level 1' | 'Level 2' | 'Level 3'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!filtersOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (filtersRef.current && !filtersRef.current.contains(e.target as Node)) {
        setFiltersOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [filtersOpen]);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [certification, setCertification] = useState('SAQCC / ISO 9712 Level 2');
  const [certNumber, setCertNumber] = useState('');
  const [level, setLevel] = useState<'Level 1' | 'Level 2' | 'Level 3'>('Level 2');
  const [certExpiryDate, setCertExpiryDate] = useState('');
  const [methods, setMethods] = useState<NdtMethod[]>(['UT']);
  const [notes, setNotes] = useState('');
  const [visionAcuityExpiryDate, setVisionAcuityExpiryDate] = useState('');
  const [employerAuthorized, setEmployerAuthorized] = useState(true);
  const [authorizationNotes, setAuthorizationNotes] = useState('');

  const selectedInspector = inspectors.find(i => i.id === selectedInspectorId);

  const handleOpenModal = (insp?: Inspector) => {
    if (insp) {
      setEditingInspector(insp);
      setFullName(insp.fullName);
      setEmail(insp.email);
      setPhone(insp.phone);
      setCertification(insp.certification);
      setCertNumber(insp.certNumber);
      setLevel(insp.level || 'Level 2');
      setCertExpiryDate(insp.certExpiryDate);
      setMethods([...insp.methods]);
      setNotes(insp.notes || '');
      setVisionAcuityExpiryDate(insp.visionAcuityExpiryDate || '');
      setEmployerAuthorized(insp.employerAuthorized !== false);
      setAuthorizationNotes(insp.authorizationNotes || '');
    } else {
      setEditingInspector(undefined);
      setFullName('');
      setEmail('');
      setPhone('');
      setCertification('SAQCC / ISO 9712 Level 2');
      setCertNumber('SAQCC-NDT-');
      setLevel('Level 2');
      setCertExpiryDate(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
      setMethods(['UT', 'MT']);
      setNotes('');
      setVisionAcuityExpiryDate(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
      setEmployerAuthorized(true);
      setAuthorizationNotes('');
    }
    setIsModalOpen(true);
  };

  const toggleMethod = (m: NdtMethod) => {
    if (methods.includes(m)) {
      if (methods.length === 1) {
        alert('Inspector must be qualified in at least one NDT method.');
        return;
      }
      setMethods(methods.filter(item => item !== m));
    } else {
      setMethods([...methods, m]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !certNumber.trim()) return;

    if (editingInspector) {
      const methodsFromForm = methods;
      const existingCerts = editingInspector.methodCertificates || [];
      const methodCertificates: MethodCertificate[] = methodsFromForm.map(m => {
        const existing = existingCerts.find(c => c.method === m);
        if (existing) return existing;
        return {
          id: `mcert-${editingInspector.id}-${m}-${Date.now()}`,
          method: m,
          level,
          certNumber: certNumber || `TEMP-${m}`,
          issuer: 'SAQCC-NDT',
          issueDate: new Date().toISOString().slice(0, 10),
          expiryDate: certExpiryDate,
          documentDataUrl: PLACEHOLDER_CERT_DOC,
          documentFileName: `${m}-certificate-demo.svg`,
          verificationStatus: 'PendingVerification'
        };
      });
      const draft = {
        ...editingInspector,
        fullName,
        email,
        phone,
        certification,
        certNumber,
        methods: methodsFromForm,
        methodCertificates,
        notes,
        visionAcuityExpiryDate: visionAcuityExpiryDate || undefined,
        employerAuthorized,
        authorizationNotes: authorizationNotes || undefined
      };
      StorageService.updateInspector({
        ...draft,
        level: deriveHighestVerifiedMethodLevel(draft),
        certExpiryDate: getInspectorSummaryExpiryDate(draft)
      });
    } else {
      const idStub = 'insp-' + Date.now();
      const methodCertificates: MethodCertificate[] = methods.map(m => ({
        id: `mcert-${idStub}-${m}`,
        method: m,
        level,
        certNumber: certNumber || `TEMP-${m}`,
        issuer: 'SAQCC-NDT',
        issueDate: new Date().toISOString().slice(0, 10),
        expiryDate: certExpiryDate,
        documentDataUrl: PLACEHOLDER_CERT_DOC,
        documentFileName: `${m}-certificate-demo.svg`,
        verificationStatus: 'PendingVerification' as const
      }));
      const draft = {
        fullName,
        email,
        phone,
        certification,
        certNumber,
        methods,
        methodCertificates,
        notes,
        level,
        certExpiryDate,
        visionAcuityExpiryDate: visionAcuityExpiryDate || undefined,
        employerAuthorized,
        authorizationNotes: authorizationNotes || undefined
      };
      StorageService.addInspector({
        ...draft,
        level: deriveHighestVerifiedMethodLevel({ ...draft, id: idStub } as Inspector),
        certExpiryDate: getInspectorSummaryExpiryDate({ ...draft, id: idStub } as Inspector)
      });
    }

    onInspectorUpdated();
    setIsModalOpen(false);
  };

  const filteredInspectors = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return inspectors.filter(insp => {
      if (methodFilter !== 'ALL' && !insp.methods.includes(methodFilter) && !getInspectorQualifiedMethods(insp).includes(methodFilter)) {
        return false;
      }
      if (levelFilter !== 'ALL' && deriveHighestVerifiedMethodLevel(insp) !== levelFilter) return false;
      if (!inspectorMatchesCertFilter(insp, certFilter, methodFilter)) return false;
      if (q) {
        return (
          insp.fullName.toLowerCase().includes(q) ||
          insp.certNumber.toLowerCase().includes(q) ||
          insp.email.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [inspectors, methodFilter, certFilter, levelFilter, searchQuery]);

  const validCount = countInspectorsByCertFilter(inspectors, 'valid');
  const dueSoonCount = countInspectorsByCertFilter(inspectors, 'expiring_soon');
  const expiredBlockedCount = countInspectorsByCertFilter(inspectors, 'expired');

  const toggleCertKpi = (bucket: 'valid' | 'expiring_soon' | 'expired') => {
    setCertFilter(prev => (prev === bucket ? 'ALL' : bucket));
  };

  const activeFilterCount =
    (methodFilter !== 'ALL' ? 1 : 0) +
    (certFilter !== 'ALL' ? 1 : 0) +
    (levelFilter !== 'ALL' ? 1 : 0);

  const clearFilters = () => {
    setMethodFilter('ALL');
    setCertFilter('ALL');
    setLevelFilter('ALL');
    setSearchQuery('');
  };

  const chipClass = (active: boolean, tone: 'sky' | 'emerald' | 'amber' | 'rose' | 'slate' = 'sky') => {
    const tones = {
      sky: active ? 'bg-sky-500/25 text-sky-200 border-sky-400/50' : 'bg-slate-950 text-slate-400 border-slate-700 hover:border-slate-500',
      emerald: active ? 'bg-emerald-500/25 text-emerald-200 border-emerald-400/50' : 'bg-slate-950 text-slate-400 border-slate-700 hover:border-slate-500',
      amber: active ? 'bg-amber-500/25 text-amber-200 border-amber-400/50' : 'bg-slate-950 text-slate-400 border-slate-700 hover:border-slate-500',
      rose: active ? 'bg-rose-500/25 text-rose-200 border-rose-400/50' : 'bg-slate-950 text-slate-400 border-slate-700 hover:border-slate-500',
      slate: active ? 'bg-slate-600/40 text-white border-slate-400/50' : 'bg-slate-950 text-slate-400 border-slate-700 hover:border-slate-500'
    };
    return `px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${tones[tone]}`;
  };

  useBodyScrollLock(isModalOpen);

  const renderModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-3 sm:p-4 overflow-hidden">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-white">
              {editingInspector ? 'Edit Inspector' : 'Add Certified Inspector'}
            </h3>
          </div>
          <button type="button" onClick={() => setIsModalOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 text-slate-200">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Full Name *</label>
              <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-sky-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Default level *</label>
              <select value={level} onChange={(e) => setLevel(e.target.value as typeof level)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-bold focus:outline-none focus:border-sky-500">
                <option value="Level 1">Level 1 Tech</option>
                <option value="Level 2">Level 2 Inspector</option>
                <option value="Level 3">Level 3 QA Verifier</option>
              </select>
              <p className="text-[10px] text-slate-500 mt-1">Used for new method certs; edit per method in registrar.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-sky-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Phone</label>
              <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-sky-500" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Cert Number *</label>
              <input type="text" value={certNumber} onChange={(e) => setCertNumber(e.target.value)} required
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm font-mono focus:outline-none focus:border-sky-500" />
            </div>
            <div>
              <DateField
                label="Default cert expiry"
                required
                value={certExpiryDate}
                onChange={setCertExpiryDate}
                hint="Applied to new method certs; edit each cert in the registrar."
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <DateField
                label="Vision acuity expiry"
                clearable
                value={visionAcuityExpiryDate}
                onChange={setVisionAcuityExpiryDate}
                hint="Missing or expired = hard-block on job assign."
              />
            </div>
            <div className="flex flex-col justify-end gap-2 pb-1">
              <label className="inline-flex items-center gap-2 text-sm text-slate-200 font-semibold">
                <input type="checkbox" checked={employerAuthorized} onChange={(e) => setEmployerAuthorized(e.target.checked)}
                  className="rounded border-slate-600" />
                Employer authorized
              </label>
              <input type="text" value={authorizationNotes} onChange={(e) => setAuthorizationNotes(e.target.value)}
                placeholder="Authorization notes (optional)"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-sky-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Qualified NDT Methods</label>
            <div className="grid grid-cols-4 gap-2">
              {(['UT', 'MT', 'PT', 'VT'] as NdtMethod[]).map(m => (
                <button key={m} type="button" onClick={() => toggleMethod(m)}
                  className={`py-2 rounded-xl font-black text-xs transition-all ${
                    methods.includes(m)
                      ? 'bg-sky-600 text-white ring-2 ring-sky-400'
                      : 'bg-slate-950 text-slate-400 border border-slate-800'
                  }`}>
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Notes</label>
            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-sky-500" />
          </div>
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 font-semibold text-xs hover:bg-slate-800">Cancel</button>
            <button type="submit" className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-500 text-white font-bold text-sm shadow-lg">
              {editingInspector ? 'Update Inspector' : 'Save Inspector'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  if (selectedInspector) {
    const summaryExpiry = getInspectorSummaryExpiryDate(selectedInspector);
    const expiryCheck = checkExpiry(summaryExpiry);
    const methodCerts = selectedInspector.methodCertificates || [];
    const qualifiedMethods = getInspectorQualifiedMethods(selectedInspector);
    const hasAssignBlock = methodCerts.some(c =>
      c.verificationStatus !== 'Verified' || checkExpiry(c.expiryDate).status === 'expired'
    ) || (methodCerts.length === 0 && expiryCheck.status === 'expired');

    const leadJobs = jobs.filter(j => j.inspectorId === selectedInspector.id);
    const supervisedJobs = jobs.filter(j => j.supervisorId === selectedInspector.id);
    const supervisor = inspectors.find(i => i.id === selectedInspector.defaultSupervisorId);

    const statusOrder: JobStatus[] = ['Assigned', 'In Progress', 'Awaiting Supervisor', 'Revision Required', 'Completed', 'Draft'];
    const byStatus = statusOrder.map(s => ({
      label: s,
      value: leadJobs.filter(j => j.status === s).length,
      color: s === 'Completed' ? 'bg-emerald-500' : s === 'Revision Required' ? 'bg-rose-500' : 'bg-sky-500'
    }));

    const byMethod = (['UT', 'MT', 'PT', 'VT'] as NdtMethod[]).map(m => ({
      label: m,
      value: leadJobs.filter(j => j.method === m).length,
      color: 'bg-cyan-500'
    }));

    const onTime = leadJobs.filter(j => getJobOnTimeStatus(j) === 'on_time').length;
    const late = leadJobs.filter(j => getJobOnTimeStatus(j) === 'late').length;
    const excluded = leadJobs.filter(j => getJobOnTimeStatus(j) === 'excluded').length;

    const persistMethodCerts = (next: MethodCertificate[]) => {
      const draft = {
        ...selectedInspector,
        methodCertificates: next,
        methods: [...new Set(next.map(c => c.method))] as NdtMethod[]
      };
      StorageService.updateInspector({
        ...draft,
        level: deriveHighestVerifiedMethodLevel(draft),
        certExpiryDate: getInspectorSummaryExpiryDate(draft)
      });
      onInspectorUpdated();
    };

    const patchCert = (certId: string, patch: Partial<MethodCertificate>) => {
      persistMethodCerts(methodCerts.map(c => (c.id === certId ? { ...c, ...patch } : c)));
    };

    const jobLink = (j: Job) => (
      <button
        key={j.id}
        type="button"
        onClick={() => onOpenJob?.(j.id)}
        className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-sky-500/40 text-left"
      >
        <div className="min-w-0">
          <div className="font-bold text-sm text-white truncate">{j.jobNumber}</div>
          <div className="text-[11px] text-slate-400">{j.method} · {j.status} · {formatDate(j.inspectionDate)}</div>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
      </button>
    );

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <button type="button" onClick={() => setSelectedInspectorId(null)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-400 hover:text-sky-300 mb-2">
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to inspectors
            </button>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">{selectedInspector.fullName}</h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-black bg-sky-500/20 text-sky-300 border border-sky-500/40">
                {deriveHighestVerifiedMethodLevel(selectedInspector)}
              </span>
              <span className="text-[10px] text-slate-500 font-semibold">highest verified</span>
              {(() => {
                const vs = getVisionStatus(selectedInspector);
                const authOk = selectedInspector.employerAuthorized !== false;
                return (
                  <>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${
                      vs === 'valid' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : vs === 'expiring_soon' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    }`}>
                      Vision {vs === 'missing' ? 'missing' : vs === 'expiring_soon' ? 'due soon' : vs}
                    </span>
                    {!authOk && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/40">
                        Not authorized
                      </span>
                    )}
                  </>
                );
              })()}
            </div>
            <p className="text-sm text-sky-400 font-mono mt-0.5">{selectedInspector.certNumber}</p>
          </div>
          <button type="button" onClick={() => handleOpenModal(selectedInspector)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-700 text-slate-200 text-sm font-bold hover:bg-slate-800 self-start">
            <Edit3 className="w-4 h-4" />
            Edit inspector
          </button>
        </div>

        {hasAssignBlock && (
          <div className="flex items-start gap-2 rounded-xl border border-rose-500/40 bg-rose-950/30 px-4 py-3 text-sm text-rose-300">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="font-semibold">
              Assignment blocked for one or more methods — renew expired certs or complete employer verification before job assign.
            </span>
          </div>
        )}

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div>
            <h3 className="text-sm font-black text-white">Method certificate registrar</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              View and verify only. Level, expiry, and certificate files are not edited here —
              inspectors supply documents; Admin confirms employer file completeness (ISO 9712 / employer written practice).
              Demo: change methods / seed certs via <span className="text-slate-400">Edit inspector</span>.
            </p>
          </div>
          {methodCerts.length === 0 && (
            <p className="text-xs text-slate-500">No method certificates on file. Edit inspector methods to seed pending certs.</p>
          )}
          <div className="space-y-2">
            {methodCerts.map(mc => {
              const mcExpiry = checkExpiry(mc.expiryDate);
              return (
                <div key={mc.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="method" value={mc.method} size="sm">{mc.method}</Badge>
                        <span className="text-xs font-bold text-white">{mc.level}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          mc.verificationStatus === 'Verified' ? 'bg-emerald-500/20 text-emerald-300'
                            : mc.verificationStatus === 'PendingVerification' ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-rose-500/20 text-rose-300'
                        }`}>
                          {mc.verificationStatus === 'PendingVerification' ? 'Pending verification' : mc.verificationStatus}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-400">
                        <span>
                          Expiry{' '}
                          <span className="text-slate-200 font-semibold">{formatDate(mc.expiryDate)}</span>
                          {' · '}
                          <span
                            className={
                              mcExpiry.status === 'expired'
                                ? 'text-rose-400'
                                : mcExpiry.status === 'expiring_soon'
                                ? 'text-amber-400'
                                : 'text-emerald-400'
                            }
                          >
                            {mcExpiry.formattedText}
                          </span>
                        </span>
                      </div>
                      <div className="text-xs font-mono text-sky-400">{mc.certNumber}</div>
                      <div className="text-[11px] text-slate-500">{mc.issuer}</div>
                      {mc.rejectionReason && (
                        <p className="text-[11px] text-rose-400">{mc.rejectionReason}</p>
                      )}
                      {!mc.documentDataUrl && (
                        <p className="text-[11px] text-amber-400/90">
                          No certificate file on file — inspector must upload (ping from Renewals when live).
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {mc.documentDataUrl && (
                        <a href={mc.documentDataUrl} target="_blank" rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-sky-600/20 border border-sky-500/40 text-sky-300 text-[11px] font-bold">
                          <FileText className="w-3.5 h-3.5" /> View
                        </a>
                      )}
                      {mc.verificationStatus !== 'Verified' && (
                        <button type="button" onClick={() => patchCert(mc.id, {
                          verificationStatus: 'Verified',
                          verifiedAt: new Date().toISOString(),
                          verifiedByName: 'System Admin',
                          rejectionReason: undefined
                        })}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Verify
                        </button>
                      )}
                      {mc.verificationStatus !== 'Rejected' && (
                        <button type="button" onClick={() => {
                          const reason = window.prompt('Rejection reason (optional):', 'Document unclear — re-upload required.') || 'Rejected by Admin';
                          patchCert(mc.id, {
                            verificationStatus: 'Rejected',
                            rejectionReason: reason,
                            verifiedAt: undefined,
                            verifiedByName: undefined
                          });
                        }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-600/15 border border-rose-500/30 text-rose-300 text-[11px] font-bold">
                          Reject
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${
                expiryCheck.status === 'expired' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  : expiryCheck.status === 'expiring_soon' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              }`}>
                Soonest method exp: {expiryCheck.formattedText} ({formatDate(summaryExpiry)})
              </span>
              <div className="flex flex-wrap gap-1.5">
                {qualifiedMethods.map(m => (
                  <Badge key={m} variant="method" value={m} size="sm">{m}</Badge>
                ))}
              </div>
              <div className="space-y-2 text-sm text-slate-300 pt-2 border-t border-slate-800">
                <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-sky-400" /><span className="truncate">{selectedInspector.email}</span></div>
                <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-sky-400" /><span>{selectedInspector.phone}</span></div>
              </div>
              {supervisor && (
                <p className="text-xs text-slate-400 pt-2 border-t border-slate-800">
                  Default supervisor: <span className="text-slate-200 font-semibold">{supervisor.fullName}</span>
                </p>
              )}
              {selectedInspector.notes && (
                <p className="text-xs text-slate-400 pt-2 border-t border-slate-800">{selectedInspector.notes}</p>
              )}
              <p className="text-[11px] text-slate-500">{selectedInspector.certification}</p>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <SimpleBarChart title="Jobs by status (lead)" data={byStatus} />
              <SimpleBarChart title="Jobs by method" data={byMethod} />
              <SimpleBarChart
                title="On-time vs late (ops KPI)"
                data={[
                  { label: 'On time', value: onTime, color: 'bg-emerald-500' },
                  { label: 'Late', value: late, color: 'bg-rose-500' },
                  { label: 'No due / open', value: excluded, color: 'bg-slate-500' }
                ]}
              />
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                Jobs as lead ({leadJobs.length})
              </h3>
              <div className="space-y-2">
                {leadJobs.length === 0 && <p className="text-xs text-slate-500">No jobs assigned as lead.</p>}
                {leadJobs.map(jobLink)}
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                Jobs as supervisor ({supervisedJobs.length})
              </h3>
              <div className="space-y-2">
                {supervisedJobs.length === 0 && <p className="text-xs text-slate-500">No supervised jobs.</p>}
                {supervisedJobs.map(jobLink)}
              </div>
            </div>
          </div>
        </div>

        {isModalOpen && renderModal()}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            NDT Inspectors & Technical Authorities
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Compact roster — open a profile for contact, history, and ops KPIs
          </p>
        </div>
        <button
          type="button"
          onClick={() => handleOpenModal()}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-500 hover:from-sky-500 hover:to-cyan-400 text-white font-bold text-sm shadow-lg shadow-sky-500/25 active:scale-95 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Inspector</span>
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() => toggleCertKpi('valid')}
          className={`bg-slate-900 border p-4 rounded-2xl text-left ${
            certFilter === 'valid' ? 'border-emerald-400/60 ring-1 ring-emerald-500/30' : 'border-slate-800'
          }`}
        >
          <span className="text-[11px] uppercase font-bold text-slate-400 block">Valid certs</span>
          <div className="text-2xl font-black text-emerald-400 mt-0.5">{validCount}</div>
          <p className="text-[10px] text-slate-500 mt-1">People with ≥1 verified in-date method</p>
        </button>
        <button
          type="button"
          onClick={() => toggleCertKpi('expiring_soon')}
          className={`bg-slate-900 border p-4 rounded-2xl text-left bg-amber-950/10 ${
            certFilter === 'expiring_soon' ? 'border-amber-400/60 ring-1 ring-amber-500/30' : 'border-amber-500/30'
          }`}
        >
          <span className="text-[11px] uppercase font-bold text-amber-400 block">Due soon</span>
          <div className="text-2xl font-black text-amber-400 mt-0.5">{dueSoonCount}</div>
          <p className="text-[10px] text-slate-500 mt-1">People with ≥1 method due within 30 days</p>
        </button>
        <button
          type="button"
          onClick={() => toggleCertKpi('expired')}
          className={`bg-slate-900 border p-4 rounded-2xl text-left bg-rose-950/10 ${
            certFilter === 'expired' ? 'border-rose-400/60 ring-1 ring-rose-500/30' : 'border-rose-500/30'
          }`}
        >
          <span className="text-[11px] uppercase font-bold text-rose-400 block">Expired / blocked</span>
          <div className="text-2xl font-black text-rose-400 mt-0.5">{expiredBlockedCount}</div>
          <p className="text-[10px] text-slate-500 mt-1">Expired, pending verify, or rejected</p>
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex gap-2 items-stretch">
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, cert number, email…"
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-sky-500" />
          </div>
          <div className="relative shrink-0" ref={filtersRef}>
            <button
              type="button"
              onClick={() => setFiltersOpen(o => !o)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-sm font-bold transition-colors h-full ${
                filtersOpen || activeFilterCount > 0
                  ? 'bg-sky-500/15 border-sky-500/50 text-sky-300'
                  : 'bg-slate-950 border-slate-700 text-slate-300 hover:border-slate-500'
              }`}
              aria-expanded={filtersOpen}
              aria-haspopup="dialog"
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">Filters</span>
              {activeFilterCount > 0 && (
                <span className="min-w-[1.25rem] h-5 px-1 rounded-md bg-sky-500 text-white text-[10px] font-black flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
            {filtersOpen && (
              <div className="absolute right-0 top-full mt-2 z-30 w-[min(100vw-2rem,20rem)] rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl p-4 space-y-4">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">Method</span>
                  <div className="flex flex-wrap gap-2">
                    {METHOD_FILTERS.map(m => (
                      <button key={m} type="button" onClick={() => setMethodFilter(m)} className={chipClass(methodFilter === m, 'sky')}>
                        {m === 'ALL' ? 'All methods' : m}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">Certification status</span>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => setCertFilter('ALL')} className={chipClass(certFilter === 'ALL', 'slate')}>All certs</button>
                    <button type="button" onClick={() => setCertFilter('valid')} className={chipClass(certFilter === 'valid', 'emerald')}>Valid</button>
                    <button type="button" onClick={() => setCertFilter('expiring_soon')} className={chipClass(certFilter === 'expiring_soon', 'amber')}>Due soon</button>
                    <button type="button" onClick={() => setCertFilter('expired')} className={chipClass(certFilter === 'expired', 'rose')}>Expired / blocked</button>
                  </div>
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">Level</span>
                  <div className="flex flex-wrap gap-2">
                    {(['ALL', 'Level 1', 'Level 2', 'Level 3'] as const).map(l => (
                      <button key={l} type="button" onClick={() => setLevelFilter(l)} className={chipClass(levelFilter === l, 'slate')}>
                        {l === 'ALL' ? 'All levels' : l}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {(activeFilterCount > 0 || searchQuery) && (
          <div className="flex flex-wrap items-center gap-2">
            {methodFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-sky-500/15 text-sky-300 border border-sky-500/30">
                Method: {methodFilter}
                <button type="button" onClick={() => setMethodFilter('ALL')} className="hover:text-white" aria-label="Clear method filter">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {certFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-600">
                Cert: {certFilter === 'expiring_soon' ? 'Due soon' : certFilter === 'expired' ? 'Expired / blocked' : 'Valid'}
                <button type="button" onClick={() => setCertFilter('ALL')} className="hover:text-white" aria-label="Clear cert filter">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {levelFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-600">
                {levelFilter}
                <button type="button" onClick={() => setLevelFilter('ALL')} className="hover:text-white" aria-label="Clear level filter">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            <button type="button" onClick={clearFilters} className="text-xs font-semibold text-sky-400 hover:text-sky-300">
              Clear all
            </button>
          </div>
        )}

        <p className="text-xs text-slate-500">
          Showing {filteredInspectors.length} of {inspectors.length}
        </p>
      </div>

      <div className="space-y-2">
        {filteredInspectors.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 p-8 text-center text-sm text-slate-400">
            No inspectors match these filters.
          </div>
        )}
        {filteredInspectors.map(insp => (
          <button
            key={insp.id}
            type="button"
            onClick={() => setSelectedInspectorId(insp.id)}
            className="w-full flex items-center gap-3 sm:gap-4 px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-sky-500/40 text-left transition-colors group"
          >
            <div className="min-w-0 flex-1">
              <div className="font-extrabold text-white truncate">{insp.fullName}</div>
              <div className="text-xs text-sky-400 font-mono mt-0.5">{insp.certNumber}</div>
            </div>
            <div className="hidden sm:flex flex-wrap gap-1 shrink-0 justify-end max-w-[240px]">
              {visibleMethodsForCertFilter(insp, certFilter).map(m => {
                const lvl = getMethodCertLevel(insp, m);
                const short = lvl === 'Level 3' ? 'L3' : lvl === 'Level 1' ? 'L1' : 'L2';
                const tone = methodChipTone(insp, m);
                return (
                  <span key={m} className={methodChipClass(tone)}>
                    {tone === 'rose' && <AlertTriangle className="w-2.5 h-2.5" />}
                    {m}·{short}
                  </span>
                );
              })}
            </div>
            <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-sky-400 shrink-0" />
          </button>
        ))}
      </div>

      {isModalOpen && renderModal()}
    </div>
  );
};
