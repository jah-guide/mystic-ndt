import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Job, Customer, Inspector, Equipment, CompanySettings } from '../types';
import { formatDate, formatDateTime } from './formatters';

export async function generateNDTPdfReport(
  job: Job,
  customer: Customer | undefined,
  inspector: Inspector | undefined,
  equipmentList: Equipment[] | undefined,
  settings: CompanySettings,
  supervisor?: Inspector
): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();   // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const margin = 12;
  const contentWidth = pageWidth - margin * 2;          // 186mm
  let currentY = 12;

  const site = customer?.sites.find(s => s.id === job.siteId);
  const isL3Approved = job.l3ReviewStatus === 'APPROVED';
  const wepLabel = job.procedureSnapshot
    ? `${job.procedureSnapshot.procedureNumber} ${job.procedureSnapshot.revisionNumber} (frozen)`
    : (job.procedureNumber || null);

  // Watermark is applied on every page at the end (over content, with opacity)

  // -------------------------------------------------------------
  // 1. TOP HEADER SECTION (Structured 2-Column Corporate Letterhead)
  // -------------------------------------------------------------
  const headerHeight = 28;

  // Left Block: Company Branding & Accreditation Details
  const leftHeaderWidth = 110;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(settings.companyName.toUpperCase(), margin, currentY + 5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(2, 132, 199); // sky-600
  doc.text(settings.sanasAccreditation || 'SANAS / SAQCC Accredited Type A Inspection Body', margin, currentY + 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105); // slate-600
  const splitAddress = doc.splitTextToSize(settings.address, leftHeaderWidth);
  doc.text(splitAddress, margin, currentY + 15);
  
  const addressLinesHeight = splitAddress.length * 3.2;
  doc.text(`Tel: ${settings.phone}  |  Email: ${settings.email}`, margin, currentY + 15 + addressLinesHeight);

  // Right Block: Official Certificate Banner Box
  const rightBoxX = margin + leftHeaderWidth + 4;
  const rightBoxWidth = contentWidth - leftHeaderWidth - 4; // ~72mm
  
  doc.setFillColor(15, 23, 42); // slate-900
  doc.roundedRect(rightBoxX, currentY, rightBoxWidth, headerHeight, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text(
    isL3Approved ? 'NDT EXAMINATION CERTIFICATE' : 'NDT DRAFT REPORT (PENDING L3)',
    rightBoxX + rightBoxWidth / 2,
    currentY + 6,
    { align: 'center' }
  );

  // Thin dividing line inside right box
  doc.setDrawColor(51, 65, 85);
  doc.line(rightBoxX + 4, currentY + 8.5, rightBoxX + rightBoxWidth - 4, currentY + 8.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(254, 240, 138); // amber-200
  doc.text(`Report No: ${job.reportNumber || 'REP-PREVIEW'}`, rightBoxX + 5, currentY + 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text(`Job Order: ${job.jobNumber}`, rightBoxX + 5, currentY + 19);
  doc.text(`Date Issued: ${formatDate(job.completedAt || job.inspectionDate)}`, rightBoxX + 5, currentY + 24);

  currentY += headerHeight + 5;

  // Thin decorative separator bar
  doc.setDrawColor(2, 132, 199);
  doc.setLineWidth(0.8);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 4;

  // -------------------------------------------------------------
  // 2. METADATA CARDS: CLIENT vs TEST SPECIFICATION & APPARATUS
  // Dynamic height so apparatus + supervisor are never cropped
  // -------------------------------------------------------------
  const cardWidth = (contentWidth - 4) / 2;
  const clientLabelsX = margin + 4;
  const clientValuesX = margin + 24;
  const clientValWidth = cardWidth - 28;
  const card2X = margin + cardWidth + 4;
  const specLabelsX = card2X + 4;
  const specValuesX = card2X + 28;
  const specValWidth = cardWidth - 32;
  const lineH = 3.5;

  const measureWrapped = (text: string, maxW: number) => {
    const lines = doc.splitTextToSize(text || '—', maxW);
    return { lines, h: Math.max(lines.length * lineH, 5.5) };
  };

  type MetaRow = { label: string; value: string; boldValue?: boolean; sky?: boolean; emerald?: boolean };
  const clientRows: MetaRow[] = [
    { label: 'Customer:', value: customer?.companyName || 'N/A', boldValue: true },
    { label: 'Site / Plant:', value: site?.name || 'On Site' },
    { label: 'Address:', value: site?.address || customer?.notes || '—' },
    {
      label: 'Contact:',
      value: `${customer?.contactPerson || '—'} (${customer?.phone || '—'})`
    }
  ];

  const apparatus =
    equipmentList && equipmentList.length > 0
      ? equipmentList.map(e => `${e.name} [${e.serialNumber}]`).join('; ')
      : 'No apparatus recorded';
  const earliestCal = (equipmentList || []).reduce<string | undefined>((min, e) => {
    if (!e.calibrationExpiryDate) return min;
    if (!min || e.calibrationExpiryDate < min) return e.calibrationExpiryDate;
    return min;
  }, undefined);

  const specRows: MetaRow[] = [
    {
      label: 'NDT Method:',
      value: `${job.method} — ${getMethodFullName(job.method)}`,
      boldValue: true,
      sky: true
    },
    { label: 'Test Spec:', value: job.standardSpec || '—', boldValue: true },
  ];
  if (wepLabel) specRows.push({ label: 'WEP:', value: wepLabel });
  specRows.push({
    label: 'Inspector:',
    value: `${inspector?.fullName || '—'} (${inspector?.certNumber || '—'})`
  });
  specRows.push({ label: 'Apparatus:', value: apparatus });
  specRows.push({
    label: 'Cal. Valid:',
    value: earliestCal ? `Valid until ${formatDate(earliestCal)}` : 'Not recorded',
    emerald: Boolean(earliestCal)
  });
  if (supervisor) {
    specRows.push({
      label: 'Supervisor:',
      value: `${supervisor.fullName} (${supervisor.certNumber || supervisor.level || '—'})`
    });
  }

  const measureCardBody = (rows: MetaRow[], valWidth: number) => {
    let h = 10; // title band
    rows.forEach(r => {
      h += measureWrapped(r.value, valWidth).h;
    });
    return h + 4;
  };

  const cardHeight = Math.max(
    measureCardBody(clientRows, clientValWidth),
    measureCardBody(specRows, specValWidth),
    40
  ) + 3; // bottom inset so last row (e.g. Supervisor) is never clipped by the card edge

  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, currentY, cardWidth, cardHeight, 1.5, 1.5, 'FD');
  doc.roundedRect(card2X, currentY, cardWidth, cardHeight, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('CLIENT & SITE INFORMATION', margin + 4, currentY + 5.5);
  doc.text('TEST SPECIFICATION & APPARATUS', card2X + 4, currentY + 5.5);
  doc.setDrawColor(226, 232, 240);
  doc.line(margin + 4, currentY + 7.5, margin + cardWidth - 4, currentY + 7.5);
  doc.line(card2X + 4, currentY + 7.5, card2X + cardWidth - 4, currentY + 7.5);

  const paintRows = (
    rows: MetaRow[],
    labelX: number,
    valueX: number,
    valWidth: number,
    startY: number
  ) => {
    let y = startY;
    rows.forEach(r => {
      const { lines, h } = measureWrapped(r.value, valWidth);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(71, 85, 105);
      doc.text(r.label, labelX, y);
      doc.setFont('helvetica', r.boldValue ? 'bold' : 'normal');
      if (r.sky) doc.setTextColor(2, 132, 199);
      else if (r.emerald) doc.setTextColor(5, 150, 105);
      else doc.setTextColor(15, 23, 42);
      doc.text(lines, valueX, y);
      y += h;
    });
  };

  paintRows(clientRows, clientLabelsX, clientValuesX, clientValWidth, currentY + 12);
  paintRows(specRows, specLabelsX, specValuesX, specValWidth, currentY + 12);

  currentY += cardHeight + 4;

  // -------------------------------------------------------------
  // 3. SCOPE & TEST CONDITIONS (dynamic height — no fake light)
  // -------------------------------------------------------------
  const colW = (contentWidth - 6) / 3;
  const scopeText = job.scope?.trim() || 'Not recorded on work order';
  const surfaceText = job.surfaceCondition?.trim() || 'Not recorded';
  const envParts: string[] = [];
  const tempC =
    typeof job.temperatureC === 'number' && Number.isFinite(job.temperatureC)
      ? job.temperatureC
      : null;
  if (tempC !== null) envParts.push(`Temp: ${tempC}°C`);
  else if (job.temperature?.trim()) envParts.push(`Temp: ${job.temperature.trim()}`);
  if (job.ambientLight?.trim()) envParts.push(`Light: ${job.ambientLight.trim()}`);
  const envText = envParts.length > 0 ? envParts.join('  |  ') : 'Temperature / light not recorded';

  doc.setFontSize(6.5);
  const scopeLines = doc.splitTextToSize(scopeText, colW - 4);
  const surfaceLines = doc.splitTextToSize(surfaceText, colW - 4);
  const envLines = doc.splitTextToSize(envText, colW - 4);
  const condBodyH = Math.max(scopeLines.length, surfaceLines.length, envLines.length) * 3.2;
  const condH = Math.max(16, 7 + condBodyH + 3);

  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, currentY, contentWidth, condH, 1.5, 1.5, 'FD');

  const paintCondCol = (title: string, lines: string[], x: number) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);
    doc.text(title, x, currentY + 4.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(lines, x, currentY + 8.5);
  };

  paintCondCol('Scope of Examination:', scopeLines, margin + 3);
  paintCondCol('Surface Condition:', surfaceLines, margin + 3 + colW + 2);
  paintCondCol('Environmental Conditions:', envLines, margin + 3 + (colW + 2) * 2);

  currentY += condH + 4;

  // -------------------------------------------------------------
  // 4. RESULTS TABLE (Crisp autoTable Grid)
  // -------------------------------------------------------------
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('EXAMINATION RESULTS & RECORDED MEASUREMENTS', margin, currentY);
  currentY += 2.5;

  const tableData = job.items.map((item, index) => {
    let readingStr = '—';
    if (item.reading) {
      readingStr = `${item.reading} ${item.unit || ''}`.trim();
    } else if (item.methodDetails?.thickness) {
      readingStr = `${item.methodDetails.thickness} mm`;
    }

    const observationStr =
      item.indication || item.methodDetails?.indication || item.notes || '—';

    return [
      (index + 1).toString(),
      item.itemNumber || `Item #${index + 1}`,
      item.description || '—',
      readingStr,
      item.acceptanceCriteria || '—',
      observationStr,
      item.result.toUpperCase()
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: [['#', 'Item / Weld ID', 'Description & Location', 'Reading', 'Acceptance Spec', 'Observation / Indication', 'Result']],
    body: tableData.length > 0 ? tableData : [['—', '—', 'No inspection items recorded', '—', '—', '—', 'PENDING']],
    margin: { left: margin, right: margin },
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7,
      halign: 'left',
      cellPadding: 1.8,
      valign: 'middle'
    },
    styles: {
      fontSize: 7,
      textColor: [30, 41, 59],
      cellPadding: 1.8,
      valign: 'top',
      overflow: 'linebreak',
      minCellHeight: 6
    },
    columnStyles: {
      0: { cellWidth: 7, halign: 'center', valign: 'middle' },
      1: { cellWidth: 24, fontStyle: 'bold' },
      2: { cellWidth: 38 },
      3: { cellWidth: 18, halign: 'center', fontStyle: 'bold', valign: 'middle' },
      4: { cellWidth: 36 },
      5: { cellWidth: 40 },
      6: { cellWidth: 18, halign: 'center', fontStyle: 'bold', valign: 'middle' }
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 6) {
        const text = String(data.cell.raw).trim();
        if (text === 'PASS') {
          data.cell.styles.textColor = [16, 185, 129];
        } else if (text === 'FAIL') {
          data.cell.styles.textColor = [239, 68, 68];
        } else {
          data.cell.styles.textColor = [100, 116, 139];
        }
      }
      // Keep multi-line text columns consistent (same size / top align)
      if (data.section === 'body' && [2, 4, 5].includes(data.column.index)) {
        data.cell.styles.fontSize = 7;
        data.cell.styles.valign = 'top';
        data.cell.styles.overflow = 'linebreak';
      }
    }
  });

  // @ts-ignore
  let afterTableY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 6 : currentY + 40;

  // -------------------------------------------------------------
  // 5. EVIDENTIAL PHOTOS SECTION
  // -------------------------------------------------------------
  const allPhotos: { itemNum: string; photoUrl: string; caption?: string }[] = [];
  job.items.forEach(item => {
    item.photos.forEach(photo => {
      allPhotos.push({
        itemNum: item.itemNumber,
        photoUrl: photo.dataUrl,
        caption: photo.caption
      });
    });
  });

  if (allPhotos.length > 0) {
    if (afterTableY > pageHeight - 75) {
      doc.addPage();
      afterTableY = margin;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text('EVIDENTIAL INSPECTION PHOTOGRAPHS', margin, afterTableY);
    afterTableY += 4;

    const photoCardWidth = 58;
    const photoCardHeight = 44;
    let photoX = margin;

    for (let i = 0; i < allPhotos.length; i++) {
      if (photoX + photoCardWidth > pageWidth - margin) {
        photoX = margin;
        afterTableY += photoCardHeight + 6;
      }

      if (afterTableY + photoCardHeight > pageHeight - 55) {
        doc.addPage();
        afterTableY = margin;
        photoX = margin;
      }

      const p = allPhotos[i];
      doc.setDrawColor(203, 213, 225);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(photoX, afterTableY, photoCardWidth, photoCardHeight, 1.5, 1.5, 'FD');

      try {
        doc.addImage(p.photoUrl, 'JPEG', photoX + 2, afterTableY + 2, photoCardWidth - 4, photoCardHeight - 13);
      } catch {
        doc.setFontSize(6.5);
        doc.setTextColor(148, 163, 184);
        doc.text('[Evidential Image]', photoX + 4, afterTableY + 16);
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(15, 23, 42);
      doc.text(p.itemNum, photoX + 2, afterTableY + photoCardHeight - 7.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.setTextColor(100, 116, 139);
      const cap = doc.splitTextToSize(p.caption || 'Field examination photograph', photoCardWidth - 4);
      doc.text(cap, photoX + 2, afterTableY + photoCardHeight - 3.5);

      photoX += photoCardWidth + 6;
    }

    afterTableY += photoCardHeight + 8;
  }

  // Check page overflow for Conclusion & Dual Sign-off
  if (afterTableY > pageHeight - 70) {
    doc.addPage();
    afterTableY = margin;
  }

  // -------------------------------------------------------------
  // 6. OVERALL CONCLUSION & SANS 17020 DECLARATION
  // -------------------------------------------------------------
  const isPass = job.overallResult === 'PASS';
  const isFail = job.overallResult === 'FAIL';

  doc.setDrawColor(isPass ? 16 : isFail ? 239 : 245, isPass ? 185 : isFail ? 68 : 158, isPass ? 129 : isFail ? 68 : 11);
  doc.setFillColor(isPass ? 240 : isFail ? 254 : 255, isPass ? 253 : isFail ? 242 : 251, isPass ? 244 : isFail ? 242 : 235);
  doc.roundedRect(margin, afterTableY, contentWidth, 22, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  if (isPass) {
    doc.setTextColor(5, 150, 105);
    doc.text(`OVERALL RESULT: PASS (COMPLIANT)`, margin + 4, afterTableY + 7);
  } else if (isFail) {
    doc.setTextColor(220, 38, 38);
    doc.text(`OVERALL RESULT: FAIL (NON-CONFORMANCE RECORDED)`, margin + 4, afterTableY + 7);
  } else {
    doc.setTextColor(217, 119, 6);
    doc.text(`OVERALL RESULT: PENDING / INCOMPLETE`, margin + 4, afterTableY + 7);
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(51, 65, 85);
  const commentText = job.inspectorComments || settings.defaultReportNotes;
  const splitComments = doc.splitTextToSize(`Inspector Remarks: ${commentText}`, contentWidth - 8);
  doc.text(splitComments, margin + 4, afterTableY + 13);

  afterTableY += 26;

  // -------------------------------------------------------------
  // 7. MULTI-SIGN OFF: FIELD / SUPERVISOR + LEVEL 3 QA
  // -------------------------------------------------------------
  const hasSupervisorSign = Boolean(job.supervisorSignatureDataUrl && supervisor);
  const sigBoxWidth = (contentWidth - 4) / 2;
  const sigBoxHeight = hasSupervisorSign ? 36 : 28;

  // --- SIGN-OFF 1: FIELD INSPECTOR (+ SUPERVISOR IF L1 JOB) ---
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin, afterTableY, sigBoxWidth, sigBoxHeight, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  const fieldLabel = inspector?.level === 'Level 1'
    ? 'PERFORMED BY (LEVEL 1) / EVALUATED BY SUPERVISOR'
    : 'EXAMINED BY (LEVEL 2 INSPECTOR)';
  doc.text(fieldLabel, margin + 3, afterTableY + 4.5);

  if (job.signatureDataUrl) {
    try {
      doc.addImage(job.signatureDataUrl, 'PNG', margin + sigBoxWidth - 38, afterTableY + 2, 32, 11);
    } catch {
      doc.text('[Digital Signature]', margin + sigBoxWidth - 30, afterTableY + 9);
    }
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(15, 23, 42);
  doc.text(inspector?.fullName || 'Certified Field Inspector', margin + 3, afterTableY + 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(71, 85, 105);
  doc.text(`${inspector?.certification || 'ISO 9712'} · ${inspector?.certNumber || '—'}`, margin + 3, afterTableY + 15.5);

  if (hasSupervisorSign && supervisor) {
    if (job.supervisorSignatureDataUrl) {
      try {
        doc.addImage(job.supervisorSignatureDataUrl, 'PNG', margin + sigBoxWidth - 38, afterTableY + 17, 32, 10);
      } catch { /* ignore */ }
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`Supervisor: ${supervisor.fullName} (${supervisor.level})`, margin + 3, afterTableY + 21);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(71, 85, 105);
    doc.text(`${supervisor.certNumber} · Signed ${formatDateTime(job.supervisorSignedAt || job.completedAt || '')}`, margin + 3, afterTableY + 25);
    doc.text(`Completed: ${job.completedAt ? formatDateTime(job.completedAt) : 'Not completed'}`, margin + 3, afterTableY + 29);
  } else {
    doc.text(
      job.completedAt ? `Signed: ${formatDateTime(job.completedAt)}` : 'Signed: — (field completion pending)',
      margin + 3,
      afterTableY + 20
    );
  }

  // --- SIGN-OFF 2: LEVEL 3 QA REVIEWER ---
  const l3BoxX = margin + sigBoxWidth + 4;
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(l3BoxX, afterTableY, sigBoxWidth, sigBoxHeight, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text('REVIEWED & CERTIFIED (LEVEL 3 QA AUTHORITY)', l3BoxX + 3, afterTableY + 4.5);

  if (isL3Approved && job.l3SignatureDataUrl) {
    try {
      doc.addImage(job.l3SignatureDataUrl, 'PNG', l3BoxX + sigBoxWidth - 38, afterTableY + 2, 32, 11);
    } catch {
      doc.text('[L3 Verified]', l3BoxX + sigBoxWidth - 30, afterTableY + 9);
    }
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(isL3Approved ? 5 : 217, isL3Approved ? 150 : 119, isL3Approved ? 105 : 6);
  doc.text(
    isL3Approved
      ? (job.l3VerifierName || 'Dr. Johan Pretorius')
      : 'Pending Level 3 Technical Review',
    l3BoxX + 3,
    afterTableY + 12
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(71, 85, 105);
  doc.text(`Authority: ${isL3Approved ? (job.l3CertNumber || 'ISO 9712 Level 3 / ASNT Level III') : '—'}`, l3BoxX + 3, afterTableY + 17);
  doc.text(`Status: ${isL3Approved ? 'OFFICIALLY VERIFIED & APPROVED' : 'DRAFT — NOT CERTIFIED'}`, l3BoxX + 3, afterTableY + 21);
  doc.text(`Reviewed: ${isL3Approved && job.l3ReviewedAt ? formatDateTime(job.l3ReviewedAt) : 'Pending Review'}`, l3BoxX + 3, afterTableY + 25);

  // -------------------------------------------------------------
  // 8. PAGE FOOTER + DRAFT WATERMARK (all pages, over content)
  // -------------------------------------------------------------
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);

    if (!isL3Approved) {
      doc.saveGraphicsState();
      // @ts-expect-error jsPDF GState
      doc.setGState(new doc.GState({ opacity: 0.18 }));
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(42);
      doc.setTextColor(71, 85, 105);
      // Tile across the page so draft marking covers report content, not only the centre
      const marks = [
        [pageWidth * 0.35, pageHeight * 0.28],
        [pageWidth * 0.55, pageHeight * 0.5],
        [pageWidth * 0.4, pageHeight * 0.72]
      ] as const;
      for (const [x, y] of marks) {
        doc.text('DRAFT — PENDING L3', x, y, {
          align: 'center',
          angle: 32
        });
      }
      doc.restoreGraphicsState();
    }

    doc.setDrawColor(226, 232, 240);
    doc.line(margin, pageHeight - 11, pageWidth - margin, pageHeight - 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(148, 163, 184);

    doc.text(
      isL3Approved
        ? 'Prototype demo certificate — ISO 9712-shaped multi-sign workflow. Issued by ' + settings.companyName
        : 'DRAFT REPORT — Not a certified inspection certificate until Level 3 approval. ' + settings.companyName,
      margin,
      pageHeight - 7
    );

    doc.text(
      `Report: ${job.reportNumber || 'REP-PREVIEW'}  |  Page ${p} of ${totalPages}`,
      pageWidth - margin,
      pageHeight - 7,
      { align: 'right' }
    );
  }

  return doc;
}

function getMethodFullName(method: string): string {
  switch (method) {
    case 'UT': return 'Ultrasonic Testing';
    case 'MT': return 'Magnetic Particle Testing';
    case 'PT': return 'Liquid Penetrant Testing';
    case 'VT': return 'Visual Examination';
    default: return method;
  }
}
