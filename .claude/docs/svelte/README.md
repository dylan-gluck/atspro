# Svelte 5 Documentation Guide

This directory contains condensed guides for Svelte 5, focusing on the new Runes syntax and modern patterns.

## Guide Overview

### [Runes Guide](./runes-guide.md)
The core reactive primitives of Svelte 5:
- **`$state`** - Reactive state management
- **`$derived`** - Computed values that update automatically
- **`$effect`** - Side effects and lifecycle management
- **`$props`** - Component properties and data flow
- **`$bindable`** - Two-way binding capabilities
- Migration patterns from Svelte 4

### [Template Syntax Guide](./template-syntax-guide.md) 
HTML-like template features and control flow:
- Basic markup, attributes, and events
- Control flow: `{#if}`, `{#each}`, `{#await}`
- Snippets - reusable template chunks (replaces slots)
- Bindings for forms, elements, and components
- Actions for custom element behavior
- Advanced template features

### [Styling Guide](./styling-guide.md)
CSS and styling approaches in Svelte:
- Scoped styles (default behavior)
- Global styles with `:global()`
- Dynamic styling with `style:` and `class:` directives
- CSS custom properties integration
- Component theming patterns
- CSS framework integration

### [Special Elements Guide](./special-elements-guide.md)
Svelte's built-in special elements:
- **`<svelte:window>`** - Window events and properties
- **`<svelte:document>`** - Document-level bindings
- **`<svelte:head>`** - Dynamic head content
- **`<svelte:component>`** - Dynamic component rendering
- **`<svelte:boundary>`** - Error handling
- Integration patterns

### [Transitions Guide](./transitions-guide.md)
Animation and transition system:
- Built-in transitions (fade, fly, slide, etc.)
- Custom transition functions
- List animations with `animate:flip`
- Coordinated transitions and crossfade effects
- Performance optimization
- Accessibility considerations

## Key Changes in Svelte 5

### Runes Replace Reactive Declarations
```js
// Svelte 4
let count = 0;
$: doubled = count * 2;

// Svelte 5
let count = $state(0);
let doubled = $derived(count * 2);
```

### New Props Syntax
```js
// Svelte 4
export let name;
export let age = 25;

// Svelte 5
let { name, age = 25 } = $props();
```

### Snippets Replace Slots
```svelte
<!-- Svelte 4 -->
<Card>
  <span slot="header">Title</span>
  <p>Content</p>
</Card>

<!-- Svelte 5 -->
<Card>
  {#snippet header()}
    <span>Title</span>
  {/snippet}
  <p>Content</p>
</Card>
```

### Enhanced Two-Way Binding
```js
// Component needs to mark props as bindable
let { value = $bindable() } = $props();
```

## Getting Started

1. **Start with [Runes Guide](./runes-guide.md)** - Core concepts
2. **Review [Template Syntax](./template-syntax-guide.md)** - Template features
3. **Add styling with [Styling Guide](./styling-guide.md)** - CSS patterns
4. **Enhance with [Special Elements](./special-elements-guide.md)** - Advanced features
5. **Polish with [Transitions](./transitions-guide.md)** - Animations

## Quick Reference

### Essential Runes
```js
let state = $state(initialValue);        // Reactive state
let computed = $derived(expression);     // Computed value
let { prop } = $props();                 // Component props
let bindable = $bindable(fallback);     // Two-way binding

$effect(() => {                          // Side effects
  // Runs when dependencies change
});
```

### Common Patterns
```svelte
<!-- Conditional rendering -->
{#if condition}
  <div>Visible when true</div>
{/if}

<!-- List rendering -->
{#each items as item (item.id)}
  <div>{item.name}</div>
{/each}

<!-- Two-way binding -->
<input bind:value={text} />

<!-- Dynamic classes -->
<div class:active={isActive}>Content</div>

<!-- Transitions -->
<div transition:fade>Animated content</div>
```

## Migration Tips

- Enable runes mode: `<svelte:options runes={true} />`
- Replace `export let` with `$props()` destructuring
- Convert `$:` statements to `$derived` or `$effect`
- Update slots to snippets for new components
- Use `$bindable()` for two-way binding props
- Stores still work but runes are preferred for local state

## Resources

- [Official Svelte 5 Docs](https://svelte.dev/docs)
- [Svelte 5 Tutorial](https://learn.svelte.dev)
- [Svelte Playground](https://svelte.dev/playground)
- [Migration Guide](https://svelte.dev/docs/svelte/v5-migration-guide)