<script lang="ts">
	import { onMount } from 'svelte';
	import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert';
	import { Button } from '$lib/components/ui/button';
	import { AlertTriangle, RefreshCw } from 'lucide-svelte';
	import * as Sentry from '@sentry/sveltekit';

	export let error: Error | null = null;
	export let reset: (() => void) | null = null;
	export let fallback: boolean = true;

	let hasError = false;
	let errorMessage = '';
	let errorDetails = '';

	function handleError(err: Error) {
		hasError = true;
		errorMessage = err.message || 'An unexpected error occurred';
		errorDetails = import.meta.env.DEV ? err.stack || '' : '';

		// Report to Sentry
		Sentry.captureException(err, {
			tags: {
				component: 'error-boundary'
			}
		});

		console.error('Error caught by boundary:', err);
	}

	function handleReset() {
		hasError = false;
		errorMessage = '';
		errorDetails = '';

		if (reset) {
			reset();
		} else {
			// Default reset behavior - reload the component
			window.location.reload();
		}
	}

	// Catch errors during component initialization
	onMount(() => {
		if (error) {
			handleError(error);
		}
	});

	// Set up global error handler for this component's children
	function captureError(node: HTMLElement) {
		const handler = (event: ErrorEvent) => {
			event.preventDefault();
			handleError(new Error(event.message));
		};

		const rejectionHandler = (event: PromiseRejectionEvent) => {
			event.preventDefault();
			handleError(new Error(event.reason));
		};

		window.addEventListener('error', handler);
		window.addEventListener('unhandledrejection', rejectionHandler);

		return {
			destroy() {
				window.removeEventListener('error', handler);
				window.removeEventListener('unhandledrejection', rejectionHandler);
			}
		};
	}
</script>

<div use:captureError>
	{#if hasError && fallback}
		<Alert variant="destructive" class="my-4">
			<AlertTriangle class="h-4 w-4" />
			<AlertTitle>Something went wrong</AlertTitle>
			<AlertDescription class="mt-2">
				<p>{errorMessage}</p>

				{#if errorDetails}
					<details class="mt-4">
						<summary class="cursor-pointer text-sm hover:underline"> View error details </summary>
						<pre class="mt-2 overflow-x-auto whitespace-pre-wrap text-xs">
{errorDetails}
						</pre>
					</details>
				{/if}

				<Button onclick={handleReset} variant="outline" size="sm" class="mt-4">
					<RefreshCw class="mr-2 h-4 w-4" />
					Try Again
				</Button>
			</AlertDescription>
		</Alert>
	{:else if !hasError}
		<slot />
	{/if}
</div>
