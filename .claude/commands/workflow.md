---
description: List and execute custom workflows
allowedTools: Task, Read, LS, mcp__memory__*
---

# Workflow Management

Manage and execute workflows: $ARGUMENTS

## Available Commands

### List Workflows
Show all available workflow templates:
```bash
ls .claude/workflows/
```

### Execute Workflow
Run a specific workflow by name:
```
/workflow execute <workflow-name> [parameters]
```

### Workflow Status
Check current workflow execution status:
```
/workflow status <workflow-id>
```

### Create Workflow
Define a new workflow template:
```
/workflow create <name> <definition>
```

## Available Workflows

1. **feature-implementation**
   - Full stack feature development
   - Includes research, implementation, testing, review

2. **bug-fix**
   - Bug investigation and resolution
   - Root cause analysis, fix, verification

3. **codebase-analysis**
   - Comprehensive code analysis
   - Parallel analysis of all stack layers

## Workflow Execution

Launch the orchestrator agent to:
1. Load the specified workflow
2. Validate inputs
3. Execute steps in sequence or parallel
4. Track progress in memory
5. Report results