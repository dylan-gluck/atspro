---
description: Run comprehensive codebase analysis
allowedTools: Task, mcp__memory__*, Glob, Grep, Read, mcp__language-server-ts__*, mcp__language-server-py__*
---

# Codebase Analysis

Analyze the codebase with focus on: $ARGUMENTS

## Analysis Workflow

As the orchestrator, I will execute the `codebase-analysis` workflow:

```json
{
  "workflow": "codebase-analysis",
  "inputs": {
    "scope": "$ARGUMENTS",
    "analysis_type": "comprehensive"
  }
}
```

## Parallel Analysis Tasks

I will launch multiple agents in parallel:

1. **Documentation Analysis** (doc-expert)
   - API documentation completeness
   - Missing documentation
   - Documentation quality

2. **Frontend Analysis** (frontend-eng)
   - Component structure
   - State management patterns
   - Performance bottlenecks

3. **Backend Analysis** (fullstack-eng)
   - API design patterns
   - Database schema
   - Service architecture

4. **Quality Analysis** (code-review)
   - Code quality metrics
   - Technical debt
   - Security vulnerabilities

## Output

Results will be aggregated and stored in memory with a comprehensive report.