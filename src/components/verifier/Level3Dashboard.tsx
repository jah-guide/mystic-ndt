import React, { useState } from 'react';
import { 
  Award, CheckCircle2, XCircle, Clock, Search, FileText, 
  ShieldCheck, AlertTriangle, Eye, BookOpen
} from 'lucide-react';
import { Job, Customer, Inspector, Equipment, CompanySettings, NdtProcedure } from '../../types';
import { Badge } from '../common/Badge';
import { formatDate } from '../../utils/formatters';
import { Level3ReviewModal } from './Level3ReviewModal';
import { ReportViewModal } from '../reports/ReportViewModal';
import { JobDetailView } from '../technician/JobDetailView';
import { ProcedureManagement } from './ProcedureManagement';

interface Level3DashboardProps {
  jobs: Job[];
  customers: Customer[];
  inspectors: Inspector[];
  equipment: Equipment[];
  procedures: NdtProcedure[];
  settings: CompanySettings;
  onJobUpdated: (job: Job) => void;
  onProceduresUpdated: () => void;
}

export const Level3Dashboard: React.FC<Level3DashboardProps> = ({
  jobs, customers, inspectors, equipment, procedures, settings, onJobUpdated, onProceduresUpdated
}) => {
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'all' | 'procedures'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [reviewingJob, setReviewingJob] = useState<Job | undefined>(undefined);
  const [previewReportJob, setPreviewReportJob] = useState<Job | undefined>(undefined);
  const [inspectingJob, setInspectingJob] = useState<Job | undefined>(undefined);

  // The L3 verifier is the first Level 3 inspector in the list
  const l3Inspector = inspectors.find(i => i.level === 'Level 3') || inspectors[0];

  const pendingJobs = jobs.filter(j => j.status === 'Completed' && j.l3ReviewStatus !== 'APPROVED');
  const approvedJobs = jobs.filter(j => j.l3ReviewStatus === 'APPROVED');

  const displayedJobs = (
    activeTab === 'pending' ? pendingJobs :
    activeTab === 'approved' ? approvedJobs : jobs
  ).filter(job => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const cust = customers.find(c => c.id === job.customerId);
    const insp = inspectors.find(i => i.id === job.inspectorId);
    return (
      job.jobNumber.toLowerCase().includes(q) ||
      (cust?.companyName.toLowerCase().includes(q)) ||
      (insp?.fullName.toLowerCase().includes(q)) ||
      job.method.toLowerCase().includes(q)
    );
  });

  if (inspectingJob) {
    return (
      <JobDetailView
        job={inspectingJob}
        customer={customers.find(c => c.id === inspectingJob.customerId)}
        inspector={inspectors.find(i => i.id === inspectingJob.inspectorId)}
        supervisor={inspectors.find(i => i.id === inspectingJob.supervisorId)}
        equipmentList={equipment.filter(e => inspectingJob.equipmentIds?.includes(e.id))}
        settings={settings}
        userRole="l3_verifier"
        onBack={() => setInspectingJob(undefined)}
        onJobUpdated={(updated) => { onJobUpdated(updated); setInspectingJob(updated); }}
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 pt-2">

      {/* Top QA Authority Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/40 border border-amber-500/30 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Level 3 Technical Authority & Quality Assurance</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30">ISO 9712 / ASNT</span>
            </div>
            <h1 className="text-2xl font-black text-white mt-1">
              {l3Inspector?.fullName || 'Level 3 QA Verifier'}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Cert: <span className="font-mono text-slate-200">{l3Inspector?.certNumber || '—'}</span> • Procedure approval, QA verification & multi-sign certification
            </p>
          </div>
          <div className="flex items-center gap-3 bg-slate-950/80 px-4 py-3 rounded-xl border border-amber-500/20 self-start sm:self-auto">
            <Clock className="w-5 h-5 text-amber-400" />
            <div>
              <div className="text-xl font-black text-amber-400">{pendingJobs.length}</div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Awaiting Sign-off</div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="grid grid-cols-4 gap-2 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 shadow-inner">
        <button type="button" onClick={() => setActiveTab('pending')}
          className={`py-2.5 px-2 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'pending' ? 'bg-amber-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
          }`}>
          <Clock className="w-4 h-4" />
          <span>Pending ({pendingJobs.length})</span>
        </button>
        <button type="button" onClick={() => setActiveTab('approved')}
          className={`py-2.5 px-2 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'approved' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
          }`}>
          <CheckCircle2 className="w-4 h-4" />
          <span>Certified ({approvedJobs.length})</span>
        </button>
        <button type="button" onClick={() => setActiveTab('all')}
          className={`py-2.5 px-2 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'all' ? 'bg-sky-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
          }`}>
          <FileText className="w-4 h-4" />
          <span>All ({jobs.length})</span>
        </button>
        <button type="button" onClick={() => setActiveTab('procedures')}
          className={`py-2.5 px-2 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'procedures' ? 'bg-amber-700 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
          }`}>
          <BookOpen className="w-4 h-4" />
          <span>WEPs ({procedures.filter(p => p.status === 'Active').length})</span>
        </button>
      </div>

      {/* Procedures Tab */}
      {activeTab === 'procedures' && l3Inspector && (
        <ProcedureManagement
          procedures={procedures}
          l3Inspector={l3Inspector}
          onProceduresUpdated={onProceduresUpdated}
        />
      )}

      {/* Jobs Tabs */}
      {activeTab !== 'procedures' && (
        <>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by Job #, Client, Inspector, Method..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs sm:text-sm placeholder:text-slate-500 focus:outline-none focus:border-amber-500" />
          </div>

          {displayedJobs.length === 0 ? (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-10 text-center text-slate-400">
              <Award className="w-12 h-12 text-slate-600 mx-auto mb-2" />
              <h3 className="font-bold text-sm text-slate-300">No reports found in this view</h3>
              <p className="text-xs text-slate-500 mt-1">
                {activeTab === 'pending' ? 'All submitted field inspection reports have been reviewed and certified.' : 'No matching records.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {displayedJobs.map(job => {
                const customer = customers.find(c => c.id === job.customerId);
                const site = customer?.sites.find(s => s.id === job.siteId);
                const inspector = inspectors.find(i => i.id === job.inspectorId);
                const supervisor = inspectors.find(i => i.id === job.supervisorId);
                const isApproved = job.l3ReviewStatus === 'APPROVED';

                return (
                  <div key={job.id}
                    className={`bg-slate-900 border rounded-2xl p-4 sm:p-5 shadow-xl transition-all ${
                      isApproved ? 'border-slate-800 hover:border-emerald-500/40' : 'border-amber-500/40 bg-gradient-to-r from-amber-950/15 to-slate-900'
                    }`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-black text-base text-white font-mono">{job.jobNumber}</span>
                          <Badge variant="method" value={job.method} size="sm">{job.method}</Badge>
                          <span className={`px-2 py-0.5 rounded text-[11px] font-black ${
                            job.overallResult === 'PASS' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                            : job.overallResult === 'FAIL' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                            : 'bg-slate-700 text-slate-400 border border-slate-600'
                          }`}>{job.overallResult}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold flex items-center gap-1 ${
                            isApproved ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse'
                          }`}>
                            {isApproved ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                            <span>{isApproved ? 'L3 CERTIFIED' : 'AWAITING L3 REVIEW'}</span>
                          </span>
                          {job.supervisorId && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30">L1 SUPERVISED</span>
                          )}
                        </div>
                        <h3 className="font-bold text-sm text-slate-200">{customer?.companyName} • {site?.name}</h3>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-slate-400">
                          <span>Inspector: <strong className="text-slate-300">{inspector?.fullName} ({inspector?.certNumber})</strong></span>
                          {supervisor && <span>Supervisor: <strong className="text-violet-300">{supervisor.fullName}</strong></span>}
                          <span>Items: <strong className="text-slate-300">{job.items.length}</strong></span>
                          <span>Date: <strong className="text-slate-300">{formatDate(job.inspectionDate)}</strong></span>
                        </div>
                        {job.l3RejectionReason && (
                          <div className="mt-2 text-xs text-rose-300 bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
                            <strong>Previous Revision Request:</strong> {job.l3RejectionReason}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button type="button" onClick={() => setInspectingJob(job)}
                          className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition-colors">
                          <Eye className="w-3.5 h-3.5" />
                          <span>Inspect Data</span>
                        </button>
                        <button type="button" onClick={() => setReviewingJob(job)}
                          className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-500 hover:to-orange-400 text-white text-xs font-bold shadow-lg shadow-amber-600/25 flex items-center gap-1.5 active:scale-95 transition-all">
                          <Award className="w-3.5 h-3.5" />
                          <span>{isApproved ? 'Update L3 Sign-Off' : 'Perform L3 Sign-Off'}</span>
                        </button>
                        <button type="button" onClick={() => setPreviewReportJob(job)}
                          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 transition-colors" title="Preview PDF Certificate">
                          <FileText className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {reviewingJob && (
        <Level3ReviewModal
          key={`${reviewingJob.id}-open`}
          isOpen={Boolean(reviewingJob)}
          onClose={() => setReviewingJob(undefined)}
          job={reviewingJob}
          customer={customers.find(c => c.id === reviewingJob.customerId)}
          inspector={inspectors.find(i => i.id === reviewingJob.inspectorId)}
          equipmentList={equipment.filter(e => reviewingJob.equipmentIds?.includes(e.id))}
          onJobUpdated={(up) => { onJobUpdated(up); setReviewingJob(undefined); }}
        />
      )}

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
