import React, { useState } from 'react';
import { 
  Briefcase, CheckCircle2, Clock, AlertTriangle, AlertCircle, 
  Plus, Users, Wrench, FileText, ArrowUpRight, ShieldAlert, Sparkles 
} from 'lucide-react';
import { Job, Customer, Inspector, Equipment, CompanySettings, NdtProcedure } from '../../types';
import { Badge } from '../common/Badge';
import { formatDate } from '../../utils/formatters';
import { checkExpiry } from '../../utils/validation';
import { JobFormModal } from './JobFormModal';
import { ReportViewModal } from '../reports/ReportViewModal';

interface AdminDashboardProps {
  jobs: Job[];
  customers: Customer[];
  inspectors: Inspector[];
  equipment: Equipment[];
  procedures: NdtProcedure[];
  settings: CompanySettings;
  onNavigateToTab: (tab: string) => void;
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

  // Expiring inspector certs & equipment calibrations
  const certWarnings = inspectors
    .map(i => ({ inspector: i, expiry: checkExpiry(i.certExpiryDate) }))
    .filter(item => item.expiry.status !== 'valid');

  const calWarnings = equipment
    .map(e => ({ equipment: e, expiry: checkExpiry(e.calibrationExpiryDate) }))
    .filter(item => item.expiry.status !== 'valid');

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

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        {/* Card 1: Open Jobs */}
        <div 
          onClick={() => onNavigateToTab('jobs')}
          className="bg-slate-900 border border-slate-800 hover:border-sky-500/40 p-4 sm:p-5 rounded-2xl shadow-lg transition-all cursor-pointer group"
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
        </div>

        {/* Card 2: Completed This Month */}
        <div 
          onClick={() => onNavigateToTab('jobs')}
          className="bg-slate-900 border border-slate-800 hover:border-emerald-500/40 p-4 sm:p-5 rounded-2xl shadow-lg transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Completed Month</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">{completedThisMonth.length}</div>
          <p className="text-[11px] text-slate-400 mt-1">Official reports dispatched</p>
        </div>

        {/* Card 3: In Progress / Awaiting Completion */}
        <div 
          onClick={() => onNavigateToTab('jobs')}
          className="bg-slate-900 border border-slate-800 hover:border-amber-500/40 p-4 sm:p-5 rounded-2xl shadow-lg transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Awaiting Sign-off</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">{awaitingCompletion.length}</div>
          <p className="text-[11px] text-slate-400 mt-1">Active on technician phones</p>
        </div>

        {/* Card 4: Clients & Assets */}
        <div 
          onClick={() => onNavigateToTab('customers')}
          className="bg-slate-900 border border-slate-800 hover:border-purple-500/40 p-4 sm:p-5 rounded-2xl shadow-lg transition-all cursor-pointer group"
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
        </div>

      </div>

      {/* Critical Warnings: Inspector Certification & Equipment Calibration Expiry */}
      {(certWarnings.length > 0 || calWarnings.length > 0) && (
        <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-4 sm:p-5 shadow-xl">
          <div className="flex items-center gap-2 text-amber-400 font-extrabold text-sm mb-3">
            <ShieldAlert className="w-5 h-5" />
            <span>Compliance & Calibration Alerts</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {/* Inspector Certifications */}
            {certWarnings.map(({ inspector, expiry }) => (
              <div 
                key={inspector.id} 
                onClick={() => onNavigateToTab('inspectors')}
                className="bg-slate-950/80 p-3 rounded-xl border border-amber-500/30 flex items-center justify-between hover:bg-slate-950 transition-colors cursor-pointer"
              >
                <div>
                  <div className="font-bold text-white flex items-center gap-2">
                    <span>{inspector.fullName}</span>
                    <span className="text-[10px] text-slate-400">({inspector.certNumber})</span>
                  </div>
                  <div className="text-slate-400 text-[11px] mt-0.5">
                    Methods: {inspector.methods.join(', ')}
                  </div>
                </div>

                <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                  expiry.status === 'expired'
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}>
                  {expiry.formattedText}
                </span>
              </div>
            ))}

            {/* Equipment Calibrations */}
            {calWarnings.map(({ equipment, expiry }) => (
              <div 
                key={equipment.id} 
                onClick={() => onNavigateToTab('equipment')}
                className="bg-slate-950/80 p-3 rounded-xl border border-amber-500/30 flex items-center justify-between hover:bg-slate-950 transition-colors cursor-pointer"
              >
                <div>
                  <div className="font-bold text-white flex items-center gap-2">
                    <span>{equipment.name}</span>
                    <span className="text-[10px] text-slate-400">[{equipment.serialNumber}]</span>
                  </div>
                  <div className="text-slate-400 text-[11px] mt-0.5">
                    Type: {equipment.type}
                  </div>
                </div>

                <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                  expiry.status === 'expired'
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}>
                  {expiry.formattedText}
                </span>
              </div>
            ))}
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
                  <tr key={job.id} className="hover:bg-slate-800/40 transition-colors">
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

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onOpenJobDetail(job)}
                          className="px-2.5 py-1 rounded-lg bg-sky-600/20 hover:bg-sky-600/40 text-sky-300 text-xs font-bold border border-sky-500/30 transition-all"
                        >
                          Inspect
                        </button>
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

      {/* Quick Job Creator Modal */}
      <JobFormModal
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
