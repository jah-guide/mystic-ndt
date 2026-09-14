import React, { useState } from 'react';
import { 
  Briefcase, Plus, Search, Filter, FileText, Edit3, Trash2, 
  Calendar, UserCheck, ShieldCheck, CheckCircle2, ChevronRight
} from 'lucide-react';
import { Job, Customer, Inspector, Equipment, CompanySettings, NdtMethod, JobStatus, NdtProcedure } from '../../types';
import { Badge } from '../common/Badge';
import { formatDate } from '../../utils/formatters';
import { JobFormModal } from './JobFormModal';
import { ReportViewModal } from '../reports/ReportViewModal';
import { StorageService } from '../../services/storage';

interface JobListProps {
  jobs: Job[];
  customers: Customer[];
  inspectors: Inspector[];
  equipment: Equipment[];
  procedures: NdtProcedure[];
  settings: CompanySettings;
  onJobUpdated: (job: Job) => void;
  onOpenJobDetail: (job: Job) => void;
}

export const JobList: React.FC<JobListProps> = ({
  jobs,
  customers,
  inspectors,
  equipment,
  procedures,
  settings,
  onJobUpdated,
  onOpenJobDetail
}) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | undefined>(undefined);
  const [previewReportJob, setPreviewReportJob] = useState<Job | undefined>(undefined);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [methodFilter, setMethodFilter] = useState<string>('ALL');
  const [inspectorFilter, setInspectorFilter] = useState<string>('ALL');
  const [customerFilter, setCustomerFilter] = useState<string>('ALL');

  const filteredJobs = jobs.filter(job => {
    if (statusFilter !== 'ALL' && job.status !== statusFilter) return false;
    if (methodFilter !== 'ALL' && job.method !== methodFilter) return false;
    if (inspectorFilter !== 'ALL' && job.inspectorId !== inspectorFilter) return false;
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
  });

  const handleDeleteJob = (jobId: string) => {
    if (!confirm('Are you sure you want to delete this inspection job?')) return;
    StorageService.deleteJob(jobId);
    window.dispatchEvent(new Event('ndt_data_updated'));
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header & New Job Action */}
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

      {/* Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          
          {/* Search */}
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

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs sm:text-sm text-slate-300 focus:outline-none focus:border-sky-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="Assigned">Assigned</option>
              <option value="In Progress">In Progress</option>
              <option value="Awaiting Supervisor">Awaiting Supervisor</option>
              <option value="Revision Required">Revision Required</option>
              <option value="Completed">Completed</option>
            </select>
          </div>

          {/* Method Filter */}
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

          {/* Customer Filter */}
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

        </div>
      </div>

      {/* Jobs Table & Cards */}
      {filteredJobs.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
          <Briefcase className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="font-bold text-base text-slate-200">No inspection jobs found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto mb-4">
            Try adjusting your search criteria or click below to create a new inspection job.
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
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
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
                      className="hover:bg-slate-800/40 transition-colors cursor-pointer"
                      onClick={() => onOpenJobDetail(job)}
                    >
                      
                      {/* Job / Report */}
                      <td className="py-3.5 px-4">
                        <div className="font-black text-white font-mono">{job.jobNumber}</div>
                        {job.reportNumber && (
                          <span className="text-[10px] text-sky-400 font-mono font-medium block">
                            {job.reportNumber}
                          </span>
                        )}
                      </td>

                      {/* Customer & Site */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white">{customer?.companyName || '—'}</div>
                        <div className="text-slate-400 text-xs">{site?.name || 'On Site'}</div>
                      </td>

                      {/* Method */}
                      <td className="py-3.5 px-4">
                        <Badge variant="method" value={job.method} size="sm">
                          {job.method}
                        </Badge>
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-300">
                        {formatDate(job.inspectionDate)}
                      </td>

                      {/* Inspector */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-medium text-slate-200">{inspector?.fullName || '—'}</div>
                        <div className="text-[11px] text-slate-500">{inspector?.certNumber}</div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <Badge variant="status" value={job.status} size="sm">
                          {job.status}
                        </Badge>
                      </td>

                      {/* Result */}
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

                      {/* Actions — stopPropagation so edit/delete/PDF don't open cockpit */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex items-center gap-1.5">
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

                          <button
                            type="button"
                            onClick={() => {
                              setEditingJob(job);
                              setIsCreateModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                            title="Edit Job Details"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteJob(job.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            title="Delete Job"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      <JobFormModal
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

      {/* Report Modal */}
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
