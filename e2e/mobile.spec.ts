import { test, expect } from './fixtures';
import { startPractice, answerAllAndSubmit } from './helpers';

test('mobile viewport: full figures run is usable end to end', async ({ page }) => {
  await startPractice(page, 'Figure Sequences', { count: 5, instantFeedback: false });
  await expect(page.getByText('1 / 5')).toBeVisible();
  await answerAllAndSubmit(page, 5);
  await expect(page.getByRole('heading', { name: 'Results' })).toBeVisible({ timeout: 10_000 });
});
