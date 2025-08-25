# Svelte 5 Runes Guide

## What are Runes?

Runes are symbols that control the Svelte compiler - they are *keywords* of the Svelte language.

- Have a `$` prefix and look like functions: `$state(0)`
- Don't need to be imported - they're part of the language
- Not values - can't assign to variables or pass as function arguments
- Only valid in certain positions (compiler enforces this)

## Core Runes

### `$state` - Reactive State

Creates reactive state that triggers UI updates when changed.

```js
let count = $state(0);
let message = $state('hello');
```

**Deep State (Objects/Arrays):**
- Objects/arrays become deeply reactive proxies
- Mutations trigger granular updates
- Proxified recursively until non-plain objects

```js
let todos = $state([
  { done: false, text: 'add more todos' }
]);

// This triggers updates
todos[0].done = !todos[0].done;
todos.push({ done: false, text: 'eat lunch' });
```

**Classes:**
- Use `$state` in class fields or first assignment in constructor
- Properties become get/set methods with private fields

```js
class Todo {
  done = $state(false);
  
  constructor(text) {
    this.text = $state(text);
  }
  
  reset = () => {
    this.text = '';
    this.done = false;
  }
}
```

**Raw State (`$state.raw`):**
- Not deeply reactive
- Cannot be mutated, only reassigned
- Better performance for large objects you won't mutate

```js
let person = $state.raw({
  name: 'Heraclitus',
  age: 49
});

// This won't work
person.age += 1;

// This will work
person = { name: 'Heraclitus', age: 50 };
```

**Snapshots (`$state.snapshot`):**
- Takes static snapshot of deeply reactive state
- Useful for external libraries that don't expect proxies

```js
console.log($state.snapshot(counter)); // { count: ... }
```

### `$derived` - Computed Values

Declares derived state that updates when dependencies change.

```js
let count = $state(0);
let doubled = $derived(count * 2);
```

**Complex Derivations (`$derived.by`):**
```js
let numbers = $state([1, 2, 3]);
let total = $derived.by(() => {
  let total = 0;
  for (const n of numbers) {
    total += n;
  }
  return total;
});
```

**Overriding Derived Values:**
- Can temporarily override (unless declared with `const`)
- Useful for optimistic UI

```js
let likes = $derived(post.likes);

async function onclick() {
  likes += 1; // Optimistic update
  try {
    await like();
  } catch {
    likes -= 1; // Rollback
  }
}
```

### `$effect` - Side Effects

Runs when state updates. Use for third-party libraries, DOM manipulation, network requests.

```js
$effect(() => {
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = color;
  context.fillRect(0, 0, size, size);
});
```

**Lifecycle:**
- Runs after component mount in a microtask
- Re-runs are batched
- Can use anywhere, not just top-level

**Teardown Functions:**
```js
$effect(() => {
  const interval = setInterval(() => {
    count += 1;
  }, milliseconds);

  return () => {
    clearInterval(interval);
  };
});
```

**Advanced Effects:**
- `$effect.pre` - Runs before DOM updates
- `$effect.tracking()` - Tells if code is in tracking context
- `$effect.pending()` - Returns number of pending promises
- `$effect.root` - Creates non-tracked scope for manual control

### `$props` - Component Props

Receives props passed to components.

```js
// Basic usage
let props = $props();

// Destructuring (recommended)
let { adjective } = $props();

// Fallback values
let { adjective = 'happy' } = $props();

// Renaming props
let { super: trouper = 'lights are gonna find me' } = $props();

// Rest props
let { a, b, c, ...others } = $props();
```

**Type Safety:**
```ts
let { adjective }: { adjective: string } = $props();

// Or with interface
interface Props {
  adjective: string;
}
let { adjective }: Props = $props();
```

**Unique IDs (`$props.id()`):**
```js
const uid = $props.id();
// Use for linking elements: id="{uid}-firstname"
```

### `$bindable` - Two-way Binding

Marks props as bindable for two-way data flow.

```js
let { readonlyProperty, bindableProperty = $bindable() } = $props();

// With fallback
let { bindableProperty = $bindable('fallback value') } = $props();
```

Usage in parent:
```svelte
<MyComponent bind:bindableProperty={value} />
```

### Other Runes

**`$inspect` - Debugging:**
```js
$inspect(count); // Logs when count changes
$inspect(a, b, c); // Multiple values
```

**`$host` - Component Element:**
```js
let element = $host(); // Reference to component's DOM element
```

## Key Concepts

### Dependencies
- Runes automatically track synchronous reads
- Async reads (after `await`, `setTimeout`) not tracked
- Use `untrack()` to exempt values from dependency tracking

### Passing State vs Values
- JavaScript is pass-by-value
- To share current values, use functions or state proxies
- Destructuring breaks reactivity

### Module State
- Can declare state in `.svelte.js/.svelte.ts` files
- Cannot export directly reassigned state
- Either use objects or don't export directly

## Migration from Svelte 4

### Key Changes
- Runes replace `let` declarations for reactive state
- `$:` reactive statements become `$derived` or `$effect`
- Props use `$props()` instead of `export let`
- Two-way binding requires `$bindable()`
- Stores still work but runes are preferred for local state

### Common Patterns
```js
// Svelte 4
let count = 0;
$: doubled = count * 2;
$: console.log('count changed:', count);

// Svelte 5
let count = $state(0);
let doubled = $derived(count * 2);
$effect(() => console.log('count changed:', count));
```