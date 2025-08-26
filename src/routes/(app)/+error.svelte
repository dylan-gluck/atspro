<script lang="ts">
	import { page } from '$app/stores';
	import { Button } from '$lib/components/ui/button';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import { AlertCircle, RefreshCw, Home, FileText, Briefcase } from 'lucide-svelte';

	$: status = $page.status;
	$: error = $page.error;

	function handleRefresh() {
		window.location.reload();
	}

	const quickActions = [
		{ href: '/app/dashboard', label: 'Dashboard', icon: Home },
		{ href: '/app/resumes', label: 'Resumes', icon: FileText },
		{ href: '/app/jobs', label: 'Jobs', icon: Briefcase }
	];
</script>

<div class="container mx-auto max-w-2xl px-4 py-16">
	<div class="space-y-6">
		<Alert variant="destructive">
			<AlertCircle class="h-5 w-5" />
			<AlertDescription class="ml-2">
				<strong>Error {status}:</strong>
				{error?.message || 'An unexpected error occurred'}
			</AlertDescription>
		</Alert>

		<div class="bg-card space-y-4 rounded-lg border p-8 text-center">
			<h1 class="text-3xl font-bold">Something went wrong</h1>

			<p class="text-muted-foreground">
				{#if status === 404}
					The page you're looking for doesn't exist or has been moved.
				{:else if status === 401}
					You need to be logged in to access this page.
				{:else if status === 403}
					You don't have permission to access this resource.
				{:else if status === 429}
					You've made too many requests. Please wait a moment and try again.
				{:else}
					We encountered an error while processing your request. Please try again.
				{/if}
			</p>

			{#if error?.code}
				<div class="text-muted-foreground text-sm">
					Error Code: <code class="bg-muted rounded px-2 py-1">{error.code}</code>
				</div>
			{/if}

			<div class="flex justify-center gap-3 pt-4">
				<Button onclick={handleRefresh} variant="outline" size="sm">
					<RefreshCw class="mr-2 h-4 w-4" />
					Try Again
				</Button>
			</div>
		</div>

		<div class="space-y-3">
			<h2 class="text-lg font-semibold">Quick Actions</h2>
			<div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
				{#each quickActions as action}
					<Button href={action.href} variant="outline" class="justify-start">
						<svelte:component this={action.icon} class="mr-2 h-4 w-4" />
						{action.label}
					</Button>
				{/each}
			</div>
		</div>

		{#if import.meta.env.DEV && error?.details}
			<details class="mt-8">
				<summary class="text-muted-foreground hover:text-foreground cursor-pointer text-sm">
					Developer Details
				</summary>
				<pre class="bg-muted mt-2 overflow-x-auto rounded p-4 text-xs">
{JSON.stringify(error.details, null, 2)}
				</pre>
			</details>
		{/if}
	</div>
</div>
