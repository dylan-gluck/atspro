# Test Data Files

This directory contains test data files used by E2E tests, particularly for testing the subscription tier system.

## Files

### `user-data.json`

Main test user data with subscription information for the default test user (John Doe).

**Structure:**

- Base user information (name, email, password, etc.)
- Default subscription tier (`candidate`)
- Current usage statistics
- Test scenarios for all three tiers

### `subscription-test-users.json`

Specialized test users for comprehensive subscription tier testing.

**Contains:**

- `applicant_user`: Basic tier user with job limit only
- `candidate_user`: Mid-tier user with monthly credits
- `candidate_user_maxed_out`: Candidate tier user who has used all credits
- `executive_user`: Top-tier user with unlimited access

### `tier-configuration.json`

Complete configuration reference for the subscription tier system.

**Includes:**

- Tier migration mapping (old → new system)
- Complete tier definitions with limits and features
- Usage tracking configuration
- Rate limiting test scenarios

### Other Files

- `resume.txt`, `resume.pdf`: Sample resume data
- `resume-detailed.txt`, `resume.md`: Additional resume formats
- `job_openai.md`: Sample job description
- `user-story.md`: User story documentation

## Subscription Tier System

### Tier Structure (New System)

| Tier      | Price | Optimizations | ATS Reports | Active Jobs |
| --------- | ----- | ------------- | ----------- | ----------- |
| Applicant | Free  | 0             | 0           | 10          |
| Candidate | $20   | 50/month      | 50/month    | Unlimited   |
| Executive | $50   | Unlimited     | Unlimited   | Unlimited   |

### Migration from Old System

| Old Tier     | New Tier  |
| ------------ | --------- |
| free         | applicant |
| professional | candidate |
| premium      | executive |

## Usage in Tests

### Playwright E2E Tests

```javascript
// Load main test user
const testUser = JSON.parse(await fs.readFile('.test-data/user-data.json', 'utf8'));

// Load specialized subscription users
const subscriptionUsers = JSON.parse(
	await fs.readFile('.test-data/subscription-test-users.json', 'utf8')
);

// Access specific tier configurations
const tierConfig = JSON.parse(await fs.readFile('.test-data/tier-configuration.json', 'utf8'));
```

### Test Scenarios Supported

1. **Rate Limiting Tests**: Verify that users hit appropriate limits
2. **Subscription Badge Tests**: Ensure UI displays correct tier information
3. **Feature Access Tests**: Confirm tier-based feature restrictions
4. **Usage Tracking Tests**: Validate usage counter updates
5. **Upgrade Flow Tests**: Test tier change functionality

## Maintenance

When updating the subscription system:

1. Update tier limits in `tier-configuration.json`
2. Adjust test user data in `subscription-test-users.json`
3. Update usage examples in `user-data.json`
4. Run E2E tests to verify changes

## JSON Validation

All JSON files should be validated before committing:

```bash
cat .test-data/*.json | jq . > /dev/null
```
