import React, { useState } from 'react';
import {
  AlertCircle, CheckCircle2, Clock, Search, Eye, Shield,
  ChevronRight, AlertTriangle, Package, SlidersHorizontal, RefreshCw
} from 'lucide-react';
import { EquipmentIncident, Equipment } from '../../types';
import { StorageService } from '../../services/storage';
import { formatDateTime } from '../../utils/formatters';

interface IncidentManagementProps {
  incidents: EquipmentIncident[];
  equipment: Equipment[];
  onDataUpdated: () => void;
}

const STATUS_COLORS = {
  'Open': 'bg-rose-500/20 text-rose-300 border border-rose-500/30',
  'Under Review': 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
  'Resolved': 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
};

const TYPE_COLORS: Record<string, string> = {
  'Stolen': 'text-red-400',
  'Broken': 'text-rose-400',
  'Lost': 'text-orange-400',
  'Tampered': 'text-amber-400',
  'Damaged': 'text-yellow-400',
  'Other': 'text-slate-400'
};

export const IncidentManagement: React.FC<IncidentManagementProps> = ({
  incidents, equipment, onDataUpdated
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Open' | 'Under Review' | 'Resolved'>('Open');
  const [selectedIncident, setSelectedIncident] = useState<EquipmentIncident | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [newStatus, setNewStatus] = useState<EquipmentIncident['status']>('Open');

  const openCount = incidents.filter(i => i.status === 'Open').length;
  const underReviewCount = incidents.filter(i => i.status === 'Under Review').length;
  const resolvedCount = incidents.filter(i => i.status === 'Resolved').length;

  const filtered = incidents.filter(inc => {
    if (statusFilter !== 'all' && inc.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        inc.equipmentName.toLowerCase().includes(q) ||
        inc.serialNumber.toLowerCase().includes(q) ||
        inc.reportedByName.toLowerCase().includes(q) ||
        inc.type.toLowerCase().includes(q) ||
        (inc.jobNumber || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleOpenDetail = (inc: EquipmentIncident) => {
    setSelectedIncident(inc);
    setAdminNotes(inc.adminNotes || '');
    setNewStatus(inc.status);
  };

  const handleSaveResolution = () => {
    if (!selectedIncident) return;
    const updated: EquipmentIncident = {
      ...selectedIncident,
      status: newStatus,
      adminNotes,
      resolvedAt: newStatus === 'Resolved' ? new Date().toISOString() : selectedIncident.resolvedAt,
      resolvedByName: newStatus === 'Resolved' ? 'Admin' : selectedIncident.resolvedByName
    };
    StorageService.updateIncident(updated);
    onDataUpdated();
    setSelectedIncident(null);
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Equipment Incident Management</h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Review, investigate and resolve technician-reported equipment incidents. Locked equipment cannot be deployed until resolved.
        </p>
      </div>

      {/* KPI Bar */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-900 border border-rose-500/30 p-4 rounded-2xl bg-rose-950/10">
          <span className="text-[11px] uppercase font-bold text-rose-400 block">Open Incidents</span>
          <div className="text-2xl font-black text-rose-400 mt-0.5">{openCount}</div>
          <span className="text-xs text-slate-400">Require attention</span>
        </div>
        <div className="bg-slate-900 border border-amber-500/30 p-4 rounded-2xl bg-amber-950/10">
          <span className="text-[11px] uppercase font-bold text-amber-400 block">Under Review</span>
          <div className="text-2xl font-black text-amber-400 mt-0.5">{underReviewCount}</div>
          <span className="text-xs text-slate-400">Being investigated</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <span className="text-[11px] uppercase font-bold text-emerald-400 block">Resolved</span>
          <div className="text-2xl font-black text-emerald-400 mt-0.5">{resolvedCount}</div>
          <span className="text-xs text-slate-400">Cleared & returned</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex flex-col sm:flex-row items-center gap-3">
        <div className="relative w-full sm:flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by equipment, reporter, job number, type..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-rose-500" />
        </div>
        <div className="flex gap-1 w-full sm:w-auto">
          {(['all', 'Open', 'Under Review', 'Resolved'] as const).map(s => (
            <button key={s} type="button" onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                statusFilter === s
                  ? s === 'Open' ? 'bg-rose-600 text-white' : s === 'Under Review' ? 'bg-amber-600 text-white' : s === 'Resolved' ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:text-white bg-slate-800'
              }`}>
              {s === 'all' ? 'All' : s}
            </button>
          ))}
        </div>
      </div>

      {/* Incident List */}
      {filtered.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center">
          <Shield className="w-12 h-12 text-emerald-500/40 mx-auto mb-2" />
          <h3 className="font-bold text-sm text-slate-300">
            {statusFilter === 'Open' ? 'No open incidents 🎉' : 'No incidents found'}
          </h3>
          <p className="text-xs text-slate-500 mt-1">All equipment is accounted for.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(inc => {
            const eq = equipment.find(e => e.id === inc.equipmentId);
            return (
              <div key={inc.id}
                className={`bg-slate-900 border rounded-2xl p-4 sm:p-5 transition-all hover:border-slate-600 ${
                  inc.status === 'Open'
                    ? 'border-rose-500/40 bg-gradient-to-r from-rose-950/10 to-slate-900'
                    : inc.status === 'Under Review'
                    ? 'border-amber-500/30 bg-gradient-to-r from-amber-950/10 to-slate-900'
                    : 'border-slate-800'
                }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Type + Status */}
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-sm font-black ${TYPE_COLORS[inc.type] || 'text-slate-300'}`}>
                        ⚠ {inc.type}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${STATUS_COLORS[inc.status]}`}>
                        {inc.status}
                      </span>
                    </div>

                    <h3 className="font-bold text-base text-white">{inc.equipmentName}</h3>
                    <p className="text-xs font-mono text-slate-400">{inc.serialNumber}</p>

                    <p className="text-xs text-slate-300 mt-1.5 line-clamp-2">{inc.description}</p>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-slate-400">
                      <span>Reported by: <strong className="text-slate-200">{inc.reportedByName}</strong></span>
                      <span>At: <strong className="text-slate-200">{formatDateTime(inc.reportedAt)}</strong></span>
                      {inc.jobNumber && <span>Job: <strong className="text-sky-400">{inc.jobNumber}</strong></span>}
                    </div>

                    {eq?.checkoutStatus === 'Incident Reported' && (
                      <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 bg-rose-500/10 border border-rose-500/20 rounded-lg text-[10px] font-bold text-rose-400">
                        <AlertCircle className="w-3 h-3" />
                        Equipment locked — unavailable for deployment
                      </div>
                    )}
                  </div>

                  <button type="button" onClick={() => handleOpenDetail(inc)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-colors shrink-0">
                    <Eye className="w-3.5 h-3.5" />
                    Manage Incident
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Incident Detail / Resolution Modal */}
      {selectedIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">

            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
              <div>
                <h3 className="font-bold text-base text-white">Incident Detail</h3>
                <p className="text-xs text-slate-400">{selectedIncident.equipmentName}</p>
              </div>
              <button onClick={() => setSelectedIncident(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1 text-sm">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block mb-1">Equipment</span>
                  <p className="font-bold text-white">{selectedIncident.equipmentName}</p>
                  <p className="font-mono text-slate-400">{selectedIncident.serialNumber}</p>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block mb-1">Incident Type</span>
                  <p className={`font-black ${TYPE_COLORS[selectedIncident.type]}`}>{selectedIncident.type}</p>
                  {selectedIncident.jobNumber && <p className="text-slate-400 mt-0.5">Job: {selectedIncident.jobNumber}</p>}
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block mb-1">Reported By</span>
                  <p className="font-bold text-white">{selectedIncident.reportedByName}</p>
                  <p className="text-slate-400">{selectedIncident.reportedByRole}</p>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block mb-1">Reported At</span>
                  <p className="font-bold text-white">{formatDateTime(selectedIncident.reportedAt)}</p>
                </div>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-400 block mb-1">Description</span>
                <p className="text-sm text-slate-200">{selectedIncident.description}</p>
              </div>

              {/* Admin Resolution Panel */}
              <div className="border border-amber-500/30 bg-amber-950/10 rounded-xl p-4 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300">Admin Resolution</h4>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1.5">Update Status</label>
                  <div className="flex gap-2">
                    {(['Open', 'Under Review', 'Resolved'] as const).map(s => (
                      <button key={s} type="button" onClick={() => setNewStatus(s)}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                          newStatus === s
                            ? s === 'Open' ? 'border-rose-500 bg-rose-500/20 text-rose-300'
                              : s === 'Under Review' ? 'border-amber-500 bg-amber-500/20 text-amber-300'
                              : 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
                            : 'border-slate-700 bg-slate-950 text-slate-400 hover:border-slate-500'
                        }`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1.5">Admin Notes / Resolution Details</label>
                  <textarea rows={3} value={adminNotes} onChange={e => setAdminNotes(e.target.value)}
                    placeholder="e.g. Equipment sent to SANAS lab for inspection. Awaiting repair quote."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500 placeholder:text-slate-500" />
                </div>
                {newStatus === 'Resolved' && (
                  <div className="flex items-center gap-2 text-xs text-emerald-300">
                    <CheckCircle2 className="w-4 h-4" />
                    Setting to Resolved will automatically return the equipment to <strong>Available</strong> status.
                  </div>
                )}
              </div>
            </div>

            <div className="px-5 py-4 border-t border-slate-800 flex justify-between gap-3">
              <button type="button" onClick={() => setSelectedIncident(null)}
                className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 text-xs font-semibold hover:bg-slate-800">
                Cancel
              </button>
              <button type="button" onClick={handleSaveResolution}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-500 to-orange-400 text-white font-bold text-xs shadow-lg active:scale-95 transition-all flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5" />
                Save Resolution
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
