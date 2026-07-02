// Renders public/favicon.svg to the PNG icons the PWA manifest references.
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const svg = readFileSync(resolve('public/favicon.svg'), 'utf8');
const browser = await chromium.launch();

for (const size of [192, 512]) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(
    `<body style="margin:0">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body>`,
  );
  await page.screenshot({ path: resolve(`public/icon-${size}.png`), omitBackground: true });
  await page.close();
  console.log(`public/icon-${size}.png written`);
}

await browser.close();
