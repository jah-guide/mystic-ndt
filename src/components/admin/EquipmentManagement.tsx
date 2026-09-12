import React, { useState } from 'react';
import { 
  Wrench, Plus, Edit3, Calendar, AlertTriangle, X, CheckCircle2, 
  Shield, History, FileCheck, RefreshCw, Award, Search, Filter 
} from 'lucide-react';
import { Equipment, CalibrationRecord } from '../../types';
import { checkExpiry } from '../../utils/validation';
import { formatDate, formatDateTime } from '../../utils/formatters';
import { StorageService } from '../../services/storage';

interface EquipmentManagementProps {
  equipment: Equipment[];
  onEquipmentUpdated: () => void;
}

export const EquipmentManagement: React.FC<EquipmentManagementProps> = ({
  equipment,
  onEquipmentUpdated
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | undefined>(undefined);
  
  // Calibration Renewal Modal
  const [isCalModalOpen, setIsCalModalOpen] = useState(false);
  const [calTargetEquipment, setCalTargetEquipment] = useState<Equipment | undefined>(undefined);
  
  // View Calibration History
  const [historyTargetEquipment, setHistoryTargetEquipment] = useState<Equipment | undefined>(undefined);

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // Equipment Form State
  const [name, setName] = useState('');
  const [type, setType] = useState('Ultrasonic Thickness Gauge');
  const [category, setCategory] = useState<Equipment['category']>('Ultrasonic');
  const [serialNumber, setSerialNumber] = useState('');
  const [calibrationDate, setCalibrationDate] = useState('');
  const [calibrationExpiryDate, setCalibrationExpiryDate] = useState('');
  const [notes, setNotes] = useState('');

  // Calibration Renewal Form State
  const [newCalDate, setNewCalDate] = useState(new Date().toISOString().split('T')[0]);
  const [newExpiryDate, setNewExpiryDate] = useState(
    new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [certificateNumber, setCertificateNumber] = useState('CAL-SANAS-2026-');
  const [laboratory, setLaboratory] = useState('SANAS Accredited Calibration Laboratory');
  const [referenceStandard, setReferenceStandard] = useState('5-step carbon steel calibration block');
  const [performedBy, setPerformedBy] = useState('K. Naidoo (SANAS Metrologist)');
  const [calNotes, setCalNotes] = useState('Zero-drift verified across all measurement ranges. Certified compliant.');

  const handleOpenModal = (eq?: Equipment) => {
    if (eq) {
      setEditingEquipment(eq);
      setName(eq.name);
      setType(eq.type);
      setCategory(eq.category || 'Ultrasonic');
      setSerialNumber(eq.serialNumber);
      setCalibrationDate(eq.calibrationDate);
      setCalibrationExpiryDate(eq.calibrationExpiryDate);
      setNotes(eq.notes || '');
    } else {
      setEditingEquipment(undefined);
      setName('');
      setType('Ultrasonic Thickness Gauge');
      setCategory('Ultrasonic');
      setSerialNumber('SN-');
      setCalibrationDate(new Date().toISOString().split('T')[0]);
      setCalibrationExpiryDate(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
      setNotes('');
    }
    setIsModalOpen(true);
  };

  const handleOpenRenewalModal = (eq: Equipment) => {
    setCalTargetEquipment(eq);
    setNewCalDate(new Date().toISOString().split('T')[0]);
    setNewExpiryDate(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    setCertificateNumber(`CAL-SANAS-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
    setLaboratory('SANAS Accredited Metrology Lab');
    setReferenceStandard(
      eq.category === 'Ultrasonic' ? '5-step carbon steel step wedge (2.5mm - 20mm)' :
      eq.category === 'Magnetic Particle' ? '10lb (4.5kg) AC lift test block & pie gauge' :
      eq.category === 'Visual / Optical' ? 'Calibrated Lux meter & digital vernier gauge' :
      'Traceable national reference standard'
    );
    setPerformedBy('K. Naidoo (SANAS Metrologist)');
    setCalNotes('Calibration certificate renewed. Zero drift recorded.');
    setIsCalModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !serialNumber.trim()) return;

    if (editingEquipment) {
      StorageService.updateEquipment({
        ...editingEquipment,
        name,
        type,
        category,
        serialNumber,
        calibrationDate,
        calibrationExpiryDate,
        notes
      });
    } else {
      StorageService.addEquipment({
        name,
        type,
        category,
        serialNumber,
        calibrationDate,
        calibrationExpiryDate,
        notes,
        calibrationHistory: [
          {
            id: 'cal-' + Date.now(),
            calDate: calibrationDate,
            calExpiryDate: calibrationExpiryDate,
            certificateNumber: `CAL-SANAS-INIT`,
            laboratory: 'Initial Vendor Calibration',
            referenceStandard: 'Factory Standard',
            performedBy: 'Lead Metrologist',
            result: 'PASS',
            notes: 'Initial factory calibration on registry entry.',
            timestamp: new Date().toISOString()
          }
        ]
      });
    }

    onEquipmentUpdated();
    setIsModalOpen(false);
  };

  const handleSaveCalibrationRenewal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!calTargetEquipment) return;

    const newCalRecord: CalibrationRecord = {
      id: 'cal-' + Date.now(),
      calDate: newCalDate,
      calExpiryDate: newExpiryDate,
      certificateNumber,
      laboratory,
      referenceStandard,
      performedBy,
      result: 'PASS',
      notes: calNotes,
      timestamp: new Date().toISOString()
    };

    const updatedEquipment: Equipment = {
      ...calTargetEquipment,
      calibrationDate: newCalDate,
      calibrationExpiryDate: newExpiryDate,
      calibrationHistory: [newCalRecord, ...(calTargetEquipment.calibrationHistory || [])]
    };

    StorageService.updateEquipment(updatedEquipment);
    onEquipmentUpdated();
    setIsCalModalOpen(false);
  };

  const filteredEquipment = equipment.filter(eq => {
    if (categoryFilter !== 'ALL' && eq.category !== categoryFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        eq.name.toLowerCase().includes(q) ||
        eq.serialNumber.toLowerCase().includes(q) ||
        eq.type.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Overview metrics
  const validCount = equipment.filter(e => checkExpiry(e.calibrationExpiryDate).status === 'valid').length;
  const expiringSoonCount = equipment.filter(e => checkExpiry(e.calibrationExpiryDate).status === 'expiring_soon').length;
  const expiredCount = equipment.filter(e => checkExpiry(e.calibrationExpiryDate).status === 'expired').length;

  return (
    <div className="space-y-6">
      
      {/* Header & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Equipment & Calibration Registrar
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Maintain traceable SANAS calibration records, serial numbers, and expiry alerts
          </p>
        </div>

        <button
          type="button"
          onClick={() => handleOpenModal()}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-500 hover:from-sky-500 hover:to-cyan-400 text-white font-bold text-sm shadow-lg shadow-sky-500/25 active:scale-95 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Register Equipment</span>
        </button>
      </div>

      {/* Equipment Health KPI Bar */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <span className="text-[11px] uppercase font-bold text-slate-400 block">Valid / Calibrated</span>
          <div className="text-2xl font-black text-emerald-400 mt-0.5">{validCount}</div>
          <span className="text-xs text-slate-500">Ready for field deployment</span>
        </div>

        <div className="bg-slate-900 border border-amber-500/30 p-4 rounded-2xl bg-amber-950/10">
          <span className="text-[11px] uppercase font-bold text-amber-400 block">Expiring Soon (&lt;30d)</span>
          <div className="text-2xl font-black text-amber-400 mt-0.5">{expiringSoonCount}</div>
          <span className="text-xs text-slate-400">Calibration renewal due</span>
        </div>

        <div className="bg-slate-900 border border-rose-500/30 p-4 rounded-2xl bg-rose-950/10">
          <span className="text-[11px] uppercase font-bold text-rose-400 block">Expired Calibration</span>
          <div className="text-2xl font-black text-rose-400 mt-0.5">{expiredCount}</div>
          <span className="text-xs text-slate-400">Requires recalibration</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search apparatus, serial number, type..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs sm:text-sm placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs sm:text-sm text-slate-300 focus:outline-none focus:border-sky-500"
          >
            <option value="ALL">All Categories</option>
            <option value="Ultrasonic">Ultrasonic (UT)</option>
            <option value="Magnetic Particle">Magnetic Particle (MT)</option>
            <option value="Liquid Penetrant">Liquid Penetrant (PT)</option>
            <option value="Visual / Optical">Visual / Optical (VT)</option>
            <option value="General">General Apparatus</option>
          </select>
        </div>
      </div>

      {/* Equipment Registry Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredEquipment.map(eq => {
          const calCheck = checkExpiry(eq.calibrationExpiryDate);
          const historyCount = eq.calibrationHistory?.length || 1;

          return (
            <div
              key={eq.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between hover:border-slate-700 transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-extrabold text-base text-white">{eq.name}</h3>
                    <p className="text-xs text-sky-400 font-medium font-mono">{eq.serialNumber}</p>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenModal(eq)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                      title="Edit metadata"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-2 flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                    {eq.category || 'Ultrasonic'}
                  </span>
                  <span className="text-xs text-slate-400 truncate font-medium">
                    {eq.type}
                  </span>
                </div>

                {/* Expiry Badge */}
                <div className="mt-3">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${
                    calCheck.status === 'expired'
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      : calCheck.status === 'expiring_soon'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}>
                    {calCheck.status !== 'valid' && <AlertTriangle className="w-3.5 h-3.5" />}
                    <span>Calibration: {calCheck.formattedText}</span>
                  </span>
                </div>

                {/* Dates */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-1.5 text-xs text-slate-400">
                  <div className="flex items-center justify-between">
                    <span>Calibrated On:</span>
                    <strong className="text-slate-300">{formatDate(eq.calibrationDate)}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Calibration Due:</span>
                    <strong className="text-slate-300">{formatDate(eq.calibrationExpiryDate)}</strong>
                  </div>
                </div>
              </div>

              {/* Bottom Actions: Log Renewal & History */}
              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setHistoryTargetEquipment(eq)}
                  className="text-xs text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1 transition-colors"
                >
                  <History className="w-3.5 h-3.5" />
                  <span>History ({historyCount})</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenRenewalModal(eq)}
                  className="px-3 py-1.5 rounded-xl bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 font-bold text-xs border border-sky-500/30 flex items-center gap-1.5 active:scale-95 transition-all"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Renew Calibration</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Equipment Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center">
                  <Wrench className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-white">
                  {editingEquipment ? 'Edit Apparatus Record' : 'Register Inspection Apparatus'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 text-slate-200">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Apparatus / Instrument Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Olympus 27MG Ultrasonic Gauge"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-sky-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-semibold focus:outline-none focus:border-sky-500"
                  >
                    <option value="Ultrasonic">Ultrasonic (UT)</option>
                    <option value="Magnetic Particle">Magnetic Particle (MT)</option>
                    <option value="Liquid Penetrant">Liquid Penetrant (PT)</option>
                    <option value="Visual / Optical">Visual / Optical (VT)</option>
                    <option value="General">General Apparatus</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Serial Number *
                  </label>
                  <input
                    type="text"
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    placeholder="e.g. SN-OLY-27MG-9482"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm font-mono focus:outline-none focus:border-sky-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Apparatus Type / Description
                </label>
                <input
                  type="text"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  placeholder="e.g. Ultrasonic Digital Thickness Gauge"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Calibration Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Calibration Date *
                  </label>
                  <input
                    type="date"
                    value={calibrationDate}
                    onChange={(e) => setCalibrationDate(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-sky-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Calibration Expiry Date *
                  </label>
                  <input
                    type="date"
                    value={calibrationExpiryDate}
                    onChange={(e) => setCalibrationExpiryDate(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-sky-500"
                    required
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Traceability & Reference Standards
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Calibrated with 5-step carbon steel calibration block (2.5mm - 20mm)."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 font-semibold text-xs hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-500 text-white font-bold text-sm shadow-lg"
                >
                  {editingEquipment ? 'Update Apparatus' : 'Save Apparatus'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* Calibration Renewal Modal */}
      {isCalModalOpen && calTargetEquipment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <RefreshCw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">Log Calibration Renewal</h3>
                  <p className="text-xs text-slate-400">{calTargetEquipment.name} [{calTargetEquipment.serialNumber}]</p>
                </div>
              </div>
              <button
                onClick={() => setIsCalModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCalibrationRenewal} className="p-5 space-y-4 overflow-y-auto flex-1 text-slate-200">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Certificate Number *
                  </label>
                  <input
                    type="text"
                    value={certificateNumber}
                    onChange={(e) => setCertificateNumber(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono font-bold focus:outline-none focus:border-sky-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    SANAS Laboratory *
                  </label>
                  <input
                    type="text"
                    value={laboratory}
                    onChange={(e) => setLaboratory(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-sky-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    New Calibration Date *
                  </label>
                  <input
                    type="date"
                    value={newCalDate}
                    onChange={(e) => setNewCalDate(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-sky-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    New Expiry Date *
                  </label>
                  <input
                    type="date"
                    value={newExpiryDate}
                    onChange={(e) => setNewExpiryDate(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-sky-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Traceable Calibration Reference Standard
                </label>
                <input
                  type="text"
                  value={referenceStandard}
                  onChange={(e) => setReferenceStandard(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Metrologist / Technician Name
                </label>
                <input
                  type="text"
                  value={performedBy}
                  onChange={(e) => setPerformedBy(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Calibration Remarks & Zero-Drift Checks
                </label>
                <textarea
                  rows={2}
                  value={calNotes}
                  onChange={(e) => setCalNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setIsCalModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 font-semibold text-xs hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-bold text-sm shadow-lg flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Update Calibration Expiry</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* View Calibration History Modal */}
      {historyTargetEquipment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">Calibration History Log</h3>
                  <p className="text-xs text-slate-400">{historyTargetEquipment.name} [{historyTargetEquipment.serialNumber}]</p>
                </div>
              </div>
              <button
                onClick={() => setHistoryTargetEquipment(undefined)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3 overflow-y-auto flex-1 text-slate-200">
              {(historyTargetEquipment.calibrationHistory || []).map((h, idx) => (
                <div key={h.id || idx} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white font-mono text-xs text-sky-400">
                      {h.certificateNumber || 'CAL-RECORD'}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      {h.result || 'PASS'}
                    </span>
                  </div>

                  <div className="text-slate-300 font-semibold">{h.laboratory}</div>
                  <div className="text-slate-400">Standard: {h.referenceStandard}</div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                    <span>Cal: <strong>{formatDate(h.calDate)}</strong></span>
                    <span>Expiry: <strong className="text-emerald-400">{formatDate(h.calExpiryDate)}</strong></span>
                  </div>
                  {h.notes && <p className="text-slate-400 italic pt-0.5">{h.notes}</p>}
                </div>
              ))}
            </div>

            <div className="p-4 bg-slate-900 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setHistoryTargetEquipment(undefined)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-semibold hover:bg-slate-700"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
