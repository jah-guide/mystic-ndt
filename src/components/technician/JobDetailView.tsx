import React, { useState } from 'react';
import { 
  ArrowLeft, Plus, CheckCircle2, XCircle, MinusCircle, Camera, 
  AlertTriangle, ShieldCheck, FileText, Lock, Trash2, Calendar, MapPin, 
  Building, Wrench, FileCheck, Share2, Award, History, Clock, X, Edit3, Play
} from 'lucide-react';
import { Job, Customer, Inspector, Equipment, InspectionItem, CompanySettings, AuditEntry, UserRole, JobViewerRole } from '../../types';
import { Badge } from '../common/Badge';
import { formatDate, formatDateTime } from '../../utils/formatters';
import { checkExpiry, calculateOverallResult, isItemEvaluated, canEditFindings, canEvaluateItems, canRejectToL1, canSubmitAsL1, canStartWork, isAssignedSupervisor, snapshotFindingsRevision, resetItemEvaluations, validateSupervisorReject, clearL3CertificationFields, clearFieldCompletionFields, isL3Certified, canReopenJob, compareJobTempToProcedure, isLevel1ForMethod, getMethodCertificate, validateJobForL1SubmitPreflight, validateJobForSupervisorCompletePreflight, validateJobForCompletionPreflight } from '../../utils/validation';
import { ensureProcedureSnapshotOnJob, getJobProcedureView, replaceProcedureSnapshot } from '../../utils/procedureSnapshot';
import { InspectionItemModal } from './InspectionItemModal';
import { CompleteInspectionModal, CompleteModalMode } from './CompleteInspectionModal';
import { ReportViewModal } from '../reports/ReportViewModal';
import { Level3ReviewModal } from '../verifier/Level3ReviewModal';
import { StorageService } from '../../services/storage';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';

interface JobDetailViewProps {
  job: Job;
  customer?: Customer;
  inspector?: Inspector;
  supervisor?: Inspector;
  equipmentList?: Equipment[];
  settings: CompanySettings;
  userRole?: UserRole;
  /** When in technician persona, the currently selected inspector id */
  viewerInspectorId?: string;
  onBack: () => void;
  onJobUpdated: (updatedJob: Job) => void;
  /** Admin: open job wizard from cockpit (Draft / Assigned) */
  onEditJob?: () => void;
}

function resolveViewerRole(
  userRole: UserRole,
  job: Job,
  inspector: Inspector | undefined,
  viewerInspectorId?: string
): JobViewerRole {
  if (userRole === 'admin') return 'admin';
  if (userRole === 'l3_verifier') return 'l3';
  if (viewerInspectorId && job.supervisorId && viewerInspectorId === job.supervisorId) return 'supervisor';
  if (inspector && viewerInspectorId === job.inspectorId && isLevel1ForMethod(inspector, job.method)) {
    return 'lead_l1';
  }
  return 'lead_l2_plus';
}

export const JobDetailView: React.FC<JobDetailViewProps> = ({
  job,
  customer,
  inspector,
  supervisor,
  equipmentList = [],
  settings,
  userRole = 'technician',
  viewerInspectorId,
  onBack,
  onJobUpdated,
  onEditJob
}) => {
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InspectionItem | undefined>(undefined);
  const [lightboxPhoto, setLightboxPhoto] = useState<{ dataUrl: string; caption?: string } | null>(null);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isL3ReviewModalOpen, setIsL3ReviewModalOpen] = useState(false);
  const [showAuditTrail, setShowAuditTrail] = useState(false);
  const [showFindingsHistory, setShowFindingsHistory] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [reopenReason, setReopenReason] = useState('');
  const [isReopenModalOpen, setIsReopenModalOpen] = useState(false);

  useBodyScrollLock(Boolean(lightboxPhoto) || isReopenModalOpen || isRejectModalOpen);

  const site = customer?.sites.find(s => s.id === job.siteId);
  const isCompleted = job.status === 'Completed';
  const isAwaitingSupervisor = job.status === 'Awaiting Supervisor';
  const isRevisionRequired = job.status === 'Revision Required';
  const isL3Approved = job.l3ReviewStatus === 'APPROVED';
  const isL1LeadJob = isLevel1ForMethod(inspector, job.method);
  const viewerRole = resolveViewerRole(userRole, job, inspector, viewerInspectorId);
  const assignedSup = isAssignedSupervisor(job, viewerInspectorId);

  const findingsOnly = canEditFindings(viewerRole, job.status, isL1LeadJob) && isL1LeadJob;
  const evaluateOnly = canEvaluateItems(viewerRole, job.status, assignedSup);
  const allowEditFindings = canEditFindings(viewerRole, job.status, isL1LeadJob);
  const allowEvaluate = evaluateOnly;
  const allowReject = canRejectToL1(viewerRole, job.status, assignedSup);
  const allowSubmitL1 = canSubmitAsL1(viewerRole, job.status, isL1LeadJob);
  const allowStartWork = canStartWork(viewerRole, job.status);
  const allowCompleteSupervised = allowEvaluate;
  const allowCompleteIndependent =
    !isL1LeadJob &&
    !isCompleted &&
    viewerRole === 'lead_l2_plus';
  const allowReopen = isCompleted && canReopenJob(viewerRole);
  const reportIsCertified = isL3Certified(job);

  const canOpenItemModal = allowEditFindings || allowEvaluate;
  const canViewItemDetail = canOpenItemModal || userRole === 'l3_verifier' || userRole === 'admin';
  const itemModalViewOnly = canViewItemDetail && !canOpenItemModal;
  const canAddItems = allowEditFindings;
  /** Field as-found: lead L1 / lead L2+ / Admin only — never supervisor silent rewrite */
  const canEditExamConditions =
    !isCompleted &&
    !isAwaitingSupervisor &&
    !isL3Approved &&
    (viewerRole === 'admin' || viewerRole === 'lead_l1' || viewerRole === 'lead_l2_plus') &&
    (job.status === 'In Progress' ||
      job.status === 'Revision Required' ||
      (viewerRole === 'admin' && (job.status === 'Assigned' || job.status === 'Draft')));

  const completeMode: CompleteModalMode = allowSubmitL1
    ? 'l1_submit'
    : allowCompleteSupervised
    ? 'supervisor_complete'
    : 'lead_complete';

  const completePreflight =
    completeMode === 'l1_submit'
      ? validateJobForL1SubmitPreflight(job, inspector, equipmentList)
      : completeMode === 'supervisor_complete'
      ? validateJobForSupervisorCompletePreflight(job, supervisor, equipmentList, viewerInspectorId)
      : validateJobForCompletionPreflight(job, inspector, equipmentList, supervisor);
  const canOpenCompleteModal = completePreflight.canComplete;
  const completePreflightHint = completePreflight.errors[0];

  const showPrimaryAction = allowSubmitL1 || allowCompleteSupervised || allowCompleteIndependent;
  const allProcedures = StorageService.getProcedures();
  const { snapshot: procedureSnapshot, live: liveProcedure, displayRevision } = getJobProcedureView(job, allProcedures);
  const linkedProcedure = procedureSnapshot
    ? ({
        ...liveProcedure,
        id: procedureSnapshot.procedureId,
        procedureNumber: procedureSnapshot.procedureNumber,
        title: procedureSnapshot.title,
        method: procedureSnapshot.method,
        revisionNumber: procedureSnapshot.revisionNumber,
        standardRef: procedureSnapshot.standardRef || liveProcedure?.standardRef || '',
        acceptanceCriteria: procedureSnapshot.acceptanceCriteria,
        temperatureRanges: procedureSnapshot.temperatureRanges,
        temperature: procedureSnapshot.temperature,
        equipmentSlots: procedureSnapshot.equipmentSlots,
        equipmentRequired: liveProcedure?.equipmentRequired || [],
        surface: liveProcedure?.surface || '',
        status: liveProcedure?.status || 'Active',
        authorId: liveProcedure?.authorId || '',
        createdAt: liveProcedure?.createdAt || '',
        updatedAt: liveProcedure?.updatedAt || ''
      } as NonNullable<typeof liveProcedure>)
    : liveProcedure;
  const jobTempCompare = compareJobTempToProcedure(job, linkedProcedure);

  // Expiry checks — flag if any linked apparatus is due/expired
  const certCheck = inspector
    ? checkExpiry(getMethodCertificate(inspector, job.method)?.expiryDate || inspector.certExpiryDate)
    : checkExpiry(undefined);
  const worstEquip = equipmentList.reduce<{ status: ReturnType<typeof checkExpiry>['status']; check: ReturnType<typeof checkExpiry>; name?: string } | null>((acc, eq) => {
    const check = checkExpiry(eq.calibrationExpiryDate);
    if (!acc) return { status: check.status, check, name: eq.name };
    const rank = { expired: 0, expiring_soon: 1, valid: 2 } as const;
    return rank[check.status] < rank[acc.status] ? { status: check.status, check, name: eq.name } : acc;
  }, null);
  const equipCheck = worstEquip?.check;
  const showEquipWarning = Boolean(equipCheck && equipCheck.status !== 'valid');
  const showCertWarning = certCheck.status !== 'valid';

  const handleSaveItem = (item: InspectionItem, addAnother: boolean) => {
    if (allowEvaluate && !allowEditFindings) {
      // Supervisor evaluate-only: merge result onto existing item, never rewrite findings
      const existing = job.items.find(i => i.id === item.id);
      if (!existing) return;
      const evaluated: InspectionItem = {
        ...existing,
        result: item.result,
        indication: item.indication ?? existing.indication,
        updatedAt: new Date().toISOString()
      };
      if (!isItemEvaluated(evaluated.result)) {
        alert('Select Pass, Fail, or N/A.');
        return;
      }
      const updatedItems = job.items.map(i => i.id === item.id ? evaluated : i);
      const auditEntry: AuditEntry = {
        id: 'aud-' + Date.now(),
        timestamp: new Date().toISOString(),
        actorName: supervisor?.fullName || 'Supervisor',
        actorRole: 'Supervisor',
        action: 'ITEM_EVALUATED',
        details: `Supervisor evaluated item ${evaluated.itemNumber} as ${evaluated.result}.`
      };
      const updatedJob: Job = {
        ...job,
        items: updatedItems,
        overallResult: calculateOverallResult(updatedItems),
        auditTrail: [...(job.auditTrail || []), auditEntry]
      };
      StorageService.updateJob(updatedJob);
      onJobUpdated(updatedJob);
      setIsItemModalOpen(false);
      setEditingItem(undefined);
      return;
    }

    if (!allowEditFindings) return;

    let updatedItems: InspectionItem[];
    const exists = job.items.some(i => i.id === item.id);
    
    if (exists) {
      updatedItems = job.items.map(i => i.id === item.id ? item : i);
    } else {
      updatedItems = [...job.items, item];
    }

    if (isL1LeadJob) {
      updatedItems = updatedItems.map(i =>
        i.id === item.id ? { ...i, result: 'Pending' as const } : i
      );
      item = { ...item, result: 'Pending' };
    }

    const calculatedResult = calculateOverallResult(updatedItems);

    const auditEntry: AuditEntry = {
      id: 'aud-' + Date.now(),
      timestamp: new Date().toISOString(),
      actorName: inspector?.fullName || 'Field Inspector',
      actorRole: 'Inspector',
      action: exists ? 'ITEM_UPDATED' : 'ITEM_ADDED',
      details: `${exists ? 'Updated' : 'Added'} inspection item ${item.itemNumber} (${item.result}${item.reading ? ` - ${item.reading} ${item.unit || ''}` : ''}).`
    };

    let updatedJob: Job = {
      ...job,
      items: updatedItems,
      overallResult: calculatedResult,
      status: job.status === 'Draft' || job.status === 'Assigned' ? 'In Progress' : job.status,
      auditTrail: [...(job.auditTrail || []), auditEntry]
    };
    if ((job.status === 'Draft' || job.status === 'Assigned') && updatedJob.status === 'In Progress') {
      updatedJob = ensureProcedureSnapshotOnJob(updatedJob, StorageService.getProcedures(), 'start');
    }

    StorageService.updateJob(updatedJob);
    onJobUpdated(updatedJob);

    if (!addAnother) {
      setIsItemModalOpen(false);
      setEditingItem(undefined);
    }
  };

  const handleDeleteItem = (itemId: string) => {
    if (!canAddItems) return;
    if (!confirm('Are you sure you want to delete this inspection item?')) return;

    const targetItem = job.items.find(i => i.id === itemId);
    const updatedItems = job.items.filter(i => i.id !== itemId);
    const calculatedResult = calculateOverallResult(updatedItems);

    const auditEntry: AuditEntry = {
      id: 'aud-' + Date.now(),
      timestamp: new Date().toISOString(),
      actorName: inspector?.fullName || 'Field Inspector',
      actorRole: 'Inspector',
      action: 'ITEM_DELETED',
      details: `Deleted inspection item ${targetItem?.itemNumber || itemId}.`
    };

    const updatedJob: Job = {
      ...job,
      items: updatedItems,
      overallResult: calculatedResult,
      auditTrail: [...(job.auditTrail || []), auditEntry]
    };

    StorageService.updateJob(updatedJob);
    onJobUpdated(updatedJob);
  };

  const handleConfirmAction = (payload: {
    signatureDataUrl?: string;
    supervisorSignatureDataUrl?: string;
    comments: string;
    temperatureOutOfRangeReason?: string;
  }) => {
    if (completeMode === 'l1_submit') {
      const priorRevision = job.findingsRevision || 1;
      const isResubmit = job.status === 'Revision Required' || (job.findingsHistory && job.findingsHistory.length > 0);
      const nextRevision = isResubmit ? priorRevision + 1 : priorRevision;

      const auditTrail: AuditEntry[] = [
        ...(job.auditTrail || [])
      ];

      if (isResubmit) {
        auditTrail.push({
          id: 'aud-' + Date.now() + '-supsede',
          timestamp: new Date().toISOString(),
          actorName: inspector?.fullName || 'Level 1 Technician',
          actorRole: 'Inspector',
          action: 'FINDINGS_SUPERSEDED',
          details: `Findings revision ${priorRevision} superseded by revision ${nextRevision} after supervisor rejection.`
        });
      }

      auditTrail.push(
        {
          id: 'aud-' + Date.now(),
          timestamp: new Date().toISOString(),
          actorName: inspector?.fullName || 'Level 1 Technician',
          actorRole: 'Inspector',
          action: 'SUBMITTED_TO_SUPERVISOR',
          details: `Level 1 findings (rev ${nextRevision}) submitted to supervisor ${supervisor?.fullName || 'assigned supervisor'} for evaluation (${job.items.length} item(s)).`
        },
        {
          id: 'aud-' + Date.now() + '-sig',
          timestamp: new Date().toISOString(),
          actorName: inspector?.fullName || 'Level 1 Technician',
          actorRole: 'Inspector',
          action: 'INSPECTOR_SIGNED',
          details: 'Level 1 technician signed findings record.'
        }
      );

      const submitted: Job = {
        ...job,
        status: 'Awaiting Supervisor',
        overallResult: 'PENDING',
        findingsRevision: nextRevision,
        items: resetItemEvaluations(job.items),
        signatureDataUrl: payload.signatureDataUrl,
        inspectorComments: payload.comments,
        temperatureOutOfRangeReason: payload.temperatureOutOfRangeReason,
        supervisorRejectionReason: undefined,
        supervisorRejectedAt: undefined,
        supervisorRejectedByName: undefined,
        supervisorSignatureDataUrl: undefined,
        supervisorSignedAt: undefined,
        auditTrail
      };
      StorageService.updateJob(submitted);
      onJobUpdated(submitted);
      setIsCompleteModalOpen(false);
      return;
    }

    const currentYear = new Date().getFullYear();
    const reportSeq = job.jobNumber.replace(`NDT-${currentYear}-`, '');
    const reportNumber = `REP-${currentYear}-${reportSeq}`;

    if (completeMode === 'supervisor_complete') {
      if (!assignedSup) {
        alert('Only the assigned supervisor may complete this job.');
        return;
      }
      const auditTrail: AuditEntry[] = [
        ...(job.auditTrail || []),
        {
          id: 'aud-' + Date.now(),
          timestamp: new Date().toISOString(),
          actorName: supervisor?.fullName || 'Supervisor',
          actorRole: 'Supervisor',
          action: 'SUPERVISOR_SIGNED',
          details: `Supervisor ${supervisor?.fullName} evaluated findings and completed the inspection for Level 3 review.`
        }
      ];

      const completedJob: Job = {
        ...clearL3CertificationFields(job),
        status: 'Completed',
        overallResult: calculateOverallResult(job.items),
        inspectorComments: payload.comments || job.inspectorComments,
        supervisorSignatureDataUrl: payload.supervisorSignatureDataUrl,
        supervisorSignedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        reportNumber,
        l3ReviewStatus: 'PENDING_REVIEW',
        auditTrail
      };
      StorageService.updateJob(completedJob);
      onJobUpdated(completedJob);
      setIsCompleteModalOpen(false);
      setIsReportModalOpen(true);
      return;
    }

    const auditTrail: AuditEntry[] = [
      ...(job.auditTrail || []),
      {
        id: 'aud-' + Date.now(),
        timestamp: new Date().toISOString(),
        actorName: inspector?.fullName || 'Field Inspector',
        actorRole: 'Inspector',
        action: 'INSPECTOR_SIGNED',
        details: 'Field examination completed and signed off. Submitted for Level 3 review.'
      }
    ];

    const completedJob: Job = {
      ...clearL3CertificationFields(job),
      status: 'Completed',
      overallResult: calculateOverallResult(job.items),
      signatureDataUrl: payload.signatureDataUrl,
      inspectorComments: payload.comments,
      completedAt: new Date().toISOString(),
      reportNumber,
      l3ReviewStatus: 'PENDING_REVIEW',
      auditTrail
    };

    StorageService.updateJob(completedJob);
    onJobUpdated(completedJob);
    setIsCompleteModalOpen(false);
    setIsReportModalOpen(true);
  };

  const handleSupervisorReject = () => {
    const validation = validateSupervisorReject(rejectReason);
    if (!validation.canComplete) {
      alert(validation.errors[0]);
      return;
    }
    if (!allowReject || !supervisor) {
      alert('Only the assigned supervisor may reject findings.');
      return;
    }

    const now = new Date().toISOString();
    const snapshot = snapshotFindingsRevision(job, {
      reason: rejectReason.trim(),
      rejectedAt: now,
      rejectedByName: supervisor.fullName
    });

    const auditEntry: AuditEntry = {
      id: 'aud-' + Date.now(),
      timestamp: now,
      actorName: supervisor.fullName,
      actorRole: 'Supervisor',
      action: 'SUPERVISOR_REJECTED',
      details: `Supervisor rejected findings revision ${snapshot.revision}. Reason: ${rejectReason.trim()}`,
      rejectionReason: rejectReason.trim()
    };

    const rejectedJob: Job = {
      ...job,
      status: 'Revision Required',
      overallResult: 'PENDING',
      findingsHistory: [...(job.findingsHistory || []), snapshot],
      items: resetItemEvaluations(job.items),
      supervisorRejectionReason: rejectReason.trim(),
      supervisorRejectedAt: now,
      supervisorRejectedByName: supervisor.fullName,
      supervisorSignatureDataUrl: undefined,
      supervisorSignedAt: undefined,
      auditTrail: [...(job.auditTrail || []), auditEntry]
    };

    StorageService.updateJob(rejectedJob);
    onJobUpdated(rejectedJob);
    setIsRejectModalOpen(false);
    setRejectReason('');
  };

  const handleReopenJob = () => {
    if (!allowReopen) {
      alert('Only Admin or Level 3 may reopen a completed job.');
      return;
    }
    if (!reopenReason.trim()) {
      alert('A reason is required to reopen a completed inspection.');
      return;
    }

    const auditEntry: AuditEntry = {
      id: 'aud-' + Date.now(),
      timestamp: new Date().toISOString(),
      actorName: userRole === 'l3_verifier' ? 'Dr. Johan Pretorius' : 'System Admin',
      actorRole: userRole === 'l3_verifier' ? 'Level 3 Verifier' : 'Admin',
      action: 'JOB_REOPENED',
      details: `Job reopened for corrections. Reason: ${reopenReason.trim()}`,
      rejectionReason: reopenReason.trim()
    };

    const cleared = clearFieldCompletionFields(clearL3CertificationFields(job));
    const reopenedJob: Job = {
      ...cleared,
      status: 'In Progress',
      auditTrail: [...(job.auditTrail || []), auditEntry]
    };
    StorageService.updateJob(reopenedJob);
    onJobUpdated(reopenedJob);
    setIsReopenModalOpen(false);
    setReopenReason('');
  };

  const handleRevokeL3 = () => {
    if (!confirm('Revoke Level 3 certification? This clears the L3 seal; the job stays Completed pending a new L3 review.')) return;
    const auditEntry: AuditEntry = {
      id: 'aud-' + Date.now(),
      timestamp: new Date().toISOString(),
      actorName: userRole === 'l3_verifier' ? 'Dr. Johan Pretorius' : 'System Admin',
      actorRole: userRole === 'l3_verifier' ? 'Level 3 Verifier' : 'Admin',
      action: 'L3_REVOKED',
      details: 'Level 3 certification revoked — report returns to Pending L3 review.'
    };
    const revoked: Job = {
      ...clearL3CertificationFields(job),
      status: 'Completed',
      l3ReviewStatus: 'PENDING_REVIEW',
      auditTrail: [...(job.auditTrail || []), auditEntry]
    };
    StorageService.updateJob(revoked);
    onJobUpdated(revoked);
  };

  // Auto suggest next item number
  const getNextItemSuggestion = (): string => {
    if (job.items.length === 0) return 'Weld 001';
    const lastItem = job.items[job.items.length - 1];
    const match = lastItem.itemNumber.match(/(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10) + 1;
      const padded = num.toString().padStart(match[1].length, '0');
      return lastItem.itemNumber.replace(/(\d+)$/, padded);
    }
    return `Weld ${String(job.items.length + 1).padStart(3, '0')}`;
  };

  const handleStartWork = () => {
    if (!allowStartWork) return;
    const auditEntry: AuditEntry = {
      id: 'aud-' + Date.now(),
      timestamp: new Date().toISOString(),
      actorName: inspector?.fullName || 'Field Inspector',
      actorRole: 'Inspector',
      action: 'JOB_STARTED',
      details: `Lead started field work on ${job.jobNumber} — status Assigned → In Progress.`
    };
    let updatedJob: Job = {
      ...job,
      status: 'In Progress',
      auditTrail: [...(job.auditTrail || []), auditEntry]
    };
    updatedJob = ensureProcedureSnapshotOnJob(updatedJob, StorageService.getProcedures(), 'start');
    StorageService.updateJob(updatedJob);
    onJobUpdated(updatedJob);
  };

  return (
    <div className="max-w-4xl mx-auto pb-24 px-3 sm:px-6">
      
      {/* Top Back Navigation Bar */}
      <div className="py-3 flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-300 hover:text-white py-1 px-2.5 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to List</span>
        </button>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          {userRole === 'admin' && onEditJob && (job.status === 'Draft' || job.status === 'Assigned') && (
            <button
              type="button"
              onClick={onEditJob}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600/20 border border-sky-500/40 text-sky-300 text-xs font-bold hover:bg-sky-600/30"
            >
              <Edit3 className="w-3.5 h-3.5" />
              {job.status === 'Draft' ? 'Continue setup' : 'Edit job'}
            </button>
          )}
          <Badge variant="status" value={job.status} size="sm">
            {job.status}
          </Badge>
          <Badge variant="method" value={job.method} size="sm">
            {job.method}
          </Badge>
          {isCompleted && (
            <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
              isL3Approved
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
            }`}>
              {isL3Approved ? 'L3 Certified' : 'Awaiting L3'}
            </span>
          )}
        </div>
      </div>

      {/* Level 3 Rejection / Revision Alert Banner if rejected */}
      {job.l3ReviewStatus === 'REJECTED' && job.l3RejectionReason && (
        <div className="mb-4 p-4 rounded-xl bg-rose-500/15 border border-rose-500/40 text-xs text-rose-300 space-y-1">
          <div className="flex items-center gap-2 font-bold text-rose-200">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>
              {isL1LeadJob
                ? `Level 3 returned findings for revision (${job.l3VerifierName || 'L3 QA'})`
                : `Level 3 rejected report — lead inspector must re-sign (${job.l3VerifierName || 'L3 QA'})`}
            </span>
          </div>
          <p className="pl-6 text-rose-100 font-medium">{job.l3RejectionReason}</p>
          <p className="pl-6 text-rose-300/80">
            {isL1LeadJob
              ? 'Next: Level 1 revises findings → Resubmit to Supervisor → Supervisor re-evaluates.'
              : 'Next: Lead inspector re-evaluates / re-signs, then resubmit for Level 3 review.'}
          </p>
        </div>
      )}

      {/* Expiry Warnings */}
      {(showCertWarning || showEquipWarning) && (
        <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 space-y-1">
          {showCertWarning && (
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Inspector Cert: <strong>{certCheck.formattedText}</strong> ({inspector?.certNumber})</span>
            </div>
          )}
          {showEquipWarning && equipCheck && (
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Equipment Calibration: <strong>{equipCheck.formattedText}</strong> ({worstEquip?.name})</span>
            </div>
          )}
        </div>
      )}

      {jobTempCompare.status === 'outside' && (
        <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/40 text-xs text-amber-200 space-y-1">
          <div className="flex items-center gap-2 font-bold text-amber-100">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            Job temperature outside linked WEP range
          </div>
          <p className="pl-6">{jobTempCompare.reasons[0]}</p>
          {job.temperatureOutOfRangeReason && (
            <p className="pl-6 text-amber-100/80">Recorded reason: {job.temperatureOutOfRangeReason}</p>
          )}
        </div>
      )}

      {/* Clean Job Header Summary Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight font-mono">
                {job.jobNumber}
              </h1>
              {job.reportNumber && (
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  {job.reportNumber}
                </span>
              )}
            </div>
            <p className="text-sm font-semibold text-sky-400 mt-0.5">
              {customer?.companyName || 'Unknown Customer'}
            </p>
          </div>

          {/* Result Tag & L3 Verifier Action */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Overall Result</span>
              <span className={`text-base font-black px-3 py-1 rounded-lg inline-block mt-0.5 ${
                job.overallResult === 'PASS'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : job.overallResult === 'FAIL'
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
              }`}>
                {job.overallResult}
              </span>
            </div>
          </div>
        </div>

        {/* Metadata Details Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 text-xs">
          <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
            <span className="text-slate-400 block flex items-center gap-1 mb-1">
              <MapPin className="w-3.5 h-3.5 text-sky-400" /> Site / Plant
            </span>
            <span className="font-semibold text-slate-200 truncate block">
              {site?.name || 'On Site'}
            </span>
          </div>

          <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
            <span className="text-slate-400 block flex items-center gap-1 mb-1">
              <Calendar className="w-3.5 h-3.5 text-sky-400" /> Test Date
            </span>
            <span className="font-semibold text-slate-200 block">
              {formatDate(job.inspectionDate)}
            </span>
          </div>

          <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
            <span className="text-slate-400 block flex items-center gap-1 mb-1">
              <Award className="w-3.5 h-3.5 text-sky-400" /> Lead Inspector
            </span>
            <span className="font-semibold text-slate-200 truncate block">
              {inspector?.fullName || 'Assigned Tech'}
            </span>
          </div>

          <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
            <span className="text-slate-400 block flex items-center gap-1 mb-1">
              <FileCheck className="w-3.5 h-3.5 text-sky-400" /> Standard Spec
            </span>
            <span className="font-semibold text-slate-200 truncate block" title={job.standardSpec}>
              {job.standardSpec || 'ASME Section V'}
            </span>
          </div>
        </div>

        {/* Scope + examination conditions (field as-found) */}
        <div className="mt-3 pt-3 border-t border-slate-800/60 space-y-3">
          <div className="text-xs text-slate-300">
            <strong className="text-slate-400 font-semibold">Scope (work order): </strong>
            {job.scope?.trim() || <span className="text-rose-400">Not recorded</span>}
          </div>
          {job.surfacePrepInstruction?.trim() && (
            <div className="text-xs text-slate-400">
              <strong className="font-semibold">Prep instruction: </strong>
              {job.surfacePrepInstruction}
            </div>
          )}
          {(procedureSnapshot?.temperature || linkedProcedure?.temperature) && (
            <div className="text-[11px] text-cyan-300/90">
              WEP temperature limit: {procedureSnapshot?.temperature || linkedProcedure?.temperature}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
              <span className="text-slate-400 block mb-1">As-found surface</span>
              <span className="font-semibold text-slate-200 block">
                {job.surfaceCondition?.trim() || <span className="text-rose-400 font-normal">Not recorded</span>}
              </span>
            </div>
            <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
              <span className="text-slate-400 block mb-1">Measured temp</span>
              <span className="font-semibold text-slate-200 block">
                {job.temperatureC !== undefined && Number.isFinite(job.temperatureC)
                  ? `${job.temperatureC}°C`
                  : job.temperature?.trim() || (
                      <span className="text-rose-400 font-normal">Not recorded</span>
                    )}
              </span>
            </div>
            <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
              <span className="text-slate-400 block mb-1">
                Ambient light{(job.method === 'VT' || job.method === 'MT') ? ' *' : ''}
              </span>
              <span className="font-semibold text-slate-200 block">
                {job.ambientLight?.trim() || (
                  <span className={`font-normal ${job.method === 'VT' || job.method === 'MT' ? 'text-rose-400' : 'text-slate-500'}`}>
                    {job.method === 'VT' || job.method === 'MT' ? 'Not recorded' : '—'}
                  </span>
                )}
              </span>
            </div>
          </div>
          {canEditExamConditions && (
            <ExaminationConditionsEditor
              job={job}
              wepTempHint={procedureSnapshot?.temperature || linkedProcedure?.temperature}
              onSave={(patch) => {
                const updated: Job = {
                  ...job,
                  scope: patch.scope,
                  surfaceCondition: patch.surfaceCondition,
                  temperatureC: patch.temperatureC,
                  temperature: `${patch.temperatureC}°C`,
                  ambientLight: patch.ambientLight || undefined,
                  updatedAt: new Date().toISOString(),
                  auditTrail: [
                    ...(job.auditTrail || []),
                    {
                      id: 'aud-' + Date.now(),
                      timestamp: new Date().toISOString(),
                      actorName: inspector?.fullName || 'User',
                      actorRole: viewerRole === 'admin' ? 'Admin' : 'Inspector',
                      action: 'EXAM_CONDITIONS_UPDATED',
                      details: 'Updated field examination conditions (as-found surface / °C / light).'
                    }
                  ]
                };
                StorageService.updateJob(updated);
                onJobUpdated(updated);
              }}
            />
          )}
          {!canEditExamConditions &&
            (job.status === 'Assigned' || job.status === 'In Progress' || job.status === 'Revision Required') &&
            (viewerRole === 'lead_l1' || viewerRole === 'lead_l2_plus') &&
            job.status === 'Assigned' && (
              <p className="text-[11px] text-amber-300/90">
                Start work to record as-found surface, measured °C, and light on site.
              </p>
            )}
        </div>

        <div className="mt-3 flex flex-wrap gap-2 items-center">
          {job.procedureNumber || job.procedureId || procedureSnapshot ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
              <FileCheck className="w-3.5 h-3.5" />
              WEP {procedureSnapshot?.procedureNumber || job.procedureNumber || job.procedureId}
              {displayRevision ? ` · ${displayRevision}` : ''}
              {procedureSnapshot ? ' · frozen' : ''}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
              No WEP linked
            </span>
          )}
          {(userRole === 'admin' || userRole === 'l3_verifier') && (job.procedureId || procedureSnapshot) && (
            <button
              type="button"
              onClick={() => {
                const procs = StorageService.getProcedures().filter(p => p.method === job.method && p.status === 'Active');
                if (procs.length === 0) {
                  alert('No active procedures for this method.');
                  return;
                }
                const pick = window.prompt(
                  `Replace frozen WEP. Enter procedure id:\n${procs.map(p => `${p.id} — ${p.procedureNumber} ${p.revisionNumber}`).join('\n')}`,
                  procs[0].id
                );
                if (!pick) return;
                const next = procs.find(p => p.id === pick) || StorageService.getProcedures().find(p => p.id === pick);
                if (!next) {
                  alert('Procedure not found.');
                  return;
                }
                const reason = window.prompt('Reason for replacing procedure revision (required):', '');
                if (!reason?.trim()) {
                  alert('Reason is required.');
                  return;
                }
                const replaced = replaceProcedureSnapshot(
                  job,
                  next,
                  userRole === 'admin' ? 'Admin' : 'L3 Verifier',
                  userRole === 'admin' ? 'Admin' : 'Level 3 Verifier',
                  reason.trim()
                );
                StorageService.updateJob(replaced);
                onJobUpdated(replaced);
              }}
              className="text-[10px] font-bold text-amber-400 hover:text-amber-300 underline"
            >
              Replace WEP revision
            </button>
          )}
          {equipmentList.length > 0 ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-sky-500/10 text-sky-300 border border-sky-500/30">
              <Wrench className="w-3.5 h-3.5" />
              {equipmentList.length} equipment
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
              <Wrench className="w-3.5 h-3.5" />
              No equipment linked
            </span>
          )}
          {job.findingsRevision ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-violet-500/10 text-violet-300 border border-violet-500/30">
              Findings rev {job.findingsRevision}
            </span>
          ) : null}
        </div>
      </div>

      {/* Inspection Items Section */}
      <div className="space-y-3">
        {job.status === 'Assigned' && (
          <div className="p-4 rounded-xl bg-sky-950/40 border border-sky-500/40 space-y-3">
            <div className="flex items-start gap-2">
              <Play className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-sky-100">Assigned — start work to capture findings</p>
                <p className="text-xs text-sky-200/80 mt-0.5">
                  Domain rule: field readings begin only after the lead starts the job (Assigned → In Progress).
                </p>
              </div>
            </div>
            {allowStartWork ? (
              <button
                type="button"
                onClick={handleStartWork}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm shadow-lg shadow-sky-600/25"
              >
                <Play className="w-4 h-4" />
                Start work
              </button>
            ) : (
              <p className="text-xs text-slate-400">
                Only the assigned lead can start this job. Switch to the lead persona (demo), or open as Admin to edit assignment.
              </p>
            )}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-white flex items-center gap-2">
              <span>Inspection Items & Readings</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-bold border border-slate-700">
                {job.items.length}
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              {isCompleted
                ? 'Inspection complete — findings and evaluation are locked'
                : job.status === 'Assigned'
                ? 'Start work before adding inspection points'
                : isL1LeadJob && allowEditFindings
                ? 'Record readings and indications — supervisor will evaluate Pass/Fail'
                : isAwaitingSupervisor
                ? 'Findings locked — assigned supervisor evaluates Pass / Fail / N/A only'
                : 'Record measurements, evaluation result, and evidential photos'}
            </p>
          </div>

          {canAddItems && (
            <button
              type="button"
              onClick={() => {
                setEditingItem(undefined);
                setIsItemModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-lg shadow-sky-600/20 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add Item</span>
            </button>
          )}
        </div>

        {isRevisionRequired && job.supervisorRejectionReason && (
          <div className="mb-4 p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-xs text-rose-200 space-y-1">
            <div className="font-bold text-rose-100">Revision required by supervisor ({job.supervisorRejectedByName || 'Supervisor'})</div>
            <p className="text-rose-100/90">{job.supervisorRejectionReason}</p>
            <p className="text-rose-300/80">Update your findings, then resubmit. Prior revision is kept below.</p>
          </div>
        )}

        {(job.findingsHistory?.length || 0) > 0 && (
          <div className="mb-3 rounded-xl border border-slate-800 bg-slate-950/50 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowFindingsHistory(v => !v)}
              className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-900/80"
            >
              <span className="flex items-center gap-2">
                <History className="w-3.5 h-3.5 text-violet-400" />
                Prior findings revisions ({job.findingsHistory!.length})
              </span>
              <span className="text-slate-500">{showFindingsHistory ? 'Hide' : 'Show'}</span>
            </button>
            {showFindingsHistory && (
              <div className="px-3.5 pb-3 space-y-3 border-t border-slate-800">
                {job.findingsHistory!.map((rev) => (
                  <div key={`hist-${rev.revision}-${rev.rejectedAt || rev.submittedAt}`} className="pt-3 text-xs space-y-2">
                    <div className="flex flex-wrap items-center gap-2 text-slate-400">
                      <span className="font-bold text-violet-300">Rev {rev.revision}</span>
                      <span>Submitted {formatDateTime(rev.submittedAt)}</span>
                      {rev.rejectedByName && (
                        <span className="text-rose-300">Rejected by {rev.rejectedByName}</span>
                      )}
                    </div>
                    {rev.rejectionReason && (
                      <p className="text-rose-200/90">{rev.rejectionReason}</p>
                    )}
                    <ul className="space-y-1.5">
                      {rev.items.map((it) => (
                        <li key={it.id} className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
                          <span className="font-semibold text-white">{it.itemNumber}</span>
                          {' · '}
                          {it.reading ? `${it.reading} ${it.unit}` : '—'}
                          {' · '}
                          <span className={it.result === 'Fail' ? 'text-rose-300' : it.result === 'Pass' ? 'text-emerald-300' : 'text-amber-300'}>
                            {it.result}
                          </span>
                          {it.indication ? ` — ${it.indication}` : ''}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {isAwaitingSupervisor && (
          <div className="mb-4 p-3.5 rounded-xl bg-violet-500/10 border border-violet-500/30 text-xs text-violet-200">
            <strong className="text-violet-100">Awaiting supervisor evaluation.</strong>{' '}
            Level 1 findings are locked. {supervisor?.fullName || 'The supervising inspector'} may evaluate Pass/Fail/N/A or reject with a reason.
            {job.findingsRevision ? ` (Findings rev ${job.findingsRevision})` : ''}
          </div>
        )}

        {/* Empty State */}
        {job.items.length === 0 ? (
          <div className="bg-slate-900/60 border-2 border-dashed border-slate-800 rounded-2xl p-8 text-center">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/10 text-sky-400 flex items-center justify-center mx-auto mb-3">
              <Plus className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-sm text-white mb-1">No inspection items recorded yet</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
              {canAddItems
                ? 'Tap the button below to add your first weld, pipe section, or inspection point.'
                : job.status === 'Assigned'
                ? 'Start work first — then you can add welds and inspection points on site.'
                : 'Inspection points unlock when this job is in progress and findings are editable.'}
            </p>
            {canAddItems && (
              <button
                type="button"
                onClick={() => {
                  setEditingItem(undefined);
                  setIsItemModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-500 text-white font-bold text-xs shadow-lg shadow-sky-500/25 active:scale-95 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Inspection Item (Weld 001)</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {job.items.map((item, idx) => {
              const isPass = item.result === 'Pass';
              const isFail = item.result === 'Fail';
              const isPending = item.result === 'Pending' || !isItemEvaluated(item.result);

              return (
                <div
                  key={item.id}
                  role={canViewItemDetail ? 'button' : undefined}
                  tabIndex={canViewItemDetail ? 0 : undefined}
                  onClick={() => {
                    if (!canViewItemDetail) return;
                    setEditingItem(item);
                    setIsItemModalOpen(true);
                  }}
                  onKeyDown={(e) => {
                    if (!canViewItemDetail) return;
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setEditingItem(item);
                      setIsItemModalOpen(true);
                    }
                  }}
                  className={`bg-slate-900 border rounded-2xl p-4 transition-all shadow-md ${
                    canViewItemDetail ? 'cursor-pointer hover:shadow-lg hover:border-sky-500/50 active:scale-[0.99]' : ''
                  } ${
                    isFail
                      ? 'border-rose-500/40 bg-gradient-to-r from-rose-950/20 to-slate-900'
                      : isPass
                      ? 'border-slate-800 hover:border-emerald-500/40'
                      : isPending
                      ? 'border-amber-500/30 bg-amber-950/10'
                      : 'border-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-400">#{idx + 1}</span>
                        <h4 className="font-black text-sm text-white">{item.itemNumber}</h4>
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          isPass
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : isFail
                            ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                            : isPending
                            ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                            : 'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}>
                          {item.result}
                        </span>
                        {item.constraintFlags?.includes('OUTSIDE_CRITERION') && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/40">
                            Outside band — likely Fail
                          </span>
                        )}
                        {item.constraintFlags?.includes('OUTSIDE_PROC_TEMP') && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/40">
                            Out of WEP temp
                          </span>
                        )}
                        {item.photos.length > 0 && (
                          <span className="flex items-center gap-1 text-[11px] font-medium text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                            <Camera className="w-3 h-3" />
                            {item.photos.length}
                          </span>
                        )}
                        {canViewItemDetail && (
                          <span className="text-[10px] font-semibold text-slate-500 ml-auto sm:ml-0">
                            {allowEvaluate ? 'Tap to evaluate' : itemModalViewOnly ? 'Tap to view' : 'Tap to open'}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-300 mt-1 font-medium">{item.description}</p>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-slate-400">
                        {item.reading ? (
                          <div>
                            <span className="text-slate-500">Reading:</span>{' '}
                            <strong className="text-sky-300 font-mono text-xs bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20">
                              {item.reading} {item.unit || ''}
                            </strong>
                          </div>
                        ) : null}
                        {item.acceptanceCriteria && (
                          <div>
                            <span className="text-slate-500">Criteria:</span>{' '}
                            <span className="text-slate-300">{item.acceptanceCriteria}</span>
                          </div>
                        )}
                        {item.methodDetails?.technique && (
                          <div>
                            <span className="text-slate-500">Technique:</span>{' '}
                            <span className="text-slate-300">{item.methodDetails.technique}</span>
                          </div>
                        )}
                      </div>

                      {item.indication && (
                        <div className="mt-2 text-xs text-rose-300 bg-rose-500/10 p-2 rounded-lg border border-rose-500/20 font-medium">
                          <strong>Defect Indication:</strong> {item.indication}
                        </div>
                      )}

                      {item.photos.length > 0 && (
                        <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1">
                          {item.photos.map(p => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setLightboxPhoto({ dataUrl: p.dataUrl, caption: p.caption || item.itemNumber });
                              }}
                              className="shrink-0 rounded-lg border border-slate-700 bg-slate-950 overflow-hidden hover:border-sky-400/60 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                              title="View full photo"
                            >
                              <img
                                src={p.dataUrl}
                                alt={p.caption || 'Evidential photo'}
                                className="w-14 h-14 object-cover"
                              />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {canAddItems && (
                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Delete item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Quick Add Another Button below list */}
        {canAddItems && job.items.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setEditingItem(undefined);
              setIsItemModalOpen(true);
            }}
            className="w-full py-3 rounded-2xl border-2 border-dashed border-slate-800 hover:border-sky-500/50 hover:bg-slate-900/60 text-sky-400 font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-98"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Next Item ({getNextItemSuggestion()})</span>
          </button>
        )}
      </div>

      {/* Audit Trail Section */}
      <div className="mt-8 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
        <div 
          onClick={() => setShowAuditTrail(!showAuditTrail)}
          className="flex items-center justify-between cursor-pointer"
        >
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            <History className="w-4 h-4 text-sky-400" />
            <span>Audit Trail & Verification History ({job.auditTrail?.length || 0} events)</span>
          </div>
          <span className="text-xs text-sky-400 font-semibold">
            {showAuditTrail ? 'Hide History' : 'View History'}
          </span>
        </div>

        {showAuditTrail && (
          <div className="mt-3 space-y-2 max-h-48 overflow-y-auto pt-2 border-t border-slate-800/80">
            {(job.auditTrail || []).map((entry) => (
              <div key={entry.id} className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800/80 text-xs">
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-0.5">
                  <span className="font-bold text-slate-200">{entry.actorName} ({entry.actorRole})</span>
                  <span>{formatDateTime(entry.timestamp)}</span>
                </div>
                <p className="text-slate-300">{entry.details}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Sticky Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 p-3 sm:p-4 shadow-2xl">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 hidden sm:inline">Overall:</span>
            <span className={`px-2.5 py-1 rounded-lg text-xs font-black ${
              job.overallResult === 'PASS'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : job.overallResult === 'FAIL'
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
            }`}>
              {job.overallResult}
            </span>
            <span className="text-xs text-slate-400">
              ({job.items.length} item{job.items.length === 1 ? '' : 's'})
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isCompleted ? (
              <>
                {allowReopen && (
                  <button
                    type="button"
                    onClick={() => setIsReopenModalOpen(true)}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-slate-700 active:scale-95 transition-all"
                  >
                    Reopen
                  </button>
                )}

                {(userRole === 'l3_verifier' || userRole === 'admin') && (
                  reportIsCertified ? (
                    <button
                      type="button"
                      onClick={handleRevokeL3}
                      className="px-3.5 py-2.5 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 font-bold text-xs border border-amber-500/30 flex items-center gap-1.5 active:scale-95 transition-all"
                    >
                      <Award className="w-4 h-4 text-amber-400" />
                      <span>Revoke L3</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsL3ReviewModalOpen(true)}
                      className="px-3.5 py-2.5 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 font-bold text-xs border border-amber-500/30 flex items-center gap-1.5 active:scale-95 transition-all"
                    >
                      <Award className="w-4 h-4 text-amber-400" />
                      <span>Level 3 Review</span>
                    </button>
                  )
                )}

                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(true)}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-500 hover:from-sky-500 hover:to-cyan-400 text-white font-bold text-xs sm:text-sm shadow-lg shadow-sky-500/25 flex items-center gap-2 active:scale-95 transition-all"
                >
                  <FileText className="w-4 h-4" />
                  <span>{reportIsCertified ? 'PDF Certificate' : 'Draft Report / Pending L3'}</span>
                </button>
              </>
            ) : showPrimaryAction ? (
              <div className="flex items-center gap-2">
                {allowReject && (
                  <button
                    type="button"
                    onClick={() => setIsRejectModalOpen(true)}
                    className="px-4 py-2.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 font-bold text-xs border border-rose-500/40 active:scale-95 transition-all"
                  >
                    Reject to L1
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsCompleteModalOpen(true)}
                  disabled={!canOpenCompleteModal}
                  title={!canOpenCompleteModal ? completePreflightHint : undefined}
                  aria-disabled={!canOpenCompleteModal}
                  className={`px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-lg flex items-center gap-2 transition-all ${
                    !canOpenCompleteModal
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700 shadow-none'
                      : completeMode === 'l1_submit'
                      ? 'bg-gradient-to-r from-violet-600 to-fuchsia-500 hover:from-violet-500 hover:to-fuchsia-400 text-white shadow-violet-500/25 active:scale-95'
                      : 'bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-emerald-500/25 active:scale-95'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {completeMode === 'l1_submit'
                      ? (isRevisionRequired ? 'Resubmit to Supervisor' : 'Submit to Supervisor')
                      : completeMode === 'supervisor_complete'
                      ? 'Sign & Complete (Supervisor)'
                      : 'Complete & Sign'}
                  </span>
                </button>
              </div>
            ) : isAwaitingSupervisor && viewerRole === 'lead_l1' ? (
              <span className="px-4 py-2 rounded-xl text-xs font-bold text-violet-300 bg-violet-500/10 border border-violet-500/30">
                Submitted — awaiting {supervisor?.fullName || 'supervisor'}
              </span>
            ) : isAwaitingSupervisor && viewerRole === 'admin' ? (
              <span className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 bg-slate-800 border border-slate-700">
                View only — assigned supervisor acts
              </span>
            ) : viewerRole === 'admin' && !isCompleted ? (
              <span className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 bg-slate-800 border border-slate-700">
                Admin — orchestrate only (no field sign-off)
              </span>
            ) : null}
          </div>

        </div>
      </div>

      {/* Item Modal */}
      <InspectionItemModal
        key={`item-modal-${editingItem?.id || 'new'}-${itemModalViewOnly ? 'view' : evaluateOnly ? 'eval' : findingsOnly ? 'findings' : 'edit'}-${isItemModalOpen ? 'open' : 'closed'}`}
        isOpen={isItemModalOpen}
        onClose={() => {
          setIsItemModalOpen(false);
          setEditingItem(undefined);
        }}
        onSave={handleSaveItem}
        method={job.method}
        existingItem={editingItem}
        nextItemNumberSuggestion={getNextItemSuggestion()}
        findingsOnly={findingsOnly && !evaluateOnly && !itemModalViewOnly}
        evaluateOnly={evaluateOnly && !itemModalViewOnly}
        viewOnly={itemModalViewOnly}
        criteriaLibrary={procedureSnapshot?.acceptanceCriteria}
      />

      {lightboxPhoto && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/95 backdrop-blur-sm p-4"
          onClick={() => setLightboxPhoto(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Evidential photo"
        >
          <button
            type="button"
            onClick={() => setLightboxPhoto(null)}
            className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800 text-white hover:bg-slate-700 border border-slate-600"
            aria-label="Close photo"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="max-w-5xl max-h-[90vh] w-full flex flex-col items-center gap-3" onClick={(e) => e.stopPropagation()}>
            <img
              src={lightboxPhoto.dataUrl}
              alt={lightboxPhoto.caption || 'Evidential photo'}
              className="max-h-[85vh] max-w-full object-contain rounded-xl border border-slate-700 shadow-2xl"
            />
            {lightboxPhoto.caption && (
              <p className="text-sm text-slate-300 font-medium text-center">{lightboxPhoto.caption}</p>
            )}
          </div>
        </div>
      )}

      <CompleteInspectionModal
        isOpen={isCompleteModalOpen}
        onClose={() => setIsCompleteModalOpen(false)}
        mode={completeMode}
        onConfirm={handleConfirmAction}
        job={job}
        inspector={inspector}
        supervisor={supervisor}
        equipmentList={equipmentList}
        customer={customer}
        actorInspectorId={viewerInspectorId}
      />

      {isReopenModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-amber-500/40 w-full sm:max-w-md rounded-2xl shadow-2xl p-5 space-y-4">
            <h3 className="font-bold text-white text-base">Reopen completed inspection</h3>
            <p className="text-xs text-slate-400">
              Clears field signatures, report number, overall result, and any Level 3 seal. Audit trail is retained. Admin / L3 only.
            </p>
            <textarea
              rows={3}
              value={reopenReason}
              onChange={(e) => setReopenReason(e.target.value)}
              placeholder="Required: reason for reopen…"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-amber-500/40 text-white text-sm focus:outline-none focus:border-amber-400"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setIsReopenModalOpen(false); setReopenReason(''); }}
                className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReopenJob}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold"
              >
                Confirm Reopen
              </button>
            </div>
          </div>
        </div>
      )}

      {isRejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-rose-500/40 w-full sm:max-w-md rounded-2xl shadow-2xl p-5 space-y-4">
            <h3 className="font-bold text-white text-base">Reject findings to Level 1</h3>
            <p className="text-xs text-slate-400">
              Findings revision will be archived to history. Level 1 must correct and resubmit a new revision. All evaluations reset.
            </p>
            <textarea
              rows={4}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Required: explain what the Level 1 technician must correct…"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-rose-500/40 text-white text-sm focus:outline-none focus:border-rose-400"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setIsRejectModalOpen(false); setRejectReason(''); }}
                className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSupervisorReject}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Level 3 Review Modal (Guarded: Never accessible to technician) */}
      {userRole !== 'technician' && isL3ReviewModalOpen && (
        <Level3ReviewModal
          key={`${job.id}-l3-open`}
          isOpen={isL3ReviewModalOpen}
          onClose={() => setIsL3ReviewModalOpen(false)}
          job={job}
          customer={customer}
          inspector={inspector}
          equipmentList={equipmentList}
          onJobUpdated={(updated) => {
            onJobUpdated(updated);
            setIsL3ReviewModalOpen(false);
          }}
        />
      )}

      {/* Report Modal */}
      <ReportViewModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        job={job}
        customer={customer}
        inspector={inspector}
        supervisor={supervisor}
        equipmentList={equipmentList}
        settings={settings}
        userRole={userRole}
        onJobUpdated={onJobUpdated}
      />

    </div>
  );
};

type ExamConditionsPatch = {
  scope: string;
  surfaceCondition: string;
  temperatureC: number;
  ambientLight: string;
};

const ExaminationConditionsEditor: React.FC<{
  job: Job;
  wepTempHint?: string;
  onSave: (patch: ExamConditionsPatch) => void;
}> = ({ job, wepTempHint, onSave }) => {
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState(job.scope || '');
  const [surfaceCondition, setSurfaceCondition] = useState(job.surfaceCondition || '');
  const [tempInput, setTempInput] = useState(
    job.temperatureC !== undefined && Number.isFinite(job.temperatureC)
      ? String(job.temperatureC)
      : ''
  );
  const [ambientLight, setAmbientLight] = useState(job.ambientLight || '');
  const lightRequired = job.method === 'VT' || job.method === 'MT';

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setScope(job.scope || '');
          setSurfaceCondition(job.surfaceCondition || '');
          setTempInput(
            job.temperatureC !== undefined && Number.isFinite(job.temperatureC)
              ? String(job.temperatureC)
              : ''
          );
          setAmbientLight(job.ambientLight || '');
          setOpen(true);
        }}
        className="inline-flex items-center gap-1.5 text-[11px] font-bold text-sky-400 hover:text-sky-300"
      >
        <Edit3 className="w-3.5 h-3.5" />
        Record / edit as-found conditions
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-sky-500/30 bg-sky-950/20 p-3 space-y-2.5">
      <p className="text-[11px] font-bold uppercase tracking-wide text-sky-300">
        As-found examination conditions
      </p>
      {wepTempHint && (
        <p className="text-[10px] text-cyan-300/80">WEP allowed range: {wepTempHint}</p>
      )}
      <div>
        <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1">Scope refine (optional)</label>
        <input
          type="text"
          value={scope}
          onChange={e => setScope(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-sky-500"
        />
      </div>
      <div>
        <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1">As-found surface *</label>
        <input
          type="text"
          value={surfaceCondition}
          onChange={e => setSurfaceCondition(e.target.value)}
          placeholder="e.g. Wire brushed & solvent degreased"
          className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-sky-500"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1">
            Measured temperature (°C) *
          </label>
          <div className="flex items-stretch rounded-lg border border-slate-700 bg-slate-950 overflow-hidden focus-within:border-sky-500">
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              value={tempInput}
              onChange={e => setTempInput(e.target.value)}
              placeholder="21"
              className="w-full px-3 py-2 bg-transparent text-white text-sm focus:outline-none"
            />
            <span className="px-3 flex items-center text-xs font-bold text-slate-400 border-l border-slate-700 bg-slate-900/80">
              °C
            </span>
          </div>
        </div>
        <div>
          <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1">
            Ambient light{lightRequired ? ' *' : ' (optional)'}
          </label>
          <input
            type="text"
            value={ambientLight}
            onChange={e => setAmbientLight(e.target.value)}
            placeholder={lightRequired ? 'e.g. 1200 Lux' : 'Optional'}
            className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-sky-500"
          />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 text-xs font-semibold"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => {
            const n = parseFloat(tempInput);
            if (!scope.trim() || !surfaceCondition.trim() || !Number.isFinite(n)) {
              alert('Scope, as-found surface, and measured temperature (°C) are required.');
              return;
            }
            if (lightRequired && !ambientLight.trim()) {
              alert(`Ambient light is required for ${job.method} examinations.`);
              return;
            }
            onSave({
              scope: scope.trim(),
              surfaceCondition: surfaceCondition.trim(),
              temperatureC: n,
              ambientLight: ambientLight.trim()
            });
            setOpen(false);
          }}
          className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold"
        >
          Save conditions
        </button>
      </div>
    </div>
  );
};
