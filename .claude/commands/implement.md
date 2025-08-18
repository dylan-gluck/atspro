---
description: Execute full stack feature implementation workflow
allowedTools: Task, TodoWrite, mcp__memory__*, Bash, Read, Write, Edit, MultiEdit
---

# Feature Implementation

Implement the following feature: $ARGUMENTS

## Workflow Execution

Launch the orchestrator agent to execute the `feature-implementation` workflow:

```json
{
  "workflow": "feature-implementation",
  "inputs": {
    "requirements": "$ARGUMENTS",
    "scope": "full-stack"
  }
}
```

## Workflow Steps

1. **Research & Documentation** (doc-expert)
   - Gather requirements and dependencies
   - Create technical specifications
   - Define API contracts

2. **Implementation** (fullstack-eng)
   - Build backend endpoints
   - Create frontend components
   - Implement data models

3. **Testing** (e2e-tester)
   - Run unit tests
   - Execute e2e tests
   - Generate coverage report

4. **Code Review** (code-review)
   - Review implementation quality
   - Check for security issues
   - Validate best practices

The orchestrator will coordinate all agents and track progress.