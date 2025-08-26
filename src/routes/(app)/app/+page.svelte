<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Table from '$lib/components/ui/table';
	import { Progress } from '$lib/components/ui/progress';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import {
		Briefcase,
		Send,
		Calendar,
		TrendingUp,
		Plus,
		Upload,
		FileText,
		ExternalLink,
		Building,
		MapPin,
		Clock,
		ArrowRight,
		ChevronRight,
		Loader2
	} from 'lucide-svelte';
	import { getJobs } from '$lib/services/job.remote';
	import { getDashboardActivity } from '$lib/services/activity.remote';
	import type { UserJob, JobActivity } from '$lib/types/user-job';

	// Fetch data using remote functions
	let jobsQuery = getJobs({ limit: 20 });
	let activitiesQuery = getDashboardActivity({ limit: 10 });

	// Derived state from queries
	let jobs = $derived(jobsQuery.current?.jobs || []);
	let totalJobs = $derived(jobsQuery.current?.pagination.total || 0);
	let activities = $derived(activitiesQuery.current?.activities || []);
	let jobsLoading = $derived(jobsQuery.loading);
	let activitiesLoading = $derived(activitiesQuery.loading);

	// Calculate stats from actual data
	let stats = $derived([
		{
			title: 'Total Jobs Tracked',
			value: totalJobs,
			icon: Briefcase,
			change: calculateWeeklyChange('total'),
			changeType: 'positive' as const
		},
		{
			title: 'Applications Sent',
			value: jobs.filter((j: UserJob) => j.status === 'applied' || j.status === 'interviewing' || j.status === 'offered').length,
			icon: Send,
			change: calculateWeeklyChange('applied'),
			changeType: 'positive' as const
		},
		{
			title: 'Interview Invitations',
			value: jobs.filter((j: UserJob) => j.status === 'interviewing').length,
			icon: Calendar,
			change: calculateWeeklyChange('interviewing'),
			changeType: 'positive' as const
		},
		{
			title: 'Response Rate',
			value: calculateResponseRate(),
			icon: TrendingUp,
			change: '+5% from last month', // This would need historical data
			changeType: 'positive' as const
		}
	]);

	// Get the 5 most recent jobs
	let recentJobs = $derived(
		jobs.slice(0, 5).map((job: UserJob) => ({
			...job,
			appliedDate: job.appliedAt ? formatDate(job.appliedAt) : formatDate(job.createdAt),
			matchScore: 85 // TODO: Calculate actual match score when available
		}))
	);

	// Format activities for display
	let recentActivity = $derived(
		activities.map((activity: JobActivity & { jobTitle: string; jobCompany: string }) => ({
			type: mapActivityType(activity.type),
			message: formatActivityMessage(activity),
			time: formatRelativeTime(activity.createdAt)
		}))
	);


	// Helper functions
	function calculateWeeklyChange(type: string): string {
		// This would need to compare with data from a week ago
		// For now, return placeholder
		const weekAgo = new Date();
		weekAgo.setDate(weekAgo.getDate() - 7);
		
		let count = 0;
		if (type === 'total') {
			count = jobs.filter((j: UserJob) => new Date(j.createdAt) > weekAgo).length;
		} else if (type === 'applied') {
			count = jobs.filter((j: UserJob) => j.appliedAt && new Date(j.appliedAt) > weekAgo).length;
		} else if (type === 'interviewing') {
			count = jobs.filter((j: UserJob) => j.status === 'interviewing' && new Date(j.updatedAt) > weekAgo).length;
		}
		
		return count > 0 ? `+${count} this week` : 'No change';
	}

	function calculateResponseRate(): string {
		const appliedCount = jobs.filter((j: UserJob) => j.status === 'applied' || j.status === 'interviewing' || j.status === 'offered').length;
		const responseCount = jobs.filter((j: UserJob) => j.status === 'interviewing' || j.status === 'offered').length;
		
		if (appliedCount === 0) return '0%';
		
		const rate = Math.round((responseCount / appliedCount) * 100);
		return `${rate}%`;
	}

	function formatDate(date: Date | string): string {
		const d = new Date(date);
		return d.toLocaleDateString('en-US', { 
			year: 'numeric', 
			month: 'short', 
			day: 'numeric' 
		});
	}

	function formatRelativeTime(date: Date | string): string {
		const d = new Date(date);
		const now = new Date();
		const diffMs = now.getTime() - d.getTime();
		const diffMins = Math.floor(diffMs / 60000);
		const diffHours = Math.floor(diffMs / 3600000);
		const diffDays = Math.floor(diffMs / 86400000);

		if (diffMins < 1) return 'just now';
		if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
		if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
		if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
		
		return formatDate(d);
	}

	function mapActivityType(type: JobActivity['type']): string {
		switch (type) {
			case 'applied':
			case 'job_added':
				return 'application';
			case 'interview_scheduled':
				return 'interview';
			case 'document_generated':
				return 'resume';
			case 'note_added':
			case 'status_change':
				return 'update';
			default:
				return 'other';
		}
	}

	function formatActivityMessage(activity: JobActivity & { jobTitle: string; jobCompany: string }): string {
		const jobInfo = activity.jobTitle ? ` for ${activity.jobTitle} at ${activity.jobCompany}` : '';
		
		switch (activity.type) {
			case 'job_added':
				return `Added new job${jobInfo}`;
			case 'applied':
				return `Applied to ${activity.jobTitle} at ${activity.jobCompany}`;
			case 'status_change':
				const newStatus = activity.metadata?.newStatus || 'unknown';
				return `Updated status to ${formatStatus(newStatus)}${jobInfo}`;
			case 'document_generated':
				const docType = activity.metadata?.documentType || 'document';
				return `Generated ${docType}${jobInfo}`;
			case 'note_added':
				return `Added notes${jobInfo}`;
			case 'interview_scheduled':
				return `Interview scheduled${jobInfo}`;
			case 'offer_received':
				return `Offer received${jobInfo}`;
			default:
				return activity.description || `Activity${jobInfo}`;
		}
	}

	// Status badge variants
	function getStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
		switch (status) {
			case 'interviewing':
				return 'default';
			case 'applied':
				return 'secondary';
			case 'rejected':
			case 'withdrawn':
				return 'destructive';
			case 'offered':
				return 'default';
			default:
				return 'outline';
		}
	}

	// Format status text
	function formatStatus(status: string): string {
		if (status === 'interviewing') return 'Interviewing';
		return status.charAt(0).toUpperCase() + status.slice(1);
	}
</script>

<svelte:head>
	<title>Dashboard - ATSPro</title>
</svelte:head>

<div class="container mx-auto space-y-6 p-6">
	<!-- Page Header -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Dashboard</h1>
			<p class="text-muted-foreground">Welcome back! Here's your job search overview.</p>
		</div>
		<div class="flex gap-2">
			<Button variant="outline">
				<Upload class="mr-2 size-4" />
				Upload Resume
			</Button>
			<Button>
				<Plus class="mr-2 size-4" />
				Add Job
			</Button>
		</div>
	</div>

	<!-- Stats Cards -->
	<div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
		{#if jobsLoading}
			{#each Array(4) as _}
				<Card.Root>
					<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
						<Skeleton class="h-4 w-24" />
						<Skeleton class="size-4 rounded" />
					</Card.Header>
					<Card.Content>
						<Skeleton class="h-8 w-16" />
						<Skeleton class="mt-2 h-3 w-20" />
					</Card.Content>
				</Card.Root>
			{/each}
		{:else}
			{#each stats as stat}
				<Card.Root>
					<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
						<Card.Title class="text-sm font-medium">{stat.title}</Card.Title>
						{@const Icon = stat.icon}
						<Icon class="text-muted-foreground size-4" />
					</Card.Header>
					<Card.Content>
						<div class="text-2xl font-bold">{stat.value}</div>
						<p class="text-muted-foreground text-xs">
							{#if stat.changeType === 'positive'}
								<span class="text-green-600 dark:text-green-400">{stat.change}</span>
							{:else}
								<span class="text-red-600 dark:text-red-400">{stat.change}</span>
							{/if}
						</p>
					</Card.Content>
				</Card.Root>
			{/each}
		{/if}
	</div>

	<!-- Main Content Grid -->
	<div class="grid gap-6 lg:grid-cols-3">
		<!-- Recent Jobs (2 columns wide) -->
		<div class="lg:col-span-2">
			<Card.Root>
				<Card.Header>
					<div class="flex items-center justify-between">
						<div>
							<Card.Title>Recent Jobs</Card.Title>
							<Card.Description>Your latest job applications and saves</Card.Description>
						</div>
						<Button variant="ghost" size="sm">
							View All
							<ChevronRight class="ml-1 size-4" />
						</Button>
					</div>
				</Card.Header>
				<Card.Content>
					{#if jobsLoading}
						<div class="space-y-4">
							{#each Array(3) as _}
								<div class="rounded-lg border p-4">
									<div class="flex items-start justify-between">
										<div class="flex-1 space-y-2">
											<Skeleton class="h-5 w-48" />
											<div class="flex gap-4">
												<Skeleton class="h-4 w-32" />
												<Skeleton class="h-4 w-24" />
											</div>
										</div>
										<Skeleton class="h-6 w-20 rounded-full" />
									</div>
									<div class="mt-3 flex items-center justify-between">
										<Skeleton class="h-3 w-40" />
										<Skeleton class="h-8 w-16" />
									</div>
									<Skeleton class="mt-3 h-2 w-full rounded" />
								</div>
							{/each}
						</div>
					{:else if recentJobs.length === 0}
						<div class="flex flex-col items-center justify-center py-12 text-center">
							<Briefcase class="text-muted-foreground mb-4 size-12" />
							<h3 class="mb-2 text-lg font-medium">No jobs tracked yet</h3>
							<p class="text-muted-foreground mb-4 text-sm">
								Start by adding a job to track your applications
							</p>
							<Button>
								<Plus class="mr-2 size-4" />
								Add Your First Job
							</Button>
						</div>
					{:else}
						<div class="space-y-4">
							{#each recentJobs as job}
								<div
									class="hover:bg-accent/50 flex items-start justify-between rounded-lg border p-4 transition-colors"
								>
									<div class="flex-1 space-y-1">
										<div class="flex items-start justify-between">
											<div>
												<h3 class="font-semibold">{job.title}</h3>
												<div class="text-muted-foreground flex items-center gap-4 text-sm">
													<span class="flex items-center gap-1">
														<Building class="size-3" />
														{job.company}
													</span>
													{#if job.location && job.location.length > 0}
														<span class="flex items-center gap-1">
															<MapPin class="size-3" />
															{Array.isArray(job.location) ? job.location[0] : job.location}
														</span>
													{/if}
												</div>
											</div>
											<Badge variant={getStatusVariant(job.status)}>
												{formatStatus(job.status)}
											</Badge>
										</div>
										<div class="mt-2 flex items-center justify-between">
											<div class="text-muted-foreground flex items-center gap-4 text-xs">
												<span class="flex items-center gap-1">
													<Clock class="size-3" />
													{job.appliedDate}
												</span>
												<span>Match Score: {job.matchScore}%</span>
											</div>
											<Button variant="ghost" size="sm" href="/app/job/{job.id}">
												View
												<ExternalLink class="ml-1 size-3" />
											</Button>
										</div>
										<div class="mt-2">
											<Progress value={job.matchScore} class="h-2" />
										</div>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</Card.Content>
			</Card.Root>
		</div>

		<!-- Right Column -->
		<div class="space-y-6">
			<!-- Quick Actions -->
			<Card.Root>
				<Card.Header>
					<Card.Title>Quick Actions</Card.Title>
					<Card.Description>Common tasks and shortcuts</Card.Description>
				</Card.Header>
				<Card.Content>
					<div class="space-y-2">
						<Button variant="outline" class="w-full justify-start">
							<Plus class="mr-2 size-4" />
							Add New Job
						</Button>
						<Button variant="outline" class="w-full justify-start">
							<Upload class="mr-2 size-4" />
							Upload Resume
						</Button>
						<Button variant="outline" class="w-full justify-start">
							<FileText class="mr-2 size-4" />
							Generate Cover Letter
						</Button>
						<Button variant="outline" class="w-full justify-start">
							<TrendingUp class="mr-2 size-4" />
							Optimize Resume
						</Button>
					</div>
				</Card.Content>
			</Card.Root>

			<!-- Activity Feed -->
			<Card.Root>
				<Card.Header>
					<Card.Title>Recent Activity</Card.Title>
					<Card.Description>Your latest actions</Card.Description>
				</Card.Header>
				<Card.Content>
					{#if activitiesLoading}
						<div class="space-y-4">
							{#each Array(4) as _}
								<div class="flex items-start gap-3">
									<Skeleton class="mt-0.5 size-6 rounded-full" />
									<div class="flex-1 space-y-2">
										<Skeleton class="h-4 w-full" />
										<Skeleton class="h-3 w-20" />
									</div>
								</div>
							{/each}
						</div>
					{:else if recentActivity.length === 0}
						<div class="flex flex-col items-center justify-center py-8 text-center">
							<Clock class="text-muted-foreground mb-3 size-10" />
							<p class="text-muted-foreground text-sm">
								No activity yet. Start tracking jobs to see updates here.
							</p>
						</div>
					{:else}
						<div class="space-y-4">
							{#each recentActivity as activity}
								<div class="flex items-start gap-3">
									<div class="bg-primary/10 mt-0.5 rounded-full p-1">
										{#if activity.type === 'application'}
											<Send class="text-primary size-3" />
										{:else if activity.type === 'interview'}
											<Calendar class="text-primary size-3" />
										{:else if activity.type === 'resume'}
											<FileText class="text-primary size-3" />
										{:else if activity.type === 'update'}
											<TrendingUp class="text-primary size-3" />
										{:else}
											<Briefcase class="text-primary size-3" />
										{/if}
									</div>
									<div class="flex-1 space-y-1">
										<p class="text-sm">{activity.message}</p>
										<p class="text-muted-foreground text-xs">{activity.time}</p>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</Card.Content>
			</Card.Root>
		</div>
	</div>
</div>
