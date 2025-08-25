---
source: https://bun.sh/docs/api/file-io, https://bun.sh/guides/read-file, https://bun.sh/guides/write-file
fetched: 2025-08-19
version: Bun 1.1+
---

# Bun Filesystem Operations Reference

## Table of Contents
- [Core Concepts](#core-concepts)
- [Reading Files](#reading-files)
- [Writing Files](#writing-files)
- [Directory Operations](#directory-operations)
- [File Watching](#file-watching)
- [Streaming Operations](#streaming-operations)
- [Advanced Patterns](#advanced-patterns)
- [Performance Optimization](#performance-optimization)
- [Error Handling](#error-handling)
- [Node.js Compatibility](#nodejs-compatibility)

## Core Concepts

### BunFile - Lazy Loading Architecture
```javascript
// BunFile represents a lazily-loaded file
const file = Bun.file("./data.txt"); // No I/O yet!

// File metadata available immediately
console.log(file.size);     // File size in bytes
console.log(file.type);     // MIME type (e.g., "text/plain")
console.log(file.name);     // Filename
console.log(file.lastModified); // Last modified timestamp

// Actual reading happens on demand
const content = await file.text(); // I/O occurs here
```

### Path Resolution
```javascript
// Relative paths resolve to project root (nearest package.json)
const relative = Bun.file("./config.json");

// Absolute paths
const absolute = Bun.file("/etc/hosts");

// URL paths
const url = Bun.file(new URL("file:///path/to/file.txt"));

// Using import.meta.dir for current directory
const local = Bun.file(`${import.meta.dir}/local-file.txt`);
```

### Blob Interface Compatibility
```javascript
// BunFile implements the Web Blob interface
const file = Bun.file("image.png");

// Blob methods available
await file.arrayBuffer(); // ArrayBuffer
await file.text();        // String
await file.bytes();       // Uint8Array
await file.stream();      // ReadableStream

// Blob properties
console.log(file.size);   // Size in bytes
console.log(file.type);   // MIME type
```

## Reading Files

### Basic Reading Operations
```javascript
const file = Bun.file("data.txt");

// As string (UTF-8)
const text = await file.text();

// As binary data
const buffer = await file.arrayBuffer();
const bytes = await file.bytes(); // Uint8Array (recommended)

// As ReadableStream
const stream = file.stream();
```

### Reading Different File Types
```javascript
// Text files
const config = await Bun.file("config.txt").text();

// JSON files (automatic parsing)
const data = await Bun.file("data.json").json();

// Binary files
const imageBytes = await Bun.file("image.png").bytes();

// Large files (streaming)
const logStream = Bun.file("large.log").stream();
```

### Reading with Error Handling
```javascript
async function readFilesafely(path) {
  try {
    const file = Bun.file(path);
    
    // Check if file exists by attempting to read size
    if (!file.size && file.size !== 0) {
      throw new Error(`File not found: ${path}`);
    }
    
    return await file.text();
  } catch (error) {
    console.error(`Failed to read ${path}:`, error.message);
    return null;
  }
}
```

### Conditional Reading
```javascript
// Check file existence and size before reading
const file = Bun.file("optional-config.json");

if (file.size > 0) {
  const config = await file.json();
  console.log("Config loaded:", config);
} else {
  console.log("Using default configuration");
}
```

## Writing Files

### Bun.write() - Multi-Purpose Writer
```javascript
// Write string
await Bun.write("output.txt", "Hello, Bun!");

// Write to BunFile instance
const file = Bun.file("output.txt");
await Bun.write(file, "Hello, Bun!");

// Write JSON (automatic serialization)
await Bun.write("data.json", { name: "Bun", version: "1.1" });

// Write binary data
await Bun.write("binary.dat", new Uint8Array([0, 1, 2, 3]));

// Write ArrayBuffer
const buffer = new ArrayBuffer(1024);
await Bun.write("buffer.bin", buffer);
```

### Writing Different Data Types
```javascript
// Response objects
const response = await fetch("https://api.example.com/data");
await Bun.write("api-data.json", response);

// Blob objects
const blob = new Blob(["Hello, World!"], { type: "text/plain" });
await Bun.write("hello.txt", blob);

// Readable streams
const stream = new ReadableStream({
  start(controller) {
    controller.enqueue("chunk 1\n");
    controller.enqueue("chunk 2\n");
    controller.close();
  }
});
await Bun.write("streamed.txt", stream);
```

### Return Value Usage
```javascript
// Bun.write returns number of bytes written
const bytesWritten = await Bun.write("output.txt", "Hello, Bun!");
console.log(`Wrote ${bytesWritten} bytes`); // "Wrote 11 bytes"

// Useful for verification
const data = "Large data content...";
const written = await Bun.write("large.txt", data);
if (written !== data.length) {
  console.error("Write operation incomplete!");
}
```

### Incremental Writing with FileSink
```javascript
// For large files or streaming writes
const file = Bun.file("large-output.txt");
const writer = file.writer();

// Write data incrementally
writer.write("Part 1\n");
writer.write("Part 2\n");
writer.write("Part 3\n");

// Flush to disk periodically
await writer.flush();

// Close when done
await writer.end();
```

### Advanced FileSink Patterns
```javascript
// High-performance log writer
class LogWriter {
  constructor(filename) {
    this.writer = Bun.file(filename).writer();
    this.buffer = [];
    this.bufferSize = 0;
    this.maxBufferSize = 64 * 1024; // 64KB buffer
  }

  async write(message) {
    const entry = `${new Date().toISOString()} ${message}\n`;
    this.buffer.push(entry);
    this.bufferSize += entry.length;

    if (this.bufferSize >= this.maxBufferSize) {
      await this.flush();
    }
  }

  async flush() {
    if (this.buffer.length > 0) {
      this.writer.write(this.buffer.join(''));
      await this.writer.flush();
      this.buffer = [];
      this.bufferSize = 0;
    }
  }

  async close() {
    await this.flush();
    await this.writer.end();
  }
}

// Usage
const logger = new LogWriter("app.log");
await logger.write("Application started");
await logger.write("Processing request");
await logger.close();
```

## Directory Operations

### Using Node.js fs Module
```javascript
import { readdir, mkdir, rmdir, stat } from "node:fs/promises";

// Read directory contents
const files = await readdir("./src");
console.log("Files:", files);

// Recursive directory reading
const allFiles = await readdir("./src", { recursive: true });
console.log("All files:", allFiles);

// Create directories
await mkdir("./dist", { recursive: true });

// Remove directories
await rmdir("./temp", { recursive: true });

// Get file/directory stats
const stats = await stat("./package.json");
console.log("Is file:", stats.isFile());
console.log("Is directory:", stats.isDirectory());
console.log("Size:", stats.size);
```

### Directory Traversal Patterns
```javascript
import { readdir, stat } from "node:fs/promises";
import { join } from "path";

// Recursive file finder
async function findFiles(dir, pattern = /.*/) {
  const results = [];
  
  const entries = await readdir(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    
    if (entry.isDirectory()) {
      // Recursively search subdirectories
      const subResults = await findFiles(fullPath, pattern);
      results.push(...subResults);
    } else if (pattern.test(entry.name)) {
      results.push(fullPath);
    }
  }
  
  return results;
}

// Usage examples
const jsFiles = await findFiles("./src", /\.js$/);
const typeScriptFiles = await findFiles("./src", /\.tsx?$/);
const allFiles = await findFiles("./src");
```

### Directory Utilities
```javascript
import { readdir, mkdir, stat } from "node:fs/promises";
import { join, dirname } from "path";

// Ensure directory exists
async function ensureDir(path) {
  try {
    await mkdir(path, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
  }
}

// Get directory size
async function getDirectorySize(dirPath) {
  let totalSize = 0;
  const entries = await readdir(dirPath, { recursive: true });
  
  for (const entry of entries) {
    try {
      const fullPath = join(dirPath, entry);
      const stats = await stat(fullPath);
      if (stats.isFile()) {
        totalSize += stats.size;
      }
    } catch (error) {
      // Skip inaccessible files
      continue;
    }
  }
  
  return totalSize;
}

// Copy directory structure
async function copyStructure(src, dest) {
  const entries = await readdir(src, { withFileTypes: true });
  await ensureDir(dest);
  
  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);
    
    if (entry.isDirectory()) {
      await copyStructure(srcPath, destPath);
    } else {
      const content = await Bun.file(srcPath).bytes();
      await Bun.write(destPath, content);
    }
  }
}
```

## File Watching

### Basic File Watching
```javascript
import { watch } from "fs";

// Watch a single file
const watcher = watch("config.json", (eventType, filename) => {
  console.log(`${eventType} detected on ${filename}`);
  
  if (eventType === "change") {
    // Reload configuration
    reloadConfig();
  }
});

// Watch directory (shallow)
const dirWatcher = watch("./src", (eventType, filename) => {
  console.log(`File ${filename} was ${eventType}d`);
});

// Stop watching
// watcher.close();
```

### Recursive Directory Watching
```javascript
import { watch } from "fs";

// Watch directory recursively (including subdirectories)
const recursiveWatcher = watch(
  "./src",
  { recursive: true },
  (eventType, filename) => {
    console.log(`${eventType} detected: ${filename}`);
    
    // Handle different event types
    switch (eventType) {
      case "change":
        console.log(`File modified: ${filename}`);
        break;
      case "rename":
        console.log(`File renamed/added/deleted: ${filename}`);
        break;
    }
  }
);
```

### Advanced File Watching with Promises
```javascript
import { watch } from "fs/promises";

async function watchForChanges(directory) {
  try {
    const watcher = watch(directory, { recursive: true });
    
    for await (const event of watcher) {
      console.log(`Event: ${event.eventType} on ${event.filename}`);
      
      // Process the change
      await handleFileChange(event);
    }
  } catch (error) {
    console.error("Watch error:", error);
  }
}

async function handleFileChange(event) {
  if (event.filename?.endsWith('.json')) {
    // Reload JSON configuration files
    const content = await Bun.file(event.filename).json();
    console.log("Reloaded config:", content);
  }
}

// Start watching
watchForChanges("./config");
```

### Debounced File Watching
```javascript
import { watch } from "fs";

class DebouncedWatcher {
  constructor(path, callback, delay = 300) {
    this.callback = callback;
    this.delay = delay;
    this.timeouts = new Map();
    
    this.watcher = watch(path, { recursive: true }, (eventType, filename) => {
      this.handleEvent(eventType, filename);
    });
  }
  
  handleEvent(eventType, filename) {
    const key = `${eventType}:${filename}`;
    
    // Clear existing timeout
    if (this.timeouts.has(key)) {
      clearTimeout(this.timeouts.get(key));
    }
    
    // Set new timeout
    const timeout = setTimeout(() => {
      this.callback(eventType, filename);
      this.timeouts.delete(key);
    }, this.delay);
    
    this.timeouts.set(key, timeout);
  }
  
  close() {
    // Clear all timeouts
    for (const timeout of this.timeouts.values()) {
      clearTimeout(timeout);
    }
    this.watcher.close();
  }
}

// Usage
const watcher = new DebouncedWatcher("./src", (eventType, filename) => {
  console.log(`Debounced ${eventType} on ${filename}`);
}, 500);
```

## Streaming Operations

### Reading Large Files with Streams
```javascript
// Process large files without loading into memory
const largeFile = Bun.file("very-large.log");
const stream = largeFile.stream();

const reader = stream.getReader();
const decoder = new TextDecoder();

try {
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    const chunk = decoder.decode(value, { stream: true });
    // Process chunk without loading entire file
    console.log("Processing chunk:", chunk.length, "bytes");
  }
} finally {
  reader.releaseLock();
}
```

### Line-by-Line Processing
```javascript
// Custom line reader for large files
async function* readLines(file) {
  const stream = file.stream();
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  
  let buffer = '';
  
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      
      while (buffer.includes('\n')) {
        const lineEnd = buffer.indexOf('\n');
        const line = buffer.slice(0, lineEnd);
        buffer = buffer.slice(lineEnd + 1);
        yield line;
      }
    }
    
    // Yield remaining buffer if it contains data
    if (buffer.length > 0) {
      yield buffer;
    }
  } finally {
    reader.releaseLock();
  }
}

// Usage
const logFile = Bun.file("access.log");
for await (const line of readLines(logFile)) {
  if (line.includes("ERROR")) {
    console.log("Error found:", line);
  }
}
```

### Transform Streams
```javascript
// Transform file content during reading
const inputFile = Bun.file("input.txt");
const outputFile = Bun.file("output.txt");

// Create transform stream to uppercase content
const transformStream = new TransformStream({
  transform(chunk, controller) {
    const text = new TextDecoder().decode(chunk);
    const upperText = text.toUpperCase();
    controller.enqueue(new TextEncoder().encode(upperText));
  }
});

// Pipe through transform
const inputStream = inputFile.stream();
const transformedStream = inputStream.pipeThrough(transformStream);

// Write to output
await Bun.write(outputFile, transformedStream);
```

## Advanced Patterns

### File Operations with Metadata
```javascript
class FileManager {
  static async copyWithMetadata(src, dest) {
    const srcFile = Bun.file(src);
    const content = await srcFile.bytes();
    
    // Copy content
    await Bun.write(dest, content);
    
    // Preserve metadata
    const destFile = Bun.file(dest);
    return {
      originalSize: srcFile.size,
      originalType: srcFile.type,
      copiedSize: destFile.size,
      copiedAt: new Date()
    };
  }
  
  static async compareFiles(file1Path, file2Path) {
    const [file1, file2] = [Bun.file(file1Path), Bun.file(file2Path)];
    
    // Quick size comparison
    if (file1.size !== file2.size) {
      return false;
    }
    
    // Content comparison for small files
    if (file1.size < 1024 * 1024) { // 1MB
      const [content1, content2] = await Promise.all([
        file1.bytes(),
        file2.bytes()
      ]);
      return Buffer.compare(content1, content2) === 0;
    }
    
    // Hash comparison for large files
    const [hash1, hash2] = await Promise.all([
      Bun.hash(await file1.bytes(), 'sha256'),
      Bun.hash(await file2.bytes(), 'sha256')
    ]);
    
    return hash1 === hash2;
  }
}
```

### Atomic File Operations
```javascript
// Atomic writes using temporary files
async function atomicWrite(path, data) {
  const tempPath = `${path}.tmp.${Date.now()}`;
  
  try {
    // Write to temporary file first
    await Bun.write(tempPath, data);
    
    // Move to final location (atomic operation)
    await $`mv ${tempPath} ${path}`;
    
    return true;
  } catch (error) {
    // Clean up temporary file on error
    try {
      await $`rm -f ${tempPath}`;
    } catch (cleanupError) {
      // Ignore cleanup errors
    }
    throw error;
  }
}

// Atomic updates with backup
async function atomicUpdate(path, updateFn) {
  const backupPath = `${path}.backup.${Date.now()}`;
  
  try {
    // Create backup
    const original = await Bun.file(path).bytes();
    await Bun.write(backupPath, original);
    
    // Apply update
    const updated = await updateFn(original);
    await atomicWrite(path, updated);
    
    // Remove backup on success
    await $`rm -f ${backupPath}`;
    
    return true;
  } catch (error) {
    // Restore from backup on error
    try {
      await $`mv ${backupPath} ${path}`;
    } catch (restoreError) {
      console.error("Failed to restore backup:", restoreError);
    }
    throw error;
  }
}
```

### File Caching System
```javascript
class FileCache {
  constructor(maxAge = 5 * 60 * 1000) { // 5 minutes default
    this.cache = new Map();
    this.maxAge = maxAge;
  }
  
  async get(path) {
    const file = Bun.file(path);
    const cacheKey = path;
    
    // Check cache
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      
      // Validate cache based on file modification time
      if (file.lastModified <= cached.timestamp + this.maxAge) {
        return cached.content;
      }
    }
    
    // Read and cache
    const content = await file.text();
    this.cache.set(cacheKey, {
      content,
      timestamp: Date.now()
    });
    
    return content;
  }
  
  clear() {
    this.cache.clear();
  }
  
  delete(path) {
    this.cache.delete(path);
  }
}

// Usage
const cache = new FileCache(10 * 60 * 1000); // 10 minutes
const config = await cache.get("config.json");
```

## Performance Optimization

### Parallel File Operations
```javascript
// Process multiple files concurrently
async function processFiles(filePaths, processor) {
  const chunks = [];
  const chunkSize = 10; // Process 10 files at a time
  
  for (let i = 0; i < filePaths.length; i += chunkSize) {
    chunks.push(filePaths.slice(i, i + chunkSize));
  }
  
  const results = [];
  
  for (const chunk of chunks) {
    const chunkResults = await Promise.all(
      chunk.map(async (path) => {
        try {
          const file = Bun.file(path);
          return await processor(file, path);
        } catch (error) {
          return { error: error.message, path };
        }
      })
    );
    results.push(...chunkResults);
  }
  
  return results;
}

// Usage example: Count lines in multiple files
const results = await processFiles(
  ["file1.txt", "file2.txt", "file3.txt"],
  async (file) => {
    const content = await file.text();
    return { lines: content.split('\n').length };
  }
);
```

### Memory-Efficient Large File Processing
```javascript
// Process large files without loading everything into memory
async function processLargeFile(filePath, chunkProcessor) {
  const file = Bun.file(filePath);
  const stream = file.stream();
  const reader = stream.getReader();
  
  let bytesProcessed = 0;
  const startTime = Date.now();
  
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      await chunkProcessor(value);
      bytesProcessed += value.length;
      
      // Progress reporting
      if (bytesProcessed % (1024 * 1024) === 0) { // Every MB
        const elapsed = Date.now() - startTime;
        const rate = (bytesProcessed / 1024 / 1024) / (elapsed / 1000);
        console.log(`Processed ${(bytesProcessed / 1024 / 1024).toFixed(2)} MB at ${rate.toFixed(2)} MB/s`);
      }
    }
  } finally {
    reader.releaseLock();
  }
  
  console.log(`Total processed: ${(bytesProcessed / 1024 / 1024).toFixed(2)} MB`);
}
```

## Error Handling

### Robust File Operations
```javascript
import { $ } from "bun";

class SafeFileOperations {
  static async readSafely(path, defaultValue = null) {
    try {
      const file = Bun.file(path);
      return await file.text();
    } catch (error) {
      console.warn(`Failed to read ${path}: ${error.message}`);
      return defaultValue;
    }
  }
  
  static async writeSafely(path, data, backup = true) {
    try {
      if (backup && Bun.file(path).size > 0) {
        // Create backup
        await $`cp ${path} ${path}.backup`;
      }
      
      await Bun.write(path, data);
      return true;
    } catch (error) {
      console.error(`Failed to write ${path}: ${error.message}`);
      
      // Restore backup if write failed
      if (backup) {
        try {
          await $`mv ${path}.backup ${path}`;
        } catch (restoreError) {
          console.error("Failed to restore backup:", restoreError.message);
        }
      }
      
      return false;
    }
  }
  
  static async existsAndReadable(path) {
    try {
      const file = Bun.file(path);
      // Attempt to read first few bytes
      await file.slice(0, 1).text();
      return true;
    } catch (error) {
      return false;
    }
  }
}
```

## Node.js Compatibility

### Migration Patterns
```javascript
// Node.js fs/promises
import { readFile, writeFile } from "fs/promises";
const nodeContent = await readFile("file.txt", "utf8");
await writeFile("output.txt", "data");

// Bun equivalent (faster)
const bunContent = await Bun.file("file.txt").text();
await Bun.write("output.txt", "data");

// Both approaches work in Bun
const content = process.env.USE_BUNS_API 
  ? await Bun.file("file.txt").text()
  : await readFile("file.txt", "utf8");
```

### Performance Comparison
- **Reading files**: Bun.file() is ~2x faster than fs.readFile
- **Writing files**: Bun.write() is ~2-3x faster than fs.writeFile  
- **Large files**: Streaming with Bun.file().stream() outperforms Node.js streams
- **Memory usage**: BunFile's lazy loading reduces memory footprint

### Best Practices for Migration
1. **Start with Bun APIs** for new code
2. **Keep Node.js APIs** for directory operations (until Bun implements them)
3. **Use both approaches** during transition periods
4. **Benchmark critical paths** to measure improvements
5. **Test thoroughly** as some Node.js specific behaviors may differ

This comprehensive guide covers Bun's filesystem operations, providing practical patterns for efficient, safe, and performant file handling in modern JavaScript applications.