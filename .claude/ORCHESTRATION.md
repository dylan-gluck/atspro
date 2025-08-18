# Claude Code Agent Orchestration Framework

## Overview
A comprehensive orchestration system for coordinating multi-agent workflows in Claude Code, featuring a **custom JSON-based context system** that enables complex development tasks through agent collaboration, structured communication, and real-time progress tracking.

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

# Check context status
/context status
```

## Key Components

### 1. JSON Context System
**NEW**: Custom JSON-based agent coordination replacing MCP memory tools:
- Real-time agent lifecycle tracking
- Structured workflow state management
- Cross-agent communication via shared context
- Rich metadata and results storage
- Session metrics and progress monitoring

### 2. Orchestrator Agent
Central coordinator managing workflows, routing messages, and tracking progress via the JSON context system.

### 3. Workflow Engine
Enhanced JSON-based workflow definitions in `.claude/workflows/`:
- `feature-implementation.json` - Full stack development with context operations
- `bug-fix.json` - Debug and fix issues
- `codebase-analysis.json` - Comprehensive parallel analysis
- `e2e-user-journey-test.json` - End-to-end testing workflows

### 4. Specialized Agents
- `fullstack-eng` - Full stack implementation across frontend/backend
- `doc-expert` - Documentation research and compilation
- `code-review` - Code quality analysis and security review
- `e2e-tester` - End-to-end testing with Playwright
- `frontend-eng/ux-eng` - UI/UX implementation with React/shadcn
- `log-monitor` - Docker log monitoring and analysis

### 5. Context Management Commands
Enhanced commands in `.claude/commands/`:
- `/plan` - Development planning
- `/implement` - Feature implementation
- `/analyze` - Codebase analysis
- `/test` - Test execution
- `/review` - Code review
- `/debug` - Issue investigation
- `/workflow` - Workflow management
- `/context` - **NEW**: JSON context operations

## Architecture

```
.claude/
├── context/         # JSON context system (NEW)
│   ├── context.json # Main context state
│   └── schema.json  # JSON schema definitions
├── lib/             # Context management library (NEW)
│   └── context.sh   # jq-based context functions
├── agents/          # Agent definitions with context support
├── workflows/       # Enhanced JSON workflow templates
├── tasks/          # Reusable task definitions
├── commands/       # Slash command definitions
├── hooks/          # Context-aware event handlers
├── logs/           # Legacy compatibility logs
└── memory/         # Legacy memory system (being phased out)
```

## JSON Context System

### Context Schema
```json
{
  "session": {
    "sessionId": "20250818_011603",
    "startTime": "2025-08-18T01:16:03Z",
    "activeWorkflows": [],
    "metrics": {
      "totalAgents": 1,
      "completedTasks": 5,
      "codeChanges": 27
    }
  },
  "workflows": [{
    "id": "feature-implementation",
    "status": "running",
    "currentStep": 2,
    "totalSteps": 4,
    "sharedContext": {}
  }],
  "agents": [{
    "id": "fullstack-eng_123456",
    "type": "fullstack-eng",
    "status": "completed",
    "task": "Implement user authentication",
    "results": {
      "summary": "Authentication system implemented",
      "findings": [],
      "recommendations": []
    }
  }]
}
```

### Context Operations
All context management uses `jq` for JSON manipulation:

```bash
# Source context library
source .claude/lib/context.sh

# Update agent status
update_agent "agent_id" "fullstack-eng" "completed" "task description"

# Share data between agents
update_workflow_context "workflow_id" "api_endpoints" "$ENDPOINTS_JSON"

# Get shared context
get_workflow_context "workflow_id"

# Increment metrics
increment_metric "linesAnalyzed" 1500
```

## Usage Examples

### Feature Development
```bash
/implement user profile management
# Executes: Research → Implementation → Testing → Review
# All progress tracked in JSON context system
```

### Bug Investigation
```bash
/debug login failures on mobile
# Executes: Investigation → Fix → Verification
# Context shared between debugging agents
```

### Parallel Analysis
```bash
/analyze full codebase
# Runs multiple agents in parallel with shared findings
# Results aggregated in structured JSON format
```

### Context Management
```bash
# Check current status
/context status

# View agent results
/context results agent_id

# Get shared workflow data
/context get database_schema
```

## Benefits

1. **Structured Communication** - JSON schema-based agent coordination
2. **Real-time Tracking** - Live agent lifecycle and progress monitoring
3. **Rich Metadata** - Comprehensive results with findings and recommendations
4. **Cross-Agent Sharing** - Seamless data exchange between specialized agents
5. **Session Persistence** - Full workflow state preserved across interactions
6. **Performance Monitoring** - Built-in metrics and progress tracking

## Migration from MCP Memory

The new JSON context system replaces MCP memory tools:

| Old MCP Pattern | New JSON Pattern |
|---|---|
| `mcp__memory__store` | `update_workflow_context` |
| `mcp__memory__get` | `get_workflow_context` |
| `mcp__memory__track_progress` | Automatic via hooks |
| `mcp__memory__log_decision` | `add_agent_results` |

## Getting Started

1. **JSON Context System** - Automatically initialized on session start
2. **Hook Integration** - Agent tracking via hooks using `jq`
3. **Workflow Templates** - Updated with context operations
4. **Command Interface** - New `/context` commands for management

Start with `/context status` to see the current state or `/plan` to create a development plan.