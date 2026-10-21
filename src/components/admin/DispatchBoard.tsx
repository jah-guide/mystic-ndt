import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Pencil,
  UserX
} from 'lucide-react';
import { Job, Customer, Inspector, Equipment, NdtProcedure, JobStatus } from '../../types';
import { validateInspectorEligibility } from '../../utils/validation';
import { formatDate } from '../../utils/formatters';
import { Badge } from '../common/Badge';
import { JobFormModal } from './JobFormModal';
import { todayKey, addDaysToKey } from '../common/DateField';

const OPEN: JobStatus[] = ['Assigned', 'In Progress', 'Awaiting Supervisor', 'Revision Required'];
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

interface DispatchBoardProps {
  jobs: Job[];
  customers: Customer[];
  inspectors: Inspector[];
  equipment: Equipment[];
  procedures: NdtProcedure[];
  onJobUpdated: () => void;
  onOpenJob: (jobId: string) => void;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Local YYYY-MM-DD (avoids UTC shift from toISOString). */
function toKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parseKey(key: string): Date {
  return new Date(key + 'T12:00:00');
}

function jobDateKey(job: Job): string {
  return (job.dueDate || job.inspectionDate || '').slice(0, 10);
}

/** Monday of the week containing `key` (local). */
function startOfWeekMonday(key: string): string {
  const d = parseKey(key);
  const day = d.getDay(); // 0 Sun … 6 Sat
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return toKey(d);
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

/** Monday-first month grid (leading/trailing days from adjacent months). */
function buildMonthGrid(month: Date): Date[] {
  const first = startOfMonth(month);
  const mondayOffset = (first.getDay() + 6) % 7;
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - mondayOffset);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });
}

type TrafficTone = 'emerald' | 'amber' | 'rose' | 'slate';

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
  const [weekStart, setWeekStart] = useState(() => startOfWeekMonday(todayKey()));
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(parseKey(todayKey())));
  const [monthOpen, setMonthOpen] = useState(false);

  const today = todayKey();
  const weekKeys = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDaysToKey(weekStart, i)),
    [weekStart]
  );
  const weekEnd = weekKeys[6];
  const weekContainsToday = weekKeys.includes(today);

  const monthAway =
    viewMonth.getFullYear() !== parseKey(today).getFullYear() ||
    viewMonth.getMonth() !== parseKey(today).getMonth();

  const grid = useMemo(() => buildMonthGrid(viewMonth), [viewMonth]);

  const openJobs = useMemo(() => jobs.filter(j => OPEN.includes(j.status)), [jobs]);
  const completedJobs = useMemo(() => jobs.filter(j => j.status === 'Completed'), [jobs]);

  const dayBuckets = useMemo(() => {
    const map: Record<string, { upcoming: Job[]; completed: Job[] }> = {};
    const ensure = (key: string) => {
      if (!map[key]) map[key] = { upcoming: [], completed: [] };
      return map[key];
    };
    for (const job of openJobs) {
      const key = jobDateKey(job);
      if (key) ensure(key).upcoming.push(job);
    }
    for (const job of completedJobs) {
      const key = jobDateKey(job);
      if (key) ensure(key).completed.push(job);
    }
    return map;
  }, [openJobs, completedJobs]);

  const overdueJobs = useMemo(
    () =>
      openJobs.filter(j => {
        const key = jobDateKey(j);
        return Boolean(key) && key < today;
      }),
    [openJobs, today]
  );

  const unassignedJobs = useMemo(
    () => openJobs.filter(j => !j.inspectorId),
    [openJobs]
  );

  const goToday = () => {
    const t = todayKey();
    setWeekStart(startOfWeekMonday(t));
    setViewMonth(startOfMonth(parseKey(t)));
  };

  const shiftWeek = (delta: number) => {
    setWeekStart(ws => addDaysToKey(ws, delta * 7));
  };

  const jumpToDay = (key: string) => {
    setWeekStart(startOfWeekMonday(key));
    setViewMonth(startOfMonth(parseKey(key)));
  };

  const traffic = (job: Job): { tone: TrafficTone; label: string } => {
    const lead = inspectors.find(i => i.id === job.inspectorId);
    if (!lead) return { tone: 'slate', label: 'Unassigned' };
    const elig = validateInspectorEligibility(lead, job.method);
    if (elig.blocked) return { tone: 'rose', label: elig.reason };
    if (elig.warning) return { tone: 'amber', label: elig.reason };
    return { tone: 'emerald', label: elig.reason };
  };

  const toneClass: Record<TrafficTone, string> = {
    emerald: 'border-emerald-500/40 bg-emerald-950/20',
    amber: 'border-amber-500/40 bg-amber-950/20',
    rose: 'border-rose-500/40 bg-rose-950/20',
    slate: 'border-slate-700 bg-slate-950/40'
  };

  const monthLabel = viewMonth.toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' });
  const weekRangeLabel = `${parseKey(weekStart).toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short'
  })} – ${parseKey(weekEnd).toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })}`;

  const renderJobCard = (job: Job, kind: 'upcoming' | 'completed') => {
    const t = traffic(job);
    const lead = inspectors.find(i => i.id === job.inspectorId);
    const cust = customers.find(c => c.id === job.customerId);
    const completed = kind === 'completed';

    return (
      <div
        key={job.id}
        className={`w-full text-left rounded-xl border p-2.5 transition-colors ${
          completed
            ? 'border-slate-700/80 bg-slate-950/50 opacity-70'
            : toneClass[t.tone]
        }`}
      >
        <button
          type="button"
          onClick={() => onOpenJob(job.id)}
          className="w-full text-left hover:ring-1 hover:ring-sky-500/40 rounded-lg -m-0.5 p-0.5 transition-shadow"
          title="Open job cockpit"
        >
          <div className="flex items-center justify-between gap-1">
            <span className="text-[11px] font-black text-white truncate">{job.jobNumber}</span>
            <div className="flex items-center gap-1 shrink-0">
              {completed && <CheckCircle2 className="w-3 h-3 text-emerald-500/80" />}
              <Badge variant="method" value={job.method} size="sm">{job.method}</Badge>
            </div>
          </div>
          <div className="text-[10px] text-slate-400 mt-1 truncate">{cust?.companyName || '—'}</div>
          <div className="text-[10px] text-slate-300 mt-0.5 truncate">
            {lead?.fullName || 'Unassigned'} · {job.status}
            {job.overallResult && job.overallResult !== 'PENDING' ? ` · ${job.overallResult}` : ''}
          </div>
          {!completed && (
            <div className="mt-1.5">
              <span
                className={`text-[9px] font-bold uppercase ${
                  t.tone === 'emerald'
                    ? 'text-emerald-400'
                    : t.tone === 'amber'
                    ? 'text-amber-400'
                    : t.tone === 'rose'
                    ? 'text-rose-400'
                    : 'text-slate-500'
                }`}
              >
                {t.tone === 'emerald'
                  ? 'OK'
                  : t.tone === 'amber'
                  ? 'Warn'
                  : t.tone === 'rose'
                  ? 'Blocked'
                  : 'Open'}
              </span>
            </div>
          )}
        </button>

        {!completed && (
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              setEditingJob(job);
            }}
            className="mt-2 w-full inline-flex items-center justify-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold text-slate-300 bg-slate-900/60 border border-slate-700/80 hover:border-sky-500/40 hover:text-sky-300 transition-colors"
            title="Edit assignment"
          >
            <Pencil className="w-3 h-3" />
            Edit assign
          </button>
        )}
      </div>
    );
  };

  const renderCalloutJob = (job: Job, reason: 'overdue' | 'unassigned') => {
    const cust = customers.find(c => c.id === job.customerId);
    const key = jobDateKey(job);
    return (
      <button
        key={`${reason}-${job.id}`}
        type="button"
        onClick={() => onOpenJob(job.id)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-950/50 border border-slate-700/80 text-slate-200 hover:border-sky-500/40 hover:text-white transition-colors max-w-full"
        title={reason === 'overdue' ? `Due ${formatDate(key)}` : 'Unassigned'}
      >
        <Badge variant="method" value={job.method} size="sm">{job.method}</Badge>
        <span className="truncate">{job.jobNumber}</span>
        <span className="text-slate-500 font-medium truncate hidden sm:inline">
          {cust?.companyName || '—'}
        </span>
      </button>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Dispatch</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Week board by due / inspection date. Click a card for cockpit; Edit assign for lead &amp; schedule.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setMonthOpen(o => !o)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold text-slate-300 bg-slate-900/70 border border-slate-700 hover:border-sky-500/40 hover:text-sky-300 transition-colors"
        >
          <Calendar className="w-3.5 h-3.5" />
          {monthOpen ? 'Hide month' : 'Month navigator'}
        </button>
      </div>

      {/* Overdue + unassigned strip */}
      {(overdueJobs.length > 0 || unassignedJobs.length > 0) && (
        <div className="rounded-2xl border border-amber-500/25 bg-amber-950/15 p-3 sm:p-4 space-y-3">
          {overdueJobs.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <h2 className="text-[11px] font-black uppercase tracking-wider text-amber-300">
                  Overdue · {overdueJobs.length}
                </h2>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {overdueJobs.map(j => renderCalloutJob(j, 'overdue'))}
              </div>
            </div>
          )}
          {unassignedJobs.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <UserX className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <h2 className="text-[11px] font-black uppercase tracking-wider text-rose-300">
                  Unassigned · {unassignedJobs.length}
                </h2>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {unassignedJobs.map(j => renderCalloutJob(j, 'unassigned'))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Collapsible month navigator */}
      {monthOpen && (
        <div
          className={`w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/70 p-4 transition-opacity ${
            monthAway ? 'opacity-80' : 'opacity-100'
          }`}
        >
          <div className="flex items-center justify-between gap-2 mb-3">
            <button
              type="button"
              onClick={() => setViewMonth(m => addMonths(m, -1))}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="text-center min-w-0">
              <div className="text-sm font-black text-white capitalize">{monthLabel}</div>
              {monthAway && (
                <button
                  type="button"
                  onClick={goToday}
                  className="text-[10px] font-bold text-sky-400 hover:text-sky-300 mt-0.5"
                >
                  Jump to this month
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => setViewMonth(m => addMonths(m, 1))}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAYS.map(d => (
              <div key={d} className="text-center text-[10px] font-bold uppercase text-slate-600 py-1">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {grid.map(d => {
              const key = toKey(d);
              const inMonth = d.getMonth() === viewMonth.getMonth();
              const isToday = key === today;
              const inWeek = weekKeys.includes(key);
              const bucket = dayBuckets[key];
              const up = bucket?.upcoming.length || 0;
              const done = bucket?.completed.length || 0;

              return (
                <button
                  key={key + (inMonth ? '' : '-adj')}
                  type="button"
                  onClick={() => jumpToDay(key)}
                  className={`relative aspect-square rounded-xl text-xs font-bold transition-colors flex flex-col items-center justify-center gap-0.5 ${
                    inWeek
                      ? 'bg-sky-600/80 text-white ring-1 ring-sky-400/50'
                      : isToday
                      ? 'bg-sky-950/50 text-sky-200 border border-sky-500/40'
                      : inMonth
                      ? 'text-slate-200 hover:bg-slate-800'
                      : 'text-slate-600 hover:bg-slate-900/80'
                  }`}
                >
                  <span>{d.getDate()}</span>
                  {(up > 0 || done > 0) && (
                    <span className="flex items-center gap-0.5 h-1.5">
                      {up > 0 && (
                        <span
                          className={`rounded-full ${inWeek ? 'bg-white' : 'bg-sky-400'} ${
                            up > 1 ? 'w-2 h-1.5' : 'w-1.5 h-1.5'
                          }`}
                          title={`${up} upcoming`}
                        />
                      )}
                      {done > 0 && (
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            inWeek ? 'bg-emerald-200' : 'bg-emerald-600/80'
                          }`}
                          title={`${done} completed`}
                        />
                      )}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Week board */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => shiftWeek(-1)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Previous week"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="text-sm font-black text-white">{weekRangeLabel}</div>
              <div className="text-[10px] text-slate-500 font-mono">
                Mon–Sun · {formatDate(weekStart)}
              </div>
            </div>
            <button
              type="button"
              onClick={() => shiftWeek(1)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Next week"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            {!weekContainsToday && (
              <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wide bg-slate-800 text-slate-400 border border-slate-700">
                Not this week
              </span>
            )}
            <button
              type="button"
              onClick={goToday}
              className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-sky-600/20 text-sky-300 border border-sky-500/30 hover:bg-sky-600/30"
            >
              This week
            </button>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 -mx-0.5 px-0.5">
          {weekKeys.map((key, i) => {
            const isToday = key === today;
            const bucket = dayBuckets[key] || { upcoming: [], completed: [] };
            const dayDate = parseKey(key);

            return (
              <div
                key={key}
                className={`flex-shrink-0 w-[9.5rem] sm:w-[10.5rem] rounded-xl border p-2 min-h-[12rem] flex flex-col ${
                  isToday
                    ? 'border-sky-500/50 bg-sky-950/30 ring-1 ring-sky-500/30'
                    : 'border-slate-800/80 bg-slate-950/40'
                }`}
              >
                <div className="flex items-center justify-between mb-2 px-0.5">
                  <div>
                    <div
                      className={`text-[10px] font-black uppercase tracking-wide ${
                        isToday ? 'text-sky-300' : 'text-slate-500'
                      }`}
                    >
                      {WEEKDAYS[i]}
                    </div>
                    <div className={`text-sm font-black ${isToday ? 'text-white' : 'text-slate-200'}`}>
                      {dayDate.getDate()}
                    </div>
                  </div>
                  {isToday && (
                    <span className="text-[9px] font-bold uppercase text-sky-400 bg-sky-600/20 px-1.5 py-0.5 rounded">
                      Today
                    </span>
                  )}
                </div>

                <div className="space-y-1.5 flex-1">
                  {bucket.upcoming.length === 0 && bucket.completed.length === 0 && (
                    <p className="text-[10px] text-slate-600 text-center py-4 border border-dashed border-slate-800/80 rounded-lg">
                      —
                    </p>
                  )}
                  {bucket.upcoming.map(job => renderJobCard(job, 'upcoming'))}
                  {bucket.completed.map(job => renderJobCard(job, 'completed'))}
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-[11px] text-slate-500 mt-3">
          Open jobs keep eligibility colours. Drafts are excluded. Completed cards are muted.
        </p>
      </div>

      {editingJob && (
        <JobFormModal
          key={editingJob.id}
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
