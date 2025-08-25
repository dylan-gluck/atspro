# Svelte Template Syntax Guide

## Basic Markup

### Elements and Components
- Lowercase tags (`<div>`) = HTML elements
- Capitalized tags (`<Widget>`) = Components
- Dot notation (`<my.stuff>`) = Components

### Attributes
```svelte
<!-- Static attributes -->
<div class="foo">
<button disabled>can't touch this</button>

<!-- Dynamic attributes -->
<a href="page/{p}">page {p}</a>
<button disabled={!clickable}>...</button>

<!-- Boolean attributes (included if truthy) -->
<input required={false} placeholder="This input field is not required" />

<!-- Shorthand when name matches value -->
<button {disabled}>...</button>

<!-- Spread attributes -->
<Widget a="b" {...things} c="d" />
```

### Events
```svelte
<!-- Event handlers -->
<button onclick={() => console.log('clicked')}>click me</button>

<!-- Event attributes are case sensitive -->
<!-- onclick = 'click' event, onClick = 'Click' event -->

<!-- Shorthand and spread work -->
<button {onclick}>click me</button>
<button {...thisSpreadContainsEventAttributes}>click me</button>
```

**Event Delegation:**
Common events (click, input, keydown, etc.) use delegation for better performance.

### Text Expressions
```svelte
<!-- JavaScript expressions in curly braces -->
<h1>Hello {name}!</h1>
<p>{a} + {b} = {a + b}.</p>

<!-- Regex literals need parentheses -->
<div>{(/^[A-Za-z ]+$/).test(value) ? x : y}</div>

<!-- HTML content (be careful of XSS!) -->
{@html potentiallyUnsafeHtmlString}
```

## Control Flow

### Conditional Rendering
```svelte
{#if answer === 42}
  <p>what was the question?</p>
{:else if 80 > porridge.temperature}
  <p>too cold!</p>
{:else}
  <p>just right!</p>
{/if}
```

### Loops
```svelte
<!-- Basic each -->
{#each items as item}
  <li>{item.name} x {item.qty}</li>
{/each}

<!-- With index -->
{#each items as item, i}
  <li>{i + 1}: {item.name} x {item.qty}</li>
{/each}

<!-- Keyed (recommended for dynamic lists) -->
{#each items as item (item.id)}
  <li>{item.name} x {item.qty}</li>
{/each}

<!-- With destructuring -->
{#each items as { id, name, qty }, i (id)}
  <li>{i + 1}: {name} x {qty}</li>
{/each}

<!-- Without item (just repeat n times) -->
{#each { length: 8 }, rank}
  {#each { length: 8 }, file}
    <div class:black={(rank + file) % 2 === 1}></div>
  {/each}
{/each}

<!-- With else block -->
{#each todos as todo}
  <p>{todo.text}</p>
{:else}
  <p>No tasks today!</p>
{/each}
```

### Key Blocks
```svelte
<!-- Re-create element when key changes -->
{#key value}
  <div transition:fade>{value}</div>
{/key}
```

### Await Blocks
```svelte
{#await promise}
  <p>...waiting</p>
{:then number}
  <p>The number is {number}</p>
{:catch error}
  <p style="color: red">{error.message}</p>
{/await}

<!-- Skip loading state -->
{#await promise then number}
  <p>The number is {number}</p>
{/await}
```

## Snippets (Svelte 5)

Reusable chunks of markup - replacement for slots.

### Basic Snippets
```svelte
{#snippet greeting(name)}
  <p>Hello {name}!</p>
{/snippet}

{@render greeting('world')}
```

### Snippet Props
Pass snippets to components:

```svelte
<!-- Parent -->
{#snippet header()}
  <th>Name</th><th>Age</th>
{/snippet}

{#snippet row(person)}
  <td>{person.name}</td><td>{person.age}</td>
{/snippet}

<Table data={people} {header} {row} />

<!-- Or implicit -->
<Table data={people}>
  {#snippet header()}
    <th>Name</th><th>Age</th>
  {/snippet}
  
  {#snippet row(person)}
    <td>{person.name}</td><td>{person.age}</td>
  {/snippet}
</Table>
```

### Children Snippet
```svelte
<!-- Parent -->
<Button>click me</Button>

<!-- Button component -->
<script>
  let { children } = $props();
</script>
<button>{@render children()}</button>
```

### Snippet Types
```ts
import type { Snippet } from 'svelte';

interface Props {
  data: T[];
  children: Snippet;
  row: Snippet<[T]>; // Snippet with one parameter of type T
}
```

## Advanced Template Features

### @-tags
```svelte
{@html htmlString}        <!-- Raw HTML -->
{@debug user, score}      <!-- Debugger breakpoint -->
{@const area = width * height}  <!-- Local constants -->
{@render snippet(args)}   <!-- Render snippets -->
```

### Comments
```svelte
<!-- Regular HTML comment -->

<!-- svelte-ignore a11y_autofocus -->
<input bind:value={name} autofocus />

<!-- @component documentation -->
<!--
  @component
  This component does something amazing.
  
  Usage:
  ```html
  <MyComponent name="world" />
  ```
-->
```

## Bindings

### Form Elements
```svelte
<!-- Input value -->
<input bind:value={message} />
<input type="number" bind:value={num} />

<!-- Checkbox -->
<input type="checkbox" bind:checked={accepted} />

<!-- Radio group -->
<input type="radio" bind:group={flavor} value="vanilla" />
<input type="radio" bind:group={flavor} value="chocolate" />

<!-- Checkbox group -->
<input type="checkbox" bind:group={flavors} value="vanilla" />
<input type="checkbox" bind:group={flavors} value="chocolate" />

<!-- Select -->
<select bind:value={selected}>
  <option value={a}>Option A</option>
  <option value={b}>Option B</option>
</select>

<!-- File input -->
<input type="file" bind:files={fileList} />
```

### Element Properties
```svelte
<!-- Element reference -->
<canvas bind:this={canvas}></canvas>

<!-- Dimensions (readonly) -->
<div bind:clientWidth={width} bind:clientHeight={height}>

<!-- Media elements -->
<audio bind:currentTime bind:duration bind:paused></audio>
<video bind:currentTime bind:duration bind:paused bind:videoWidth></video>

<!-- Details -->
<details bind:open={isOpen}>
```

### Function Bindings (Svelte 5.9+)
```svelte
<!-- With validation/transformation -->
<input bind:value={
  () => value,
  (v) => value = v.toLowerCase()
} />

<!-- Readonly bindings -->
<div bind:clientWidth={null, redraw} bind:clientHeight={null, redraw}>
```

### Component Bindings
```svelte
<!-- Two-way binding with components -->
<MyInput bind:value={text} />

<!-- Component reference -->
<MyComponent bind:this={component} />
```

## Actions

Custom directives for element behavior:

```svelte
<script>
  function tooltip(node, text) {
    const tooltip = document.createElement('div');
    tooltip.textContent = text;
    
    function mouseenter() {
      document.body.appendChild(tooltip);
    }
    
    function mouseleave() {
      document.body.removeChild(tooltip);
    }
    
    node.addEventListener('mouseenter', mouseenter);
    node.addEventListener('mouseleave', mouseleave);
    
    return {
      update(newText) {
        tooltip.textContent = newText;
      },
      destroy() {
        node.removeEventListener('mouseenter', mouseenter);
        node.removeEventListener('mouseleave', mouseleave);
      }
    };
  }
</script>

<button use:tooltip="Hello world!">
  Hover me
</button>
```

## Transitions & Animations

### Transitions
```svelte
<script>
  import { fade, fly } from 'svelte/transition';
</script>

{#if visible}
  <div transition:fade>fades in and out</div>
  <div transition:fly={{ y: 200, duration: 2000 }}>flies in and out</div>
{/if}
```

### Separate In/Out Transitions
```svelte
{#if visible}
  <div in:fly={{ x: -100 }} out:fade>
    flies in from left, fades out
  </div>
{/if}
```

### Custom Transitions
```svelte
<script>
  function whoosh(node, params) {
    return {
      delay: params.delay || 0,
      duration: params.duration || 400,
      easing: params.easing || x => x,
      css: (t, u) => `
        transform: scale(${t}) rotate(${t * 360}deg);
        opacity: ${t}
      `
    };
  }
</script>

<div in:whoosh={{ duration: 500 }}>Custom transition</div>
```

### Animations
```svelte
<script>
  import { flip } from 'svelte/animate';
</script>

{#each items as item (item.id)}
  <div animate:flip={{ duration: 300 }}>
    {item.name}
  </div>
{/each}
```

## Classes & Styles

### Dynamic Classes
```svelte
<!-- Class directive -->
<button class:selected={current === 'foo'}>foo</button>

<!-- Shorthand when name matches variable -->
<button class:selected>foo</button>

<!-- Multiple classes -->
<button class:foo class:bar={baz}>multiple</button>

<!-- Traditional with ternary -->
<button class="{selected ? 'selected' : ''}">traditional</button>
```

### Dynamic Styles
```svelte
<!-- Style directive -->
<div style:color="red">red text</div>
<div style:color={myColor}>dynamic color</div>

<!-- Shorthand -->
<div style:color>uses 'color' variable</div>

<!-- Important -->
<div style:color="red" style:color|important="blue">blue text</div>

<!-- CSS custom properties -->
<div style:--theme-color="red">uses CSS variable</div>
```