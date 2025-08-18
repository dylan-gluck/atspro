#!/bin/bash

# Code Change Tracker Hook - Monitor file modifications

LOGS_DIR="$CLAUDE_PROJECT_DIR/.claude/logs"
SESSION_LOG="$LOGS_DIR/session_$(cat "$LOGS_DIR/current_session.id" 2>/dev/null || echo "unknown").log"

# Extract file modification details from stdin
CHANGE_INPUT=$(cat)
TOOL_NAME=$(echo "$CHANGE_INPUT" | jq -r '.tool_name // "unknown"' 2>/dev/null)
FILE_PATH=$(echo "$CHANGE_INPUT" | jq -r '.inputs.file_path // "unknown"' 2>/dev/null)
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Log code change
echo "$TIMESTAMP [CODE_CHANGE] Tool: $TOOL_NAME | File: $(basename "$FILE_PATH")" >> "$SESSION_LOG"

# Track file changes
CHANGES_SUMMARY="$LOGS_DIR/code_changes.json"
if [ ! -f "$CHANGES_SUMMARY" ]; then
    echo '{"changes": [], "files_modified": [], "total_changes": 0}' > "$CHANGES_SUMMARY"
fi

TEMP_FILE=$(mktemp)
jq --arg tool "$TOOL_NAME" --arg file "$FILE_PATH" --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" '
    .changes += [{
        "tool": $tool,
        "file": $file,
        "timestamp": $ts
    }] |
    .files_modified = ([.changes[].file] | unique) |
    .total_changes = (.changes | length)
' "$CHANGES_SUMMARY" > "$TEMP_FILE" && mv "$TEMP_FILE" "$CHANGES_SUMMARY"

# Count modifications
TOTAL_CHANGES=$(jq -r '.total_changes' "$CHANGES_SUMMARY" 2>/dev/null || echo "0")
UNIQUE_FILES=$(jq -r '.files_modified | length' "$CHANGES_SUMMARY" 2>/dev/null || echo "0")

echo "Code change tracked: $(basename "$FILE_PATH") | Total: $TOTAL_CHANGES files: $UNIQUE_FILES"