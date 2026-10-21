import React, { useMemo, useState } from 'react';
import {
  Plus, Edit3, MapPin, Mail, Phone, Building, X, Trash2, Search, ArrowLeft,
  ChevronRight, FileText, Briefcase, CheckCircle2, Clock, CalendarDays
} from 'lucide-react';
import {
  Customer, Site, Job, Inspector, Equipment, CompanySettings, NdtMethod
} from '../../types';
import { StorageService } from '../../services/storage';
import { formatDate } from '../../utils/formatters';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { Badge } from '../common/Badge';
import { ReportViewModal } from '../reports/ReportViewModal';

type JobBucket = 'past' | 'current' | 'future';

const METHODS: NdtMethod[] = ['UT', 'MT', 'PT', 'VT'];

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Schedule date for bucketing: inspection date, else due date. */
function jobScheduleDate(job: Job): string {
  return job.inspectionDate || job.dueDate || '';
}

/**
 * Past = completed, or dated before today and not still open.
 * Current = open jobs with schedule ≤ today (includes overdue).
 * Future = not completed, schedule after today.
 */
function bucketJob(job: Job, today: string): JobBucket {
  if (job.status === 'Completed') return 'past';

  const date = jobScheduleDate(job);
  const isOpen = job.status !== 'Draft';

  if (date && date > today) return 'future';
  if (isOpen) return 'current';
  if (date && date < today) return 'past';
  return 'current';
}

interface CustomerManagementProps {
  customers: Customer[];
  jobs: Job[];
  inspectors?: Inspector[];
  equipment?: Equipment[];
  settings?: CompanySettings;
  onCustomerUpdated: () => void;
  onOpenJob?: (jobId: string) => void;
}

export const CustomerManagement: React.FC<CustomerManagementProps> = ({
  customers,
  jobs,
  inspectors = [],
  equipment = [],
  settings,
  onCustomerUpdated,
  onOpenJob
}) => {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [methodFilter, setMethodFilter] = useState<NdtMethod | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | undefined>(undefined);
  const [previewReportJob, setPreviewReportJob] = useState<Job | undefined>(undefined);

  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [sites, setSites] = useState<Site[]>([]);

  useBodyScrollLock(isModalOpen);

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  const filteredCustomers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(c =>
      c.companyName.toLowerCase().includes(q) ||
      c.contactPerson.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      (c.phone || '').toLowerCase().includes(q)
    );
  }, [customers, searchQuery]);

  const handleOpenModal = (cust?: Customer) => {
    if (cust) {
      setEditingCustomer(cust);
      setCompanyName(cust.companyName);
      setContactPerson(cust.contactPerson);
      setEmail(cust.email);
      setPhone(cust.phone);
      setNotes(cust.notes || '');
      setSites([...cust.sites]);
    } else {
      setEditingCustomer(undefined);
      setCompanyName('');
      setContactPerson('');
      setEmail('');
      setPhone('');
      setNotes('');
      setSites([{ id: 'site-' + Date.now(), name: 'Main Fabrication Facility', address: 'Johannesburg, South Africa' }]);
    }
    setIsModalOpen(true);
  };

  const handleAddSite = () => {
    setSites(prev => [
      ...prev,
      { id: 'site-' + Date.now() + '-' + prev.length, name: `Site ${prev.length + 1}`, address: '' }
    ]);
  };

  const handleUpdateSite = (id: string, field: 'name' | 'address', value: string) => {
    setSites(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const handleRemoveSite = (id: string) => {
    if (sites.length <= 1) {
      alert('A customer must have at least one site location.');
      return;
    }
    setSites(prev => prev.filter(s => s.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) return;

    if (editingCustomer) {
      StorageService.updateCustomer({
        ...editingCustomer,
        companyName,
        contactPerson,
        email,
        phone,
        sites,
        notes
      });
    } else {
      StorageService.addCustomer({
        companyName,
        contactPerson,
        email,
        phone,
        sites,
        notes
      });
    }

    onCustomerUpdated();
    setIsModalOpen(false);
  };

  const openJob = (job: Job) => {
    onOpenJob?.(job.id);
  };

  const canViewReport = (job: Job) =>
    job.status === 'Completed' && Boolean(job.reportNumber || job.completedAt);

  const renderJobCard = (j: Job) => {
    const site = selectedCustomer?.sites.find(s => s.id === j.siteId);
    const showReport = canViewReport(j);

    return (
      <div
        key={j.id}
        role="button"
        tabIndex={0}
        aria-label={`Open ${j.jobNumber}`}
        onClick={() => openJob(j)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openJob(j);
          }
        }}
        className="group w-full flex items-start gap-3 px-3.5 py-3 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-sky-500/50 text-left transition-all cursor-pointer"
      >
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-sm text-white group-hover:text-sky-300 transition-colors">
              {j.jobNumber}
            </span>
            <Badge variant="method" value={j.method} size="sm">
              {j.method}
            </Badge>
            <Badge variant="status" value={j.status} size="sm">
              {j.status}
            </Badge>
            {j.overallResult && j.overallResult !== 'PENDING' && (
              <Badge variant="result" value={j.overallResult} size="sm">
                {j.overallResult}
              </Badge>
            )}
          </div>
          <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-x-3 gap-y-0.5">
            {site?.name && (
              <span className="inline-flex items-center gap-1 truncate">
                <MapPin className="w-3 h-3 text-sky-400 shrink-0" />
                {site.name}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="w-3 h-3 text-sky-400 shrink-0" />
              {formatDate(j.inspectionDate)}
              {j.dueDate && j.dueDate !== j.inspectionDate && (
                <span className="text-slate-500"> · due {formatDate(j.dueDate)}</span>
              )}
            </span>
          </div>
          {j.scope && (
            <p className="text-[11px] text-slate-500 line-clamp-1">{j.scope}</p>
          )}
          {j.reportNumber && (
            <p className="text-[10px] font-mono text-emerald-400/90">{j.reportNumber}</p>
          )}
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
          {showReport && settings && (
            <button
              type="button"
              onClick={() => setPreviewReportJob(j)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-600 hover:text-white hover:border-emerald-500 transition-colors"
              title="View report PDF"
            >
              <FileText className="w-3.5 h-3.5" />
              View report
            </button>
          )}
          <button
            type="button"
            onClick={() => openJob(j)}
            className="p-2 rounded-xl bg-slate-800 text-slate-400 group-hover:text-white group-hover:bg-sky-600 transition-all"
            aria-label={`Open job ${j.jobNumber}`}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  const renderJobSection = (
    title: string,
    icon: React.ReactNode,
    sectionJobs: Job[],
    empty: string
  ) => (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
        {icon}
        {title}
        <span className="ml-auto text-slate-500 font-semibold normal-case tracking-normal">
          {sectionJobs.length}
        </span>
      </h3>
      <div className="space-y-2">
        {sectionJobs.length === 0 && <p className="text-xs text-slate-500">{empty}</p>}
        {sectionJobs.map(renderJobCard)}
      </div>
    </div>
  );

  if (selectedCustomer) {
    const today = todayISO();
    const custJobs = jobs.filter(j => j.customerId === selectedCustomer.id);
    const pastJobsAll = custJobs
      .filter(j => bucketJob(j, today) === 'past')
      .sort((a, b) => (b.inspectionDate || '').localeCompare(a.inspectionDate || ''));
    const currentJobsAll = custJobs
      .filter(j => bucketJob(j, today) === 'current')
      .sort((a, b) => (a.inspectionDate || '').localeCompare(b.inspectionDate || ''));
    const futureJobsAll = custJobs
      .filter(j => bucketJob(j, today) === 'future')
      .sort((a, b) => (a.inspectionDate || '').localeCompare(b.inspectionDate || ''));

    const byMethod = (list: Job[]) =>
      methodFilter ? list.filter(j => j.method === methodFilter) : list;
    const pastJobs = byMethod(pastJobsAll);
    const currentJobs = byMethod(currentJobsAll);
    const futureJobs = byMethod(futureJobsAll);

    const completed = custJobs.filter(j => j.status === 'Completed');
    const openCount = custJobs.filter(j => j.status !== 'Completed' && j.status !== 'Draft').length;
    const passCount = completed.filter(j => j.overallResult === 'PASS').length;
    const failCount = completed.filter(j => j.overallResult === 'FAIL').length;
    const methodCounts = METHODS.reduce((acc, m) => {
      acc[m] = custJobs.filter(j => j.method === m).length;
      return acc;
    }, {} as Record<NdtMethod, number>);
    const methodTotal = custJobs.length || 1;

    const filteredEmpty = (bucket: string) =>
      methodFilter
        ? `No ${methodFilter} jobs in this bucket.`
        : bucket;

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <button
              type="button"
              onClick={() => {
                setSelectedCustomerId(null);
                setMethodFilter(null);
              }}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-400 hover:text-sky-300 mb-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to customers
            </button>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {selectedCustomer.companyName}
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">{selectedCustomer.contactPerson}</p>
          </div>
          <button
            type="button"
            onClick={() => handleOpenModal(selectedCustomer)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-700 text-slate-200 text-sm font-bold hover:bg-slate-800 self-start"
          >
            <Edit3 className="w-4 h-4" />
            Edit customer
          </button>
        </div>

        {/* Meaningful stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <div className="flex items-center justify-between text-slate-400 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider">Total jobs</span>
              <Briefcase className="w-3.5 h-3.5 text-sky-400" />
            </div>
            <div className="text-2xl font-black text-white">{custJobs.length}</div>
            <p className="text-[11px] text-slate-500 mt-1">
              {openCount} open · {completed.length} completed
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <div className="flex items-center justify-between text-slate-400 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider">Open vs done</span>
              <Clock className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-white">
              <span className="text-amber-300">{openCount}</span>
              <span className="text-slate-600 mx-1">/</span>
              <span className="text-emerald-400">{completed.length}</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {currentJobsAll.length} current · {futureJobsAll.length} upcoming
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <div className="flex items-center justify-between text-slate-400 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider">Pass / Fail</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-white">
              <span className="text-emerald-400">{passCount}</span>
              <span className="text-slate-600 mx-1">/</span>
              <span className="text-rose-400">{failCount}</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Of {completed.length} completed
              {completed.length > 0 && failCount > 0
                ? ` · ${Math.round((failCount / completed.length) * 100)}% fail rate`
                : ''}
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <div className="flex items-center justify-between text-slate-400 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider">Methods</span>
              {methodFilter && (
                <span className="text-[10px] font-semibold normal-case tracking-normal text-sky-400">
                  Filtered
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 mb-2" role="group" aria-label="Filter jobs by method">
              {METHODS.map(m => {
                const selected = methodFilter === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMethodFilter(prev => (prev === m ? null : m))}
                    title={selected ? `Clear ${m} filter` : `Filter jobs by ${m}`}
                    aria-pressed={selected}
                    aria-label={selected ? `${m} filter active, click to clear` : `Filter jobs by ${m}`}
                    className={`cursor-pointer rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/80 ${
                      selected ? 'ring-2 ring-sky-400/80 ring-offset-1 ring-offset-slate-900' : 'hover:opacity-90'
                    }`}
                  >
                    <Badge variant="method" value={m} size="sm" className={selected ? 'shadow-md' : ''}>
                      {m} {methodCounts[m]}
                    </Badge>
                  </button>
                );
              })}
            </div>
            <div className="flex h-1.5 rounded-full overflow-hidden bg-slate-800">
              {METHODS.map(m => {
                const n = methodCounts[m];
                if (!n) return null;
                const pct = (n / methodTotal) * 100;
                const barColor =
                  m === 'UT' ? 'bg-cyan-500' :
                  m === 'MT' ? 'bg-purple-500' :
                  m === 'PT' ? 'bg-rose-500' : 'bg-amber-500';
                return (
                  <div
                    key={m}
                    className={`${barColor} h-full`}
                    style={{ width: `${pct}%` }}
                    title={`${m}: ${n}`}
                  />
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Contact</h3>
              <div className="space-y-2 text-sm text-slate-300">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-sky-400 shrink-0" />
                  <span className="truncate">{selectedCustomer.email || '—'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-sky-400 shrink-0" />
                  <span>{selectedCustomer.phone || '—'}</span>
                </div>
              </div>
              {selectedCustomer.notes && (
                <p className="text-xs text-slate-400 pt-3 border-t border-slate-800">{selectedCustomer.notes}</p>
              )}
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                Sites ({selectedCustomer.sites.length})
              </h3>
              <div className="space-y-2">
                {selectedCustomer.sites.map(s => (
                  <div key={s.id} className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-xs">
                    <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-sky-400" />
                      {s.name}
                    </div>
                    {s.address && <p className="text-slate-400 mt-1 pl-5">{s.address}</p>}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            {renderJobSection(
              'Current jobs',
              <Clock className="w-3.5 h-3.5 text-amber-400" />,
              currentJobs,
              filteredEmpty('No open jobs in the current window.')
            )}
            {renderJobSection(
              'Future jobs',
              <CalendarDays className="w-3.5 h-3.5 text-sky-400" />,
              futureJobs,
              filteredEmpty('No upcoming scheduled jobs.')
            )}
            {renderJobSection(
              'Past jobs',
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
              pastJobs,
              filteredEmpty('No completed or past-dated jobs yet.')
            )}
          </div>
        </div>

        {isModalOpen && renderModal()}

        {previewReportJob && settings && (
          <ReportViewModal
            isOpen={Boolean(previewReportJob)}
            onClose={() => setPreviewReportJob(undefined)}
            job={previewReportJob}
            customer={selectedCustomer}
            inspector={inspectors.find(i => i.id === previewReportJob.inspectorId)}
            supervisor={inspectors.find(i => i.id === previewReportJob.supervisorId)}
            equipmentList={equipment.filter(e => previewReportJob.equipmentIds?.includes(e.id))}
            settings={settings}
          />
        )}
      </div>
    );
  }

  function renderModal() {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-3 sm:p-4 overflow-hidden">
        <div className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center">
                <Building className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-white">
                {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
              </h3>
            </div>
            <button type="button" onClick={() => setIsModalOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 text-slate-200">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Company Name *</label>
              <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-sky-500" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Contact Person</label>
                <input type="text" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-sky-500" />
              </div>
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

            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-sky-400">Inspection Sites / Plants</span>
                <button type="button" onClick={handleAddSite} className="text-xs font-bold text-sky-400 hover:text-sky-300 flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" /> Add Site
                </button>
              </div>
              <div className="space-y-3">
                {sites.map((s, idx) => (
                  <div key={s.id} className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <input type="text" value={s.name} onChange={(e) => handleUpdateSite(s.id, 'name', e.target.value)} required
                        placeholder={`Site ${idx + 1} Name`}
                        className="flex-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs font-semibold focus:outline-none focus:border-sky-500" />
                      {sites.length > 1 && (
                        <button type="button" onClick={() => handleRemoveSite(s.id)} className="p-1 rounded text-slate-500 hover:text-rose-400">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <input type="text" value={s.address} onChange={(e) => handleUpdateSite(s.id, 'address', e.target.value)}
                      placeholder="Site Physical Address"
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-sky-500" />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Client Notes & Protocol</label>
              <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-sky-500" />
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 font-semibold text-xs hover:bg-slate-800">Cancel</button>
              <button type="submit" className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-500 text-white font-bold text-sm shadow-lg">
                {editingCustomer ? 'Update Customer' : 'Save Customer'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Customer Registry</h1>
          <p className="text-xs sm:text-sm text-slate-400">Search clients, then open a profile for sites, jobs, and reports</p>
        </div>
        <button
          type="button"
          onClick={() => handleOpenModal()}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-500 hover:from-sky-500 hover:to-cyan-400 text-white font-bold text-sm shadow-lg shadow-sky-500/25 active:scale-95 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Customer</span>
        </button>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search company, contact, email…"
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
        />
      </div>

      <div className="space-y-2">
        {filteredCustomers.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 p-8 text-center text-sm text-slate-400">
            No customers match your search.
          </div>
        )}
        {filteredCustomers.map(cust => {
          const custJobs = jobs.filter(j => j.customerId === cust.id);
          const openCount = custJobs.filter(j => j.status !== 'Completed' && j.status !== 'Draft').length;
          const completedCount = custJobs.filter(j => j.status === 'Completed').length;

          return (
            <button
              key={cust.id}
              type="button"
              onClick={() => {
                setMethodFilter(null);
                setSelectedCustomerId(cust.id);
              }}
              className="w-full flex items-center gap-3 sm:gap-4 px-4 py-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-sky-500/40 text-left transition-colors group"
            >
              <div className="w-10 h-10 rounded-lg bg-sky-500/15 text-sky-400 flex items-center justify-center shrink-0">
                <Building className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-extrabold text-white truncate">{cust.companyName}</div>
                <div className="text-xs text-slate-400 truncate">{cust.contactPerson || 'No contact'} · {cust.sites.length} site{cust.sites.length === 1 ? '' : 's'}</div>
              </div>
              <div className="hidden sm:flex items-center gap-3 text-xs shrink-0">
                <span className="text-amber-300 font-semibold">{openCount} open</span>
                <span className="text-emerald-400 font-semibold">{completedCount} done</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-sky-400 shrink-0" />
            </button>
          );
        })}
      </div>

      {isModalOpen && renderModal()}
    </div>
  );
};
