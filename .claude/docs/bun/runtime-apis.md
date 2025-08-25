---
source: https://bun.sh/docs/runtime/bun-apis
fetched: 2025-08-19
version: latest
---

# Bun Runtime APIs Quick Reference

## Table of Contents
- [Core Philosophy](#core-philosophy)
- [HTTP Server API](#http-server-api)
- [File System API](#file-system-api)
- [Password & Hashing API](#password--hashing-api)
- [Database API](#database-api)
- [Shell API](#shell-api)
- [Cloud Storage API](#cloud-storage-api)
- [Web Standard APIs](#web-standard-apis)
- [Performance Considerations](#performance-considerations)
- [Node.js Compatibility](#nodejs-compatibility)

## Core Philosophy

Bun provides highly optimized native APIs for common server-side tasks while preferring Web-standard APIs when possible. New APIs are introduced primarily where no standard exists.

### Design Principles
- **Web Standards First**: Use fetch, URL, WebSocket, Blob when available
- **Native Performance**: Heavily optimized implementations
- **Zero Configuration**: Works out of the box
- **TypeScript Support**: Full type definitions included

## HTTP Server API

### Bun.serve()
High-performance HTTP server built on Web standards:

```javascript
// Basic server
const server = Bun.serve({
  port: 3000,
  fetch(request) {
    return new Response('Hello, Bun!');
  }
});

// Advanced server with routing
Bun.serve({
  port: 3000,
  fetch(request) {
    const url = new URL(request.url);
    
    if (url.pathname === '/api/users') {
      return Response.json({ users: [] });
    }
    
    if (url.pathname.startsWith('/static/')) {
      return new Response(Bun.file(`./public${url.pathname}`));
    }
    
    return new Response('Not Found', { status: 404 });
  }
});
```

### Features
- Static and dynamic routing
- Per-HTTP method handlers
- Wildcard support
- Built-in redirects
- WebSocket support
- Streaming responses

### Performance
- Built on native implementation
- Request/Response objects optimized
- Zero-copy file serving
- Automatic HTTP/2 support

## File System API

### Bun.file()
Optimized file operations with lazy loading:

```javascript
// Create file reference (lazy)
const file = Bun.file('path/to/file.txt');

// Read as text
const text = await file.text();

// Read as binary
const buffer = await file.arrayBuffer();
const bytes = await file.bytes();

// Stream large files
const stream = file.stream();

// File metadata
console.log(file.size);
console.log(file.type);  // MIME type
console.log(file.name);
```

### Bun.write()
Multi-purpose file writing:

```javascript
// Write text
await Bun.write('output.txt', 'Hello, World!');

// Write JSON
await Bun.write('data.json', { key: 'value' });

// Write binary data
await Bun.write('binary.dat', new Uint8Array([1, 2, 3]));

// Write stream
await Bun.write('large.txt', stream);

// Write to stdout
await Bun.write(Bun.stdout, 'Console output');
```

### BunFile Features
- Implements Blob interface
- Lazy loading for performance
- Automatic MIME type detection
- Memory-efficient streaming
- Cross-platform paths

## Password & Hashing API

### Bun.password
Cryptographically secure password handling:

```javascript
// Hash password (async)
const hash = await Bun.password.hash('my-password');
// Returns: "$argon2id$v=19$m=65536,t=2,p=1$..."

// Verify password (async)
const isValid = await Bun.password.verify('my-password', hash);

// Sync versions (blocking)
const hashSync = Bun.password.hashSync('my-password');
const isValidSync = Bun.password.verifySync('my-password', hash);

// Custom algorithm
const bcryptHash = await Bun.password.hash('password', {
  algorithm: 'bcrypt',
  cost: 12
});
```

### Supported Algorithms
- **argon2id** (default, recommended)
- **bcrypt**
- **scrypt**

### Security Features
- Automatic salt generation
- Salt included in hash output
- Configurable cost parameters
- Timing attack resistant

### Bun.hash()
Additional hashing algorithms:

```javascript
// 32-bit hashes (returns number)
const crc32 = Bun.hash.crc32('data');
const adler32 = Bun.hash.adler32('data');

// 64-bit hashes (returns bigint)
const wyhash = Bun.hash.wyhash('data');
const cityHash = Bun.hash.cityHash64('data');

// Cryptographic hashes
const sha256 = await Bun.hash('data', 'sha256');
const blake3 = await Bun.hash('data', 'blake3');
```

## Database API

### Bun.sql (PostgreSQL)
Native PostgreSQL bindings:

```javascript
// Connect to database
const sql = Bun.sql({
  hostname: 'localhost',
  port: 5432,
  database: 'myapp',
  username: 'user',
  password: 'pass'
});

// Query with parameters
const users = await sql`
  SELECT * FROM users 
  WHERE age > ${18} 
  AND city = ${city}
`;

// Insert data
await sql`
  INSERT INTO users (name, email) 
  VALUES (${name}, ${email})
`;

// Transaction
await sql.transaction(async (tx) => {
  await tx`INSERT INTO users (name) VALUES (${name})`;
  await tx`UPDATE stats SET count = count + 1`;
});
```

### Features
- Prepared statements by default
- Connection pooling
- Transaction support
- Type-safe queries
- High performance native bindings

## Shell API

### Bun.$
Cross-platform bash-like shell:

```javascript
// Execute commands
const result = await Bun.$`ls -la`;
console.log(result.stdout);

// Pipe commands
const output = await Bun.$`cat file.txt | grep "pattern" | wc -l`;

// Template literals with variables
const filename = 'data.txt';
await Bun.$`cp ${filename} backup_${filename}`;

// Conditional execution
if (await Bun.$`test -f package.json`.exitCode === 0) {
  await Bun.$`npm install`;
}

// Capture output
const { stdout, stderr, exitCode } = await Bun.$`git status`;
```

### Cross-Platform Features
- Works on Windows, macOS, Linux
- Built-in common commands (ls, cat, grep, etc.)
- Proper shell escaping
- Environment variable support

## Cloud Storage API

### Bun.s3
S3-compatible object storage:

```javascript
// Configure S3 client
const s3 = new Bun.S3Client({
  endpoint: 'https://s3.amazonaws.com',
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

// Upload file
await s3.putObject({
  bucket: 'my-bucket',
  key: 'uploads/file.txt',
  body: Bun.file('local-file.txt')
});

// Download file
const object = await s3.getObject({
  bucket: 'my-bucket',
  key: 'uploads/file.txt'
});
const content = await object.text();

// List objects
const objects = await s3.listObjects({
  bucket: 'my-bucket',
  prefix: 'uploads/'
});
```

### Supported Providers
- Amazon S3
- DigitalOcean Spaces
- Cloudflare R2
- MinIO
- Any S3-compatible service

## Web Standard APIs

Bun implements standard Web APIs with optimized performance:

### Fetch API
```javascript
// Standard fetch with optimizations
const response = await fetch('https://api.example.com/data');
const data = await response.json();

// File uploads
const formData = new FormData();
formData.append('file', Bun.file('upload.txt'));
await fetch('/upload', { method: 'POST', body: formData });
```

### URL API
```javascript
const url = new URL('https://example.com/path?query=value');
console.log(url.pathname);  // '/path'
console.log(url.searchParams.get('query'));  // 'value'
```

### WebSocket API
```javascript
const ws = new WebSocket('ws://localhost:8080');
ws.onmessage = (event) => console.log(event.data);
ws.send('Hello, Server!');
```

### Streams API
```javascript
// Transform streams
const transform = new TransformStream({
  transform(chunk, controller) {
    controller.enqueue(chunk.toString().toUpperCase());
  }
});

const readable = Bun.file('input.txt').stream();
const writable = Bun.file('output.txt').writer();
await readable.pipeThrough(transform).pipeTo(writable);
```

## Performance Considerations

### Optimization Tips
- **File operations**: Use `Bun.file()` for lazy loading
- **HTTP serving**: Leverage `Bun.serve()` for native performance
- **Database queries**: Use prepared statements via `Bun.sql`
- **Streaming**: Use streams for large data processing
- **Concurrent operations**: Leverage async/await and Promise.all()

### Memory Management
- BunFile uses lazy loading to minimize memory usage
- Streams automatically handle backpressure
- Connection pooling managed automatically
- Garbage collection optimized for server workloads

### Benchmarks
- HTTP server: 2-3x faster than Node.js
- File I/O: Significantly faster due to native implementation
- Password hashing: Hardware-optimized implementations
- Database operations: Native bindings eliminate overhead

## Node.js Compatibility

### Drop-in Replacements
Most Node.js APIs are supported, but Bun APIs often provide better performance:

```javascript
// Node.js way
const fs = require('fs').promises;
const data = await fs.readFile('file.txt', 'utf8');

// Bun way (faster)
const data = await Bun.file('file.txt').text();
```

### Migration Strategy
1. Start with existing Node.js code
2. Gradually replace with Bun APIs for performance
3. Use `--bun` flag to override Node.js dependencies
4. Test thoroughly with existing test suites

### Compatibility Notes
- Most npm packages work without modification
- Some Node.js-specific APIs may have different behavior
- Native modules may need recompilation
- Use Bun's compatibility layer for smooth migration

### Best Practices
- Prefer Bun APIs for new code
- Use Web standards when available
- Leverage TypeScript for better development experience
- Monitor performance improvements during migration