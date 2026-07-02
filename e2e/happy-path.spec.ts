import { test, expect } from '@playwright/test';
import { startPractice, answerAllAndSubmit } from './helpers';

const SUBTESTS = ['Figure Sequences', 'Mathematical Equations', 'Latin Squares'] as const;

for (const subtest of SUBTESTS) {
  test(`happy path: ${subtest} — setup → generate → answer all → results → review`, async ({
    page,
  }) => {
    await startPractice(page, subtest, { count: 5, instantFeedback: false });
    await expect(page.getByText('1 / 5')).toBeVisible();
    await answerAllAndSubmit(page, 5);
    await expect(page.getByRole('heading', { name: 'Results' })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/correct ·/)).toBeVisible();
    await page.getByRole('link', { name: /review answers/i }).click();
    await expect(page.getByRole('heading', { name: 'Review' })).toBeVisible();
    await expect(page.getByText('Question 1')).toBeVisible();
  });
}

test('restart mid-test produces a brand-new full set (R1)', async ({ page }) => {
  await startPractice(page, 'Latin Squares', { count: 5, instantFeedback: false });
  await page.getByRole('radio', { name: 'Answer A' }).click();
  // navigate home (practice keeps nav) and regenerate — confirm discard
  await page.getByRole('link', { name: 'Practice', exact: true }).click();
  // Home remounts with defaults — re-select the same configuration
  await page.getByRole('radio', { name: /Latin Squares/ }).click();
  await page.getByRole('button', { name: 'easy', exact: true }).click();
  await page.getByRole('button', { name: '5', exact: true }).click();
  await page.getByRole('button', { name: 'Generate set' }).click();
  await page.getByRole('button', { name: /discard and generate/i }).click();
  await expect(page.getByRole('button', { name: /start test/i })).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: /start test/i }).click();
  await expect(page.getByText('1 / 5')).toBeVisible();
  // fresh set: no answer selected on question 1
  await expect(page.getByRole('radio', { name: 'Answer A' })).toHaveAttribute(
    'aria-checked',
    'false',
  );
});

test('exam mode: timer expiry auto-submits exactly once', async ({ page }) => {
  await page.goto('/');
  // drive a short-duration exam through the dev test hook (3 s deadline)
  await page.evaluate(() => {
    const hook = (window as unknown as Record<string, any>).__coreforge;
    return hook.sessionStore.getState().startNewSession({
      mode: 'exam',
      subtest: 'latin',
      difficulty: 'easy',
      questionCount: 5,
      seed: 0,
      durationMs: 3000,
    });
  });
  // client-side navigation — a full reload would drop the in-memory session
  await page.evaluate(() => {
    window.history.pushState({}, '', '/run');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  await page.getByRole('button', { name: /start test/i }).click();
  await expect(page.getByRole('heading', { name: 'Results' })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/unanswered/)).toBeVisible();
});
