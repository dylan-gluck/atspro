---
allowed-tools: Task, Read, Write, Bash(ls:*), Bash(pwd:*), Bash(mkdir:*), Glob
description: Generate feature ticket from description or document using parallel research agents
argument-hint: <description|file-path>
model: opus
---

# Feature Ticket Generator

Generate a comprehensive feature ticket based on a description or document, using parallel subagents to research the codebase and create a detailed feature request.

## Initial Context

User input: $ARGUMENTS
Current directory: !`pwd`
Template exists: !`ls -la .claude/templates/feature-request.md 2>/dev/null || echo "Template not found"`

## Research Phase

Delegate the following research tasks to parallel subagents to gather comprehensive information about the feature:

### Task 1: Implementation Analysis
Use the codebase-analyzer agent to:
- Analyze existing codebase architecture
- Identify modules that would be affected by this feature
- Document current patterns and structures to follow
- Assess integration points and dependencies
- Map out potential data flow changes

### Task 2: Component Location
Use the codebase-locator agent to:
- Find relevant existing components and services
- Identify files that would need modification
- Locate similar features for reference
- Map API endpoints and database schemas involved
- Discover configuration and environment variables

### Task 3: Pattern Discovery
Use the codebase-pattern-finder agent to:
- Search for similar feature implementations
- Identify established patterns to follow
- Find reusable components or utilities
- Document coding conventions and standards
- Locate relevant test patterns and strategies

### Task 4: Vendor Documentation Research
Use the web-search-researcher agent to:
- Fetch relevant vendor documentation (SvelteKit, Better-Auth, Vercel AI SDK)
- Research best practices for similar features
- Find community examples and implementations
- Identify potential libraries or packages
- Check for security and performance considerations

### Task 5: Project Analysis
Use the research-project agent to:
- Review project roadmap and existing features
- Check for related tickets or discussions
- Examine project conventions and standards
- Gather business context and user requirements
- Review existing documentation and specifications

## Feature Ticket Generation

After completing the research phase, create a comprehensive feature ticket:

1. **Parse Input**
   - If $ARGUMENTS is a file path (starts with / or ./ or contains /), read the file
   - Otherwise, treat $ARGUMENTS as the feature description text

2. **Load Template**
   - Read the feature request template from `.claude/templates/feature-request.md`
   - If template is missing, use default feature request structure

3. **Synthesize Research**
   - Combine findings from all subagents
   - Identify implementation approach based on existing patterns
   - Document technical requirements and constraints
   - Note similar features and reusable components
   - Assess complexity and dependencies

4. **Generate Feature Ticket**
   - Ensure `thoughts/tickets/` directory exists (create if needed)
   - Create a unique filename: `thoughts/tickets/feature-{timestamp}-{brief-description}.md`
   - Fill in all sections of the template with researched information:
     - Summary: Clear, concise feature description
     - Problem Statement: Why this feature is needed based on research
     - Proposed Solution: High-level approach based on codebase patterns
     - User Stories: Derived from project context and requirements
     - Acceptance Criteria: Specific, measurable success conditions
     - Technical Considerations: Based on codebase analysis
       - Affected modules and components
       - Required database changes
       - API endpoints needed
       - Security implications
       - Performance considerations
     - UI/UX Mockups: Reference to design patterns found
     - Priority: Assess based on project context
     - Related Issues/PRs: Found during research
     - Additional Context: All relevant findings

5. **Create Supporting Documentation**
   - Include references to similar features
   - Document affected file paths
   - List required dependencies
   - Note testing requirements
   - Add implementation notes without actual code

## Output Requirements

- Generate a complete feature ticket in `thoughts/tickets/`
- Include all research findings in appropriate sections
- Provide clear acceptance criteria
- Document technical approach WITHOUT implementing
- Reference existing patterns and components
- Return the path to the generated ticket file

## Constraints

- Focus exclusively on documenting the feature, not implementing it
- Use parallel processing for all research tasks
- Ensure the feature ticket is comprehensive and actionable
- Base technical decisions on existing codebase patterns
- Include all relevant vendor documentation references
- Maintain alignment with project standards and conventions