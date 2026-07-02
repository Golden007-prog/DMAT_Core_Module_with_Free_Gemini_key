import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export async function startPractice(
  page: Page,
  subtest: 'Figure Sequences' | 'Mathematical Equations' | 'Latin Squares',
  opts: { count?: 5 | 10 | 20; mode?: 'Practice' | 'Exam simulation'; instantFeedback?: boolean } = {},
) {
  await page.goto('/');
  await page.getByRole('radio', { name: new RegExp(subtest) }).click();
  await page.getByRole('button', { name: 'easy', exact: true }).click();
  await page.getByRole('button', { name: String(opts.count ?? 5), exact: true }).click();
  await page.getByRole('button', { name: opts.mode ?? 'Practice', exact: true }).click();
  if (opts.instantFeedback === false) {
    const checkbox = page.getByRole('checkbox', { name: /instant feedback/i });
    if (await checkbox.isChecked()) await checkbox.click();
  }
  await page.getByRole('button', { name: 'Generate set' }).click();
  await expect(page.getByRole('button', { name: /start test/i })).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: /start test/i }).click();
}

/** Answers the currently shown question for any of the three task types. */
export async function answerCurrentQuestion(page: Page) {
  const latin = page.getByRole('radio', { name: 'Answer A' });
  if (await latin.isVisible().catch(() => false)) {
    await latin.click();
    return;
  }
  const figureOption = page.getByRole('radio', { name: /Image 1.*matrix 1/i });
  if (await figureOption.isVisible().catch(() => false)) {
    await figureOption.click();
    await page.getByRole('radio', { name: /Image 2.*matrix 1/i }).click();
    return;
  }
  // equations choice: click the first numeric chip
  await page.getByRole('radiogroup', { name: /value of/i }).getByRole('radio').first().click();
}

export async function answerAllAndSubmit(page: Page, count: number) {
  for (let i = 0; i < count; i++) {
    await answerCurrentQuestion(page);
    if (i < count - 1) {
      await page.getByRole('button', { name: /next/i }).click();
    }
  }
  await page.getByRole('button', { name: 'Submit', exact: true }).click();
  const anyway = page.getByRole('button', { name: /submit anyway|^submit$/i }).last();
  if (await anyway.isVisible().catch(() => false)) await anyway.click();
}
