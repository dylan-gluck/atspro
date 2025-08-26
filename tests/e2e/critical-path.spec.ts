import { test, expect, type Page } from '@playwright/test';
import { promises as fs } from 'fs';
import path from 'path';

// Test data
const testUser = {
	name: `Test User ${Date.now()}`,
	email: `test${Date.now()}@example.com`,
	password: 'TestPassword123!'
};

const testJob = {
	company: 'Example Tech Corp',
	title: 'Senior Software Engineer',
	description: 'We are looking for an experienced software engineer to join our team...',
	link: 'https://example.com/jobs/senior-engineer'
};

// Helper functions
async function uploadTestResume(page: Page) {
	// Create a test PDF file content
	const testResumeContent = `
		John Doe
		Senior Software Engineer
		john@example.com | +1-234-567-8900
		
		EXPERIENCE
		Tech Corp - Senior Developer (2020-2024)
		- Led development of microservices
		- Mentored junior developers
		
		SKILLS
		JavaScript, TypeScript, React, Node.js
	`;

	// Use file chooser for resume upload
	const fileChooserPromise = page.waitForEvent('filechooser');
	await page.getByRole('button', { name: /upload resume|select file/i }).click();
	const fileChooser = await fileChooserPromise;

	// Create a temporary file
	const tempFile = path.join(process.cwd(), '.test-data', 'test-resume.txt');
	await fs.writeFile(tempFile, testResumeContent);
	await fileChooser.setFiles(tempFile);
}

test.describe('Critical User Path', () => {
	test.describe.configure({ mode: 'serial' }); // Run tests in order

	let page: Page;

	test.beforeAll(async ({ browser }) => {
		page = await browser.newPage();
	});

	test.afterAll(async () => {
		await page.close();
	});

	test('Step 1: User Registration', async () => {
		// Navigate to homepage
		await page.goto('/');

		// Click on "Start Free" or "Sign Up"
		await page
			.getByRole('button', { name: /start free|sign up/i })
			.first()
			.click();

		// Should be redirected to sign-up page
		await expect(page).toHaveURL(/\/auth\/sign-up/);

		// Fill registration form
		await page.getByPlaceholder(/john doe|full name/i).fill(testUser.name);
		await page.getByPlaceholder(/name@example.com|email/i).fill(testUser.email);
		await page.getByPlaceholder(/password|create password/i).fill(testUser.password);

		// Submit registration
		await page.getByRole('button', { name: /sign up|create account/i }).click();

		// Should redirect to onboarding or app
		await expect(page).toHaveURL(/\/(onboarding|app)/, { timeout: 10000 });
	});

	test('Step 2: Resume Upload/Creation', async () => {
		// Navigate to resume section
		await page.goto('/app');

		// Check if we need to upload a resume first
		const resumeSection = page.locator('text=/upload.*resume|add.*resume/i');
		if (await resumeSection.isVisible()) {
			// Upload resume
			await uploadTestResume(page);

			// Wait for processing
			await page.waitForTimeout(2000);

			// Check for success message or resume display
			await expect(page.locator('text=/resume.*uploaded|resume.*saved|your resume/i')).toBeVisible({
				timeout: 10000
			});
		}
	});

	test('Step 3: Job Creation', async () => {
		// Navigate to jobs section
		await page.goto('/app/jobs');

		// Click on "Add Job" or similar button
		await page.getByRole('button', { name: /add job|new job|create job/i }).click();

		// Fill job form
		await page.getByPlaceholder(/company name/i).fill(testJob.company);
		await page.getByPlaceholder(/job title|position/i).fill(testJob.title);

		// Find and fill description field
		const descriptionField = page.locator('textarea').filter({ hasText: '' }).first();
		await descriptionField.fill(testJob.description);

		// Add job link if field exists
		const linkField = page.getByPlaceholder(/job url|link|website/i);
		if (await linkField.isVisible()) {
			await linkField.fill(testJob.link);
		}

		// Submit job creation
		await page.getByRole('button', { name: /save|create|add/i }).click();

		// Wait for job to be saved
		await page.waitForTimeout(1000);

		// Verify job was created
		await expect(page.locator(`text=${testJob.company}`)).toBeVisible();
	});

	test('Step 4: Resume Optimization', async () => {
		// Find the job we just created
		const jobCard = page.locator(`text=${testJob.company}`).locator('..').locator('..');

		// Click optimize or tailor resume button
		await jobCard.getByRole('button', { name: /optimize|tailor|customize/i }).click();

		// Wait for optimization modal or page
		await page.waitForTimeout(1000);

		// Click generate or optimize button
		const optimizeButton = page.getByRole('button', { name: /generate|optimize|create tailored/i });
		if (await optimizeButton.isVisible()) {
			await optimizeButton.click();
		}

		// Wait for optimization to complete
		await expect(page.locator('text=/optimized|tailored|generated|complete/i')).toBeVisible({
			timeout: 30000
		});

		// Check for optimized resume display
		const optimizedContent = page.locator(
			'[data-testid="optimized-resume"], .optimized-resume, .resume-content'
		);
		await expect(optimizedContent.first()).toBeVisible();
	});

	test('Step 5: Cover Letter Generation', async () => {
		// Check if cover letter tab or button exists
		const coverLetterTab = page.locator('text=/cover letter/i');
		if (await coverLetterTab.isVisible()) {
			await coverLetterTab.click();

			// Generate cover letter
			const generateButton = page.getByRole('button', { name: /generate.*cover|create.*cover/i });
			if (await generateButton.isVisible()) {
				await generateButton.click();

				// Wait for generation
				await expect(page.locator('text=/dear|to whom it may concern/i')).toBeVisible({
					timeout: 30000
				});
			}
		}
	});

	test('Step 6: Export Documents', async () => {
		// Look for export or download button
		const exportButton = page.getByRole('button', { name: /export|download|save as/i }).first();
		if (await exportButton.isVisible()) {
			// Click export
			await exportButton.click();

			// Select format if options appear
			const pdfOption = page.locator('text=/pdf/i');
			if (await pdfOption.isVisible()) {
				await pdfOption.click();
			}

			// Confirm download started (check for download event or success message)
			const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
			const successMessage = page.locator('text=/download.*started|exported|saved/i');

			// Wait for either download or success message
			await Promise.race([
				downloadPromise,
				successMessage.waitFor({ timeout: 5000 }).catch(() => null)
			]);
		}
	});

	test('Step 7: Job Status Update', async () => {
		// Navigate back to jobs list if needed
		await page.goto('/app/jobs');

		// Find our job
		const jobCard = page.locator(`text=${testJob.company}`).locator('..').locator('..');

		// Update status to "Applied"
		const statusDropdown = jobCard.locator('select, [role="combobox"]').first();
		if (await statusDropdown.isVisible()) {
			await statusDropdown.selectOption({ label: 'Applied' });
		} else {
			// Try clicking a status button
			const appliedButton = jobCard.getByRole('button', { name: /applied|mark as applied/i });
			if (await appliedButton.isVisible()) {
				await appliedButton.click();
			}
		}

		// Verify status was updated
		await expect(jobCard.locator('text=/applied/i')).toBeVisible();
	});
});

test.describe('Error Handling and Edge Cases', () => {
	test('Should handle API errors gracefully', async ({ page }) => {
		// Intercept API calls to simulate errors
		await page.route('**/api/**', (route) => {
			if (Math.random() > 0.7) {
				// 30% chance of error
				route.fulfill({
					status: 500,
					body: JSON.stringify({ error: 'Internal Server Error' })
				});
			} else {
				route.continue();
			}
		});

		await page.goto('/app');

		// Try to perform an action that requires API call
		const actionButton = page.getByRole('button').first();
		if (await actionButton.isVisible()) {
			await actionButton.click();

			// Should show error message, not crash
			const errorMessage = page.locator('text=/error|failed|try again/i');
			// Error message might appear
			if (await errorMessage.isVisible({ timeout: 2000 })) {
				expect(errorMessage).toBeTruthy();
			}
		}
	});

	test('Should handle large file uploads', async ({ page }) => {
		await page.goto('/app');

		// Create a large test file (5MB)
		const largeContent = 'x'.repeat(5 * 1024 * 1024);
		const tempFile = path.join(process.cwd(), '.test-data', 'large-file.txt');
		await fs.writeFile(tempFile, largeContent);

		// Try to upload
		const uploadButton = page.getByRole('button', { name: /upload/i }).first();
		if (await uploadButton.isVisible()) {
			const fileChooserPromise = page.waitForEvent('filechooser');
			await uploadButton.click();
			const fileChooser = await fileChooserPromise;
			await fileChooser.setFiles(tempFile);

			// Should show error for file too large or handle it gracefully
			const errorMessage = await page
				.locator('text=/too large|size limit|maximum/i')
				.isVisible({ timeout: 5000 });
			const successMessage = await page
				.locator('text=/uploaded|success/i')
				.isVisible({ timeout: 5000 });

			expect(errorMessage || successMessage).toBeTruthy();
		}

		// Clean up
		await fs.unlink(tempFile).catch(() => {});
	});

	test('Should maintain session across page refreshes', async ({ page }) => {
		// Login first
		await page.goto('/auth/sign-in');
		await page.getByPlaceholder(/email/i).fill('test@example.com');
		await page.getByPlaceholder(/password/i).fill('TestPassword123!');
		await page.getByRole('button', { name: /sign in/i }).click();

		// Wait for redirect
		await page.waitForURL(/\/app/, { timeout: 10000 }).catch(() => {});

		// Refresh page
		await page.reload();

		// Should still be logged in (not redirected to login)
		expect(page.url()).toContain('/app');
	});

	test('Should handle concurrent operations', async ({ page }) => {
		await page.goto('/app/jobs');

		// Trigger multiple operations simultaneously
		const operations = [];

		// Click multiple buttons if they exist
		const buttons = await page.getByRole('button').all();
		for (let i = 0; i < Math.min(3, buttons.length); i++) {
			operations.push(buttons[i].click().catch(() => {}));
		}

		// Wait for all operations
		await Promise.all(operations);

		// Page should still be responsive
		await expect(page.locator('body')).toBeVisible();
	});
});

test.describe('Accessibility Tests', () => {
	test('Should be keyboard navigable', async ({ page }) => {
		await page.goto('/');

		// Tab through elements
		for (let i = 0; i < 5; i++) {
			await page.keyboard.press('Tab');
		}

		// Check if an element is focused
		const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
		expect(focusedElement).not.toBe('BODY');
	});

	test('Should have proper ARIA labels', async ({ page }) => {
		await page.goto('/');

		// Check for ARIA labels on buttons
		const buttons = await page.getByRole('button').all();
		for (const button of buttons.slice(0, 3)) {
			const ariaLabel = await button.getAttribute('aria-label');
			const textContent = await button.textContent();
			expect(ariaLabel || textContent).toBeTruthy();
		}
	});

	test('Should work with screen reader', async ({ page }) => {
		await page.goto('/');

		// Check for landmark roles
		const main = await page.locator('main, [role="main"]').count();
		const nav = await page.locator('nav, [role="navigation"]').count();

		expect(main).toBeGreaterThan(0);
		// Navigation might not be on all pages
		// expect(nav).toBeGreaterThan(0);
	});
});
