import { test, expect } from '@playwright/test';

test.describe('ARIA Live Regions', () => {
	test.beforeEach(async ({ page }) => {
		// Enable screen reader testing mode
		await page.addInitScript(() => {
			// Add a helper to capture live region announcements
			(window as any).liveRegionAnnouncements = [];
			const observer = new MutationObserver((mutations) => {
				mutations.forEach((mutation) => {
					if (mutation.type === 'childList' || mutation.type === 'characterData') {
						const target = mutation.target as HTMLElement;
						const element = target.nodeType === Node.TEXT_NODE ? target.parentElement : target;

						if (
							element &&
							(element.getAttribute('aria-live') || element.getAttribute('role') === 'alert')
						) {
							const text = element.textContent?.trim();
							if (text) {
								(window as any).liveRegionAnnouncements.push({
									text,
									level: element.getAttribute('aria-live') || 'assertive',
									timestamp: Date.now()
								});
							}
						}
					}
				});
			});

			// Observe the entire document for changes
			observer.observe(document.body, {
				childList: true,
				characterData: true,
				subtree: true
			});
		});
	});

	test('Resume editor shows loading state with aria-busy', async ({ page }) => {
		// Mock the authentication
		await page.route('**/auth/session', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					session: { userId: 'test-user' },
					user: { id: 'test-user', email: 'test@example.com', name: 'Test User' }
				})
			});
		});

		// Mock the resume endpoint with a delay
		await page.route('**/resume', async (route) => {
			await page.waitForTimeout(1000); // Simulate network delay
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					id: '1',
					userId: 'test-user',
					contactInfo: {
						fullName: 'John Doe',
						email: 'john@example.com',
						phone: '123-456-7890',
						address: 'New York, NY',
						links: []
					},
					summary: 'Test summary',
					workExperience: [],
					education: [],
					certifications: [],
					skills: []
				})
			});
		});

		await page.goto('/app/resume');

		// Check for aria-busy attribute during loading
		const loadingContainer = page.locator('[aria-busy="true"]').first();
		await expect(loadingContainer).toBeVisible();
		await expect(loadingContainer).toHaveAttribute('aria-label', 'Loading resume data');

		// Wait for content to load
		await page.waitForSelector('h1:has-text("Resume Editor")');

		// Verify aria-busy is removed after loading
		await expect(loadingContainer).not.toBeVisible();
	});

	test('Auth page shows error messages with role="alert"', async ({ page }) => {
		await page.goto('/auth/sign-in');

		// Fill in invalid credentials
		await page.fill('input[type="email"]', 'invalid@example.com');
		await page.fill('input[type="password"]', 'wrongpassword');

		// Mock auth failure
		await page.route('**/auth/sign-in', async (route) => {
			await route.fulfill({
				status: 401,
				contentType: 'application/json',
				body: JSON.stringify({ error: 'Invalid credentials' })
			});
		});

		// Submit the form
		await page.click('button[type="submit"]');

		// Check for error message with alert role
		const errorAlert = page.locator('[role="alert"]');
		await expect(errorAlert).toBeVisible();
		await expect(errorAlert).toHaveAttribute('aria-live', 'assertive');
		await expect(errorAlert).toHaveAttribute('aria-atomic', 'true');

		// Verify error message content
		await expect(errorAlert).toContainText('error');
	});

	test('Resume save button shows aria-busy when saving', async ({ page }) => {
		// Setup authentication
		await page.route('**/auth/session', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					session: { userId: 'test-user' },
					user: { id: 'test-user', email: 'test@example.com', name: 'Test User' }
				})
			});
		});

		// Mock resume data
		await page.route('**/resume', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					id: '1',
					userId: 'test-user',
					contactInfo: {
						fullName: 'John Doe',
						email: 'john@example.com',
						phone: '123-456-7890',
						address: 'New York, NY',
						links: []
					},
					summary: 'Test summary',
					workExperience: [],
					education: [],
					certifications: [],
					skills: []
				})
			});
		});

		await page.goto('/app/resume');
		await page.waitForSelector('h1:has-text("Resume Editor")');

		// Make a change to enable save button
		await page.fill('input#fullName', 'Jane Doe');

		// Mock save endpoint with delay
		await page.route('**/resume/update', async (route) => {
			await page.waitForTimeout(1000); // Simulate save delay
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({ success: true })
			});
		});

		// Click save button
		const saveButton = page.locator('button:has-text("Save Changes")');
		await saveButton.click();

		// Check aria-busy attribute
		await expect(saveButton).toHaveAttribute('aria-busy', 'true');

		// Check for live region announcement
		const liveAnnouncement = page.locator('span[aria-live="assertive"]:has-text("Saving...")');
		await expect(liveAnnouncement).toBeVisible();

		// Wait for save to complete
		await page.waitForTimeout(1500);

		// Verify aria-busy is removed
		await expect(saveButton).toHaveAttribute('aria-busy', 'false');
	});

	test('Dynamic content updates have appropriate aria-live regions', async ({ page }) => {
		// Setup authentication
		await page.route('**/auth/session', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					session: { userId: 'test-user' },
					user: { id: 'test-user', email: 'test@example.com', name: 'Test User' }
				})
			});
		});

		// Mock resume data
		await page.route('**/resume', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					id: '1',
					userId: 'test-user',
					contactInfo: {
						fullName: 'John Doe',
						email: 'john@example.com',
						phone: '123-456-7890',
						address: 'New York, NY',
						links: []
					},
					summary: 'Test summary',
					workExperience: [],
					education: [],
					certifications: [],
					skills: []
				})
			});
		});

		await page.goto('/app/resume');
		await page.waitForSelector('h1:has-text("Resume Editor")');

		// Expand work experience section
		await page.click('text=Work Experience');

		// Click add work experience button
		const addButton = page.locator('button:has-text("Add Work Experience")');
		await expect(addButton).toHaveAttribute('aria-label', 'Add a new work experience entry');

		await addButton.click();

		// Check for aria-busy during addition
		await expect(addButton).toHaveAttribute('aria-busy', 'true');

		// Check for live region announcement
		const addingAnnouncement = page.locator(
			'span[aria-live="polite"]:has-text("Adding work experience...")'
		);
		await expect(addingAnnouncement).toBeVisible();

		// Wait for the operation to complete
		await page.waitForTimeout(200);

		// Verify aria-busy is removed
		await expect(addButton).toHaveAttribute('aria-busy', 'false');
	});

	test('Status messages are announced via screen reader', async ({ page }) => {
		// Setup authentication
		await page.route('**/auth/session', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					session: { userId: 'test-user' },
					user: { id: 'test-user', email: 'test@example.com', name: 'Test User' }
				})
			});
		});

		// Mock resume data
		await page.route('**/resume', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					id: '1',
					userId: 'test-user',
					contactInfo: {
						fullName: 'John Doe',
						email: 'john@example.com',
						phone: '123-456-7890',
						address: 'New York, NY',
						links: []
					},
					summary: 'Test summary',
					workExperience: [],
					education: [],
					certifications: [],
					skills: []
				})
			});
		});

		await page.goto('/app/resume');
		await page.waitForSelector('h1:has-text("Resume Editor")');

		// Make a change and save
		await page.fill('input#fullName', 'Jane Doe');

		// Mock successful save
		await page.route('**/resume/update', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({ success: true })
			});
		});

		// Save and check for status message in live region
		await page.click('button:has-text("Save Changes")');

		// Check for the screen reader announcement div
		const srAnnouncement = page.locator('.sr-only[aria-live="polite"]');
		await expect(srAnnouncement).toContainText('Resume saved successfully');

		// Get live region announcements from our helper
		const announcements = await page.evaluate(() => (window as any).liveRegionAnnouncements);

		// Verify we have announcements
		expect(announcements.length).toBeGreaterThan(0);

		// Check that success message was announced
		const successAnnouncement = announcements.find(
			(a: any) => a.text.includes('Resume saved successfully') || a.text.includes('Saving...')
		);
		expect(successAnnouncement).toBeDefined();
	});
});
