#!/bin/bash

# Pre-Workflow Operation Hook - Track workflow and todo changes using JSON context system

# Source the context library
source "$CLAUDE_PROJECT_DIR/.claude/lib/context.sh"

LOGS_DIR="$CLAUDE_PROJECT_DIR/.claude/logs"
SESSION_LOG="$LOGS_DIR/session_$(cat "$LOGS_DIR/current_session.id" 2>/dev/null || echo "unknown").log"

# Extract todo information from stdin
TOOL_INPUT=$(cat)
TODOS=$(echo "$TOOL_INPUT" | jq -r '.inputs.todos // "[]"' 2>/dev/null || echo "[]")
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Count todos by status
PENDING_COUNT=$(echo "$TODOS" | jq '[.[] | select(.status == "pending")] | length' 2>/dev/null || echo "0")
IN_PROGRESS_COUNT=$(echo "$TODOS" | jq '[.[] | select(.status == "in_progress")] | length' 2>/dev/null || echo "0")
COMPLETED_COUNT=$(echo "$TODOS" | jq '[.[] | select(.status == "completed")] | length' 2>/dev/null || echo "0")

# Log workflow operation
echo "$TIMESTAMP [WORKFLOW_UPDATE] Todos - Pending: $PENDING_COUNT, In Progress: $IN_PROGRESS_COUNT, Completed: $COMPLETED_COUNT" >> "$SESSION_LOG"

# Detect if this is a new workflow (multiple pending tasks)
if [ "$PENDING_COUNT" -gt 3 ] && [ "$IN_PROGRESS_COUNT" -eq 0 ] && [ "$COMPLETED_COUNT" -eq 0 ]; then
    # Generate workflow ID from first todo content
    FIRST_TODO=$(echo "$TODOS" | jq -r '.[0].content // "unknown"' 2>/dev/null || echo "unknown")
    WORKFLOW_ID="workflow_$(echo "$FIRST_TODO" | tr ' ' '_' | tr '[:upper:]' '[:lower:]' | head -c 20)_$(date +%s)"
    
    # Start workflow tracking
    start_workflow "$WORKFLOW_ID" "$FIRST_TODO" "$PENDING_COUNT"
    
    echo "$TIMESTAMP [WORKFLOW_START] New workflow detected: $WORKFLOW_ID with $PENDING_COUNT tasks" >> "$SESSION_LOG"
fi

echo "Tracking workflow operation: $PENDING_COUNT pending, $IN_PROGRESS_COUNT in progress, $COMPLETED_COUNT completed"