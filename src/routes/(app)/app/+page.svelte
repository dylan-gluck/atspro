<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Table from '$lib/components/ui/table';
	import { Progress } from '$lib/components/ui/progress';
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
		ChevronRight
	} from 'lucide-svelte';

	// Placeholder stats data
	const stats = [
		{
			title: 'Total Jobs Tracked',
			value: 24,
			icon: Briefcase,
			change: '+3 this week',
			changeType: 'positive' as const
		},
		{
			title: 'Applications Sent',
			value: 18,
			icon: Send,
			change: '+5 this week',
			changeType: 'positive' as const
		},
		{
			title: 'Interview Invitations',
			value: 4,
			icon: Calendar,
			change: '+2 this week',
			changeType: 'positive' as const
		},
		{
			title: 'Response Rate',
			value: '22%',
			icon: TrendingUp,
			change: '+5% from last month',
			changeType: 'positive' as const
		}
	];

	// Placeholder recent jobs data
	const recentJobs = [
		{
			id: '1',
			company: 'TechCorp Inc.',
			title: 'Senior Frontend Developer',
			location: 'San Francisco, CA',
			status: 'applied' as const,
			appliedDate: '2024-01-20',
			matchScore: 85
		},
		{
			id: '2',
			company: 'DataSoft Solutions',
			title: 'Full Stack Engineer',
			location: 'Remote',
			status: 'interview' as const,
			appliedDate: '2024-01-18',
			matchScore: 92
		},
		{
			id: '3',
			company: 'CloudBase Systems',
			title: 'React Developer',
			location: 'New York, NY',
			status: 'saved' as const,
			appliedDate: '2024-01-22',
			matchScore: 78
		},
		{
			id: '4',
			company: 'InnovateTech',
			title: 'UI/UX Developer',
			location: 'Austin, TX',
			status: 'applied' as const,
			appliedDate: '2024-01-19',
			matchScore: 88
		},
		{
			id: '5',
			company: 'WebFlow Agency',
			title: 'Frontend Lead',
			location: 'Remote',
			status: 'rejected' as const,
			appliedDate: '2024-01-15',
			matchScore: 75
		}
	];

	// Recent activity items
	const recentActivity = [
		{
			type: 'application',
			message: 'Applied to Senior Frontend Developer at TechCorp Inc.',
			time: '2 hours ago'
		},
		{
			type: 'interview',
			message: 'Interview scheduled with DataSoft Solutions',
			time: '5 hours ago'
		},
		{
			type: 'resume',
			message: 'Resume optimized for Full Stack Engineer position',
			time: '1 day ago'
		},
		{
			type: 'cover',
			message: 'Cover letter generated for CloudBase Systems',
			time: '2 days ago'
		}
	];

	// Status badge variants
	function getStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
		switch (status) {
			case 'interview':
				return 'default';
			case 'applied':
				return 'secondary';
			case 'rejected':
				return 'destructive';
			default:
				return 'outline';
		}
	}

	// Format status text
	function formatStatus(status: string): string {
		return status.charAt(0).toUpperCase() + status.slice(1);
	}
</script>

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
	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
		{#each stats as stat}
			<Card.Root>
				<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
					<Card.Title class="text-sm font-medium">{stat.title}</Card.Title>
					<svelte:component this={stat.icon} class="text-muted-foreground size-4" />
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
												<span class="flex items-center gap-1">
													<MapPin class="size-3" />
													{job.location}
												</span>
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
										<Button variant="ghost" size="sm">
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
				</Card.Content>
			</Card.Root>
		</div>
	</div>
</div>
