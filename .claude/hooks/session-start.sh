#!/bin/bash

# Session Start Hook - New JSON Context System
# Executed when a new Claude session begins

# Source the context library
source "$CLAUDE_PROJECT_DIR/.claude/lib/context.sh"

# Set up directories
HOOKS_DIR="$CLAUDE_PROJECT_DIR/.claude/hooks"
LOGS_DIR="$CLAUDE_PROJECT_DIR/.claude/logs"
MEMORY_DIR="$CLAUDE_PROJECT_DIR/.claude/memory"
CONTEXT_DIR="$CLAUDE_PROJECT_DIR/.claude/context"

mkdir -p "$LOGS_DIR" "$MEMORY_DIR" "$CONTEXT_DIR"

# Initialize the new JSON context system
init_context

# Get session ID and create legacy compatibility
SESSION_ID=$(get_session_id)
SESSION_LOG="$LOGS_DIR/session_${SESSION_ID}.log"

echo "$(date '+%Y-%m-%d %H:%M:%S') [SESSION_START] Session initialized: $SESSION_ID" >> "$SESSION_LOG"
echo "$(date '+%Y-%m-%d %H:%M:%S') [SESSION_START] Project: $(basename "$CLAUDE_PROJECT_DIR")" >> "$SESSION_LOG"
echo "$(date '+%Y-%m-%d %H:%M:%S') [SESSION_START] Memory bank available: $(test -d "$MEMORY_DIR/memory-bank" && echo "yes" || echo "no")" >> "$SESSION_LOG"
echo "$(date '+%Y-%m-%d %H:%M:%S') [SESSION_START] JSON context system enabled" >> "$SESSION_LOG"

# Store session metadata (legacy compatibility)
echo "$SESSION_ID" > "$LOGS_DIR/current_session.id"
echo "$(date '+%Y-%m-%d %H:%M:%S')" > "$LOGS_DIR/session_start.timestamp"

# Initialize legacy agent tracking (backward compatibility)
echo '{"active_agents": [], "completed_agents": [], "session_start": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}' > "$LOGS_DIR/agent_tracking.json"

echo "Session observability initialized: $SESSION_ID"