import React, { useState } from 'react';
import { ShieldCheck, RefreshCw, HardHat, Award, Monitor, X } from 'lucide-react';
import { UserRole } from '../../types';

interface HeaderProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  selectedInspectorId: string;
  onInspectorChange: (id: string) => void;
  onResetData: () => void;
}

const DEMO_PERSONAS: {
  id: string;
  label: string;
  shortLabel: string;
  role: UserRole;
  Icon: typeof HardHat;
}[] = [
  { id: 'insp-4', label: 'Lesego (L1)', shortLabel: 'Lesego', role: 'technician', Icon: HardHat },
  { id: 'insp-1', label: 'Thabo (Supervisor)', shortLabel: 'Thabo', role: 'technician', Icon: HardHat },
  { id: 'l3', label: 'Johan (L3)', shortLabel: 'Johan', role: 'l3_verifier', Icon: Award },
  { id: 'admin', label: 'Admin', shortLabel: 'Admin', role: 'admin', Icon: Monitor }
];

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  onRoleChange,
  selectedInspectorId,
  onInspectorChange,
  onResetData
}) => {
  const [bannerVisible, setBannerVisible] = useState(true);

  const applyDemoPersona = (personaId: string, role: UserRole) => {
    onRoleChange(role);
    if (role === 'technician') {
      onInspectorChange(personaId);
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-12 sm:h-14 gap-2">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-sky-500/20 ring-1 ring-white/20 shrink-0">
              <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm sm:text-base tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent truncate">
                  MysticNDT
                </span>
                <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30 uppercase tracking-wide">
                  Demo
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onResetData}
            title="Reset demo data"
            className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors border border-transparent hover:border-slate-700 text-[10px] sm:text-xs font-semibold shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset demo</span>
          </button>
        </div>

        <div className="pb-2 space-y-1.5 border-t border-slate-800/80 pt-1.5">
          {bannerVisible && (
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 flex items-start gap-2 text-[10px] sm:text-[11px] text-amber-200/90 font-medium leading-snug">
              <p className="flex-1 min-w-0">
                Demo as — <span className="font-bold text-amber-100">not access control</span>. Backend auth will enforce the permissions matrix.
              </p>
              <button
                type="button"
                onClick={() => setBannerVisible(false)}
                className="shrink-0 p-0.5 rounded text-amber-300/80 hover:text-amber-100 hover:bg-amber-500/20"
                aria-label="Dismiss demo notice"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] uppercase font-bold text-slate-500 mr-0.5 shrink-0">Demo as</span>
            {!bannerVisible && (
              <span className="text-[10px] text-amber-200/70 font-medium mr-1 shrink-0">
                (not auth)
              </span>
            )}
            <div
              className="bg-slate-950 p-0.5 sm:p-1 rounded-xl border border-slate-800 flex flex-wrap items-center gap-0.5 shadow-inner"
              role="group"
              aria-label="Demo persona"
            >
              {DEMO_PERSONAS.map(p => {
                const active =
                  (p.role === currentRole && p.role !== 'technician') ||
                  (p.role === 'technician' && currentRole === 'technician' && selectedInspectorId === p.id);
                const Icon = p.Icon;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applyDemoPersona(p.id, p.role)}
                    aria-pressed={active}
                    title={p.label}
                    className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all ${
                      active
                        ? p.role === 'l3_verifier'
                          ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                          : p.role === 'admin'
                          ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                          : 'bg-violet-600 text-white shadow-md shadow-violet-600/30'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="sm:hidden">{p.shortLabel}</span>
                    <span className="hidden sm:inline">{p.label}</span>
                  </button>
                );
              })}
            </div>
            <span className="text-[10px] text-slate-500 ml-auto hidden sm:inline max-w-[min(100%,28rem)] truncate">
              Path: Reset → Thabo Supervise → Complete → L3 → Audit pack / Mark delivered
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
