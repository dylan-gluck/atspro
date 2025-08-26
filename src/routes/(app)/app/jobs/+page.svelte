<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import * as Table from '$lib/components/ui/table';
	import * as Card from '$lib/components/ui/card';
	import * as Select from '$lib/components/ui/select';
	import * as Pagination from '$lib/components/ui/pagination';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import { Search, Plus, Eye, Edit, Trash2, Filter, Loader2 } from 'lucide-svelte';
	import type { UserJob, JobStatus } from '$lib/types/user-job';
	import { getJobs, deleteJob } from '$lib/services/job.remote';
	import { toast } from 'svelte-sonner';

	// Filter and pagination states
	let searchQuery = $state('');
	let selectedStatus = $state<JobStatus | 'all'>('all');
	let currentPage = $state(1);
	let itemsPerPage = $state(10);

	// Delete confirmation state
	let deleteDialogOpen = $state(false);
	let jobToDelete = $state<UserJob | null>(null);
	let isDeleting = $state(false);

	// Calculate offset for pagination
	let offset = $derived((currentPage - 1) * itemsPerPage);

	// Fetch jobs with filters - reactive query
	let jobsQuery = $derived(
		getJobs({
			status: selectedStatus !== 'all' ? selectedStatus : undefined,
			limit: itemsPerPage,
			offset: offset
		})
	);

	// Client-side search filtering
	let filteredJobs = $derived.by(() => {
		if (!jobsQuery.current?.jobs) return [];

		let filtered = [...jobsQuery.current.jobs];

		// Apply client-side search filter
		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			filtered = filtered.filter(
				(job) =>
					job.company.toLowerCase().includes(query) ||
					job.title.toLowerCase().includes(query) ||
					job.location?.some((loc: string) => loc.toLowerCase().includes(query))
			);
		}

		return filtered;
	});

	// Total pages calculation
	let totalPages = $derived(
		jobsQuery.current ? Math.ceil(jobsQuery.current.pagination.total / itemsPerPage) : 0
	);

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

	function formatDate(date: Date | null | undefined): string {
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

	async function handleDelete() {
		if (!jobToDelete) return;

		isDeleting = true;
		try {
			await deleteJob(jobToDelete.id);
			toast.success('Job deleted successfully');

			// Refresh the jobs list
			await jobsQuery.refresh();

			// Reset page if we deleted the last item on current page
			if (filteredJobs.length === 0 && currentPage > 1) {
				currentPage = currentPage - 1;
			}
		} catch (error) {
			console.error('Failed to delete job:', error);
			toast.error('Failed to delete job');
		} finally {
			isDeleting = false;
			jobToDelete = null;
			deleteDialogOpen = false;
		}
	}

	// Reset page when filters change
	$effect(() => {
		selectedStatus;
		searchQuery;
		currentPage = 1;
	});
</script>

<svelte:head>
	<title>Job Applications - ATSPro</title>
</svelte:head>

<div class="container mx-auto space-y-6 p-6">
	<!-- Header -->
	<div class="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
		<div>
			<h1 class="text-3xl font-bold">Job Applications</h1>
			<p class="text-muted-foreground mt-1">Track and manage your job applications</p>
		</div>
		<Button onclick={() => goto('/app/jobs/new')} class="gap-2">
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
				<Select.Root
					type="single"
					value={selectedStatus}
					onValueChange={(v: string | undefined) => {
						if (v) selectedStatus = v as JobStatus | 'all';
					}}
				>
					<Select.Trigger class="w-full sm:w-[180px]">
						<Filter class="mr-2 h-4 w-4" />
						<span>{selectedStatus === 'all' ? 'All Statuses' : selectedStatus}</span>
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
						{#if jobsQuery.loading}
							<Table.Row>
								<Table.Cell colspan={5} class="py-12 text-center">
									<div class="flex items-center justify-center gap-2">
										<Loader2 class="h-4 w-4 animate-spin" />
										<p class="text-muted-foreground">Loading jobs...</p>
									</div>
								</Table.Cell>
							</Table.Row>
						{:else if jobsQuery.error}
							<Table.Row>
								<Table.Cell colspan={5} class="py-12 text-center">
									<p class="text-destructive">Failed to load jobs. Please try again.</p>
									<Button
										onclick={() => jobsQuery.refresh()}
										variant="outline"
										size="sm"
										class="mt-4"
									>
										Retry
									</Button>
								</Table.Cell>
							</Table.Row>
						{:else if filteredJobs.length === 0}
							<Table.Row>
								<Table.Cell colspan={5} class="py-12 text-center">
									<p class="text-muted-foreground">
										{searchQuery || selectedStatus !== 'all'
											? 'No jobs found matching your filters'
											: 'No jobs yet. Add your first job application!'}
									</p>
									{#if !searchQuery && selectedStatus === 'all'}
										<Button
											onclick={() => goto('/app/jobs/new')}
											variant="outline"
											size="sm"
											class="mt-4 gap-2"
										>
											<Plus class="h-4 w-4" />
											Add First Job
										</Button>
									{/if}
								</Table.Cell>
							</Table.Row>
						{:else}
							{#each filteredJobs as job}
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
											<Button
												onclick={() => goto(`/app/jobs/${job.id}`)}
												variant="ghost"
												size="icon"
												class="h-8 w-8"
											>
												<Eye class="h-4 w-4" />
												<span class="sr-only">View job</span>
											</Button>
											<Button
												onclick={() => goto(`/app/jobs/${job.id}/edit`)}
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
												disabled={isDeleting}
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
						<Pagination.Item>{i + 1}</Pagination.Item>
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
			<AlertDialog.Cancel disabled={isDeleting}>Cancel</AlertDialog.Cancel>
			<AlertDialog.Action
				onclick={handleDelete}
				class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
				disabled={isDeleting}
			>
				{#if isDeleting}
					<Loader2 class="mr-2 h-4 w-4 animate-spin" />
					Deleting...
				{:else}
					Delete
				{/if}
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
