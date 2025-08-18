---
description: Manage project memory and context
allowedTools: mcp__memory__*, Read, Write, LS
---

# Memory Management

Manage project memory: $ARGUMENTS

## Memory Operations

### Store Context
Save important context for future use:
```
/memory store <key> <value>
```

### Retrieve Context
Get stored information:
```
/memory get <key>
```

### List Memory Keys
Show all stored memory keys:
```
/memory list [pattern]
```

### Clear Memory
Remove specific keys or clear all:
```
/memory clear <key|pattern|all>
```

## Memory Categories

### Workflow State
- `workflow:{id}:state` - Current workflow status
- `workflow:{id}:step:{step}:output` - Step results

### Agent Context
- `agent:{name}:context` - Agent-specific information
- `agent:{name}:last_result` - Recent agent outputs

### Project Context
- `project:dependencies` - Project dependencies
- `project:patterns` - Code patterns and conventions
- `project:architecture` - System architecture

### Task Results
- `task:{id}:result` - Individual task outcomes
- `task:{id}:metrics` - Performance metrics

## Best Practices

1. Use semantic key names
2. Store structured JSON data
3. Clean up temporary keys
4. Document important keys
5. Regular backups to `.claude/memory-backup/`