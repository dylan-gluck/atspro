---
description: Debug issues using multi-agent investigation
allowedTools: Task, Bash, mcp__docker-mcp__get-logs, mcp__language-server-ts__*, mcp__language-server-py__*, TodoWrite
---

# Debug Investigation

Debug the following issue: $ARGUMENTS

## Debug Workflow

Launch the orchestrator to coordinate debugging:

```json
{
  "workflow": "bug-fix",
  "inputs": {
    "bug_description": "$ARGUMENTS",
    "priority": "high"
  }
}
```

## Investigation Process

1. **Log Analysis** (log-monitor)
   - Check Docker container logs
   - Identify error patterns
   - Track error frequency

2. **Code Investigation** (fullstack-eng)
   - Trace execution flow
   - Identify problematic code
   - Check recent changes

3. **Root Cause Analysis** (orchestrator)
   - Correlate findings
   - Identify root cause
   - Propose solutions

4. **Fix Implementation** (fullstack-eng)
   - Implement solution
   - Add error handling
   - Update tests

5. **Verification** (e2e-tester)
   - Test the fix
   - Check for regressions
   - Validate error resolution

## Debug Commands

- Check logs: `docker-compose logs -f [service]`
- Run specific test: `uv run pytest -xvs [test_file]`
- Trace execution: Use language server references
- Monitor memory: Check memory consumption patterns

## Output

- Root cause identification
- Fix implementation
- Test verification
- Prevention recommendations