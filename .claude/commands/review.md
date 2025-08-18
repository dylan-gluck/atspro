---
description: Perform comprehensive code review
allowedTools: Task, Read, Grep, mcp__language-server-ts__diagnostics, mcp__language-server-py__diagnostics
---

# Code Review

Review code changes for: $ARGUMENTS

## Review Process

Launch the code-review agent to analyze:

1. **Code Quality**
   - Readability and maintainability
   - Adherence to project conventions
   - Code duplication
   - Complexity metrics

2. **Security Review**
   - Input validation
   - Authentication/authorization
   - SQL injection risks
   - XSS vulnerabilities
   - Sensitive data exposure

3. **Performance Review**
   - Database query optimization
   - Caching strategies
   - Bundle size impact
   - Render performance

4. **Best Practices**
   - Error handling
   - Type safety
   - Test coverage
   - Documentation

## Severity Levels

- **Critical**: Must fix before merge
- **High**: Should fix before merge
- **Medium**: Consider fixing
- **Low**: Nice to have improvements

## Output Format

Generate a structured review report with:
- Issue list by severity
- Suggested improvements
- Code examples
- Approval recommendation