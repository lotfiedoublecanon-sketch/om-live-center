import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/om/', { waitUntil: 'networkidle' });
  await expect(page.locator('.match-hero')).toBeVisible();
  expect(errors).toEqual([]);
});

test('navigates all primary views without document reload', async ({ page }) => {
  await page.evaluate(() => { (window as typeof window & { __navigationMarker?: string }).__navigationMarker = 'kept'; });
  for (const label of ['Actus', 'Mercato', 'Calendrier', 'Classement', 'Effectif', 'Live']) {
    await page.getByRole('tab', { name: label, exact: true }).click();
    await expect(page.getByRole('tab', { name: label, exact: true })).toHaveAttribute('data-state', 'active');
    expect(await page.evaluate(() => (window as typeof window & { __navigationMarker?: string }).__navigationMarker)).toBe('kept');
  }
});

test('supports keyboard navigation between tabs', async ({ page }) => {
  const live = page.getByRole('tab', { name: 'Live', exact: true });
  await live.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Actus', exact: true })).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('End');
  await expect(page.getByRole('tab', { name: 'Effectif', exact: true })).toHaveAttribute('aria-selected', 'true');
});

test('shows confirmed friendly, squad photos and sourced content', async ({ page }) => {
  await expect(page.locator('.match-hero')).toContainText(/Match amical/i);
  await page.getByRole('tab', { name: 'Effectif' }).click();
  await expect(page.locator('.player-card')).toHaveCount(29);
  await expect(page.locator('.player-card img').first()).toBeVisible();
  await page.getByRole('tab', { name: 'Actus' }).click();
  await expect(page.locator('.content-card').first()).toBeVisible();
});

test('keeps the last valid payload when the network becomes unavailable', async ({ page, context }) => {
  const hero = page.locator('.match-hero');
  const before = await hero.textContent();
  await context.setOffline(true);
  await page.getByTitle('Rafraîchir maintenant').click();
  await expect(page.getByText(/dernières données conservées/i)).toBeVisible();
  expect(await hero.textContent()).toBe(before);
  await context.setOffline(false);
});

test('loads the app shell and last payload after an offline reload', async ({ page, context }) => {
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    if (!registration.active) throw new Error('Service worker inactive');
  });
  await page.waitForTimeout(500);
  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('.match-hero')).toBeVisible();
  await expect(page.locator('.connection')).toHaveClass(/is-(cached|offline)/);
  await context.setOffline(false);
});

test('prevents overlapping refresh requests', async ({ page }) => {
  let active = 0;
  let maximum = 0;
  await page.route('**/api/om/widget', async (route) => {
    active += 1;
    maximum = Math.max(maximum, active);
    await new Promise((resolve) => setTimeout(resolve, 300));
    await route.continue();
    active -= 1;
  });
  const refresh = page.getByTitle('Rafraîchir maintenant');
  await refresh.click();
  await refresh.click({ force: true });
  await refresh.click({ force: true });
  await page.waitForTimeout(700);
  expect(maximum).toBe(1);
});

test('has no horizontal overflow at the active viewport', async ({ page }) => {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  await page.getByRole('tab', { name: 'Effectif' }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
});
