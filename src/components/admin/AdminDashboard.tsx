import React, { useState } from 'react';
import { 
  Briefcase, CheckCircle2, Clock, AlertTriangle, 
  Plus, Users, Wrench, ArrowUpRight, ShieldAlert, ChevronRight
} from 'lucide-react';
import { Job, Customer, Inspector, Equipment, CompanySettings, NdtProcedure } from '../../types';
import { Badge } from '../common/Badge';
import { formatDate } from '../../utils/formatters';
import { checkExpiry } from '../../utils/validation';
import { JobFormModal } from './JobFormModal';
import { ReportViewModal } from '../reports/ReportViewModal';

/** Payload when KPI cards deep-link into Jobs with filters matching card counts. */
export type JobsNavFilter =
  | 'OPEN' // status !== Completed (matches Open Jobs KPI, includes Draft)
  | 'AWAITING_SIGN_OFF' // In Progress | Awaiting Supervisor
  | 'COMPLETED_MONTH'; // Completed + completedAt in current calendar month

export interface AdminNavigatePayload {
  jobsFilter?: JobsNavFilter;
}

interface AdminDashboardProps {
  jobs: Job[];
  customers: Customer[];
  inspectors: Inspector[];
  equipment: Equipment[];
  procedures: NdtProcedure[];
  settings: CompanySettings;
  onNavigateToTab: (tab: string, payload?: AdminNavigatePayload) => void;
  onOpenInspector: (id: string) => void;
  onOpenEquipment: (id: string) => void;
  onOpenJobDetail: (job: Job) => void;
  onJobUpdated: (job: Job) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  jobs,
  customers,
  inspectors,
  equipment,
  procedures,
  settings,
  onNavigateToTab,
  onOpenInspector,
  onOpenEquipment,
  onOpenJobDetail,
  onJobUpdated
}) => {
  const [isCreateJobOpen, setIsCreateJobOpen] = useState(false);
  const [previewReportJob, setPreviewReportJob] = useState<Job | undefined>(undefined);

  // Key metrics calculation
  const openJobs = jobs.filter(j => j.status !== 'Completed');
  const awaitingCompletion = jobs.filter(j => j.status === 'In Progress' || j.status === 'Awaiting Supervisor');
  
  // Completed this current month
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const completedThisMonth = jobs.filter(j => {
    if (j.status !== 'Completed' || !j.completedAt) return false;
    const d = new Date(j.completedAt);
    return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
  });

  // Expiring inspector certs & equipment calibrations (urgent first, capped for dashboard)
  const certWarnings = inspectors
    .map(i => ({ inspector: i, expiry: checkExpiry(i.certExpiryDate) }))
    .filter(item => item.expiry.status !== 'valid')
    .sort((a, b) => (a.expiry.daysRemaining ?? 0) - (b.expiry.daysRemaining ?? 0));

  const calWarnings = equipment
    .map(e => ({ equipment: e, expiry: checkExpiry(e.calibrationExpiryDate) }))
    .filter(item => item.expiry.status !== 'valid')
    .sort((a, b) => (a.expiry.daysRemaining ?? 0) - (b.expiry.daysRemaining ?? 0));

  const ALERT_PREVIEW = 5;
  const certPreview = certWarnings.slice(0, ALERT_PREVIEW);
  const calPreview = calWarnings.slice(0, ALERT_PREVIEW);

  const recentJobs = [...jobs]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      
      {/* Top Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-850 p-5 rounded-2xl border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-400">
              Operations Overview
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-sky-500/20 text-sky-300 border border-sky-500/30">
              South Africa
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1">
            {settings.companyName}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Real-time NDT inspection status, field calibrations, and certificate dispatch
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateJobOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-500 hover:from-sky-500 hover:to-cyan-400 text-white font-bold text-sm shadow-lg shadow-sky-500/25 active:scale-95 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Inspection Job</span>
        </button>
      </div>

      {/* KPI Cards Grid — each card deep-links to the same set its count uses */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        {/* Card 1: Open Jobs → Jobs filtered status !== Completed */}
        <button
          type="button"
          title="View open jobs (not completed)"
          onClick={() => onNavigateToTab('jobs', { jobsFilter: 'OPEN' })}
          className="text-left bg-slate-900 border border-slate-800 hover:border-sky-500/40 hover:bg-slate-900/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60 p-4 sm:p-5 rounded-2xl shadow-lg transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Open Jobs</span>
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 group-hover:bg-sky-600 group-hover:text-white transition-colors">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">{openJobs.length}</div>
          <p className="text-[11px] text-slate-400 mt-1">
            {jobs.filter(j => j.status === 'Assigned').length} assigned • {jobs.filter(j => j.status === 'In Progress').length} in progress • {jobs.filter(j => j.status === 'Awaiting Supervisor').length} awaiting supervisor • {jobs.filter(j => j.status === 'Revision Required').length} revision required
          </p>
        </button>

        {/* Card 2: Completed This Month → Completed + completedAt this month */}
        <button
          type="button"
          title="View jobs completed this month"
          onClick={() => onNavigateToTab('jobs', { jobsFilter: 'COMPLETED_MONTH' })}
          className="text-left bg-slate-900 border border-slate-800 hover:border-emerald-500/40 hover:bg-slate-900/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 p-4 sm:p-5 rounded-2xl shadow-lg transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Completed Month</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">{completedThisMonth.length}</div>
          <p className="text-[11px] text-slate-400 mt-1">Official reports dispatched</p>
        </button>

        {/* Card 3: Awaiting Sign-off → In Progress | Awaiting Supervisor */}
        <button
          type="button"
          title="View jobs awaiting sign-off"
          onClick={() => onNavigateToTab('jobs', { jobsFilter: 'AWAITING_SIGN_OFF' })}
          className="text-left bg-slate-900 border border-slate-800 hover:border-amber-500/40 hover:bg-slate-900/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60 p-4 sm:p-5 rounded-2xl shadow-lg transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Awaiting Sign-off</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">{awaitingCompletion.length}</div>
          <p className="text-[11px] text-slate-400 mt-1">In progress or awaiting supervisor</p>
        </button>

        {/* Card 4: Active Clients → Customers list */}
        <button
          type="button"
          title="View customers"
          onClick={() => onNavigateToTab('customers')}
          className="text-left bg-slate-900 border border-slate-800 hover:border-purple-500/40 hover:bg-slate-900/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/60 p-4 sm:p-5 rounded-2xl shadow-lg transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Active Clients</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">{customers.length}</div>
          <p className="text-[11px] text-slate-400 mt-1">
            {inspectors.length} certified inspectors • {equipment.length} tools
          </p>
        </button>

      </div>

      {/* Critical Warnings: People vs Equipment */}
      {(certWarnings.length > 0 || calWarnings.length > 0) && (
        <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-3 sm:p-4 shadow-xl">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 text-amber-400 font-extrabold text-sm">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>Compliance alerts</span>
            </div>
            <button
              type="button"
              onClick={() => onNavigateToTab('renewals')}
              className="text-[10px] font-bold text-sky-400 hover:text-sky-300 inline-flex items-center gap-0.5"
            >
              All renewals
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* People */}
            <div className="min-w-0 rounded-xl border border-slate-800 bg-slate-950/40 overflow-hidden">
              <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 border-b border-slate-800 bg-slate-950/60">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-300">
                  <Users className="w-3 h-3 text-sky-400" />
                  People
                </div>
                <span className="text-[10px] font-bold text-slate-500">{certWarnings.length}</span>
              </div>
              {certWarnings.length === 0 ? (
                <p className="text-[11px] text-slate-500 px-2.5 py-2">No cert alerts</p>
              ) : (
                <ul className="divide-y divide-slate-800/80">
                  {certPreview.map(({ inspector, expiry }) => (
                    <li key={inspector.id}>
                      <button
                        type="button"
                        onClick={() => onOpenInspector(inspector.id)}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left hover:bg-slate-900 transition-colors group"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-white truncate group-hover:text-sky-300">
                            {inspector.fullName}
                          </div>
                          <div className="text-[10px] text-slate-500 truncate font-mono">
                            {inspector.certNumber}
                          </div>
                        </div>
                        <span
                          className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            expiry.status === 'expired'
                              ? 'bg-rose-500/20 text-rose-400'
                              : 'bg-amber-500/20 text-amber-400'
                          }`}
                        >
                          {expiry.status === 'expired'
                            ? `Exp. ${Math.abs(expiry.daysRemaining ?? 0)}d`
                            : `${expiry.daysRemaining ?? 0}d`}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-sky-400 shrink-0" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {certWarnings.length > ALERT_PREVIEW && (
                <button
                  type="button"
                  onClick={() => onNavigateToTab('renewals')}
                  className="w-full text-[10px] font-bold text-sky-400 hover:bg-slate-900 px-2.5 py-1.5 border-t border-slate-800 text-left"
                >
                  +{certWarnings.length - ALERT_PREVIEW} more people → Renewals
                </button>
              )}
            </div>

            {/* Equipment */}
            <div className="min-w-0 rounded-xl border border-slate-800 bg-slate-950/40 overflow-hidden">
              <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 border-b border-slate-800 bg-slate-950/60">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-300">
                  <Wrench className="w-3 h-3 text-amber-400" />
                  Equipment
                </div>
                <span className="text-[10px] font-bold text-slate-500">{calWarnings.length}</span>
              </div>
              {calWarnings.length === 0 ? (
                <p className="text-[11px] text-slate-500 px-2.5 py-2">No cal alerts</p>
              ) : (
                <ul className="divide-y divide-slate-800/80">
                  {calPreview.map(({ equipment: eq, expiry }) => (
                    <li key={eq.id}>
                      <button
                        type="button"
                        onClick={() => onOpenEquipment(eq.id)}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left hover:bg-slate-900 transition-colors group"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-white truncate group-hover:text-sky-300">
                            {eq.name}
                          </div>
                          <div className="text-[10px] text-slate-500 truncate font-mono">
                            {eq.serialNumber}
                          </div>
                        </div>
                        <span
                          className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            expiry.status === 'expired'
                              ? 'bg-rose-500/20 text-rose-400'
                              : 'bg-amber-500/20 text-amber-400'
                          }`}
                        >
                          {expiry.status === 'expired'
                            ? `Exp. ${Math.abs(expiry.daysRemaining ?? 0)}d`
                            : `${expiry.daysRemaining ?? 0}d`}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-sky-400 shrink-0" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {calWarnings.length > ALERT_PREVIEW && (
                <button
                  type="button"
                  onClick={() => onNavigateToTab('renewals')}
                  className="w-full text-[10px] font-bold text-sky-400 hover:bg-slate-900 px-2.5 py-1.5 border-t border-slate-800 text-left"
                >
                  +{calWarnings.length - ALERT_PREVIEW} more tools → Renewals
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Recent Inspection Jobs Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-black text-white">Recent Inspection Jobs</h2>
            <p className="text-xs text-slate-400">Latest field inspections and reports</p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateToTab('jobs')}
            className="text-xs font-bold text-sky-400 hover:text-sky-300 flex items-center gap-1 transition-colors"
          >
            <span>View All Jobs ({jobs.length})</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase text-[11px] font-bold tracking-wider">
              <tr>
                <th className="py-3 px-4">Job / Report #</th>
                <th className="py-3 px-4">Client & Site</th>
                <th className="py-3 px-4">Method</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Inspector</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Result</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {recentJobs.map(job => {
                const customer = customers.find(c => c.id === job.customerId);
                const site = customer?.sites.find(s => s.id === job.siteId);
                const inspector = inspectors.find(i => i.id === job.inspectorId);

                return (
                  <tr
                    key={job.id}
                    className="hover:bg-slate-800/40 transition-colors cursor-pointer"
                    onClick={() => onOpenJobDetail(job)}
                  >
                    <td className="py-3 px-4 font-mono font-black text-white">
                      {job.jobNumber}
                      {job.reportNumber && (
                        <div className="text-[10px] text-sky-400 font-normal">{job.reportNumber}</div>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-bold text-white">{customer?.companyName || '—'}</div>
                      <div className="text-slate-400 text-xs">{site?.name || 'On Site'}</div>
                    </td>

                    <td className="py-3 px-4">
                      <Badge variant="method" value={job.method} size="sm">
                        {job.method}
                      </Badge>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap text-slate-300">
                      {formatDate(job.inspectionDate)}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-200">
                      {inspector?.fullName || '—'}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <Badge variant="status" value={job.status} size="sm">
                        {job.status}
                      </Badge>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
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

                    <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="inline-flex items-center gap-1.5">
                        {job.status === 'Completed' && (
                          <button
                            type="button"
                            onClick={() => setPreviewReportJob(job)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 text-xs font-bold border border-emerald-500/30 transition-all"
                          >
                            PDF
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Job Creator Modal — remount on each open so job number regenerates */}
      <JobFormModal
        key={isCreateJobOpen ? 'create-open' : 'create-closed'}
        isOpen={isCreateJobOpen}
        onClose={() => setIsCreateJobOpen(false)}
        onJobCreated={(newJob) => {
          onJobUpdated(newJob);
          setIsCreateJobOpen(false);
        }}
        customers={customers}
        inspectors={inspectors}
        equipment={equipment}
        procedures={procedures}
      />

      {/* PDF Report Modal */}
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
