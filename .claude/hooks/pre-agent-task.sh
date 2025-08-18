#!/bin/bash

# Pre-Agent Task Hook - Track agent initiation using JSON context system

# Source the context library
source "$CLAUDE_PROJECT_DIR/.claude/lib/context.sh"

LOGS_DIR="$CLAUDE_PROJECT_DIR/.claude/logs"
SESSION_LOG="$LOGS_DIR/session_$(cat "$LOGS_DIR/current_session.id" 2>/dev/null || echo "unknown").log"
AGENT_TRACKING="$LOGS_DIR/agent_tracking.json"

# Extract agent information from stdin (hook input)
TOOL_INPUT=$(cat)
AGENT_TYPE=$(echo "$TOOL_INPUT" | jq -r '.inputs.subagent_type // "unknown"' 2>/dev/null || echo "unknown")
TASK_DESC=$(echo "$TOOL_INPUT" | jq -r '.inputs.description // "unknown"' 2>/dev/null || echo "unknown")
FULL_PROMPT=$(echo "$TOOL_INPUT" | jq -r '.inputs.prompt // ""' 2>/dev/null || echo "")
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Generate unique agent ID
AGENT_ID="${AGENT_TYPE}_$(date +%s)_$$"

# Log agent start
echo "$TIMESTAMP [AGENT_START] Agent: $AGENT_TYPE | ID: $AGENT_ID | Task: $TASK_DESC" >> "$SESSION_LOG"

# Update new JSON context system
update_agent "$AGENT_ID" "$AGENT_TYPE" "running" "$TASK_DESC"

# Store the agent ID for post-hook to reference
echo "$AGENT_ID" > "/tmp/claude_agent_id_$$"

# Update legacy agent tracking JSON (for backward compatibility)
if [ -f "$AGENT_TRACKING" ]; then
    TEMP_FILE=$(mktemp)
    jq --arg agent "$AGENT_TYPE" --arg task "$TASK_DESC" --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" --arg id "$AGENT_ID" '
        .active_agents += [{
            "id": $id,
            "agent": $agent,
            "task": $task,
            "started_at": $ts
        }]
    ' "$AGENT_TRACKING" > "$TEMP_FILE" && mv "$TEMP_FILE" "$AGENT_TRACKING"
fi

echo "Tracking agent start: $AGENT_TYPE ($AGENT_ID)"