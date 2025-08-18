#!/bin/bash

# Orchestration Hook Script
# Handles inter-agent communication and memory storage

# Read input from stdin
INPUT=$(cat)

# Extract event type from input
EVENT_TYPE=$(echo "$INPUT" | jq -r '.eventType // "unknown"')

# Function to store in memory (placeholder - would use actual memory MCP)
store_in_memory() {
    local key="$1"
    local value="$2"
    echo "Storing in memory: $key" >&2
    # In real implementation, would call memory MCP server
}

# Function to retrieve from memory
get_from_memory() {
    local key="$1"
    echo "Retrieving from memory: $key" >&2
    # In real implementation, would call memory MCP server
}

# Handle different event types
case "$EVENT_TYPE" in
    "PreToolUse")
        TOOL_NAME=$(echo "$INPUT" | jq -r '.toolName')
        if [ "$TOOL_NAME" = "Task" ]; then
            echo "Orchestration: Launching sub-agent" >&2
            AGENT_NAME=$(echo "$INPUT" | jq -r '.arguments.subagent_type // "unknown"')
            WORKFLOW_ID=$(date +%s)
            store_in_memory "workflow:active:$WORKFLOW_ID" "$AGENT_NAME"
        fi
        ;;
        
    "PostToolUse")
        TOOL_NAME=$(echo "$INPUT" | jq -r '.toolName')
        if [ "$TOOL_NAME" = "Task" ]; then
            echo "Orchestration: Sub-agent completed" >&2
            RESULT=$(echo "$INPUT" | jq -r '.result')
            TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
            store_in_memory "agent:result:$TIMESTAMP" "$RESULT"
        fi
        ;;
        
    "SubagentStop")
        AGENT_NAME=$(echo "$INPUT" | jq -r '.agentName // "unknown"')
        echo "Orchestration: Agent $AGENT_NAME stopped" >&2
        # Store final agent state
        store_in_memory "agent:$AGENT_NAME:last_run" "$INPUT"
        ;;
        
    "UserPromptSubmit")
        PROMPT=$(echo "$INPUT" | jq -r '.prompt')
        # Check if prompt starts with orchestration command
        if echo "$PROMPT" | grep -q "^/workflow"; then
            echo "Orchestration: Workflow command detected" >&2
            WORKFLOW_CMD=$(echo "$PROMPT" | awk '{print $2}')
            WORKFLOW_NAME=$(echo "$PROMPT" | awk '{print $3}')
            
            case "$WORKFLOW_CMD" in
                "execute")
                    echo "Launching workflow: $WORKFLOW_NAME" >&2
                    store_in_memory "workflow:pending:$WORKFLOW_NAME" "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
                    ;;
                "status")
                    echo "Checking workflow status: $WORKFLOW_NAME" >&2
                    get_from_memory "workflow:$WORKFLOW_NAME:state"
                    ;;
            esac
        fi
        ;;
        
    *)
        echo "Orchestration: Unknown event type: $EVENT_TYPE" >&2
        ;;
esac

# Pass through the input unchanged
echo "$INPUT"