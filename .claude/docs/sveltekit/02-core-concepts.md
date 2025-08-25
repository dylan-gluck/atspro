# SvelteKit Core Concepts Guide

## Filesystem-Based Routing

Routes are defined by your directory structure in `src/routes/`:

```
src/routes/
├── +page.svelte              # / (root)
├── about/
│   └── +page.svelte          # /about
├── blog/
│   ├── +page.svelte          # /blog
│   └── [slug]/
│       └── +page.svelte      # /blog/[slug] (dynamic)
└── admin/
    └── [...rest]/
        └── +page.svelte      # /admin/* (catch-all)
```

### Route Files (the `+` prefix)

| File | Purpose | Runs Where |
|------|---------|------------|
| `+page.svelte` | Page component | Client + Server |
| `+page.js` | Page data loading | Client + Server |
| `+page.server.js` | Server-only data loading | Server only |
| `+layout.svelte` | Shared layout wrapper | Client + Server |
| `+layout.js` | Layout data loading | Client + Server |
| `+layout.server.js` | Server-only layout data | Server only |
| `+server.js` | API endpoints | Server only |
| `+error.svelte` | Error pages | Client + Server |

### Key Rules
- All files can run on server
- All files run on client **except** `+server.js`
- `+layout` and `+error` files apply to subdirectories too

## Pages

### Basic Page (`+page.svelte`)
```svelte
<!-- src/routes/+page.svelte -->
<h1>Hello and welcome to my site!</h1>
<a href="/about">About my site</a>
```

SvelteKit uses standard `<a>` elements (not framework-specific `<Link>` components).

### Dynamic Pages
```svelte
<!-- src/routes/blog/[slug]/+page.svelte -->
<script>
  let { data } = $props();
</script>

<h1>{data.title}</h1>
<div>{@html data.content}</div>
```

## Data Loading

### Client + Server Loading (`+page.js`)
```js
// src/routes/blog/[slug]/+page.js
import { error } from '@sveltejs/kit';

export async function load({ params }) {
  if (params.slug === 'hello-world') {
    return {
      title: 'Hello world!',
      content: 'Welcome to our blog...'
    };
  }
  
  error(404, 'Not found');
}
```

### Server-Only Loading (`+page.server.js`)
```js
// src/routes/blog/[slug]/+page.server.js  
import { error } from '@sveltejs/kit';

export async function load({ params }) {
  // Can access database, private env vars, etc.
  const post = await getPostFromDatabase(params.slug);
  
  if (post) {
    return post;
  }
  
  error(404, 'Not found');
}
```

**When to use server-only:**
- Database access
- Private API keys  
- Sensitive operations
- Server-only environment variables

### Data in Components
```svelte
<!-- +page.svelte -->
<script>
  let { data } = $props();
</script>

<h1>{data.title}</h1>
```

Data from `load` functions is automatically available as the `data` prop.

## Layouts

### Basic Layout (`+layout.svelte`)
```svelte
<!-- src/routes/+layout.svelte -->
<script>
  let { children } = $props();
</script>

<nav>
  <a href="/">Home</a>
  <a href="/about">About</a>
  <a href="/settings">Settings</a>
</nav>

{@render children()}
```

### Nested Layouts
```svelte
<!-- src/routes/settings/+layout.svelte -->
<script>
  let { data, children } = $props();
</script>

<h1>Settings</h1>

<div class="submenu">
  {#each data.sections as section}
    <a href="/settings/{section.slug}">{section.title}</a>
  {/each}
</div>

{@render children()}
```

### Layout Data Loading
```js  
// src/routes/settings/+layout.js
export function load() {
  return {
    sections: [
      { slug: 'profile', title: 'Profile' },
      { slug: 'notifications', title: 'Notifications' }
    ]
  };
}
```

Layout data is available to all child pages automatically.

## API Routes (`+server.js`)

Create API endpoints by exporting HTTP method handlers:

```js
// src/routes/api/random-number/+server.js
import { error } from '@sveltejs/kit';

export function GET({ url }) {
  const min = Number(url.searchParams.get('min') ?? '0');
  const max = Number(url.searchParams.get('max') ?? '1');
  const d = max - min;
  
  if (isNaN(d) || d < 0) {
    error(400, 'min and max must be numbers, and min must be less than max');
  }
  
  const random = min + Math.random() * d;
  return new Response(String(random));
}
```

### Supported Methods
- `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`, `HEAD`
- `fallback` - handles unhandled methods

### JSON API Example
```js
// src/routes/api/add/+server.js
import { json } from '@sveltejs/kit';

export async function POST({ request }) {
  const { a, b } = await request.json();
  return json(a + b);
}
```

### Content Negotiation
SvelteKit automatically routes requests based on `Accept` headers:
- HTML requests → `+page.svelte`
- JSON/API requests → `+server.js`

## Form Actions

Handle form submissions with server-side actions:

### Default Action
```js
// src/routes/login/+page.server.js
export const actions = {
  default: async (event) => {
    // TODO log the user in
  }
};
```

```svelte
<!-- src/routes/login/+page.svelte -->
<form method="POST">
  <label>
    Email
    <input name="email" type="email">
  </label>
  <label>
    Password
    <input name="password" type="password">
  </label>
  <button>Log in</button>
</form>
```

### Named Actions
```js
// src/routes/login/+page.server.js
export const actions = {
  login: async (event) => {
    // TODO log the user in
  },
  register: async (event) => {
    // TODO register the user  
  }
};
```

```svelte
<!-- Target specific actions -->
<form method="POST" action="?/login">
  <!-- form fields -->
  <button>Log in</button>
  <button formaction="?/register">Register</button>
</form>
```

### Processing Form Data
```js
export const actions = {
  login: async ({ cookies, request }) => {
    const data = await request.formData();
    const email = data.get('email');
    const password = data.get('password');
    
    const user = await db.getUser(email);
    cookies.set('sessionid', await db.createSession(user), { path: '/' });
    
    return { success: true };
  }
};
```

### Validation Errors
```js
import { fail } from '@sveltejs/kit';

export const actions = {
  login: async ({ request }) => {
    const data = await request.formData();
    const email = data.get('email');
    
    if (!email) {
      return fail(400, { email, missing: true });
    }
    
    // Process login...
  }
};
```

```svelte
<!-- Show validation errors -->
<script>
  let { form } = $props();
</script>

<form method="POST">
  {#if form?.missing}<p class="error">Email is required</p>{/if}
  
  <input name="email" type="email" value={form?.email ?? ''}>
  <button>Log in</button>
</form>
```

### Redirects
```js
import { redirect } from '@sveltejs/kit';

export const actions = {
  login: async ({ url, cookies }) => {
    // ... authentication logic
    
    if (url.searchParams.has('redirectTo')) {
      redirect(303, url.searchParams.get('redirectTo'));
    }
    
    return { success: true };
  }
};
```

## Progressive Enhancement

### Basic Enhancement
```svelte
<script>
  import { enhance } from '$app/forms';
</script>

<form method="POST" use:enhance>
  <!-- Works with or without JavaScript -->
</form>
```

Without arguments, `enhance` provides:
- No full page reloads
- Updates `form` prop on response  
- Resets form on success
- Handles redirects and errors
- Manages focus

### Custom Enhancement  
```svelte
<form
  method="POST"
  use:enhance={({ formElement, formData, action, cancel }) => {
    return async ({ result, update }) => {
      if (result.type === 'redirect') {
        goto(result.location);
      } else {
        await applyAction(result);
      }
    };
  }}
>
```

## Error Handling

### Error Pages (`+error.svelte`)
```svelte
<!-- src/routes/blog/[slug]/+error.svelte -->
<script>
  import { page } from '$app/state';
</script>

<h1>{page.status}: {page.error.message}</h1>
```

SvelteKit walks up the tree to find the closest error boundary:
1. `src/routes/blog/[slug]/+error.svelte`
2. `src/routes/blog/+error.svelte`  
3. `src/routes/+error.svelte`
4. Default error page

### Throwing Errors
```js
import { error } from '@sveltejs/kit';

// In load functions
export function load() {
  error(404, 'Not found');
  error(500, 'Internal error');
}
```

## Page Options

Configure rendering behavior per page/layout:

### Prerendering
```js
// +page.js or +page.server.js
export const prerender = true;    // Pre-generate at build time
export const prerender = false;   // Dynamic server rendering  
export const prerender = 'auto';  // Include in manifest but can prerender
```

### Server-Side Rendering
```js
export const ssr = false; // Disable server rendering (SPA mode)
```

### Client-Side Rendering  
```js
export const csr = false; // Disable JavaScript hydration
```

### Trailing Slashes
```js
export const trailingSlash = 'always';  // /about/
export const trailingSlash = 'never';   // /about (default)
export const trailingSlash = 'ignore';  // Allow both
```

## Type Safety (`$types`)

SvelteKit generates TypeScript types automatically:

```svelte
<!-- +page.svelte -->
<script lang="ts">
  import type { PageProps } from './$types';
  
  let { data }: PageProps = $props();
</script>
```

```ts
// +page.js
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
  // params and return value are typed automatically
  return {
    title: 'Hello'
  };
};
```

## Quick Reference

### Route Patterns
- `/` → `src/routes/+page.svelte`
- `/about` → `src/routes/about/+page.svelte` 
- `/blog/hello` → `src/routes/blog/[slug]/+page.svelte`
- `/admin/users/123` → `src/routes/admin/[...rest]/+page.svelte`

### Data Flow
1. `+layout.server.js` loads (server-only)
2. `+layout.js` loads (universal)  
3. `+page.server.js` loads (server-only)
4. `+page.js` loads (universal)
5. Data flows to `+layout.svelte` and `+page.svelte`

### Form Actions Flow
1. Form submits to action
2. Action processes data
3. Action returns data or redirects
4. Page re-renders with action result
5. Result available in `form` prop