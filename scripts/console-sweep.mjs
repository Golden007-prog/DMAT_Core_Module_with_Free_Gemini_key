// §12 acceptance: zero console errors through the core flow (prod build).
import { chromium } from '@playwright/test';

const base = process.argv[2] ?? 'http://localhost:4173';
const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text());
});
page.on('pageerror', (err) => errors.push(String(err)));

await page.goto(base);
await page.getByRole('radio', { name: /Latin Squares/ }).click();
await page.getByRole('button', { name: 'easy', exact: true }).click();
await page.getByRole('button', { name: '5', exact: true }).click();
await page.getByRole('button', { name: 'Generate set' }).click();
await page.getByRole('button', { name: /start test/i }).click({ timeout: 15000 });
for (let i = 0; i < 5; i++) {
  await page.getByRole('radio', { name: 'Answer A' }).click();
  const next = page.getByRole('button', { name: /next/i });
  if (await next.isVisible().catch(() => false)) await next.click();
}
await page.getByRole('button', { name: 'Submit', exact: true }).click();
const anyway = page.getByRole('button', { name: /submit anyway|^submit$/i }).last();
if (await anyway.isVisible().catch(() => false)) await anyway.click();
await page.waitForSelector('text=Results', { timeout: 10000 });
await page.getByRole('link', { name: /review answers/i }).click();
await page.waitForSelector('text=Explanation');
for (const path of ['/history', '/analytics', '/learn', '/settings']) {
  await page.goto(base + path);
  await page.waitForTimeout(400);
}
await browser.close();

if (errors.length > 0) {
  console.error('CONSOLE ERRORS FOUND:');
  for (const e of errors) console.error(' -', e);
  process.exit(1);
}
console.log('Zero console errors through the full core flow.');
