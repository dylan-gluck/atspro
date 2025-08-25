# Svelte Transitions & Animations Guide

## Basic Transitions

Transitions animate elements entering/leaving the DOM.

### Built-in Transitions
```svelte
<script>
  import { 
    fade, fly, slide, scale, draw, blur, 
    crossfade, typewriter 
  } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  
  let visible = $state(false);
</script>

<!-- Basic transitions -->
{#if visible}
  <div transition:fade>Fades in and out</div>
  <div transition:fly={{ y: 200, duration: 2000 }}>Flies in and out</div>
  <div transition:slide>Slides in and out</div>
  <div transition:scale={{ duration: 500 }}>Scales in and out</div>
{/if}

<!-- With easing -->
{#if visible}
  <div transition:fly={{ y: 200, duration: 1000, easing: quintOut }}>
    Custom easing
  </div>
{/if}
```

### Separate In/Out Transitions
```svelte
<script>
  import { fade, fly } from 'svelte/transition';
  import { elasticOut } from 'svelte/easing';
</script>

{#if visible}
  <div 
    in:fly={{ x: -200, duration: 500 }}
    out:fade={{ duration: 200 }}
  >
    Flies in from left, fades out
  </div>
{/if}
```

### Local vs Global Transitions
```svelte
{#if x}
  {#if y}
    <!-- Local: only plays when y changes -->
    <p transition:fade>fades when y changes</p>
    
    <!-- Global: plays when x or y changes -->
    <p transition:fade|global>fades when x or y change</p>
  {/if}
{/if}
```

## Custom Transitions

### CSS-based Transitions
```svelte
<script>
  import { elasticOut } from 'svelte/easing';
  
  function whoosh(node, params) {
    const existingTransform = getComputedStyle(node).transform.replace('none', '');
    
    return {
      delay: params.delay || 0,
      duration: params.duration || 400,
      easing: params.easing || elasticOut,
      css: (t, u) => `
        transform: ${existingTransform} scale(${t}) rotate(${t * 360}deg);
        opacity: ${t};
      `
    };
  }
</script>

{#if visible}
  <div in:whoosh={{ duration: 500 }}>Custom CSS transition</div>
{/if}
```

### JavaScript-based Transitions
```svelte
<script>
  function typewriter(node, { speed = 1 }) {
    const valid = node.childNodes.length === 1 && 
                  node.childNodes[0].nodeType === Node.TEXT_NODE;
    
    if (!valid) {
      throw new Error('This transition only works on elements with a single text node child');
    }
    
    const text = node.textContent;
    const duration = text.length / (speed * 0.01);
    
    return {
      duration,
      tick: (t) => {
        const i = ~~(text.length * t);
        node.textContent = text.slice(0, i);
      }
    };
  }
</script>

{#if visible}
  <p in:typewriter={{ speed: 1 }}>
    The quick brown fox jumps over the lazy dog
  </p>
{/if}
```

### Advanced Custom Transitions
```svelte
<script>
  function spin(node, { duration = 400, easing = x => x, axis = 'y' }) {
    return {
      duration,
      easing,
      css: (t, u) => {
        const transform = `rotate${axis.toUpperCase()}(${u * 360}deg)`;
        return `
          transform: ${transform};
          opacity: ${t};
        `;
      }
    };
  }
  
  function morphSize(node, { duration = 400, easing = x => x }) {
    const style = getComputedStyle(node);
    const targetWidth = parseFloat(style.width);
    const targetHeight = parseFloat(style.height);
    
    return {
      duration,
      easing,
      css: (t, u) => `
        width: ${t * targetWidth}px;
        height: ${t * targetHeight}px;
        overflow: hidden;
      `
    };
  }
</script>

{#if visible}
  <div in:spin={{ axis: 'x', duration: 1000 }}>Spin on X axis</div>
  <div in:morphSize={{ duration: 800 }}>Morphing size</div>
{/if}
```

## Animations

Animations trigger when list items change position.

### Basic List Animation
```svelte
<script>
  import { flip } from 'svelte/animate';
  import { quintOut } from 'svelte/easing';
  
  let items = $state([
    { id: 1, name: 'Item 1' },
    { id: 2, name: 'Item 2' },
    { id: 3, name: 'Item 3' }
  ]);
  
  function shuffle() {
    items = items.sort(() => Math.random() - 0.5);
  }
  
  function remove(id) {
    items = items.filter(item => item.id !== id);
  }
</script>

<button onclick={shuffle}>Shuffle</button>

{#each items as item (item.id)}
  <div 
    animate:flip={{ duration: 300, easing: quintOut }}
    class="item"
  >
    {item.name}
    <button onclick={() => remove(item.id)}>Remove</button>
  </div>
{/each}
```

### Custom Animations
```svelte
<script>
  function customFlip(node, { from, to }, params = {}) {
    const dx = from.left - to.left;
    const dy = from.top - to.top;
    
    const d = Math.sqrt(dx * dx + dy * dy);
    const duration = Math.sqrt(d) * 120;
    
    return {
      duration: params.duration || duration,
      easing: params.easing || (x => x),
      css: (t, u) => {
        const x = u * dx;
        const y = u * dy;
        const scale = 1 - (u * 0.1);
        
        return `
          transform: translate(${x}px, ${y}px) scale(${scale});
        `;
      }
    };
  }
</script>

{#each items as item (item.id)}
  <div animate:customFlip class="item">
    {item.name}
  </div>
{/each}
```

## Advanced Patterns

### Coordinated Transitions (Crossfade)
```svelte
<script>
  import { crossfade } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  
  const [send, receive] = crossfade({
    duration: 400,
    easing: quintOut,
    fallback(node, params) {
      const style = getComputedStyle(node);
      const transform = style.transform === 'none' ? '' : style.transform;
      
      return {
        duration: 400,
        easing: quintOut,
        css: t => `
          transform: ${transform} scale(${t});
          opacity: ${t}
        `
      };
    }
  });
  
  let todos = $state([
    { id: 1, text: 'Buy milk', done: false },
    { id: 2, text: 'Walk dog', done: true }
  ]);
  
  function toggle(id) {
    todos = todos.map(todo => 
      todo.id === id ? { ...todo, done: !todo.done } : todo
    );
  }
</script>

<div class="board">
  <div class="column">
    <h2>Todo</h2>
    {#each todos.filter(t => !t.done) as todo (todo.id)}
      <div 
        class="card" 
        in:receive={{ key: todo.id }}
        out:send={{ key: todo.id }}
        onclick={() => toggle(todo.id)}
      >
        {todo.text}
      </div>
    {/each}
  </div>
  
  <div class="column">
    <h2>Done</h2>
    {#each todos.filter(t => t.done) as todo (todo.id)}
      <div 
        class="card done" 
        in:receive={{ key: todo.id }}
        out:send={{ key: todo.id }}
        onclick={() => toggle(todo.id)}
      >
        {todo.text}
      </div>
    {/each}
  </div>
</div>

<style>
  .board {
    display: flex;
    gap: 2rem;
  }
  
  .column {
    flex: 1;
    background: #f0f0f0;
    padding: 1rem;
    border-radius: 4px;
  }
  
  .card {
    background: white;
    padding: 0.5rem;
    margin: 0.5rem 0;
    border-radius: 4px;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }
  
  .card.done {
    background: #e8f5e8;
  }
</style>
```

### Staggered Animations
```svelte
<script>
  import { fade, fly } from 'svelte/transition';
  
  let items = $state(['Item 1', 'Item 2', 'Item 3', 'Item 4']);
  let visible = $state(false);
  
  function stagger(i) {
    return {
      y: 50,
      duration: 400,
      delay: i * 100
    };
  }
</script>

<button onclick={() => visible = !visible}>
  Toggle List
</button>

{#if visible}
  <div class="list">
    {#each items as item, i}
      <div 
        class="item"
        in:fly={stagger(i)}
        out:fade={{ duration: 200, delay: i * 50 }}
      >
        {item}
      </div>
    {/each}
  </div>
{/if}
```

### Transition Events
```svelte
<script>
  import { fly } from 'svelte/transition';
  
  let status = $state('idle');
  let visible = $state(false);
</script>

<p>Status: {status}</p>

<button onclick={() => visible = !visible}>
  Toggle
</button>

{#if visible}
  <div
    transition:fly={{ y: 200, duration: 2000 }}
    onintrostart={() => status = 'intro started'}
    onintroend={() => status = 'intro ended'}
    onoutrostart={() => status = 'outro started'}
    onoutroend={() => status = 'outro ended'}
  >
    Watch the status
  </div>
{/if}
```

### Motion Preferences
```svelte
<script>
  import { fade, fly } from 'svelte/transition';
  import { onMount } from 'svelte';
  
  let prefersReducedMotion = $state(false);
  let visible = $state(false);
  
  onMount(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    prefersReducedMotion = mediaQuery.matches;
    
    const updatePreference = (e) => {
      prefersReducedMotion = e.matches;
    };
    
    mediaQuery.addEventListener('change', updatePreference);
    return () => mediaQuery.removeEventListener('change', updatePreference);
  });
  
  function getTransition() {
    if (prefersReducedMotion) {
      return fade;
    }
    return fly;
  }
  
  function getParams() {
    if (prefersReducedMotion) {
      return { duration: 150 };
    }
    return { y: 200, duration: 500 };
  }
</script>

<button onclick={() => visible = !visible}>Toggle</button>

{#if visible}
  <div transition:getTransition()={getParams()}>
    Respects motion preferences
  </div>
{/if}
```

## Performance Considerations

### Optimizing Transitions
```svelte
<script>
  // Prefer CSS transforms over changing layout properties
  function goodTransition(node, params) {
    return {
      duration: 300,
      css: t => `
        transform: scale(${t}) translateY(${(1-t) * 50}px);
        opacity: ${t};
      `
    };
  }
  
  // Avoid this - causes layout thrashing
  function badTransition(node, params) {
    return {
      duration: 300,
      css: t => `
        width: ${t * 100}%;
        height: ${t * 200}px;
        margin-top: ${(1-t) * 50}px;
      `
    };
  }
</script>
```

### Will-change Optimization
```svelte
<style>
  .transitioning {
    /* Hint to browser about upcoming changes */
    will-change: transform, opacity;
  }
  
  .transition-complete {
    /* Remove hint when transition is done */
    will-change: auto;
  }
</style>
```

### GPU Acceleration
```svelte
<script>
  function gpuAccelerated(node, params) {
    return {
      duration: 300,
      css: t => `
        /* Use transform3d to trigger GPU acceleration */
        transform: translate3d(${(1-t) * 100}px, 0, 0) scale(${t});
        opacity: ${t};
      `
    };
  }
</script>
```