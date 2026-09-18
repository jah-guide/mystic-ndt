import React, { useMemo, useState } from 'react';
import { Calendar, ChevronRight } from 'lucide-react';
import { Job, Customer, Inspector, Equipment, NdtProcedure, JobStatus } from '../../types';
import { validateInspectorEligibility } from '../../utils/validation';
import { formatDate } from '../../utils/formatters';
import { Badge } from '../common/Badge';
import { JobFormModal } from './JobFormModal';

const OPEN: JobStatus[] = ['Assigned', 'In Progress', 'Awaiting Supervisor', 'Revision Required'];

interface DispatchBoardProps {
  jobs: Job[];
  customers: Customer[];
  inspectors: Inspector[];
  equipment: Equipment[];
  procedures: NdtProcedure[];
  onJobUpdated: () => void;
  onOpenJob: (jobId: string) => void;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function toKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export const DispatchBoard: React.FC<DispatchBoardProps> = ({
  jobs,
  customers,
  inspectors,
  equipment,
  procedures,
  onJobUpdated,
  onOpenJob
}) => {
  const [editingJob, setEditingJob] = useState<Job | undefined>(undefined);
  const days = useMemo(() => {
    const today = startOfDay(new Date());
    return Array.from({ length: 7 }, (_, i) => addDays(today, i));
  }, []);

  const openJobs = jobs.filter(j => OPEN.includes(j.status));
  const firstKey = toKey(days[0]);
  const lastKey = toKey(days[6]);

  const byDay = useMemo(() => {
    const map: Record<string, Job[]> = {};
    for (const d of days) map[toKey(d)] = [];
    for (const job of openJobs) {
      const key = (job.dueDate || job.inspectionDate || '').slice(0, 10);
      if (map[key]) {
        map[key].push(job);
      } else if (key && key < firstKey) {
        map[firstKey].push(job);
      } else if (key && key > lastKey) {
        map[lastKey].push(job);
      } else if (!key) {
        map[firstKey].push(job);
      }
    }
    return map;
  }, [openJobs, days, firstKey, lastKey]);

  const traffic = (job: Job) => {
    const lead = inspectors.find(i => i.id === job.inspectorId);
    if (!lead) return { tone: 'slate' as const, label: 'Unassigned' };
    const elig = validateInspectorEligibility(lead, job.method);
    if (elig.blocked) return { tone: 'rose' as const, label: elig.reason };
    if (elig.warning) return { tone: 'amber' as const, label: elig.reason };
    return { tone: 'emerald' as const, label: elig.reason };
  };

  const toneClass = {
    emerald: 'border-emerald-500/40 bg-emerald-950/20',
    amber: 'border-amber-500/40 bg-amber-950/20',
    rose: 'border-rose-500/40 bg-rose-950/20',
    slate: 'border-slate-700 bg-slate-950/40'
  };

  const todayKey = toKey(startOfDay(new Date()));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Dispatch</h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Next 7 days — open jobs by due / inspection date. Colours follow lead eligibility (method + vision).
        </p>
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="flex gap-3 min-w-[880px]">
          {days.map(d => {
            const key = toKey(d);
            const dayJobs = byDay[key] || [];
            const isToday = key === todayKey;
            return (
              <div key={key} className={`flex-1 min-w-[120px] rounded-2xl border p-3 ${
                isToday ? 'border-sky-500/50 bg-sky-950/20' : 'border-slate-800 bg-slate-900/60'
              }`}>
                <div className="flex items-center gap-1.5 mb-3">
                  <Calendar className="w-3.5 h-3.5 text-sky-400" />
                  <div>
                    <div className="text-[10px] font-bold uppercase text-slate-500">
                      {d.toLocaleDateString('en-ZA', { weekday: 'short' })}
                    </div>
                    <div className="text-sm font-black text-white">{formatDate(key)}</div>
                  </div>
                </div>
                <div className="space-y-2">
                  {dayJobs.length === 0 && (
                    <p className="text-[10px] text-slate-600 font-medium py-4 text-center">—</p>
                  )}
                  {dayJobs.map(job => {
                    const t = traffic(job);
                    const lead = inspectors.find(i => i.id === job.inspectorId);
                    const cust = customers.find(c => c.id === job.customerId);
                    return (
                      <button
                        key={job.id}
                        type="button"
                        onClick={() => setEditingJob(job)}
                        onDoubleClick={() => onOpenJob(job.id)}
                        className={`w-full text-left rounded-xl border p-2.5 transition-colors hover:ring-1 hover:ring-sky-500/40 ${toneClass[t.tone]}`}
                        title={`${t.label} · Double-click for cockpit`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[11px] font-black text-white truncate">{job.jobNumber}</span>
                          <Badge variant="method" value={job.method} size="sm">{job.method}</Badge>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1 truncate">{cust?.companyName || '—'}</div>
                        <div className="text-[10px] text-slate-300 mt-0.5 truncate">
                          {lead?.fullName || 'Unassigned'} · {job.status}
                        </div>
                        <div className="flex items-center justify-between mt-1.5">
                          <span className={`text-[9px] font-bold uppercase ${
                            t.tone === 'emerald' ? 'text-emerald-400' : t.tone === 'amber' ? 'text-amber-400' : t.tone === 'rose' ? 'text-rose-400' : 'text-slate-500'
                          }`}>
                            {t.tone === 'emerald' ? 'OK' : t.tone === 'amber' ? 'Warn' : t.tone === 'rose' ? 'Blocked' : 'Open'}
                          </span>
                          <ChevronRight className="w-3 h-3 text-slate-500" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-xs text-slate-500">
        Click a job to edit assignment (same eligibility gates as Job Form). Double-click opens the inspection cockpit.
      </p>

      {editingJob && (
        <JobFormModal
          isOpen={Boolean(editingJob)}
          onClose={() => setEditingJob(undefined)}
          onJobCreated={() => {
            setEditingJob(undefined);
            onJobUpdated();
          }}
          customers={customers}
          inspectors={inspectors}
          equipment={equipment}
          procedures={procedures}
          existingJob={editingJob}
        />
      )}
    </div>
  );
};
