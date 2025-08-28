# Breaking Changes Documentation

## Version 1.1.0 - Subscription Tier System Implementation (PR #4)

**Date:** 2025-01-28  
**Branch:** `feat/pricing-strategy`  
**Status:** Released  
**Migration Required:** Yes

---

## Overview

This release introduces a comprehensive subscription tier system that replaces the previous simple tier structure with usage-based limits and tracking. The implementation significantly changes data models, API behavior, and user access patterns.

## Breaking Changes Summary

### 1. Subscription Tier Naming Changes

**Previous Tiers:**

- `free` → Now: `applicant`
- `professional` → Now: `candidate`
- `premium` → Now: `executive`

**Impact:** All existing users will be automatically migrated to the new tier names, but any hardcoded references to old tier names in client code will break.

**Migration Required:** Update any client-side code that references the old tier names.

### 2. New Usage Limits and Tracking

**Before:** No usage limits enforced
**After:** Strict per-tier usage limits with monthly tracking

| Tier               | Resume Optimizations | ATS Reports | Active Jobs |
| ------------------ | -------------------- | ----------- | ----------- |
| Applicant (Free)   | 0/month              | 0/month     | 10 active   |
| Candidate ($20/mo) | 50/month             | 50/month    | Unlimited   |
| Executive ($50/mo) | Unlimited            | Unlimited   | Unlimited   |

**Impact:**

- Free tier users lose access to resume optimization and ATS reports
- All users now subject to usage tracking and limits
- Rate limiting now enforced on premium features

### 3. Database Schema Changes

**New Tables:**

- `subscription_usage` - Tracks detailed usage history

**New Columns in `user` table:**

- `monthly_optimizations_used` (INTEGER, default 0)
- `monthly_ats_reports_used` (INTEGER, default 0)
- `active_job_applications` (INTEGER, default 0)

**Modified Constraints:**

- Updated subscription tier enum to new values
- Added check constraint for new tier names

### 4. API Endpoint Changes

**Rate Limited Endpoints:**

- `resume.optimize` - Now enforces tier-based limits
- `ats.report` - Now enforces tier-based limits
- Job application creation - Limited to 10 active for Applicant tier

**New API Responses:**
All rate-limited endpoints now return 429 status with subscription-specific error messages:

```json
{
	"error": {
		"status": 429,
		"message": "Monthly optimization limit reached. Please upgrade to continue."
	}
}
```

**New Remote Functions:**

- `getSubscriptionInfo()` - Returns tier and usage information
- `updateSubscriptionDebug()` - Development-only tier management
- `trackUsage()` - Internal usage tracking

### 5. UI Changes

**New Components:**

- Subscription badge in header showing tier and remaining credits
- Usage counters for Candidate tier users
- Debug controls in settings (development mode)
- Enhanced subscription management in settings tab

**Removed Features:**

- Free access to resume optimization
- Free access to ATS report generation

---

## Migration Guide

### For Existing Users

#### Automatic Data Migration

The database migration will automatically:

1. Convert existing tier values to new names
2. Add usage tracking columns with default values
3. Create the new subscription_usage table
4. Reset all usage counters to 0

#### User Impact by Current Tier

**Free Users (now Applicant):**

- ⚠️ **Loss of functionality:** No longer can use resume optimization or ATS reports
- ✅ **Retained access:** Resume editor, job tracking (limited to 10), basic ATS score
- 💡 **Recommendation:** Upgrade to Candidate tier for continued access

**Professional Users (now Candidate):**

- ✅ **Enhanced features:** All previous functionality retained
- 🆕 **New limits:** 50 optimizations and ATS reports per month
- 📊 **New visibility:** Usage tracking displayed in header and settings

**Premium Users (now Executive):**

- ✅ **No changes:** Unlimited access to all features
- 📊 **New visibility:** Subscription status displayed in header

### For Developers

#### Required Code Changes

1. **Update tier references:**

```typescript
// Before
if (user.subscription_tier === 'free') {
	// handle free user
}

// After
if (user.subscription_tier === 'applicant') {
	// handle applicant user
}
```

2. **Handle rate limit errors:**

```typescript
// Add error handling for new rate limits
try {
	await optimizeResume(params);
} catch (error) {
	if (error.status === 429) {
		showRateLimitError(error);
	}
}
```

3. **Update test data:**

```typescript
// Update test fixtures
const testUser = {
	subscription_tier: 'candidate', // was 'professional'
	monthly_optimizations_used: 0
	// ... other new fields
};
```

#### Database Migration Steps

1. **Run the migration:**

```bash
bun run migrate
```

2. **Verify migration success:**

```bash
bun run migrate:status
```

3. **Check data integrity:**

```sql
-- Verify tier conversion
SELECT subscription_tier, COUNT(*)
FROM "user"
GROUP BY subscription_tier;

-- Should show: applicant, candidate, executive (no old values)
```

#### Testing Considerations

**Update E2E Tests:**

- Test data files need tier name updates
- Rate limiting scenarios need testing
- Usage counter functionality requires verification

**New Test Cases Required:**

- Subscription tier enforcement
- Usage limit validation
- Monthly usage reset functionality
- Debug controls (development mode)

---

## API Reference Updates

### New Endpoints

#### Get Subscription Info

```typescript
getSubscriptionInfo(): {
  tier: 'applicant' | 'candidate' | 'executive',
  expiresAt: Date | null,
  usage: {
    optimizations: { used: number, limit: number },
    atsReports: { used: number, limit: number },
    activeJobs: { used: number, limit: number }
  },
  resetAt: Date
}
```

#### Update Subscription (Debug)

```typescript
updateSubscriptionDebug(params: {
  tier?: 'applicant' | 'candidate' | 'executive',
  resetUsage?: boolean,
  maxOutUsage?: boolean
}): { success: boolean }
```

### Modified Endpoints

#### Resume Optimization

**Before:** Always allowed (rate limited by general limits)
**After:** Tier-specific limits enforced

- Applicant: 0/month (blocked)
- Candidate: 50/month
- Executive: Unlimited

#### ATS Report Generation

**Before:** Always allowed
**After:** Same tier limits as resume optimization

#### Job Application Creation

**Before:** Unlimited
**After:**

- Applicant: 10 active jobs maximum
- Candidate/Executive: Unlimited

---

## Environment Variables

### No Changes Required

All existing environment variables remain unchanged. The subscription system uses existing database connections and authentication.

### Optional Development Settings

```bash
# For testing subscription features
DEBUG_SUBSCRIPTION=true  # Enables debug controls in UI
```

---

## Rollback Plan

If issues arise, the system can be rolled back:

### Database Rollback

```sql
-- Revert tier names (emergency only)
UPDATE "user" SET subscription_tier = CASE
  WHEN subscription_tier = 'applicant' THEN 'free'
  WHEN subscription_tier = 'candidate' THEN 'professional'
  WHEN subscription_tier = 'executive' THEN 'premium'
  ELSE subscription_tier
END;

-- Drop new columns
ALTER TABLE "user"
DROP COLUMN IF EXISTS monthly_optimizations_used,
DROP COLUMN IF EXISTS monthly_ats_reports_used,
DROP COLUMN IF EXISTS active_job_applications;

-- Drop usage table
DROP TABLE IF EXISTS subscription_usage;
```

### Code Rollback

1. Revert rate limiting changes
2. Remove subscription UI components
3. Restore unlimited access to features
4. Update tier enum definitions

**⚠️ Warning:** Rollback will lose all usage tracking data and user tier preferences.

---

## Monitoring and Alerts

### Key Metrics to Monitor

**Usage Patterns:**

- Rate limit hit frequency by tier
- Upgrade conversion rates
- Feature adoption after limits

**Performance Impact:**

- Database query performance on new usage tables
- Rate limiting overhead
- UI render performance with usage displays

**Error Rates:**

- 429 (rate limit) error frequency
- Subscription query failures
- Migration completion rates

### Recommended Alerts

```yaml
# Example monitoring configuration
alerts:
  - name: 'High Rate Limit Errors'
    condition: 'rate_limit_errors > 100/hour'
    action: 'Check subscription limits and user tier distribution'

  - name: 'Subscription Query Failures'
    condition: 'subscription_query_errors > 1%'
    action: 'Check database performance and connection health'

  - name: 'Migration Incomplete'
    condition: 'users with old_tier_names > 0'
    action: 'Re-run migration script'
```

---

## Support and Communication

### User Communication

**Email Template for Affected Users:**

```
Subject: Important Update: ATSPro Subscription Changes

Hi [Name],

We've upgraded ATSPro with new subscription tiers and enhanced features!

Your account has been updated:
- Previous: [OLD_TIER] → New: [NEW_TIER]
- New features: Usage tracking, enhanced limits
- [Tier-specific messaging]

Questions? Visit /app/settings or contact support.
```

### Documentation Updates Required

- [ ] Update user guide with new tier structure
- [ ] Revise API documentation for new endpoints
- [ ] Create troubleshooting guide for rate limits
- [ ] Update onboarding flow documentation

### Support Team Preparation

**Common Issues Expected:**

1. Confusion about tier name changes
2. Rate limit errors for free users
3. Questions about usage tracking
4. Requests to reset usage counters

**Quick Response Scripts:**

- Tier conversion explanation
- Upgrade benefit outline
- Usage limit troubleshooting
- Debug mode instructions (for development)

---

## Conclusion

This breaking change introduces significant improvements to ATSPro's monetization and user experience while requiring careful migration planning. The automatic database migration handles most technical aspects, but client code updates and user communication are essential for a smooth transition.

**Timeline for Full Migration:**

- Week 1: Database migration and core functionality
- Week 2: UI updates and user communication
- Week 3: Monitor, adjust, and optimize
- Week 4: Complete rollout and documentation updates

For technical questions or migration assistance, contact the development team or refer to the implementation details in `/thoughts/shared/plans/subscription-tier-implementation.md`.
