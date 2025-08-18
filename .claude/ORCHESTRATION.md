# Claude Code Agent Orchestration Framework

## Overview
A comprehensive orchestration system for coordinating multi-agent workflows in Claude Code, enabling complex development tasks through agent collaboration, persistent memory, and structured communication.

## Quick Start

```bash
# Plan a feature
/plan user authentication system

# Implement with full workflow
/implement profile picture upload

# Analyze codebase
/analyze backend architecture

# Debug issues
/debug PDF upload failures
```

## Key Components

### 1. Orchestrator Agent
Central coordinator managing workflows, routing messages, and tracking progress.

### 2. Workflow Engine
JSON-based workflow definitions in `.claude/workflows/`:
- `feature-implementation.json` - Full stack development
- `bug-fix.json` - Debug and fix issues
- `codebase-analysis.json` - Comprehensive analysis

### 3. Memory System
Persistent context storage via MCP memory server:
- Workflow state tracking
- Agent communication
- Result aggregation

### 4. Specialized Agents
- `fullstack-eng` - Full stack implementation
- `doc-expert` - Documentation research
- `code-review` - Quality analysis
- `e2e-tester` - Comprehensive testing
- `frontend-eng` - UI/UX development
- `log-monitor` - System monitoring

### 5. Slash Commands
Project-level commands in `.claude/commands/`:
- `/plan` - Development planning
- `/implement` - Feature implementation
- `/analyze` - Codebase analysis
- `/test` - Test execution
- `/review` - Code review
- `/debug` - Issue investigation
- `/workflow` - Workflow management
- `/memory` - Memory operations

## Architecture

```
.claude/
├── agents/          # Agent definitions with orchestration support
├── workflows/       # JSON workflow templates
├── tasks/          # Reusable task definitions
├── commands/       # Slash command definitions
├── hooks/          # Orchestration event handlers
├── memory/         # SQLite memory database
└── memory-backup/  # Memory backups
```

## Communication Protocol

```json
{
  "messageId": "uuid",
  "from": "agent-name",
  "to": "agent-name",
  "type": "request|response",
  "action": "analyze|implement|review",
  "payload": {},
  "metadata": {
    "workflowId": "id",
    "stepId": "id"
  }
}
```

## Usage Examples

### Feature Development
```bash
/implement user profile management
# Executes: Research → Implementation → Testing → Review
```

### Bug Investigation
```bash
/debug login failures on mobile
# Executes: Investigation → Fix → Verification
```

### Parallel Analysis
```bash
/analyze full codebase
# Runs multiple agents in parallel for comprehensive analysis
```

## Benefits

1. **Automated Workflows** - Complex tasks executed systematically
2. **Agent Collaboration** - Specialized agents work together
3. **Persistent Memory** - Context preserved across sessions
4. **Parallel Execution** - Multiple agents work simultaneously
5. **Error Recovery** - Built-in retry and fallback mechanisms

## See Also

- Full user guide: `docs/project/CC_USERGUIDE.md`
- Workflow definitions: `.claude/workflows/`
- Agent specifications: `.claude/agents/`
- Task templates: `.claude/tasks/`

## Getting Started

1. Memory is configured in `.mcp.json`
2. Agents updated with orchestration support
3. Workflows ready to execute
4. Slash commands available for use

Start with `/plan` to create a development plan or `/analyze` to understand the codebase.