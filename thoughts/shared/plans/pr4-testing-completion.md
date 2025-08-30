# PR #4 Testing Completion Implementation Plan

## Overview

Complete all remaining testing requirements for PR #4 "Feat: Updates Pricing Strategy" by fixing unit test infrastructure, resolving E2E test environment issues, and conducting comprehensive manual testing of the subscription tier system.

## Current State Analysis

The PR has implemented a comprehensive subscription tier system but has three categories of testing issues:

1. **Unit Tests**: 11 tests skipped due to previous `$app/server` resolution issues (now resolved)
2. **E2E Tests**: Subscription tests failing because debug controls aren't visible (`import.meta.env.DEV` evaluates to false)
3. **Manual Testing**: Not yet completed for the new subscription features

## Desired End State

All tests passing with full coverage of the subscription tier system:

- Unit tests: 57/57 passing (0 skipped)
- E2E tests: All subscription tests passing with proper tier control
- Manual testing: Complete verification of all subscription features documented

### Key Discoveries:

- `$app/server` mock is properly implemented in `vitest-setup.ts:42-67`
- Tests are skipped with `describe.skip` at `src/lib/services/__tests__/resume.remote.test.ts:43`
- Debug controls require `import.meta.env.DEV === true` at `src/routes/(app)/app/settings/+page.svelte:402`
- `setUserTier` function fails silently at `tests/e2e/subscription.spec.ts:86`

## What We're NOT Doing

- Refactoring the entire test infrastructure
- Changing the subscription tier implementation
- Modifying production code beyond what's necessary for testing
- Creating new test frameworks or runners

## Implementation Approach

Fix tests in order of dependency: unit tests first (quick wins), then E2E environment issues, finally manual testing documentation.

## Phase 1: Re-enable Skipped Unit Tests

### Overview

Remove `describe.skip` from remote function tests now that `$app/server` mocking is properly configured.

### Changes Required:

#### 1. Resume Remote Tests

**File**: `src/lib/services/__tests__/resume.remote.test.ts`
**Changes**: Replace `describe.skip` with `describe`

```typescript
// Line 43 - Change from:
describe.skip('Resume Remote Functions', () => {
// To:
describe('Resume Remote Functions', () => {
```

#### 2. Job Remote Tests

**File**: `src/lib/services/__tests__/job.remote.test.ts`
**Changes**: Replace `describe.skip` with `describe`

```typescript
// Line 51 - Change from:
describe.skip('Job Remote Functions', () => {
// To:
describe('Job Remote Functions', () => {
```

### Success Criteria:

#### Automated Verification:

- [ ] Unit tests run without module resolution errors: `bun test`
- [ ] All 57 tests pass: `bun test --no-coverage`
- [ ] No tests are skipped in output
- [ ] Test coverage report generates successfully

#### Manual Verification:

- [ ] Verify mock functions are called correctly in test output
- [ ] Check that remote function wrappers work as expected

---

## Phase 2: Fix E2E Debug Controls Visibility

### Overview

Ensure debug controls are visible during E2E test execution by properly exposing development environment to the test browser context.

### Changes Required:

#### 1. Add Test-Specific Debug Control Visibility

**File**: `src/routes/(app)/app/settings/+page.svelte`
**Changes**: Add alternative condition for test environment

```svelte
<!-- Line 402 - Change from: -->
{#if import.meta.env.DEV}
<!-- To: -->
{#if import.meta.env.DEV || window.location.hostname === 'localhost'}
```

#### 2. Improve setUserTier Error Handling

**File**: `tests/e2e/subscription.spec.ts`
**Changes**: Make function throw error when controls not found

```typescript
// Line 78-88 - Replace with:
const tierSelect = page.locator('[data-testid="tier-select"]');
if (await tierSelect.isVisible()) {
	await tierSelect.click();
	await page.getByRole('option', { name: new RegExp(tier, 'i') }).click();
	await page.waitForTimeout(2000);
} else {
	// Throw error instead of silent failure
	throw new Error(
		`Debug tier controls not visible - cannot set tier to ${tier}. Ensure dev server is running.`
	);
}
```

#### 3. Add Playwright Environment Configuration

**File**: `playwright.config.ts`
**Changes**: Add environment variables to test context

```typescript
// Add to use configuration (around line 17):
use: {
    baseURL: 'http://localhost:5173',
    // ... existing config ...

    // Add environment context
    contextOptions: {
        // Ensure dev environment is recognized
        userAgent: 'Playwright E2E Tests (Development)',
    }
}
```

### Success Criteria:

#### Automated Verification:

- [ ] Debug controls visible in test execution: `bun run test:e2e -- --grep "debug controls"`
- [ ] setUserTier successfully changes tiers: `bun run test:e2e -- --grep "setUserTier"`
- [ ] All subscription tests pass: `bun run test:e2e -- --grep "Subscription"`
- [ ] No "debug controls not visible" errors in test output

#### Manual Verification:

- [ ] Manually verify debug controls appear when accessing localhost:5173/app/settings
- [ ] Confirm tier changes persist across page navigation
- [ ] Verify usage counters update correctly

---

## Phase 3: Comprehensive Manual Testing

### Overview

Document and execute manual testing for all subscription features to ensure production readiness.

### Testing Checklist:

#### 1. Tier Migration Testing

**Steps**:

1. Create users with old tier names (FREE, PROFESSIONAL, PREMIUM)
2. Run migration 006: `bun run migrate`
3. Verify users migrated to new tiers (APPLICANT, CANDIDATE, EXECUTIVE)

**Expected Results**:

- [ ] FREE → APPLICANT
- [ ] PROFESSIONAL → CANDIDATE
- [ ] PREMIUM → EXECUTIVE
- [ ] Usage counters reset to 0

#### 2. Rate Limiting Testing

**Applicant Tier**:

- [ ] Cannot create more than 10 jobs
- [ ] Cannot perform resume optimization (0 limit)
- [ ] Cannot generate ATS reports (0 limit)
- [ ] Shows upgrade prompt when limits hit

**Candidate Tier**:

- [ ] Can create unlimited jobs
- [ ] Can perform up to 50 optimizations/month
- [ ] Can generate up to 50 ATS reports/month
- [ ] Shows remaining credits in header badge

**Executive Tier**:

- [ ] Unlimited access to all features
- [ ] No usage counters shown
- [ ] No upgrade prompts

#### 3. UI/UX Testing

- [ ] Subscription badge appears in header for all tiers
- [ ] Badge shows correct tier name and color
- [ ] Usage counters update in real-time
- [ ] Settings billing tab displays current plan
- [ ] Debug controls work in development mode
- [ ] Upgrade button navigates to pricing page
- [ ] Error toasts show when limits exceeded

#### 4. Remote Function Testing

**Test Remote Functions via Browser Console**:

```javascript
// Import and test remote functions from the browser console
// Navigate to http://localhost:5173/app/settings and open console

// Test getSubscription query
await import('/src/lib/services/subscription.remote.js').then((m) => m.getSubscription());

// Test updateSubscriptionDebug form (dev only)
const formData = new FormData();
formData.append('action', 'reset_usage');
await fetch('?/updateSubscriptionDebug', { method: 'POST', body: formData });

// Test trackUsage command
await import('/src/lib/services/subscription.remote.js').then((m) => m.trackUsage('optimization'));
```

**Expected Behaviors**:

- [ ] getSubscription returns current user subscription data
- [ ] updateSubscriptionDebug resets usage counters (dev mode only)
- [ ] trackUsage increments the appropriate usage counter
- [ ] Rate limiting enforced when limits exceeded

#### 5. Monthly Reset Testing

- [ ] Set system date to month boundary
- [ ] Verify usage counters reset at midnight on 1st
- [ ] Confirm reset date updates correctly
- [ ] Check that historical usage is preserved

### Success Criteria:

#### Automated Verification:

- [ ] All manual test scenarios documented
- [ ] Test data properly seeded: `bun run seed:test`
- [ ] No console errors during testing
- [ ] Performance metrics acceptable (< 200ms response times)

#### Manual Verification:

- [ ] All tier features work as specified
- [ ] Rate limiting properly enforced
- [ ] UI displays correct information
- [ ] No regressions in existing features

---

## Testing Strategy

### Unit Tests:

- Test remote function wrappers with mocked `$app/server`
- Verify subscription service business logic
- Test rate limiting calculations
- Validate tier migration logic

### Integration Tests:

- Test subscription remote functions
- Verify database operations
- Test authentication integration
- Validate usage tracking

### Manual Testing Steps:

1. Start dev server: `bun run dev`
2. Run migrations: `bun run migrate`
3. Seed test data: `bun run seed:test`
4. Execute manual test checklist above
5. Document any issues found

## Performance Considerations

- Subscription checks should be cached per request
- Usage tracking should be asynchronous
- Database queries should use appropriate indexes
- Header badge updates should not block UI

## Migration Notes

- Existing users will be automatically migrated via migration 006
- Usage counters will be reset during migration
- Historical subscription data will be preserved
- Rollback script available if issues occur

## References

- Original PR: `https://github.com/dylan-gluck/atspro/pull/4`
- PR Description: `thoughts/shared/prs/4_description.md`
- Subscription Implementation: `src/lib/services/subscription.ts:1-200`
- Test Infrastructure: `vitest-setup.ts:42-67`
- E2E Test Suite: `tests/e2e/subscription.spec.ts:1-938`
