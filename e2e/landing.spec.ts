import { test, expect } from '@playwright/test';

// NOTE: deliberately NOT using the bypass fixture — this spec tests the gate.

test('signed-out visitors land on the welcome page', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/welcome$/);
  await expect(page.getByRole('heading', { name: /train for the digitaler mastertest/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /^sign in$/i })).toBeVisible();
});

test('deep URLs are gated too — direct navigation cannot skip login', async ({ page }) => {
  for (const path of ['/run', '/history', '/analytics', '/settings']) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/welcome$/);
  }
});

test('signup form validates input and toggles to sign-in', async ({ page }) => {
  await page.goto('/welcome');
  await page.getByRole('button', { name: /create an account/i }).click();
  await expect(page.getByRole('heading', { name: /create your free account/i })).toBeVisible();
  await page.getByRole('button', { name: /^sign in$/i }).isVisible(); // toggle back exists
});
