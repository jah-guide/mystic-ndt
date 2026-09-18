import React, { useState } from 'react';
import { AlertTriangle, X, Camera, AlertCircle, Package } from 'lucide-react';
import { Equipment, EquipmentIncidentType, Job } from '../../types';
import { StorageService } from '../../services/storage';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';

interface EquipmentIncidentModalProps {
  isOpen: boolean;
  onClose: () => void;
  equipment: Equipment[];
  job: Job;
  reporterName: string;
  reporterRole: string;
  onIncidentReported: () => void;
}

const INCIDENT_TYPES: { value: EquipmentIncidentType; label: string; color: string; desc: string }[] = [
  { value: 'Broken', label: 'Broken / Damaged', color: 'text-rose-400 border-rose-500/40 bg-rose-950/20', desc: 'Physical damage to the instrument' },
  { value: 'Stolen', label: 'Stolen', color: 'text-red-400 border-red-500/40 bg-red-950/20', desc: 'Instrument cannot be located / reported missing' },
  { value: 'Lost', label: 'Lost on Site', color: 'text-orange-400 border-orange-500/40 bg-orange-950/20', desc: 'Cannot be found, may be misplaced' },
  { value: 'Tampered', label: 'Tampered / Suspected Interference', color: 'text-amber-400 border-amber-500/40 bg-amber-950/20', desc: 'Settings altered or seals broken' },
  { value: 'Damaged', label: 'Calibration Damage', color: 'text-yellow-400 border-yellow-500/40 bg-yellow-950/20', desc: 'Calibration may have been compromised' },
  { value: 'Other', label: 'Other', color: 'text-slate-400 border-slate-500/40 bg-slate-800/40', desc: 'Describe in detail below' }
];

export const EquipmentIncidentModal: React.FC<EquipmentIncidentModalProps> = ({
  isOpen, onClose, equipment, job, reporterName, reporterRole, onIncidentReported
}) => {
  const [selectedEquipmentId, setSelectedEquipmentId] = useState(equipment.length === 1 ? equipment[0].id : '');
  const [incidentType, setIncidentType] = useState<EquipmentIncidentType | ''>('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useBodyScrollLock(isOpen);

  if (!isOpen) return null;

  const selectedEquipment = equipment.find(e => e.id === selectedEquipmentId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEquipmentId || !incidentType || !description.trim()) return;
    setSubmitting(true);

    StorageService.addIncident({
      equipmentId: selectedEquipmentId,
      equipmentName: selectedEquipment?.name || 'Unknown',
      serialNumber: selectedEquipment?.serialNumber || 'Unknown',
      type: incidentType as EquipmentIncidentType,
      description: description.trim(),
      reportedByName: reporterName,
      reportedByRole: reporterRole,
      reportedAt: new Date().toISOString(),
      jobId: job.id,
      jobNumber: job.jobNumber,
      status: 'Open'
    });

    setSubmitting(false);
    setSubmitted(true);

    setTimeout(() => {
      onIncidentReported();
      onClose();
    }, 2000);
  };

  if (submitted) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4">
        <div className="bg-slate-900 border border-rose-500/40 rounded-2xl p-8 text-center max-w-sm w-full shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-rose-500/20 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-rose-400" />
          </div>
          <h3 className="font-black text-lg text-white mb-2">Incident Reported</h3>
          <p className="text-sm text-slate-300 mb-1">
            <strong className="text-rose-300">{selectedEquipment?.name}</strong> has been locked and flagged.
          </p>
          <p className="text-xs text-slate-400">Admin has been notified. Equipment cannot be used until the incident is resolved.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-3 sm:p-4 overflow-hidden">
      <div className="bg-slate-900 border border-rose-500/30 w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-gradient-to-r from-rose-950/30 to-slate-900">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Report Equipment Incident</h3>
              <p className="text-xs text-rose-300/80">This will lock the equipment until admin resolves the incident</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">

          {/* Equipment Selection */}
          {equipment.length > 1 && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Which Equipment? *
              </label>
              <select value={selectedEquipmentId} onChange={e => setSelectedEquipmentId(e.target.value)} required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-rose-500">
                <option value="">— Select equipment —</option>
                {equipment.map(eq => (
                  <option key={eq.id} value={eq.id}>{eq.name} [{eq.serialNumber}]</option>
                ))}
              </select>
            </div>
          )}

          {equipment.length === 1 && selectedEquipment && (
            <div className="flex items-center gap-3 px-3.5 py-3 bg-slate-950 border border-slate-700 rounded-xl">
              <Package className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-white">{selectedEquipment.name}</p>
                <p className="text-xs text-slate-400 font-mono">{selectedEquipment.serialNumber}</p>
              </div>
            </div>
          )}

          {/* Incident Type */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Incident Type *
            </label>
            <div className="grid grid-cols-2 gap-2">
              {INCIDENT_TYPES.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setIncidentType(t.value)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    incidentType === t.value
                      ? `${t.color} ring-1 ring-current`
                      : 'border-slate-700 bg-slate-950 hover:border-slate-500 text-slate-400'
                  }`}
                >
                  <p className="text-xs font-bold">{t.label}</p>
                  <p className="text-[10px] mt-0.5 opacity-70">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Incident Description *
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe exactly what happened, when, and the condition of the equipment. Include any relevant circumstances."
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-rose-500 placeholder:text-slate-500"
            />
          </div>

          {/* Warning box */}
          <div className="flex items-start gap-2.5 px-4 py-3 bg-rose-950/30 border border-rose-500/20 rounded-xl">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <p className="text-xs text-rose-300">
              Submitting this report will <strong>immediately lock {selectedEquipment?.name || 'the selected equipment'}</strong> from any further job deployment until an admin resolves the incident. The admin will be notified.
            </p>
          </div>

          {/* Footer */}
          <div className="pt-2 flex items-center justify-between gap-3">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 font-semibold text-sm hover:bg-slate-800">
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedEquipmentId || !incidentType || !description.trim() || submitting}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm shadow-lg shadow-rose-600/25 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all flex items-center gap-2"
            >
              <AlertTriangle className="w-4 h-4" />
              Submit Incident Report
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
