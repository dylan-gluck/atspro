# Bug Report

## Summary

Resume editor date fields fail to parse user input correctly, displaying "Invalid Date" or incorrect dates when standard formats are entered

## Environment

- **Worktree/Branch**: feat/pricing-strategy
- **Version/Commit**: 056aa3c
- **Date Reported**: 2025-08-29
- **Platform**: darwin (Darwin 24.5.0)
- **Browser**: All browsers affected (native JavaScript Date parsing issue)

## Current Behavior

The resume editor date display logic at `/Users/dylan/Workspace/projects/atspro-bun/src/routes/(app)/app/resume/+page.svelte:1172-1185` incorrectly parses date strings:

- **Input**: `Jan 2020` → **Display**: `Invalid Date`
- **Input**: `2019` → **Display**: `Dec 2018` (off by one year due to timezone)
- **Input**: `2019-02` → **Display**: `Jan 2019` (off by one month due to zero-indexing)

## Expected Behavior

Date inputs should display exactly as entered or in a consistent format:

- **Input**: `Jan 2020` → **Display**: `Jan 2020`
- **Input**: `2019` → **Display**: `2019` or `Jan 2019`
- **Input**: `2019-02` → **Display**: `Feb 2019`

## Steps to Reproduce

1. Start dev server with `bun run dev`
2. Navigate to resume editor at `/app/resume`
3. Add or edit work experience section
4. Enter `Jan 2020` in Start Date field
5. Observe "Invalid Date" in resume preview
6. Try `2019` in Start Date field
7. Observe "Dec 2018" displayed instead of "2019"
8. Try `2019-02` in Start Date field
9. Observe "Jan 2019" displayed instead of "Feb 2019"

## Error Messages/Logs

```javascript
// Console output when parsing "Jan 2020"
new Date('Jan 2020'); // Invalid Date

// Console output when parsing "2019"
new Date('2019'); // 2018-12-31T23:00:00.000Z (timezone shift)

// Console output when parsing "2019-02"
new Date('2019-02'); // 2019-01-31T23:00:00.000Z (month off-by-one)
```

## Screenshots/Recordings

Visual inspection required at `/app/resume` - date display in preview section shows incorrect values

## Possible Solution

Create date parsing utilities in `/src/lib/utils/date.ts`:

```javascript
export function parseResumeDate(dateString: string): Date | null {
  if (!dateString) return null;

  // Handle "Jan 2020" format
  if (/^[A-Za-z]{3}\s+\d{4}$/.test(dateString)) {
    return new Date(dateString + " 1");
  }

  // Handle "2019" format
  if (/^\d{4}$/.test(dateString)) {
    return new Date(parseInt(dateString), 0, 1);
  }

  // Handle "2019-02" format
  if (/^\d{4}-\d{2}$/.test(dateString)) {
    const [year, month] = dateString.split('-');
    return new Date(parseInt(year), parseInt(month) - 1, 1);
  }

  return new Date(dateString);
}

export function formatResumeDate(date: Date | string | null): string {
  if (!date) return '';
  const parsed = typeof date === 'string' ? parseResumeDate(date) : date;
  if (!parsed || isNaN(parsed.getTime())) return '';

  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric'
  });
}
```

Then update display logic in `+page.svelte` to use these utilities instead of direct `new Date()` calls.

## Workaround

Users can enter dates in ISO format `2020-01` which partially works but displays with month off-by-one error.

## Severity

**High** - Core resume functionality is broken. Users cannot accurately enter employment dates, education graduation dates, or certification dates, making resumes incomplete and unprofessional.

## Related Issues

- **Resume UI Issues**: `thoughts/dylan/bugs/resume-edit-ui.md` - Related UI problems in resume editor
- **Date Library Available**: `@internationalized/date` package installed but unused (package.json:37)
- **Working Pattern**: Job pages use `Intl.DateTimeFormat` correctly (`/app/jobs/[id]/+page.svelte:119-125`)

## Additional Context

### Code Locations

- **Affected Files**:
  - `/src/routes/(app)/app/resume/+page.svelte:1172-1185` - Work experience dates
  - `/src/routes/(app)/app/resume/+page.svelte:1249-1251` - Education dates
  - `/src/routes/(app)/app/resume/+page.svelte:1290-1292` - Certification dates
  - `/src/routes/(app)/app/resume/+page.svelte:1297-1299` - Certification expiration dates

- **Input Fields**:
  - Lines 714-731: Work experience date inputs
  - Lines 886-891: Education graduation date input
  - Lines 1004-1018: Certification date inputs

### Data Model

- **Types**: `/src/lib/types/resume.ts:17-18,29,39-40`
  - Work: `startDate?: string | null`, `endDate?: string | null`
  - Education: `graduationDate?: string | null`
  - Certification: `dateObtained?: string | null`, `expirationDate?: string | null`

- **Database**: Dates stored as strings in JSONB column (`/src/lib/db/schema/user-resume.ts:10-14`)

### Root Cause Analysis

1. **Direct Date Constructor Usage**: Using `new Date(string)` without validation or parsing
2. **Multiple Input Formats**: UI expects "Jan 2020" but backend uses "2020-01"
3. **No Date Utilities**: No centralized date parsing/formatting functions
4. **JavaScript Date Quirks**:
   - Zero-based month indexing (0-11)
   - Timezone assumptions for year-only dates
   - Inconsistent string parsing across browsers

### Testing Gaps

- No unit tests for date parsing logic
- Test data uses "YYYY-MM" format consistently (`/src/lib/services/__tests__/test-helpers.ts:140-141`)
- E2E tests don't verify date display accuracy

### Implementation Notes

- Project has `@internationalized/date` library available for robust date handling
- Bits-UI provides date picker components that could replace text inputs
- Other parts of app (job pages) handle dates correctly using `Intl.DateTimeFormat`

### Affected User Flows

1. Creating new resume with work experience
2. Editing existing resume dates
3. Adding education with graduation dates
4. Managing professional certifications
5. Generating PDF resumes with date information

### Browser Compatibility

- Issue affects all browsers due to reliance on native Date parsing
- No polyfills or fallbacks implemented
- Internationalization considerations not addressed (hardcoded 'en-US' locale)
