/**
 * Capture clean sales-deck screenshots at 1920×1080, deviceScaleFactor 1.
 * Uses system Chrome via playwright-core (avoids Cursor browser panel mosaics).
 *
 * Run: node docs/demo/capture-screenshots.mjs
 * Requires: npm run dev on http://localhost:5173
 */
import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { PNG } = require('pngjs');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, 'screenshots');
const BASE = process.env.DEMO_URL || 'http://localhost:5173';
const CHROME =
  process.env.CHROME_PATH ||
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const VIEW = { width: 1920, height: 1080 };

function verifyPng(filePath) {
  const png = PNG.sync.read(fs.readFileSync(filePath));
  const { width: w, height: h } = png;
  const qw = Math.floor(w / 2);
  const qh = Math.floor(h / 2);
  const hash = (ox, oy) => {
    let s = 0;
    for (let y = oy; y < oy + qh; y += 4) {
      for (let x = ox; x < ox + qw; x += 4) {
        const i = (y * w + x) * 4;
        s = (s * 31 + png.data[i] + png.data[i + 1] * 7 + png.data[i + 2] * 13) >>> 0;
      }
    }
    return s;
  };
  const hashes = [hash(0, 0), hash(qw, 0), hash(0, qh), hash(qw, qh)];
  const unique = new Set(hashes).size;
  if (unique === 1) throw new Error(`TILED mosaic detected: ${filePath}`);
  if (w !== VIEW.width || h !== VIEW.height) {
    throw new Error(`Unexpected size ${w}x${h} for ${filePath}`);
  }
  console.log(`  ✓ ${path.basename(filePath)} ${w}×${h} uniqueQuads=${unique}`);
}

async function shot(page, name) {
  const dest = path.join(OUT, name);
  await page.screenshot({
    path: dest,
    type: 'png',
    fullPage: false,
    animations: 'disabled',
  });
  verifyPng(dest);
}

async function clickRole(page, name) {
  await page.getByRole('button', { name, exact: true }).click();
  await page.waitForTimeout(400);
}

async function clickNav(page, nameRe) {
  await page.getByRole('button', { name: nameRe }).first().click();
  await page.waitForTimeout(500);
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  if (!fs.existsSync(CHROME)) {
    throw new Error(`Chrome not found at ${CHROME}`);
  }

  const browser = await chromium.launch({
    executablePath: CHROME,
    headless: true,
  });
  const context = await browser.newContext({
    viewport: VIEW,
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);

  console.log(`Opening ${BASE} at ${VIEW.width}×${VIEW.height} DSF=1…`);
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  // Dismiss confirm dialogs for reset if any
  page.on('dialog', async (d) => {
    await d.dismiss().catch(() => {});
  });

  // Ensure Admin dashboard
  await clickRole(page, 'Admin');
  await clickNav(page, /^Dashboard$/);
  await shot(page, '01-admin-dashboard.png');

  await clickNav(page, /Jobs/);
  await shot(page, '02-admin-jobs-list.png');

  // Job wizard (Work step)
  const newJob = page.getByRole('button', { name: /New (Inspection )?Job/i }).first();
  await newJob.click();
  await page.waitForTimeout(600);
  await shot(page, '03-admin-job-wizard.png');

  // Advance to People step for compliance gates if possible
  const nextBtn = page.getByRole('button', { name: /^Next$/i });
  // Fill minimal Work fields if empty so Next enables
  try {
    const customer = page.locator('select, [role="combobox"]').first();
    if (await customer.count()) {
      // Prefer selecting first available options via native selects if present
    }
  } catch (_) {}

  // Try clicking Next a few times; if blocked, stay on current
  for (let i = 0; i < 2; i++) {
    if (await nextBtn.isEnabled().catch(() => false)) {
      await nextBtn.click();
      await page.waitForTimeout(400);
    }
  }
  await shot(page, '04-compliance-assign-gates.png');

  // Close wizard (modal overlay blocks nav until dismissed)
  async function closeWizard() {
    const overlay = page.locator('div.fixed.inset-0.z-50');
    if ((await overlay.count()) === 0) return;
    // Header X is first icon button in the modal header
    const xBtn = overlay.locator('button').filter({ has: page.locator('svg') }).first();
    await xBtn.click({ force: true }).catch(() => {});
    await page.waitForTimeout(300);
    const discard = page.getByRole('button', { name: /Discard/i });
    if (await discard.count()) {
      await discard.click();
      await page.waitForTimeout(300);
    }
    // Fallback: Cancel on step 1
    const cancel = page.getByRole('button', { name: /^Cancel$/i });
    if ((await overlay.count()) > 0 && (await cancel.count())) {
      await cancel.click({ force: true });
      await page.waitForTimeout(300);
    }
    await overlay.waitFor({ state: 'detached', timeout: 8000 }).catch(() => {});
  }
  await closeWizard();

  await clickNav(page, /Customers/);
  await shot(page, '05-admin-customers-list.png');

  // Open first customer card/row
  const customerBtn = page
    .getByRole('button')
    .filter({ hasText: /Engineering|Mining|Steel|Petro|Fabricat|Power|Marine|Weld/i })
    .first();
  if (await customerBtn.count()) {
    await customerBtn.click();
    await page.waitForTimeout(600);
  } else {
    // Fallback: click any non-nav button in main
    const cards = page.locator('main button').filter({ hasText: /.+/ });
    if (await cards.count()) await cards.nth(0).click();
    await page.waitForTimeout(600);
  }
  await shot(page, '06-admin-customer-detail.png');

  await clickNav(page, /Inspectors/);
  await shot(page, '07-admin-inspectors.png');

  await clickNav(page, /Equipment/);
  await shot(page, '08-admin-equipment.png');

  await clickNav(page, /Renewals/);
  await shot(page, '10-admin-renewals.png');

  await clickNav(page, /Dispatch/);
  await shot(page, '09-admin-dispatch.png');

  // Technician Lesego
  await clickRole(page, 'Lesego (L1)');
  await page.waitForTimeout(600);
  await shot(page, '11-tech-lesego-dashboard.png');

  // Open first job
  const jobOpen = page.getByRole('button', { name: /Open /i }).first();
  if (await jobOpen.count()) {
    await jobOpen.click();
    await page.waitForTimeout(700);
    await shot(page, '12-tech-job-detail.png');

    // Scroll to photos / click a photo if present
    const photo = page.locator('img[alt], button:has(img), [class*="photo"]').first();
    if (await photo.count()) {
      await photo.scrollIntoViewIfNeeded().catch(() => {});
      await page.waitForTimeout(300);
      await shot(page, '13-tech-inspection-photos.png');
      await photo.click({ force: true }).catch(() => {});
      await page.waitForTimeout(500);
      await shot(page, '14-tech-photo-lightbox.png');
      await page.keyboard.press('Escape').catch(() => {});
    } else {
      await shot(page, '13-tech-inspection-photos.png');
      // duplicate for lightbox slot if none
      await shot(page, '14-tech-photo-lightbox.png');
    }
  } else {
    await shot(page, '12-tech-job-detail.png');
    await shot(page, '13-tech-inspection-photos.png');
    await shot(page, '14-tech-photo-lightbox.png');
  }

  // L3 Johan
  await clickRole(page, 'Johan (L3)');
  await page.waitForTimeout(700);
  await shot(page, '15-l3-queue.png');

  const reviewBtn = page.getByRole('button', { name: /Perform L3 Sign-Off|Update L3 Sign-Off|Review/i }).first();
  if (await reviewBtn.count()) {
    await reviewBtn.click();
    await page.waitForTimeout(700);
  }
  await shot(page, '16-l3-review-modal.png');

  await browser.close();
  console.log('All screenshots captured and verified.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
