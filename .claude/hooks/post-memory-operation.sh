#!/bin/bash

# Post-Memory Operation Hook - Track memory operation completion

LOGS_DIR="$CLAUDE_PROJECT_DIR/.claude/logs"
SESSION_LOG="$LOGS_DIR/session_$(cat "$LOGS_DIR/current_session.id" 2>/dev/null || echo "unknown").log"

# Extract memory operation results from stdin
MEMORY_OUTPUT=$(cat)
OPERATION=$(echo "$MEMORY_OUTPUT" | jq -r '.tool_name // "unknown"' 2>/dev/null | sed 's/mcp__memory__//')
SUCCESS=$(echo "$MEMORY_OUTPUT" | jq -r '.success // true' 2>/dev/null)
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Log memory operation completion
echo "$TIMESTAMP [MEMORY_POST] Operation: $OPERATION | Success: $SUCCESS" >> "$SESSION_LOG"

# Track memory operations in summary
MEMORY_SUMMARY="$LOGS_DIR/memory_operations.json"
if [ ! -f "$MEMORY_SUMMARY" ]; then
    echo '{"operations": [], "total_count": 0}' > "$MEMORY_SUMMARY"
fi

TEMP_FILE=$(mktemp)
jq --arg op "$OPERATION" --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" --arg success "$SUCCESS" '
    .operations += [{
        "operation": $op,
        "timestamp": $ts,
        "success": ($success == "true")
    }] |
    .total_count = (.operations | length)
' "$MEMORY_SUMMARY" > "$TEMP_FILE" && mv "$TEMP_FILE" "$MEMORY_SUMMARY"

# Count recent operations
RECENT_OPS=$(jq -r '.operations | map(select(.timestamp > (now - 3600 | strftime("%Y-%m-%dT%H:%M:%SZ")))) | length' "$MEMORY_SUMMARY" 2>/dev/null || echo "0")

echo "Memory operation completed: $OPERATION | Recent ops: $RECENT_OPS"