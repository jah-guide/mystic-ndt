import React, { useEffect, useMemo, useState } from 'react';
import {
  Wrench, Plus, Edit3, X, CheckCircle2, History, RefreshCw, Search,
  ArrowLeft, ChevronRight, AlertTriangle, FileText, Upload
} from 'lucide-react';
import { Equipment, CalibrationRecord, Job, EquipmentIncident } from '../../types';
import { checkExpiry } from '../../utils/validation';
import { formatDate, formatDateTime } from '../../utils/formatters';
import { StorageService } from '../../services/storage';
import { PLACEHOLDER_CAL_DOC } from '../../services/seedWorkshopRoster';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { DateField } from '../common/DateField';

const EQUIPMENT_CATEGORIES: NonNullable<Equipment['category']>[] = [
  'Ultrasonic',
  'Magnetic Particle',
  'Liquid Penetrant',
  'Visual / Optical',
  'General'
];

interface EquipmentManagementProps {
  equipment: Equipment[];
  jobs: Job[];
  onEquipmentUpdated: () => void;
  onOpenJob?: (jobId: string) => void;
  focusEquipmentId?: string | null;
  onFocusConsumed?: () => void;
}

export const EquipmentManagement: React.FC<EquipmentManagementProps> = ({
  equipment,
  jobs,
  onEquipmentUpdated,
  onOpenJob,
  focusEquipmentId
}) => {
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string | null>(
    () => focusEquipmentId ?? null
  );

  useEffect(() => {
    if (!focusEquipmentId) return;
    setSelectedEquipmentId(focusEquipmentId);
  }, [focusEquipmentId]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | undefined>(undefined);
  const [isCalModalOpen, setIsCalModalOpen] = useState(false);
  const [calTargetEquipment, setCalTargetEquipment] = useState<Equipment | undefined>(undefined);

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [calFilter, setCalFilter] = useState<'ALL' | 'valid' | 'expiring_soon' | 'expired'>('ALL');

  const [name, setName] = useState('');
  const [type, setType] = useState('Ultrasonic Thickness Gauge');
  const [category, setCategory] = useState<Equipment['category']>('Ultrasonic');
  const [serialNumber, setSerialNumber] = useState('');
  const [calibrationDate, setCalibrationDate] = useState('');
  const [calibrationExpiryDate, setCalibrationExpiryDate] = useState('');
  const [notes, setNotes] = useState('');

  const [newCalDate, setNewCalDate] = useState(new Date().toISOString().split('T')[0]);
  const [newExpiryDate, setNewExpiryDate] = useState(
    new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [certificateNumber, setCertificateNumber] = useState('CAL-SANAS-2026-');
  const [laboratory, setLaboratory] = useState('SANAS Accredited Calibration Laboratory');
  const [referenceStandard, setReferenceStandard] = useState('5-step carbon steel calibration block');
  const [performedBy, setPerformedBy] = useState('K. Naidoo (SANAS Metrologist)');
  const [calNotes, setCalNotes] = useState('Zero-drift verified across all measurement ranges. Certified compliant.');

  const incidents = useMemo(() => StorageService.getIncidents(), [equipment]);
  const liveSelected = selectedEquipmentId
    ? equipment.find(e => e.id === selectedEquipmentId)
    : undefined;

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

    StorageService.updateEquipment({
      ...calTargetEquipment,
      calibrationDate: newCalDate,
      calibrationExpiryDate: newExpiryDate,
      calibrationHistory: [newCalRecord, ...(calTargetEquipment.calibrationHistory || [])]
    });
    onEquipmentUpdated();
    setIsCalModalOpen(false);
  };

  const filteredEquipment = equipment.filter(eq => {
    if (categoryFilter !== 'ALL' && eq.category !== categoryFilter) return false;
    if (calFilter !== 'ALL' && checkExpiry(eq.calibrationExpiryDate).status !== calFilter) return false;
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

  const validCount = equipment.filter(e => checkExpiry(e.calibrationExpiryDate).status === 'valid').length;
  const expiringSoonCount = equipment.filter(e => checkExpiry(e.calibrationExpiryDate).status === 'expiring_soon').length;
  const expiredCount = equipment.filter(e => checkExpiry(e.calibrationExpiryDate).status === 'expired').length;

  useBodyScrollLock(isModalOpen || isCalModalOpen);

  const renderEditModal = () => isModalOpen && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-3 sm:p-4 overflow-hidden">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <h3 className="font-bold text-base text-white">{editingEquipment ? 'Edit Apparatus Record' : 'Register Inspection Apparatus'}</h3>
          <button type="button" onClick={() => setIsModalOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto text-slate-200">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Apparatus Name *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-sky-500" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Category *</label>
              <select value={category} onChange={(e) => setCategory(e.target.value as Equipment['category'])}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-semibold focus:outline-none focus:border-sky-500">
                <option value="Ultrasonic">Ultrasonic (UT)</option>
                <option value="Magnetic Particle">Magnetic Particle (MT)</option>
                <option value="Liquid Penetrant">Liquid Penetrant (PT)</option>
                <option value="Visual / Optical">Visual / Optical (VT)</option>
                <option value="General">General Apparatus</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Serial Number *</label>
              <input type="text" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} required
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm font-mono focus:outline-none focus:border-sky-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Type / Description</label>
            <input type="text" value={type} onChange={(e) => setType(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-sky-500" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <DateField
              label="Calibration Date"
              required
              value={calibrationDate}
              onChange={setCalibrationDate}
            />
            <DateField
              label="Cal Expiry"
              required
              value={calibrationExpiryDate}
              onChange={setCalibrationExpiryDate}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Notes</label>
            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-sky-500" />
          </div>
          <div className="pt-4 border-t border-slate-800 flex justify-between">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 text-xs font-semibold">Cancel</button>
            <button type="submit" className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-500 text-white font-bold text-sm">{editingEquipment ? 'Update' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  );

  const renderCalModal = () => isCalModalOpen && calTargetEquipment && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-3 sm:p-4 overflow-hidden">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div>
            <h3 className="font-bold text-base text-white">Log Calibration Renewal</h3>
            <p className="text-xs text-slate-400">{calTargetEquipment.name}</p>
          </div>
          <button type="button" onClick={() => setIsCalModalOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSaveCalibrationRenewal} className="p-5 space-y-4 overflow-y-auto text-slate-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Certificate *</label>
              <input type="text" value={certificateNumber} onChange={(e) => setCertificateNumber(e.target.value)} required
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-sky-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Laboratory *</label>
              <input type="text" value={laboratory} onChange={(e) => setLaboratory(e.target.value)} required
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-sky-500" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <DateField
              label="New Cal Date"
              required
              value={newCalDate}
              onChange={setNewCalDate}
            />
            <DateField
              label="New Expiry"
              required
              value={newExpiryDate}
              onChange={setNewExpiryDate}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Reference Standard</label>
            <input type="text" value={referenceStandard} onChange={(e) => setReferenceStandard(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-sky-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Performed By</label>
            <input type="text" value={performedBy} onChange={(e) => setPerformedBy(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-sky-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Remarks</label>
            <textarea rows={2} value={calNotes} onChange={(e) => setCalNotes(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-sky-500" />
          </div>
          <div className="pt-4 border-t border-slate-800 flex justify-between">
            <button type="button" onClick={() => setIsCalModalOpen(false)} className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 text-xs font-semibold">Cancel</button>
            <button type="submit" className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-bold text-sm inline-flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Update Calibration
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  if (liveSelected) {
    const eq = liveSelected;
    const calCheck = checkExpiry(eq.calibrationExpiryDate);
    const linkedJobs = jobs.filter(j => (j.equipmentIds || []).includes(eq.id));
    const eqIncidents: EquipmentIncident[] = incidents.filter(i => i.equipmentId === eq.id);

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <button type="button" onClick={() => setSelectedEquipmentId(null)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-400 hover:text-sky-300 mb-2">
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to equipment
            </button>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">{eq.name}</h1>
            <p className="text-sm text-sky-400 font-mono mt-0.5">{eq.serialNumber}</p>
            <p className="text-xs text-slate-400 mt-1">{eq.category} · {eq.type}</p>
          </div>
          <div className="flex flex-wrap gap-2 self-start">
            <button type="button" onClick={() => handleOpenRenewalModal(eq)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 text-sm font-bold hover:bg-emerald-600/30">
              <RefreshCw className="w-4 h-4" /> Renew cal
            </button>
            <button type="button" onClick={() => handleOpenModal(eq)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-700 text-slate-200 text-sm font-bold hover:bg-slate-800">
              <Edit3 className="w-4 h-4" /> Edit
            </button>
          </div>
        </div>

        {calCheck.status === 'expired' && (
          <div className="flex items-start gap-2 rounded-xl border border-rose-500/40 bg-rose-950/30 px-4 py-3 text-sm text-rose-300">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="font-semibold">Expired calibration — do not deploy on new jobs until renewed.</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${
                calCheck.status === 'expired' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  : calCheck.status === 'expiring_soon' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              }`}>
                Cal: {calCheck.formattedText} ({formatDate(eq.calibrationExpiryDate)})
              </span>
              <div className="text-xs text-slate-400 space-y-1">
                <div>Last cal: <span className="text-slate-200">{formatDate(eq.calibrationDate)}</span></div>
                <div>Checkout: <span className="text-slate-200">{eq.checkoutStatus || 'Available'}</span></div>
                {eq.checkedOutTo && <div>Checked out to: <span className="text-slate-200">{eq.checkedOutTo}</span></div>}
                {eq.currentJobNumber && <div>Current job: <span className="text-sky-300 font-mono">{eq.currentJobNumber}</span></div>}
                {eq.status && <div>Status: <span className="text-slate-200">{eq.status}</span></div>}
              </div>
              {eq.notes && <p className="text-xs text-slate-400 pt-2 border-t border-slate-800">{eq.notes}</p>}
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <FileText className="w-3.5 h-3.5" /> Calibration certificate document
              </h3>
              {eq.calibrationCertificate ? (
                <>
                  <div className="text-xs text-slate-400 space-y-1">
                    <div>Cert #: <span className="font-mono text-sky-300">{eq.calibrationCertificate.certificateNumber}</span></div>
                    <div>Lab: <span className="text-slate-200">{eq.calibrationCertificate.laboratory}</span></div>
                    {eq.calibrationCertificate.uploadedAt && (
                      <div>Filed: <span className="text-slate-200">{formatDateTime(eq.calibrationCertificate.uploadedAt)}</span></div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {eq.calibrationCertificate.documentDataUrl && (
                      <a
                        href={eq.calibrationCertificate.documentDataUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600/20 border border-sky-500/40 text-sky-300 text-xs font-bold"
                      >
                        <FileText className="w-3.5 h-3.5" /> View document
                      </a>
                    )}
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 text-xs font-bold cursor-pointer hover:bg-slate-800">
                      <Upload className="w-3.5 h-3.5" /> Upload mock
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > 400_000) {
                            alert('Demo limit: keep uploads under ~400KB (localStorage).');
                            return;
                          }
                          const reader = new FileReader();
                          reader.onload = () => {
                            StorageService.updateEquipment({
                              ...eq,
                              calibrationCertificate: {
                                certificateNumber: eq.calibrationCertificate?.certificateNumber || `CAL-UPLOAD-${Date.now()}`,
                                laboratory: eq.calibrationCertificate?.laboratory || 'Uploaded lab certificate',
                                documentDataUrl: String(reader.result),
                                documentFileName: file.name,
                                uploadedAt: new Date().toISOString()
                              }
                            });
                            onEquipmentUpdated();
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                    </label>
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-slate-500">No calibration certificate document on file.</p>
                  <button
                    type="button"
                    onClick={() => {
                      StorageService.updateEquipment({
                        ...eq,
                        calibrationCertificate: {
                          certificateNumber: `CAL-SANAS-${eq.id}`,
                          laboratory: 'SANAS Accredited Metrology Lab',
                          documentDataUrl: PLACEHOLDER_CAL_DOC,
                          documentFileName: 'cal-cert-demo.svg',
                          uploadedAt: new Date().toISOString()
                        }
                      });
                      onEquipmentUpdated();
                    }}
                    className="text-xs font-bold text-sky-400 hover:text-sky-300"
                  >
                    Attach demo certificate
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                <History className="w-3.5 h-3.5" /> Calibration history
              </h3>
              <div className="space-y-2">
                {(eq.calibrationHistory || []).length === 0 && <p className="text-xs text-slate-500">No history records.</p>}
                {(eq.calibrationHistory || []).map((h, idx) => (
                  <div key={h.id || idx} className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                    <div className="flex justify-between gap-2">
                      <span className="font-mono text-sky-400 font-bold">{h.certificateNumber}</span>
                      <span className="text-emerald-400 font-bold">{h.result}</span>
                    </div>
                    <div className="text-slate-300">{h.laboratory}</div>
                    <div className="text-slate-500">Cal {formatDate(h.calDate)} → Exp {formatDate(h.calExpiryDate)}</div>
                    {h.notes && <p className="text-slate-400 italic">{h.notes}</p>}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Traceability</h3>
              <div className="space-y-2">
                {(eq.traceabilityLog || []).length === 0 && <p className="text-xs text-slate-500">No checkout events.</p>}
                {(eq.traceabilityLog || []).map(t => (
                  <div key={t.id} className="text-xs px-3 py-2 rounded-lg bg-slate-950 border border-slate-800">
                    <div className="font-semibold text-slate-200">{t.action} · {formatDateTime(t.timestamp)}</div>
                    <div className="text-slate-400">{t.notes || t.jobNumber || t.inspectorName || '—'}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Linked jobs ({linkedJobs.length})</h3>
              <div className="space-y-2">
                {linkedJobs.length === 0 && <p className="text-xs text-slate-500">Not linked to any jobs.</p>}
                {linkedJobs.map(j => (
                  <button key={j.id} type="button" onClick={() => onOpenJob?.(j.id)}
                    className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-sky-500/40 text-left">
                    <div>
                      <div className="font-bold text-sm text-white">{j.jobNumber}</div>
                      <div className="text-[11px] text-slate-400">{j.method} · {j.status}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Incidents ({eqIncidents.length})</h3>
              <div className="space-y-2">
                {eqIncidents.length === 0 && <p className="text-xs text-slate-500">No incidents recorded.</p>}
                {eqIncidents.map(inc => (
                  <div key={inc.id} className="px-3 py-2.5 rounded-xl bg-rose-950/20 border border-rose-500/20 text-xs">
                    <div className="font-bold text-rose-300">{inc.type} · {inc.status}</div>
                    <div className="text-slate-300 mt-0.5">{inc.description}</div>
                    <div className="text-slate-500 mt-1">{inc.reportedByName} · {formatDateTime(inc.reportedAt)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {renderEditModal()}
        {renderCalModal()}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Equipment & Calibration Registrar</h1>
          <p className="text-xs sm:text-sm text-slate-400">Compact registry — open a profile for cal history, jobs, and incidents</p>
        </div>
        <button type="button" onClick={() => handleOpenModal()}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-500 text-white font-bold text-sm shadow-lg shadow-sky-500/25 self-start sm:self-auto">
          <Plus className="w-4 h-4" />
          Register Equipment
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <button type="button" onClick={() => setCalFilter(calFilter === 'valid' ? 'ALL' : 'valid')}
          className={`bg-slate-900 border p-4 rounded-2xl text-left ${calFilter === 'valid' ? 'border-emerald-400/60 ring-1 ring-emerald-500/30' : 'border-slate-800'}`}>
          <span className="text-[11px] uppercase font-bold text-slate-400 block">Valid / Calibrated</span>
          <div className="text-2xl font-black text-emerald-400 mt-0.5">{validCount}</div>
        </button>
        <button type="button" onClick={() => setCalFilter(calFilter === 'expiring_soon' ? 'ALL' : 'expiring_soon')}
          className={`bg-slate-900 border p-4 rounded-2xl text-left bg-amber-950/10 ${calFilter === 'expiring_soon' ? 'border-amber-400/60 ring-1 ring-amber-500/30' : 'border-amber-500/30'}`}>
          <span className="text-[11px] uppercase font-bold text-amber-400 block">Expiring Soon</span>
          <div className="text-2xl font-black text-amber-400 mt-0.5">{expiringSoonCount}</div>
        </button>
        <button type="button" onClick={() => setCalFilter(calFilter === 'expired' ? 'ALL' : 'expired')}
          className={`bg-slate-900 border p-4 rounded-2xl text-left bg-rose-950/10 ${calFilter === 'expired' ? 'border-rose-400/60 ring-1 ring-rose-500/30' : 'border-rose-500/30'}`}>
          <span className="text-[11px] uppercase font-bold text-rose-400 block">Expired Calibration</span>
          <div className="text-2xl font-black text-rose-400 mt-0.5">{expiredCount}</div>
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search apparatus, serial, type…"
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-sky-500" />
          </div>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-slate-300 focus:outline-none focus:border-sky-500">
            <option value="ALL">All Categories</option>
            <option value="Ultrasonic">Ultrasonic (UT)</option>
            <option value="Magnetic Particle">Magnetic Particle (MT)</option>
            <option value="Liquid Penetrant">Liquid Penetrant (PT)</option>
            <option value="Visual / Optical">Visual / Optical (VT)</option>
            <option value="General">General Apparatus</option>
          </select>
        </div>
        <div className="flex flex-wrap gap-2">
          {([
            { id: 'ALL' as const, label: 'All cal' },
            { id: 'valid' as const, label: 'In calibration' },
            { id: 'expiring_soon' as const, label: 'Due soon' },
            { id: 'expired' as const, label: 'Expired' }
          ]).map(chip => (
            <button key={chip.id} type="button" onClick={() => setCalFilter(chip.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
                calFilter === chip.id ? 'bg-slate-800 border-sky-400/50 text-sky-200' : 'bg-slate-950 border-slate-700 text-slate-400'
              }`}>
              {chip.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-500">Showing {filteredEquipment.length} of {equipment.length}</p>
      </div>

      <div className="space-y-6">
        {filteredEquipment.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 p-8 text-center text-sm text-slate-400">
            No equipment matches these filters.
          </div>
        )}
        {EQUIPMENT_CATEGORIES.filter(cat =>
          categoryFilter === 'ALL' || categoryFilter === cat
        ).map(cat => {
          const items = filteredEquipment.filter(eq => (eq.category || 'General') === cat);
          if (items.length === 0) return null;
          return (
            <div key={cat} className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-sm font-black uppercase tracking-wider text-slate-300">{cat}</h2>
                <span className="text-[11px] font-bold text-slate-500">{items.length} item{items.length === 1 ? '' : 's'}</span>
              </div>
              {items.map(eq => {
                const calCheck = checkExpiry(eq.calibrationExpiryDate);
                return (
                  <button
                    key={eq.id}
                    type="button"
                    onClick={() => setSelectedEquipmentId(eq.id)}
                    className="w-full flex items-center gap-3 sm:gap-4 px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-sky-500/40 text-left transition-colors group"
                  >
                    <div className="w-9 h-9 rounded-lg bg-sky-500/15 text-sky-400 flex items-center justify-center shrink-0">
                      <Wrench className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-extrabold text-white truncate">{eq.name}</div>
                      <div className="text-xs text-sky-400 font-mono truncate">{eq.serialNumber}</div>
                    </div>
                    <span className={`hidden sm:inline-flex px-2 py-1 rounded-lg text-[10px] font-bold shrink-0 ${
                      calCheck.status === 'expired' ? 'bg-rose-500/20 text-rose-400'
                        : calCheck.status === 'expiring_soon' ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-emerald-500/20 text-emerald-400'
                    }`}>
                      {calCheck.status === 'expired' ? 'Expired' : calCheck.status === 'expiring_soon' ? 'Due soon' : 'In cal'}
                    </span>
                    <span className="hidden lg:inline text-[10px] text-slate-500 shrink-0">{eq.checkoutStatus || 'Available'}</span>
                    <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-sky-400 shrink-0" />
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      {renderEditModal()}
      {renderCalModal()}
    </div>
  );
};
