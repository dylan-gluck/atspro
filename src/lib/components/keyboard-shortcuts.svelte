<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { KeyboardShortcuts, announce } from '$lib/utils/keyboard';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Card } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Keyboard } from 'lucide-svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	let shortcuts: KeyboardShortcuts;
	let showHelp = $state(false);

	// Define keyboard shortcuts
	const shortcutDefinitions = [
		{ keys: 'ctrl+k', description: 'Open search', action: () => openSearch() },
		{ keys: 'ctrl+/', description: 'Show keyboard shortcuts', action: () => (showHelp = true) },
		{ keys: 'alt+h', description: 'Go to home', action: () => goto('/app') },
		{ keys: 'alt+r', description: 'Go to resume', action: () => goto('/app/resume') },
		{ keys: 'alt+j', description: 'Go to jobs', action: () => goto('/app/jobs') },
		{ keys: 'alt+s', description: 'Go to settings', action: () => goto('/app/settings') },
		{ keys: 'ctrl+s', description: 'Save current form', action: () => saveCurrentForm() },
		{ keys: 'escape', description: 'Close modal/dialog', action: () => closeActiveModal() }
	];

	// Platform-specific key display
	const isMac = typeof navigator !== 'undefined' && /Mac|iPad|iPhone/.test(navigator.platform);

	function formatKey(key: string): string {
		if (isMac) {
			return key
				.replace('ctrl', '⌘')
				.replace('alt', '⌥')
				.replace('shift', '⇧')
				.replace('meta', '⌘');
		}
		return key.replace('meta', 'ctrl');
	}

	function openSearch() {
		// Trigger search modal or focus search input
		const searchInput = document.querySelector<HTMLInputElement>('[data-search-input]');
		if (searchInput) {
			searchInput.focus();
			announce('Search opened');
		}
	}

	function saveCurrentForm() {
		// Find and submit the current form
		const form = document.querySelector<HTMLFormElement>('form[data-auto-save]');
		if (form) {
			const event = new Event('submit', { bubbles: true, cancelable: true });
			form.dispatchEvent(event);
			announce('Form saved');
		}
	}

	function closeActiveModal() {
		// Close active modal or dialog
		const closeButton = document.querySelector<HTMLButtonElement>('[data-dialog-close]');
		if (closeButton) {
			closeButton.click();
		}
	}

	onMount(() => {
		shortcuts = new KeyboardShortcuts();

		// Register all shortcuts
		shortcutDefinitions.forEach(({ keys, action }) => {
			shortcuts.register(keys, action);
		});

		// Add global escape handler for modals
		const handleGlobalEscape = (event: KeyboardEvent) => {
			if (event.key === 'Escape' && showHelp) {
				showHelp = false;
			}
		};

		document.addEventListener('keydown', handleGlobalEscape);

		return () => {
			document.removeEventListener('keydown', handleGlobalEscape);
		};
	});

	onDestroy(() => {
		shortcuts?.destroy();
	});
</script>

<!-- Keyboard shortcuts help dialog -->
<Dialog.Root bind:open={showHelp}>
	<Dialog.Content class="max-w-2xl">
		<Dialog.Header>
			<Dialog.Title class="flex items-center gap-2">
				<Keyboard class="h-5 w-5" />
				Keyboard Shortcuts
			</Dialog.Title>
			<Dialog.Description>
				Use these keyboard shortcuts to navigate and interact with the application more efficiently.
			</Dialog.Description>
		</Dialog.Header>

		<div class="grid gap-4 py-4">
			<div class="grid gap-3">
				<h3 class="text-muted-foreground text-sm font-semibold">Navigation</h3>
				<div class="space-y-2">
					{#each shortcutDefinitions.filter((s) => s.keys.includes('alt')) as shortcut}
						<div class="flex items-center justify-between">
							<span class="text-sm">{shortcut.description}</span>
							<Badge variant="secondary" class="font-mono">
								{formatKey(shortcut.keys)}
							</Badge>
						</div>
					{/each}
				</div>
			</div>

			<div class="grid gap-3">
				<h3 class="text-muted-foreground text-sm font-semibold">Actions</h3>
				<div class="space-y-2">
					{#each shortcutDefinitions.filter((s) => s.keys.includes('ctrl')) as shortcut}
						<div class="flex items-center justify-between">
							<span class="text-sm">{shortcut.description}</span>
							<Badge variant="secondary" class="font-mono">
								{formatKey(shortcut.keys)}
							</Badge>
						</div>
					{/each}
				</div>
			</div>

			<div class="grid gap-3">
				<h3 class="text-muted-foreground text-sm font-semibold">General</h3>
				<div class="space-y-2">
					<div class="flex items-center justify-between">
						<span class="text-sm">Close modal/dialog</span>
						<Badge variant="secondary" class="font-mono">Esc</Badge>
					</div>
					<div class="flex items-center justify-between">
						<span class="text-sm">Navigate with Tab</span>
						<Badge variant="secondary" class="font-mono">Tab</Badge>
					</div>
					<div class="flex items-center justify-between">
						<span class="text-sm">Navigate backwards</span>
						<Badge variant="secondary" class="font-mono">Shift + Tab</Badge>
					</div>
					<div class="flex items-center justify-between">
						<span class="text-sm">Activate button/link</span>
						<Badge variant="secondary" class="font-mono">Enter / Space</Badge>
					</div>
				</div>
			</div>

			<div class="bg-muted text-muted-foreground rounded-lg p-3 text-sm">
				<p>
					<strong>Tip:</strong> Use arrow keys to navigate through menus and lists. Press{' '}
					<kbd class="bg-background rounded px-1.5 py-0.5 text-xs">Home</kbd> or{' '}
					<kbd class="bg-background rounded px-1.5 py-0.5 text-xs">End</kbd> to jump to the first or
					last item.
				</p>
			</div>
		</div>

		<Dialog.Footer>
			<button
				class="text-muted-foreground hover:text-foreground text-sm"
				onclick={() => (showHelp = false)}
				data-dialog-close
			>
				Press <kbd class="bg-muted rounded px-1.5 py-0.5 text-xs">Esc</kbd> to close
			</button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Floating help button -->
{#if !showHelp && $page.url.pathname.startsWith('/app')}
	<button
		onclick={() => (showHelp = true)}
		class="bg-primary text-primary-foreground focus-visible:ring-primary fixed bottom-4 right-4 z-40 flex h-10 w-10 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-offset-2"
		aria-label="Show keyboard shortcuts"
	>
		<Keyboard class="h-5 w-5" />
	</button>
{/if}
