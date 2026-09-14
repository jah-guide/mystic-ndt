import { Job, Customer, Inspector, Equipment, CompanySettings } from '../types';
import { formatDate, formatDateTime } from './formatters';
import { getMethodCertLevel, getMethodCertificate, checkExpiry } from './validation';
import { getReportFinalLabel } from './reportDelivery';
import { generateNDTPdfReport } from './pdfGenerator';

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Build printable HTML evidence pack and open/download it. Also triggers certificate PDF download. */
export async function exportAuditPack(opts: {
  job: Job;
  customer?: Customer;
  inspector?: Inspector;
  supervisor?: Inspector;
  equipmentList: Equipment[];
  settings: CompanySettings;
  actorName: string;
}): Promise<Job> {
  const { job, customer, inspector, supervisor, equipmentList, settings, actorName } = opts;
  const label = getReportFinalLabel(job);
  const site = customer?.sites.find(s => s.id === job.siteId);
  const snap = job.procedureSnapshot;
  const leadCert = inspector ? getMethodCertificate(inspector, job.method) : undefined;
  const supCert = supervisor ? getMethodCertificate(supervisor, job.method) : undefined;

  const findingsRows = job.items.map(item => {
    const resultNote = item.result === 'Pending' ? 'Pending (not Pass)' : item.result;
    return `<tr>
      <td>${esc(item.itemNumber)}</td>
      <td>${esc(item.description || '')}</td>
      <td>${esc(item.reading || '—')} ${esc(item.unit || '')}</td>
      <td>${esc(item.acceptanceCriteria || '—')}</td>
      <td>${esc(resultNote)}</td>
    </tr>`;
  }).join('');

  const historyHtml = (job.findingsHistory || []).map(h => `
    <div class="block">
      <h4>Superseded revision ${h.revision}</h4>
      <p>Submitted ${esc(formatDateTime(h.submittedAt))}
      ${h.rejectionReason ? ` — Rejected: ${esc(h.rejectionReason)}` : ''}</p>
      <ul>${h.items.map(i => `<li>${esc(i.itemNumber)}: ${esc(i.reading || '—')} (${esc(i.result)})</li>`).join('')}</ul>
    </div>
  `).join('') || '<p>No superseded findings.</p>';

  const equipHtml = equipmentList.length
    ? equipmentList.map(e => {
        const cal = checkExpiry(e.calibrationExpiryDate);
        return `<li>${esc(e.name)} [${esc(e.serialNumber)}] — cal ${esc(e.calibrationExpiryDate)} (${esc(cal.formattedText)})</li>`;
      }).join('')
    : '<li>No equipment linked</li>';

  const auditHtml = (job.auditTrail || []).slice(-40).map(a =>
    `<li><strong>${esc(formatDateTime(a.timestamp))}</strong> ${esc(a.actorName)} (${esc(a.actorRole)}): ${esc(a.action)} — ${esc(a.details)}</li>`
  ).join('') || '<li>No audit events</li>';

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Audit Pack ${esc(job.jobNumber)}</title>
  <style>
    body{font-family:system-ui,sans-serif;max-width:900px;margin:24px auto;padding:0 16px;color:#0f172a}
    h1{font-size:1.4rem} h2{font-size:1.1rem;margin-top:1.5rem;border-bottom:1px solid #cbd5e1;padding-bottom:4px}
    .badge{display:inline-block;padding:2px 8px;border-radius:6px;background:#e2e8f0;font-size:12px;font-weight:700}
    table{width:100%;border-collapse:collapse;font-size:13px} td,th{border:1px solid #cbd5e1;padding:6px;text-align:left}
    .meta{color:#475569;font-size:13px} ul{padding-left:1.2rem}
  </style></head><body>
  <h1>NDT Audit Pack — ${esc(job.jobNumber)}</h1>
  <p><span class="badge">${esc(label)}</span>
     ${job.delivery ? ` · Delivered to ${esc(job.delivery.recipient)} (${esc(job.delivery.channel)}) ${esc(formatDateTime(job.delivery.deliveredAt))}` : ' · Not marked delivered'}</p>
  <p class="meta">${esc(settings.companyName)} · Generated ${esc(formatDateTime(new Date().toISOString()))} by ${esc(actorName)}</p>

  <h2>1. Job summary</h2>
  <p>Customer: ${esc(customer?.companyName || '—')} · Site: ${esc(site?.name || '—')}<br/>
  Method: ${esc(job.method)} · Date: ${esc(formatDate(job.inspectionDate))} · Result: ${esc(job.overallResult)} · Status: ${esc(job.status)}</p>

  <h2>2. Procedure snapshot</h2>
  ${snap
    ? `<p>${esc(snap.procedureNumber)} ${esc(snap.revisionNumber)} — ${esc(snap.title)}<br/>
       Frozen ${esc(formatDateTime(snap.snapshotAt))} (${esc(snap.snapshotSource)})
       ${snap.replacedReason ? `<br/>Replace reason: ${esc(snap.replacedReason)}` : ''}</p>
       <ul>${snap.acceptanceCriteria.map(c => `<li>${esc(c.label)}: ${esc(c.description)}</li>`).join('') || '<li>No structured criteria</li>'}</ul>`
    : '<p>No procedure linked / no snapshot on this job.</p>'}

  <h2>3. Current findings</h2>
  <table><thead><tr><th>Item</th><th>Description</th><th>Reading</th><th>Criteria</th><th>Result</th></tr></thead>
  <tbody>${findingsRows || '<tr><td colspan="5">No items</td></tr>'}</tbody></table>

  <h2>4. Findings history (superseded)</h2>
  ${historyHtml}

  <h2>5. Equipment &amp; calibration</h2>
  <ul>${equipHtml}</ul>

  <h2>6. Personnel method certificates (${esc(job.method)})</h2>
  <ul>
    <li>Lead: ${esc(inspector?.fullName || '—')} — ${esc(inspector ? (getMethodCertLevel(inspector, job.method) || inspector.level || '—') : '—')}
      ${leadCert ? `· ${esc(leadCert.certNumber)} exp ${esc(leadCert.expiryDate)} (${esc(leadCert.verificationStatus)})` : ''}</li>
    <li>Supervisor: ${esc(supervisor?.fullName || '—')} — ${esc(supervisor ? (getMethodCertLevel(supervisor, job.method) || supervisor.level || '—') : 'n/a')}
      ${supCert ? `· ${esc(supCert.certNumber)} exp ${esc(supCert.expiryDate)} (${esc(supCert.verificationStatus)})` : ''}</li>
  </ul>

  <h2>7. Audit trail (recent)</h2>
  <ul>${auditHtml}</ul>

  <h2>8. Certificate PDF</h2>
  <p>A separate PDF download is triggered with this pack (draft watermark until L3 approved).</p>
  <p class="meta">End of audit pack</p>
  <script>window.onload=function(){setTimeout(function(){window.print()},400)}</script>
  </body></html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const w = window.open(url, '_blank');
  if (!w) {
    const a = document.createElement('a');
    a.href = url;
    a.download = `${job.jobNumber}_AuditPack.html`;
    a.click();
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);

  try {
    const doc = await generateNDTPdfReport(job, customer, inspector, equipmentList, settings, supervisor);
    doc.save(`${job.reportNumber || job.jobNumber}_Certificate.pdf`);
  } catch (e) {
    console.error('Audit pack PDF failed', e);
  }

  const updated: Job = {
    ...job,
    auditTrail: [
      ...(job.auditTrail || []),
      {
        id: 'aud-pack-' + Date.now(),
        timestamp: new Date().toISOString(),
        actorName,
        actorRole: 'Admin',
        action: 'AUDIT_PACK_EXPORTED',
        details: `Exported audit pack (${label}) for ${job.jobNumber}.`
      }
    ],
    updatedAt: new Date().toISOString()
  };
  return updated;
}
