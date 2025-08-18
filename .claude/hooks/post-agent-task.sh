#!/bin/bash

# Post-Agent Task Hook - Track agent completion and results

LOGS_DIR="$CLAUDE_PROJECT_DIR/.claude/logs"
SESSION_LOG="$LOGS_DIR/session_$(cat "$LOGS_DIR/current_session.id" 2>/dev/null || echo "unknown").log"
AGENT_TRACKING="$LOGS_DIR/agent_tracking.json"

# Extract agent information from stdin
TOOL_OUTPUT=$(cat)
AGENT_TYPE=$(echo "$TOOL_OUTPUT" | jq -r '.inputs.subagent_type // "unknown"' 2>/dev/null || echo "unknown")
TASK_DESC=$(echo "$TOOL_OUTPUT" | jq -r '.inputs.description // "unknown"' 2>/dev/null || echo "unknown")
SUCCESS=$(echo "$TOOL_OUTPUT" | jq -r '.success // true' 2>/dev/null || echo "true")
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Log agent completion
echo "$TIMESTAMP [AGENT_COMPLETE] Agent: $AGENT_TYPE | Task: $TASK_DESC | Success: $SUCCESS" >> "$SESSION_LOG"

# Update agent tracking JSON
if [ -f "$AGENT_TRACKING" ]; then
    TEMP_FILE=$(mktemp)
    jq --arg agent "$AGENT_TYPE" --arg task "$TASK_DESC" --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" --arg success "$SUCCESS" '
        .active_agents = (.active_agents | map(select(.agent != $agent))) |
        .completed_agents += [{
            "agent": $agent,
            "task": $task,
            "completed_at": $ts,
            "success": ($success == "true")
        }]
    ' "$AGENT_TRACKING" > "$TEMP_FILE" && mv "$TEMP_FILE" "$AGENT_TRACKING"
fi

# Store completion in memory if available
if command -v claude &> /dev/null; then
    echo "Agent $AGENT_TYPE completed: $TASK_DESC (Success: $SUCCESS)" | claude memory store "agent:$AGENT_TYPE:last_result" 2>/dev/null || true
fi

# Generate agent summary
ACTIVE_COUNT=$(jq -r '.active_agents | length' "$AGENT_TRACKING" 2>/dev/null || echo "0")
COMPLETED_COUNT=$(jq -r '.completed_agents | length' "$AGENT_TRACKING" 2>/dev/null || echo "0")

echo "Agent completed: $AGENT_TYPE | Active: $ACTIVE_COUNT | Completed: $COMPLETED_COUNT"