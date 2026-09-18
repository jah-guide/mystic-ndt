import React, { useMemo, useState } from 'react';
import { AlertTriangle, ChevronRight, RefreshCw } from 'lucide-react';
import { Inspector, Equipment, MethodCertificate } from '../../types';
import { checkExpiry } from '../../utils/validation';
import { getVisionStatus } from '../../utils/visionAuthorization';
import { formatDate } from '../../utils/formatters';

type RowType = 'cert' | 'equipment' | 'vision';
type StatusFilter = 'ALL' | 'expired' | 'expiring_soon' | 'pending';

interface RenewalRow {
  id: string;
  type: RowType;
  name: string;
  detail: string;
  status: 'expired' | 'expiring_soon' | 'pending' | 'rejected';
  date?: string;
  inspectorId?: string;
  equipmentId?: string;
}

interface RenewalsHubProps {
  inspectors: Inspector[];
  equipment: Equipment[];
  onOpenInspector: (id: string) => void;
  onOpenEquipment: (id: string) => void;
}

export const RenewalsHub: React.FC<RenewalsHubProps> = ({
  inspectors,
  equipment,
  onOpenInspector,
  onOpenEquipment
}) => {
  const [typeFilter, setTypeFilter] = useState<RowType | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');

  const rows = useMemo(() => {
    const out: RenewalRow[] = [];
    for (const insp of inspectors) {
      const vs = getVisionStatus(insp);
      if (vs === 'expired' || vs === 'missing' || vs === 'expiring_soon') {
        out.push({
          id: `vision-${insp.id}`,
          type: 'vision',
          name: insp.fullName,
          detail: 'Near-vision acuity',
          status: vs === 'expiring_soon' ? 'expiring_soon' : 'expired',
          date: insp.visionAcuityExpiryDate,
          inspectorId: insp.id
        });
      }
      for (const mc of insp.methodCertificates || []) {
        pushCertRow(out, insp, mc);
      }
    }
    for (const eq of equipment) {
      const st = checkExpiry(eq.calibrationExpiryDate).status;
      if (st === 'expired' || st === 'expiring_soon') {
        out.push({
          id: `eq-${eq.id}`,
          type: 'equipment',
          name: eq.name,
          detail: eq.serialNumber,
          status: st,
          date: eq.calibrationExpiryDate,
          equipmentId: eq.id
        });
      }
    }
    return out.sort((a, b) => {
      const rank = { expired: 0, rejected: 1, pending: 2, expiring_soon: 3 };
      return rank[a.status] - rank[b.status];
    });
  }, [inspectors, equipment]);

  const filtered = rows.filter(r => {
    if (typeFilter !== 'ALL' && r.type !== typeFilter) return false;
    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'pending') return r.status === 'pending' || r.status === 'rejected';
    return r.status === statusFilter;
  });

  const expiredCount = rows.filter(r => r.status === 'expired' || r.status === 'rejected').length;
  const dueSoonCount = rows.filter(r => r.status === 'expiring_soon').length;

  const chip = (active: boolean) =>
    `px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
      active ? 'bg-sky-500/25 text-sky-200 border-sky-400/50' : 'bg-slate-950 text-slate-400 border-slate-700'
    }`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Renewals</h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Method certificates, equipment calibration, and vision acuity due or blocked
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 max-w-md">
        <div className="bg-slate-900 border border-rose-500/30 rounded-2xl p-4">
          <span className="text-[11px] uppercase font-bold text-rose-400">Expired / blocked</span>
          <div className="text-2xl font-black text-rose-400 mt-0.5">{expiredCount}</div>
        </div>
        <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-4">
          <span className="text-[11px] uppercase font-bold text-amber-400">Due soon</span>
          <div className="text-2xl font-black text-amber-400 mt-0.5">{dueSoonCount}</div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          {(['ALL', 'cert', 'equipment', 'vision'] as const).map(t => (
            <button key={t} type="button" onClick={() => setTypeFilter(t)} className={chip(typeFilter === t)}>
              {t === 'ALL' ? 'All types' : t === 'cert' ? 'People certs' : t === 'equipment' ? 'Equipment' : 'Vision'}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {([
            ['ALL', 'All status'],
            ['expired', 'Expired'],
            ['expiring_soon', 'Due soon'],
            ['pending', 'Pending / rejected']
          ] as const).map(([k, label]) => (
            <button key={k} type="button" onClick={() => setStatusFilter(k)} className={chip(statusFilter === k)}>
              {label}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-500">Showing {filtered.length} of {rows.length}</p>
      </div>

      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 p-8 text-center text-sm text-slate-400">
            <RefreshCw className="w-8 h-8 mx-auto mb-2 text-slate-600" />
            Nothing in this filter — roster looks clear.
          </div>
        )}
        {filtered.map(row => (
          <button
            key={row.id}
            type="button"
            onClick={() => {
              if (row.inspectorId) onOpenInspector(row.inspectorId);
              else if (row.equipmentId) onOpenEquipment(row.equipmentId);
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-sky-500/40 text-left"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-white truncate">{row.name}</span>
                <span className="text-[10px] font-bold uppercase text-slate-500">{row.type}</span>
              </div>
              <div className="text-xs text-slate-400 mt-0.5">{row.detail}{row.date ? ` · ${formatDate(row.date)}` : ''}</div>
            </div>
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold shrink-0 ${
              row.status === 'expired' || row.status === 'rejected'
                ? 'bg-rose-500/20 text-rose-400'
                : row.status === 'pending'
                ? 'bg-amber-500/20 text-amber-300'
                : 'bg-amber-500/20 text-amber-400'
            }`}>
              {(row.status === 'expired' || row.status === 'rejected') && <AlertTriangle className="w-3 h-3" />}
              {row.status === 'expiring_soon' ? 'Due soon' : row.status === 'pending' ? 'Pending' : row.status === 'rejected' ? 'Rejected' : 'Expired'}
            </span>
            <ChevronRight className="w-4 h-4 text-slate-600 shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
};

function pushCertRow(out: RenewalRow[], insp: Inspector, mc: MethodCertificate) {
  if (mc.verificationStatus === 'PendingVerification') {
    out.push({
      id: `cert-${mc.id}`,
      type: 'cert',
      name: insp.fullName,
      detail: `${mc.method} · Pending verification`,
      status: 'pending',
      date: mc.expiryDate,
      inspectorId: insp.id
    });
    return;
  }
  if (mc.verificationStatus === 'Rejected') {
    out.push({
      id: `cert-${mc.id}`,
      type: 'cert',
      name: insp.fullName,
      detail: `${mc.method} · Rejected`,
      status: 'rejected',
      date: mc.expiryDate,
      inspectorId: insp.id
    });
    return;
  }
  const st = checkExpiry(mc.expiryDate).status;
  if (st === 'expired' || st === 'expiring_soon') {
    out.push({
      id: `cert-${mc.id}`,
      type: 'cert',
      name: insp.fullName,
      detail: `${mc.method} · ${mc.level}`,
      status: st,
      date: mc.expiryDate,
      inspectorId: insp.id
    });
  }
}
