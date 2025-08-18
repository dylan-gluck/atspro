#!/bin/bash

# Prompt Tracker Hook - Track user prompts and context switches

LOGS_DIR="$CLAUDE_PROJECT_DIR/.claude/logs"
SESSION_LOG="$LOGS_DIR/session_$(cat "$LOGS_DIR/current_session.id" 2>/dev/null || echo "unknown").log"

# Extract prompt information from stdin
PROMPT_INPUT=$(cat)
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Log prompt submission
echo "$TIMESTAMP [PROMPT_SUBMIT] User prompt received" >> "$SESSION_LOG"

# Track prompt patterns for context switching
PROMPT_SUMMARY="$LOGS_DIR/prompt_tracking.json"
if [ ! -f "$PROMPT_SUMMARY" ]; then
    echo '{"prompts": [], "total_prompts": 0, "session_interactions": 0}' > "$PROMPT_SUMMARY"
fi

TEMP_FILE=$(mktemp)
jq --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" '
    .prompts += [{
        "timestamp": $ts,
        "interaction_number": (.total_prompts + 1)
    }] |
    .total_prompts = (.prompts | length) |
    .session_interactions += 1
' "$PROMPT_SUMMARY" > "$TEMP_FILE" && mv "$TEMP_FILE" "$PROMPT_SUMMARY"

# Check for context switches (workflows, memory operations, etc.)
INTERACTION_COUNT=$(jq -r '.session_interactions' "$PROMPT_SUMMARY" 2>/dev/null || echo "1")

echo "Prompt tracked: interaction #$INTERACTION_COUNT"