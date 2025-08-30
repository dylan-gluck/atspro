# Bug Report

## Summary

Homepage pricing cards display outdated tier information (Starter/$0, Professional/$19, Premium/$39) instead of new subscription strategy (Applicant/$0, Candidate/$20, Executive/$50)

## Environment

- **Worktree/Branch**: feat/pricing-strategy
- **Version/Commit**: 056aa3c
- **Date Reported**: 2025-08-29
- **Platform**: darwin (Darwin 24.5.0)

## Current Behavior

The homepage pricing section at `/Users/dylan/Workspace/projects/atspro-bun/src/routes/(marketing)/+page.svelte:537-737` displays:

- **Tier Names**: "Starter", "Professional", "Premium"
- **Pricing**: $0/month, $19/month, $39/month
- **Features**: Generic feature lists not aligned with usage-based credit system
- **CTA Links**: All buttons link to `/auth/signup` (without hyphen)
- **Promotional**: Shows "50% off first 3 months" which may not be current

## Expected Behavior

Based on subscription strategy in `thoughts/dylan/features/subscription-logic.md`, homepage should display:

- **Tier Names**: "Applicant", "Candidate", "Executive"
- **Pricing**: $0/month, $20/month, $50/month
- **Features**: Usage-based limits clearly shown:
  - Applicant: 10 active jobs, no optimizations/reports
  - Candidate: Unlimited jobs, 50 optimizations/month, 50 ATS reports/month
  - Executive: Unlimited everything
- **CTA Links**: All buttons should link to `/auth/sign-up` (with hyphen)

## Steps to Reproduce

1. Start dev server with `bun run dev`
2. Navigate to homepage at `http://localhost:5173`
3. Scroll to pricing section (or click "Pricing" in nav)
4. Observe outdated tier names, prices, and features
5. Inspect CTA button links pointing to wrong auth route

## Error Messages/Logs

No runtime errors - this is a content/display issue only.

## Screenshots/Recordings

Not available - visual inspection required of pricing cards at lines 558-728 in `+page.svelte`

## Possible Solution

Update `/Users/dylan/Workspace/projects/atspro-bun/src/routes/(marketing)/+page.svelte` pricing section:

1. Replace hardcoded tier data (lines 558-728) with new tier structure
2. Update tier names: Starter→Applicant, Professional→Candidate, Premium→Executive
3. Update pricing: $19→$20, $39→$50
4. Replace feature lists with usage-based limits from tier configuration
5. Update all CTA button `goto()` calls from `/auth/signup` to `/auth/sign-up`
6. Consider loading tier data from `.test-data/tier-configuration.json` for consistency

## Workaround

Users can navigate directly to `/auth/sign-up` to create accounts, bypassing incorrect pricing display.

## Severity

**High** - Misleading pricing information directly impacts user acquisition and trust. Users see incorrect prices that don't match actual billing.

## Related Issues

- **Subscription Logic Feature**: `thoughts/dylan/features/subscription-logic.md` - Defines new tier structure
- **Test Data**: `.test-data/tier-configuration.json:16-83` - Contains correct tier configuration
- **Subscription Service**: `src/lib/services/subscription.remote.ts:7-44` - Implements correct tier limits
- **Migration**: `migrations/006_update_subscription_tiers.sql` - Database schema supporting new tiers
- **E2E Tests**: `tests/e2e/subscription.spec.ts` - Tests expect new tier structure

## Additional Context

### Code Locations

- **Affected File**: `/src/routes/(marketing)/+page.svelte:537-737`
- **Pricing Cards**: Lines 558-728 contain three Card components
- **CTA Buttons**: Lines 594, 660, 722 contain navigation handlers
- **Authentication Route**: Dynamic route at `/src/routes/(marketing)/auth/[method]/+page.svelte` handles sign-up

### Implementation Pattern

Current implementation uses hardcoded values in component. Consider refactoring to use:

```typescript
// From subscription.remote.ts pattern
const TIER_CONFIG = {
	applicant: { price: 0, limits: { jobs: 10, optimizations: 0, reports: 0 } },
	candidate: { price: 20, limits: { jobs: 999999, optimizations: 50, reports: 50 } },
	executive: { price: 50, limits: { jobs: 999999, optimizations: 999999, reports: 999999 } }
};
```

### Testing Impact

- Homepage visual regression tests will fail after fix
- E2E auth flow tests may need route updates
- Subscription tests already expect new tier structure

### Migration Notes

- This is a frontend-only change, no database migration needed
- Backend already implements new tier structure correctly
- Settings page and subscription badge already show correct tiers

### Timeline Context

- Subscription overhaul implemented: August 2025
- Backend/database updated: Completed
- Frontend partially updated: Settings done, homepage pending
- This is the final piece of the pricing strategy implementation
