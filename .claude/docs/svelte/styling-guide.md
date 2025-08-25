# Svelte Styling Guide

## Scoped Styles

Svelte automatically scopes CSS to components by default.

### Basic Scoped Styles
```svelte
<style>
  p {
    /* Only affects <p> elements in this component */
    color: burlywood;
  }
  
  .my-class {
    font-weight: bold;
  }
</style>

<p>This will be styled</p>
<div class="my-class">This too</div>
```

**How it Works:**
- Adds unique class to affected elements (e.g., `svelte-123xyz`)
- Increases specificity by 0-1-0
- Component styles override global styles even if loaded later

### Scoped Keyframes
```svelte
<style>
  .bouncy {
    animation: bounce 10s;
  }
  
  /* Keyframes are scoped to this component */
  @keyframes bounce {
    0% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
    100% { transform: translateY(0); }
  }
</style>
```

## Global Styles

### Single Selector Global
```svelte
<style>
  :global(body) {
    /* Applies to <body> globally */
    margin: 0;
  }
  
  div :global(strong) {
    /* Applies to all <strong> elements inside 
       <div> elements belonging to this component */
    color: goldenrod;
  }
  
  p:global(.big.red) {
    /* Applies to <p> elements in this component
       with class="big red" */
    font-size: 2em;
  }
</style>
```

### Global Block
```svelte
<style>
  :global {
    /* Applies to every element in the application */
    div { box-sizing: border-box; }
    p { margin: 1em 0; }
  }
  
  .container :global {
    /* Applies to elements inside .container in this component */
    .button { padding: 0.5em; }
    .text { font-family: serif; }
  }
</style>
```

### Global Keyframes
```svelte
<style>
  @keyframes -global-my-animation {
    /* The -global- prefix is removed in compilation */
    /* Referenced as just 'my-animation' elsewhere */
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  .fade-in {
    animation: my-animation 1s ease-in-out;
  }
</style>
```

## Dynamic Styling

### Style Directive
```svelte
<script>
  let color = 'red';
  let size = '1em';
</script>

<!-- Basic style directive -->
<div style:color="red">Static red text</div>
<div style:color={color}>Dynamic color</div>
<div style:font-size={size}>Dynamic size</div>

<!-- Shorthand when variable name matches CSS property -->
<div style:color>Uses 'color' variable</div>

<!-- Multiple styles -->
<div style:color style:font-size={size} style:font-weight="bold">
  Multiple styles
</div>

<!-- Important modifier -->
<div style:color|important="blue">Important blue</div>
```

### CSS Custom Properties (Variables)
```svelte
<script>
  let primaryColor = '#ff3e00';
  let secondaryColor = '#40b3ff';
</script>

<style>
  .theme {
    background: var(--primary-color);
    color: var(--secondary-color);
  }
</style>

<div 
  class="theme"
  style:--primary-color={primaryColor}
  style:--secondary-color={secondaryColor}
>
  Themed content
</div>
```

### Class Directive
```svelte
<script>
  let selected = false;
  let disabled = true;
  let type = 'primary';
</script>

<!-- Basic class directive -->
<button class:selected>Button</button>
<button class:selected={selected}>Explicit</button>

<!-- Multiple classes -->
<button class:selected class:disabled class="base-class">
  Multiple classes
</button>

<!-- Dynamic class names -->
<button class:active={selected} class="btn btn-{type}">
  Mixed approach
</button>

<!-- Traditional approach -->
<button class="{selected ? 'selected' : ''} {disabled ? 'disabled' : ''}">
  Traditional
</button>
```

## Advanced Styling Patterns

### Component-Specific CSS Variables
```svelte
<!-- Parent.svelte -->
<script>
  import Child from './Child.svelte';
</script>

<style>
  .container {
    --child-bg: lightblue;
    --child-padding: 1rem;
  }
</style>

<div class="container">
  <Child />
</div>

<!-- Child.svelte -->
<style>
  .child {
    background: var(--child-bg, white);
    padding: var(--child-padding, 0.5rem);
  }
</style>

<div class="child">
  Child content
</div>
```

### Conditional Styling with CSS Variables
```svelte
<script>
  let theme = 'dark';
  let size = 'large';
</script>

<style>
  .component {
    --bg-color: var(--light-bg, white);
    --text-color: var(--light-text, black);
    --font-size: var(--normal-size, 1rem);
  }
  
  .component.dark {
    --bg-color: var(--dark-bg, #222);
    --text-color: var(--dark-text, white);
  }
  
  .component.large {
    --font-size: var(--large-size, 1.25rem);
  }
  
  .content {
    background: var(--bg-color);
    color: var(--text-color);
    font-size: var(--font-size);
  }
</style>

<div class="component" class:dark={theme === 'dark'} class:large={size === 'large'}>
  <div class="content">
    Themed content
  </div>
</div>
```

### Responsive Styling
```svelte
<style>
  .responsive {
    padding: 1rem;
  }
  
  @media (max-width: 768px) {
    .responsive {
      padding: 0.5rem;
    }
  }
  
  @media (prefers-color-scheme: dark) {
    .responsive {
      background: #333;
      color: white;
    }
  }
</style>
```

### Animation and Transition Styling
```svelte
<style>
  .animated {
    transition: all 0.3s ease;
  }
  
  .animated:hover {
    transform: scale(1.05);
    box-shadow: 0 4px 8px rgba(0,0,0,0.2);
  }
  
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  .fade-in {
    animation: fadeIn 0.5s ease-out;
  }
</style>
```

## Styling Best Practices

### Component Theming
```svelte
<!-- Theme.svelte -->
<script>
  export let theme = 'light';
  const themes = {
    light: {
      '--bg': 'white',
      '--text': 'black',
      '--accent': '#007acc'
    },
    dark: {
      '--bg': '#1a1a1a',
      '--text': 'white',
      '--accent': '#4dabf7'
    }
  };
  
  $: themeVars = themes[theme];
</script>

<div class="theme-provider" style={Object.entries(themeVars).map(([key, value]) => `${key}:${value}`).join(';')}>
  <slot />
</div>

<style>
  .theme-provider {
    background: var(--bg);
    color: var(--text);
    min-height: 100vh;
  }
</style>
```

### Utility Classes with Svelte
```svelte
<style>
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
  
  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 1rem;
  }
  
  .flex {
    display: flex;
  }
  
  .flex-col {
    flex-direction: column;
  }
  
  .items-center {
    align-items: center;
  }
  
  .justify-between {
    justify-content: space-between;
  }
</style>
```

### CSS Modules Pattern
```svelte
<!-- Button.svelte -->
<script>
  export let variant = 'primary';
  export let size = 'medium';
  export let disabled = false;
</script>

<style>
  .button {
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-family: inherit;
    font-weight: 500;
    transition: all 0.2s;
  }
  
  .button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  .primary {
    background: var(--primary-color, #007acc);
    color: white;
  }
  
  .secondary {
    background: var(--secondary-color, #e9ecef);
    color: var(--text-color, #333);
  }
  
  .small { padding: 0.25rem 0.5rem; font-size: 0.875rem; }
  .medium { padding: 0.5rem 1rem; font-size: 1rem; }
  .large { padding: 0.75rem 1.5rem; font-size: 1.125rem; }
</style>

<button 
  class="button {variant} {size}" 
  {disabled}
  on:click
>
  <slot />
</button>
```

## Integration with CSS Frameworks

### Using with Tailwind CSS
```svelte
<!-- Install @tailwindcss/vite plugin -->
<script>
  export let open = false;
</script>

<div class="modal" class:block={open} class:hidden={!open}>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
    <div class="bg-white rounded-lg max-w-md w-full p-6">
      <slot />
    </div>
  </div>
</div>

<style>
  /* Custom styles can still be used alongside Tailwind */
  .modal {
    z-index: 1000;
  }
</style>
```

### Using CSS-in-JS Libraries
```svelte
<script>
  import styled from 'styled-components';
  
  const StyledButton = styled.button`
    background: ${props => props.primary ? 'blue' : 'gray'};
    color: white;
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 4px;
  `;
</script>

<!-- CSS-in-JS works but Svelte's built-in styling is usually preferred -->
```