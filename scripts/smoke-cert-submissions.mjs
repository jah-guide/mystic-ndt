/**
 * Smoke: dual-state cert/vision pending → reject → approve keeps gates on verified expiry.
 * Run: node scripts/smoke-cert-submissions.mjs
 */
import {
  applyMethodCertPendingUpload,
  approveMethodCertPending,
  rejectMethodCertPending,
  buildCertSubmission,
  hasPendingCertSubmission,
  applyVisionPendingUpload,
  approveVisionPending,
  rejectVisionPending,
  hasPendingVisionSubmission
} from '../src/utils/certSubmissions.ts';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const baseCert = {
  id: 'mc-ut',
  method: 'UT',
  level: 'Level 2',
  certNumber: 'UT-1',
  issuer: 'SAQCC',
  issueDate: '2024-01-01',
  expiryDate: '2027-06-01',
  verificationStatus: 'Verified',
  documentDataUrl: 'data:text/plain,old'
};

const sub = buildCertSubmission({
  documentDataUrl: 'data:text/plain,new',
  documentFileName: 'new.pdf',
  proposedExpiryDate: '2028-06-01',
  proposedCertNumber: 'UT-2',
  submittedByName: 'Lesego'
});

const pending = applyMethodCertPendingUpload(baseCert, sub);
assert(pending.verificationStatus === 'Verified', 'upload flipped status');
assert(pending.expiryDate === '2027-06-01', 'upload changed active expiry');
assert(hasPendingCertSubmission(pending), 'missing pending');

const rejected = rejectMethodCertPending(pending, 'unclear');
assert(!hasPendingCertSubmission(rejected), 'reject left pending');
assert(rejected.verificationStatus === 'Verified', 'reject flipped Verified');
assert(rejected.expiryDate === '2027-06-01', 'reject changed expiry');

const pending2 = applyMethodCertPendingUpload(rejected, sub);
const approved = approveMethodCertPending(pending2, {
  expiryDate: '2028-07-01',
  certNumber: 'UT-2',
  verifiedByName: 'Admin'
});
assert(approved.verificationStatus === 'Verified', 'approve not verified');
assert(approved.expiryDate === '2028-07-01', 'approve expiry mismatch');
assert(approved.documentDataUrl === 'data:text/plain,new', 'approve doc not copied');
assert(!hasPendingCertSubmission(approved), 'approve left pending');

const insp = {
  id: 'i1',
  fullName: 'Chris',
  email: '',
  phone: '',
  certification: '',
  certNumber: '',
  level: 'Level 2',
  certExpiryDate: '2027-01-01',
  methods: ['UT'],
  visionAcuityExpiryDate: '2025-01-01',
  visionVerificationStatus: 'Verified'
};
const vPending = applyVisionPendingUpload(
  insp,
  buildCertSubmission({
    documentDataUrl: 'data:text/plain,v',
    proposedExpiryDate: '2027-01-01',
    submittedByName: 'Chris'
  })
);
assert(hasPendingVisionSubmission(vPending), 'vision pending missing');
assert(vPending.visionAcuityExpiryDate === '2025-01-01', 'vision upload changed active');
const vReject = rejectVisionPending(vPending, 'bad scan');
assert(!hasPendingVisionSubmission(vReject), 'vision reject left pending');
const vPending2 = applyVisionPendingUpload(
  vReject,
  buildCertSubmission({
    documentDataUrl: 'data:text/plain,v2',
    proposedExpiryDate: '2027-06-01',
    submittedByName: 'Chris'
  })
);
const vOk = approveVisionPending(vPending2, { expiryDate: '2027-06-15' });
assert(vOk.visionAcuityExpiryDate === '2027-06-15', 'vision approve expiry');
assert(!hasPendingVisionSubmission(vOk), 'vision approve left pending');

console.log('cert-vision acceptance smoke: PASS');
