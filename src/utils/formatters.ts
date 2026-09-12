export function formatDate(dateString?: string): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString?: string): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateString;
  }
}

export function getResultBadgeClass(result?: string): string {
  switch (result) {
    case 'PASS':
    case 'Pass':
      return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30';
    case 'FAIL':
    case 'Fail':
      return 'bg-rose-500/10 text-rose-400 border border-rose-500/30';
    case 'N/A':
      return 'bg-slate-700/50 text-slate-300 border border-slate-600/40';
    case 'PENDING':
    case 'Pending':
      return 'bg-amber-500/10 text-amber-400 border border-amber-500/30';
    default:
      return 'bg-amber-500/10 text-amber-400 border border-amber-500/30';
  }
}

export function getStatusBadgeClass(status?: string): string {
  switch (status) {
    case 'Completed':
      return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30';
    case 'Awaiting Supervisor':
      return 'bg-violet-500/10 text-violet-300 border border-violet-500/30';
    case 'Revision Required':
      return 'bg-rose-500/10 text-rose-300 border border-rose-500/30';
    case 'In Progress':
      return 'bg-sky-500/10 text-sky-400 border border-sky-500/30';
    case 'Assigned':
      return 'bg-amber-500/10 text-amber-400 border border-amber-500/30';
    case 'Draft':
    default:
      return 'bg-slate-700/50 text-slate-400 border border-slate-600/40';
  }
}

export function getMethodColor(method?: string): string {
  switch (method) {
    case 'UT':
      return 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30';
    case 'MT':
      return 'bg-purple-500/10 text-purple-400 border border-purple-500/30';
    case 'PT':
      return 'bg-rose-500/10 text-rose-400 border border-rose-500/30';
    case 'VT':
      return 'bg-amber-500/10 text-amber-400 border border-amber-500/30';
    default:
      return 'bg-slate-700/50 text-slate-400 border border-slate-600/40';
  }
}
