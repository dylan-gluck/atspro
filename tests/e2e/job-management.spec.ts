import { test, expect } from '@playwright/test';

test.describe('Job Management', () => {
	// Setup: Check that unauthenticated users are redirected
	test.beforeEach(async ({ page }) => {
		// Start each test fresh - tests will handle their own navigation
	});

	test('should redirect to auth for unauthenticated users accessing jobs', async ({ page }) => {
		// Try to access jobs page without auth
		await page.goto('/app/jobs');

		// Should redirect to sign-in
		await expect(page).toHaveURL(/.*\/auth\/sign-in/, { timeout: 10000 });
	});

	test('should redirect to auth for unauthenticated users accessing new job page', async ({
		page
	}) => {
		// Try to access new job page without auth
		await page.goto('/app/jobs/new');

		// Should redirect to sign-in
		await expect(page).toHaveURL(/.*\/auth\/sign-in/, { timeout: 10000 });
	});

	test('should redirect to auth for unauthenticated users accessing job edit page', async ({
		page
	}) => {
		// Try to access job edit page without auth
		await page.goto('/app/jobs/some-id/edit');

		// Should redirect to sign-in
		await expect(page).toHaveURL(/.*\/auth\/sign-in/, { timeout: 10000 });
	});

	test('should redirect to auth for unauthenticated users accessing job details', async ({
		page
	}) => {
		// Try to access job details page without auth
		await page.goto('/app/jobs/some-id');

		// Should redirect to sign-in
		await expect(page).toHaveURL(/.*\/auth\/sign-in/, { timeout: 10000 });
	});

	test('should redirect to auth for unauthenticated users accessing dashboard', async ({
		page
	}) => {
		// Try to access dashboard without auth
		await page.goto('/app');

		// Should redirect to sign-in
		await expect(page).toHaveURL(/.*\/auth\/sign-in/, { timeout: 10000 });
	});
});
