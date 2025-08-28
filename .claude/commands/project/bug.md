---
allowed-tools: Task, Read, Write, Bash(ls:*), Bash(pwd:*), Glob
description: Generate bug ticket from observation or document using parallel research agents
argument-hint: <observation|file-path>
model: opus
---

# Bug Ticket Generator

Generate a comprehensive bug ticket based on an observation or document, using parallel subagents to research the codebase and create a detailed report.

## Initial Context

User input: $ARGUMENTS
Current directory: !`pwd`
Template exists: !`ls -la .claude/templates/bug-report.md 2>/dev/null || echo "Template not found"`

## Research Phase

Delegate the following research tasks to parallel subagents to gather comprehensive information about the bug:

### Task 1: Codebase Analysis
Use the codebase-analyzer agent to:
- Analyze the overall codebase structure
- Identify potentially affected modules
- Document system architecture relevant to the bug
- Note any patterns or anti-patterns that might contribute

### Task 2: Bug Location Discovery
Use the codebase-locator agent to:
- Search for code locations mentioned in the bug observation
- Find related files and functions
- Identify entry points and call chains
- Map the execution flow around the suspected bug area

### Task 3: Pattern Recognition
Use the codebase-pattern-finder agent to:
- Search for similar code patterns that might have the same issue
- Identify any repeated structures that could be affected
- Find related test files and coverage gaps
- Document any existing workarounds or patches

### Task 4: External Research
Use the web-search-researcher agent to:
- Search for similar issues in framework documentation
- Look for known bugs in dependencies
- Find community discussions about similar problems
- Research best practices related to the issue

### Task 5: Project Context
Use the research-project agent to:
- Review project documentation for relevant context
- Check recent commits for related changes
- Examine TODO items and known issues
- Gather environment and configuration details

## Bug Report Generation

After completing the research phase, create a comprehensive bug ticket:

1. **Parse Input**
   - If $ARGUMENTS is a file path (starts with / or ./ or contains /), read the file
   - Otherwise, treat $ARGUMENTS as the observation text

2. **Load Template**
   - Read the bug report template from `.claude/templates/bug-report.md`
   - If template is missing, use a default structure

3. **Synthesize Research**
   - Combine findings from all subagents
   - Identify the most likely root cause
   - Document reproduction steps based on code analysis
   - Note any patterns of similar issues

4. **Generate Bug Ticket**
   - Create a unique filename: `thoughts/tickets/bug-{timestamp}-{brief-description}.md`
   - Fill in all sections of the template with researched information:
     - Summary: Clear, actionable bug description
     - Environment: Current branch, version, and system details
     - Current Behavior: What the research reveals is happening
     - Expected Behavior: Based on documentation and code intent
     - Steps to Reproduce: Derived from code flow analysis
     - Error Messages: Any discovered from logs or code
     - Possible Solution: Based on pattern analysis (but don't implement)
     - Workaround: If discovered during research
     - Severity: Assess based on impact analysis
     - Related Issues: Found during research
     - Additional Context: All relevant findings

5. **Create Supporting Documentation**
   - Include code snippets from affected areas
   - Add file paths to relevant modules
   - Document any dependencies involved
   - Note test coverage gaps

## Output Requirements

- Generate a complete bug ticket in `thoughts/tickets/`
- Include all research findings in appropriate sections
- Provide clear reproduction steps
- Document but DO NOT attempt to fix the bug
- Return the path to the generated ticket file

## Constraints

- Focus exclusively on documenting the bug, not solving it
- Use parallel processing for all research tasks
- Ensure the bug ticket is comprehensive and actionable
- Maintain objectivity in severity assessment
- Include all relevant technical details from research