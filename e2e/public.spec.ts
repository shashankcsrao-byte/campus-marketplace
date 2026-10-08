import { expect, test, type Page } from '@playwright/test';

// Collect console errors so every test also proves the page is clean.
function trackErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
}

const feed = (page: Page) => page.locator('#listings a[href^="/listing/"]');

test('home shows the marketplace with a live count', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/');
  await expect(page.getByText(/\d+ listings? found/)).toBeVisible();
  await expect(feed(page).first()).toBeVisible();
  expect(errors).toEqual([]);
});

test('search is case-insensitive and lives in the URL', async ({ page }) => {
  await page.goto('/?q=CYCLE');
  await expect(page.getByRole('heading', { name: /Results for/ })).toBeVisible();
  await expect(feed(page).first()).toBeVisible();
  for (const title of await feed(page).locator('h3').allTextContents()) expect(title.toLowerCase()).toContain('cycle');
});

test('listing page offers share, report and the seller profile', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/');
  await feed(page).first().click();
  await expect(page).toHaveURL(/\/listing\/[0-9a-f-]{36}$/);
  await expect(page.getByRole('button', { name: 'Share' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'WhatsApp' })).toHaveAttribute('href', /^https:\/\/wa\.me\/\?text=/);

  // Logged out: reporting asks you to log in first.
  await page.getByRole('button', { name: 'Report listing' }).click();
  await expect(page).toHaveURL(/\/login\?redirect=%2Flisting%2F/);
  await page.goBack();

  await page.getByRole('link', { name: /See profile and other listings/ }).click();
  await expect(page).toHaveURL(/\/u\/[0-9a-f-]{36}$/);
  await expect(page.getByText(/Member since/)).toBeVisible();
  await expect(page.getByRole('tab', { name: /For sale/ })).toBeVisible();
  expect(errors).toEqual([]);
});

test('protected pages send you to log in and back', async ({ page }) => {
  for (const path of ['/create', '/messages', '/favourites', '/my-listings', '/profile']) {
    await page.goto(path);
    await expect(page).toHaveURL(`/login?redirect=${encodeURIComponent(path)}`);
  }
});

test('unknown pages and listings are handled', async ({ page }) => {
  await page.goto('/this/does/not/exist');
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
  await page.goto('/listing/00000000-0000-0000-0000-000000000000');
  await expect(page.getByText("This listing doesn't exist or was removed.")).toBeVisible();
  await page.goto('/u/not-a-user');
  await expect(page.getByText("This seller doesn't exist.")).toBeVisible();
});

test('register form validates before contacting the server', async ({ page }) => {
  await page.goto('/register');
  let authCalls = 0;
  page.on('request', (r) => r.url().includes('/auth/v1/') && authCalls++);
  await page.getByLabel('Email').fill('not-an-email');
  await page.getByLabel('Password', { exact: true }).fill('short');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText('Enter a valid email address.')).toBeVisible();
  await expect(page.getByText('Password must be at least 8 characters.')).toBeVisible();
  expect(authCalls).toBe(0);
});

test('no horizontal scrolling', async ({ page }) => {
  for (const path of ['/', '/login', '/register']) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
});
