# Rate Limiting Documentation

## Current Status

**DISABLED** - Rate limiting is temporarily disabled pending pricing strategy finalization.

## Architecture Overview

### 1. Database Schema

Rate limits are tracked in PostgreSQL with the following table:

- `rate_limits` table tracks requests per user/endpoint/window
- Cleanup of old records happens automatically

### 2. Subscription Tiers

```typescript
enum SubscriptionTier {
	FREE = 'free',
	PROFESSIONAL = 'professional',
	PREMIUM = 'premium'
}
```

### 3. Current Rate Limits Configuration

#### Resume Optimization (`resume.optimize`)

- **FREE**: 3 per day
- **PROFESSIONAL**: 50 per day
- **PREMIUM**: 200 per day

#### Job Extraction (`job.extract`)

- **FREE**: 5 per day
- **PROFESSIONAL**: 100 per day
- **PREMIUM**: 500 per day

#### Cover Letter Generation (`cover-letter.generate`)

- **FREE**: 1 per day
- **PROFESSIONAL**: 20 per day
- **PREMIUM**: 100 per day

#### PDF Export (`export.pdf`)

- **FREE**: 5 per day
- **PROFESSIONAL**: 50 per day
- **PREMIUM**: 200 per day

#### AI Analysis (`ai.analyze`)

- **FREE**: 10 per hour
- **PROFESSIONAL**: 100 per hour
- **PREMIUM**: 500 per hour

#### Default (all other endpoints)

- **FREE**: 60 per minute
- **PROFESSIONAL**: 300 per minute
- **PREMIUM**: 1000 per minute

## Implementation Details

### Core Functions

1. **`checkRateLimitV2(endpoint: string)`** - Main rate limiting function
   - Located in: `/src/lib/services/utils.ts`
   - Gets user session and enforces limits
   - **Issue**: Cannot set headers in SvelteKit remote functions

2. **`enforceRateLimit(session, endpoint)`** - Enforcement logic
   - Located in: `/src/lib/services/rate-limit.ts`
   - Throws `RateLimitError` if limit exceeded
   - Records requests in database

3. **`getUserTier(session)`** - Determines user's subscription tier
   - Checks subscription expiration
   - Downgrades to FREE if expired

### Files Modified (Rate Limiting Disabled)

1. `/src/lib/services/document.remote.ts`
   - `optimizeResume()` - Resume optimization
   - `generateCoverLetter()` - Cover letter generation

2. `/src/lib/services/job.remote.ts`
   - `extractJob()` - Job extraction from URL/text (2 instances)

3. `/src/lib/services/resume.remote.ts`
   - `extractResume()` - Resume parsing
   - `replaceResume()` - Resume replacement

## Known Issues

1. **SvelteKit Remote Functions**: Cannot use `setHeaders()` in remote functions
   - Original implementation tried to set rate limit headers
   - Headers like `X-RateLimit-Limit`, `X-RateLimit-Remaining`, etc.
   - Solution: Need to handle headers differently or use API routes

2. **Anonymous Users**: Currently blocks all anonymous requests
   - May want to allow limited anonymous usage

## Recommendations for Re-implementation

### 1. Pricing Strategy Considerations

- Review current limits vs. actual AI costs
- Consider token-based limits instead of request counts
- Add monthly limits in addition to daily/hourly

### 2. Technical Improvements

- Move rate limit headers to middleware or API routes
- Consider Redis for rate limit storage (faster than PostgreSQL)
- Add rate limit info to response body instead of headers for remote functions
- Implement gradual backoff instead of hard blocks

### 3. User Experience

- Add visual indicators for remaining limits
- Show upgrade prompts when limits approached
- Implement grace period for new users

### 4. Monitoring

- Add metrics for rate limit hits
- Track usage patterns to optimize limits
- Alert on unusual activity

## Re-enabling Rate Limits

To re-enable rate limiting:

1. Uncomment the `checkRateLimitV2()` calls in:
   - `/src/lib/services/document.remote.ts` (2 locations)
   - `/src/lib/services/job.remote.ts` (2 locations)
   - `/src/lib/services/resume.remote.ts` (2 locations)

2. Fix the header issue by either:
   - Returning rate limit info in response body
   - Moving to traditional API routes for rate-limited endpoints
   - Using middleware for header injection

3. Test thoroughly with different subscription tiers

## Database Migration Notes

The rate limits table exists and is functional. Schema:

```sql
CREATE TABLE rate_limits (
  user_id TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  window_start TIMESTAMP NOT NULL,
  request_count INTEGER DEFAULT 1,
  PRIMARY KEY (user_id, endpoint, window_start)
);
```

User subscription fields:

- `subscription_tier`: enum ('free', 'professional', 'premium')
- `subscription_expires_at`: timestamp for subscription expiration
