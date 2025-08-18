---
description: Execute comprehensive testing workflow
allowedTools: Task, Bash, mcp__puppeteer__*, mcp__docker-mcp__get-logs, TodoWrite
---

# Test Execution

Run comprehensive tests for: $ARGUMENTS

## Testing Workflow

Launch the e2e-tester agent to execute tests:

```bash
# Backend tests
cd apps/api && uv run pytest --cov

# Frontend tests
cd apps/web && pnpm test

# E2E tests with Puppeteer
```

## Test Scope

1. **Unit Tests**
   - Backend Python tests
   - Frontend component tests
   - Service layer tests

2. **Integration Tests**
   - API endpoint tests
   - Database integration
   - External service mocks

3. **E2E Tests**
   - User flow testing
   - Form submissions
   - Navigation testing

4. **Performance Tests**
   - Load testing
   - Response time analysis
   - Memory usage

## Output

- Test results summary
- Coverage report
- Failed test details
- Performance metrics
- Screenshots of failures