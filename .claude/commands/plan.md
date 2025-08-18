---
description: Create a comprehensive development plan using multiple agents
allowedTools: Task, TodoWrite, mcp__memory__*, mcp__sequential-thinking__sequentialthinking
---

# Development Planning

Create a comprehensive development plan for: $ARGUMENTS

## Planning Process

Use the orchestrator agent to:

1. **Analyze Requirements**
   - Launch doc-expert to research documentation
   - Launch fullstack-eng to analyze technical feasibility
   - Launch code-review to assess current code quality

2. **Create Implementation Plan**
   - Break down into manageable tasks
   - Identify dependencies and blockers
   - Estimate time and complexity

3. **Document Plan**
   - Store plan in memory for future reference
   - Create TODO list for tracking
   - Generate workflow definition if applicable

## Expected Output

- Detailed task breakdown with priorities
- Technical specifications and dependencies
- Risk assessment and mitigation strategies
- Timeline and milestone estimates

Launch the orchestrator to coordinate this planning process.