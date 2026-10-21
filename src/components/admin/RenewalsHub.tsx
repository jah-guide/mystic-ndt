import React, { useMemo, useState } from 'react';
import { AlertTriangle, ChevronRight, CheckCircle2 } from 'lucide-react';
import { Inspector, Equipment, MethodCertificate } from '../../types';
import { checkExpiry } from '../../utils/validation';
import { getVisionStatus } from '../../utils/visionAuthorization';
import {
  hasPendingCertSubmission,
  hasPendingVisionSubmission
} from '../../utils/certSubmissions';
import { formatDate } from '../../utils/formatters';

type RowType = 'cert' | 'equipment' | 'vision';
type Section = 'people' | 'equipment';
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

interface GroupedCard {
  id: string;
  name: string;
  issues: RenewalRow[];
  openId: string;
  openKind: 'inspector' | 'equipment';
}

interface RenewalsHubProps {
  inspectors: Inspector[];
  equipment: Equipment[];
  onOpenInspector: (id: string) => void;
  onOpenEquipment: (id: string) => void;
}

function isPeopleRow(row: RenewalRow): boolean {
  return row.type === 'cert' || row.type === 'vision';
}

function statusRank(status: RenewalRow['status']): number {
  const rank = { expired: 0, rejected: 1, pending: 2, expiring_soon: 3 };
  return rank[status];
}

function groupHasExpired(issues: RenewalRow[]): boolean {
  return issues.some(i => i.status === 'expired' || i.status === 'rejected');
}

function sortGroups(a: GroupedCard, b: GroupedCard): number {
  const aExp = groupHasExpired(a.issues) ? 0 : 1;
  const bExp = groupHasExpired(b.issues) ? 0 : 1;
  if (aExp !== bExp) return aExp - bExp;
  if (b.issues.length !== a.issues.length) return b.issues.length - a.issues.length;
  return a.name.localeCompare(b.name);
}

function groupRows(
  rows: RenewalRow[],
  keyOf: (r: RenewalRow) => string | undefined,
  openKind: 'inspector' | 'equipment'
): GroupedCard[] {
  const map = new Map<string, GroupedCard>();
  for (const row of rows) {
    const key = keyOf(row);
    if (!key) continue;
    const existing = map.get(key);
    if (existing) {
      existing.issues.push(row);
    } else {
      map.set(key, {
        id: key,
        name: row.name,
        issues: [row],
        openId: key,
        openKind
      });
    }
  }
  for (const g of map.values()) {
    g.issues.sort((a, b) => statusRank(a.status) - statusRank(b.status));
  }
  return Array.from(map.values()).sort(sortGroups);
}

function statusLabel(status: RenewalRow['status']): string {
  if (status === 'expiring_soon') return 'Due soon';
  if (status === 'pending') return 'Pending';
  if (status === 'rejected') return 'Rejected';
  return 'Expired';
}

function statusPillClass(status: RenewalRow['status']): string {
  if (status === 'expired' || status === 'rejected') return 'bg-rose-500/20 text-rose-400';
  if (status === 'pending') return 'bg-amber-500/20 text-amber-300';
  return 'bg-amber-500/20 text-amber-400';
}

/** Kind chips — distinct, projector-readable; separate from status pills. */
const KIND_CHIP: Record<RowType, { label: string; className: string }> = {
  cert: {
    label: 'CERT',
    className: 'bg-sky-500/30 text-sky-100 border border-sky-400/60'
  },
  vision: {
    label: 'VISION',
    className: 'bg-violet-500/30 text-violet-100 border border-violet-400/60'
  },
  equipment: {
    label: 'CAL',
    className: 'bg-indigo-500/30 text-indigo-100 border border-indigo-400/60'
  }
};

function emptyCopy(
  section: Section,
  statusFilter: StatusFilter
): { headline: string; support: string } {
  if (section === 'people') {
    if (statusFilter === 'ALL') {
      return {
        headline: 'All people compliant',
        support:
          'ISO 9712 certs and near-vision acuity are current — inspectors are ready to assign.'
      };
    }
    if (statusFilter === 'expired') {
      return {
        headline: 'No expired people in this view',
        support: 'Nobody is blocked on expired cert or vision right now.'
      };
    }
    if (statusFilter === 'expiring_soon') {
      return {
        headline: 'No people due soon in this view',
        support: 'No cert or vision renewals approaching the window.'
      };
    }
    return {
      headline: 'No pending or rejected in this view',
      support: 'No certs awaiting verification or rejected — roster looks clear.'
    };
  }
  if (statusFilter === 'ALL') {
    return {
      headline: 'All equipment in calibration',
      support: 'Calibration dates are current — assets are ready for dispatch.'
    };
  }
  if (statusFilter === 'expired') {
    return {
      headline: 'No expired equipment in this view',
      support: 'No assets blocked on out-of-cal status.'
    };
  }
  return {
    headline: 'No equipment due soon in this view',
    support: 'No calibration renewals approaching the window.'
  };
}

export const RenewalsHub: React.FC<RenewalsHubProps> = ({
  inspectors,
  equipment,
  onOpenInspector,
  onOpenEquipment
}) => {
  const [section, setSection] = useState<Section>('people');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');

  const rows = useMemo(() => {
    const out: RenewalRow[] = [];
    for (const insp of inspectors) {
      if (hasPendingVisionSubmission(insp)) {
        out.push({
          id: `vision-pending-${insp.id}`,
          type: 'vision',
          name: insp.fullName,
          detail: 'Near-vision · Pending Admin verification',
          status: 'pending',
          date: insp.visionPendingSubmission?.proposedExpiryDate || insp.visionAcuityExpiryDate,
          inspectorId: insp.id
        });
      } else if (insp.visionVerificationStatus === 'PendingVerification') {
        out.push({
          id: `vision-pending-${insp.id}`,
          type: 'vision',
          name: insp.fullName,
          detail: 'Near-vision · Pending verification',
          status: 'pending',
          date: insp.visionAcuityExpiryDate,
          inspectorId: insp.id
        });
      } else if (insp.visionVerificationStatus === 'Rejected') {
        out.push({
          id: `vision-rejected-${insp.id}`,
          type: 'vision',
          name: insp.fullName,
          detail: 'Near-vision · Rejected',
          status: 'rejected',
          date: insp.visionAcuityExpiryDate,
          inspectorId: insp.id
        });
      } else {
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
    return out.sort((a, b) => statusRank(a.status) - statusRank(b.status));
  }, [inspectors, equipment]);

  const peopleRows = useMemo(() => rows.filter(isPeopleRow), [rows]);
  const equipmentRows = useMemo(() => rows.filter(r => r.type === 'equipment'), [rows]);
  const sectionRows = section === 'people' ? peopleRows : equipmentRows;

  const filtered = useMemo(() => {
    return sectionRows.filter(r => {
      if (statusFilter === 'ALL') return true;
      if (statusFilter === 'pending') return r.status === 'pending' || r.status === 'rejected';
      return r.status === statusFilter;
    });
  }, [sectionRows, statusFilter]);

  const groups = useMemo(() => {
    if (section === 'people') {
      return groupRows(filtered, r => r.inspectorId, 'inspector');
    }
    return groupRows(filtered, r => r.equipmentId, 'equipment');
  }, [filtered, section]);

  const expiredCount = rows.filter(r => r.status === 'expired' || r.status === 'rejected').length;
  const dueSoonCount = rows.filter(r => r.status === 'expiring_soon').length;
  const peopleExpired = peopleRows.filter(r => r.status === 'expired' || r.status === 'rejected').length;
  const peopleDueSoon = peopleRows.filter(r => r.status === 'expiring_soon').length;
  const equipmentExpired = equipmentRows.filter(r => r.status === 'expired').length;
  const equipmentDueSoon = equipmentRows.filter(r => r.status === 'expiring_soon').length;

  const peopleGroupCount = useMemo(
    () => groupRows(peopleRows, r => r.inspectorId, 'inspector').length,
    [peopleRows]
  );
  const equipmentGroupCount = useMemo(
    () => groupRows(equipmentRows, r => r.equipmentId, 'equipment').length,
    [equipmentRows]
  );

  const empty = emptyCopy(section, statusFilter);

  const chip = (active: boolean) =>
    `px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
      active ? 'bg-sky-500/25 text-sky-200 border-sky-400/50' : 'bg-slate-950 text-slate-400 border-slate-700'
    }`;

  const sectionTab = (active: boolean) =>
    `flex-1 px-4 py-2.5 rounded-xl text-sm font-bold border transition-colors ${
      active
        ? 'bg-sky-500/25 text-sky-100 border-sky-400/50'
        : 'bg-slate-950 text-slate-400 border-slate-700 hover:border-slate-600'
    }`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Renewals</h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          People (certs & vision) and equipment calibration — due or blocked
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 max-w-md">
        <div className="bg-slate-900 border border-rose-500/30 rounded-2xl p-4">
          <span className="text-[11px] uppercase font-bold text-rose-400">Expired / blocked</span>
          <div className="text-2xl font-black text-rose-400 mt-0.5">{expiredCount}</div>
          <p className="text-[10px] text-slate-500 mt-1">
            People {peopleExpired} · Equipment {equipmentExpired}
          </p>
        </div>
        <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-4">
          <span className="text-[11px] uppercase font-bold text-amber-400">Due soon</span>
          <div className="text-2xl font-black text-amber-400 mt-0.5">{dueSoonCount}</div>
          <p className="text-[10px] text-slate-500 mt-1">
            People {peopleDueSoon} · Equipment {equipmentDueSoon}
          </p>
        </div>
      </div>

      <div
        className="flex gap-2 p-1 rounded-2xl bg-slate-900 border border-slate-800"
        role="tablist"
        aria-label="Renewal category"
      >
        <button
          type="button"
          role="tab"
          aria-selected={section === 'people'}
          onClick={() => setSection('people')}
          className={sectionTab(section === 'people')}
        >
          People
          <span className={`ml-2 tabular-nums ${section === 'people' ? 'text-sky-300' : 'text-slate-500'}`}>
            {peopleGroupCount}
          </span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={section === 'equipment'}
          onClick={() => {
            setSection('equipment');
            if (statusFilter === 'pending') setStatusFilter('ALL');
          }}
          className={sectionTab(section === 'equipment')}
        >
          Equipment
          <span className={`ml-2 tabular-nums ${section === 'equipment' ? 'text-sky-300' : 'text-slate-500'}`}>
            {equipmentGroupCount}
          </span>
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
        <p className="text-[11px] uppercase font-bold text-slate-500 tracking-wide">
          {section === 'people' ? 'Inspector certs & vision' : 'Calibration'}
        </p>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ['ALL', 'All status'],
              ['expired', 'Expired'],
              ['expiring_soon', 'Due soon'],
              ...(section === 'people' ? ([['pending', 'Pending / rejected']] as const) : [])
            ] as Array<[StatusFilter, string]>
          ).map(([k, label]) => (
            <button key={k} type="button" onClick={() => setStatusFilter(k)} className={chip(statusFilter === k)}>
              {label}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-500">
          Showing {groups.length} {section === 'people' ? 'people' : 'assets'} · {filtered.length} issues
        </p>
      </div>

      <div className="space-y-2">
        {groups.length === 0 && (
          <div className="rounded-2xl border border-emerald-500/25 bg-slate-900/80 p-8 text-center">
            <CheckCircle2 className="w-9 h-9 mx-auto mb-3 text-emerald-400/80" />
            <p className="text-lg font-black text-white tracking-tight">{empty.headline}</p>
            <p className="text-sm text-slate-400 mt-2 max-w-md mx-auto leading-relaxed">{empty.support}</p>
          </div>
        )}
        {groups.map(group => {
          const issueCount = group.issues.length;
          const worst = group.issues[0];
          return (
            <button
              key={group.id}
              type="button"
              onClick={() => {
                if (group.openKind === 'inspector') onOpenInspector(group.openId);
                else onOpenEquipment(group.openId);
              }}
              className="w-full flex items-start gap-3 px-4 py-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-sky-500/40 text-left"
            >
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-white text-base truncate">{group.name}</span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black tabular-nums shrink-0 ${
                      groupHasExpired(group.issues)
                        ? 'bg-rose-500/25 text-rose-300 border border-rose-400/40'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
                    }`}
                  >
                    {issueCount} {issueCount === 1 ? 'issue' : 'issues'}
                  </span>
                  {worst && (
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold shrink-0 ${statusPillClass(worst.status)}`}
                    >
                      {(worst.status === 'expired' || worst.status === 'rejected') && (
                        <AlertTriangle className="w-3 h-3" />
                      )}
                      {statusLabel(worst.status)}
                    </span>
                  )}
                </div>
                <ul className="space-y-1.5">
                  {group.issues.map(issue => (
                    <li key={issue.id} className="flex items-start gap-2 min-w-0">
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wide shrink-0 mt-0.5 ${KIND_CHIP[issue.type].className}`}
                      >
                        {KIND_CHIP[issue.type].label}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs text-slate-300 truncate">
                          {issue.detail}
                          {issue.date ? ` · ${formatDate(issue.date)}` : ''}
                        </div>
                      </div>
                      <span
                        className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0 ${statusPillClass(issue.status)}`}
                      >
                        {statusLabel(issue.status)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-600 shrink-0 mt-1" />
            </button>
          );
        })}
      </div>
    </div>
  );
};

function pushCertRow(out: RenewalRow[], insp: Inspector, mc: MethodCertificate) {
  if (hasPendingCertSubmission(mc)) {
    out.push({
      id: `cert-pending-${mc.id}`,
      type: 'cert',
      name: insp.fullName,
      detail: `${mc.method} · Pending Admin verification`,
      status: 'pending',
      date: mc.pendingSubmission?.proposedExpiryDate || mc.expiryDate,
      inspectorId: insp.id
    });
    // Still surface expiry urgency if active cert is due/expired (dual-state)
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
    return;
  }
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
