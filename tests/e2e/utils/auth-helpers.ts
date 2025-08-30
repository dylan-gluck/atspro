import { expect, type Page } from '@playwright/test';

export interface TestUser {
	name: string;
	email: string;
	password: string;
}

/**
 * Creates a unique test user with timestamp to avoid conflicts
 */
export function createTestUser(prefix: string = 'test'): TestUser {
	const timestamp = Date.now();
	return {
		name: `${prefix} User ${timestamp}`,
		email: `${prefix}${timestamp}@example.com`,
		password: 'TestPassword123!'
	};
}

/**
 * Registers a new user and handles the expected redirect to onboarding
 * @param page - Playwright page instance
 * @param user - User data to register with
 * @param timeout - Timeout for waiting for redirect (default 15 seconds)
 */
export async function registerUser(
	page: Page,
	user: TestUser,
	timeout: number = 15000
): Promise<void> {
	// Navigate to registration page
	await page.goto('/auth/sign-up');

	// Wait for the form to be fully loaded
	await page.waitForSelector('input', { timeout: 5000 });

	// Use placeholder-based selectors like the working auth tests
	await page.getByPlaceholder(/john doe|full name/i).fill(user.name);
	await page.getByPlaceholder(/name@example.com|email/i).fill(user.email);
	await page.getByPlaceholder(/enter your password|create password|password/i).fill(user.password);

	// Submit registration using the button text like the auth tests
	await page.getByRole('button', { name: /sign up|create account/i }).click();

	// Wait for navigation to onboarding page with timeout
	await expect(page).toHaveURL(/.*\/onboarding/, { timeout });
}

/**
 * Logs in an existing user and handles the expected redirect to app
 * @param page - Playwright page instance
 * @param email - User email
 * @param password - User password
 * @param timeout - Timeout for waiting for redirect (default 10 seconds)
 */
export async function loginUser(
	page: Page,
	email: string,
	password: string,
	timeout: number = 10000
): Promise<void> {
	// Navigate to login page
	await page.goto('/auth/sign-in');

	// Fill login form
	await page.getByPlaceholder(/name@example.com|email/i).fill(email);
	await page.getByPlaceholder(/enter your password|password/i).fill(password);

	// Submit login using form button (not header button)
	await page
		.locator('#main-content')
		.getByRole('button', { name: /sign in|log in/i })
		.click();

	// Wait a moment for response
	await page.waitForTimeout(2000);

	// Login should redirect to app dashboard
	await expect(page).toHaveURL(/.*\/app/, { timeout });
}

/**
 * Complete the full registration and onboarding flow
 * @param page - Playwright page instance
 * @param user - User data to register with
 * @param skipOnboarding - Whether to attempt to skip onboarding steps
 */
export async function registerAndCompleteOnboarding(
	page: Page,
	user: TestUser,
	skipOnboarding: boolean = false
): Promise<void> {
	try {
		// First register user (will end up on /onboarding but NOT logged in)
		await registerUser(page, user, 20000);

		console.log('Registration successful, now on:', page.url());

		// After registration, the user is created but NOT logged in
		// We need to log in with the same credentials
		await loginUser(page, user.email, user.password, 15000);

		// Now we should be logged in and on /app
		console.log('Login after registration successful, now on:', page.url());

		// Should end up on app dashboard after login
		await expect(page).toHaveURL(/.*\/app/, { timeout: 10000 });
	} catch (error) {
		// If anything fails, log the current URL and throw
		console.log('Registration or login failed, current URL:', page.url());
		throw error;
	}
}

/**
 * Attempts to register a user but gracefully handles errors
 * Used for tests that want to verify error handling
 */
export async function attemptRegistration(
	page: Page,
	user: TestUser
): Promise<'success' | 'error' | 'validation'> {
	await page.goto('/auth/sign-up');

	// Fill form
	await page.getByPlaceholder(/john doe|full name/i).fill(user.name);
	await page.getByPlaceholder(/name@example.com|email/i).fill(user.email);
	await page.getByPlaceholder(/password|enter your password|create password/i).fill(user.password);

	// Submit
	await page.getByRole('button', { name: /sign up|create account/i }).click();

	// Wait a moment for response
	await page.waitForTimeout(1000);

	// Check result
	const currentUrl = page.url();

	if (currentUrl.includes('/onboarding')) {
		return 'success';
	} else if (currentUrl.includes('/auth/sign-up')) {
		// Check for validation errors
		const emailField = page.getByPlaceholder(/name@example.com|email/i);
		const passwordField = page.getByPlaceholder(/password|enter your password|create password/i);

		const hasEmailValidation = await emailField.evaluate(
			(el: HTMLInputElement) => !el.validity.valid
		);
		const hasPasswordValidation = await passwordField.evaluate(
			(el: HTMLInputElement) => !el.validity.valid
		);

		if (hasEmailValidation || hasPasswordValidation) {
			return 'validation';
		}
		return 'error';
	}

	return 'error';
}

/**
 * Attempts to login a user but gracefully handles errors
 * Used for tests that want to verify error handling
 */
export async function attemptLogin(
	page: Page,
	email: string,
	password: string
): Promise<'success' | 'error'> {
	await page.goto('/auth/sign-in');

	// Fill form
	await page.getByPlaceholder(/name@example.com|email/i).fill(email);
	await page.getByPlaceholder(/enter your password|password/i).fill(password);

	// Submit using the form button (not the header button)
	await page
		.locator('#main-content')
		.getByRole('button', { name: /sign in|log in/i })
		.click();

	// Wait for response
	await page.waitForTimeout(2000);

	// Check result
	const currentUrl = page.url();

	if (currentUrl.includes('/app')) {
		return 'success';
	}

	return 'error';
}

/**
 * Attempts to login with retry logic for improved reliability
 * @param page - Playwright page instance
 * @param email - User email
 * @param password - User password
 * @param maxRetries - Maximum number of retry attempts (default 3)
 */
export async function attemptLoginWithRetry(
	page: Page,
	email: string,
	password: string,
	maxRetries: number = 3
): Promise<'success' | 'error'> {
	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		try {
			// Clear any existing auth state
			await page.context().clearCookies();

			// Navigate to login page
			await page.goto('/auth/sign-in');
			await page.waitForLoadState('networkidle');

			// Wait for form to be ready
			await page.waitForSelector('input[type="email"]', { timeout: 5000 });

			// Fill form with explicit waits
			await page.fill('input[type="email"]', email);
			await page.fill('input[type="password"]', password);

			// Click submit button with proper scope
			await page
				.locator('#main-content')
				.getByRole('button', { name: /sign in|log in/i })
				.click();

			// Wait for navigation with longer timeout - accept /app or /app/*
			await page.waitForURL(/.*\/app(\/.*)?$/, { timeout: 10000 });

			return 'success';
		} catch (error) {
			console.log(
				`Login attempt ${attempt} failed:`,
				error instanceof Error ? error.message : String(error)
			);
			if (attempt === maxRetries) {
				return 'error';
			}
			// Wait before retry
			await page.waitForTimeout(1000);
		}
	}
	return 'error';
}

/**
 * Logout the current user
 */
export async function logoutUser(page: Page): Promise<void> {
	// Look for logout button/menu
	const logoutButton = page.getByRole('button', { name: /logout|sign out|log out/i });

	if (await logoutButton.isVisible()) {
		await logoutButton.click();
	} else {
		// Try to find it in a menu
		const menuButton = page.getByRole('button', { name: /menu|account|profile/i });
		if (await menuButton.isVisible()) {
			await menuButton.click();
			const logoutMenuItem = page.getByRole('menuitem', { name: /logout|sign out/i });
			if (await logoutMenuItem.isVisible()) {
				await logoutMenuItem.click();
			}
		}
	}

	// Should redirect to login or home page
	await expect(page).toHaveURL(/.*\/(auth\/sign-in|$)/, { timeout: 5000 });
}
