import React, { useState } from 'react';
import { 
  Briefcase, Plus, Search, FileText, Edit3, Trash2, 
  Calendar, ChevronRight, MapPin, X, ArrowUpDown
} from 'lucide-react';
import { Job, Customer, Inspector, Equipment, CompanySettings, NdtProcedure } from '../../types';
import { Badge } from '../common/Badge';
import { formatDate } from '../../utils/formatters';
import { JobFormModal } from './JobFormModal';
import { ReportViewModal } from '../reports/ReportViewModal';
import { StorageService } from '../../services/storage';
import type { JobsNavFilter } from './AdminDashboard';

/** Status select values: ALL | discrete JobStatus | KPI presets from dashboard. */
export type JobStatusFilterValue = 'ALL' | JobsNavFilter | string;

function isCompletedThisMonth(job: Job): boolean {
  if (job.status !== 'Completed' || !job.completedAt) return false;
  const d = new Date(job.completedAt);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

function matchesStatusFilter(job: Job, statusFilter: JobStatusFilterValue): boolean {
  if (statusFilter === 'ALL') return true;
  // Matches AdminDashboard Open Jobs KPI: status !== 'Completed' (includes Draft)
  if (statusFilter === 'OPEN') return job.status !== 'Completed';
  // Matches Awaiting Sign-off KPI: In Progress | Awaiting Supervisor
  if (statusFilter === 'AWAITING_SIGN_OFF') {
    return job.status === 'In Progress' || job.status === 'Awaiting Supervisor';
  }
  // Matches Completed Month KPI
  if (statusFilter === 'COMPLETED_MONTH') return isCompletedThisMonth(job);
  return job.status === statusFilter;
}

type JobSortKey =
  | 'newest'
  | 'oldest'
  | 'inspection_newest'
  | 'inspection_oldest'
  | 'due_soonest'
  | 'due_latest'
  | 'job_number_asc'
  | 'job_number_desc'
  | 'status';

const STATUS_SORT_ORDER: Record<string, number> = {
  Draft: 0,
  Assigned: 1,
  'In Progress': 2,
  'Awaiting Supervisor': 3,
  'Revision Required': 4,
  Completed: 5
};

function compareJobs(a: Job, b: Job, sortKey: JobSortKey): number {
  const created = (j: Job) => j.createdAt || '';
  const insp = (j: Job) => j.inspectionDate || '';
  const due = (j: Job) => j.dueDate || '9999-12-31';

  switch (sortKey) {
    case 'newest':
      return created(b).localeCompare(created(a)) || b.jobNumber.localeCompare(a.jobNumber);
    case 'oldest':
      return created(a).localeCompare(created(b)) || a.jobNumber.localeCompare(b.jobNumber);
    case 'inspection_newest':
      return insp(b).localeCompare(insp(a)) || b.jobNumber.localeCompare(a.jobNumber);
    case 'inspection_oldest':
      return insp(a).localeCompare(insp(b)) || a.jobNumber.localeCompare(b.jobNumber);
    case 'due_soonest':
      return due(a).localeCompare(due(b)) || a.jobNumber.localeCompare(b.jobNumber);
    case 'due_latest':
      return due(b).localeCompare(due(a)) || b.jobNumber.localeCompare(a.jobNumber);
    case 'job_number_asc':
      return a.jobNumber.localeCompare(b.jobNumber, undefined, { numeric: true });
    case 'job_number_desc':
      return b.jobNumber.localeCompare(a.jobNumber, undefined, { numeric: true });
    case 'status': {
      const sa = STATUS_SORT_ORDER[a.status] ?? 99;
      const sb = STATUS_SORT_ORDER[b.status] ?? 99;
      return sa - sb || insp(b).localeCompare(insp(a));
    }
    default:
      return 0;
  }
}

interface JobListProps {
  jobs: Job[];
  customers: Customer[];
  inspectors: Inspector[];
  equipment: Equipment[];
  procedures: NdtProcedure[];
  settings: CompanySettings;
  onJobUpdated: (job: Job) => void;
  onOpenJobDetail: (job: Job) => void;
  /** Optional initial status filter from dashboard KPI deep-link (parent remounts via key). */
  initialStatusFilter?: JobStatusFilterValue;
}

export const JobList: React.FC<JobListProps> = ({
  jobs,
  customers,
  inspectors,
  equipment,
  procedures,
  settings,
  onJobUpdated,
  onOpenJobDetail,
  initialStatusFilter = 'ALL'
}) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | undefined>(undefined);
  const [previewReportJob, setPreviewReportJob] = useState<Job | undefined>(undefined);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<JobStatusFilterValue>(initialStatusFilter);
  const [methodFilter, setMethodFilter] = useState<string>('ALL');
  const [customerFilter, setCustomerFilter] = useState<string>('ALL');
  const [sortKey, setSortKey] = useState<JobSortKey>('newest');

  const filtersActive =
    statusFilter !== 'ALL' ||
    methodFilter !== 'ALL' ||
    customerFilter !== 'ALL' ||
    searchQuery.trim().length > 0;

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setMethodFilter('ALL');
    setCustomerFilter('ALL');
  };

  const filteredJobs = jobs
    .filter(job => {
      if (!matchesStatusFilter(job, statusFilter)) return false;
      if (methodFilter !== 'ALL' && job.method !== methodFilter) return false;
      if (customerFilter !== 'ALL' && job.customerId !== customerFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const cust = customers.find(c => c.id === job.customerId);
        const site = cust?.sites.find(s => s.id === job.siteId);
        const insp = inspectors.find(i => i.id === job.inspectorId);

        return (
          job.jobNumber.toLowerCase().includes(q) ||
          (cust?.companyName.toLowerCase().includes(q)) ||
          (site?.name.toLowerCase().includes(q)) ||
          (insp?.fullName.toLowerCase().includes(q)) ||
          (job.reportNumber?.toLowerCase().includes(q))
        );
      }
      return true;
    })
    .slice()
    .sort((a, b) => compareJobs(a, b, sortKey));

  const handleDeleteJob = (jobId: string) => {
    if (!confirm('Are you sure you want to delete this inspection job?')) return;
    StorageService.deleteJob(jobId);
    window.dispatchEvent(new Event('ndt_data_updated'));
  };

  const openEdit = (job: Job) => {
    setEditingJob(job);
    setIsCreateModalOpen(true);
  };

  const renderActions = (job: Job, compact = false) => (
    <div className={`inline-flex items-center gap-1.5 ${compact ? '' : ''}`} onClick={(e) => e.stopPropagation()}>
      {job.status === 'Completed' && (
        <button
          type="button"
          onClick={() => setPreviewReportJob(job)}
          className="p-1.5 rounded-lg text-emerald-400 hover:text-white hover:bg-emerald-600/30 transition-colors"
          title="Generate / View PDF Report"
        >
          <FileText className="w-4 h-4" />
        </button>
      )}

      {job.status !== 'Completed' && (
        <button
          type="button"
          onClick={() => openEdit(job)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Edit Job Details"
        >
          <Edit3 className="w-4 h-4" />
        </button>
      )}

      {job.status !== 'Completed' && (
        <button
          type="button"
          onClick={() => handleDeleteJob(job.id)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
          title="Delete Job"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Inspection Jobs
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Create, track, and generate official NDT certificates
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingJob(undefined);
            setIsCreateModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-500 hover:from-sky-500 hover:to-cyan-400 text-white font-bold text-sm shadow-lg shadow-sky-500/25 active:scale-95 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Job</span>
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Job #, Client, Site, Inspector..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs sm:text-sm placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by status"
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs sm:text-sm text-slate-300 focus:outline-none focus:border-sky-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="OPEN">Open (not completed)</option>
              <option value="AWAITING_SIGN_OFF">Awaiting sign-off</option>
              <option value="COMPLETED_MONTH">Completed this month</option>
              <option value="Draft">Draft</option>
              <option value="Assigned">Assigned</option>
              <option value="In Progress">In Progress</option>
              <option value="Awaiting Supervisor">Awaiting Supervisor</option>
              <option value="Revision Required">Revision Required</option>
              <option value="Completed">Completed</option>
            </select>
          </div>

          <div>
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs sm:text-sm text-slate-300 focus:outline-none focus:border-sky-500"
            >
              <option value="ALL">All Methods</option>
              <option value="UT">UT - Ultrasonic</option>
              <option value="MT">MT - Magnetic</option>
              <option value="PT">PT - Penetrant</option>
              <option value="VT">VT - Visual</option>
            </select>
          </div>

          <div>
            <select
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs sm:text-sm text-slate-300 focus:outline-none focus:border-sky-500"
            >
              <option value="ALL">All Customers</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.companyName}</option>
              ))}
            </select>
          </div>

          <div className="relative">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as JobSortKey)}
              aria-label="Sort jobs"
              className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs sm:text-sm text-slate-300 focus:outline-none focus:border-sky-500"
            >
              <option value="newest">Newest created</option>
              <option value="oldest">Oldest created</option>
              <option value="inspection_newest">Inspection date (newest)</option>
              <option value="inspection_oldest">Inspection date (oldest)</option>
              <option value="due_soonest">Due date (soonest)</option>
              <option value="due_latest">Due date (latest)</option>
              <option value="job_number_desc">Job # (high → low)</option>
              <option value="job_number_asc">Job # (low → high)</option>
              <option value="status">Status (workflow order)</option>
            </select>
          </div>

        </div>
      </div>

      {filteredJobs.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
          <Briefcase className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          {jobs.length === 0 ? (
            <>
              <h3 className="font-bold text-base text-slate-200">No inspection jobs yet</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto mb-4">
                Create a new inspection job to get started.
              </p>
              <button
                type="button"
                onClick={() => {
                  setEditingJob(undefined);
                  setIsCreateModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 text-white font-bold text-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Job</span>
              </button>
            </>
          ) : (
            <>
              <h3 className="font-bold text-base text-slate-200">No matches</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto mb-4">
                {filtersActive
                  ? 'No jobs match your search or filters. Clear filters to see all jobs.'
                  : 'No jobs to show.'}
              </p>
              {filtersActive && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700"
                >
                  <X className="w-4 h-4" />
                  <span>Clear filters</span>
                </button>
              )}
            </>
          )}
        </div>
      ) : (
        <>
          {/* Mobile / tablet cards */}
          <div className="md:hidden space-y-3">
            {filteredJobs.map(job => {
              const customer = customers.find(c => c.id === job.customerId);
              const site = customer?.sites.find(s => s.id === job.siteId);
              const inspector = inspectors.find(i => i.id === job.inspectorId);

              return (
                <div
                  key={job.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`Open ${job.jobNumber}`}
                  onClick={() => onOpenJobDetail(job)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onOpenJobDetail(job);
                    }
                  }}
                  className="group bg-slate-900 border border-slate-800 hover:border-sky-500/50 rounded-2xl p-4 shadow-lg transition-all cursor-pointer active:scale-99"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-black text-base text-white tracking-tight group-hover:text-sky-400 transition-colors">
                          {job.jobNumber}
                        </span>
                        <Badge variant="method" value={job.method} size="sm">
                          {job.method}
                        </Badge>
                        <Badge variant="status" value={job.status} size="sm">
                          {job.status}
                        </Badge>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                          job.overallResult === 'PASS'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : job.overallResult === 'FAIL'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}>
                          {job.overallResult}
                        </span>
                      </div>
                      <h3 className="font-bold text-sm text-slate-200 truncate">
                        {customer?.companyName || '—'}
                      </h3>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-sky-400" />
                          {site?.name || 'On Site'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-sky-400" />
                          {formatDate(job.inspectionDate)}
                        </span>
                        <span className="text-slate-300 font-medium truncate">
                          {inspector?.fullName || '—'}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {renderActions(job, true)}
                      <div className="p-2 rounded-xl bg-slate-800 text-slate-400 group-hover:text-white group-hover:bg-sky-600 transition-all">
                        <ChevronRight className="w-5 h-5" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase text-[11px] font-bold tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Job / Report #</th>
                    <th className="py-3.5 px-4">Customer & Site</th>
                    <th className="py-3.5 px-4">Method</th>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4">Inspector</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Result</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {filteredJobs.map(job => {
                    const customer = customers.find(c => c.id === job.customerId);
                    const site = customer?.sites.find(s => s.id === job.siteId);
                    const inspector = inspectors.find(i => i.id === job.inspectorId);

                    return (
                      <tr
                        key={job.id}
                        role="button"
                        tabIndex={0}
                        aria-label={`Open ${job.jobNumber}`}
                        className="hover:bg-slate-800/40 transition-colors cursor-pointer"
                        onClick={() => onOpenJobDetail(job)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onOpenJobDetail(job);
                          }
                        }}
                      >
                        <td className="py-3.5 px-4">
                          <div className="font-black text-white font-mono">{job.jobNumber}</div>
                          {job.reportNumber && (
                            <span className="text-[10px] text-sky-400 font-mono font-medium block">
                              {job.reportNumber}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-white">{customer?.companyName || '—'}</div>
                          <div className="text-slate-400 text-xs">{site?.name || 'On Site'}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge variant="method" value={job.method} size="sm">
                            {job.method}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap text-slate-300">
                          {formatDate(job.inspectionDate)}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-medium text-slate-200">{inspector?.fullName || '—'}</div>
                          <div className="text-[11px] text-slate-500">{inspector?.certNumber}</div>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <Badge variant="status" value={job.status} size="sm">
                            {job.status}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-xs font-black ${
                            job.overallResult === 'PASS'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                              : job.overallResult === 'FAIL'
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                          }`}>
                            {job.overallResult}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          {renderActions(job)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <JobFormModal
        key={editingJob?.id ?? 'create-new'}
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingJob(undefined);
        }}
        onJobCreated={(newOrUpdatedJob) => {
          onJobUpdated(newOrUpdatedJob);
          setIsCreateModalOpen(false);
          setEditingJob(undefined);
        }}
        customers={customers}
        inspectors={inspectors}
        equipment={equipment}
        procedures={procedures}
        existingJob={editingJob}
      />

      {previewReportJob && (
        <ReportViewModal
          isOpen={Boolean(previewReportJob)}
          onClose={() => setPreviewReportJob(undefined)}
          job={previewReportJob}
          customer={customers.find(c => c.id === previewReportJob.customerId)}
          inspector={inspectors.find(i => i.id === previewReportJob.inspectorId)}
          supervisor={inspectors.find(i => i.id === previewReportJob.supervisorId)}
          equipmentList={equipment.filter(e => previewReportJob.equipmentIds?.includes(e.id))}
          settings={settings}
        />
      )}

    </div>
  );
};
