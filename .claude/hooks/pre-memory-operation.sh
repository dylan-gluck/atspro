#!/bin/bash

# Pre-Memory Operation Hook - Track memory writes and decisions

LOGS_DIR="$CLAUDE_PROJECT_DIR/.claude/logs"
SESSION_LOG="$LOGS_DIR/session_$(cat "$LOGS_DIR/current_session.id" 2>/dev/null || echo "unknown").log"

# Extract memory operation details from stdin
MEMORY_INPUT=$(cat)
OPERATION=$(echo "$MEMORY_INPUT" | jq -r '.tool_name // "unknown"' 2>/dev/null | sed 's/mcp__memory__//')
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Log memory operation start
echo "$TIMESTAMP [MEMORY_PRE] Operation: $OPERATION" >> "$SESSION_LOG"

# Extract specific operation details
case "$OPERATION" in
    "store")
        KEY=$(echo "$MEMORY_INPUT" | jq -r '.inputs.key // "unknown"' 2>/dev/null)
        echo "$TIMESTAMP [MEMORY_PRE] Storing key: $KEY" >> "$SESSION_LOG"
        ;;
    "track_progress")
        ACTION=$(echo "$MEMORY_INPUT" | jq -r '.inputs.action // "unknown"' 2>/dev/null)
        echo "$TIMESTAMP [MEMORY_PRE] Tracking progress: $ACTION" >> "$SESSION_LOG"
        ;;
    "log_decision")
        TITLE=$(echo "$MEMORY_INPUT" | jq -r '.inputs.title // "unknown"' 2>/dev/null)
        echo "$TIMESTAMP [MEMORY_PRE] Logging decision: $TITLE" >> "$SESSION_LOG"
        ;;
esac

echo "Pre-memory operation: $OPERATION"