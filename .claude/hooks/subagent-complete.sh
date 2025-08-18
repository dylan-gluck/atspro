#!/bin/bash

# Subagent Complete Hook - Track subagent completion and aggregate results

LOGS_DIR="$CLAUDE_PROJECT_DIR/.claude/logs"
SESSION_LOG="$LOGS_DIR/session_$(cat "$LOGS_DIR/current_session.id" 2>/dev/null || echo "unknown").log"

# Extract subagent completion details from stdin
SUBAGENT_OUTPUT=$(cat)
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Log subagent completion
echo "$TIMESTAMP [SUBAGENT_COMPLETE] Subagent completed execution" >> "$SESSION_LOG"

# Update workflow progress if this is part of a workflow
WORKFLOW_STATUS="$LOGS_DIR/workflow_status.json"
if [ -f "$WORKFLOW_STATUS" ]; then
    TEMP_FILE=$(mktemp)
    jq --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" '
        .subagents_completed += 1 |
        .last_subagent_completion = $ts
    ' "$WORKFLOW_STATUS" > "$TEMP_FILE" && mv "$TEMP_FILE" "$WORKFLOW_STATUS"
fi

# Generate session summary
AGENT_TRACKING="$LOGS_DIR/agent_tracking.json"
if [ -f "$AGENT_TRACKING" ]; then
    ACTIVE_AGENTS=$(jq -r '.active_agents | length' "$AGENT_TRACKING" 2>/dev/null || echo "0")
    COMPLETED_AGENTS=$(jq -r '.completed_agents | length' "$AGENT_TRACKING" 2>/dev/null || echo "0")
    
    echo "$TIMESTAMP [SESSION_STATUS] Active agents: $ACTIVE_AGENTS | Completed: $COMPLETED_AGENTS" >> "$SESSION_LOG"
    
    # If no active agents, session might be complete
    if [ "$ACTIVE_AGENTS" -eq 0 ] && [ "$COMPLETED_AGENTS" -gt 0 ]; then
        echo "$TIMESTAMP [SESSION_STATUS] All agents completed - session may be ready for review" >> "$SESSION_LOG"
    fi
fi

echo "Subagent completion tracked"