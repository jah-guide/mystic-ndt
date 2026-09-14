import React, { useState, useEffect } from 'react';
import {
  Briefcase, CheckCircle2, Clock, Search, ChevronRight, Calendar,
  MapPin, UserCheck
} from 'lucide-react';
import { Job, Customer, Inspector, Equipment, CompanySettings } from '../../types';
import { Badge } from '../common/Badge';
import { formatDate } from '../../utils/formatters';
import { JobDetailView } from './JobDetailView';

interface TechnicianDashboardProps {
  jobs: Job[];
  customers: Customer[];
  inspectors: Inspector[];
  equipment: Equipment[];
  settings: CompanySettings;
  currentInspectorId: string;
  onJobUpdated: (updatedJob: Job) => void;
}

export const TechnicianDashboard: React.FC<TechnicianDashboardProps> = ({
  jobs,
  customers,
  inspectors,
  equipment,
  settings,
  currentInspectorId,
  onJobUpdated
}) => {
  const toSuperviseJobs = jobs.filter(
    j => j.supervisorId === currentInspectorId && j.status === 'Awaiting Supervisor'
  );
  const revisionJobs = jobs.filter(
    j => j.supervisorId === currentInspectorId && j.status === 'Revision Required'
  );

  const [activeTab, setActiveTab] = useState<'my_jobs' | 'to_supervise' | 'completed'>('my_jobs');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  useEffect(() => {
    setActiveTab(toSuperviseJobs.length > 0 ? 'to_supervise' : 'my_jobs');
  }, [currentInspectorId]);

  const currentInspector = inspectors.find(i => i.id === currentInspectorId);

  const myLeadJobs = jobs.filter(j => j.inspectorId === currentInspectorId);
  const activeJobs = myLeadJobs.filter(j => j.status !== 'Completed');
  const completedJobs = myLeadJobs.filter(j => j.status === 'Completed');

  const displayedJobs = (
    activeTab === 'my_jobs' ? activeJobs :
    activeTab === 'to_supervise' ? toSuperviseJobs :
    completedJobs
  ).filter(job => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const customer = customers.find(c => c.id === job.customerId);
    const site = customer?.sites.find(s => s.id === job.siteId);
    const lead = inspectors.find(i => i.id === job.inspectorId);

    return (
      job.jobNumber.toLowerCase().includes(query) ||
      (customer?.companyName.toLowerCase().includes(query)) ||
      (site?.name.toLowerCase().includes(query)) ||
      job.method.toLowerCase().includes(query) ||
      (lead?.fullName.toLowerCase().includes(query))
    );
  });

  const selectedJob = jobs.find(j => j.id === selectedJobId);

  const renderJobCard = (job: Job, isSuperviseCard: boolean) => {
    const customer = customers.find(c => c.id === job.customerId);
    const site = customer?.sites.find(s => s.id === job.siteId);
    const lead = inspectors.find(i => i.id === job.inspectorId);
    const queueTime = job.updatedAt || job.createdAt;

    return (
      <div
        key={job.id}
        onClick={() => setSelectedJobId(job.id)}
        className={`group bg-slate-900 border rounded-2xl p-4 sm:p-5 shadow-lg transition-all cursor-pointer active:scale-99 ${
          isSuperviseCard
            ? 'border-violet-500/40 hover:border-violet-400/60 hover:shadow-violet-500/10'
            : 'border-slate-800 hover:border-sky-500/50 hover:shadow-sky-500/5'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
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
              {job.status === 'Completed' && (
                <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                  job.overallResult === 'PASS'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : job.overallResult === 'FAIL'
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}>
                  {job.overallResult}
                </span>
              )}
            </div>

            <h3 className="font-bold text-sm text-slate-200">
              {customer?.companyName || 'Unknown Customer'}
            </h3>

            {isSuperviseCard && lead && (
              <p className="text-xs text-violet-300 mt-1 font-medium">
                Lead: {lead.fullName} — {job.status === 'Revision Required' ? 'revising after reject' : 'evaluate findings'}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-sky-400" />
                {site?.name || 'On Site'}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-sky-400" />
                {formatDate(job.inspectionDate)}
              </span>
              {isSuperviseCard && (
                <span className="text-slate-500">Updated {formatDate(queueTime.slice(0, 10))}</span>
              )}
              <span className="text-slate-300 font-medium">
                {job.items.length} item{job.items.length === 1 ? '' : 's'}
              </span>
            </div>

            {job.scope && (
              <p className="text-xs text-slate-400 mt-2 line-clamp-1">
                {job.scope}
              </p>
            )}
          </div>

          <div className={`self-center p-2 rounded-xl transition-all ${
            isSuperviseCard
              ? 'bg-violet-900/40 text-violet-300 group-hover:bg-violet-600 group-hover:text-white'
              : 'bg-slate-800 text-slate-400 group-hover:text-white group-hover:bg-sky-600'
          }`}>
            <ChevronRight className="w-5 h-5" />
          </div>
        </div>
      </div>
    );
  };

  if (selectedJob) {
    const customer = customers.find(c => c.id === selectedJob.customerId);
    const inspector = inspectors.find(i => i.id === selectedJob.inspectorId);
    const supervisor = inspectors.find(i => i.id === selectedJob.supervisorId);
    const equipmentList = equipment.filter(e => selectedJob.equipmentIds?.includes(e.id));

    return (
      <JobDetailView
        job={selectedJob}
        customer={customer}
        inspector={inspector}
        supervisor={supervisor}
        equipmentList={equipmentList}
        settings={settings}
        userRole="technician"
        viewerInspectorId={currentInspectorId}
        onBack={() => setSelectedJobId(null)}
        onJobUpdated={onJobUpdated}
      />
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-6 pb-24 pt-4">
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl mb-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-sky-400">
                {toSuperviseJobs.length > 0 ? 'Supervisor Home' : 'Technician Cockpit'}
              </span>
              {currentInspector?.level === 'Level 1' && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-violet-500/20 text-violet-300 border border-violet-500/30">
                  Level 1
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {currentInspector ? currentInspector.fullName : 'Field Inspector'}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Cert: {currentInspector?.certNumber || 'SAQCC'} • Qualified in{' '}
              <span className="text-slate-200 font-semibold">{currentInspector?.methods.join(', ') || '—'}</span>
            </p>
          </div>

          <div className="text-right space-y-1">
            <div>
              <span className="text-2xl sm:text-3xl font-black text-sky-400">{activeJobs.length}</span>
              <span className="text-[11px] uppercase font-bold text-slate-400 block">My Active</span>
            </div>
            {(toSuperviseJobs.length > 0 || revisionJobs.length > 0) && (
              <div>
                <span className="text-lg font-black text-violet-400">{toSuperviseJobs.length}</span>
                <span className="text-[10px] uppercase font-bold text-violet-300/80 block">To Supervise</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-3 mb-5">
        <div className="grid grid-cols-3 gap-1.5 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 shadow-inner">
          <button
            type="button"
            onClick={() => setActiveTab('my_jobs')}
            className={`py-2.5 px-2 rounded-xl font-bold text-[11px] sm:text-xs flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'my_jobs'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span>My Jobs ({activeJobs.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('to_supervise')}
            className={`py-2.5 px-2 rounded-xl font-bold text-[11px] sm:text-xs flex items-center justify-center gap-1.5 transition-all relative ${
              activeTab === 'to_supervise'
                ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5 shrink-0" />
            <span>Supervise ({toSuperviseJobs.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('completed')}
            className={`py-2.5 px-2 rounded-xl font-bold text-[11px] sm:text-xs flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'completed'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>Done ({completedJobs.length})</span>
          </button>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search job number, customer, site..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs sm:text-sm placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>
      </div>

      {activeTab === 'to_supervise' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-violet-300 mb-2">
              Awaiting your evaluation ({displayedJobs.length})
            </h2>
            {displayedJobs.length === 0 ? (
              <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 text-center text-slate-400">
                <UserCheck className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-300">Queue clear</p>
                <p className="text-xs text-slate-500 mt-1">No Level 1 jobs awaiting your evaluation.</p>
              </div>
            ) : (
              <div className="space-y-3">{displayedJobs.map(j => renderJobCard(j, true))}</div>
            )}
          </div>
          {revisionJobs.length > 0 && (
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-amber-300/90 mb-2">
                Revision in progress ({revisionJobs.length})
              </h2>
              <div className="space-y-3">{revisionJobs.map(j => renderJobCard(j, true))}</div>
            </div>
          )}
        </div>
      )}

      {activeTab !== 'to_supervise' && (
        displayedJobs.length === 0 ? (
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-8 text-center text-slate-400">
            <Briefcase className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <h3 className="font-bold text-sm text-slate-300">No jobs found</h3>
            <p className="text-xs text-slate-500 mt-1">
              {activeTab === 'my_jobs'
                ? 'No active jobs assigned to you right now.'
                : 'No completed inspection reports found.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">{displayedJobs.map(j => renderJobCard(j, false))}</div>
        )
      )}
    </div>
  );
};
