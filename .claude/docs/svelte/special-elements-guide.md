# Svelte Special Elements Guide

Special elements in Svelte provide access to browser APIs and advanced component features.

## `<svelte:window>`

Bind to window events and properties without managing listeners manually.

### Event Listeners
```svelte
<script>
  function handleKeydown(event) {
    alert(`pressed the ${event.key} key`);
  }
  
  function handleResize() {
    console.log('window resized');
  }
</script>

<svelte:window 
  onkeydown={handleKeydown}
  onresize={handleResize}
/>
```

### Window Properties (Bindable)
```svelte
<script>
  let y = 0;
  let innerWidth = 0;
  let innerHeight = 0;
</script>

<svelte:window 
  bind:scrollY={y}
  bind:innerWidth
  bind:innerHeight
  bind:outerWidth
  bind:outerHeight
  bind:scrollX
  bind:online
  bind:devicePixelRatio
/>

<p>Window size: {innerWidth} x {innerHeight}</p>
<p>Scroll position: {y}</p>
```

**Properties:**
- `innerWidth`, `innerHeight` (readonly)
- `outerWidth`, `outerHeight` (readonly)
- `scrollX`, `scrollY` (writable)
- `online` (readonly) - alias for `window.navigator.onLine`
- `devicePixelRatio` (readonly)

**Notes:**
- Must be at top level of component
- Cannot be inside blocks or elements
- Page won't scroll to initial values (accessibility)
- Use `scrollTo()` in `$effect` if you need initial scroll

## `<svelte:document>`

Bind to document events and properties.

### Event Listeners
```svelte
<script>
  function handleVisibilityChange() {
    console.log('visibility changed');
  }
  
  function handleSelectionChange() {
    console.log('selection changed');
  }
</script>

<svelte:document 
  onvisibilitychange={handleVisibilityChange}
  onselectionchange={handleSelectionChange}
/>
```

### Document Properties (Readonly)
```svelte
<script>
  let activeElement;
  let fullscreenElement;
  let visibilityState;
</script>

<svelte:document 
  bind:activeElement
  bind:fullscreenElement
  bind:pointerLockElement
  bind:visibilityState
/>

<p>Active element: {activeElement?.tagName}</p>
<p>Visibility: {visibilityState}</p>
```

### Using Actions on Document
```svelte
<script>
  function documentAction(node) {
    // Custom action logic
    return {
      destroy() {
        // Cleanup
      }
    };
  }
</script>

<svelte:document use:documentAction />
```

## `<svelte:body>`

Similar to `<svelte:document>` but for the `<body>` element.

```svelte
<script>
  function handleMouseMove(event) {
    console.log(`Mouse at ${event.clientX}, ${event.clientY}`);
  }
</script>

<svelte:body onmousemove={handleMouseMove} />
```

## `<svelte:head>`

Insert elements into the document `<head>`.

```svelte
<script>
  export let title = 'Default Title';
  export let description = 'Default description';
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="description" content={description} />
  <meta property="og:title" content={title} />
  <meta property="og:description" content={description} />
  <link rel="stylesheet" href="/styles/page-specific.css" />
</svelte:head>

<h1>Page content</h1>
```

**Use Cases:**
- Dynamic page titles
- Meta tags for SEO
- Page-specific stylesheets
- Analytics scripts
- Favicons

## `<svelte:options>`

Configure component compilation options.

```svelte
<svelte:options 
  runes={true}
  immutable={false}
  customElement={{
    tag: 'my-element',
    shadow: 'open',
    props: {
      name: { type: 'String' }
    }
  }}
/>

<script>
  let { name = 'World' } = $props();
</script>

<h1>Hello {name}!</h1>
```

**Options:**
- `runes` - Enable/disable runes mode
- `immutable` - Assume all data is immutable
- `customElement` - Compile as custom element
- `tag` - Custom element tag name
- `shadow` - Shadow DOM mode ('open', 'closed', 'none')

## `<svelte:fragment>`

Render multiple elements without wrapper.

```svelte
<script>
  export let items = [];
</script>

<ul>
  {#each items as item}
    <li>
      <svelte:fragment>
        <strong>{item.name}</strong>
        <span>{item.description}</span>
      </svelte:fragment>
    </li>
  {/each}
</ul>
```

**Use Cases:**
- Avoiding wrapper divs
- Multiple top-level elements in slots
- Clean DOM structure

## `<svelte:element>`

Dynamically create elements.

```svelte
<script>
  export let tag = 'div';
  export let text = 'Hello';
</script>

<svelte:element 
  this={tag}
  class="dynamic-element"
  onclick={() => console.log('clicked')}
>
  {text}
</svelte:element>

<!-- Conditionally render different elements -->
{#if heading}
  <svelte:element this="h{level}" {id}>
    {title}
  </svelte:element>
{:else}
  <svelte:element this="p">
    {content}
  </svelte:element>
{/if}
```

**Use Cases:**
- Dynamic heading levels (`h1`, `h2`, etc.)
- Conditional element types
- Component libraries with flexible elements

## `<svelte:component>`

Dynamically render components.

```svelte
<script>
  import Button from './Button.svelte';
  import Input from './Input.svelte';
  import Select from './Select.svelte';
  
  export let componentType = 'button';
  export let props = {};
  
  const components = {
    button: Button,
    input: Input,
    select: Select
  };
  
  $: CurrentComponent = components[componentType];
</script>

<svelte:component 
  this={CurrentComponent} 
  {...props}
  on:click
  on:input
/>

<!-- With conditional rendering -->
{#if CurrentComponent}
  <svelte:component this={CurrentComponent} {...props} />
{:else}
  <p>Unknown component type: {componentType}</p>
{/if}
```

**Use Cases:**
- Dynamic forms
- Plugin systems
- Conditional component rendering
- Component registries

## `<svelte:boundary>`

Error boundaries for handling component errors (Svelte 5).

```svelte
<script>
  function handleError(error, errorInfo) {
    console.error('Error caught by boundary:', error);
    // Log to error reporting service
    logError(error, errorInfo);
  }
  
  let failed = false;
</script>

<svelte:boundary on:error={handleError}>
  {#if failed}
    <div class="error-fallback">
      <h2>Something went wrong</h2>
      <button onclick={() => failed = false}>
        Try again
      </button>
    </div>
  {:else}
    <RiskyComponent bind:failed />
  {/if}
</svelte:boundary>
```

**Features:**
- Catch JavaScript errors in component tree
- Prevent entire app crashes
- Show fallback UI
- Error logging and recovery

## `<svelte:self>`

Recursively render the same component.

```svelte
<!-- Tree.svelte -->
<script>
  export let node;
</script>

<div class="node">
  <span>{node.name}</span>
  
  {#if node.children}
    <ul class="children">
      {#each node.children as child}
        <li>
          <svelte:self node={child} />
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .children {
    margin-left: 1rem;
    border-left: 1px solid #ccc;
  }
</style>
```

**Use Cases:**
- Tree structures
- Nested navigation
- Recursive data display
- File system browsers

## Integration Patterns

### Multiple Special Elements
```svelte
<script>
  let title = 'My App';
  let scrollY = 0;
  let darkMode = false;
  
  $: document.documentElement.classList.toggle('dark', darkMode);
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="theme-color" content={darkMode ? '#1a1a1a' : '#ffffff'} />
</svelte:head>

<svelte:window bind:scrollY />

<svelte:document 
  onkeydown={(e) => {
    if (e.key === 'D' && e.ctrlKey) {
      darkMode = !darkMode;
    }
  }}
/>

<main class:scrolled={scrollY > 100}>
  <h1>{title}</h1>
  <p>Scroll position: {scrollY}</p>
  <button onclick={() => darkMode = !darkMode}>
    Toggle theme (or Ctrl+D)
  </button>
</main>
```

### Error Boundary with Logging
```svelte
<script>
  import { onMount } from 'svelte';
  
  let errorLog = [];
  
  function handleError(error, errorInfo) {
    errorLog = [...errorLog, {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      ...errorInfo
    }];
    
    // Send to monitoring service
    if (typeof gtag !== 'undefined') {
      gtag('event', 'exception', {
        description: error.message,
        fatal: false
      });
    }
  }
</script>

<svelte:boundary on:error={handleError}>
  <slot />
</svelte:boundary>

{#if errorLog.length > 0}
  <div class="error-log">
    <h3>Errors ({errorLog.length})</h3>
    {#each errorLog as entry}
      <details>
        <summary>{entry.timestamp}: {entry.error}</summary>
        <pre>{entry.stack}</pre>
      </details>
    {/each}
  </div>
{/if}
```