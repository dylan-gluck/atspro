# Bug Report

## Summary

Resume editor displays non-functional reordering controls on section headers and lacks reordering functionality for array-based fields

## Environment

- **Worktree/Branch**: feat/pricing-strategy
- **Version/Commit**: 056aa3c
- **Platform**: macOS Darwin 24.5.0
- **Framework**: SvelteKit with Svelte 5

## Current Behavior

Based on code analysis at `/Users/dylan/Workspace/projects/atspro-bun/src/routes/(app)/app/resume/+page.svelte`:

1. **Section Headers** (lines 485-511): Each accordion section header displays up/down chevron buttons alongside a GripVertical drag handle icon, suggesting sections can be reordered. However:
   - The `moveSection()` function (lines 224-234) modifies only the `accordionValue` array which controls accordion open/close state
   - This does not affect the actual data structure or persist changes
   - Section order is hardcoded in the initial state (lines 92-99)

2. **Array Fields**: No reordering functionality exists for:
   - Work Experience entries (lines 671-781)
   - Education entries (lines 783-879)
   - Certifications (lines 881-965)
   - Skills array (lines 1020-1074)
   - Responsibilities within work experience (lines 751-777)
   - Links in contact information (lines 555-565)

3. **Visual Misleading**: The `GripVertical` icon (line 487) implies drag-and-drop capability but has no associated drag handlers

## Expected Behavior

Per acceptance criteria in `/Users/dylan/Workspace/projects/atspro-bun/thoughts/dylan/bugs/resume-edit-ui.md`:

1. **Section Headers**: Remove up/down buttons from accordion headers as sections cannot be reordered
2. **Work Experience**: Add up/down buttons with functional reordering
3. **Education**: Add up/down buttons with functional reordering
4. **Certifications**: Add up/down buttons with functional reordering
5. **Links**: Implement drag-and-drop reordering
6. **Responsibilities**: Implement drag-and-drop reordering
7. **Skills**: Implement drag-and-drop reordering

## Steps to Reproduce

1. Navigate to `/app/resume` route
2. Observe section headers with up/down buttons and grip handles
3. Click up/down buttons on any section header (e.g., "Contact Information")
4. Note that sections appear to reorder in the accordion but data structure remains unchanged
5. Refresh the page - section order resets to default
6. Add multiple work experience entries
7. Observe no reordering controls are available for individual entries
8. Same issue occurs for Education, Certifications, Skills, Links, and Responsibilities

## Error Messages/Logs

```
No console errors - functionality is simply not implemented
```

## Screenshots/Recordings

Key UI elements requiring changes:

- Section headers at lines 485-511 show misleading controls
- Work experience cards at lines 672-780 lack reordering controls
- Skills badges at lines 1038-1058 lack drag handles
- Links inputs at lines 555-565 have no reordering mechanism

## Possible Solution

Based on existing patterns and research:

### Immediate Fix (Remove Misleading Controls)

1. Remove up/down buttons from section headers (lines 493-509 for each section)
2. Remove or disable `GripVertical` icon if not implementing drag-and-drop

### Full Implementation Approach

#### For Up/Down Button Reordering:

1. Create generic array reordering function:

```javascript
function moveArrayItem<T>(array: T[], fromIndex: number, toIndex: number): T[] {
    const newArray = [...array];
    const [item] = newArray.splice(fromIndex, 1);
    newArray.splice(toIndex, 0, item);
    return newArray;
}
```

2. Add up/down buttons to each array item card header following existing button pattern
3. Implement move functions for each array type (work, education, certifications)

#### For Drag-and-Drop (Skills, Links, Responsibilities):

1. Consider lightweight library options:
   - `@thisux/sveltednd` (Svelte 5 optimized)
   - `svelte-dnd-action` (mature, accessible)
   - Custom implementation using existing file drag pattern (lines 166-184 in onboarding)

2. Ensure WCAG 2.2 compliance per 2.5.7: Dragging Movements
   - Provide keyboard navigation alternatives
   - Include up/down button fallbacks
   - Add proper ARIA labels

### Code Locations Requiring Changes:

- **Remove buttons from headers**: Lines 485-511, 569-595, 597-623, 625-651, 653-669, 967-992
- **Add to work experience**: Modify card headers at lines 672-703
- **Add to education**: Modify card headers at lines 784-818
- **Add to certifications**: Modify card headers at lines 882-910
- **Implement for skills**: Enhance badge rendering at lines 1038-1058
- **Implement for links**: Update input group at lines 555-565
- **Implement for responsibilities**: Update nested list at lines 751-777

## Workaround

Users must currently:

1. Delete and re-add items in the desired order
2. Use copy/paste to manually reorder text content
3. Export resume, edit externally, and re-import

## Severity

**Medium** - Functionality is misleading but not blocking. Users expect reordering based on visual cues but must use workarounds.

## Related Issues

- No drag-and-drop library currently installed per `package.json` analysis
- Existing `moveSection()` function can serve as template for array item reordering
- File drag-and-drop implementation exists in onboarding that could be adapted

## Additional Context

### Technical Debt

- All resume editing logic is in a single 1100+ line component
- No reusable components for common patterns (array management, reordering)
- Missing abstraction for array field management

### Accessibility Considerations

- Current implementation has basic keyboard support via buttons
- WCAG 2.2 criterion 2.5.7 requires non-dragging alternatives
- Screen reader support needs proper ARIA labels for reordering actions

### Performance Impact

- Adding drag-and-drop library will increase bundle size (~5-30kB depending on choice)
- Current array manipulation patterns are already optimized with immutable updates

### Database Persistence

- Resume data structure supports ordered arrays
- No database schema changes required
- Order is preserved through `updateResume()` remote function

### Testing Requirements

- E2E tests needed for reordering interactions
- Accessibility testing for keyboard navigation
- Mobile touch interaction testing for drag-and-drop

### Recommended Priority

1. **Immediate**: Remove misleading up/down buttons from section headers
2. **High**: Add up/down reordering to work experience, education, certifications
3. **Medium**: Implement drag-and-drop for skills, responsibilities, links
4. **Low**: Consider section reordering as future enhancement
