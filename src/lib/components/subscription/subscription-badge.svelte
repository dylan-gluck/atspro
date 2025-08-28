<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { getSubscriptionInfo } from '$lib/services/subscription.remote';
	import { FileText, ChartBar, Briefcase } from 'lucide-svelte';

	let subscriptionQuery = getSubscriptionInfo();
	let subscription = $derived(subscriptionQuery.current);

	let tierLabel = $derived(
		subscription?.tier === 'executive'
			? 'Executive'
			: subscription?.tier === 'candidate'
				? 'Candidate'
				: 'Applicant'
	);

	let tierVariant: 'default' | 'secondary' | 'outline' | 'destructive' = $derived(
		subscription?.tier === 'executive'
			? 'default'
			: subscription?.tier === 'candidate'
				? 'secondary'
				: 'outline'
	);

	let showCredits = $derived(
		subscription?.tier === 'candidate' || subscription?.tier === 'applicant'
	);
</script>

{#if subscription}
	<div class="flex items-center gap-2" data-testid="subscription-badge">
		<Badge variant={tierVariant} class="text-xs" data-testid="tier-badge">
			{tierLabel}
		</Badge>

		{#if showCredits && subscription.tier === 'candidate'}
			<div
				class="bg-accent flex items-center gap-3 rounded-md px-2 py-1 text-xs"
				data-testid="candidate-credits"
			>
				<span class="flex items-center gap-1" data-testid="optimizations-count">
					<FileText class="h-3 w-3" />
					{subscription.usage.optimizations.limit - subscription.usage.optimizations.used}
				</span>
				<span class="flex items-center gap-1" data-testid="ats-reports-count">
					<ChartBar class="h-3 w-3" />
					{subscription.usage.atsReports.limit - subscription.usage.atsReports.used}
				</span>
			</div>
		{:else if showCredits && subscription.tier === 'applicant'}
			<div
				class="bg-accent flex items-center gap-1 rounded-md px-2 py-1 text-xs"
				data-testid="applicant-jobs"
			>
				<Briefcase class="h-3 w-3" />
				{10 - subscription.usage.activeJobs.used}/10 jobs
			</div>
		{/if}
	</div>
{/if}
