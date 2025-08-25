# SvelteKit Build & Deploy Guide

## Building Your App

Building happens in two stages when you run `npm run build`:

1. **Vite Build**: Creates optimized production build (server code, browser code, service worker)
2. **Adapter**: Takes the build and tunes it for your target environment

### During Build Process
- SvelteKit analyzes your `+page/layout(.server).js` files
- Code runs during analysis - use `building` guard for build-time-only code:

```js
import { building } from '$app/environment';
import { setupMyDatabase } from '$lib/server/database';

if (!building) {
  setupMyDatabase(); // Only run in production, not during build
}
```

### Preview Your App
```bash
npm run preview  # Preview production build locally (uses Node)
```
> Note: Preview doesn't perfectly replicate deployment (no adapter-specific features)

## Adapters

Adapters are plugins that prepare your SvelteKit app for specific deployment targets.

### Official Adapters

| Adapter | Platform | Use Case |
|---------|----------|----------|
| **`@sveltejs/adapter-auto`** | Auto-detects | Zero-config for major platforms |
| **`@sveltejs/adapter-static`** | Static hosts | CDN, GitHub Pages, Netlify static |
| **`@sveltejs/adapter-node`** | Node.js | VPS, Docker, custom servers |
| **`@sveltejs/adapter-vercel`** | Vercel | Serverless + edge functions |
| **`@sveltejs/adapter-netlify`** | Netlify | Serverless + edge functions |
| **`@sveltejs/adapter-cloudflare`** | Cloudflare | Pages + Workers |

### Configuration

```js
// svelte.config.js
import adapter from '@sveltejs/adapter-static';

export default {
  kit: {
    adapter: adapter({
      // adapter-specific options
      pages: 'build',
      assets: 'build',
      fallback: null
    })
  }
};
```

### Platform-Specific Context

Some adapters provide additional context via `event.platform`:

```js
// In hooks or server routes
export async function load({ platform }) {
  // Cloudflare: access to env, KV namespaces, etc.
  const value = await platform.env.MY_KV.get('key');
  return { value };
}
```

## Common Deployment Patterns

### Static Site (SSG)
```js
// svelte.config.js
import adapter from '@sveltejs/adapter-static';

export default {
  kit: {
    adapter: adapter(),
    prerender: { entries: ['*'] } // Prerender all pages
  }
};
```

### Node.js Server
```js
// svelte.config.js
import adapter from '@sveltejs/adapter-node';

export default {
  kit: {
    adapter: adapter({
      out: 'build',
      precompress: false,
      env: { port: 'PORT' }
    })
  }
};
```

### Serverless (Auto)
```js
// svelte.config.js
import adapter from '@sveltejs/adapter-auto';

export default {
  kit: {
    adapter: adapter()
  }
};
```

## Environment-Specific Setup

### Build Guards
```js
import { building, dev } from '$app/environment';

// Only run in production
if (!building && !dev) {
  initializeServices();
}

// Only during development
if (dev) {
  setupDevTools();
}
```

### Platform Detection
```js
export async function load({ platform, url }) {
  // Different behavior per platform
  if (platform?.env) {
    // Cloudflare
    return { data: await platform.env.KV.get('data') };
  } else if (url.hostname.includes('vercel')) {
    // Vercel-specific logic
    return { data: process.env.VERCEL_DATA };
  }
}
```

## Deployment Checklist

### Before Deployment
- [ ] Set environment variables
- [ ] Configure adapter for your platform
- [ ] Test build: `npm run build`
- [ ] Test preview: `npm run preview`
- [ ] Verify environment-specific code paths

### Static Deployment
- [ ] Set `adapter-static`
- [ ] Configure prerendering
- [ ] Handle dynamic routes (add fallback or entries)
- [ ] Test all routes generate properly

### Server Deployment
- [ ] Set appropriate adapter (`node`, `vercel`, etc.)
- [ ] Configure environment variables
- [ ] Set up database connections
- [ ] Configure reverse proxy (if needed)
- [ ] Set up process management (PM2, systemd, etc.)

### Serverless Deployment
- [ ] Configure function timeout
- [ ] Set memory limits
- [ ] Handle cold starts
- [ ] Configure database connections (connection pooling)
- [ ] Set environment variables

## Performance Optimization

### Build Size
```js
// svelte.config.js
export default {
  kit: {
    adapter: adapter(),
    output: {
      bundleStrategy: 'single' // Reduce HTTP requests
    }
  }
};
```

### Prerendering
```js
// +page.js
export const prerender = true; // Static generation
export const prerender = 'auto'; // Include in manifest + prerender
```

### Compression
```js
// Most adapters support compression
import adapter from '@sveltejs/adapter-node';

export default {
  kit: {
    adapter: adapter({
      precompress: true // Gzip/Brotli
    })
  }
};
```

## Troubleshooting

### Common Issues

**"Function is too large"**
- Use `bundleStrategy: 'single'` 
- Split large functions
- Use dynamic imports

**"Module not found during build"**
- Check `building` guards
- Ensure server-only imports are properly isolated
- Use `$lib/server` for server-only modules

**"Adapter not found"**
```bash
npm install @sveltejs/adapter-[platform]
```

**"Prerendering failed"**
- Check for client-only code in load functions
- Verify all dynamic routes have entries
- Check for infinite redirects

### Debug Mode
```bash
SVELTEKIT_LOG=debug npm run build
```

### Adapter-Specific Debugging

**Vercel:**
```bash
vercel dev  # Test locally with Vercel environment
```

**Netlify:**
```bash
netlify dev  # Test locally with Netlify environment
```

## Quick Deploy Commands

### Vercel
```bash
npx vercel
# or
git push origin main  # Auto-deploy on push
```

### Netlify
```bash
npx netlify deploy --build
# or
git push origin main  # Auto-deploy on push
```

### Static Hosting
```bash
npm run build
# Copy contents of build/ to your host
```

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["node", "build"]
```