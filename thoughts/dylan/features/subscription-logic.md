# Subscription Tier - Updated

The goal of this feature is to update the pricing model and usage/rate limitation logic throughout the project. For existing features we will implement the rate limit logic as described. Do not spec new product features at this time, focus only on the subscription tier logic.

## New Tiers & Usage Limitations

### Applicant (Free)

- ✅ Resume Editor
- ✅ Application Tracking (10 active jobs)
- ✅ Basic ATS compatibility score
- ✅ Basic Company Info

### Candidate ($20/mo)

- ✅ Everything in Applicant +
- ✅ Application Tracking (Unlimited)
- ✅ Resume Optimization (50/month)
- ✅ ATS Compatibility Report (50/month)
- ✅ Interview Question DB

### Executive ($50/mo)

- ✅ Everything in Candidate +
- ✅ Cover Letters
- ✅ In-depth Company Research
- ✅ Salary Negotiation Toolkit
- ✅ Interview Prep
- ✅ Career Coach

---

## UI Updates

### Remaining Credits

The user should see a badge showing their subscription type & a counter of remaining monthly usage credits in the header: (Applications, Optimizations, ATS Reports)

**Logic**

- For **free** users: show remaining job applications (out of 10), no access to optimization or ATS Reports.
- For **candidate** users: show remaining optimizations & ats reports.
- For **executive** users: show executive badge.

**Display Style**

- Inline-flex container, accent background color
- Inline list: Icon + Number combo
- `[badge] [* 50 | * 50]`

---

## Subscription Service

Add a new service for fetching / updating subscription info from the DB.

This service will be integrated with Polar.sh webhooks once they are added, for now add manual controls in the user settings for debugging:

- Dropdown sets subscription tier
- Button to reset/clear credit limits
- Button to max-out credit limits

---

## Acceptance Criteria

- [ ] Data Model & Documentation updated
- [ ] DB Migrations created
- [ ] Add `subscription.remote.ts` service
- [ ] Rate Limit service (remote + client) updated
- [ ] UI: Homepage pricing cards updated
- [ ] UI: Remaining credits in header
- [ ] UI: Toast Notification when action failes due to rate limit
- [ ] UI: Disabled features / buttons based on subscription level
- [ ] Unit tests updated & passing
- [ ] E2e tests updated & passing
