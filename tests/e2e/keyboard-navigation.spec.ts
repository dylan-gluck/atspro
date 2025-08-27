import { test, expect } from '@playwright/test';

// Helper to create an authenticated session
async function createAuthenticatedSession(page: any) {
	// Create test user data
	const testUser = {
		email: `test-${Date.now()}@example.com`,
		password: 'TestPassword123!',
		name: 'Test User'
	};

	// Register user
	await page.goto('/auth/sign-up');
	await page.fill('input[type="text"]', testUser.name);
	await page.fill('input[type="email"]', testUser.email);
	await page.fill('input[type="password"]', testUser.password);
	await page.click('button[type="submit"]');

	// Wait for redirect to onboarding or app
	await page.waitForURL(/\/(onboarding|app)/);
}

test.describe('Keyboard Navigation', () => {
	test.beforeEach(async ({ page }) => {
		// Setup auth
		await createAuthenticatedSession(page);
		await page.goto('/app');
	});

	test('should navigate with Tab key through interactive elements', async ({ page }) => {
		// Start from the page body
		await page.keyboard.press('Tab');

		// Check that skip link becomes visible and focused
		const skipLink = page.locator('.skip-link');
		await expect(skipLink).toBeFocused();

		// Tab through navigation items
		await page.keyboard.press('Tab');
		let focusedElement = await page.evaluateHandle(() => document.activeElement);
		let tagName = await focusedElement.evaluate((el) => el!.tagName);
		expect(['BUTTON', 'A']).toContain(tagName);

		// Continue tabbing and ensure focus moves through all interactive elements
		for (let i = 0; i < 10; i++) {
			await page.keyboard.press('Tab');
			focusedElement = await page.evaluateHandle(() => document.activeElement);
			tagName = await focusedElement.evaluate((el) => el!.tagName);
			const isFocusable = await focusedElement.evaluate((el) => {
				if (!el) return false;
				const focusableTags = ['A', 'BUTTON', 'INPUT', 'TEXTAREA', 'SELECT'];
				return focusableTags.includes(el.tagName) || el.getAttribute('tabindex') === '0';
			});
			expect(isFocusable).toBeTruthy();
		}
	});

	test('should show visible focus styles on keyboard navigation', async ({ page }) => {
		await page.keyboard.press('Tab');
		await page.keyboard.press('Tab');

		const focusedElement = await page.evaluateHandle(() => document.activeElement);
		const hasVisibleFocus = await focusedElement.evaluate((el) => {
			if (!el) return false;
			const styles = window.getComputedStyle(el);
			return (
				styles.outline !== 'none' ||
				styles.boxShadow.includes('ring') ||
				el.classList.toString().includes('ring')
			);
		});

		expect(hasVisibleFocus).toBeTruthy();
	});

	test('should navigate dropdown menu with arrow keys', async ({ page }) => {
		// Open user menu
		await page.locator('[aria-label="User menu"]').first().click();

		// Navigate with arrow keys
		await page.keyboard.press('ArrowDown');
		let focused = await page.evaluateHandle(() => document.activeElement);
		let role = await focused.evaluate((el) => el?.getAttribute('role'));
		expect(role).toBe('menuitem');

		await page.keyboard.press('ArrowDown');
		focused = await page.evaluateHandle(() => document.activeElement);
		const text = await focused.evaluate((el) => el?.textContent);
		expect(text).toBeTruthy();

		// Select with Enter
		await page.keyboard.press('Enter');
	});

	test('should close modal with Escape key', async ({ page }) => {
		// Navigate to a page with a modal or dialog
		await page.goto('/app/jobs/new');

		// If there's a modal/dialog, test escape
		const dialog = page.locator('[role="dialog"]');
		if (await dialog.isVisible()) {
			await page.keyboard.press('Escape');
			await expect(dialog).toBeHidden();
		}
	});

	test('should show keyboard shortcuts help with Ctrl+/', async ({ page }) => {
		// Press keyboard shortcut
		await page.keyboard.press('Control+/');

		// Check that help dialog appears
		const helpDialog = page.locator('text=Keyboard Shortcuts');
		await expect(helpDialog).toBeVisible();

		// Close with Escape
		await page.keyboard.press('Escape');
		await expect(helpDialog).toBeHidden();
	});

	test('should navigate between tabs with arrow keys', async ({ page }) => {
		await page.goto('/app/jobs');

		// If there are tabs, test arrow navigation
		const tabs = page.locator('[role="tab"]');
		if ((await tabs.count()) > 0) {
			await tabs.first().focus();
			await page.keyboard.press('ArrowRight');

			const focused = await page.evaluateHandle(() => document.activeElement);
			const role = await focused.evaluate((el) => el?.getAttribute('role'));
			expect(role).toBe('tab');
		}
	});

	test('should trap focus in modal dialogs', async ({ page }) => {
		// Open keyboard shortcuts dialog
		await page.keyboard.press('Control+/');

		// Tab through elements in the dialog
		let previousElement = null;
		const elements = new Set();

		for (let i = 0; i < 20; i++) {
			await page.keyboard.press('Tab');
			const focused = await page.evaluateHandle(() => document.activeElement);
			const id = await focused.evaluate((el) => el?.id || el?.className);

			if (elements.has(id) && previousElement !== id) {
				// Focus has wrapped around - good!
				break;
			}
			elements.add(id);
			previousElement = id;
		}

		// Verify focus stayed within dialog
		const focusedElement = await page.evaluateHandle(() => document.activeElement);
		const isInDialog = await focusedElement.evaluate((el) => {
			return el?.closest('[role="dialog"]') !== null;
		});
		expect(isInDialog).toBeTruthy();
	});

	test('should handle form field navigation', async ({ page }) => {
		await page.goto('/app/jobs/new');

		// Focus first input
		await page.locator('input').first().focus();

		// Tab through form fields
		await page.keyboard.press('Tab');
		let focused = await page.evaluateHandle(() => document.activeElement);
		let tagName = await focused.evaluate((el) => el?.tagName);
		expect(['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON']).toContain(tagName);

		// Test Enter key in text input (should not submit)
		if (tagName === 'INPUT') {
			await page.keyboard.press('Enter');
			// Form should not be submitted
			await expect(page).toHaveURL(/\/app\/jobs\/new/);
		}
	});

	test('should navigate with keyboard shortcuts', async ({ page }) => {
		// Test navigation shortcuts
		await page.keyboard.press('Alt+h'); // Home
		await expect(page).toHaveURL(/\/app$/);

		await page.keyboard.press('Alt+r'); // Resume
		await expect(page).toHaveURL(/\/app\/resume/);

		await page.keyboard.press('Alt+j'); // Jobs
		await expect(page).toHaveURL(/\/app\/jobs/);

		await page.keyboard.press('Alt+s'); // Settings
		await expect(page).toHaveURL(/\/app\/settings/);
	});

	test('should maintain logical focus order', async ({ page }) => {
		await page.goto('/app');

		// Tab through first 20 elements and ensure they're in visual order
		const positions = [];

		for (let i = 0; i < 20; i++) {
			await page.keyboard.press('Tab');
			const focused = await page.evaluateHandle(() => document.activeElement);
			const rect = await focused.evaluate((el) => {
				if (!el) return { x: 0, y: 0 };
				const bounds = el.getBoundingClientRect();
				return { x: bounds.x, y: bounds.y };
			});
			positions.push(rect);
		}

		// Check that focus generally moves left-to-right, top-to-bottom
		// Allow for some variation due to layout
		let isLogical = true;
		for (let i = 1; i < positions.length; i++) {
			const prev = positions[i - 1];
			const curr = positions[i];

			// Focus should generally move down or right
			if (curr.y < prev.y - 100) {
				// Moved significantly up - might be illogical
				isLogical = false;
				break;
			}
		}

		expect(isLogical).toBeTruthy();
	});

	test('should support skip link navigation', async ({ page }) => {
		await page.goto('/app');

		// Press Tab to focus skip link
		await page.keyboard.press('Tab');

		// Activate skip link
		await page.keyboard.press('Enter');

		// Check that focus moved to main content
		const focused = await page.evaluateHandle(() => document.activeElement);
		const id = await focused.evaluate((el) => el?.id);
		expect(id).toBe('app-main-content');
	});
});

test.describe('Accessibility Compliance', () => {
	test.beforeEach(async ({ page }) => {
		await createAuthenticatedSession(page);
	});

	test('all interactive elements should be keyboard accessible', async ({ page }) => {
		await page.goto('/app');

		// Find all interactive elements
		const interactiveElements = await page.$$eval(
			'button, a[href], input, textarea, select, [tabindex]:not([tabindex="-1"])',
			(elements) => {
				return elements.map((el) => {
					const htmlEl = el as HTMLElement;
					return {
						tag: htmlEl.tagName,
						visible: htmlEl.offsetWidth > 0 && htmlEl.offsetHeight > 0,
						disabled: htmlEl.hasAttribute('disabled'),
						tabindex: htmlEl.getAttribute('tabindex')
					};
				});
			}
		);

		// Check that all visible, non-disabled elements are accessible
		for (const element of interactiveElements) {
			if (element.visible && !element.disabled) {
				expect(element.tabindex).not.toBe('-1');
			}
		}
	});

	test('focus should be visible on all focusable elements', async ({ page }) => {
		await page.goto('/app');

		// Tab through several elements and check focus visibility
		for (let i = 0; i < 5; i++) {
			await page.keyboard.press('Tab');

			const hasFocusIndicator = await page.evaluate(() => {
				const el = document.activeElement as HTMLElement;
				if (!el) return false;

				const styles = window.getComputedStyle(el);
				const pseudoStyles = window.getComputedStyle(el, ':focus-visible');

				return (
					styles.outline !== 'none' ||
					styles.boxShadow !== 'none' ||
					pseudoStyles.outline !== 'none' ||
					el.classList.toString().includes('ring') ||
					el.classList.toString().includes('focus')
				);
			});

			expect(hasFocusIndicator).toBeTruthy();
		}
	});
});
