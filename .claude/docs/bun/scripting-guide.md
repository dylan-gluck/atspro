---
source: https://bun.sh/docs/runtime/shell, https://bun.sh/blog/the-bun-shell
fetched: 2025-08-19
version: Bun 1.1+
---

# Bun Scripting Best Practices Guide

## Table of Contents
- [Core Philosophy](#core-philosophy)
- [Bun Shell Overview](#bun-shell-overview)
- [Essential Patterns](#essential-patterns)
- [Security Best Practices](#security-best-practices)
- [Performance Optimization](#performance-optimization)
- [Error Handling](#error-handling)
- [Cross-Platform Development](#cross-platform-development)
- [Advanced Techniques](#advanced-techniques)
- [Migration from Node.js](#migration-from-nodejs)

## Core Philosophy

Bun Shell makes shell scripting with JavaScript/TypeScript fun and secure. It's a cross-platform bash-like shell with seamless JavaScript interop designed to replace platform-specific tools like `rimraf`, `cross-env`, and `which`.

### Key Advantages Over Traditional Scripting
- **Cross-platform by default** - Works on Windows, Linux, macOS
- **Security first** - Automatic string escaping prevents injection attacks
- **Performance optimized** - Native implementation provides 20x speed improvements
- **JavaScript integration** - Native interop with JS objects and APIs
- **Zero dependencies** - Built-in common commands eliminate external tools

## Bun Shell Overview

### Basic Setup
```javascript
import { $ } from "bun";

// Simple command execution
await $`echo "Hello, Bun!"`;

// Capture output as text
const result = await $`ls -la`.text();
console.log(result);

// Get detailed execution info
const { stdout, stderr, exitCode } = await $`git status`.quiet();
```

### Template Literal Syntax
```javascript
// Variable interpolation (automatically escaped)
const filename = "my file.txt";
await $`cat ${filename}`; // Safe from injection attacks

// Expression evaluation
const port = 3000;
await $`curl http://localhost:${port + 1}/api`;

// Multi-line commands
const result = await $`
  find . -name "*.js" |
  xargs wc -l |
  sort -n
`.text();
```

## Essential Patterns

### Command Output Handling
```javascript
// Text output (most common)
const welcome = await $`echo "Hello World!"`.text();

// Buffer output (for binary data)
const { stdout, stderr } = await $`cat binary-file`.quiet();

// Streaming output (for large data)
const stream = $`find / -name "*.log"`.readable();
```

### Pipes and Redirection
```javascript
// Pipe commands together
const lineCount = await $`cat large-file.txt | grep "error" | wc -l`.text();

// Redirect input from Response
const response = await fetch("https://api.github.com/users/oven-sh");
await $`cat < ${response} | jq .name`;

// Redirect output to file
await $`echo "deployment complete" > deploy.log`;

// Append to file
await $`date >> deploy.log`;
```

### Environment Variables
```javascript
// Set environment variables
const env = "production";
await $`NODE_ENV=${env} bun start`;

// Complex environment setup
const config = {
  API_KEY: process.env.API_KEY,
  DEBUG: "true"
};

await $`API_KEY=${config.API_KEY} DEBUG=${config.DEBUG} bun test`;

// Read environment in shell
await $`echo $HOME`; // Access system environment
```

### Conditional Execution
```javascript
// Check exit codes
const result = await $`test -f package.json`;
if (result.exitCode === 0) {
  await $`npm install`;
} else {
  console.log("No package.json found");
}

// Using logical operators
await $`mkdir -p dist && bun build src/index.ts --outdir dist`;

// Error handling with try/catch
try {
  await $`git push origin main`;
} catch (error) {
  console.log("Push failed:", error.message);
  await $`git pull --rebase origin main`;
}
```

### Command Substitution
```javascript
// Use $(command) syntax, not backticks
const currentBranch = await $`echo $(git branch --show-current)`.text();

// Complex substitution
await $`docker tag myapp:latest myapp:$(git rev-parse --short HEAD)`;

// Multiple substitutions
const timestamp = await $`date +%Y%m%d-%H%M%S`.text();
const backup = `backup-${timestamp.trim()}`;
await $`cp important.db ${backup}.db`;
```

## Security Best Practices

### Automatic String Escaping
```javascript
// ✅ Safe - Bun automatically escapes user input
const userFile = "file with spaces & special chars.txt";
await $`cat ${userFile}`; // Automatically escaped

// ✅ Safe - Variables are escaped to prevent injection
const searchTerm = "; rm -rf /";
await $`grep ${searchTerm} log.txt`; // searchTerm is safely escaped
```

### Input Validation
```javascript
// ✅ Validate file paths before use
function validatePath(path) {
  if (path.includes("..") || path.startsWith("/")) {
    throw new Error("Invalid path");
  }
  return path;
}

const userPath = validatePath(process.argv[2]);
await $`cat ${userPath}`;
```

### Sensitive Data Handling
```javascript
// ✅ Use environment variables for secrets
await $`curl -H "Authorization: Bearer ${process.env.API_TOKEN}" api.example.com`;

// ✅ Avoid logging sensitive commands
const quietResult = await $`password-command`.quiet();

// ✅ Clean up temporary files
const tempFile = `/tmp/secure-${Date.now()}.txt`;
try {
  await $`echo "sensitive data" > ${tempFile}`;
  // ... process file
} finally {
  await $`rm -f ${tempFile}`;
}
```

## Performance Optimization

### Parallel Execution
```javascript
// ✅ Run independent commands in parallel
const [lintResult, testResult, buildResult] = await Promise.all([
  $`bun lint`.text(),
  $`bun test`.text(),
  $`bun build`.text()
]);

// ✅ Pipeline optimization
const results = await Promise.allSettled([
  $`eslint src/`,
  $`prettier --check src/`,
  $`tsc --noEmit`
]);
```

### Memory Management
```javascript
// ✅ Use streaming for large files
const largeFileStream = $`cat very-large.log`.readable();
await $`grep "ERROR" < ${largeFileStream} > errors.log`;

// ✅ Process data in chunks
for await (const line of $`tail -f access.log`.lines()) {
  if (line.includes("error")) {
    console.log("Error detected:", line);
  }
}
```

### Built-in Command Optimization
```javascript
// ✅ Prefer built-in commands (faster)
await $`ls -la`;        // Built-in
await $`rm -rf build`;  // Built-in
await $`mkdir -p dist`; // Built-in

// ✅ Use .quiet() to suppress output when not needed
await $`git add .`.quiet();
await $`git commit -m "update"`.quiet();
```

## Error Handling

### Graceful Error Recovery
```javascript
// ✅ Handle command failures gracefully
async function deployWithRollback() {
  try {
    await $`docker-compose up -d`;
    await $`./health-check.sh`;
  } catch (error) {
    console.log("Deployment failed, rolling back...");
    await $`docker-compose down`;
    await $`git checkout HEAD~1`;
    throw new Error(`Deployment failed: ${error.message}`);
  }
}
```

### Exit Code Handling
```javascript
// ✅ Check exit codes explicitly
const result = await $`npm test`;
if (result.exitCode !== 0) {
  console.log("Tests failed!");
  process.exit(1);
}

// ✅ Use throws() for stricter error handling
$.throws(true); // Enable automatic throwing on non-zero exit
await $`strict-command`; // Will throw if exit code !== 0
```

### Logging and Debugging
```javascript
// ✅ Comprehensive error logging
async function runCommand(command, description) {
  console.log(`Running: ${description}`);
  try {
    const result = await $`${command}`;
    console.log(`✅ ${description} completed`);
    return result;
  } catch (error) {
    console.error(`❌ ${description} failed:`, error.message);
    if (error.stderr) {
      console.error("STDERR:", error.stderr.toString());
    }
    throw error;
  }
}
```

## Cross-Platform Development

### Platform Detection
```javascript
// ✅ Detect platform and adapt commands
const isWindows = process.platform === "win32";
const isMac = process.platform === "darwin";

// Use appropriate commands
const openCommand = isWindows ? "start" : isMac ? "open" : "xdg-open";
await $`${openCommand} https://example.com`;
```

### Path Handling
```javascript
// ✅ Use cross-platform path operations
import { join, resolve } from "path";

const scriptPath = resolve(join("scripts", "deploy.sh"));
await $`chmod +x ${scriptPath} && ${scriptPath}`;

// ✅ Handle different path separators
const configFile = join(process.env.HOME || process.env.USERPROFILE, ".config", "app.json");
const config = await $`cat ${configFile}`.json();
```

### Environment Variables
```javascript
// ✅ Handle platform-specific environment variables
const homeDir = process.env.HOME || process.env.USERPROFILE;
const pathSeparator = isWindows ? ";" : ":";
const executable = isWindows ? "app.exe" : "app";

await $`${executable} --config ${join(homeDir, "config.json")}`;
```

## Advanced Techniques

### Custom Command Builders
```javascript
// ✅ Create reusable command builders
class DockerCommands {
  static async build(tag, context = ".") {
    return await $`docker build -t ${tag} ${context}`;
  }
  
  static async run(image, ...args) {
    return await $`docker run ${image} ${args.join(" ")}`;
  }
  
  static async logs(container) {
    return await $`docker logs ${container}`.text();
  }
}

// Usage
await DockerCommands.build("myapp:latest");
await DockerCommands.run("myapp:latest", "-p", "3000:3000");
```

### Script Composition
```javascript
// ✅ Compose complex workflows
async function fullDeployment() {
  const steps = [
    () => $`git pull origin main`,
    () => $`bun install`,
    () => $`bun test`,
    () => $`bun build`,
    () => $`docker build -t app:latest .`,
    () => $`docker-compose up -d`
  ];
  
  for (const [index, step] of steps.entries()) {
    console.log(`Step ${index + 1}/${steps.length}...`);
    await step();
  }
}
```

### File Processing Pipelines
```javascript
// ✅ Complex file processing
async function processLogs(logDir) {
  // Find all log files and process them
  const logFiles = await $`find ${logDir} -name "*.log"`.text();
  
  for (const file of logFiles.split('\n').filter(Boolean)) {
    const errors = await $`grep -c "ERROR" ${file}`.text();
    const warnings = await $`grep -c "WARN" ${file}`.text();
    
    console.log(`${file}: ${errors.trim()} errors, ${warnings.trim()} warnings`);
  }
}
```

## Migration from Node.js

### Common Patterns
```javascript
// Node.js with child_process
const { spawn } = require('child_process');
const child = spawn('ls', ['-la']);

// Bun equivalent
const result = await $`ls -la`;
```

### Package.json Scripts Migration
```json
{
  "scripts": {
    // Before: Platform-specific workarounds
    "clean": "rimraf dist",
    "build": "cross-env NODE_ENV=production webpack",
    
    // After: Direct shell commands
    "clean": "rm -rf dist",
    "build": "NODE_ENV=production webpack"
  }
}
```

### Performance Comparison
- **npm run**: ~170ms startup time
- **bun run**: ~6ms startup time (28x faster)
- **Bun Shell**: 20x faster command execution
- **Built-in commands**: Additional 2-5x improvement

## Shell Script Files

### .sh File Support
```bash
#!/usr/bin/env bun
# file: deploy.sh

import { $ } from "bun";

console.log("Starting deployment...");

await $`git pull origin main`;
await $`bun install`;
await $`bun build`;

console.log("Deployment complete!");
```

Run with: `bun deploy.sh`

### TypeScript Shell Scripts
```typescript
#!/usr/bin/env bun
// file: deploy.ts

import { $ } from "bun";

interface DeployConfig {
  environment: string;
  region: string;
}

async function deploy(config: DeployConfig): Promise<void> {
  console.log(`Deploying to ${config.environment} in ${config.region}`);
  
  await $`docker build -t app:${config.environment} .`;
  await $`kubectl apply -f k8s/${config.environment}.yaml`;
}

await deploy({ environment: "production", region: "us-east-1" });
```

This guide provides a comprehensive foundation for effective Bun scripting, emphasizing security, performance, and cross-platform compatibility while leveraging Bun's unique strengths over traditional shell scripting approaches.