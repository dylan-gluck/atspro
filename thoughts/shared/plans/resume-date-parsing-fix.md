# Resume Date Display Fix Implementation Plan

## Overview

Remove date parsing from the resume display logic and display date strings exactly as they are stored/entered, with proper XSS escaping. This simpler approach avoids parsing errors and preserves the exact format from LLM extraction or user input.

## Current State Analysis

The resume system has dates flowing through multiple stages:

1. **LLM Extraction**: Claude extracts dates from uploaded resumes in various formats ("Jan 2020", "2020", "January 2020", etc.) at `/src/lib/ai/index.ts:45-46,58,69-70`
2. **Storage**: Dates stored as strings in database JSONB at `/src/lib/types/resume.ts:17-18,29,39-40`
3. **Display**: Frontend attempts to parse strings with `new Date()` causing "Invalid Date" errors at `/src/routes/(app)/app/resume/+page.svelte:1172-1186`

### Key Discoveries:

- LLM extraction already returns dates as strings via Zod schema at `/src/lib/ai/index.ts:45-46,58,69-70`
- Database and types already use `string | null` for all date fields
- The parsing issue only exists in the display layer
- Test data uses consistent "YYYY-MM" format at `/src/lib/services/__tests__/test-helpers.ts:140-141`

## Desired End State

Resume dates should display exactly as stored without any parsing or transformation. If the LLM extracts "Jan 2020" or a user enters "2020-2024", that exact string should appear in the preview. This maintains data fidelity and avoids parsing errors.

## What We're NOT Doing

- NOT parsing dates into Date objects
- NOT enforcing any specific date format
- NOT validating date formats on input
- NOT changing the LLM extraction logic
- NOT modifying database schema or types
- NOT adding date picker components

## Implementation Approach

Simply display date strings as-is with proper HTML escaping for XSS prevention. Remove all `new Date()` calls and date formatting logic from the display layer.

## Phase 1: Remove Date Parsing from Display

### Overview

Update the resume preview to display date strings directly without parsing, ensuring proper HTML escaping.

### Changes Required:

#### 1. Work Experience Date Display

**File**: `/src/routes/(app)/app/resume/+page.svelte`
**Changes**: Replace lines 1172-1186 to display strings directly

```svelte
<div class="text-muted-foreground text-right text-sm">
	{#if exp.startDate}
		{exp.startDate}
	{/if}
	{#if exp.startDate && (exp.endDate || exp.isCurrent)}
		-
	{/if}
	{#if exp.isCurrent}
		Present
	{:else if exp.endDate}
		{exp.endDate}
	{/if}
</div>
```

#### 2. Education Date Display

**File**: `/src/routes/(app)/app/resume/+page.svelte`
**Changes**: Update lines 1249-1251 to display string directly

```svelte
{#if edu.graduationDate}
	<p class="text-muted-foreground text-sm">
		{edu.graduationDate}
	</p>
{/if}
```

#### 3. Certification Date Display

**File**: `/src/routes/(app)/app/resume/+page.svelte`
**Changes**: Update lines 1290-1299 to display strings directly

```svelte
{#if cert.dateObtained}
	<p class="text-muted-foreground text-sm">
		Obtained: {cert.dateObtained}
	</p>
{/if}
{#if cert.expirationDate}
	<p class="text-muted-foreground text-sm">
		Expires: {cert.expirationDate}
	</p>
{/if}
```

### Success Criteria:

#### Automated Verification:

- [x] Application builds successfully: `bun run build`
- [x] Type checking passes: `bun run check`
- [x] Linting passes: `bun run lint`
- [x] Format checking passes: `bun run format`

#### Manual Verification:

- [ ] Entering "Jan 2020" displays as "Jan 2020" (not "Invalid Date")
- [ ] Entering "2020" displays as "2020" (exact string)
- [ ] Entering "2020-02" displays as "2020-02" (exact string)
- [ ] Entering "January 2020 - Present" displays exactly as entered
- [ ] LLM-extracted dates display exactly as extracted
- [ ] No "Invalid Date" errors appear anywhere

---

## Phase 2: Update Test Data Consistency

### Overview

Ensure test data matches the new string-based approach without date parsing expectations.

### Changes Required:

#### 1. Update Test Helpers

**File**: `/src/lib/services/__tests__/test-helpers.ts`
**Changes**: Ensure test data uses realistic date strings that match what LLM might extract

```typescript
// Current test data uses "2020-01" format
// Consider adding variety to match real-world LLM extraction:
startDate: 'Jan 2020',
endDate: 'Dec 2023',
graduationDate: 'May 2024',
dateObtained: 'March 2023',
```

#### 2. Update E2E Tests

**File**: `/tests/e2e/resume-optimization.spec.ts`
**Changes**: Update any assertions that expect parsed/formatted dates to expect raw strings

### Success Criteria:

#### Automated Verification:

- [x] All unit tests pass: `bun run test`
- [ ] All E2E tests pass: `bun run test:e2e`
- [ ] Test coverage maintained or improved

#### Manual Verification:

- [x] Test data reflects realistic date formats
- [x] Tests don't assume date parsing

---

## Testing Strategy

### Manual Testing Steps:

1. Start dev server: `bun run dev`
2. Navigate to `/app/resume`
3. Add work experience with "Jan 2020" start date
4. Verify displays as "Jan 2020" in preview (exact string)
5. Try "2019" and verify displays as "2019" (not parsed)
6. Try "2019-02" and verify displays as "2019-02" (exact string)
7. Try "January 2020 - Present" and verify displays exactly
8. Upload a resume PDF and verify extracted dates display as-is
9. Save resume and reload to verify persistence
10. Generate PDF and verify dates appear exactly as stored

### Edge Cases to Test:

- Empty date fields (should show nothing)
- Very long date strings (should display fully)
- Special characters in dates (should be escaped)
- Mixed formats in same resume (all should display as entered)

## Performance Considerations

- No date parsing overhead - better performance
- Direct string display is fastest approach
- Svelte automatically handles HTML escaping for XSS protection

## Migration Notes

No data migration required - the system already stores dates as strings. This change only affects the display layer.

## Security Considerations

- Svelte automatically escapes text content in `{expression}` syntax, preventing XSS
- No need for additional escaping as we're using standard Svelte text interpolation
- Database already stores as strings with proper sanitization

## References

- Original ticket: `thoughts/shared/tickets/bug-20250829-152546-resume-date-parsing.md`
- LLM extraction schema: `/src/lib/ai/index.ts:45-46,58,69-70`
- Resume types: `/src/lib/types/resume.ts:17-18,29,39-40`
- Current broken display: `/src/routes/(app)/app/resume/+page.svelte:1172-1186`
