import { test as base } from '@playwright/test';

/** App flows under test bypass the auth gate (dev builds only) — the gate
 *  itself is covered explicitly in landing.spec.ts. */
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('coreforge-e2e-bypass', '1');
    });
    await use(page);
  },
});

export { expect } from '@playwright/test';
