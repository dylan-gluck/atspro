<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import * as Table from '$lib/components/ui/table';
	import * as Card from '$lib/components/ui/card';
	import * as Select from '$lib/components/ui/select';
	import * as Pagination from '$lib/components/ui/pagination';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import { Search, Plus, Eye, Edit, Trash2, Filter } from 'lucide-svelte';
	import type { UserJob, JobStatus } from '$lib/types/user-job';

	// Placeholder data with Svelte 5 state
	let jobs = $state<UserJob[]>([
		{
			id: '1',
			userId: 'user1',
			company: 'OpenAI',
			title: 'Senior Frontend Engineer',
			description: 'Build amazing AI-powered interfaces...',
			status: 'applied',
			appliedAt: new Date('2024-01-15'),
			createdAt: new Date('2024-01-10'),
			updatedAt: new Date('2024-01-15'),
			location: ['San Francisco, CA'],
			salary: '$180k - $250k'
		},
		{
			id: '2',
			userId: 'user1',
			company: 'Anthropic',
			title: 'Full Stack Developer',
			description: 'Work on cutting-edge AI safety research tools...',
			status: 'interviewing',
			appliedAt: new Date('2024-01-12'),
			createdAt: new Date('2024-01-08'),
			updatedAt: new Date('2024-01-20'),
			location: ['Remote'],
			salary: '$160k - $220k'
		},
		{
			id: '3',
			userId: 'user1',
			company: 'Google',
			title: 'Software Engineer III',
			description: 'Join the search infrastructure team...',
			status: 'tracked',
			appliedAt: null,
			createdAt: new Date('2024-01-22'),
			updatedAt: new Date('2024-01-22'),
			location: ['Mountain View, CA', 'Remote'],
			salary: '$150k - $200k'
		},
		{
			id: '4',
			userId: 'user1',
			company: 'Meta',
			title: 'React Native Engineer',
			description: 'Build cross-platform mobile experiences...',
			status: 'rejected',
			appliedAt: new Date('2024-01-05'),
			createdAt: new Date('2024-01-03'),
			updatedAt: new Date('2024-01-18'),
			location: ['Menlo Park, CA'],
			salary: '$170k - $240k'
		},
		{
			id: '5',
			userId: 'user1',
			company: 'Stripe',
			title: 'Backend Engineer',
			description: 'Scale payment infrastructure for millions...',
			status: 'offered',
			appliedAt: new Date('2024-01-07'),
			createdAt: new Date('2024-01-06'),
			updatedAt: new Date('2024-01-25'),
			location: ['San Francisco, CA', 'Remote'],
			salary: '$190k - $260k'
		}
	]);

	// Filter states
	let searchQuery = $state('');
	let selectedStatus = $state<JobStatus | 'all'>('all');
	let currentPage = $state(1);
	let itemsPerPage = $state(10);

	// Delete confirmation state
	let deleteDialogOpen = $state(false);
	let jobToDelete = $state<UserJob | null>(null);

	// Filtered jobs using Svelte 5 $derived
	let filteredJobs = $derived.by(() => {
		let filtered = [...jobs];

		// Filter by search query
		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			filtered = filtered.filter(
				(job) =>
					job.company.toLowerCase().includes(query) || job.title.toLowerCase().includes(query)
			);
		}

		// Filter by status
		if (selectedStatus !== 'all') {
			filtered = filtered.filter((job) => job.status === selectedStatus);
		}

		// Sort by updatedAt descending
		filtered.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

		return filtered;
	});

	// Paginated jobs
	let paginatedJobs = $derived.by(() => {
		const start = (currentPage - 1) * itemsPerPage;
		const end = start + itemsPerPage;
		return filteredJobs.slice(start, end);
	});

	let totalPages = $derived(Math.ceil(filteredJobs.length / itemsPerPage));

	// Helper functions
	function getStatusBadgeVariant(
		status: JobStatus
	): 'default' | 'secondary' | 'destructive' | 'outline' {
		switch (status) {
			case 'applied':
				return 'default';
			case 'interviewing':
				return 'secondary';
			case 'offered':
				return 'default';
			case 'rejected':
				return 'destructive';
			case 'withdrawn':
				return 'outline';
			case 'tracked':
			default:
				return 'outline';
		}
	}

	function formatDate(date: Date | null): string {
		if (!date) return 'N/A';
		return new Intl.DateTimeFormat('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		}).format(date);
	}

	function getLastActivity(job: UserJob): string {
		const days = Math.floor((Date.now() - job.updatedAt.getTime()) / (1000 * 60 * 60 * 24));
		if (days === 0) return 'Today';
		if (days === 1) return 'Yesterday';
		return `${days} days ago`;
	}

	function confirmDelete(job: UserJob) {
		jobToDelete = job;
		deleteDialogOpen = true;
	}

	function handleDelete() {
		if (jobToDelete) {
			jobs = jobs.filter((j) => j.id !== jobToDelete.id);
			jobToDelete = null;
			deleteDialogOpen = false;
		}
	}
</script>

<div class="container mx-auto space-y-6 py-6">
	<!-- Header -->
	<div class="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
		<div>
			<h1 class="text-3xl font-bold">Job Applications</h1>
			<p class="text-muted-foreground mt-1">Track and manage your job applications</p>
		</div>
		<Button href="/app/jobs/new" class="gap-2">
			<Plus class="h-4 w-4" />
			Add New Job
		</Button>
	</div>

	<!-- Filters -->
	<Card.Root>
		<Card.Content class="pt-6">
			<div class="flex flex-col gap-4 sm:flex-row">
				<div class="relative flex-1">
					<Search
						class="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform"
					/>
					<Input
						type="search"
						placeholder="Search by company or title..."
						class="pl-10"
						bind:value={searchQuery}
					/>
				</div>
				<Select.Root bind:value={selectedStatus}>
					<Select.Trigger class="w-full sm:w-[180px]">
						<Filter class="mr-2 h-4 w-4" />
						<span>All Statuses</span>
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="all">All Statuses</Select.Item>
						<Select.Separator />
						<Select.Item value="tracked">Tracked</Select.Item>
						<Select.Item value="applied">Applied</Select.Item>
						<Select.Item value="interviewing">Interviewing</Select.Item>
						<Select.Item value="offered">Offered</Select.Item>
						<Select.Item value="rejected">Rejected</Select.Item>
						<Select.Item value="withdrawn">Withdrawn</Select.Item>
					</Select.Content>
				</Select.Root>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Jobs Table -->
	<Card.Root>
		<Card.Content class="p-0">
			<div class="overflow-x-auto">
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Company & Position</Table.Head>
							<Table.Head>Status</Table.Head>
							<Table.Head>Applied Date</Table.Head>
							<Table.Head>Last Activity</Table.Head>
							<Table.Head class="text-right">Actions</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#if paginatedJobs.length === 0}
							<Table.Row>
								<Table.Cell colspan={5} class="py-12 text-center">
									<p class="text-muted-foreground">No jobs found matching your filters</p>
								</Table.Cell>
							</Table.Row>
						{:else}
							{#each paginatedJobs as job}
								<Table.Row class="hover:bg-muted/50">
									<Table.Cell>
										<div>
											<p class="font-medium">{job.company}</p>
											<p class="text-muted-foreground text-sm">{job.title}</p>
											{#if job.location && job.location.length > 0}
												<p class="text-muted-foreground mt-1 text-xs">
													{job.location.join(' • ')}
												</p>
											{/if}
										</div>
									</Table.Cell>
									<Table.Cell>
										<Badge variant={getStatusBadgeVariant(job.status)}>
											{job.status}
										</Badge>
									</Table.Cell>
									<Table.Cell>
										{formatDate(job.appliedAt)}
									</Table.Cell>
									<Table.Cell>
										<span class="text-muted-foreground text-sm">
											{getLastActivity(job)}
										</span>
									</Table.Cell>
									<Table.Cell>
										<div class="flex justify-end gap-1">
											<Button href="/app/jobs/{job.id}" variant="ghost" size="icon" class="h-8 w-8">
												<Eye class="h-4 w-4" />
												<span class="sr-only">View job</span>
											</Button>
											<Button
												href="/app/jobs/{job.id}/edit"
												variant="ghost"
												size="icon"
												class="h-8 w-8"
											>
												<Edit class="h-4 w-4" />
												<span class="sr-only">Edit job</span>
											</Button>
											<Button
												variant="ghost"
												size="icon"
												class="text-destructive hover:text-destructive h-8 w-8"
												onclick={() => confirmDelete(job)}
											>
												<Trash2 class="h-4 w-4" />
												<span class="sr-only">Delete job</span>
											</Button>
										</div>
									</Table.Cell>
								</Table.Row>
							{/each}
						{/if}
					</Table.Body>
				</Table.Root>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Pagination -->
	{#if totalPages > 1}
		<div class="flex justify-center">
			<Pagination.Root count={filteredJobs.length} perPage={itemsPerPage} bind:page={currentPage}>
				<Pagination.Content>
					<Pagination.PrevButton />
					{#each Array(totalPages) as _, i}
						<Pagination.Item page={i + 1} />
					{/each}
					<Pagination.NextButton />
				</Pagination.Content>
			</Pagination.Root>
		</div>
	{/if}
</div>

<!-- Delete Confirmation Dialog -->
<AlertDialog.Root bind:open={deleteDialogOpen}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Delete Job Application</AlertDialog.Title>
			<AlertDialog.Description>
				Are you sure you want to delete the application for {jobToDelete?.title} at {jobToDelete?.company}?
				This action cannot be undone.
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
			<AlertDialog.Action
				onclick={handleDelete}
				class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
			>
				Delete
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
