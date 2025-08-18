#!/bin/bash

# Session Start Hook - Initialize observability for multi-agent workflows

# Set up directories
HOOKS_DIR="$CLAUDE_PROJECT_DIR/.claude/hooks"
LOGS_DIR="$CLAUDE_PROJECT_DIR/.claude/logs"
MEMORY_DIR="$CLAUDE_PROJECT_DIR/.claude/memory"

mkdir -p "$LOGS_DIR" "$MEMORY_DIR"

# Initialize session log
SESSION_ID=$(date +%Y%m%d_%H%M%S)
SESSION_LOG="$LOGS_DIR/session_${SESSION_ID}.log"

echo "$(date '+%Y-%m-%d %H:%M:%S') [SESSION_START] Session initialized: $SESSION_ID" >> "$SESSION_LOG"
echo "$(date '+%Y-%m-%d %H:%M:%S') [SESSION_START] Project: $(basename "$CLAUDE_PROJECT_DIR")" >> "$SESSION_LOG"
echo "$(date '+%Y-%m-%d %H:%M:%S') [SESSION_START] Memory bank available: $(test -d "$MEMORY_DIR/memory-bank" && echo "yes" || echo "no")" >> "$SESSION_LOG"

# Store session metadata
echo "$SESSION_ID" > "$LOGS_DIR/current_session.id"
echo "$(date '+%Y-%m-%d %H:%M:%S')" > "$LOGS_DIR/session_start.timestamp"

# Initialize agent tracking
echo '{"active_agents": [], "completed_agents": [], "session_start": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}' > "$LOGS_DIR/agent_tracking.json"

echo "Session observability initialized: $SESSION_ID"