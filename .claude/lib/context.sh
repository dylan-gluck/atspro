#!/bin/bash

# Claude Context Management Library
# Provides functions for managing agent context using jq

CONTEXT_DIR="$CLAUDE_PROJECT_DIR/.claude/context"
CONTEXT_FILE="$CONTEXT_DIR/context.json"
SCHEMA_FILE="$CONTEXT_DIR/schema.json"

# Initialize context if it doesn't exist
init_context() {
    if [[ ! -f "$CONTEXT_FILE" ]]; then
        mkdir -p "$CONTEXT_DIR"
        local session_id="$(date +%Y%m%d_%H%M%S)"
        local start_time="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
        
        jq -n \
            --arg session_id "$session_id" \
            --arg start_time "$start_time" \
            --arg project "$(basename "$CLAUDE_PROJECT_DIR")" \
            --arg branch "$(cd "$CLAUDE_PROJECT_DIR" && git branch --show-current 2>/dev/null || echo 'unknown')" \
            --arg commit "$(cd "$CLAUDE_PROJECT_DIR" && git rev-parse --short HEAD 2>/dev/null || echo 'unknown')" \
            '{
                session: {
                    sessionId: $session_id,
                    startTime: $start_time,
                    activeWorkflows: [],
                    completedWorkflows: [],
                    globalContext: {
                        project: $project,
                        environment: "development",
                        branch: $branch,
                        lastCommit: $commit
                    },
                    metrics: {
                        totalAgents: 0,
                        completedTasks: 0,
                        codeChanges: 0,
                        testsRun: 0
                    }
                },
                workflows: [],
                agents: []
            }' > "$CONTEXT_FILE"
    fi
}

# Get current session ID
get_session_id() {
    init_context
    jq -r '.session.sessionId' "$CONTEXT_FILE"
}

# Add or update agent context
update_agent() {
    local agent_id="$1"
    local agent_type="$2"
    local status="$3"
    local task="$4"
    
    init_context
    
    local timestamp="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    
    # Check if agent exists, update or add
    jq \
        --arg id "$agent_id" \
        --arg type "$agent_type" \
        --arg status "$status" \
        --arg task "$task" \
        --arg timestamp "$timestamp" \
        '
        (.agents[] | select(.id == $id)) as $existing |
        if $existing then
            .agents |= map(
                if .id == $id then
                    . + {
                        status: $status,
                        task: $task,
                        endTime: (if $status == "completed" or $status == "failed" then $timestamp else .endTime end)
                    }
                else . end
            )
        else
            .agents += [{
                id: $id,
                type: $type,
                status: $status,
                startTime: $timestamp,
                task: $task,
                results: {},
                context: {}
            }] |
            .session.metrics.totalAgents += 1
        end
        ' "$CONTEXT_FILE" > "$CONTEXT_FILE.tmp" && mv "$CONTEXT_FILE.tmp" "$CONTEXT_FILE"
}

# Add agent results
add_agent_results() {
    local agent_id="$1"
    local summary="$2"
    local findings="$3"  # JSON array
    
    init_context
    
    jq \
        --arg id "$agent_id" \
        --arg summary "$summary" \
        --argjson findings "$findings" \
        '
        .agents |= map(
            if .id == $id then
                .results = {
                    summary: $summary,
                    findings: $findings,
                    files: [],
                    recommendations: [],
                    metadata: {}
                }
            else . end
        )
        ' "$CONTEXT_FILE" > "$CONTEXT_FILE.tmp" && mv "$CONTEXT_FILE.tmp" "$CONTEXT_FILE"
}

# Start workflow
start_workflow() {
    local workflow_id="$1"
    local workflow_name="$2"
    local total_steps="$3"
    
    init_context
    
    local timestamp="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    
    jq \
        --arg id "$workflow_id" \
        --arg name "$workflow_name" \
        --arg timestamp "$timestamp" \
        --argjson steps "$total_steps" \
        '
        .workflows += [{
            id: $id,
            name: $name,
            status: "running",
            currentStep: 0,
            totalSteps: $steps,
            agents: [],
            sharedContext: {},
            metadata: {
                startTime: $timestamp,
                priority: "medium"
            }
        }] |
        .session.activeWorkflows += [$id]
        ' "$CONTEXT_FILE" > "$CONTEXT_FILE.tmp" && mv "$CONTEXT_FILE.tmp" "$CONTEXT_FILE"
}

# Update workflow progress
update_workflow() {
    local workflow_id="$1"
    local status="$2"
    local current_step="$3"
    
    init_context
    
    jq \
        --arg id "$workflow_id" \
        --arg status "$status" \
        --argjson step "$current_step" \
        '
        .workflows |= map(
            if .id == $id then
                . + {
                    status: $status,
                    currentStep: $step
                }
            else . end
        ) |
        if $status == "completed" then
            .session.activeWorkflows |= map(select(. != $id)) |
            .session.completedWorkflows += [$id]
        else . end
        ' "$CONTEXT_FILE" > "$CONTEXT_FILE.tmp" && mv "$CONTEXT_FILE.tmp" "$CONTEXT_FILE"
}

# Increment metrics
increment_metric() {
    local metric="$1"
    local value="${2:-1}"
    
    init_context
    
    jq \
        --arg metric "$metric" \
        --argjson value "$value" \
        '.session.metrics[$metric] += $value' \
        "$CONTEXT_FILE" > "$CONTEXT_FILE.tmp" && mv "$CONTEXT_FILE.tmp" "$CONTEXT_FILE"
}

# Get context for agent
get_agent_context() {
    local agent_id="$1"
    
    init_context
    
    jq \
        --arg id "$agent_id" \
        '.agents[] | select(.id == $id)' \
        "$CONTEXT_FILE"
}

# Get shared workflow context
get_workflow_context() {
    local workflow_id="$1"
    
    init_context
    
    jq \
        --arg id "$workflow_id" \
        '.workflows[] | select(.id == $id) | .sharedContext' \
        "$CONTEXT_FILE"
}

# Update shared workflow context
update_workflow_context() {
    local workflow_id="$1"
    local key="$2"
    local value="$3"
    
    init_context
    
    jq \
        --arg id "$workflow_id" \
        --arg key "$key" \
        --arg value "$value" \
        '
        .workflows |= map(
            if .id == $id then
                .sharedContext[$key] = $value
            else . end
        )
        ' "$CONTEXT_FILE" > "$CONTEXT_FILE.tmp" && mv "$CONTEXT_FILE.tmp" "$CONTEXT_FILE"
}

# Get all active agents
get_active_agents() {
    init_context
    jq '.agents[] | select(.status == "running")' "$CONTEXT_FILE"
}

# Get session summary
get_session_summary() {
    init_context
    jq '{
        sessionId: .session.sessionId,
        startTime: .session.startTime,
        activeWorkflows: (.session.activeWorkflows | length),
        completedWorkflows: (.session.completedWorkflows | length),
        totalAgents: .session.metrics.totalAgents,
        completedTasks: .session.metrics.completedTasks,
        codeChanges: .session.metrics.codeChanges
    }' "$CONTEXT_FILE"
}