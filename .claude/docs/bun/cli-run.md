---
source: https://bun.sh/docs/cli/run
fetched: 2025-08-19
version: latest
---

# Bun CLI Run Command Quick Reference

## Table of Contents
- [Basic Usage](#basic-usage)
- [Script Execution](#script-execution)
- [Performance](#performance)
- [Advanced Features](#advanced-features)
- [Flag Reference](#flag-reference)
- [Resolution Order](#resolution-order)
- [Common Patterns](#common-patterns)
- [Troubleshooting](#troubleshooting)

## Basic Usage

### Running Source Files
```bash
# Explicit form
bun run index.tsx

# Shorthand form (recommended)
bun index.tsx
```

### Running Package.json Scripts
```bash
# Run named script from package.json
bun run dev
bun run build
bun run test

# Shorthand (when no built-in command conflicts)
bun dev
bun build
```

### Watch Mode
```bash
# Auto-restart on file changes
bun run --watch index.ts
bun --watch index.ts
```

### List Available Scripts
```bash
# Show all package.json scripts
bun run
```

## Script Execution

### TypeScript & JSX Support
- Bun transpiles TypeScript/JSX files on-the-fly
- No configuration required
- Supports latest language features

```bash
# All work out of the box
bun run app.ts
bun run component.tsx
bun run module.js
```

### Lifecycle Hooks
Bun respects npm lifecycle hooks automatically:
```json
{
  "scripts": {
    "preclean": "echo 'Before clean'",
    "clean": "rm -rf dist",
    "postclean": "echo 'After clean'"
  }
}
```

```bash
# Runs: preclean → clean → postclean
bun run clean
```

### Shell Execution
- **Linux/macOS**: Uses bash, sh, or zsh (first available)
- **Windows**: Uses Bun's built-in bash-like shell
- Supports common shell commands and syntax

## Performance

### Speed Comparison
- **npm run**: ~170ms startup time
- **bun run**: ~6ms startup time (4x faster on Linux)
- Native transpilation with zero-config TypeScript/JSX

### Memory Management
```bash
# Run with aggressive GC (for limited memory environments)
bun run --smol memory-intensive-script.ts
```

## Advanced Features

### Override Node.js Shebangs
```bash
# Force Bun runtime even with #!/usr/bin/env node
bun run --bun node-cli-tool
```

### Monorepo Support
```bash
# Run script across multiple packages
bun run --filter="@myorg/*" build
bun run --filter="frontend,backend" test
```

### Flag Positioning
```bash
# Correct: Bun flags before script name
bun run --watch --hot my-script.ts

# Incorrect: Flags after script are passed to the script
bun run my-script.ts --watch  # --watch passed to script
```

## Flag Reference

| Flag | Description |
|------|-------------|
| `--watch` | Auto-restart on file changes |
| `--hot` | Hot reload (preserve state) |
| `--smol` | Aggressive garbage collection |
| `--bun` | Force Bun runtime over Node.js |
| `--filter` | Target specific packages (monorepos) |

## Resolution Order

1. **Absolute paths** and paths starting with `./` or `.\` → Always executed as source files
2. **File extensions** → Prefer files over package.json scripts (unless using `bun run`)
3. **`bun run` command** → Prioritizes package.json scripts over files
4. **Built-in commands** → Take precedence over script names

### Examples
```bash
# These run files directly
bun ./src/index.ts
bun /absolute/path/script.js

# Script vs file priority
bun dev          # Runs file 'dev.js' if exists
bun run dev      # Runs package.json script 'dev'
```

## Common Patterns

### Development Workflow
```json
{
  "scripts": {
    "dev": "bun run --watch src/index.ts",
    "build": "bun build src/index.ts --outdir=dist",
    "start": "bun run dist/index.js",
    "test": "bun test"
  }
}
```

### Monorepo Scripts
```json
{
  "scripts": {
    "build:all": "bun run --filter=* build",
    "test:frontend": "bun run --filter=frontend test",
    "dev:parallel": "bun run --filter=frontend,backend dev"
  }
}
```

### Environment-Specific Execution
```bash
# Development with hot reload
bun run --watch --hot src/server.ts

# Production with memory constraints
bun run --smol src/server.js

# Force Bun runtime for Node.js tools
bun run --bun node_modules/.bin/some-cli
```

## Troubleshooting

### Common Issues

**Script not found:**
```bash
# Check available scripts
bun run
```

**Wrong runtime used:**
```bash
# Force Bun instead of Node.js
bun run --bun script-name
```

**Flags not working:**
```bash
# Wrong: flags after script name
bun run script.ts --watch

# Correct: flags before script name  
bun run --watch script.ts
```

**File vs script conflict:**
```bash
# Force script execution
bun run script-name

# Force file execution
bun ./script-name.js
```

### Performance Tips
- Use shorthand `bun script.ts` instead of `bun run script.ts` for files
- Leverage `--watch` for development workflows
- Use `--smol` only when memory is constrained
- Consider monorepo filters for targeted execution

### Node.js Compatibility
- Most npm scripts work without modification
- Lifecycle hooks are fully supported
- Shebangs can be overridden with `--bun` flag
- Shell syntax is cross-platform compatible