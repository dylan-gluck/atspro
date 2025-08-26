import { test, expect } from '@playwright/test';

test.describe('Resume Optimization Workflow', () => {
	test.beforeEach(async ({ page }) => {
		// Start each test fresh - tests will handle their own navigation
	});

	test('should redirect to auth for unauthenticated users accessing resume page', async ({ page }) => {
		// Try to access resume page without auth
		await page.goto('/app/resume');
		
		// Should redirect to sign-in
		await expect(page).toHaveURL(/.*\/auth\/sign-in/, { timeout: 10000 });
	});

	test('should redirect to auth for unauthenticated users accessing settings', async ({ page }) => {
		// Try to access settings page without auth
		await page.goto('/app/settings');
		
		// Should redirect to sign-in
		await expect(page).toHaveURL(/.*\/auth\/sign-in/, { timeout: 10000 });
	});

	test('should handle onboarding page access', async ({ page }) => {
		// Try to access onboarding page without auth
		await page.goto('/onboarding');
		
		// Onboarding might be accessible without auth or redirect to sign-in
		try {
			await expect(page).toHaveURL(/.*\/auth\/sign-in/, { timeout: 5000 });
		} catch {
			// Onboarding page might be accessible - check that it loads properly
			await expect(page).toHaveURL(/.*\/onboarding/);
		}
	});

	test('should handle direct navigation to non-existent routes', async ({ page }) => {
		// Try to access non-existent route
		await page.goto('/app/non-existent-page');
		
		// Should redirect to sign-in or show 404 based on app routing
		try {
			await expect(page).toHaveURL(/.*\/auth\/sign-in/, { timeout: 5000 });
		} catch {
			// Alternative: might show 404 or other error page
			await expect(page.locator('body')).toContainText(/not found|404|error/i);
		}
	});

	test('should handle auth page navigation when already unauthenticated', async ({ page }) => {
		// Navigate to auth pages when already unauthenticated
		await page.goto('/auth/sign-in');
		await expect(page.getByPlaceholder(/name@example.com/i)).toBeVisible();
		
		await page.goto('/auth/sign-up');
		await expect(page.getByPlaceholder(/john doe/i)).toBeVisible();
		
		await page.goto('/auth/forgot-password');
		await expect(page.getByPlaceholder(/name@example.com/i)).toBeVisible();
	});
});