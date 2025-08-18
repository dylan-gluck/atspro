#!/bin/bash

# Monitor Script - View real-time observability data

LOGS_DIR="$CLAUDE_PROJECT_DIR/.claude/logs"
CURRENT_SESSION=$(cat "$LOGS_DIR/current_session.id" 2>/dev/null || echo "unknown")

echo "=== Claude Code Multi-Agent Observability Dashboard ==="
echo "Session: $CURRENT_SESSION"
echo "Project: $(basename "$CLAUDE_PROJECT_DIR")"
echo "Time: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# Active agents
if [ -f "$LOGS_DIR/agent_tracking.json" ]; then
    echo "=== Active Agents ==="
    jq -r '.active_agents[] | "- \(.agent): \(.task) (started: \(.started_at))"' "$LOGS_DIR/agent_tracking.json" 2>/dev/null || echo "No active agents"
    echo ""
    
    echo "=== Completed Agents ==="
    jq -r '.completed_agents[-5:] | .[] | "- \(.agent): \(.task) (success: \(.success))"' "$LOGS_DIR/agent_tracking.json" 2>/dev/null || echo "No completed agents"
    echo ""
fi

# Memory operations
if [ -f "$LOGS_DIR/memory_operations.json" ]; then
    echo "=== Recent Memory Operations ==="
    MEMORY_COUNT=$(jq -r '.total_count' "$LOGS_DIR/memory_operations.json" 2>/dev/null || echo "0")
    echo "Total operations: $MEMORY_COUNT"
    jq -r '.operations[-5:] | .[] | "- \(.operation) at \(.timestamp) (success: \(.success))"' "$LOGS_DIR/memory_operations.json" 2>/dev/null
    echo ""
fi

# Code changes
if [ -f "$LOGS_DIR/code_changes.json" ]; then
    echo "=== Recent Code Changes ==="
    CHANGE_COUNT=$(jq -r '.total_changes' "$LOGS_DIR/code_changes.json" 2>/dev/null || echo "0")
    FILE_COUNT=$(jq -r '.files_modified | length' "$LOGS_DIR/code_changes.json" 2>/dev/null || echo "0")
    echo "Total changes: $CHANGE_COUNT | Files modified: $FILE_COUNT"
    jq -r '.changes[-5:] | .[] | "- \(.tool): \(.file | split("/") | last) at \(.timestamp)"' "$LOGS_DIR/code_changes.json" 2>/dev/null
    echo ""
fi

# Session activity
if [ -f "$LOGS_DIR/prompt_tracking.json" ]; then
    echo "=== Session Activity ==="
    PROMPT_COUNT=$(jq -r '.session_interactions' "$LOGS_DIR/prompt_tracking.json" 2>/dev/null || echo "0")
    echo "User interactions: $PROMPT_COUNT"
    echo ""
fi

# Recent log entries
echo "=== Recent Log Entries ==="
if [ -f "$LOGS_DIR/session_${CURRENT_SESSION}.log" ]; then
    tail -10 "$LOGS_DIR/session_${CURRENT_SESSION}.log"
else
    echo "No session log found"
fi