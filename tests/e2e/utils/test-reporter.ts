import type { Reporter, TestCase, TestResult } from '@playwright/test/reporter';
import { writeFileSync, mkdirSync } from 'fs';
import path from 'path';

class AuthenticationReporter implements Reporter {
	private authFailures: Map<string, number> = new Map();
	private testDurations: Map<string, number[]> = new Map();
	private skipReasons: Map<string, string[]> = new Map();

	onTestEnd(test: TestCase, result: TestResult) {
		// Track auth-related skips
		if (result.status === 'skipped') {
			const skipAnnotation = result.annotations?.find((a) => a.type === 'skip');
			const reason = skipAnnotation?.description || 'Unknown reason';

			if (reason.toLowerCase().includes('auth')) {
				const count = this.authFailures.get(test.title) || 0;
				this.authFailures.set(test.title, count + 1);

				// Track skip reasons
				if (!this.skipReasons.has(test.title)) {
					this.skipReasons.set(test.title, []);
				}
				this.skipReasons.get(test.title)!.push(reason);
			}
		}

		// Track test durations
		if (!this.testDurations.has(test.title)) {
			this.testDurations.set(test.title, []);
		}
		this.testDurations.get(test.title)!.push(result.duration);
	}

	onEnd() {
		// Generate report
		const report = {
			timestamp: new Date().toISOString(),
			authFailures: Object.fromEntries(this.authFailures),
			skipReasons: Object.fromEntries(this.skipReasons),
			averageDurations: Object.fromEntries(
				Array.from(this.testDurations.entries()).map(([name, durations]) => [
					name,
					durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0
				])
			),
			totalTests: this.testDurations.size,
			authFailureRate:
				this.testDurations.size > 0 ? (this.authFailures.size / this.testDurations.size) * 100 : 0,
			stats: {
				totalSkipped: this.authFailures.size,
				averageTestDuration: this.calculateAverageDuration(),
				slowestTests: this.getSlowestTests(5)
			}
		};

		// Ensure test-results directory exists
		const resultsDir = path.join(process.cwd(), 'test-results');
		try {
			mkdirSync(resultsDir, { recursive: true });
		} catch (error) {
			// Directory might already exist
		}

		// Write report
		const reportPath = path.join(resultsDir, 'auth-report.json');
		writeFileSync(reportPath, JSON.stringify(report, null, 2));

		// Console summary
		if (this.authFailures.size > 0) {
			console.log(`\n⚠️ Authentication issues detected in ${this.authFailures.size} tests`);
			console.log(`   Auth failure rate: ${report.authFailureRate.toFixed(1)}%`);
			console.log(`   See ${reportPath} for details`);
		} else {
			console.log('\n✅ No authentication issues detected');
		}

		// Report slow tests
		if (report.stats.slowestTests.length > 0) {
			console.log('\n⏱️ Slowest tests:');
			report.stats.slowestTests.forEach(({ name, duration }) => {
				console.log(`   ${name}: ${(duration / 1000).toFixed(2)}s`);
			});
		}
	}

	private calculateAverageDuration(): number {
		let totalDuration = 0;
		let totalCount = 0;

		for (const durations of this.testDurations.values()) {
			for (const duration of durations) {
				totalDuration += duration;
				totalCount++;
			}
		}

		return totalCount > 0 ? totalDuration / totalCount : 0;
	}

	private getSlowestTests(count: number): Array<{ name: string; duration: number }> {
		const testAverages: Array<{ name: string; duration: number }> = [];

		for (const [name, durations] of this.testDurations.entries()) {
			if (durations.length > 0) {
				const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
				testAverages.push({ name, duration: avgDuration });
			}
		}

		return testAverages.sort((a, b) => b.duration - a.duration).slice(0, count);
	}
}

export default AuthenticationReporter;
