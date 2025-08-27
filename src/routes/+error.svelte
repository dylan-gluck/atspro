<script lang="ts">
	import { page } from '$app/stores';
	import { Button } from '$lib/components/ui/button';
	import { AlertTriangle, Home, RotateCcw, ArrowLeft } from 'lucide-svelte';

	const errorMessages: Record<number, { title: string; description: string }> = {
		400: {
			title: 'Bad Request',
			description: 'The request could not be understood. Please check your input and try again.'
		},
		401: {
			title: 'Unauthorized',
			description: 'You need to be logged in to access this page.'
		},
		403: {
			title: 'Forbidden',
			description: "You don't have permission to access this resource."
		},
		404: {
			title: 'Page Not Found',
			description: "The page you're looking for doesn't exist or has been moved."
		},
		429: {
			title: 'Too Many Requests',
			description: "You've made too many requests. Please wait a moment and try again."
		},
		500: {
			title: 'Internal Server Error',
			description: "Something went wrong on our end. We've been notified and are working on it."
		},
		503: {
			title: 'Service Unavailable',
			description: 'Our service is temporarily unavailable. Please try again later.'
		}
	};

	$: statusCode = $page.status || 500;
	$: error = $page.error;
	$: errorInfo = errorMessages[statusCode] || errorMessages[500];
	$: customMessage = error?.message || errorInfo.description;

	function handleRefresh() {
		window.location.reload();
	}

	function handleGoBack() {
		window.history.back();
	}
</script>

<div class="flex min-h-screen items-center justify-center px-4">
	<div class="w-full max-w-md text-center">
		<div class="mb-8">
			<div
				class="bg-destructive/10 mb-4 inline-flex h-20 w-20 items-center justify-center rounded-full"
			>
				<AlertTriangle class="text-destructive h-10 w-10" />
			</div>

			<h1 class="text-foreground mb-2 text-6xl font-bold">{statusCode}</h1>
			<h2 class="text-foreground mb-4 text-2xl font-semibold">{errorInfo.title}</h2>

			<p class="text-muted-foreground mb-8">
				{customMessage}
			</p>

			{#if error?.code}
				<p class="text-muted-foreground mb-4 text-sm">
					Error Code: <code class="bg-muted rounded px-2 py-1">{error.code}</code>
				</p>
			{/if}

			{#if import.meta.env.DEV && error?.details}
				<details class="mb-8 text-left">
					<summary class="text-muted-foreground hover:text-foreground cursor-pointer text-sm">
						Developer Details
					</summary>
					<pre class="bg-muted mt-2 overflow-x-auto rounded p-4 text-xs">
{JSON.stringify(error.details, null, 2)}
					</pre>
				</details>
			{/if}
		</div>

		<div class="flex flex-col justify-center gap-3 sm:flex-row">
			<Button onclick={handleGoBack} variant="outline">
				<ArrowLeft class="mr-2 h-4 w-4" />
				Go Back
			</Button>

			<Button onclick={handleRefresh} variant="outline">
				<RotateCcw class="mr-2 h-4 w-4" />
				Refresh Page
			</Button>

			<Button href="/" variant="default">
				<Home class="mr-2 h-4 w-4" />
				Go Home
			</Button>
		</div>
	</div>
</div>
