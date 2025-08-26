<script>
	import { testQuery } from '$lib/services/test.remote';
	import { onMount } from 'svelte';
	
	let result = $state(null);
	let error = $state(null);
	
	onMount(async () => {
		try {
			console.log('[test-remote] Calling testQuery...');
			result = await testQuery();
			console.log('[test-remote] Result:', result);
		} catch (err) {
			console.error('[test-remote] Error:', err);
			error = err instanceof Error ? err.message : 'Unknown error';
		}
	});
</script>

<h1>Remote Function Test</h1>

{#if error}
	<p style="color: red">Error: {error}</p>
{:else if result}
	<p>Success: {JSON.stringify(result)}</p>
{:else}
	<p>Loading...</p>
{/if}