import React from 'react';
import { ShieldCheck, HardHat, Award, RefreshCw, Smartphone, Monitor } from 'lucide-react';
import { UserRole, Inspector } from '../../types';

interface HeaderProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  inspectors: Inspector[];
  selectedInspectorId: string;
  onInspectorChange: (id: string) => void;
  onResetData: () => void;
}

const DEMO_PERSONAS = [
  { id: 'insp-4', label: 'Lesego (L1)', role: 'technician' as UserRole },
  { id: 'insp-1', label: 'Thabo (Supervisor)', role: 'technician' as UserRole },
  { id: 'l3', label: 'Johan (L3)', role: 'l3_verifier' as UserRole },
  { id: 'admin', label: 'Admin', role: 'admin' as UserRole }
];

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  onRoleChange,
  inspectors,
  selectedInspectorId,
  onInspectorChange,
  onResetData
}) => {
  const applyDemoPersona = (personaId: string, role: UserRole) => {
    onRoleChange(role);
    if (role === 'technician') {
      onInspectorChange(personaId);
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
          
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-sky-500/20 ring-1 ring-white/20 shrink-0">
              <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm sm:text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent truncate">
                  MysticNDT
                </span>
                <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30 uppercase tracking-wide">
                  Demo
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 hidden sm:block font-medium truncate">
                Frontend workflow prototype — role toggle (no auth yet)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3">
            
            {currentRole === 'technician' && (
              <div className="hidden md:flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">
                <HardHat className="w-4 h-4 text-amber-400" />
                <select
                  value={selectedInspectorId}
                  onChange={(e) => onInspectorChange(e.target.value)}
                  className="bg-transparent text-xs font-medium text-slate-200 focus:outline-none cursor-pointer max-w-[170px] truncate"
                >
                  {inspectors.map((insp) => (
                    <option key={insp.id} value={insp.id} className="bg-slate-900 text-white">
                      {insp.fullName} ({insp.level || 'Level 2'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center shadow-inner">
              <button
                type="button"
                onClick={() => onRoleChange('technician')}
                className={`flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  currentRole === 'technician'
                    ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tech</span>
              </button>

              <button
                type="button"
                onClick={() => onRoleChange('l3_verifier')}
                className={`flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  currentRole === 'l3_verifier'
                    ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Award className="w-3.5 h-3.5 text-amber-300" />
                <span className="hidden sm:inline">L3</span>
              </button>

              <button
                type="button"
                onClick={() => onRoleChange('admin')}
                className={`flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  currentRole === 'admin'
                    ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Admin</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onResetData}
              title="Reset demo data"
              className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors border border-transparent hover:border-slate-700 text-[10px] sm:text-xs font-semibold"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset demo</span>
            </button>
          </div>
        </div>

        <div className="px-0 pb-1.5">
          <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 px-2.5 py-1.5 text-[10px] sm:text-[11px] text-amber-200/90 font-medium leading-snug">
            Demo role switcher — <span className="font-bold text-amber-100">not access control</span>. Backend auth will enforce the permissions matrix.
          </div>
        </div>

        {/* Demo persona chips + script */}
        <div className="pb-2.5 flex flex-wrap items-center gap-1.5 border-t border-slate-800/80 pt-2">
          <span className="text-[10px] uppercase font-bold text-slate-500 mr-1">Demo as:</span>
          {DEMO_PERSONAS.map(p => {
            const active =
              (p.role === currentRole && p.role !== 'technician') ||
              (p.role === 'technician' && currentRole === 'technician' && selectedInspectorId === p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => applyDemoPersona(p.id, p.role)}
                className={`px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-bold border transition-colors ${
                  active
                    ? 'bg-violet-500/20 text-violet-200 border-violet-500/40'
                    : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-slate-200'
                }`}
              >
                {p.label}
              </button>
            );
          })}
          <span className="text-[10px] text-slate-500 ml-auto hidden lg:inline">
            Path: Reset → Thabo Supervise queue → WEP frozen on assign → Complete → L3/Final → Audit pack / Mark delivered
          </span>
        </div>
      </div>
    </header>
  );
};
