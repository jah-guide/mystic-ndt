import React, { useState, useEffect } from 'react';
import { X, Camera, Plus, Trash2, CheckCircle2, XCircle, MinusCircle, Sparkles, Ruler } from 'lucide-react';
import { InspectionItem, ItemResult, NdtMethod, InspectionPhoto, AcceptanceCriterion } from '../../types';
import { StorageService } from '../../services/storage';
import { isItemEvaluated, compareReadingToCriterion } from '../../utils/validation';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';

interface InspectionItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: InspectionItem, addAnother: boolean) => void;
  method: NdtMethod;
  existingItem?: InspectionItem;
  nextItemNumberSuggestion?: string;
  /** When true, hide Pass/Fail/N/A — Level 1 findings-only capture */
  findingsOnly?: boolean;
  /** When true, findings are locked; only Pass/Fail/N/A may change (supervisor) */
  evaluateOnly?: boolean;
  /** Read-only detail view (e.g. L3 / Admin) — no save */
  viewOnly?: boolean;
  /** Prefer frozen job snapshot criteria when provided */
  criteriaLibrary?: AcceptanceCriterion[];
}

function defaultUnit(method: NdtMethod): string {
  return method === 'UT' || method === 'MT' || method === 'PT' ? 'mm' : 'mm';
}

function defaultAcceptance(method: NdtMethod): string {
  if (method === 'UT') return 'Min 5.80mm / No planar flaws';
  if (method === 'MT') return 'No cracks or linear indications > 1.5mm';
  if (method === 'PT') return 'No relevant linear indications > 1.5mm';
  return 'ASME B31.3 Table 341.3.2';
}

export const InspectionItemModal: React.FC<InspectionItemModalProps> = ({
  isOpen,
  onClose,
  onSave,
  method,
  existingItem,
  nextItemNumberSuggestion = 'Weld 001',
  findingsOnly = false,
  evaluateOnly = false,
  viewOnly = false,
  criteriaLibrary
}) => {
  useBodyScrollLock(isOpen);

  const [itemNumber, setItemNumber] = useState('');
  const [description, setDescription] = useState('');
  const [reading, setReading] = useState('');
  const [unit, setUnit] = useState(defaultUnit(method));
  const [criterionId, setCriterionId] = useState('');
  const [acceptanceCriteria, setAcceptanceCriteria] = useState('');
  const [result, setResult] = useState<ItemResult>('Pending');
  const [indication, setIndication] = useState('');
  const [notes, setNotes] = useState('');
  const [probe, setProbe] = useState('');
  const [couplant, setCouplant] = useState('');
  const [technique, setTechnique] = useState('');
  const [location, setLocation] = useState('');
  const [lightLevel, setLightLevel] = useState('');
  const [observation, setObservation] = useState('');
  const [photos, setPhotos] = useState<InspectionPhoto[]>([]);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [operatorNote, setOperatorNote] = useState('');
  const fieldsLocked = evaluateOnly || viewOnly;

  const libraryCriteria = (criteriaLibrary?.length
    ? criteriaLibrary
    : StorageService.getProcedures().flatMap(p => p.acceptanceCriteria || [])
  ).filter(c => c.isActive !== false && (!c.method || c.method === method));

  const selectedCriterion: AcceptanceCriterion | undefined =
    libraryCriteria.find(c => c.id === criterionId) ||
    criteriaLibrary?.find(c => c.id === criterionId) ||
    StorageService.getProcedures()
      .flatMap(p => p.acceptanceCriteria || [])
      .find(c => c.id === criterionId);

  const readingCompare = compareReadingToCriterion(reading, unit, selectedCriterion);

  // Hydrate from the submitted item whenever the modal opens (supervisor must see L1 findings)
  useEffect(() => {
    if (!isOpen) return;

    if (existingItem) {
      setItemNumber(existingItem.itemNumber || '');
      setDescription(existingItem.description || '');
      setReading(existingItem.reading || '');
      setUnit(existingItem.unit || defaultUnit(method));
      setCriterionId(existingItem.criterionId || '');
      setAcceptanceCriteria(existingItem.acceptanceCriteria || '');
      setResult(existingItem.result || 'Pending');
      setIndication(existingItem.indication || '');
      setNotes(existingItem.notes || '');
      setProbe(existingItem.methodDetails?.probe || '');
      setCouplant(existingItem.methodDetails?.couplant || '');
      setTechnique(existingItem.methodDetails?.technique || '');
      setLocation(existingItem.methodDetails?.location || '');
      setLightLevel(existingItem.methodDetails?.lightLevel || '');
      setObservation(existingItem.methodDetails?.observation || '');
      setPhotos(existingItem.photos ? [...existingItem.photos] : []);
      setOperatorNote(existingItem.operatorNote || '');
      return;
    }

    // New item defaults (technician capture)
    setItemNumber(nextItemNumberSuggestion);
    setDescription('');
    setReading('');
    setUnit(defaultUnit(method));
    setCriterionId('');
    setAcceptanceCriteria(defaultAcceptance(method));
    setResult('Pending');
    setIndication('');
    setNotes('');
    setProbe(method === 'UT' ? 'Olympus 5MHz 0.5" Dual Element' : '');
    setCouplant(method === 'UT' ? 'Ultragel II / Cellulose' : '');
    setTechnique(
      method === 'MT'
        ? 'AC Contour Yoke (Black ink on White Contrast)'
        : method === 'PT'
        ? 'Dye Penetrant Solvent Removable (Level 2)'
        : ''
    );
    setLocation('');
    setLightLevel(method === 'MT' || method === 'PT' || method === 'VT' ? '1150 Lux' : '');
    setObservation('');
    setPhotos([]);
    setOperatorNote('');
  }, [isOpen, existingItem?.id, existingItem?.updatedAt, method, nextItemNumberSuggestion, evaluateOnly]);

  if (!isOpen) return null;

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessingPhoto(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const compressedDataUrl = await StorageService.compressImageFile(file, 1000, 0.75);
        const newPhoto: InspectionPhoto = {
          id: 'photo-' + Date.now() + '-' + i,
          dataUrl: compressedDataUrl,
          caption: `${itemNumber} inspection photo`,
          timestamp: new Date().toISOString()
        };
        setPhotos(prev => [...prev, newPhoto]);
      }
    } catch (err) {
      console.error('Error processing image:', err);
    } finally {
      setIsProcessingPhoto(false);
      e.target.value = '';
    }
  };

  const handleRemovePhoto = (photoId: string) => {
    setPhotos(prev => prev.filter(p => p.id !== photoId));
  };

  const handleUpdatePhotoCaption = (photoId: string, caption: string) => {
    setPhotos(prev => prev.map(p => p.id === photoId ? { ...p, caption } : p));
  };

  const handleSubmit = (addAnother: boolean) => {
    if (!itemNumber.trim() && !evaluateOnly) return;

    if (evaluateOnly && existingItem) {
      if (result !== 'Pass' && result !== 'Fail' && result !== 'N/A') {
        alert('Select Pass, Fail, or N/A to evaluate this item.');
        return;
      }
      // Findings are immutable — only the evaluation result changes
      onSave({
        ...existingItem,
        result,
        updatedAt: new Date().toISOString()
      }, false);
      return;
    }

    const finalResult: ItemResult = findingsOnly ? 'Pending' : result;
    if (!findingsOnly && !isItemEvaluated(finalResult)) {
      alert('Select Pass, Fail, or N/A before saving this item.');
      return;
    }

    const item: InspectionItem = {
      id: existingItem?.id || 'item-' + Date.now(),
      itemNumber: itemNumber.trim(),
      description: description.trim() || `${method} Inspection point`,
      reading: reading.trim(),
      unit: unit.trim(),
      acceptanceCriteria: acceptanceCriteria.trim(),
      criterionId: criterionId || undefined,
      constraintFlags: readingCompare.flags.length ? readingCompare.flags : undefined,
      operatorNote: operatorNote.trim() || undefined,
      result: finalResult,
      indication: finalResult === 'Fail' ? (indication || 'Non-conformance recorded') : indication,
      notes: notes.trim(),
      methodDetails: {
        thickness: reading.trim(),
        probe: method === 'UT' ? probe : undefined,
        couplant: method === 'UT' ? couplant : undefined,
        technique: (method === 'MT' || method === 'PT') ? technique : undefined,
        location: location || undefined,
        lightLevel: (method === 'MT' || method === 'PT' || method === 'VT') ? lightLevel : undefined,
        observation: method === 'VT' ? observation : undefined
      },
      photos,
      updatedAt: new Date().toISOString()
    };

    onSave(item, addAnother);

    if (addAnother) {
      const match = itemNumber.match(/(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10) + 1;
        const padded = num.toString().padStart(match[1].length, '0');
        const nextNumStr = itemNumber.replace(/(\d+)$/, padded);
        setItemNumber(nextNumStr);
      } else {
        setItemNumber(`Weld ${String(Date.now()).slice(-3)}`);
      }
      setReading('');
      setIndication('');
      setNotes('');
      setPhotos([]);
      setResult('Pending');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/85 backdrop-blur-sm p-0 sm:p-4 overflow-hidden">
      <div className="bg-slate-900 border border-slate-800 w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[94vh] overflow-hidden animate-in fade-in slide-in-from-bottom duration-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900 sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-sm border border-sky-500/30">
              {method}
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                {viewOnly
                  ? 'Inspection Point Details'
                  : evaluateOnly
                  ? 'Evaluate Inspection Point'
                  : existingItem
                  ? 'Edit Inspection Point'
                  : 'Record Inspection Point'}
              </h3>
              <p className="text-xs text-slate-400">
                {viewOnly
                  ? 'Read-only view of findings, evaluation, and evidential photos'
                  : evaluateOnly
                  ? 'Findings are locked — set Pass / Fail / N/A only'
                  : findingsOnly
                  ? 'Record readings, indications, and photos — supervisor will evaluate Pass/Fail'
                  : 'Enter measurement readings, evaluation result, and evidential photos'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Body */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1 text-slate-200">
          {(evaluateOnly || viewOnly) && (
            <div className={`p-3 rounded-xl text-xs space-y-1 border ${
              viewOnly
                ? 'bg-slate-800/60 border-slate-600 text-slate-300'
                : 'bg-violet-500/10 border-violet-500/30 text-violet-200'
            }`}>
              <p className={`font-semibold ${viewOnly ? 'text-slate-100' : 'text-violet-100'}`}>
                {viewOnly ? 'Read-only inspection record' : 'Level 1 findings (read-only)'}
              </p>
              <p>
                {viewOnly
                  ? 'Findings, evaluation, and photos are shown for review. No edits in this view.'
                  : 'Review the technician’s recorded reading, unit, criteria, notes, and photos below. You may only set Pass / Fail / N/A — you cannot change their measurements.'}
              </p>
            </div>
          )}
          
          {/* Item Number & Description */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Item / Component / Weld ID *
              </label>
              <input
                type="text"
                value={itemNumber}
                onChange={(e) => setItemNumber(e.target.value)}
                placeholder="e.g. Weld 001, Pipe Section A"
                readOnly={fieldsLocked}
                className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-medium focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 ${fieldsLocked ? 'opacity-70 cursor-not-allowed' : ''}`}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Description & Location
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. 6-inch Sch 40 Butt Weld / 12 o'clock"
                readOnly={fieldsLocked}
                className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-medium focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 ${fieldsLocked ? 'opacity-70 cursor-not-allowed' : ''}`}
              />
            </div>
          </div>

          {/* Quick presets for description */}
          {!fieldsLocked && (
          <div className="flex flex-wrap gap-1.5 items-center">
            <span className="text-[11px] text-slate-500 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Quick fill:
            </span>
            {['6-inch Butt Weld', 'Fillet Weld Toe', 'Elbow to Pipe', 'Flange Face', 'Pressure Shell Plate', 'Nozzle Neck'].map(chip => (
              <button
                key={chip}
                type="button"
                onClick={() => setDescription(chip)}
                className="px-2 py-0.5 rounded-md bg-slate-800/80 hover:bg-slate-700 text-[11px] text-slate-300 border border-slate-700 transition-colors"
              >
                + {chip}
              </button>
            ))}
          </div>
          )}

          {/* Clean, Non-Overflowing Reading & Unit Module */}
          <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-700 shadow-inner space-y-3.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                <Ruler className="w-4 h-4" />
                <span>Measured Reading / Value</span>
              </label>
              <span className="text-[11px] text-slate-400">
                {method === 'UT' ? 'Thickness / Sizing' : method === 'MT' || method === 'PT' ? 'Indication / Flaw Size' : 'Dimension / Depth'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Reading Input */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Reading Value</label>
                <input
                  type="text"
                  value={reading}
                  onChange={(e) => setReading(e.target.value)}
                  placeholder={method === 'UT' ? 'e.g. 7.12' : method === 'MT' ? 'e.g. 0 (or crack length 18)' : 'e.g. 0.5'}
                  readOnly={fieldsLocked}
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono font-bold text-base focus:outline-none focus:border-sky-500 ${fieldsLocked ? 'opacity-70 cursor-not-allowed' : ''}`}
                />
              </div>

              {/* Unit Input + Wrapped Chips */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Measurement Unit</label>
                <input
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="Unit (mm, dB, Lux)"
                  readOnly={fieldsLocked}
                  className={`w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-semibold text-xs focus:outline-none focus:border-sky-500 mb-1.5 ${fieldsLocked ? 'opacity-70 cursor-not-allowed' : ''}`}
                />
                {!fieldsLocked && (
                <div className="flex flex-wrap gap-1.5">
                  {['mm', 'dB', 'Lux', 'kg', '%'].map(u => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setUnit(u)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                        unit === u ? 'bg-sky-600 text-white shadow-sm' : 'bg-slate-850 text-slate-400 hover:text-slate-200 border border-slate-800'
                      }`}
                    >
                      {u}
                    </button>
                  ))}
                </div>
                )}
              </div>
            </div>

            {/* Acceptance Criteria */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">Acceptance Standard / Criteria</label>
              {!fieldsLocked && libraryCriteria.length > 0 && (
                <select
                  value={criterionId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setCriterionId(id);
                    const match = libraryCriteria.find(c => c.id === id);
                    if (match) setAcceptanceCriteria(match.description || match.label);
                  }}
                  className="w-full mb-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-sky-500"
                >
                  <option value="">— Pick from criteria library (or type below) —</option>
                  {libraryCriteria.map(c => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              )}
              <input
                type="text"
                value={acceptanceCriteria}
                onChange={(e) => setAcceptanceCriteria(e.target.value)}
                placeholder="e.g. ASME B31.3 Table 341.3.2 / Min 5.80mm"
                readOnly={fieldsLocked}
                className={`w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:border-sky-500 ${fieldsLocked ? 'opacity-70 cursor-not-allowed' : ''} ${readingCompare.likelyFail ? 'border-rose-500/50' : ''}`}
              />
              {readingCompare.status === 'outside' && (
                <div className="mt-2 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/40 text-[11px] text-rose-200 space-y-1">
                  <p className="font-bold text-rose-100">Outside acceptance band — likely Fail (advisory)</p>
                  {readingCompare.reasons.map((r, i) => (
                    <p key={i}>{r}</p>
                  ))}
                  <p className="text-rose-300/80">
                    {findingsOnly
                      ? 'Result stays Pending — supervisor will evaluate. This flag is decision-support only.'
                      : evaluateOnly
                      ? 'Evaluation aid for supervisor — you still choose Pass / Fail / N/A explicitly.'
                      : 'Advisory only — you still set Pass / Fail / N/A explicitly.'}
                  </p>
                  {!fieldsLocked && (
                    <input
                      type="text"
                      value={operatorNote}
                      onChange={(e) => setOperatorNote(e.target.value)}
                      placeholder="Optional note (e.g. re-check pending / surface irregularity)"
                      className="mt-1 w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-rose-500/30 text-rose-100 text-xs"
                    />
                  )}
                  {(evaluateOnly || viewOnly) && existingItem?.operatorNote && (
                    <p className="text-rose-100/90">L1 note: {existingItem.operatorNote}</p>
                  )}
                </div>
              )}
              {readingCompare.status === 'within' && selectedCriterion?.ruleType && selectedCriterion.ruleType !== 'TextOnlyLegacy' && (
                <p className="mt-1.5 text-[11px] text-emerald-400/90">Reading is within the structured acceptance band.</p>
              )}
            </div>
          </div>

          {/* Evaluation — L1 findings-only hides this; supervisor evaluateOnly shows it with locked findings */}
          {findingsOnly && !evaluateOnly && !viewOnly ? (
            <div className="p-3.5 rounded-xl bg-violet-500/10 border border-violet-500/30 space-y-2">
              <p className="text-xs font-bold text-violet-300 uppercase tracking-wider">Findings for supervisor evaluation</p>
              <p className="text-xs text-slate-400">
                Per ISO 9712, Level 1 records readings and indications. Your supervising Level 2/3 will set Pass / Fail / N/A.
              </p>
              <span className="inline-flex px-2.5 py-1 rounded-md text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                Result: Pending
              </span>
              <div className="pt-1">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Indication / Observation notes</label>
                <input
                  type="text"
                  value={indication}
                  onChange={(e) => setIndication(e.target.value)}
                  placeholder="e.g. Echo at 12mm depth / No relevant indication observed"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-violet-400"
                />
              </div>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Evaluation Result *
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    disabled={viewOnly}
                    onClick={() => !viewOnly && setResult('Pass')}
                    className={`py-3.5 px-3 rounded-xl font-bold flex flex-col sm:flex-row items-center justify-center gap-2 transition-all active:scale-95 shadow-md ${
                      result === 'Pass'
                        ? 'bg-emerald-600 text-white ring-2 ring-emerald-400 shadow-emerald-600/30'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-750 hover:text-slate-200 border border-slate-700'
                    } ${viewOnly ? 'opacity-70 cursor-default pointer-events-none' : ''}`}
                  >
                    <CheckCircle2 className="w-5 h-5 text-emerald-300" />
                    <span className="text-base tracking-wide">PASS</span>
                  </button>

                  <button
                    type="button"
                    disabled={viewOnly}
                    onClick={() => !viewOnly && setResult('Fail')}
                    className={`py-3.5 px-3 rounded-xl font-bold flex flex-col sm:flex-row items-center justify-center gap-2 transition-all active:scale-95 shadow-md ${
                      result === 'Fail'
                        ? 'bg-rose-600 text-white ring-2 ring-rose-400 shadow-rose-600/30 animate-pulse'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-750 hover:text-slate-200 border border-slate-700'
                    } ${viewOnly ? 'opacity-70 cursor-default pointer-events-none' : ''}`}
                  >
                    <XCircle className="w-5 h-5 text-rose-300" />
                    <span className="text-base tracking-wide">FAIL</span>
                  </button>

                  <button
                    type="button"
                    disabled={viewOnly}
                    onClick={() => !viewOnly && setResult('N/A')}
                    className={`py-3.5 px-3 rounded-xl font-bold flex flex-col sm:flex-row items-center justify-center gap-2 transition-all active:scale-95 shadow-md ${
                      result === 'N/A'
                        ? 'bg-slate-700 text-white ring-2 ring-slate-400'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-750 hover:text-slate-200 border border-slate-700'
                    } ${viewOnly ? 'opacity-70 cursor-default pointer-events-none' : ''}`}
                  >
                    <MinusCircle className="w-5 h-5 text-slate-300" />
                    <span className="text-base tracking-wide">N/A</span>
                  </button>
                </div>
              </div>

              {(result === 'Fail' || indication) && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 animate-in fade-in">
                  <label className="block text-xs font-bold text-rose-400 uppercase tracking-wider mb-1.5">
                    {evaluateOnly ? 'Level 1 Indication / Observation' : 'Defect / Indication Description *'}
                  </label>
                  <input
                    type="text"
                    value={indication}
                    onChange={(e) => setIndication(e.target.value)}
                    placeholder="e.g. 18mm linear toe crack at stop-start / Lack of sidewall fusion"
                    readOnly={fieldsLocked}
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-rose-500/40 text-rose-200 font-medium focus:outline-none focus:border-rose-400 ${fieldsLocked ? 'opacity-70 cursor-not-allowed' : ''}`}
                    required={result === 'Fail' && !evaluateOnly}
                  />
                </div>
              )}
            </>
          )}

          {/* Method Parameters Accordion / Specifics */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Method Parameters ({method})
            </span>

            {method === 'UT' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Probe / Transducer</label>
                  <input
                    type="text"
                    value={probe}
                    onChange={(e) => setProbe(e.target.value)}
                    readOnly={fieldsLocked}
                    className={`w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-sky-500 ${fieldsLocked ? 'opacity-70 cursor-not-allowed' : ''}`}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Couplant Type</label>
                  <input
                    type="text"
                    value={couplant}
                    onChange={(e) => setCouplant(e.target.value)}
                    readOnly={fieldsLocked}
                    className={`w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-sky-500 ${fieldsLocked ? 'opacity-70 cursor-not-allowed' : ''}`}
                  />
                </div>
              </div>
            )}

            {(method === 'MT' || method === 'PT') && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Technique / Medium</label>
                  <input
                    type="text"
                    value={technique}
                    onChange={(e) => setTechnique(e.target.value)}
                    readOnly={fieldsLocked}
                    className={`w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-sky-500 ${fieldsLocked ? 'opacity-70 cursor-not-allowed' : ''}`}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Inspection Light Level</label>
                  <input
                    type="text"
                    value={lightLevel}
                    onChange={(e) => setLightLevel(e.target.value)}
                    placeholder="e.g. 1150 Lux"
                    readOnly={fieldsLocked}
                    className={`w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-sky-500 ${fieldsLocked ? 'opacity-70 cursor-not-allowed' : ''}`}
                  />
                </div>
              </div>
            )}

            {method === 'VT' && (
              <div>
                <label className="block text-xs text-slate-400 mb-1">Visual Observation Notes</label>
                <input
                  type="text"
                  value={observation}
                  onChange={(e) => setObservation(e.target.value)}
                  placeholder="e.g. Clean weld face, minor undercut < 0.5mm"
                  readOnly={fieldsLocked}
                  className={`w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-sky-500 ${fieldsLocked ? 'opacity-70 cursor-not-allowed' : ''}`}
                />
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Inspector Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Ground flush prior to test. Re-inspection required after grinding."
              readOnly={fieldsLocked}
              className={`w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-sky-500 ${fieldsLocked ? 'opacity-70 cursor-not-allowed' : ''}`}
            />
          </div>

          {/* Photos Upload & Thumbnails */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-sky-400" />
                Evidential Photos ({photos.length})
              </label>

              {!fieldsLocked && (
              <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold active:scale-95 transition-all shadow-md shadow-sky-600/20">
                <Camera className="w-3.5 h-3.5" />
                <span>Take / Add Photo</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  multiple
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
              )}
            </div>

            {isProcessingPhoto && (
              <div className="p-3 rounded-lg bg-slate-800 text-xs text-sky-400 flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-sky-400 border-t-transparent rounded-full animate-spin"></div>
                Compressing photo for fast report generation...
              </div>
            )}

            {photos.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
                {photos.map((p, idx) => (
                  <div key={p.id} className="group relative bg-slate-950 rounded-xl border border-slate-800 p-2 overflow-hidden">
                    <img
                      src={p.dataUrl}
                      alt={`Photo ${idx + 1}`}
                      className="w-full h-24 object-cover rounded-lg bg-slate-900"
                    />
                    {!fieldsLocked && (
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(p.id)}
                      className="absolute top-3 right-3 p-1.5 rounded-lg bg-rose-600/90 text-white shadow hover:bg-rose-500 transition-colors"
                      title="Remove photo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    )}
                    <input
                      type="text"
                      value={p.caption || ''}
                      onChange={(e) => handleUpdatePhotoCaption(p.id, e.target.value)}
                      placeholder="Photo caption..."
                      readOnly={fieldsLocked}
                      className={`mt-1.5 w-full text-[11px] px-2 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300 focus:outline-none focus:border-sky-500 ${fieldsLocked ? 'opacity-70 cursor-not-allowed' : ''}`}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 font-semibold text-sm hover:bg-slate-800 active:scale-95 transition-all"
          >
            {viewOnly ? 'Close' : 'Cancel'}
          </button>

          {!viewOnly && (
            <div className="flex items-center gap-2.5">
              {!existingItem && !evaluateOnly && (
                <button
                  type="button"
                  onClick={() => handleSubmit(true)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-400 font-bold text-sm border border-sky-500/30 flex items-center gap-1.5 active:scale-95 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Save & Add Another</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => handleSubmit(false)}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-500 hover:from-sky-500 hover:to-cyan-400 text-white font-bold text-sm shadow-lg shadow-sky-500/25 active:scale-95 transition-all"
              >
                {evaluateOnly ? 'Save Evaluation' : existingItem ? 'Update Item' : 'Save Item'}
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
