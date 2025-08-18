#!/bin/bash

# Pre-Agent Task Hook - Track agent initiation

LOGS_DIR="$CLAUDE_PROJECT_DIR/.claude/logs"
SESSION_LOG="$LOGS_DIR/session_$(cat "$LOGS_DIR/current_session.id" 2>/dev/null || echo "unknown").log"
AGENT_TRACKING="$LOGS_DIR/agent_tracking.json"

# Extract agent information from stdin (hook input)
TOOL_INPUT=$(cat)
AGENT_TYPE=$(echo "$TOOL_INPUT" | jq -r '.inputs.subagent_type // "unknown"' 2>/dev/null || echo "unknown")
TASK_DESC=$(echo "$TOOL_INPUT" | jq -r '.inputs.description // "unknown"' 2>/dev/null || echo "unknown")
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Log agent start
echo "$TIMESTAMP [AGENT_START] Agent: $AGENT_TYPE | Task: $TASK_DESC" >> "$SESSION_LOG"

# Update agent tracking JSON
if [ -f "$AGENT_TRACKING" ]; then
    TEMP_FILE=$(mktemp)
    jq --arg agent "$AGENT_TYPE" --arg task "$TASK_DESC" --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" '
        .active_agents += [{
            "agent": $agent,
            "task": $task,
            "started_at": $ts
        }]
    ' "$AGENT_TRACKING" > "$TEMP_FILE" && mv "$TEMP_FILE" "$AGENT_TRACKING"
fi

# Store in memory if available
if command -v claude &> /dev/null; then
    echo "Agent $AGENT_TYPE started: $TASK_DESC" | claude memory store "agent:$AGENT_TYPE:current_task" 2>/dev/null || true
fi

echo "Tracking agent start: $AGENT_TYPE"