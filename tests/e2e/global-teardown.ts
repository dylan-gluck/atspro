import { DatabaseSeeder } from './utils/db-seeder';
import { TestUserFactory } from './utils/test-user-factory';

export default async function globalTeardown() {
	console.log('🧹 Cleaning up test data...');

	try {
		// Clean factory-created users
		await TestUserFactory.cleanup();

		// Clean general test data
		await DatabaseSeeder.cleanupTestData();

		console.log('✅ Test cleanup completed');
	} catch (error) {
		console.error('⚠️ Cleanup failed:', error);
		// Don't fail tests due to cleanup issues
	}
}
