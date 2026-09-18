import React, { useState } from 'react';
import { 
  X, CheckCircle2, XCircle, AlertTriangle, Award, History
} from 'lucide-react';
import { Job, Customer, Inspector, Equipment, AuditEntry } from '../../types';
import { SignaturePad } from '../common/SignaturePad';
import { formatDateTime } from '../../utils/formatters';
import { StorageService } from '../../services/storage';
import { clearFieldCompletionFields, clearL3CertificationFields, resetItemEvaluations } from '../../utils/validation';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';

interface Level3ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: Job;
  customer?: Customer;
  inspector?: Inspector;
  equipmentList?: Equipment[];
  onJobUpdated: (updatedJob: Job) => void;
}

export const Level3ReviewModal: React.FC<Level3ReviewModalProps> = ({
  isOpen,
  onClose,
  job,
  customer,
  inspector,
  equipmentList: _equipmentList,
  onJobUpdated
}) => {
  const [reviewAction, setReviewAction] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [l3Signature, setL3Signature] = useState<string | undefined>(undefined);
  const [l3Comments, setL3Comments] = useState<string>(
    'Verified calibration records, ASME/ISO acceptance criteria, and evidential photos. Technical certification approved.'
  );
  const [rejectionReason, setRejectionReason] = useState<string>('');

  useBodyScrollLock(isOpen);

  if (!isOpen) return null;

  const isL1Supervised = Boolean(job.supervisorId) && inspector?.level === 'Level 1';

  const handleApprove = () => {
    if (!l3Signature) {
      alert('Level 3 digital signature is required for technical verification sign-off.');
      return;
    }

    const auditEntry: AuditEntry = {
      id: 'aud-' + Date.now(),
      timestamp: new Date().toISOString(),
      actorName: 'Dr. Johan Pretorius',
      actorRole: 'Level 3 Verifier',
      action: 'L3_APPROVED',
      details: `Level 3 QA technical review approved by Dr. Johan Pretorius (ISO 9712 Level 3). Comments: ${l3Comments}`
    };

    const updatedJob: Job = {
      ...job,
      l3ReviewStatus: 'APPROVED',
      l3VerifierId: 'insp-l3-1',
      l3VerifierName: 'Dr. Johan Pretorius',
      l3CertNumber: 'ISO-9712-L3-ZA-0412',
      l3SignatureDataUrl: l3Signature,
      l3Comments,
      l3ReviewedAt: new Date().toISOString(),
      l3RejectionReason: undefined,
      auditTrail: [...(job.auditTrail || []), auditEntry]
    };

    StorageService.updateJob(updatedJob);
    onJobUpdated(updatedJob);
    onClose();
  };

  const handleReject = () => {
    if (!rejectionReason.trim()) {
      alert('Please specify a mandatory reason for rejecting this inspection report.');
      return;
    }

    const auditEntry: AuditEntry = {
      id: 'aud-' + Date.now(),
      timestamp: new Date().toISOString(),
      actorName: 'Dr. Johan Pretorius',
      actorRole: 'Level 3 Verifier',
      action: 'L3_REJECTED',
      details: isL1Supervised
        ? `Report rejected by Level 3. L1 job returned for revision. Reason: ${rejectionReason}`
        : `Report rejected by Level 3. Lead inspector must re-sign. Reason: ${rejectionReason}`,
      rejectionReason
    };

    const base = clearFieldCompletionFields(clearL3CertificationFields(job));

    const updatedJob: Job = isL1Supervised
      ? {
          ...base,
          status: 'Revision Required',
          items: resetItemEvaluations(job.items),
          l3ReviewStatus: 'REJECTED',
          l3VerifierName: 'Dr. Johan Pretorius',
          l3RejectionReason: rejectionReason.trim(),
          l3ReviewedAt: new Date().toISOString(),
          supervisorRejectionReason: rejectionReason.trim(),
          supervisorRejectedAt: new Date().toISOString(),
          supervisorRejectedByName: 'Dr. Johan Pretorius (L3)',
          auditTrail: [...(job.auditTrail || []), auditEntry]
        }
      : {
          ...base,
          status: 'In Progress',
          items: resetItemEvaluations(job.items),
          l3ReviewStatus: 'REJECTED',
          l3VerifierName: 'Dr. Johan Pretorius',
          l3RejectionReason: rejectionReason.trim(),
          l3ReviewedAt: new Date().toISOString(),
          auditTrail: [...(job.auditTrail || []), auditEntry]
        };

    StorageService.updateJob(updatedJob);
    onJobUpdated(updatedJob);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-3 sm:p-4 overflow-hidden">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[94vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                Level 3 Technical Review & Sign-Off
              </h3>
              <p className="text-xs text-slate-400">
                Job #{job.jobNumber} • {customer?.companyName} • Inspector: {inspector?.fullName}
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

        <div className="p-5 space-y-5 overflow-y-auto flex-1 text-slate-200">
          
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Field Inspection Result
              </span>
              <div className="text-lg font-black text-white mt-0.5">
                OVERALL {job.overallResult} ({job.items.length} inspection items)
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Method: <strong className="text-sky-400">{job.method}</strong> • Standard: {job.standardSpec}
              </p>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-slate-400 block">Field completed</span>
              <span className="text-xs font-semibold text-emerald-400">
                {formatDateTime(job.completedAt)}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Level 3 Review Decision *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setReviewAction('APPROVE')}
                className={`py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                  reviewAction === 'APPROVE'
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 ring-2 ring-emerald-400'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
                }`}
              >
                <CheckCircle2 className="w-5 h-5 text-emerald-300" />
                <span>Approve & Certify</span>
              </button>

              <button
                type="button"
                onClick={() => setReviewAction('REJECT')}
                className={`py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                  reviewAction === 'REJECT'
                    ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30 ring-2 ring-rose-400'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
                }`}
              >
                <XCircle className="w-5 h-5 text-rose-300" />
                <span>Reject / Request Re-scan</span>
              </button>
            </div>
          </div>

          {reviewAction === 'APPROVE' ? (
            <div className="space-y-4 animate-in fade-in">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Level 3 Reviewer Comments & Endorsement
                </label>
                <textarea
                  rows={3}
                  value={l3Comments}
                  onChange={(e) => setL3Comments(e.target.value)}
                  placeholder="e.g. Verified calibration, probe certifications, and ASME B31.3 compliance."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <SignaturePad
                  initialValue={l3Signature}
                  onChange={(dataUrl) => setL3Signature(dataUrl)}
                  height={130}
                />
                <p className="mt-1.5 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Signer: <strong className="text-slate-200">Dr. Johan Pretorius (Level 3 QA Authority)</strong></span>
                  <span>Cert: <strong className="text-slate-200">ISO-9712-L3-ZA-0412</strong></span>
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                <div className="flex items-center gap-2 font-bold mb-1">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span>
                    {isL1Supervised
                      ? 'Rejection returns this L1 job to Revision Required (findings + dual-sign cleared)'
                      : 'Rejection returns this job to In Progress (lead must re-evaluate and re-sign)'}
                  </span>
                </div>
                <p>Completion seals and Level 3 signature fields are cleared so the report cannot look certified.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-rose-400 uppercase tracking-wider mb-1.5">
                  Mandatory Rejection / Revision Reason *
                </label>
                <textarea
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Ultrasonic scan grid spacing insufficient on Weld 002. Re-test required with 45-degree shear wave probe."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-rose-500/40 text-white text-sm focus:outline-none focus:border-rose-400"
                  required
                />
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-slate-800">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              <History className="w-3.5 h-3.5 text-sky-400" />
              <span>Inspection Audit Trail ({job.auditTrail?.length || 0})</span>
            </div>

            <div className="max-h-36 overflow-y-auto space-y-2 pr-1">
              {(job.auditTrail || []).map((entry) => (
                <div key={entry.id} className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800 text-xs">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-0.5">
                    <span className="font-bold text-slate-300">{entry.actorName} ({entry.actorRole})</span>
                    <span>{formatDateTime(entry.timestamp)}</span>
                  </div>
                  <p className="text-slate-300">{entry.details}</p>
                </div>
              ))}
            </div>
          </div>

        </div>

        <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 font-semibold text-sm hover:bg-slate-800"
          >
            Cancel
          </button>

          {reviewAction === 'APPROVE' ? (
            <button
              type="button"
              onClick={handleApprove}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-sm shadow-lg shadow-emerald-500/25 flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Sign & Certify Report (L3)</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleReject}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-500 hover:from-rose-500 hover:to-red-400 text-white font-bold text-sm shadow-lg shadow-rose-500/25 flex items-center gap-2"
            >
              <XCircle className="w-4 h-4" />
              <span>{isL1Supervised ? 'Reject → Revision Required' : 'Reject → Return to Lead'}</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
