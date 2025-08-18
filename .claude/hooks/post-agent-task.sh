#!/bin/bash

# Post-Agent Task Hook - Track agent completion and results using JSON context system

# Source the context library
source "$CLAUDE_PROJECT_DIR/.claude/lib/context.sh"

LOGS_DIR="$CLAUDE_PROJECT_DIR/.claude/logs"
SESSION_LOG="$LOGS_DIR/session_$(cat "$LOGS_DIR/current_session.id" 2>/dev/null || echo "unknown").log"
AGENT_TRACKING="$LOGS_DIR/agent_tracking.json"

# Extract agent information from stdin
TOOL_OUTPUT=$(cat)
AGENT_TYPE=$(echo "$TOOL_OUTPUT" | jq -r '.inputs.subagent_type // "unknown"' 2>/dev/null || echo "unknown")
TASK_DESC=$(echo "$TOOL_OUTPUT" | jq -r '.inputs.description // "unknown"' 2>/dev/null || echo "unknown")
SUCCESS=$(echo "$TOOL_OUTPUT" | jq -r '.success // true' 2>/dev/null || echo "true")
RESULT_TEXT=$(echo "$TOOL_OUTPUT" | jq -r '.result // ""' 2>/dev/null || echo "")
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Retrieve agent ID from pre-hook
AGENT_ID=""
if [ -f "/tmp/claude_agent_id_$$" ]; then
    AGENT_ID=$(cat "/tmp/claude_agent_id_$$")
    rm -f "/tmp/claude_agent_id_$$"
else
    # Fallback: find most recent agent of this type
    AGENT_ID=$(jq -r --arg type "$AGENT_TYPE" '.agents[] | select(.type == $type and .status == "running") | .id' "$CLAUDE_PROJECT_DIR/.claude/context/context.json" | tail -1)
fi

# Log agent completion
echo "$TIMESTAMP [AGENT_COMPLETE] Agent: $AGENT_TYPE | ID: $AGENT_ID | Task: $TASK_DESC | Success: $SUCCESS" >> "$SESSION_LOG"

# Update new JSON context system
if [ -n "$AGENT_ID" ]; then
    if [ "$SUCCESS" = "true" ]; then
        update_agent "$AGENT_ID" "$AGENT_TYPE" "completed" "$TASK_DESC"
        increment_metric "completedTasks" 1
    else
        update_agent "$AGENT_ID" "$AGENT_TYPE" "failed" "$TASK_DESC"
    fi
    
    # Add results if available
    if [ -n "$RESULT_TEXT" ]; then
        add_agent_results "$AGENT_ID" "$RESULT_TEXT" "[]"
    fi
fi

# Update legacy agent tracking JSON (for backward compatibility)
if [ -f "$AGENT_TRACKING" ]; then
    TEMP_FILE=$(mktemp)
    jq --arg agent "$AGENT_TYPE" --arg task "$TASK_DESC" --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" --arg success "$SUCCESS" --arg id "$AGENT_ID" '
        .active_agents = (.active_agents | map(select(.agent != $agent))) |
        .completed_agents += [{
            "id": $id,
            "agent": $agent,
            "task": $task,
            "completed_at": $ts,
            "success": ($success == "true")
        }]
    ' "$AGENT_TRACKING" > "$TEMP_FILE" && mv "$TEMP_FILE" "$AGENT_TRACKING"
fi

# Generate agent summary using new context system
ACTIVE_COUNT=$(jq -r '.agents | map(select(.status == "running")) | length' "$CLAUDE_PROJECT_DIR/.claude/context/context.json" 2>/dev/null || echo "0")
COMPLETED_COUNT=$(jq -r '.agents | map(select(.status == "completed")) | length' "$CLAUDE_PROJECT_DIR/.claude/context/context.json" 2>/dev/null || echo "0")

echo "Agent completed: $AGENT_TYPE ($AGENT_ID) | Active: $ACTIVE_COUNT | Completed: $COMPLETED_COUNT"