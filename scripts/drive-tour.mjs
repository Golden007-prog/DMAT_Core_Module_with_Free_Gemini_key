// Drives the app like a user and screenshots every screen for visual review.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const outDir = process.argv[2] ?? 'shots';
mkdirSync(outDir, { recursive: true });
const base = 'http://localhost:5173';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(`[console] ${m.text()}`));
page.on('pageerror', (e) => errors.push(`[pageerror] ${e}`));

const shot = (name) => page.screenshot({ path: `${outDir}/${name}.png`, fullPage: true });

/* -------- Home -------- */
await page.goto(base);
await page.waitForSelector('text=Practice the dMAT Core Module');
await shot('01-home');

/* -------- Figures practice run with instant feedback -------- */
await page.getByRole('radio', { name: /Figure Sequences/ }).click();
await page.getByRole('button', { name: 'easy', exact: true }).click();
await page.getByRole('button', { name: '5', exact: true }).click();
const fb = page.getByRole('checkbox', { name: /instant feedback/i });
if (!(await fb.isChecked())) await fb.click();
await page.getByRole('button', { name: 'Generate set' }).click();
await page.getByRole('button', { name: /start test/i }).waitFor({ timeout: 15000 });
await shot('02-ready-arming');
await page.getByRole('button', { name: /start test/i }).click();
await page.getByText('1 / 5').waitFor();
await shot('03-runner-figures');

// answer both images (wrong on purpose to see feedback)
await page.getByRole('radio', { name: /Image 1.*matrix 2/i }).click();
await page.getByRole('radio', { name: /Image 2.*matrix 2/i }).click();
await page.waitForTimeout(300);
await shot('04-figures-feedback');

// finish the rest quickly
for (let i = 1; i < 5; i++) {
  await page.getByRole('button', { name: /next/i }).click();
  await page.getByRole('radio', { name: /Image 1.*matrix 1/i }).click();
  await page.getByRole('radio', { name: /Image 2.*matrix 1/i }).click();
}
await page.getByRole('button', { name: 'Submit', exact: true }).click();
const anyway = page.getByRole('button', { name: /submit anyway|^submit$/i }).last();
if (await anyway.isVisible().catch(() => false)) await anyway.click();
await page.getByRole('heading', { name: 'Results' }).waitFor({ timeout: 10000 });
await shot('05-results');

await page.getByRole('link', { name: /review answers/i }).click();
await page.getByText('Question 1').waitFor();
await shot('06-review-figures');

/* -------- Equations runner -------- */
await page.getByRole('link', { name: 'Practice', exact: true }).click();
await page.getByRole('radio', { name: /Mathematical Equations/ }).click();
await page.getByRole('button', { name: 'medium', exact: true }).click();
await page.getByRole('button', { name: '5', exact: true }).click();
await page.getByRole('button', { name: 'Generate set' }).click();
await page.getByRole('button', { name: /start test/i }).click({ timeout: 15000 });
await page.getByText('1 / 5').waitFor();
await shot('07-runner-equations');
await page.getByRole('radiogroup', { name: /value of/i }).getByRole('radio').first().click();
await page.waitForTimeout(300);
await shot('08-equations-feedback');

/* -------- Latin runner -------- */
await page.getByRole('link', { name: 'Practice', exact: true }).click();
await page.getByRole('radio', { name: /Latin Squares/ }).click();
await page.getByRole('button', { name: 'hard', exact: true }).click();
await page.getByRole('button', { name: '5', exact: true }).click();
await page.getByRole('button', { name: 'Generate set' }).click();
await page.getByRole('button', { name: /discard and generate/i }).click().catch(() => {});
await page.getByRole('button', { name: /start test/i }).click({ timeout: 15000 });
await page.getByText('1 / 5').waitFor();
await page.locator('svg[aria-label*="letter grid"]').hover();
await shot('09-runner-latin');

/* -------- Exam mode -------- */
await page.getByRole('link', { name: 'Practice', exact: true }).click();
await page.getByRole('radio', { name: /Figure Sequences/ }).click();
await page.getByRole('button', { name: 'Exam simulation', exact: true }).click();
await page.getByRole('button', { name: '5', exact: true }).click();
await page.getByRole('button', { name: 'Generate set' }).click();
await page.getByRole('button', { name: /discard and generate/i }).click().catch(() => {});
await page.getByRole('button', { name: /start test/i }).click({ timeout: 15000 });
await page.getByText('1 / 5').waitFor();
await shot('10-runner-exam');
await page.getByRole('button', { name: /submit early/i }).click();
await shot('11-exam-submit-early-confirm');
await page.getByRole('button', { name: /submit anyway/i }).click();
await page.getByRole('heading', { name: 'Results' }).waitFor();

/* -------- History / Analytics / Learn / Settings -------- */
await page.getByRole('link', { name: 'History' }).click();
await page.waitForSelector('table');
await shot('12-history');

await page.getByRole('link', { name: 'Analytics' }).click();
await page.waitForTimeout(600);
await shot('13-analytics');

await page.getByRole('link', { name: 'Learn' }).click();
await page.waitForSelector('text=Learn the Core Module');
await shot('14-learn');

await page.getByRole('link', { name: 'Settings' }).click();
await page.waitForSelector('text=Gemini');
await shot('15-settings');

/* -------- Full core + break screen -------- */
await page.getByRole('link', { name: 'Practice', exact: true }).click();
await page.getByRole('button', { name: 'Start full run' }).click();
await page.getByRole('button', { name: /start test/i }).waitFor({ timeout: 20000 });
await shot('16-fullcore-ready');

/* -------- Dark mode -------- */
await page.getByRole('button', { name: /switch to dark theme/i }).click();
await page.getByRole('link', { name: 'Practice', exact: true }).click();
await shot('17-home-dark');
await page.getByRole('link', { name: 'Analytics' }).click();
await page.waitForTimeout(500);
await shot('18-analytics-dark');

/* -------- Mobile viewport -------- */
const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
mobile.on('pageerror', (e) => errors.push(`[mobile pageerror] ${e}`));
await mobile.goto(base);
await mobile.waitForSelector('text=Practice the dMAT Core Module');
await mobile.screenshot({ path: `${outDir}/19-mobile-home.png`, fullPage: true });
await mobile.getByRole('radio', { name: /Figure Sequences/ }).click();
await mobile.getByRole('button', { name: 'easy', exact: true }).click();
await mobile.getByRole('button', { name: '5', exact: true }).click();
await mobile.getByRole('button', { name: 'Generate set' }).click();
await mobile.getByRole('button', { name: /start test/i }).click({ timeout: 15000 });
await mobile.getByText('1 / 5').waitFor();
await mobile.screenshot({ path: `${outDir}/20-mobile-figures.png`, fullPage: true });

await browser.close();
if (errors.length) {
  console.error('ERRORS:');
  for (const e of errors) console.error(' -', e);
  process.exit(1);
}
console.log('tour complete, screenshots in', outDir);
