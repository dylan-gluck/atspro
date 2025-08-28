# Pull Request

## Summary

Implements a comprehensive subscription tier system with usage limits and breaking changes, transforming the pricing model from FREE/PROFESSIONAL/PREMIUM to APPLICANT/CANDIDATE/EXECUTIVE tiers with monthly credit tracking and rate limiting.

## Type of Change

- [x] Feature (non-breaking change adding functionality)
- [ ] Bug fix (non-breaking change fixing an issue)
- [x] Breaking change (fix or feature causing existing functionality to not work as expected)
- [x] Documentation update
- [ ] Performance improvement
- [ ] Refactoring (no functional changes)

## Changes Made

- **Database Schema Updates:**
  - Migrated subscription tiers from FREE/PROFESSIONAL/PREMIUM to APPLICANT/CANDIDATE/EXECUTIVE
  - Added usage tracking columns: `monthly_optimizations_used`, `monthly_ats_reports_used`, `active_job_applications`
  - Created new `subscription_usage` table for detailed usage history
  - Migration 006 handles automatic tier conversion and schema updates

- **Subscription Service Implementation:**
  - Added comprehensive subscription service with usage limits enforcement
  - Implemented rate limiting: Applicant (0/0/10), Candidate (50/50/unlimited), Executive (unlimited)
  - Created debug controls for easy testing in development mode
  - Added automatic monthly usage reset functionality

- **UI/UX Enhancements:**
  - Added subscription badge to header showing tier and remaining credits
  - Implemented subscription management UI in settings with tier controls
  - Created helper for subscription error toast notifications
  - Added upgrade prompts when users hit tier limits

- **Test Data Updates:**
  - Updated E2E test data files to use new tier system
  - Created specialized test users for each subscription tier
  - Added tier configuration reference file for testing
  - Fixed test fixtures to support new subscription model

- **Documentation:**
  - Created comprehensive breaking changes documentation (docs/BREAKING_CHANGES.md)
  - Updated API specification with new subscription endpoints
  - Added database migration documentation with rollback procedures
  - Documented migration guide for developers and users

- **Developer Experience:**
  - Updated test:e2e script to check if dev server is running before tests
  - Enhanced check-dev-server.py script with --bool flag for proper exit codes
  - Removed obsolete agent configuration files

## Testing

- [x] Unit tests pass
- [x] E2E tests pass (subscription tests updated with new tier data)
- [ ] Manual testing completed
- [x] Lint & typecheck pass

## Screenshots/Demo

N/A - Backend and UI changes for subscription management

## Related Issues

N/A

## Checklist

- [x] Code follows project conventions
- [x] Self-review completed
- [x] Comments added for complex logic
- [x] Documentation updated if needed
- [x] No console.log/debugger statements
- [x] Database migrations included if schema changed
- [x] Breaking changes documented

## Breaking Changes

### Tier Name Changes

- `free` → `applicant`
- `professional` → `candidate`
- `premium` → `executive`

### New Usage Limits

| Tier               | Monthly Optimizations | Monthly ATS Reports | Active Jobs |
| ------------------ | --------------------- | ------------------- | ----------- |
| Applicant (Free)   | 0                     | 0                   | 10          |
| Candidate ($20/mo) | 50                    | 50                  | Unlimited   |
| Executive ($50/mo) | Unlimited             | Unlimited           | Unlimited   |

### API Changes

- New endpoints: `/api/subscription`, `/api/subscription/debug`, `/api/subscription/track`
- Rate limiting now returns 429 status with subscription-specific error messages
- New response headers: `X-Subscription-Tier`, `X-Usage-Reset-Date`

### Migration Requirements

1. Run database migration 006: `bun run migrate`
2. Update all code references from old tier names to new ones
3. Handle new rate limit error responses (429 status)
4. Free tier users will lose access to optimization and ATS report features

## Notes

- The subscription system includes debug controls for easy testing in development mode
- Usage limits are enforced per calendar month with automatic reset on the 1st
- Executive tier has unlimited access to all features
- All existing users will be automatically migrated to the new tier system
- Test data has been updated to reflect new tier structure
- E2E test command now verifies dev server is running before execution
