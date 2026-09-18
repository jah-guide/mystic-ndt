import React, { useState } from 'react';
import { 
  X, Package, CheckCircle2, AlertTriangle, Clock, Wrench, 
  AlertCircle, Info, ChevronRight, Zap
} from 'lucide-react';
import { Equipment, Job, AuditEntry } from '../../types';
import { StorageService } from '../../services/storage';
import { checkExpiry } from '../../utils/validation';
import { formatDate } from '../../utils/formatters';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';

interface EquipmentDeploymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: Job;
  allEquipment: Equipment[];
  inspectorName: string;
  onJobUpdated: (job: Job) => void;
}

const categoryMethodMap: Record<string, string[]> = {
  'Ultrasonic': ['UT'],
  'Magnetic Particle': ['MT'],
  'Liquid Penetrant': ['PT'],
  'Visual / Optical': ['VT'],
  'General': ['UT', 'MT', 'PT', 'VT']
};

function getCheckoutStatusInfo(eq: Equipment) {
  if (eq.checkoutStatus === 'Incident Reported') {
    return { icon: AlertCircle, color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/30', label: 'Incident Reported', blocked: true };
  }
  if (eq.checkoutStatus === 'On Job') {
    if (eq.currentJobId === undefined) return { icon: Wrench, color: 'text-slate-400', bg: '', label: 'On Job', blocked: true };
    return { icon: Wrench, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30', label: `On Job: ${eq.currentJobNumber || 'Unknown'}`, blocked: true };
  }
  if (eq.checkoutStatus === 'In Maintenance') {
    return { icon: Wrench, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30', label: 'In Maintenance', blocked: true };
  }
  return { icon: CheckCircle2, color: 'text-emerald-400', bg: '', label: 'Available', blocked: false };
}

export const EquipmentDeploymentModal: React.FC<EquipmentDeploymentModalProps> = ({
  isOpen, onClose, job, allEquipment, inspectorName, onJobUpdated
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([...job.equipmentIds]);

  useBodyScrollLock(isOpen);

  if (!isOpen) return null;

  const isCompleted = job.status === 'Completed';

  // Separate recommended (method-matching) from other equipment
  const recommended = allEquipment.filter(eq => {
    const cat = eq.category || 'General';
    const methods = categoryMethodMap[cat] || [];
    return methods.includes(job.method);
  });
  const other = allEquipment.filter(eq => !recommended.some(r => r.id === eq.id));

  const toggleEquipment = (eqId: string, blocked: boolean) => {
    if (isCompleted || blocked) return;
    setSelectedIds(prev =>
      prev.includes(eqId) ? prev.filter(id => id !== eqId) : [...prev, eqId]
    );
  };

  const handleSave = () => {
    // Determine what was added and what was removed
    const previousIds = job.equipmentIds;
    const addedIds = selectedIds.filter(id => !previousIds.includes(id));
    const removedIds = previousIds.filter(id => !selectedIds.includes(id));

    const now = new Date().toISOString();
    const newAuditEntries: AuditEntry[] = [];

    if (addedIds.length > 0) {
      const addedNames = addedIds.map(id => allEquipment.find(e => e.id === id)?.name || id).join(', ');
      newAuditEntries.push({
        id: 'aud-' + Date.now(),
        timestamp: now,
        actorName: 'Admin',
        actorRole: 'Admin',
        action: 'EQUIPMENT_CHECKED_OUT',
        details: `Equipment deployed to job: ${addedNames}.`
      });
      // Checkout in storage
      StorageService.checkoutEquipmentList(addedIds, job.id, job.jobNumber, inspectorName);
    }

    if (removedIds.length > 0) {
      const removedNames = removedIds.map(id => allEquipment.find(e => e.id === id)?.name || id).join(', ');
      newAuditEntries.push({
        id: 'aud-' + (Date.now() + 1),
        timestamp: now,
        actorName: 'Admin',
        actorRole: 'Admin',
        action: 'EQUIPMENT_RETURNED',
        details: `Equipment returned from job: ${removedNames}.`
      });
      StorageService.returnEquipmentList(removedIds, job.jobNumber);
    }

    const updatedJob: Job = {
      ...job,
      equipmentIds: selectedIds,
      auditTrail: [...(job.auditTrail || []), ...newAuditEntries]
    };
    StorageService.updateJob(updatedJob);
    onJobUpdated(updatedJob);
    onClose();
  };

  const renderEquipmentRow = (eq: Equipment) => {
    const calCheck = checkExpiry(eq.calibrationExpiryDate);
    const statusInfo = getCheckoutStatusInfo(eq);
    const isSelected = selectedIds.includes(eq.id);
    // Allow selecting even if "On Job" for THIS job
    const isOnThisJob = eq.currentJobId === job.id;
    const effectivelyBlocked = statusInfo.blocked && !isOnThisJob;

    return (
      <button
        key={eq.id}
        type="button"
        disabled={isCompleted || effectivelyBlocked}
        onClick={() => toggleEquipment(eq.id, effectivelyBlocked)}
        className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl border text-left transition-all ${
          effectivelyBlocked
            ? 'border-slate-800 opacity-50 cursor-not-allowed bg-slate-950/30'
            : isSelected
            ? 'border-sky-500 bg-sky-500/10 ring-1 ring-sky-500/40'
            : 'border-slate-700 bg-slate-950 hover:border-slate-500'
        }`}
      >
        {/* Checkbox */}
        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
          isSelected ? 'border-sky-500 bg-sky-500' : 'border-slate-600'
        }`}>
          {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-white truncate">{eq.name}</span>
            <span className="text-xs font-mono text-slate-400">[{eq.serialNumber}]</span>
          </div>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            <span className={`text-xs font-semibold ${
              calCheck.status === 'expired' ? 'text-rose-400'
              : calCheck.status === 'expiring_soon' ? 'text-amber-400'
              : 'text-emerald-400'
            }`}>
              Cal: {calCheck.formattedText}
            </span>
            {effectivelyBlocked && (
              <span className={`text-xs font-bold flex items-center gap-1 ${statusInfo.color}`}>
                <statusInfo.icon className="w-3 h-3" />
                {statusInfo.label}
              </span>
            )}
            {isOnThisJob && !isSelected && (
              <span className="text-xs text-sky-400 font-semibold">Currently on this job</span>
            )}
          </div>
        </div>

        {/* Category badge */}
        <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
          {eq.category || 'General'}
        </span>
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-3 sm:p-4 overflow-hidden">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Deploy Equipment</h3>
              <p className="text-xs text-slate-400">{job.jobNumber} — {job.method} Method</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">

          {isCompleted && (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-800 rounded-xl text-xs text-slate-400">
              <Info className="w-4 h-4 shrink-0" />
              <span>Job is completed. Equipment deployment is read-only.</span>
            </div>
          )}

          {/* Recommended for method */}
          {recommended.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-sky-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-sky-400">Recommended for {job.method}</span>
              </div>
              {recommended.map(renderEquipmentRow)}
            </div>
          )}

          {/* Other equipment */}
          {other.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Other Available Equipment</span>
              </div>
              {other.map(renderEquipmentRow)}
            </div>
          )}

          {allEquipment.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              <Package className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No equipment registered yet.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        {!isCompleted && (
          <div className="px-5 py-4 border-t border-slate-800 flex items-center justify-between gap-3">
            <span className="text-xs text-slate-400">
              {selectedIds.length} instrument{selectedIds.length !== 1 ? 's' : ''} selected
            </span>
            <div className="flex items-center gap-3">
              <button type="button" onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 font-semibold text-sm hover:bg-slate-800 transition-colors">
                Cancel
              </button>
              <button type="button" onClick={handleSave}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-500 hover:from-sky-500 hover:to-cyan-400 text-white font-bold text-sm shadow-lg shadow-sky-500/20 active:scale-95 transition-all">
                Save Deployment
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
