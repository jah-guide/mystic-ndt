import React, { useState } from 'react';
import {
  Award, ArrowLeft, Camera, CheckCircle2, Eye, FileText, Upload, X, AlertTriangle, Clock
} from 'lucide-react';
import { Inspector, MethodCertificate, NdtMethod } from '../../types';
import { Badge } from '../common/Badge';
import { formatDate } from '../../utils/formatters';
import { checkExpiry } from '../../utils/validation';
import { getVisionStatus } from '../../utils/visionAuthorization';
import { StorageService } from '../../services/storage';
import { DateField, todayKey, addDaysToKey } from '../common/DateField';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import {
  applyMethodCertInitialUpload,
  applyMethodCertPendingUpload,
  applyVisionPendingUpload,
  buildCertSubmission,
  hasPendingCertSubmission,
  hasPendingVisionSubmission,
  refreshInspectorCertSummary
} from '../../utils/certSubmissions';

interface MyCertificatesPanelProps {
  inspector: Inspector;
  onUpdated: () => void;
  onClose?: () => void;
}

type UploadTarget =
  | { kind: 'method'; cert: MethodCertificate }
  | { kind: 'vision' };

async function readFileAsDataUrl(file: File): Promise<string> {
  if (file.type.startsWith('image/')) {
    return StorageService.compressImageFile(file, 1200, 0.8);
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export const MyCertificatesPanel: React.FC<MyCertificatesPanelProps> = ({
  inspector,
  onUpdated,
  onClose
}) => {
  const [uploadTarget, setUploadTarget] = useState<UploadTarget | null>(null);
  const [proposedExpiry, setProposedExpiry] = useState(addDaysToKey(todayKey(), 365));
  const [proposedCertNumber, setProposedCertNumber] = useState('');
  const [fileName, setFileName] = useState('');
  const [dataUrl, setDataUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useBodyScrollLock(Boolean(uploadTarget));

  const methodCerts = inspector.methodCertificates || [];
  const visionStatus = getVisionStatus(inspector);
  const visionPending = hasPendingVisionSubmission(inspector);

  const openMethodUpload = (cert: MethodCertificate) => {
    if (hasPendingCertSubmission(cert)) {
      const ok = window.confirm(
        'A renewal is already awaiting Admin. Replace that upload with a new file?'
      );
      if (!ok) return;
    }
    setUploadTarget({ kind: 'method', cert });
    setProposedExpiry(cert.expiryDate || addDaysToKey(todayKey(), 365));
    setProposedCertNumber(cert.certNumber || '');
    setFileName('');
    setDataUrl('');
    setError('');
  };

  const openVisionUpload = () => {
    if (hasPendingVisionSubmission(inspector)) {
      const ok = window.confirm(
        'A vision renewal is already awaiting Admin. Replace that upload with a new file?'
      );
      if (!ok) return;
    }
    setUploadTarget({ kind: 'vision' });
    setProposedExpiry(inspector.visionAcuityExpiryDate || addDaysToKey(todayKey(), 365));
    setProposedCertNumber('');
    setFileName('');
    setDataUrl('');
    setError('');
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const url = await readFileAsDataUrl(file);
      setDataUrl(url);
      setFileName(file.name);
    } catch {
      setError('Could not read that file. Try a photo or PDF.');
    } finally {
      setBusy(false);
    }
  };

  const submitUpload = () => {
    if (!uploadTarget) return;
    if (!dataUrl) {
      setError('Attach a certificate or vision evidence file.');
      return;
    }
    if (!proposedExpiry) {
      setError('Enter the proposed expiry date from the document.');
      return;
    }

    const submission = buildCertSubmission({
      documentDataUrl: dataUrl,
      documentFileName: fileName || 'upload',
      proposedExpiryDate: proposedExpiry,
      proposedCertNumber: uploadTarget.kind === 'method' ? proposedCertNumber || undefined : undefined,
      submittedByName: inspector.fullName
    });

    let next: Inspector;
    if (uploadTarget.kind === 'vision') {
      next = applyVisionPendingUpload(inspector, submission);
    } else {
      const cert = uploadTarget.cert;
      const isInitial =
        cert.verificationStatus !== 'Verified' || !cert.documentDataUrl;
      const updatedCert = isInitial
        ? applyMethodCertInitialUpload(cert, submission)
        : applyMethodCertPendingUpload(cert, submission);
      next = {
        ...inspector,
        methodCertificates: (inspector.methodCertificates || []).map(c =>
          c.id === cert.id ? updatedCert : c
        )
      };
    }

    StorageService.updateInspector(refreshInspectorCertSummary(next));
    setUploadTarget(null);
    onUpdated();
  };

  const body = (
    <div className="space-y-4">
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-sky-300"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to jobs
        </button>
      )}
      <div>
        <h3 className="text-sm font-black text-white flex items-center gap-2">
          <Award className="w-4 h-4 text-sky-400" />
          My certificates
        </h3>
        <p className="text-[11px] text-slate-500 mt-0.5">
          Employer file copies for ISO 9712 method certs and near-vision acuity. Uploads go to Admin for verification — your current Verified dates stay in force until approved.
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Method certificates</p>
        {methodCerts.length === 0 && (
          <p className="text-xs text-slate-500">No method certificates on file. Ask Admin to add your methods.</p>
        )}
        {methodCerts.map(mc => {
          const exp = checkExpiry(mc.expiryDate);
          const pending = hasPendingCertSubmission(mc);
          const needsUpload =
            exp.status !== 'valid' ||
            !mc.documentDataUrl ||
            mc.verificationStatus === 'Rejected' ||
            mc.verificationStatus === 'PendingVerification';
          return (
            <div key={mc.id} className="rounded-xl border border-slate-800 bg-slate-950/70 p-3.5 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="method" value={mc.method as NdtMethod} size="sm">{mc.method}</Badge>
                    <span className="text-xs font-bold text-white">{mc.level}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      mc.verificationStatus === 'Verified' ? 'bg-emerald-500/20 text-emerald-300'
                        : mc.verificationStatus === 'PendingVerification' ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-rose-500/20 text-rose-300'
                    }`}>
                      {mc.verificationStatus === 'PendingVerification' ? 'Pending verification' : mc.verificationStatus}
                    </span>
                    {pending && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        <Clock className="w-3 h-3" /> Renewal pending Admin
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Expiry <span className="text-slate-200 font-semibold">{formatDate(mc.expiryDate)}</span>
                    {' · '}
                    <span className={
                      exp.status === 'expired' ? 'text-rose-400'
                        : exp.status === 'expiring_soon' ? 'text-amber-400' : 'text-emerald-400'
                    }>{exp.formattedText}</span>
                  </p>
                  <p className="text-xs font-mono text-sky-400">{mc.certNumber}</p>
                  {mc.rejectionReason && (
                    <p className="text-[11px] text-rose-400">{mc.rejectionReason}</p>
                  )}
                  {pending && mc.pendingSubmission && (
                    <p className="text-[11px] text-amber-300/90">
                      Proposed expiry {formatDate(mc.pendingSubmission.proposedExpiryDate)} — awaiting Admin.
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  {mc.documentDataUrl && (
                    <a href={mc.documentDataUrl} target="_blank" rel="noreferrer"
                      className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-sky-600/20 border border-sky-500/40 text-sky-300 text-[11px] font-bold">
                      <FileText className="w-3.5 h-3.5" /> View
                    </a>
                  )}
                  {(needsUpload || pending) && (
                    <button
                      type="button"
                      onClick={() => openMethodUpload(mc)}
                      className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-sky-600 text-white text-[11px] font-bold"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      {pending ? 'Replace upload' : 'Upload renewal'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Near-vision acuity</p>
        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3.5 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30">
                  <Eye className="w-3 h-3" /> VISION
                </span>
                {visionPending && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    <Clock className="w-3 h-3" /> Renewal pending Admin
                  </span>
                )}
              </div>
              {inspector.visionAcuityExpiryDate ? (
                <p className="text-[11px] text-slate-400">
                  Expiry <span className="text-slate-200 font-semibold">{formatDate(inspector.visionAcuityExpiryDate)}</span>
                  {' · '}
                  <span className={
                    visionStatus === 'expired' || visionStatus === 'missing' ? 'text-rose-400'
                      : visionStatus === 'expiring_soon' ? 'text-amber-400' : 'text-emerald-400'
                  }>
                    {checkExpiry(inspector.visionAcuityExpiryDate).formattedText}
                  </span>
                </p>
              ) : (
                <p className="text-[11px] text-rose-400 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> No vision expiry on file
                </p>
              )}
              {inspector.visionRejectionReason && (
                <p className="text-[11px] text-rose-400">{inspector.visionRejectionReason}</p>
              )}
              {visionPending && inspector.visionPendingSubmission && (
                <p className="text-[11px] text-amber-300/90">
                  Proposed expiry {formatDate(inspector.visionPendingSubmission.proposedExpiryDate)} — awaiting Admin.
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5 shrink-0">
              {inspector.visionDocumentDataUrl && (
                <a href={inspector.visionDocumentDataUrl} target="_blank" rel="noreferrer"
                  className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-sky-600/20 border border-sky-500/40 text-sky-300 text-[11px] font-bold">
                  <FileText className="w-3.5 h-3.5" /> View
                </a>
              )}
              <button
                type="button"
                onClick={openVisionUpload}
                className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-sky-600 text-white text-[11px] font-bold"
              >
                <Upload className="w-3.5 h-3.5" />
                {visionPending ? 'Replace upload' : 'Upload renewal'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg">
        {body}
      </div>

      {uploadTarget && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-slate-950/85 backdrop-blur-sm p-0 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-white text-sm">
                {uploadTarget.kind === 'vision'
                  ? 'Upload near-vision evidence'
                  : `Upload ${uploadTarget.cert.method} certificate renewal`}
              </h4>
              <button type="button" onClick={() => setUploadTarget(null)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              Enter the expiry shown on the document. Admin will confirm it matches before employer verification.
            </p>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Proposed expiry</label>
              <DateField value={proposedExpiry} onChange={setProposedExpiry} />
            </div>
            {uploadTarget.kind === 'method' && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Cert number (optional)</label>
                <input
                  value={proposedCertNumber}
                  onChange={e => setProposedCertNumber(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-sky-500"
                />
              </div>
            )}
            <label className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-600 bg-slate-950/80 px-4 py-6 cursor-pointer hover:border-sky-500/50">
              <Camera className="w-6 h-6 text-sky-400" />
              <span className="text-xs font-bold text-slate-300">
                {fileName || 'Take / choose photo or PDF'}
              </span>
              <input type="file" accept="image/*,application/pdf" className="hidden" onChange={onFile} />
            </label>
            {busy && <p className="text-xs text-sky-400">Processing file…</p>}
            {error && <p className="text-xs text-rose-400">{error}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setUploadTarget(null)}
                className="px-3.5 py-2 rounded-xl border border-slate-700 text-slate-300 text-sm font-semibold">
                Cancel
              </button>
              <button
                type="button"
                disabled={busy || !dataUrl}
                onClick={submitUpload}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 text-white text-sm font-bold disabled:opacity-40"
              >
                <CheckCircle2 className="w-4 h-4" />
                Submit for Admin
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
