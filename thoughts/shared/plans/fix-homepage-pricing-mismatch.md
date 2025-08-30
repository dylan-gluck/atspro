# Homepage Pricing Cards Update Implementation Plan

## Overview

Update the marketing homepage pricing section to display the correct subscription tiers (Applicant/$0, Candidate/$20, Executive/$50) instead of outdated tiers (Starter/$0, Professional/$19, Premium/$39), and fix CTA button navigation routes.

## Current State Analysis

The homepage pricing section at `/src/routes/(marketing)/+page.svelte:537-737` displays completely hardcoded pricing cards that are out of sync with the rest of the application. The backend, database, and other UI components already use the new tier structure correctly.

### Key Discoveries:

- Backend tier structure is correctly implemented in `src/lib/services/subscription.remote.ts:7-44`
- Correct tier configuration exists in `.test-data/tier-configuration.json:16-83`
- Settings page and subscription badge already display correct tiers
- CTA buttons use incorrect route `/auth/signup` vs correct `/auth/sign-up`
- All content is hardcoded - no dynamic data loading from backend

## Desired End State

Homepage pricing section should:

1. Display correct tier names: Applicant, Candidate, Executive
2. Show accurate pricing: $0, $20, $50 per month
3. Present usage-based feature limits clearly
4. Link to correct auth route: `/auth/sign-up`
5. Align promotional messaging with actual offerings

### Verification:

- Visual inspection shows correct tier names and prices
- CTA buttons navigate to `/auth/sign-up`
- Feature lists match subscription service limits
- No console errors or warnings

## What We're NOT Doing

- NOT creating a dynamic pricing component (keeping hardcoded for simplicity)
- NOT modifying backend subscription logic (already correct)
- NOT updating database schema (already migrated)
- NOT creating new E2E tests for homepage (out of scope)
- NOT changing the visual design or layout

## Implementation Approach

Single-phase update to replace all hardcoded pricing content in the homepage Svelte template. This is a straightforward content replacement that aligns the frontend with the already-implemented backend structure.

## Phase 1: Update Pricing Cards Content

### Overview

Replace all outdated tier information with correct tier names, prices, features, and navigation routes.

### Changes Required:

#### 1. Homepage Pricing Section

**File**: `src/routes/(marketing)/+page.svelte`
**Changes**: Update lines 537-737 with correct tier information

```svelte
<!-- Line 552: Update promotional badge -->
🎉 Limited Time: Save with annual billing on Candidate/Executive plans

<!-- Lines 558-598: Applicant Plan (formerly Starter) -->
<Card class="relative border-2">
	<CardHeader>
		<CardTitle>Applicant</CardTitle>
		<CardDescription>Start Your Job Search Journey</CardDescription>
		<div class="pt-4">
			<span class="text-3xl font-bold">$0</span>
			<span class="text-muted-foreground">/month</span>
		</div>
	</CardHeader>
	<CardContent class="space-y-4">
		<ul class="space-y-3 text-sm">
			<li class="flex items-start gap-2">
				<CheckCircle class="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
				<span>Track up to 10 active job applications</span>
			</li>
			<li class="flex items-start gap-2">
				<CheckCircle class="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
				<span>Manual resume tailoring tools</span>
			</li>
			<li class="flex items-start gap-2">
				<CheckCircle class="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
				<span>Application status tracking</span>
			</li>
			<li class="flex items-start gap-2">
				<CheckCircle class="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
				<span>Basic resume formatting checker</span>
			</li>
			<li class="flex items-start gap-2">
				<CheckCircle class="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
				<span>Email support</span>
			</li>
		</ul>
		<Button variant="outline" class="w-full" onclick={() => goto('/auth/sign-up')}>
			Get Started Free
		</Button>
	</CardContent>
</Card>

<!-- Lines 600-666: Candidate Plan (formerly Professional) -->
<Card class="border-primary relative border-2 shadow-lg">
	<div class="left 1/2 absolute -top-4 -translate-x-1/2">
		<Badge class="px-3 py-1">
			<Star class="mr-1 h-3 w-3" />
			Most Popular
		</Badge>
	</div>
	<CardHeader>
		<CardTitle>Candidate</CardTitle>
		<CardDescription>Accelerate Your Career</CardDescription>
		<div class="pt-4">
			<span class="text-3xl font-bold">$20</span>
			<span class="text-muted-foreground">/month</span>
			<div class="text-muted-foreground mt-1 text-sm">or $190/year (save $50)</div>
		</div>
	</CardHeader>
	<CardContent class="space-y-4">
		<ul class="space-y-3 text-sm">
			<li class="flex items-start gap-2">
				<CheckCircle class="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
				<span>Unlimited job application tracking</span>
			</li>
			<li class="flex items-start gap-2">
				<CheckCircle class="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
				<span>50 AI resume optimizations per month</span>
			</li>
			<li class="flex items-start gap-2">
				<CheckCircle class="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
				<span>50 ATS compatibility reports per month</span>
			</li>
			<li class="flex items-start gap-2">
				<CheckCircle class="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
				<span>Advanced keyword optimization</span>
			</li>
			<li class="flex items-start gap-2">
				<CheckCircle class="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
				<span>Priority email support</span>
			</li>
			<li class="flex items-start gap-2">
				<CheckCircle class="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
				<span>Success analytics dashboard</span>
			</li>
			<li class="flex items-start gap-2">
				<CheckCircle class="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
				<span>Interview preparation resources</span>
			</li>
		</ul>
		<Button class="w-full" onclick={() => goto('/auth/sign-up')}>Start Candidate Plan</Button>
	</CardContent>
</Card>

<!-- Lines 668-727: Executive Plan (formerly Premium) -->
<Card class="relative border-2">
	<CardHeader>
		<CardTitle>Executive</CardTitle>
		<CardDescription>Unlimited Professional Power</CardDescription>
		<div class="pt-4">
			<span class="text-3xl font-bold">$50</span>
			<span class="text-muted-foreground">/month</span>
			<div class="text-muted-foreground mt-1 text-sm">or $390/year (save $210)</div>
		</div>
	</CardHeader>
	<CardContent class="space-y-4">
		<ul class="space-y-3 text-sm">
			<li class="flex items-start gap-2">
				<CheckCircle class="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
				<span>Everything in Candidate, plus:</span>
			</li>
			<li class="flex items-start gap-2">
				<CheckCircle class="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
				<span>Unlimited AI resume optimizations</span>
			</li>
			<li class="flex items-start gap-2">
				<CheckCircle class="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
				<span>Unlimited ATS compatibility reports</span>
			</li>
			<li class="flex items-start gap-2">
				<CheckCircle class="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
				<span>Advanced analytics and insights</span>
			</li>
			<li class="flex items-start gap-2">
				<CheckCircle class="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
				<span>Priority phone and email support</span>
			</li>
			<li class="flex items-start gap-2">
				<CheckCircle class="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
				<span>Custom integration options</span>
			</li>
			<li class="flex items-start gap-2">
				<CheckCircle class="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
				<span>White-glove onboarding</span>
			</li>
			<li class="flex items-start gap-2">
				<CheckCircle class="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
				<span>Quarterly strategy sessions</span>
			</li>
		</ul>
		<Button class="w-full" onclick={() => goto('/auth/sign-up')}>Start Executive Plan</Button>
	</CardContent>
</Card>
```

#### 2. Additional CTA Button Updates

**Lines to update**: 527, 751

```svelte
<!-- Line 527 -->
<Button size="lg" onclick={() => goto('/auth/sign-up')} class="group">

<!-- Line 751 -->
<Button size="lg" onclick={() => goto('/auth/sign-up')} class="group">
```

#### 3. Promotional Badge Updates

**Lines to update**: 733-734

```svelte
<!-- Line 733 -->
<Badge variant="secondary" class="px-4 py-2">
	<Sparkles class="mr-2 h-4 w-4" />
	Save with annual billing on Candidate/Executive plans
</Badge>
```

### Success Criteria:

#### Automated Verification:

- [x] Type checking passes: `bun run check`
- [x] Linting passes: `bun run lint`
- [x] Format check passes: `bun run format`
- [x] Dev server starts without errors: `bun run dev`

#### Manual Verification:

- [ ] Homepage displays "Applicant", "Candidate", "Executive" tier names
- [ ] Prices show as $0, $20, $50 per month
- [ ] Annual pricing shows correct savings ($50 for Candidate, $210 for Executive)
- [ ] All CTA buttons navigate to `/auth/sign-up` (with hyphen)
- [ ] Feature lists accurately reflect tier limits from configuration
- [ ] No console errors or warnings in browser
- [ ] Pricing cards maintain responsive design on mobile/tablet
- [ ] Visual hierarchy preserved with "Most Popular" badge on Candidate tier

## Testing Strategy

### Manual Testing Steps:

1. Start dev server: `bun run dev`
2. Navigate to homepage: `http://localhost:5173`
3. Scroll to pricing section or click "Pricing" in navigation
4. Verify tier names: Applicant, Candidate, Executive
5. Verify prices: $0, $20, $50
6. Click each CTA button and verify navigation to `/auth/sign-up`
7. Test responsive design at different viewport sizes
8. Check browser console for any errors

### Visual Regression:

- Screenshot pricing section before and after changes
- Compare layout and styling to ensure no unintended changes

## Performance Considerations

No performance impact expected as this is a content-only change with no new logic or API calls.

## Migration Notes

No migration required - this is a frontend-only content update. The backend and database already support the new tier structure.

## References

- Original ticket: `thoughts/shared/tickets/bug-20250829-151611-homepage-pricing-mismatch.md`
- Tier configuration: `.test-data/tier-configuration.json:16-83`
- Subscription service: `src/lib/services/subscription.remote.ts:7-44`
- Rate limits: `src/lib/services/rate-limit.ts:22-63`
- Database migration: `migrations/006_update_subscription_tiers.sql`
