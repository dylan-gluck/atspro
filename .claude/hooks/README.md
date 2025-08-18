# Claude Code Hooks - Cross-Agent Observability

This directory contains hooks for monitoring and tracking multi-agent workflows in Claude Code.

## Hook Configuration

Hooks are configured in `.claude/hooks.json` and provide observability for:

- **Agent lifecycle** - Track agent creation, execution, and completion
- **Memory operations** - Monitor context storage and retrieval
- **Code changes** - Log file modifications and edits
- **Session activity** - Track user interactions and workflow progress

## Hook Scripts

### Session Management
- `session-start.sh` - Initialize session tracking and logging
- `subagent-complete.sh` - Track subagent completion and aggregate results

### Agent Observability  
- `pre-agent-task.sh` - Log agent initiation with task details
- `post-agent-task.sh` - Track agent completion and success status

### Memory Tracking
- `pre-memory-operation.sh` - Monitor memory store/retrieve operations
- `post-memory-operation.sh` - Log memory operation completion

### Code Change Monitoring
- `code-change-tracker.sh` - Track file modifications (Write/Edit/MultiEdit)
- `prompt-tracker.sh` - Monitor user prompt submissions

### Monitoring
- `monitor.sh` - Real-time dashboard for observability data

## Usage

### View Real-Time Dashboard
```bash
./.claude/hooks/monitor.sh
```

### Check Session Logs
```bash
# Current session log
cat .claude/logs/session_$(cat .claude/logs/current_session.id).log

# All logs
ls .claude/logs/
```

### View Agent Activity
```bash
# Agent tracking JSON
jq '.' .claude/logs/agent_tracking.json

# Memory operations
jq '.' .claude/logs/memory_operations.json

# Code changes
jq '.' .claude/logs/code_changes.json
```

## Log Structure

### Session Logs (`session_YYYYMMDD_HHMMSS.log`)
```
2025-08-18 12:34:56 [SESSION_START] Session initialized: 20250818_123456
2025-08-18 12:35:01 [AGENT_START] Agent: fullstack-eng | Task: Implement user auth
2025-08-18 12:35:15 [MEMORY_PRE] Operation: store | Key: auth_spec
2025-08-18 12:35:30 [CODE_CHANGE] Tool: Write | File: auth.py
2025-08-18 12:36:00 [AGENT_COMPLETE] Agent: fullstack-eng | Success: true
```

### Agent Tracking JSON
```json
{
  "active_agents": [
    {
      "agent": "frontend-eng",
      "task": "Create login form",
      "started_at": "2025-08-18T12:35:00Z"
    }
  ],
  "completed_agents": [
    {
      "agent": "fullstack-eng", 
      "task": "Implement user auth",
      "completed_at": "2025-08-18T12:36:00Z",
      "success": true
    }
  ]
}
```

## Installation

To enable hooks in your Claude Code settings:

1. Copy hooks configuration to your settings:
```bash
# Add to ~/.claude/settings.json
cat .claude/hooks.json
```

2. Ensure scripts are executable:
```bash
chmod +x .claude/hooks/*.sh
```

3. Test hooks with a simple operation:
```bash
# This should trigger hooks and create logs
echo "test" > /tmp/test.txt
```

## Integration with Workflows

Hooks automatically integrate with workflow execution:

- **Workflow start** - Session initialization and agent tracking
- **Step execution** - Agent lifecycle and memory operations  
- **Progress tracking** - Code changes and completion status
- **Workflow completion** - Final summaries and cleanup

The observability data enables:
- **Debugging** - Track where workflows fail or slow down
- **Optimization** - Identify bottlenecks in agent coordination  
- **Auditing** - Complete history of all operations and changes
- **Monitoring** - Real-time visibility into active workflows