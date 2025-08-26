<script lang="ts">
	import { ModeWatcher } from 'mode-watcher';
	let { children }: { children: any } = $props();
</script>

<ModeWatcher />
{@render children?.()}
