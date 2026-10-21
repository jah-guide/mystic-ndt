import React, { useState } from 'react';
import { X, CheckCircle2, AlertTriangle, AlertCircle, ShieldCheck, Lock, UserCheck, Send } from 'lucide-react';
import { Job, Customer, Inspector, Equipment } from '../../types';
import {
  validateJobForCompletion,
  validateJobForL1Submit,
  validateJobForSupervisorComplete,
  calculateOverallResult
} from '../../utils/validation';
import { SignaturePad } from '../common/SignaturePad';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';

export type CompleteModalMode = 'l1_submit' | 'supervisor_complete' | 'lead_complete';

interface CompleteInspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: CompleteModalMode;
  onConfirm: (payload: {
    signatureDataUrl?: string;
    supervisorSignatureDataUrl?: string;
    comments: string;
  }) => void;
  job: Job;
  inspector?: Inspector;
  supervisor?: Inspector;
  equipmentList?: Equipment[];
  customer?: Customer;
  actorInspectorId?: string;
}

export const CompleteInspectionModal: React.FC<CompleteInspectionModalProps> = ({
  isOpen, onClose, mode, onConfirm, job, inspector, supervisor, equipmentList, customer, actorInspectorId
}) => {
  const [signature, setSignature] = useState<string | undefined>(job.signatureDataUrl);
  const [supervisorSignature, setSupervisorSignature] = useState<string | undefined>(job.supervisorSignatureDataUrl);
  const [comments, setComments] = useState<string>(
    job.inspectorComments || (
      mode === 'l1_submit'
        ? 'Findings recorded per written instruction. Submitted to supervising inspector for evaluation.'
        : 'All examinations carried out in strict accordance with the approved test procedure. Results recorded as observed.'
    )
  );

  useBodyScrollLock(isOpen);

  if (!isOpen) return null;

  const previewOverall = calculateOverallResult(job.items);

  const validation =
    mode === 'l1_submit'
      ? validateJobForL1Submit({ ...job, signatureDataUrl: signature }, inspector, equipmentList)
      : mode === 'supervisor_complete'
      ? validateJobForSupervisorComplete(
          { ...job, supervisorSignatureDataUrl: supervisorSignature },
          supervisor,
          equipmentList,
          actorInspectorId
        )
      : validateJobForCompletion(
          { ...job, signatureDataUrl: signature },
          inspector,
          equipmentList,
          supervisor
        );

  const handleComplete = () => {
    if (mode === 'l1_submit') {
      if (!signature) {
        alert('Please sign before submitting findings to your supervisor.');
        return;
      }
      if (!validation.canComplete) {
        alert('Please resolve all validation errors before submitting.');
        return;
      }
      onConfirm({ signatureDataUrl: signature, comments });
      return;
    }

    if (mode === 'supervisor_complete') {
      if (!supervisorSignature) {
        alert('Supervisor signature is required to complete this inspection.');
        return;
      }
      if (!validation.canComplete) {
        alert('Please resolve all validation errors before completing.');
        return;
      }
      onConfirm({ supervisorSignatureDataUrl: supervisorSignature, comments });
      return;
    }

    if (!signature) {
      alert('Please provide the inspector digital signature before completing the inspection.');
      return;
    }
    if (!validation.canComplete) {
      alert('Please resolve all validation errors before completing the inspection.');
      return;
    }
    onConfirm({ signatureDataUrl: signature, comments });
  };

  const title =
    mode === 'l1_submit'
      ? 'Submit Findings to Supervisor'
      : mode === 'supervisor_complete'
      ? 'Supervisor Evaluation Sign-Off'
      : 'Complete & Sign-Off Job';

  const cta =
    mode === 'l1_submit'
      ? 'Sign & Submit to Supervisor'
      : mode === 'supervisor_complete'
      ? 'Sign & Complete Inspection'
      : 'Sign & Complete Inspection';

  const isPass = previewOverall === 'PASS';
  const isFail = previewOverall === 'FAIL';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/85 backdrop-blur-sm p-0 sm:p-4 overflow-hidden">
      <div className="bg-slate-900 border border-slate-800 w-full sm:max-w-xl rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden">

        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              mode === 'l1_submit' ? 'bg-violet-500/20 text-violet-400' : 'bg-emerald-500/20 text-emerald-400'
            }`}>
              {mode === 'l1_submit' ? <Send className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-base text-white">{title}</h3>
              <p className="text-xs text-slate-400">Job #{job.jobNumber} • {customer?.companyName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-slate-200">

          {mode === 'l1_submit' && supervisor && (
            <div className="flex items-start gap-2.5 p-3.5 bg-violet-950/30 border border-violet-500/30 rounded-xl text-xs text-violet-300">
              <UserCheck className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-violet-200 mb-0.5">ISO 9712 Level 1 submission</strong>
                You are recording findings only. <strong>{supervisor.fullName}</strong> ({supervisor.level}) will evaluate Pass/Fail/N/A and complete the certificate.
              </div>
            </div>
          )}

          {mode === 'supervisor_complete' && (
            <div className="flex items-start gap-2.5 p-3.5 bg-violet-950/30 border border-violet-500/30 rounded-xl text-xs text-violet-300">
              <UserCheck className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-violet-200 mb-0.5">Supervising inspector evaluation</strong>
                Review Level 1 findings from <strong>{inspector?.fullName}</strong>, ensure every item is evaluated, then sign to complete.
              </div>
            </div>
          )}

          {mode !== 'l1_submit' && (
            <div className={`p-4 rounded-xl border flex items-center justify-between ${
              isPass ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : isFail ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
            }`}>
              <div>
                <div className="text-xs uppercase font-bold tracking-wider text-slate-400">Overall Result</div>
                <div className="text-xl font-black mt-0.5">OVERALL {previewOverall}</div>
                <p className="text-xs text-slate-300 mt-1">
                  {isFail
                    ? 'One or more items failed acceptance criteria.'
                    : previewOverall === 'PENDING'
                    ? 'Evaluation incomplete — Pending items remain.'
                    : `${job.items.length} inspection item(s) meet required acceptance standard.`}
                </p>
              </div>
              {isPass ? <CheckCircle2 className="w-10 h-10 text-emerald-400 shrink-0" />
              : isFail ? <AlertTriangle className="w-10 h-10 text-rose-400 shrink-0" />
              : <AlertCircle className="w-10 h-10 text-amber-400 shrink-0" />}
            </div>
          )}

          {mode === 'l1_submit' && (
            <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300">
              <div className="text-xs uppercase font-bold tracking-wider">Items ready for supervisor</div>
              <div className="text-lg font-black mt-0.5">{job.items.length} finding(s) recorded</div>
              <p className="text-xs text-slate-300 mt-1">Overall result stays PENDING until the supervisor evaluates each item.</p>
            </div>
          )}

          {validation.warnings.length > 0 && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1.5 text-amber-300 text-xs">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Certification & Calibration Notice</span>
              </div>
              {validation.warnings.map((w, idx) => <p key={idx} className="pl-5 leading-relaxed text-amber-200/90">{w}</p>)}
            </div>
          )}

          {validation.errors.length > 0 && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-1.5 text-rose-300 text-xs">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Cannot proceed — Please resolve:</span>
              </div>
              {validation.errors.map((err, idx) => <p key={idx} className="pl-5 leading-relaxed text-rose-200">{err}</p>)}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              {mode === 'supervisor_complete' ? 'Supervisor Comments' : 'Inspector Comments'}
            </label>
            <textarea rows={3} value={comments} onChange={(e) => setComments(e.target.value)}
              placeholder="Notes for the certificate / next reviewer"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-sky-500" />
          </div>

          {(mode === 'l1_submit' || mode === 'lead_complete') && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                {mode === 'l1_submit' ? 'Level 1 Technician Signature *' : 'Inspector Signature *'}
              </p>
              <SignaturePad initialValue={signature} onChange={(dataUrl) => setSignature(dataUrl)} height={140} />
              {inspector && (
                <p className="mt-1.5 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>{inspector.fullName}</span>
                  <span className="font-mono">{inspector.certNumber} ({inspector.level})</span>
                </p>
              )}
            </div>
          )}

          {mode === 'supervisor_complete' && supervisor && (
            <div className="border border-violet-500/30 rounded-xl p-4 space-y-3 bg-violet-950/10">
              {job.signatureDataUrl && (
                <div className="text-xs text-slate-400">
                  Level 1 already signed: <strong className="text-slate-200">{inspector?.fullName}</strong>
                </div>
              )}
              <p className="text-xs font-semibold uppercase tracking-wider text-violet-300 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5" />
                Supervising Inspector Signature *
              </p>
              <SignaturePad initialValue={supervisorSignature} onChange={(dataUrl) => setSupervisorSignature(dataUrl)} height={130} />
              <p className="text-[11px] text-slate-400 flex items-center justify-between">
                <span>{supervisor.fullName}</span>
                <span className="font-mono">{supervisor.certNumber} ({supervisor.level})</span>
              </p>
            </div>
          )}

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
            <Lock className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
            <span className="min-w-0 leading-relaxed">
              {mode === 'l1_submit'
                ? 'Submitting locks your findings for supervisor evaluation. You cannot change Pass/Fail — only the supervisor evaluates acceptance.'
                : 'Completing locks the inspection record, timestamps completion, and queues Level 3 QA review.'}
            </span>
          </div>

        </div>

        <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-3">
          <button type="button" onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 font-semibold text-sm hover:bg-slate-800 active:scale-95 transition-all">
            Back
          </button>
          <button type="button" onClick={handleComplete} disabled={!validation.canComplete}
            className={`px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg active:scale-95 transition-all ${
              validation.canComplete
                ? mode === 'l1_submit'
                  ? 'bg-gradient-to-r from-violet-600 to-fuchsia-500 hover:from-violet-500 hover:to-fuchsia-400 text-white shadow-violet-500/25'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-emerald-500/25'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
            }`}>
            {mode === 'l1_submit' ? <Send className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            <span>{cta}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
