/**
 * Build MysticNDT sales demo PowerPoint from captured screenshots.
 * Run: node docs/demo/build-pptx.mjs  (requires pptxgenjs)
 *
 * Screenshots are placed with contain-fit (never stretched):
 *   scale = min(availW / imgW, availH / imgH)
 */
import PptxGenJS from 'pptxgenjs';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const shots = path.join(__dirname, 'screenshots');
const outFile = path.join(__dirname, 'MysticNDT-Product-Demo.pptx');

const SLIDE_W = 13.333;
const SLIDE_H = 7.5;

const NAVY = '0B1220';
const SLATE = '111827';
const CARD = '1E293B';
const CYAN = '22D3EE';
const WHITE = 'F8FAFC';
const MUTED = '94A3B8';
const ACCENT = '38BDF8';

function shot(name) {
  const p = path.join(shots, name);
  if (!fs.existsSync(p)) throw new Error(`Missing screenshot: ${name}`);
  return p;
}

/** Intrinsic pixel size from PNG IHDR (no extra deps). */
function getImageSize(filePath) {
  const buf = fs.readFileSync(filePath);
  if (buf[0] === 0x89 && buf[1] === 0x50) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  throw new Error(`Unsupported image (PNG required): ${filePath}`);
}

/**
 * Contain-fit: largest size that fits in avail box without stretching.
 * scale = min(availW/imgW, availH/imgH); returns centered x/y/w/h in inches.
 */
function containFit(imgWpx, imgHpx, boxX, boxY, boxW, boxH) {
  const scale = Math.min(boxW / imgWpx, boxH / imgHpx);
  const w = imgWpx * scale;
  const h = imgHpx * scale;
  const x = boxX + (boxW - w) / 2;
  const y = boxY + (boxH - h) / 2;
  return { x, y, w, h, scale };
}

const pptx = new PptxGenJS();
pptx.defineLayout({ name: 'WIDE', width: SLIDE_W, height: SLIDE_H });
pptx.layout = 'WIDE';
pptx.author = 'MysticNDT';
pptx.title = 'MysticNDT — Field Inspection & Certification';
pptx.subject = 'Product demo for NDT company owners and quality leads';

function addBg(slide, color = NAVY) {
  slide.addShape(pptx.shapes.RECTANGLE, {
    x: 0, y: 0, w: '100%', h: '100%',
    fill: { color },
  });
}

function addFooter(slide, page, total = 16) {
  slide.addText('MysticNDT  ·  Apex NDT demo  ·  Confidential', {
    x: 0.5, y: 7.15, w: 10, h: 0.25,
    fontSize: 10, color: MUTED, fontFace: 'Calibri',
  });
  slide.addText(`${page} / ${total}`, {
    x: 11.5, y: 7.15, w: 1.3, h: 0.25,
    fontSize: 10, color: MUTED, fontFace: 'Calibri', align: 'right',
  });
}

function titleSlide() {
  const s = pptx.addSlide();
  addBg(s);
  s.addShape(pptx.shapes.RECTANGLE, {
    x: 0, y: 0, w: 0.18, h: 7.5, fill: { color: CYAN },
  });
  s.addText('MYSTICNDT', {
    x: 0.8, y: 1.8, w: 11, h: 0.5,
    fontSize: 18, color: CYAN, fontFace: 'Calibri', bold: true,
    charSpacing: 4,
  });
  s.addText('Field Inspection &\nCertification', {
    x: 0.8, y: 2.4, w: 11, h: 1.6,
    fontSize: 44, color: WHITE, fontFace: 'Calibri', bold: true,
  });
  s.addText(
    'One digital flow for South African NDT workshops — assign, inspect, supervise, L3 certify, deliver.\nDemo tenant: Apex NDT & Engineering Services (Pty) Ltd',
    {
      x: 0.8, y: 4.3, w: 10.5, h: 0.9,
      fontSize: 16, color: MUTED, fontFace: 'Calibri',
    }
  );
  s.addText('Product demo for owners · ops managers · quality leads', {
    x: 0.8, y: 6.4, w: 10, h: 0.35,
    fontSize: 13, color: ACCENT, fontFace: 'Calibri',
  });
}

function textSlide(page, eyebrow, title, bullets) {
  const s = pptx.addSlide();
  addBg(s);
  s.addText(eyebrow, {
    x: 0.7, y: 0.55, w: 11.5, h: 0.35,
    fontSize: 12, color: CYAN, fontFace: 'Calibri', bold: true, charSpacing: 2,
  });
  s.addText(title, {
    x: 0.7, y: 1.05, w: 11.5, h: 1.0,
    fontSize: 32, color: WHITE, fontFace: 'Calibri', bold: true,
  });
  bullets.forEach((b, i) => {
    s.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x: 0.7, y: 2.3 + i * 1.15, w: 11.8, h: 0.95,
      fill: { color: CARD }, rectRadius: 0.08,
    });
    s.addText(b.title, {
      x: 1.0, y: 2.4 + i * 1.15, w: 11.2, h: 0.35,
      fontSize: 16, color: WHITE, fontFace: 'Calibri', bold: true,
    });
    s.addText(b.body, {
      x: 1.0, y: 2.75 + i * 1.15, w: 11.2, h: 0.4,
      fontSize: 13, color: MUTED, fontFace: 'Calibri',
    });
  });
  addFooter(s, page);
}

function castSlide(page) {
  const s = pptx.addSlide();
  addBg(s);
  s.addText('DEMO CAST', {
    x: 0.7, y: 0.5, w: 11.5, h: 0.3,
    fontSize: 12, color: CYAN, fontFace: 'Calibri', bold: true, charSpacing: 2,
  });
  s.addText('Four roles. One continuous job lifecycle.', {
    x: 0.7, y: 0.9, w: 11.5, h: 0.55,
    fontSize: 28, color: WHITE, fontFace: 'Calibri', bold: true,
  });
  const roles = [
    { name: 'Admin', who: 'Ops / planner', line: 'Jobs, customers, equipment, dispatch, renewals' },
    { name: 'Lesego (L1)', who: 'Field technician', line: 'Assigned work, readings, photos, submit' },
    { name: 'Thabo (L2)', who: 'Supervisor', line: 'Evaluate findings, complete & sign' },
    { name: 'Johan (L3)', who: 'Technical authority', line: 'QA review, certify, release report' },
  ];
  roles.forEach((r, i) => {
    const x = 0.55 + i * 3.15;
    s.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x, y: 2.0, w: 3.0, h: 4.2,
      fill: { color: CARD }, rectRadius: 0.1,
    });
    s.addShape(pptx.shapes.RECTANGLE, {
      x, y: 2.0, w: 3.0, h: 0.12, fill: { color: CYAN },
    });
    s.addText(r.name, {
      x: x + 0.2, y: 2.4, w: 2.6, h: 0.7,
      fontSize: 18, color: WHITE, fontFace: 'Calibri', bold: true,
    });
    s.addText(r.who, {
      x: x + 0.2, y: 3.15, w: 2.6, h: 0.4,
      fontSize: 13, color: CYAN, fontFace: 'Calibri',
    });
    s.addText(r.line, {
      x: x + 0.2, y: 3.8, w: 2.6, h: 1.8,
      fontSize: 14, color: MUTED, fontFace: 'Calibri',
    });
  });
  addFooter(s, page);
}

/**
 * Screenshot-dominant slide: compact header + optional one-line caption,
 * image contain-fitted into the remaining area (dark letterbox OK).
 */
function shotSlide(page, eyebrow, title, caption, imageName) {
  const s = pptx.addSlide();
  addBg(s, SLATE);

  const marginX = 0.5;
  const headerTop = 0.28;
  const footerReserve = 0.45; // space above footer line at 7.15

  s.addText(eyebrow, {
    x: marginX, y: headerTop, w: SLIDE_W - marginX * 2, h: 0.26,
    fontSize: 11, color: CYAN, fontFace: 'Calibri', bold: true, charSpacing: 1.5,
  });
  s.addText(title, {
    x: marginX, y: headerTop + 0.26, w: SLIDE_W - marginX * 2, h: 0.42,
    fontSize: 22, color: WHITE, fontFace: 'Calibri', bold: true,
  });

  let imgTop = headerTop + 0.72;
  if (caption) {
    s.addText(caption, {
      x: marginX, y: imgTop, w: SLIDE_W - marginX * 2, h: 0.32,
      fontSize: 13, color: MUTED, fontFace: 'Calibri',
    });
    imgTop += 0.36;
  }

  const boxX = marginX;
  const boxY = imgTop;
  const boxW = SLIDE_W - marginX * 2;
  const boxH = SLIDE_H - footerReserve - boxY;

  // Dark panel behind image (letterbox / pillarbox shows as intentional frame)
  s.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x: boxX - 0.04, y: boxY - 0.04, w: boxW + 0.08, h: boxH + 0.08,
    fill: { color: NAVY }, rectRadius: 0.06,
  });

  const imgPath = shot(imageName);
  const { width: imgW, height: imgH } = getImageSize(imgPath);
  const fit = containFit(imgW, imgH, boxX, boxY, boxW, boxH);

  // Place at exact contain-fit size — do NOT pass a distorting w/h box.
  s.addImage({
    path: imgPath,
    x: fit.x,
    y: fit.y,
    w: fit.w,
    h: fit.h,
  });

  addFooter(s, page);

  console.log(
    `  slide ${page}: ${imageName} ${imgW}×${imgH}px → ${fit.w.toFixed(2)}"×${fit.h.toFixed(2)}" (contain, no stretch)`
  );
}

function closeSlide(page) {
  const s = pptx.addSlide();
  addBg(s);
  s.addShape(pptx.shapes.RECTANGLE, {
    x: 0, y: 0, w: 0.18, h: 7.5, fill: { color: CYAN },
  });
  s.addText('NEXT STEP', {
    x: 0.8, y: 1.6, w: 11, h: 0.35,
    fontSize: 14, color: CYAN, fontFace: 'Calibri', bold: true, charSpacing: 3,
  });
  s.addText('Run the Apex demo with your team.', {
    x: 0.8, y: 2.15, w: 11, h: 0.8,
    fontSize: 34, color: WHITE, fontFace: 'Calibri', bold: true,
  });
  s.addText(
    'Walk Admin → Lesego → Thabo → Johan on a live seeded week.\nSee compliance gates, field evidence, and L3 release in under 30 minutes.',
    {
      x: 0.8, y: 3.2, w: 10.5, h: 1.0,
      fontSize: 16, color: MUTED, fontFace: 'Calibri',
    }
  );
  const ctas = [
    'Book a guided walkthrough',
    'Map your methods, certs & cal rules',
    'Pilot on one crew / one client',
  ];
  ctas.forEach((c, i) => {
    s.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x: 0.8 + i * 3.9, y: 4.6, w: 3.6, h: 1.1,
      fill: { color: CARD }, rectRadius: 0.08,
    });
    s.addText(`${i + 1}`, {
      x: 1.0, y: 4.75, w: 0.4, h: 0.35,
      fontSize: 16, color: CYAN, fontFace: 'Calibri', bold: true,
    });
    s.addText(c, {
      x: 1.4, y: 4.75, w: 2.8, h: 0.75,
      fontSize: 14, color: WHITE, fontFace: 'Calibri',
    });
  });
  addFooter(s, page);
}

// --- Build deck ---
titleSlide();

textSlide(2, 'THE PROBLEM', 'Paper, WhatsApp, and surprise expiry days.', [
  {
    title: 'Jobs live in notebooks and chat threads',
    body: 'Status is tribal knowledge. Nobody sees open vs awaiting L3 vs delivered in one place.',
  },
  {
    title: 'Cert and cal surprises hit at the gate',
    body: 'Expired method certs, vision, or instrument cal only appear when a client or auditor asks.',
  },
  {
    title: 'L3 release is the bottleneck',
    body: 'Reports stall waiting for photos, signatures, and a clear approve / reject path.',
  },
]);

textSlide(3, 'THE PROMISE', 'One flow: assign → inspect → supervise → L3 certify → deliver.', [
  {
    title: 'Ops plans with compliance built in',
    body: 'Method-matched people and equipment. Blocked assign when certs, vision, or cal are not valid.',
  },
  {
    title: 'Field evidence stays on the job',
    body: 'Readings, defects, and photos travel with the report — not in a separate photo album.',
  },
  {
    title: 'L3 signs once, client gets the certificate',
    body: 'Queue, review, approve or reject, digital sign-off, PDF path ready for dispatch.',
  },
]);

castSlide(4);

console.log('Contain-fitting screenshots…');

shotSlide(
  5,
  'ADMIN · OPERATIONS',
  'Live ops overview — not a static board.',
  'Open jobs, renewals, and active clients at a glance — SAQCC / ISO language.',
  '01-admin-dashboard.png'
);

shotSlide(
  6,
  'ADMIN · JOBS',
  'Fifty jobs. Filterable. Sortable. Ownable.',
  'Status, method, customer, and sort — UT / MT / PT / VT colour-coded.',
  '02-admin-jobs-list.png'
);

shotSlide(
  7,
  'ADMIN · CREATE JOB',
  'A guided wizard that sets the job up right.',
  'Work → People → Procedure → Equipment → Review. Method drives eligibility.',
  '03-admin-job-wizard.png'
);

shotSlide(
  8,
  'COMPLIANCE GATES',
  'Expired certs never leave the yard.',
  'Blocked assign for expired method cert, near-vision, or pending verification.',
  '04-compliance-assign-gates.png'
);

shotSlide(
  9,
  'CUSTOMER INTELLIGENCE',
  'Client history that sales and QA both use.',
  'Past / current / future jobs, pass–fail stats, and View report on completed work.',
  '06-admin-customer-detail.png'
);

shotSlide(
  10,
  'PEOPLE & RENEWALS',
  'Roster health in seconds.',
  'Valid · due soon · expired/blocked — filter by method, cert status, and level.',
  '07-admin-inspectors.png'
);

shotSlide(
  11,
  'EQUIPMENT',
  'On job vs available — with cal truth.',
  'In cal, due soon, expired — Available, On Job, Locked Out before kit leaves store.',
  '08-admin-equipment.png'
);

shotSlide(
  12,
  'DISPATCH',
  'The week on a calendar, not a whiteboard photo.',
  'Month view by inspection / due date; eligibility colours keep risk visible.',
  '09-admin-dispatch.png'
);

shotSlide(
  13,
  'TECHNICIAN · LESEGO',
  'Field cockpit: my jobs, my status.',
  'Assigned, in progress, awaiting supervisor, revision required — tablet-ready.',
  '11-tech-lesego-dashboard.png'
);

shotSlide(
  14,
  'FIELD EVIDENCE',
  'Pass, fail, photo — on the item.',
  'Readings and criteria next to the indication; photos stay on the weld / component.',
  '13-tech-inspection-photos.png'
);

shotSlide(
  15,
  'L3 · CERTIFY',
  'Technical authority that unblocks the client.',
  'Approve & certify or reject / request re-scan — digital signature ready for release.',
  '16-l3-review-modal.png'
);

closeSlide(16);

await pptx.writeFile({ fileName: outFile });
const stat = fs.statSync(outFile);
console.log(`Wrote ${outFile} (${Math.round(stat.size / 1024)} KB)`);
