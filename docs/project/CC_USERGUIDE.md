# Claude Code Agent Orchestration User Guide

## Overview

This guide explains how to use the Claude Code agent orchestration framework in the ATSPro project. The framework enables sophisticated multi-agent workflows, cross-agent communication, and persistent memory management for complex development tasks.

## Quick Start

### Basic Commands

```bash
# Plan a new feature
/plan implement user authentication with OAuth

# Execute feature implementation
/implement add profile picture upload to user settings

# Analyze codebase
/analyze backend API structure and patterns

# Run comprehensive tests
/test user onboarding flow

# Review recent changes
/review latest commits for security issues

# Debug an issue
/debug users cannot upload PDF files

# Manage workflows
/workflow list
/workflow execute feature-implementation

# Access memory
/memory list project:*
/memory store project:api_version "v2.0"
```

## Architecture Overview

### Components

1. **Orchestrator Agent** - Central coordinator that manages workflows
2. **Specialized Agents** - Domain experts for specific tasks
3. **Memory System** - Persistent storage for context and results
4. **Workflow Engine** - JSON-based workflow definitions
5. **Communication Protocol** - Structured message passing
6. **Slash Commands** - Quick access to common workflows

### Directory Structure

```
.claude/
├── agents/          # Agent definitions
│   ├── orchestrator.md
│   ├── fullstack-eng.md
│   ├── doc-expert.md
│   ├── code-review.md
│   ├── e2e-tester.md
│   └── ...
├── workflows/       # Workflow templates
│   ├── feature-implementation.json
│   ├── bug-fix.json
│   └── codebase-analysis.json
├── tasks/          # Reusable task definitions
│   ├── analyze-api.json
│   ├── implement-feature.json
│   └── run-tests.json
├── commands/       # Slash command definitions
│   ├── plan.md
│   ├── implement.md
│   └── ...
├── memory/         # SQLite memory database
└── memory-backup/  # Memory backups
```

## Working with Workflows

### Available Workflows

#### 1. Feature Implementation
Full stack feature development with research, implementation, testing, and review.

```bash
/implement user profile management system
```

**Workflow Steps:**
1. Research & Documentation (doc-expert)
2. Implementation (fullstack-eng)
3. Testing (e2e-tester)
4. Code Review (code-review)

#### 2. Bug Fix
Investigate and fix bugs with root cause analysis.

```bash
/debug login button not responding on mobile
```

**Workflow Steps:**
1. Investigation (fullstack-eng)
2. Fix Implementation (fullstack-eng)
3. Verification (e2e-tester)

#### 3. Codebase Analysis
Parallel analysis of code structure and quality.

```bash
/analyze entire codebase for technical debt
```

**Workflow Steps (Parallel):**
1. Documentation Analysis (doc-expert)
2. Frontend Analysis (frontend-eng)
3. Backend Analysis (fullstack-eng)
4. Quality Review (code-review)
5. Aggregation (orchestrator)

### Creating Custom Workflows

Create a new workflow in `.claude/workflows/custom-workflow.json`:

```json
{
  "id": "custom-workflow",
  "name": "Custom Workflow Name",
  "description": "What this workflow does",
  "version": "1.0.0",
  "steps": [
    {
      "id": "step-1",
      "name": "Step Name",
      "agent": "agent-name",
      "action": "action-type",
      "inputs": {
        "param": "$USER_INPUT"
      },
      "outputs": ["output1", "output2"],
      "memory_keys": ["memory_key"]
    }
  ]
}
```

## Agent Communication

### Message Protocol

Agents communicate using structured JSON messages:

```json
{
  "messageId": "uuid",
  "from": "sending-agent",
  "to": "receiving-agent",
  "type": "request|response|broadcast",
  "action": "analyze|implement|review|test",
  "payload": {
    "data": "task-specific data"
  },
  "metadata": {
    "workflowId": "workflow-id",
    "stepId": "step-id",
    "timestamp": "ISO-8601"
  }
}
```

### Memory Integration

Agents store and retrieve context from memory:

```python
# Store result in memory
memory.store("workflow:123:step:research:output", {
    "technical_spec": spec,
    "dependencies": deps
})

# Retrieve from memory
context = memory.get("workflow:123:step:research:output")
```

### Memory Key Conventions

- `workflow:{id}:state` - Workflow execution state
- `workflow:{id}:step:{step}:output` - Step outputs
- `agent:{name}:context` - Agent-specific context
- `task:{id}:result` - Task results
- `project:*` - Project-wide context

## Specialized Agents

### Orchestrator
Central coordinator for multi-agent workflows.
- Manages workflow execution
- Routes messages between agents
- Tracks progress and handles errors
- Aggregates results

### Full Stack Engineer (fullstack-eng)
Handles implementation across frontend and backend.
- TypeScript/React frontend development
- Python/FastAPI backend development
- Database schema design
- API integration

### Documentation Expert (doc-expert)
Researches and compiles technical documentation.
- Fetches vendor documentation
- Analyzes project docs
- Creates setup instructions
- Compiles reference materials

### Code Reviewer (code-review)
Performs comprehensive code quality analysis.
- Security vulnerability detection
- Performance optimization suggestions
- Best practices enforcement
- Technical debt identification

### E2E Tester (e2e-tester)
Executes comprehensive testing strategies.
- Unit test execution
- Integration testing
- End-to-end browser testing
- Performance testing

### Frontend Engineer (frontend-eng/ux-eng)
Specializes in UI/UX implementation.
- React component development
- State management
- Styling with Tailwind/shadcn
- Responsive design

### Log Monitor (log-monitor)
Monitors and analyzes system logs.
- Docker container log analysis
- Error pattern detection
- Performance monitoring
- Issue documentation

## Best Practices

### 1. Workflow Design
- Keep workflows focused on single objectives
- Use parallel steps when tasks are independent
- Always include error handling
- Store intermediate results in memory

### 2. Memory Management
- Use semantic key names
- Clean up temporary keys after workflow completion
- Store structured JSON data
- Regular backups to `.claude/memory-backup/`

### 3. Agent Usage
- Let orchestrator handle coordination
- Use specialized agents for domain tasks
- Provide clear task specifications
- Validate outputs before proceeding

### 4. Error Handling
- Define retry strategies in workflows
- Specify fallback agents
- Log errors to memory for debugging
- Provide clear error messages to users

### 5. Performance
- Launch parallel agents when possible
- Limit agent scope to necessary tasks
- Cache frequently accessed data in memory
- Clean up resources after completion

## Troubleshooting

### Common Issues

#### Workflow Fails to Start
```bash
# Check workflow definition
cat .claude/workflows/workflow-name.json

# Verify memory service is running
# Memory MCP should be configured in .mcp.json
```

#### Agent Not Responding
```bash
# Check agent definition
cat .claude/agents/agent-name.md

# Verify agent has required tools
# Check .claude/settings.local.json for permissions
```

#### Memory Access Issues
```bash
# Ensure memory directories exist
ls -la .claude/memory/
ls -la .claude/memory-backup/

# Check MCP configuration
cat .mcp.json | grep memory
```

#### Communication Failures
```bash
# Check message format in memory
/memory get communication:queue:*

# Verify workflow state
/memory get workflow:*:state
```

## Advanced Usage

### Chaining Workflows

Execute multiple workflows in sequence:

```bash
# First, analyze the codebase
/analyze backend architecture

# Then plan improvements based on analysis
/plan refactor based on @memory:quality_report

# Finally implement the plan
/implement @memory:refactoring_plan
```

### Custom Task Definitions

Create reusable tasks in `.claude/tasks/`:

```json
{
  "id": "custom-task",
  "name": "Task Name",
  "agent": "best-suited-agent",
  "inputs": {
    "param1": { "type": "string", "required": true }
  },
  "outputs": {
    "result": { "type": "object" }
  },
  "instructions": "Detailed instructions for the agent",
  "memory_keys": ["storage_keys"]
}
```

### Hooks Integration

Configure hooks in `.claude/settings.local.json`:

```json
{
  "hooks": {
    "PreToolUse": [{
      "matcher": "Task",
      "hooks": [{
        "type": "command",
        "command": "echo 'Starting agent task'"
      }]
    }],
    "SubagentStop": [{
      "hooks": [{
        "type": "command",
        "command": ".claude/hooks/store-agent-results.sh"
      }]
    }]
  }
}
```

### Parallel Agent Execution

Launch multiple agents simultaneously:

```python
# In orchestrator agent
tasks = [
    Task("doc-expert", "Research API documentation"),
    Task("frontend-eng", "Analyze UI components"),
    Task("fullstack-eng", "Review backend services")
]
# All tasks execute in parallel
results = execute_parallel(tasks)
```

## Project-Specific Features

### ATSPro Integration

The orchestration framework is configured for ATSPro's architecture:

- **Frontend**: Next.js 15, TypeScript, Tailwind, shadcn/ui
- **Backend**: FastAPI, Python 3.11+, OpenAI Agents SDK
- **Databases**: PostgreSQL, ArangoDB, Redis
- **Testing**: pytest (API), vitest (Web), Puppeteer (E2E)

### Development Workflows

#### Add New Feature
```bash
/plan add AI-powered resume scoring
/implement resume scoring with job matching
/test resume scoring functionality
```

#### Fix Production Bug
```bash
/debug production API timeout errors
# Orchestrator will investigate logs, identify cause, implement fix
```

#### Optimize Performance
```bash
/analyze API response times
/plan optimization based on bottlenecks
/implement caching and query optimization
```

## Command Reference

### Planning & Design
- `/plan <description>` - Create development plan
- `/analyze <scope>` - Analyze codebase

### Implementation
- `/implement <feature>` - Execute feature workflow
- `/debug <issue>` - Fix bugs with investigation

### Quality Assurance
- `/test <scope>` - Run comprehensive tests
- `/review <target>` - Perform code review

### Workflow Management
- `/workflow list` - Show available workflows
- `/workflow execute <name>` - Run specific workflow
- `/workflow status <id>` - Check execution status

### Memory Operations
- `/memory store <key> <value>` - Store context
- `/memory get <key>` - Retrieve stored data
- `/memory list [pattern]` - List memory keys
- `/memory clear <key>` - Remove stored data

## Tips for Effective Use

1. **Start with Planning**: Use `/plan` before implementing complex features
2. **Leverage Memory**: Store important context for reuse across sessions
3. **Parallel Analysis**: Use `/analyze` for quick codebase understanding
4. **Iterative Development**: Chain workflows for incremental progress
5. **Monitor Progress**: Check workflow status and agent outputs
6. **Document Decisions**: Store architectural decisions in memory
7. **Test Early**: Include testing in your workflow definitions
8. **Review Regularly**: Use `/review` after significant changes

## Getting Help

- View available commands: `/help`
- List workflows: `/workflow list`
- Check agent capabilities: View `.claude/agents/*.md`
- Review examples: Check `.claude/workflows/*.json`
- Report issues: https://github.com/anthropics/claude-code/issues

## Summary

The Claude Code orchestration framework transforms complex development tasks into manageable, automated workflows. By combining specialized agents, persistent memory, and structured communication, it enables sophisticated multi-step operations while maintaining context and ensuring quality.

Key takeaways:
- Use the orchestrator for complex multi-agent tasks
- Leverage specialized agents for domain expertise
- Store important context in memory for reuse
- Define custom workflows for repetitive tasks
- Monitor progress and handle errors gracefully

Start with simple commands like `/plan` and `/analyze`, then progress to custom workflows as you become familiar with the system.