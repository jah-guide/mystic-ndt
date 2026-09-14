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

  // Draft watermark when not L3-certified
  if (!isL3Approved) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(42);
    doc.setTextColor(226, 232, 240);
    doc.text('DRAFT — PENDING L3', pageWidth / 2, pageHeight / 2, {
      align: 'center',
      angle: 35
    });
  }

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
  // -------------------------------------------------------------
  const cardWidth = (contentWidth - 4) / 2; // 91mm each
  const cardHeight = 44;

  // --- CARD 1: CLIENT & SITE DETAILS ---
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, currentY, cardWidth, cardHeight, 1.5, 1.5, 'FD');

  // Title Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('CLIENT & SITE INFORMATION', margin + 4, currentY + 5.5);
  doc.setDrawColor(226, 232, 240);
  doc.line(margin + 4, currentY + 7.5, margin + cardWidth - 4, currentY + 7.5);

  const clientLabelsX = margin + 4;
  const clientValuesX = margin + 24;
  const clientValWidth = cardWidth - 28;

  let rowY = currentY + 12;
  
  // Client Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text('Customer:', clientLabelsX, rowY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  const custSplit = doc.splitTextToSize(customer?.companyName || 'N/A', clientValWidth);
  doc.text(custSplit, clientValuesX, rowY);
  rowY += Math.max(custSplit.length * 3.5, 6);

  // Site / Plant
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Site / Plant:', clientLabelsX, rowY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  const siteSplit = doc.splitTextToSize(site?.name || 'On Site', clientValWidth);
  doc.text(siteSplit, clientValuesX, rowY);
  rowY += Math.max(siteSplit.length * 3.5, 6);

  // Site Address
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Address:', clientLabelsX, rowY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  const addrSplit = doc.splitTextToSize(site?.address || customer?.notes || 'Johannesburg, South Africa', clientValWidth);
  doc.text(addrSplit, clientValuesX, rowY);
  rowY += Math.max(addrSplit.length * 3.2, 5.5);

  // Contact
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Contact:', clientLabelsX, rowY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(`${customer?.contactPerson || 'Johan van der Merwe'} (${customer?.phone || '+27 82 450 9182'})`, clientValuesX, rowY);

  // --- CARD 2: TEST SPECIFICATION & APPARATUS (HIGH CONTRAST) ---
  const card2X = margin + cardWidth + 4;
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(card2X, currentY, cardWidth, cardHeight, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('TEST SPECIFICATION & APPARATUS', card2X + 4, currentY + 5.5);
  doc.setDrawColor(226, 232, 240);
  doc.line(card2X + 4, currentY + 7.5, card2X + cardWidth - 4, currentY + 7.5);

  const specLabelsX = card2X + 4;
  const specValuesX = card2X + 28;
  const specValWidth = cardWidth - 32;

  let row2Y = currentY + 12;

  // NDT Method
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text('NDT Method:', specLabelsX, row2Y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(2, 132, 199); // Sky Blue Highlight
  doc.text(`${job.method} — ${getMethodFullName(job.method)}`, specValuesX, row2Y);
  row2Y += 6;

  // Standard / Specification
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Test Spec:', specLabelsX, row2Y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  const specSplit = doc.splitTextToSize(job.standardSpec || 'ASME Section V / SANS 17020', specValWidth);
  doc.text(specSplit, specValuesX, row2Y);
  row2Y += Math.max(specSplit.length * 3.5, 6);

  if (wepLabel) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('WEP:', specLabelsX, row2Y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    const wepSplit = doc.splitTextToSize(wepLabel, specValWidth);
    doc.text(wepSplit, specValuesX, row2Y);
    row2Y += Math.max(wepSplit.length * 3.5, 6);
  }

  // Lead Inspector
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Inspector:', specLabelsX, row2Y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(`${inspector?.fullName || 'Certified Tech'} (${inspector?.certNumber || 'SAQCC Level 2'})`, specValuesX, row2Y);
  row2Y += 6;

  // Equipment & Calibration
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Apparatus:', specLabelsX, row2Y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  const apparatus = (equipmentList && equipmentList.length > 0)
    ? equipmentList.map(e => `${e.name} [${e.serialNumber}]`).join('; ')
    : 'No apparatus recorded';
  const eqSplit = doc.splitTextToSize(apparatus, specValWidth);
  doc.text(eqSplit, specValuesX, row2Y);
  row2Y += Math.max(eqSplit.length * 3.2, 5.5);

  // Calibration Expiry (earliest expiry among linked equipment)
  const earliestCal = (equipmentList || []).reduce<string | undefined>((min, e) => {
    if (!e.calibrationExpiryDate) return min;
    if (!min || e.calibrationExpiryDate < min) return e.calibrationExpiryDate;
    return min;
  }, undefined);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Cal. Valid:', specLabelsX, row2Y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(5, 150, 105); // Emerald green for valid cal
  doc.text(
    earliestCal ? `Valid until ${formatDate(earliestCal)}` : 'Not recorded',
    specValuesX,
    row2Y
  );

  if (supervisor && job.supervisorSignatureDataUrl) {
    row2Y += 6;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('Supervisor:', specLabelsX, row2Y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(`${supervisor.fullName} (${supervisor.certNumber})`, specValuesX, row2Y);
  }

  currentY += cardHeight + 4;

  // -------------------------------------------------------------
  // 3. SCOPE & TEST CONDITIONS BAR (3-Column Strip)
  // -------------------------------------------------------------
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, currentY, contentWidth, 14, 1.5, 1.5, 'FD');

  // Col 1: Scope
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Scope of Examination:', margin + 3, currentY + 4.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(15, 23, 42);
  const scopeWrap = doc.splitTextToSize(job.scope || 'Examination of welds & parent material.', 80);
  doc.text(scopeWrap, margin + 3, currentY + 8.5);

  // Col 2: Surface Preparation
  const col2X = margin + 86;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Surface Condition:', col2X, currentY + 4.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(job.surfaceCondition || 'Wire brushed & solvent degreased', col2X, currentY + 8.5);

  // Col 3: Test Temperature & Light
  const col3X = margin + 140;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Environmental Conditions:', col3X, currentY + 4.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(`Temp: ${job.temperature || '22°C'}  |  Light: > 1076 Lux`, col3X, currentY + 8.5);

  currentY += 18;

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

    const observationStr = item.indication || item.methodDetails?.indication || item.notes || 'Acceptable profile. No recordable flaws.';

    return [
      (index + 1).toString(),
      item.itemNumber || `Item #${index + 1}`,
      item.description || '—',
      readingStr,
      item.acceptanceCriteria || 'Spec standard',
      observationStr,
      item.result.toUpperCase()
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: [['#', 'Item / Weld ID', 'Description & Location', 'Reading', 'Acceptance Spec', 'Observation / Indication', 'Result']],
    body: tableData,
    margin: { left: margin, right: margin },
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'left',
      cellPadding: 2
    },
    styles: {
      fontSize: 7.5,
      textColor: [30, 41, 59],
      cellPadding: 2,
      valign: 'middle'
    },
    columnStyles: {
      0: { cellWidth: 7, halign: 'center' },
      1: { cellWidth: 26, fontStyle: 'bold' },
      2: { cellWidth: 42 },
      3: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
      4: { cellWidth: 32 },
      5: { cellWidth: 39 },
      6: { cellWidth: 20, halign: 'center', fontStyle: 'bold' }
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 6) {
        const text = String(data.cell.raw).trim();
        if (text === 'PASS') {
          data.cell.styles.textColor = [16, 185, 129]; // Emerald
        } else if (text === 'FAIL') {
          data.cell.styles.textColor = [239, 68, 68]; // Crimson
        } else {
          data.cell.styles.textColor = [100, 116, 139]; // Slate
        }
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
  // 8. PAGE FOOTER (All Pages)
  // -------------------------------------------------------------
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, pageHeight - 11, pageWidth - margin, pageHeight - 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(148, 163, 184);
    
    // Left: Legal standard compliance
    doc.text(
      isL3Approved
        ? 'Prototype demo certificate — ISO 9712-shaped multi-sign workflow. Issued by ' + settings.companyName
        : 'DRAFT REPORT — Not a certified inspection certificate until Level 3 approval. ' + settings.companyName,
      margin,
      pageHeight - 7
    );

    // Right: Page count and report number
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
