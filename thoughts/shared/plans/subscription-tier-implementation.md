# Subscription Tier Implementation Plan

## Overview

Implement the new subscription tier system (Applicant/Candidate/Executive) with updated pricing, rate limiting, and UI components to monetize ATSPro effectively while providing clear value at each tier level.

## Current State Analysis

The codebase has a solid foundation with existing database migrations, rate limiting infrastructure, and Better-Auth integration. However, the current implementation uses different tier names (FREE/PROFESSIONAL/PREMIUM) and pricing ($0/$19/$39) than specified in the requirements. Rate limiting is currently disabled across most remote functions pending pricing finalization.

### Key Discoveries:

- Existing database migration with subscription fields at `migrations/004_add_subscription_tiers.sql`
- Complete rate limiting service at `src/lib/services/rate-limit.ts:23-53`
- Settings page with billing tab placeholder at `src/routes/(app)/app/settings/+page.svelte:330-354`
- No Polar.sh integration currently exists
- Rate limiting commented out in remote functions pending pricing strategy

## Desired End State

A fully functional subscription system with three tiers (Applicant/Candidate/Executive) that:

- Enforces usage limits based on subscription tier
- Displays remaining credits in the header
- Provides manual debugging controls in settings
- Shows appropriate upgrade prompts when limits are reached
- Integrates with future Polar.sh webhooks for payment processing

### Verification:

- All features properly gated by subscription tier
- Credits counter accurately reflects usage
- Rate limiting prevents overuse
- Upgrade flows work seamlessly
- Tests pass for all subscription scenarios

## What We're NOT Doing

- Polar.sh webhook integration (future implementation)
- Actual payment processing
- Automated billing/invoicing
- Email notifications for subscription events
- Complex proration logic for tier changes
- Annual subscription handling (MVP focuses on monthly)

## Implementation Approach

Update the existing infrastructure to match the new tier structure while preserving the solid foundation already in place. Focus on reusing existing patterns and components rather than building from scratch.

## Phase 1: Database & Model Updates

### Overview

Update the database schema and model definitions to support the new tier structure and usage tracking requirements.

### Changes Required:

#### 1. Database Migration

**File**: `migrations/006_update_subscription_tiers.sql`
**Changes**: Create migration to update tier names and add usage tracking fields

```sql
-- Update existing tier values
UPDATE "user"
SET subscription_tier = CASE
    WHEN subscription_tier = 'free' THEN 'applicant'
    WHEN subscription_tier = 'professional' THEN 'candidate'
    WHEN subscription_tier = 'premium' THEN 'executive'
    ELSE subscription_tier
END;

-- Update the check constraint
ALTER TABLE "user"
DROP CONSTRAINT IF EXISTS user_subscription_tier_check;

ALTER TABLE "user"
ADD CONSTRAINT user_subscription_tier_check
CHECK (subscription_tier IN ('applicant', 'candidate', 'executive'));

-- Add usage tracking columns
ALTER TABLE "user"
ADD COLUMN IF NOT EXISTS monthly_optimizations_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS monthly_ats_reports_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS active_job_applications INTEGER DEFAULT 0;

-- Create usage tracking table for detailed history
CREATE TABLE IF NOT EXISTS subscription_usage (
    id TEXT PRIMARY KEY DEFAULT ('su_' || substr(md5(random()::text || clock_timestamp()::text), 1, 16)),
    user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    feature TEXT NOT NULL,
    used_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_subscription_usage_user_feature ON subscription_usage(user_id, feature);
CREATE INDEX IF NOT EXISTS idx_subscription_usage_used_at ON subscription_usage(used_at);
```

#### 2. Rate Limit Service Updates

**File**: `src/lib/services/rate-limit.ts`
**Changes**: Update tier enums and limits

```typescript
export enum SubscriptionTier {
	APPLICANT = 'applicant',
	CANDIDATE = 'candidate',
	EXECUTIVE = 'executive'
}

export const RATE_LIMITS: Record<string, TierLimits> = {
	'resume.optimize': {
		[SubscriptionTier.APPLICANT]: { windowMs: 2592000000, maxRequests: 0 }, // 0 per month
		[SubscriptionTier.CANDIDATE]: { windowMs: 2592000000, maxRequests: 50 }, // 50 per month
		[SubscriptionTier.EXECUTIVE]: { windowMs: 2592000000, maxRequests: 999999 } // Unlimited
	},
	'ats.report': {
		[SubscriptionTier.APPLICANT]: { windowMs: 2592000000, maxRequests: 0 }, // 0 per month
		[SubscriptionTier.CANDIDATE]: { windowMs: 2592000000, maxRequests: 50 }, // 50 per month
		[SubscriptionTier.EXECUTIVE]: { windowMs: 2592000000, maxRequests: 999999 } // Unlimited
	},
	'job.applications': {
		[SubscriptionTier.APPLICANT]: { windowMs: 999999999999, maxRequests: 10 }, // 10 active
		[SubscriptionTier.CANDIDATE]: { windowMs: 999999999999, maxRequests: 999999 }, // Unlimited
		[SubscriptionTier.EXECUTIVE]: { windowMs: 999999999999, maxRequests: 999999 } // Unlimited
	}
	// ... other limits
};
```

### Success Criteria:

#### Automated Verification:

- [ ] Migration applies cleanly: `bun run migrate`
- [ ] Type checking passes: `bun run check`
- [ ] Database schema matches new structure

#### Manual Verification:

- [ ] Existing user data migrated correctly
- [ ] New tier constraints enforced
- [ ] Usage tracking fields populated

---

## Phase 2: Subscription Service Implementation

### Overview

Create the subscription service for managing tier information and usage tracking.

### Changes Required:

#### 1. Subscription Remote Service

**File**: `src/lib/services/subscription.remote.ts`
**Changes**: Create new service for subscription management

```typescript
import { query, command } from '$app/server';
import { db } from '$lib/db';
import { requireAuth } from './utils';
import * as v from 'valibot';

// Get subscription info with usage
export const getSubscriptionInfo = query(async () => {
	const userId = requireAuth();
	const user = await db.getUser(userId);

	return {
		tier: user.subscription_tier || 'applicant',
		expiresAt: user.subscription_expires_at,
		usage: {
			optimizations: {
				used: user.monthly_optimizations_used || 0,
				limit: getOptimizationLimit(user.subscription_tier)
			},
			atsReports: {
				used: user.monthly_ats_reports_used || 0,
				limit: getAtsReportLimit(user.subscription_tier)
			},
			activeJobs: {
				used: user.active_job_applications || 0,
				limit: getJobLimit(user.subscription_tier)
			}
		},
		resetAt: user.monthly_credits_reset_at
	};
});

// Debug controls for testing
const updateSubscriptionSchema = v.object({
	tier: v.picklist(['applicant', 'candidate', 'executive']),
	resetUsage: v.optional(v.boolean()),
	maxOutUsage: v.optional(v.boolean())
});

export const updateSubscriptionDebug = command(updateSubscriptionSchema, async (params) => {
	const userId = requireAuth();

	if (params.tier) {
		await db.updateUser(userId, { subscription_tier: params.tier });
	}

	if (params.resetUsage) {
		await db.updateUser(userId, {
			monthly_optimizations_used: 0,
			monthly_ats_reports_used: 0,
			monthly_credits_reset_at: new Date()
		});
	}

	if (params.maxOutUsage) {
		const tier = params.tier || 'applicant';
		await db.updateUser(userId, {
			monthly_optimizations_used: getOptimizationLimit(tier),
			monthly_ats_reports_used: getAtsReportLimit(tier)
		});
	}

	await getSubscriptionInfo().refresh();
	return { success: true };
});

// Track feature usage
export const trackUsage = command(v.object({ feature: v.string() }), async ({ feature }) => {
	const userId = requireAuth();

	// Record in usage history
	await db.createUsageRecord(userId, feature);

	// Update counters
	if (feature === 'optimization') {
		await db.incrementOptimizationUsage(userId);
	} else if (feature === 'ats_report') {
		await db.incrementAtsReportUsage(userId);
	}

	await getSubscriptionInfo().refresh();
	return { success: true };
});
```

#### 2. Rate Limit Integration

**File**: `src/lib/services/utils.ts`
**Changes**: Update checkRateLimitV2 to use new subscription service

```typescript
export async function checkRateLimitV2(endpoint: string, customMessage?: string): Promise<void> {
	const event = getRequestEvent();
	const session = await auth.api.getSession({
		headers: event.request.headers
	});

	// Check subscription-based limits for specific features
	if (endpoint === 'resume.optimize' || endpoint === 'ats.report') {
		const subscription = await getSubscriptionInfo();
		const feature = endpoint === 'resume.optimize' ? 'optimizations' : 'atsReports';

		if (subscription.usage[feature].used >= subscription.usage[feature].limit) {
			throw error(
				429,
				customMessage || `Monthly ${feature} limit reached. Please upgrade to continue.`
			);
		}

		// Track usage
		await trackUsage({ feature: endpoint.replace('.', '_') });
	}

	// Standard rate limiting for other endpoints
	const result = await checkRateLimit(session, endpoint);
	if (!result.allowed) {
		throw error(429, customMessage || result.message);
	}
}
```

### Success Criteria:

#### Automated Verification:

- [ ] Unit tests pass: `bun run test src/lib/services/__tests__/subscription.test.ts`
- [ ] Type checking passes: `bun run check`
- [ ] Remote functions accessible: `bun run dev`

#### Manual Verification:

- [ ] Subscription info loads correctly
- [ ] Usage tracking increments properly
- [ ] Debug controls work in settings
- [ ] Rate limits enforce correctly

---

## Phase 3: UI Component Updates

### Overview

Add subscription badge, credits counter, and management UI to the application.

### Changes Required:

#### 1. Subscription Badge Component

**File**: `src/lib/components/subscription/subscription-badge.svelte`
**Changes**: Create badge component for displaying tier and credits

```svelte
<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { getSubscriptionInfo } from '$lib/services/subscription.remote';
	import { FileText, ChartBar } from 'lucide-svelte';

	let subscriptionQuery = getSubscriptionInfo();
	let subscription = $derived(subscriptionQuery.current);

	let tierLabel = $derived(
		subscription?.tier === 'executive'
			? 'Executive'
			: subscription?.tier === 'candidate'
				? 'Candidate'
				: 'Applicant'
	);

	let tierVariant = $derived(
		subscription?.tier === 'executive'
			? 'default'
			: subscription?.tier === 'candidate'
				? 'secondary'
				: 'outline'
	);

	let showCredits = $derived(
		subscription?.tier === 'candidate' || subscription?.tier === 'applicant'
	);
</script>

{#if subscription}
	<div class="flex items-center gap-2">
		<Badge variant={tierVariant} class="text-xs">
			{tierLabel}
		</Badge>

		{#if showCredits && subscription.tier === 'candidate'}
			<div class="bg-accent flex items-center gap-3 rounded-md px-2 py-1 text-xs">
				<span class="flex items-center gap-1">
					<FileText class="h-3 w-3" />
					{subscription.usage.optimizations.limit - subscription.usage.optimizations.used}
				</span>
				<span class="flex items-center gap-1">
					<ChartBar class="h-3 w-3" />
					{subscription.usage.atsReports.limit - subscription.usage.atsReports.used}
				</span>
			</div>
		{:else if showCredits && subscription.tier === 'applicant'}
			<div class="bg-accent flex items-center gap-1 rounded-md px-2 py-1 text-xs">
				<Briefcase class="h-3 w-3" />
				{10 - subscription.usage.activeJobs.used}/10 jobs
			</div>
		{/if}
	</div>
{/if}
```

#### 2. App Layout Integration

**File**: `src/routes/(app)/app/+layout.svelte`
**Changes**: Add subscription badge to header

```svelte
// Add import at top import SubscriptionBadge from
'$lib/components/subscription/subscription-badge.svelte'; // Update header section (around line 162)
<div class="flex items-center gap-2">
	<!-- Subscription Badge -->
	<SubscriptionBadge />

	<!-- Light/Dark Mode Toggle -->
	<ModeToggle />

	<!-- Notifications -->
	<Button variant="ghost" size="icon" class="relative">// ... existing notification button</Button>
</div>
```

#### 3. Settings Page Subscription Tab

**File**: `src/routes/(app)/app/settings/+page.svelte`
**Changes**: Update billing tab with subscription management

```svelte
// Add import import {(getSubscriptionInfo, updateSubscriptionDebug)} from '$lib/services/subscription.remote';
// Add subscription query let subscriptionQuery = getSubscriptionInfo(); let subscription = $derived(subscriptionQuery.current);
// Update billing tab content (line 330+)
<Tabs.Content value="billing" class="mt-6 space-y-4">
	<Card.Root>
		<Card.Header>
			<Card.Title>Subscription & Usage</Card.Title>
			<Card.Description>Manage your subscription and track usage</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-6">
			{#if subscription}
				<!-- Current Plan -->
				<div class="bg-muted/50 rounded-lg p-4">
					<h3 class="mb-2 font-semibold">Current Plan: {subscription.tier}</h3>

					{#if subscription.tier === 'applicant'}
						<p class="text-muted-foreground">Free Plan</p>
						<ul class="text-muted-foreground mt-3 space-y-2 text-sm">
							<li>✅ Resume Editor</li>
							<li>
								✅ Application Tracking ({10 - subscription.usage.activeJobs.used}/10 active jobs)
							</li>
							<li>✅ Basic ATS compatibility score</li>
							<li>✅ Basic Company Info</li>
						</ul>
					{:else if subscription.tier === 'candidate'}
						<p class="text-muted-foreground">$20/month</p>
						<ul class="text-muted-foreground mt-3 space-y-2 text-sm">
							<li>✅ Everything in Applicant +</li>
							<li>
								✅ Resume Optimization ({subscription.usage.optimizations.limit -
									subscription.usage.optimizations.used}/{subscription.usage.optimizations.limit} remaining)
							</li>
							<li>
								✅ ATS Reports ({subscription.usage.atsReports.limit -
									subscription.usage.atsReports.used}/{subscription.usage.atsReports.limit} remaining)
							</li>
							<li>✅ Unlimited Applications</li>
							<li>✅ Interview Question DB</li>
						</ul>
					{:else if subscription.tier === 'executive'}
						<p class="text-muted-foreground">$50/month</p>
						<ul class="text-muted-foreground mt-3 space-y-2 text-sm">
							<li>✅ Everything in Candidate +</li>
							<li>✅ Unlimited Optimizations & Reports</li>
							<li>✅ Cover Letters</li>
							<li>✅ In-depth Company Research</li>
							<li>✅ Salary Negotiation Toolkit</li>
							<li>✅ Interview Prep</li>
							<li>✅ Career Coach</li>
						</ul>
					{/if}

					{#if subscription.resetAt}
						<p class="text-muted-foreground mt-4 text-xs">
							Usage resets: {new Date(subscription.resetAt).toLocaleDateString()}
						</p>
					{/if}
				</div>

				<!-- Debug Controls (Development Only) -->
				{#if import.meta.env.DEV}
					<div class="rounded-lg border-2 border-dashed border-yellow-500 p-4">
						<h4 class="mb-3 font-semibold text-yellow-600">Debug Controls</h4>
						<div class="space-y-3">
							<Select.Root
								value={subscription.tier}
								onValueChange={(tier) => updateSubscriptionDebug({ tier })}
							>
								<Select.Trigger>
									<span>Set Tier: {subscription.tier}</span>
								</Select.Trigger>
								<Select.Content>
									<Select.Item value="applicant">Applicant (Free)</Select.Item>
									<Select.Item value="candidate">Candidate ($20)</Select.Item>
									<Select.Item value="executive">Executive ($50)</Select.Item>
								</Select.Content>
							</Select.Root>

							<div class="flex gap-2">
								<Button
									variant="outline"
									size="sm"
									onclick={() => updateSubscriptionDebug({ resetUsage: true })}
								>
									Reset Usage
								</Button>
								<Button
									variant="outline"
									size="sm"
									onclick={() => updateSubscriptionDebug({ maxOutUsage: true })}
								>
									Max Out Usage
								</Button>
							</div>
						</div>
					</div>
				{/if}

				<!-- Upgrade Button -->
				{#if subscription.tier !== 'executive'}
					<div class="pt-4">
						<Button>Upgrade Plan</Button>
					</div>
				{/if}
			{/if}
		</Card.Content>
	</Card.Root>
</Tabs.Content>
```

### Success Criteria:

#### Automated Verification:

- [ ] Components compile: `bun run check`
- [ ] Svelte components render: `bun run dev`

#### Manual Verification:

- [ ] Subscription badge displays in header
- [ ] Credits counter shows correct values
- [ ] Settings page shows subscription info
- [ ] Debug controls work (dev mode only)

---

## Phase 4: Feature Enforcement & Rate Limiting

### Overview

Re-enable rate limiting and add feature restrictions throughout the application.

### Changes Required:

#### 1. Resume Optimization Service

**File**: `src/lib/services/resume.remote.ts`
**Changes**: Enable rate limiting for optimization features

```typescript
import { checkRateLimitV2 } from './utils';

export const optimizeResume = command(optimizeSchema, async (params) => {
	const userId = requireAuth();

	// Check rate limit for optimization
	await checkRateLimitV2(
		'resume.optimize',
		'You have reached your monthly optimization limit. Please upgrade to continue.'
	);

	// ... existing optimization logic
});

export const generateATSReport = command(reportSchema, async (params) => {
	const userId = requireAuth();

	// Check rate limit for ATS reports
	await checkRateLimitV2(
		'ats.report',
		'You have reached your monthly ATS report limit. Please upgrade to continue.'
	);

	// ... existing report generation logic
});
```

#### 2. Job Application Service

**File**: `src/lib/services/jobs.remote.ts`
**Changes**: Enforce job application limits for free tier

```typescript
export const createJobApplication = command(createJobSchema, async (params) => {
	const userId = requireAuth();

	// Check active job limit for applicant tier
	const subscription = await getSubscriptionInfo();
	if (subscription.tier === 'applicant' && subscription.usage.activeJobs.used >= 10) {
		throw error(
			403,
			'You have reached the limit of 10 active job applications. Please upgrade to track more jobs.'
		);
	}

	// ... create job application

	// Update active job count
	await db.incrementActiveJobs(userId);

	return { success: true };
});
```

#### 3. Toast Notifications

**File**: `src/lib/components/rate-limit-toast.ts`
**Changes**: Create helper for showing rate limit errors

```typescript
import { toast } from 'svelte-sonner';

export function showRateLimitError(error: any) {
	if (error?.status === 429 || error?.message?.includes('limit')) {
		toast.error(error.message, {
			action: {
				label: 'Upgrade',
				onClick: () => goto('/app/settings?tab=billing')
			}
		});
	} else {
		toast.error('An error occurred. Please try again.');
	}
}
```

### Success Criteria:

#### Automated Verification:

- [ ] Rate limiting tests pass: `bun run test`
- [ ] Type checking passes: `bun run check`

#### Manual Verification:

- [ ] Free tier limited to 10 jobs
- [ ] Candidate tier limited to 50 optimizations/reports
- [ ] Executive tier has unlimited access
- [ ] Toast notifications show on rate limit errors
- [ ] Upgrade prompts direct to settings

---

## Phase 5: Testing & Polish

### Overview

Ensure comprehensive test coverage and polish the user experience.

### Changes Required:

#### 1. Unit Tests

**File**: `src/lib/services/__tests__/subscription.test.ts`
**Changes**: Add subscription service tests

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { getSubscriptionInfo, trackUsage } from '../subscription.remote';

describe('Subscription Service', () => {
	describe('getSubscriptionInfo', () => {
		it('returns correct tier and usage for applicant', async () => {
			// Test implementation
		});

		it('returns correct tier and usage for candidate', async () => {
			// Test implementation
		});

		it('tracks usage correctly', async () => {
			// Test implementation
		});
	});

	describe('Rate Limiting', () => {
		it('enforces optimization limits for candidate tier', async () => {
			// Test implementation
		});

		it('enforces job limits for applicant tier', async () => {
			// Test implementation
		});

		it('allows unlimited for executive tier', async () => {
			// Test implementation
		});
	});
});
```

#### 2. E2E Tests

**File**: `tests/e2e/subscription.spec.ts`
**Changes**: Add end-to-end subscription flow tests

```typescript
import { test, expect } from '@playwright/test';

test.describe('Subscription Features', () => {
	test('displays subscription badge in header', async ({ page }) => {
		// Test implementation
	});

	test('shows rate limit error when limit exceeded', async ({ page }) => {
		// Test implementation
	});

	test('allows tier change in debug mode', async ({ page }) => {
		// Test implementation
	});

	test('updates credits counter after usage', async ({ page }) => {
		// Test implementation
	});
});
```

### Success Criteria:

#### Automated Verification:

- [ ] All unit tests pass: `bun run test`
- [ ] All E2E tests pass: `bun run test:e2e`
- [ ] Type checking passes: `bun run check`
- [ ] Linting passes: `bun run lint`

#### Manual Verification:

- [ ] Complete user flow works for each tier
- [ ] UI updates reflect usage in real-time
- [ ] Error messages are clear and actionable
- [ ] Upgrade prompts appear at appropriate times

## Testing Strategy

### Unit Tests:

- Subscription service tier management
- Rate limiting enforcement logic
- Usage tracking and reset logic
- Feature availability checks

### Integration Tests:

- Database migration and tier updates
- Remote function rate limiting
- Subscription state persistence
- Usage counter updates

### Manual Testing Steps:

1. Create new user - verify applicant tier
2. Attempt to create 11 jobs - verify limit enforced
3. Change tier to candidate (debug controls)
4. Use 50 optimizations - verify limit enforced
5. Change tier to executive - verify unlimited access
6. Reset usage - verify counters cleared
7. Check UI updates reflect all changes

## Performance Considerations

- Cache subscription info in session to reduce database queries
- Use database indexes on user_id for fast lookups
- Batch usage updates to reduce write frequency
- Consider Redis for rate limit tracking at scale

## Migration Notes

1. Run migration to update existing tier values
2. Reset all usage counters to 0 for fresh start
3. Set monthly reset date to 30 days from deployment
4. Communicate tier changes to existing users
5. Provide grace period for users on old tiers

## References

- Original ticket: `thoughts/dylan/features/subscription-logic.md`
- Rate limiting docs: `docs/RATE_LIMITING_DOCUMENTATION.md`
- Existing implementation: `src/lib/services/rate-limit.ts:5-230`
