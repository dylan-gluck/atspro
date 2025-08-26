#!/usr/bin/env bun

import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

interface CoverageReport {
	total: {
		lines: { pct: number };
		statements: { pct: number };
		functions: { pct: number };
		branches: { pct: number };
	};
}

async function generateTestSummary() {
	console.log('📊 Test Coverage Summary\n');
	console.log('=' .repeat(50));

	// Check for coverage report
	const coveragePath = path.join(process.cwd(), 'coverage', 'coverage-summary.json');
	
	if (existsSync(coveragePath)) {
		try {
			const coverageData = await readFile(coveragePath, 'utf-8');
			const coverage: CoverageReport = JSON.parse(coverageData);
			
			console.log('\n✅ Unit Test Coverage:\n');
			console.log(`  Lines:      ${coverage.total.lines.pct.toFixed(2)}%`);
			console.log(`  Statements: ${coverage.total.statements.pct.toFixed(2)}%`);
			console.log(`  Functions:  ${coverage.total.functions.pct.toFixed(2)}%`);
			console.log(`  Branches:   ${coverage.total.branches.pct.toFixed(2)}%`);
			
			// Check if coverage meets thresholds
			const threshold = 80;
			const metrics = [
				{ name: 'Lines', value: coverage.total.lines.pct },
				{ name: 'Statements', value: coverage.total.statements.pct },
				{ name: 'Functions', value: coverage.total.functions.pct },
				{ name: 'Branches', value: coverage.total.branches.pct }
			];
			
			const failedMetrics = metrics.filter(m => m.value < threshold);
			
			if (failedMetrics.length > 0) {
				console.log('\n⚠️  Coverage Warnings:');
				failedMetrics.forEach(m => {
					console.log(`  - ${m.name} coverage (${m.value.toFixed(2)}%) is below threshold (${threshold}%)`);
				});
			} else {
				console.log('\n✅ All coverage thresholds met!');
			}
		} catch (error) {
			console.error('Error reading coverage report:', error);
		}
	} else {
		console.log('\n⚠️  No coverage report found. Run `bun run test:coverage` first.');
	}

	// Check for E2E test results
	const e2eResultsPath = path.join(process.cwd(), 'test-results', 'results.json');
	
	if (existsSync(e2eResultsPath)) {
		try {
			const e2eData = await readFile(e2eResultsPath, 'utf-8');
			const e2eResults = JSON.parse(e2eData);
			
			console.log('\n🎭 E2E Test Results:\n');
			console.log(`  Total Tests: ${e2eResults.stats?.total || 0}`);
			console.log(`  Passed:      ${e2eResults.stats?.passed || 0}`);
			console.log(`  Failed:      ${e2eResults.stats?.failed || 0}`);
			console.log(`  Skipped:     ${e2eResults.stats?.skipped || 0}`);
			
			if (e2eResults.stats?.failed > 0) {
				console.log('\n❌ Failed E2E Tests:');
				e2eResults.failures?.forEach((failure: any) => {
					console.log(`  - ${failure.title}`);
				});
			}
		} catch (error) {
			console.log('\n⚠️  No E2E test results found. Run `bun run test:e2e` first.');
		}
	} else {
		console.log('\n⚠️  No E2E test results found. Run `bun run test:e2e` first.');
	}

	console.log('\n' + '=' .repeat(50));
	console.log('\n📝 Test Commands:\n');
	console.log('  bun run test           - Run unit tests');
	console.log('  bun run test:coverage  - Run tests with coverage');
	console.log('  bun run test:watch     - Watch mode for unit tests');
	console.log('  bun run test:e2e       - Run E2E tests');
	console.log('  bun run test:e2e:ui    - Run E2E tests with UI');
	console.log('  bun run test:all       - Run all tests');
	console.log('\n');
}

// Run the summary
generateTestSummary().catch(console.error);