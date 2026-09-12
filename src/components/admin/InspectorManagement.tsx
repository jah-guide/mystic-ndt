import React, { useState } from 'react';
import { Award, Plus, Edit3, Mail, Phone, Calendar, ShieldCheck, AlertTriangle, X } from 'lucide-react';
import { Inspector, NdtMethod } from '../../types';
import { checkExpiry } from '../../utils/validation';
import { formatDate } from '../../utils/formatters';
import { Badge } from '../common/Badge';
import { StorageService } from '../../services/storage';

interface InspectorManagementProps {
  inspectors: Inspector[];
  onInspectorUpdated: () => void;
}

export const InspectorManagement: React.FC<InspectorManagementProps> = ({
  inspectors,
  onInspectorUpdated
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInspector, setEditingInspector] = useState<Inspector | undefined>(undefined);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [certification, setCertification] = useState('SAQCC / ISO 9712 Level 2');
  const [certNumber, setCertNumber] = useState('');
  const [level, setLevel] = useState<'Level 1' | 'Level 2' | 'Level 3'>('Level 2');
  const [certExpiryDate, setCertExpiryDate] = useState('');
  const [methods, setMethods] = useState<NdtMethod[]>(['UT']);
  const [notes, setNotes] = useState('');

  const handleOpenModal = (insp?: Inspector) => {
    if (insp) {
      setEditingInspector(insp);
      setFullName(insp.fullName);
      setEmail(insp.email);
      setPhone(insp.phone);
      setCertification(insp.certification);
      setCertNumber(insp.certNumber);
      setLevel(insp.level || 'Level 2');
      setCertExpiryDate(insp.certExpiryDate);
      setMethods([...insp.methods]);
      setNotes(insp.notes || '');
    } else {
      setEditingInspector(undefined);
      setFullName('');
      setEmail('');
      setPhone('');
      setCertification('SAQCC / ISO 9712 Level 2');
      setCertNumber('SAQCC-NDT-');
      setLevel('Level 2');
      setCertExpiryDate(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
      setMethods(['UT', 'MT']);
      setNotes('');
    }
    setIsModalOpen(true);
  };

  const toggleMethod = (m: NdtMethod) => {
    if (methods.includes(m)) {
      if (methods.length === 1) {
        alert('Inspector must be qualified in at least one NDT method.');
        return;
      }
      setMethods(methods.filter(item => item !== m));
    } else {
      setMethods([...methods, m]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !certNumber.trim()) return;

    if (editingInspector) {
      StorageService.updateInspector({
        ...editingInspector,
        fullName,
        email,
        phone,
        certification,
        certNumber,
        level,
        certExpiryDate,
        methods,
        notes
      });
    } else {
      StorageService.addInspector({
        fullName,
        email,
        phone,
        certification,
        certNumber,
        level,
        certExpiryDate,
        methods,
        notes
      });
    }

    onInspectorUpdated();
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            NDT Inspectors & Technical Authorities
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Track inspector qualifications, ISO 9712 / SAQCC certs, Level 2 examiners and Level 3 QA authorities
          </p>
        </div>

        <button
          type="button"
          onClick={() => handleOpenModal()}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-500 hover:from-sky-500 hover:to-cyan-400 text-white font-bold text-sm shadow-lg shadow-sky-500/25 active:scale-95 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Inspector</span>
        </button>
      </div>

      {/* Inspectors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {inspectors.map(insp => {
          const expiryCheck = checkExpiry(insp.certExpiryDate);
          const isL3 = insp.level === 'Level 3';

          return (
            <div
              key={insp.id}
              className={`bg-slate-900 border rounded-2xl p-5 shadow-xl flex flex-col justify-between transition-all ${
                isL3 ? 'border-amber-500/40 bg-gradient-to-b from-amber-950/15 to-slate-900' : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-base text-white">{insp.fullName}</h3>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                        isL3 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                      }`}>
                        {insp.level || 'Level 2'}
                      </span>
                    </div>
                    <p className="text-xs text-sky-400 font-medium font-mono mt-0.5">{insp.certNumber}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenModal(insp)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                </div>

                {/* Expiry Warning Chip */}
                <div className="mt-3">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${
                    expiryCheck.status === 'expired'
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      : expiryCheck.status === 'expiring_soon'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}>
                    {expiryCheck.status !== 'valid' && <AlertTriangle className="w-3.5 h-3.5" />}
                    <span>Cert: {expiryCheck.formattedText} ({formatDate(insp.certExpiryDate)})</span>
                  </span>
                </div>

                {/* Qualified Methods */}
                <div className="mt-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                    Qualified Methods
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {insp.methods.map(m => (
                      <Badge key={m} variant="method" value={m} size="sm">
                        {m}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Contact */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-1.5 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    <span className="truncate">{insp.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    <span>{insp.phone}</span>
                  </div>
                </div>
              </div>

              {insp.notes && (
                <div className="mt-4 pt-3 border-t border-slate-800 text-xs text-slate-400 line-clamp-2">
                  {insp.notes}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Inspector Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center">
                  <Award className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-white">
                  {editingInspector ? 'Edit Inspector' : 'Add Certified Inspector'}
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Thabo Mokoena"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-sky-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Level Tier *
                  </label>
                  <select
                    value={level}
                    onChange={(e) => setLevel(e.target.value as any)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-bold focus:outline-none focus:border-sky-500"
                  >
                    <option value="Level 1">Level 1 Tech</option>
                    <option value="Level 2">Level 2 Inspector</option>
                    <option value="Level 3">Level 3 QA Verifier</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="thabo@apexndt.co.za"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Phone
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+27 73 892 4410"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {/* Certification & Expiry */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Cert Number *
                  </label>
                  <input
                    type="text"
                    value={certNumber}
                    onChange={(e) => setCertNumber(e.target.value)}
                    placeholder="e.g. SAQCC-NDT-8492"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm font-mono focus:outline-none focus:border-sky-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Cert Expiry Date *
                  </label>
                  <input
                    type="date"
                    value={certExpiryDate}
                    onChange={(e) => setCertExpiryDate(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-sky-500"
                    required
                  />
                </div>
              </div>

              {/* Method Qualifications */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Qualified NDT Methods (Select All That Apply)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['UT', 'MT', 'PT', 'VT'] as NdtMethod[]).map(m => {
                    const isSelected = methods.includes(m);
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => toggleMethod(m)}
                        className={`py-2 rounded-xl font-black text-xs transition-all active:scale-95 ${
                          isSelected
                            ? 'bg-sky-600 text-white ring-2 ring-sky-400 shadow-md shadow-sky-600/30'
                            : 'bg-slate-950 text-slate-400 hover:bg-slate-800 border border-slate-800'
                        }`}
                      >
                        {m}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Qualifications & Experience Notes
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Ultrasonic flaw detection and thickness sizing specialist."
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
                  {editingInspector ? 'Update Inspector' : 'Save Inspector'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
