# SvelteKit Advanced Features Guide

## Hooks

Hooks are app-wide functions that SvelteKit calls in response to specific events.

### Hook Files
- **`src/hooks.server.js`** - Server-side hooks
- **`src/hooks.client.js`** - Client-side hooks  
- **`src/hooks.js`** - Universal hooks (both server and client)

### Server Hooks

#### `handle` - Request Interception
Runs on every request, allows modifying responses:

```js
// src/hooks.server.js
export async function handle({ event, resolve }) {
  // Custom routing
  if (event.url.pathname.startsWith('/api/legacy')) {
    return new Response('Use /api/v2 instead', { status: 410 });
  }
  
  // Add custom headers
  const response = await resolve(event);
  response.headers.set('x-custom-header', 'value');
  
  return response;
}
```

#### Request Enhancement
```js
export async function handle({ event, resolve }) {
  // Add user data to all requests
  event.locals.user = await getUserFromSession(
    event.cookies.get('sessionid')
  );
  
  // Transform HTML before sending
  return resolve(event, {
    transformPageChunk: ({ html, done }) => {
      return html.replace('%app.version%', '1.0.0');
    },
    filterSerializedResponseHeaders: (name) => name.startsWith('x-'),
    preload: ({ type, path }) => type === 'js' || path.includes('/critical/')
  });
}
```

#### `handleFetch` - Server-Side Fetch Modification
Modify fetch requests on the server:

```js
export async function handleFetch({ request, fetch }) {
  // Redirect API calls to internal service
  if (request.url.startsWith('https://api.external.com/')) {
    request = new Request(
      request.url.replace('https://api.external.com/', 'http://localhost:9999/'),
      request
    );
  }
  
  return fetch(request);
}
```

#### `handleError` - Error Processing
Handle unexpected errors:

```js
export async function handleError({ error, event, status, message }) {
  const errorId = crypto.randomUUID();
  
  // Log to service (Sentry, etc.)
  console.error('Error:', { error, errorId, url: event.url.pathname });
  
  // Return safe error info
  return {
    message: 'Something went wrong',
    errorId
  };
}
```

### Universal Hooks

#### `reroute` - URL Rewriting
Transform URLs before routing:

```js
// src/hooks.js
const redirects = {
  '/old-about': '/about',
  '/contact-us': '/contact'
};

export function reroute({ url }) {
  if (url.pathname in redirects) {
    return redirects[url.pathname];
  }
}
```

#### `transport` - Custom Type Serialization
Serialize custom types across server/client boundary:

```js
import { MyCustomClass } from '$lib/types';

export const transport = {
  MyCustomClass: {
    encode: (value) => value instanceof MyCustomClass && [value.data],
    decode: ([data]) => new MyCustomClass(data)
  }
};
```

## State Management

### Server vs Client State Rules

**❌ Never do this on the server:**
```js
let sharedUser; // Shared between all users!

export async function load() {
  return { user: sharedUser };
}

export const actions = {
  default: async ({ request }) => {
    sharedUser = await processUser(request); // BAD!
  }
};
```

**✅ Use authentication and databases:**
```js
export async function load({ cookies }) {
  const sessionId = cookies.get('sessionid');
  return {
    user: await getUserFromDb(sessionId)
  };
}
```

### Context-Based State
Safe way to share state in components:

```svelte
<!-- +layout.svelte -->
<script>
  import { setContext } from 'svelte';
  
  let { data } = $props();
  
  // Share state via context
  setContext('user', () => data.user);
</script>
```

```svelte
<!-- Child component -->
<script>
  import { getContext } from 'svelte';
  
  const getUser = getContext('user');
  const user = $derived(getUser());
</script>

<p>Hello {user.name}</p>
```

### Reactive State
Component state persists during navigation - make it reactive:

```svelte
<script>
  let { data } = $props();
  
  // ❌ Won't update on navigation
  const wordCount = data.content.split(' ').length;
  
  // ✅ Updates on navigation  
  const wordCount = $derived(data.content.split(' ').length);
  const readingTime = $derived(Math.ceil(wordCount / 250));
</script>
```

### State Storage Options

| Storage | Persistence | Use Case |
|---------|-------------|----------|
| **Component state** | Navigation only | UI state, temporary data |
| **URL parameters** | Reload + SSR | Filters, search, pagination |
| **Cookies** | Sessions | User preferences, auth tokens |
| **Database** | Permanent | User data, content |
| **Snapshots** | History navigation | Accordion state, scroll position |

```js
// URL state
export async function load({ url }) {
  const search = url.searchParams.get('q') ?? '';
  const results = await searchPosts(search);
  return { search, results };
}
```

## Advanced Routing

### Route Matching
```
src/routes/
├── blog/[slug]/+page.svelte          # /blog/hello
├── admin/[...path]/+page.svelte      # /admin/users/123
├── (app)/dashboard/+page.svelte      # /dashboard (grouped)
├── (marketing)/+layout.svelte        # Layout for marketing pages
└── [[lang]]/about/+page.svelte       # /about or /en/about
```

### Route Parameters
```js
// src/routes/blog/[slug]/+page.server.js
export async function load({ params }) {
  return {
    post: await getPost(params.slug)
  };
}
```

### Param Matchers
```js
// src/params/integer.js
export function match(param) {
  return /^\d+$/.test(param);
}
```

```
src/routes/users/[id=integer]/+page.svelte  # Only matches numbers
```

### Route Groups
```
src/routes/
├── (app)/                    # Layout group - doesn't affect URL
│   ├── +layout.svelte       # Shared layout
│   ├── dashboard/+page.svelte
│   └── profile/+page.svelte
└── (marketing)/             # Different layout
    ├── +layout.svelte
    ├── +page.svelte
    └── pricing/+page.svelte
```

## Load Functions Deep Dive

### Dependency Tracking
SvelteKit automatically tracks dependencies and reruns load functions:

```js
export async function load({ params, url, fetch }) {
  // Reruns when params.slug changes
  const post = await getPost(params.slug);
  
  // Reruns when ?sort parameter changes  
  const sort = url.searchParams.get('sort') ?? 'date';
  const comments = await getComments(post.id, sort);
  
  return { post, comments, sort };
}
```

### Parent Data Access
```js
// Parent layout
export async function load() {
  return { user: await getUser() };
}

// Child page
export async function load({ parent }) {
  const { user } = await parent();
  return {
    posts: await getUserPosts(user.id)
  };
}
```

### Error Handling in Load
```js
import { error, redirect } from '@sveltejs/kit';

export async function load({ params }) {
  const post = await getPost(params.slug);
  
  if (!post) {
    error(404, 'Post not found');
  }
  
  if (post.private) {
    redirect(303, '/login');
  }
  
  return { post };
}
```

## Advanced Form Handling

### Multiple Actions
```js
// +page.server.js
export const actions = {
  create: async ({ request }) => {
    // Handle creation
  },
  
  update: async ({ request }) => {
    // Handle updates  
  },
  
  delete: async ({ request }) => {
    // Handle deletion
  }
};
```

```svelte
<form method="POST" action="?/create">
  <button>Create</button>
</form>

<form method="POST" action="?/update">  
  <button>Update</button>
</form>

<form method="POST">
  <button formaction="?/delete">Delete</button>
</form>
```

### Advanced Enhancement
```svelte
<script>
  import { enhance } from '$app/forms';
  
  let submitting = false;
</script>

<form 
  method="POST" 
  use:enhance={({ formElement, formData, action, cancel }) => {
    submitting = true;
    
    // Add extra data
    formData.append('timestamp', Date.now().toString());
    
    // Conditional cancellation
    if (someCondition) {
      cancel();
      return;
    }
    
    return async ({ result, update }) => {
      submitting = false;
      
      if (result.type === 'success') {
        // Custom success handling
        showNotification('Success!');
        await update(); // Apply default behavior
      } else {
        // Custom error handling  
        showError('Something went wrong');
      }
    };
  }}
>
  <button disabled={submitting}>
    {submitting ? 'Submitting...' : 'Submit'}
  </button>
</form>
```

### File Uploads
```js
// +page.server.js  
export const actions = {
  upload: async ({ request }) => {
    const formData = await request.formData();
    const file = formData.get('file');
    
    if (!(file instanceof File)) {
      return fail(400, { error: 'No file uploaded' });
    }
    
    const buffer = await file.arrayBuffer();
    await saveFile(file.name, buffer);
    
    return { success: true };
  }
};
```

## Performance Optimization

### Code Splitting
```js
// Dynamic imports for large components
const HeavyComponent = lazy(() => import('$lib/HeavyComponent.svelte'));
```

### Preloading
```svelte
<a href="/slow-page" data-sveltekit-preload-data="hover">
  Hover to preload
</a>
```

### Resource Hints  
```svelte
<svelte:head>
  <link rel="preload" href="/critical.css" as="style">
  <link rel="prefetch" href="/next-page-data.json">
</svelte:head>
```

### Bundle Strategy
```js
// svelte.config.js
export default {
  kit: {
    output: {
      bundleStrategy: 'single' // Reduce HTTP requests
    }
  }
};
```

## Quick Reference

### Hook Execution Order
1. `reroute` (universal)
2. `handle` (server)
3. `handleFetch` (server, during load)  
4. Load functions
5. Actions (on POST)
6. `handleError` (on errors)

### Common Patterns
```js
// Authentication check
export async function handle({ event, resolve }) {
  if (event.url.pathname.startsWith('/admin')) {
    const user = await getUser(event.cookies);
    if (!user?.isAdmin) {
      return redirect(303, '/login');
    }
  }
  return resolve(event);
}

// API versioning
export function reroute({ url }) {
  if (url.pathname.startsWith('/api/v1')) {
    return url.pathname.replace('/api/v1', '/api/v2');
  }
}

// Request timing
export async function handle({ event, resolve }) {
  const start = Date.now();
  const response = await resolve(event);
  const end = Date.now();
  
  response.headers.set('x-response-time', `${end - start}ms`);
  return response;
}
```