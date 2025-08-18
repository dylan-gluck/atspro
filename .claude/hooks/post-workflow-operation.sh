#!/bin/bash

# Post-Workflow Operation Hook - Update workflow progress using JSON context system

# Source the context library
source "$CLAUDE_PROJECT_DIR/.claude/lib/context.sh"

LOGS_DIR="$CLAUDE_PROJECT_DIR/.claude/logs"
SESSION_LOG="$LOGS_DIR/session_$(cat "$LOGS_DIR/current_session.id" 2>/dev/null || echo "unknown").log"

# Extract todo information from stdin
TOOL_OUTPUT=$(cat)
TODOS=$(echo "$TOOL_OUTPUT" | jq -r '.inputs.todos // "[]"' 2>/dev/null || echo "[]")
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Count todos by status
PENDING_COUNT=$(echo "$TODOS" | jq '[.[] | select(.status == "pending")] | length' 2>/dev/null || echo "0")
IN_PROGRESS_COUNT=$(echo "$TODOS" | jq '[.[] | select(.status == "in_progress")] | length' 2>/dev/null || echo "0")
COMPLETED_COUNT=$(echo "$TODOS" | jq '[.[] | select(.status == "completed")] | length' 2>/dev/null || echo "0")
TOTAL_COUNT=$(echo "$TODOS" | jq 'length' 2>/dev/null || echo "0")

# Log workflow operation completion
echo "$TIMESTAMP [WORKFLOW_COMPLETE] Todos updated - Pending: $PENDING_COUNT, In Progress: $IN_PROGRESS_COUNT, Completed: $COMPLETED_COUNT" >> "$SESSION_LOG"

# Find active workflow and update progress
ACTIVE_WORKFLOW=$(jq -r '.workflows[] | select(.status == "running") | .id' "$CLAUDE_PROJECT_DIR/.claude/context/context.json" 2>/dev/null | head -1)

if [ -n "$ACTIVE_WORKFLOW" ] && [ "$TOTAL_COUNT" -gt 0 ]; then
    # Calculate completion percentage
    COMPLETION_PERCENT=$((COMPLETED_COUNT * 100 / TOTAL_COUNT))
    
    # Update workflow progress
    update_workflow "$ACTIVE_WORKFLOW" "running" "$COMPLETED_COUNT"
    
    # Check if workflow is complete
    if [ "$PENDING_COUNT" -eq 0 ] && [ "$IN_PROGRESS_COUNT" -eq 0 ] && [ "$COMPLETED_COUNT" -gt 0 ]; then
        update_workflow "$ACTIVE_WORKFLOW" "completed" "$COMPLETED_COUNT"
        echo "$TIMESTAMP [WORKFLOW_COMPLETE] Workflow $ACTIVE_WORKFLOW completed with $COMPLETED_COUNT tasks" >> "$SESSION_LOG"
    fi
    
    echo "$TIMESTAMP [WORKFLOW_PROGRESS] Workflow $ACTIVE_WORKFLOW: $COMPLETION_PERCENT% complete ($COMPLETED_COUNT/$TOTAL_COUNT)" >> "$SESSION_LOG"
fi

# Update global workflow context with current todos
if [ -n "$ACTIVE_WORKFLOW" ]; then
    # Store current todo state in workflow context
    update_workflow_context "$ACTIVE_WORKFLOW" "currentTodos" "$TODOS"
    update_workflow_context "$ACTIVE_WORKFLOW" "completionRate" "$COMPLETION_PERCENT"
fi

echo "Workflow operation completed: $COMPLETED_COUNT/$TOTAL_COUNT tasks done"