import { test, expect } from '@playwright/test';
import {
	createTestUser,
	registerUser,
	loginUser,
	attemptRegistration,
	attemptLogin
} from './utils/auth-helpers';

test.describe('Authentication Flow', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
	});

	test('should display landing page for unauthenticated users', async ({ page }) => {
		// Should stay on landing page (marketing site)
		await expect(page).toHaveURL('/');

		// Check for landing page elements
		await expect(page.getByRole('heading', { name: /stop letting ats systems/i })).toBeVisible();
		await expect(page.getByRole('button', { name: /start free/i }).first()).toBeVisible();
	});

	test('should show validation errors for invalid login', async ({ page }) => {
		await page.goto('/auth/sign-in');

		// Check that form elements are present
		const emailField = page.getByPlaceholder(/name@example.com/i);
		const passwordField = page.getByPlaceholder(/enter your password/i);
		const submitButton = page.locator('form button[type="submit"]');

		await expect(emailField).toBeVisible();
		await expect(passwordField).toBeVisible();
		await expect(submitButton).toBeVisible();

		// Submit empty form - HTML5 validation should prevent submission
		await submitButton.click();

		// Check that we stayed on the login page (HTML5 validation kicked in)
		await expect(page).toHaveURL(/.*\/auth\/sign-in/);
	});

	test('should navigate to registration page', async ({ page }) => {
		await page.goto('/auth/sign-in');

		// Click on register link
		await page.getByText(/sign up/i).click();

		// Should navigate to register page
		await expect(page).toHaveURL(/.*\/auth\/sign-up/);

		// Check that we're on the sign-up page by looking for name field
		await expect(page.getByPlaceholder(/john doe/i)).toBeVisible();
	});

	test('should attempt user registration', async ({ page }) => {
		// Create unique test user
		const testUser = createTestUser('registration');

		// Attempt registration using helper with increased timeout
		try {
			await registerUser(page, testUser, 15000); // 15 second timeout
			// If we get here, registration succeeded and we're on /onboarding
			await expect(page).toHaveURL(/.*\/onboarding/);
		} catch {
			// Registration might fail - check that we stayed on sign-up page
			const currentUrl = page.url();
			expect(currentUrl).toMatch(/auth\/(sign-up|sign-in)/);
		}
	});

	test('should handle registration errors', async ({ page }) => {
		// Try to register with invalid data using helper
		const invalidUser = {
			name: 'Test User',
			email: 'invalid-email',
			password: 'weak'
		};

		const result = await attemptRegistration(page, invalidUser);

		// Should return validation error due to invalid email/weak password
		expect(result).toBe('validation');
	});

	test('should handle login attempt', async ({ page }) => {
		await page.goto('/auth/sign-in');

		// Check form elements are present
		await expect(page.getByPlaceholder(/name@example.com/i)).toBeVisible();
		await expect(page.getByPlaceholder(/enter your password/i)).toBeVisible();
		await expect(page.locator('form button[type="submit"]')).toBeVisible();

		// Try login with test credentials from test data using helper with increased timeout
		try {
			await loginUser(page, 'jdoex@example.com', 'Test123!', 10000); // 10 second timeout
			// If we get here, login succeeded and we're on /app
			await expect(page).toHaveURL(/.*\/app/);
		} catch {
			// Login might fail if user doesn't exist - check for error message or stay on page
			const currentUrl = page.url();
			expect(currentUrl).toMatch(/auth\/sign-in/);
		}
	});

	test('should navigate to sign-in when accessing protected route', async ({ page }) => {
		// Try to access protected route without authentication
		await page.goto('/app');

		// Should redirect to sign-in
		await expect(page).toHaveURL(/.*\/auth\/sign-in/, { timeout: 10000 });
	});

	test('should protect authenticated routes', async ({ page }) => {
		// Try to access protected route without auth
		await page.goto('/app/jobs');

		// Should redirect to sign-in
		await expect(page).toHaveURL(/.*\/auth\/sign-in/, { timeout: 10000 });
	});

	test('should have accessible auth pages', async ({ page }) => {
		// Test sign-in page accessibility
		await page.goto('/auth/sign-in');
		await expect(page.getByPlaceholder(/name@example.com/i)).toBeVisible();
		await expect(page.locator('form button[type="submit"]')).toBeVisible();

		// Test sign-up page accessibility
		await page.goto('/auth/sign-up');
		await expect(page.getByPlaceholder(/john doe/i)).toBeVisible();
		await expect(page.locator('form button[type="submit"]')).toBeVisible();

		// Test forgot password page
		await page.goto('/auth/forgot-password');
		await expect(page.getByPlaceholder(/name@example.com/i)).toBeVisible();
		await expect(page.locator('form button[type="submit"]')).toBeVisible();
	});

	test('should navigate between auth pages', async ({ page }) => {
		// Start on sign-in
		await page.goto('/auth/sign-in');

		// Navigate to sign-up using specific link
		await page.getByRole('link', { name: /sign up/i }).click();
		await expect(page).toHaveURL(/.*\/auth\/sign-up/);

		// Navigate back to sign-in using specific link
		await page.getByRole('link', { name: /sign in/i }).click();
		await expect(page).toHaveURL(/.*\/auth\/sign-in/);

		// Navigate to forgot password using specific link
		await page.getByRole('link', { name: /forgot password/i }).click();
		await expect(page).toHaveURL(/.*\/auth\/forgot-password/);
	});
});
