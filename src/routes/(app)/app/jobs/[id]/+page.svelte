<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import * as Tabs from '$lib/components/ui/tabs';
	import * as Select from '$lib/components/ui/select';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Separator } from '$lib/components/ui/separator';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { toast } from 'svelte-sonner';
	import {
		ArrowLeft,
		Edit,
		Trash2,
		FileText,
		FileCheck,
		Building,
		MapPin,
		DollarSign,
		Calendar,
		ExternalLink,
		Download,
		Sparkles,
		Clock,
		CheckCircle2,
		Eye,
		Loader2
	} from 'lucide-svelte';
	import type { UserJob, JobStatus, JobDocument, JobActivity } from '$lib/types/user-job';
	
	// Import remote functions
	import { getJob, updateJobStatus, updateJobNotes, deleteJob } from '$lib/services/job.remote';
	import { optimizeResume, generateCoverLetter, generateCompanyResearch } from '$lib/services/document.remote';
	import { getJobActivity } from '$lib/services/activity.remote';
	import { getResume } from '$lib/services/resume.remote';

	// Get job ID from URL
	let jobId = $derived(page.params.id);

	// Fetch job data using remote functions
	let jobQuery = $derived(getJob(jobId));
	let job = $derived(jobQuery.data?.job);
	let documents = $derived(jobQuery.data?.documents || []);
	let jobLoading = $derived(jobQuery.loading);
	let jobError = $derived(jobQuery.error);

	// Fetch activity data
	let activityQuery = $derived(getJobActivity({ jobId, limit: 20 }));
	let activities = $derived(activityQuery.data?.activities || []);
	let activityLoading = $derived(activityQuery.loading);

	// Fetch user's resume for document generation
	let resumeQuery = getResume();
	let userResume = $derived(resumeQuery.data);

	// Notes state
	let notes = $state(job?.notes || '');
	let notesLoading = $state(false);

	// Dialog states
	let deleteDialogOpen = $state(false);
	let deleteLoading = $state(false);
	let generateResumeLoading = $state(false);
	let generateCoverLoading = $state(false);
	let generateResearchLoading = $state(false);

	// Tab state
	let activeTab = $state('overview');
	
	// Status update loading
	let statusLoading = $state(false);

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

	function formatDate(date: Date): string {
		return new Intl.DateTimeFormat('en-US', {
			month: 'long',
			day: 'numeric',
			year: 'numeric'
		}).format(date);
	}

	function formatActivityDate(date: Date): string {
		const now = new Date();
		const diff = now.getTime() - date.getTime();
		const days = Math.floor(diff / (1000 * 60 * 60 * 24));

		if (days === 0) {
			const hours = Math.floor(diff / (1000 * 60 * 60));
			if (hours === 0) {
				const minutes = Math.floor(diff / (1000 * 60));
				return `${minutes} minutes ago`;
			}
			return `${hours} hours ago`;
		}
		if (days === 1) return 'Yesterday';
		if (days < 7) return `${days} days ago`;

		return formatDate(date);
	}

	function getDocumentTypeLabel(type: JobDocument['type']): string {
		switch (type) {
			case 'resume':
				return 'Optimized Resume';
			case 'cover':
				return 'Cover Letter';
			case 'research':
				return 'Company Research';
			case 'prep':
				return 'Interview Prep';
			default:
				return type;
		}
	}

	function getActivityIcon(action: string) {
		switch (action) {
			case 'applied':
				return CheckCircle2;
			case 'document_generated':
				return FileText;
			case 'status_changed':
				return Clock;
			default:
				return Clock;
		}
	}

	async function generateOptimizedResume() {
		if (!userResume) {
			toast.error('Please complete your profile first');
			goto('/app/resume');
			return;
		}
		
		generateResumeLoading = true;
		try {
			const result = await optimizeResume({
				resumeId: userResume.id,
				jobId
			});
			
			toast.success(`Resume optimized! ATS Score: ${result.optimizationScore}%`);
			// Refresh job data to get new documents
			await jobQuery.refresh();
		} catch (error) {
			toast.error('Failed to optimize resume');
			console.error(error);
		} finally {
			generateResumeLoading = false;
		}
	}

	async function generateCoverLetter() {
		if (!userResume) {
			toast.error('Please complete your profile first');
			goto('/app/resume');
			return;
		}
		
		generateCoverLoading = true;
		try {
			const formData = new FormData();
			formData.append('jobId', jobId);
			formData.append('tone', 'professional');
			
			const result = await generateCoverLetter(formData);
			toast.success('Cover letter generated successfully!');
			// Refresh job data to get new documents
			await jobQuery.refresh();
		} catch (error) {
			toast.error('Failed to generate cover letter');
			console.error(error);
		} finally {
			generateCoverLoading = false;
		}
	}
	
	async function generateResearch() {
		generateResearchLoading = true;
		try {
			const result = await generateCompanyResearch({ jobId });
			toast.success('Company research generated!');
			// Refresh job data to get new documents
			await jobQuery.refresh();
		} catch (error) {
			toast.error('Failed to generate company research');
			console.error(error);
		} finally {
			generateResearchLoading = false;
		}
	}

	async function updateStatus(newStatus: JobStatus) {
		if (!job) return;
		
		statusLoading = true;
		try {
			await updateJobStatus({
				jobId,
				status: newStatus,
				appliedAt: newStatus === 'applied' && !job.appliedAt ? new Date().toISOString() : undefined
			});
			
			toast.success(`Status updated to ${newStatus}`);
			// Data will auto-refresh via single-flight mutation
		} catch (error) {
			toast.error('Failed to update status');
			console.error(error);
		} finally {
			statusLoading = false;
		}
	}

	async function handleDelete() {
		deleteLoading = true;
		try {
			await deleteJob(jobId);
			toast.success('Job deleted successfully');
			goto('/app/jobs');
		} catch (error) {
			toast.error('Failed to delete job');
			console.error(error);
			deleteLoading = false;
			deleteDialogOpen = false;
		}
	}

	async function saveNotes() {
		if (!job) return;
		
		notesLoading = true;
		try {
			await updateJobNotes({ jobId, notes });
			toast.success('Notes saved');
		} catch (error) {
			toast.error('Failed to save notes');
			console.error(error);
		} finally {
			notesLoading = false;
		}
	}
</script>

<svelte:head>
	<title>{job.title} at {job.company} - ATSPro</title>
</svelte:head>

<div class="container mx-auto space-y-6 p-6">
	<!-- Header -->
	<div class="flex flex-col items-start justify-between gap-4 sm:flex-row">
		<div class="flex items-start gap-4">
			<Button onclick={() => goto('/app/jobs')} variant="ghost" size="icon">
				<ArrowLeft class="h-4 w-4" />
			</Button>
			<div>
				<div class="mb-2 flex items-center gap-3">
					<h1 class="text-3xl font-bold">{job.company}</h1>
					<Badge variant={getStatusBadgeVariant(job.status)} class="text-xs">
						{job.status}
					</Badge>
				</div>
				<p class="text-muted-foreground text-xl">{job.title}</p>
				<div class="text-muted-foreground mt-3 flex flex-wrap gap-4 text-sm">
					{#if job.location && job.location.length > 0}
						<div class="flex items-center gap-1">
							<MapPin class="h-4 w-4" />
							{job.location.join(', ')}
						</div>
					{/if}
					{#if job.salary}
						<div class="flex items-center gap-1">
							<DollarSign class="h-4 w-4" />
							{job.salary}
						</div>
					{/if}
					{#if job.appliedAt}
						<div class="flex items-center gap-1">
							<Calendar class="h-4 w-4" />
							Applied {formatDate(job.appliedAt)}
						</div>
					{/if}
				</div>
			</div>
		</div>

		<div class="flex gap-2">
			<Button onclick={() => goto(`/app/jobs/${jobId}/edit`)} variant="outline" class="gap-2">
				<Edit class="h-4 w-4" />
				Edit
			</Button>
			<Button
				variant="outline"
				onclick={() => (deleteDialogOpen = true)}
				class="text-destructive hover:text-destructive gap-2"
			>
				<Trash2 class="h-4 w-4" />
				Delete
			</Button>
		</div>
	</div>

	<!-- Action Buttons -->
	<Card.Root>
		<Card.Content class="pt-6">
			<div class="flex flex-col gap-4 sm:flex-row">
				<Select.Root onValueChange={(v) => v && updateStatus(v as JobStatus)}>
					<Select.Trigger class="w-full sm:w-[200px]">
						<span>Update Status</span>
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="tracked">Tracked</Select.Item>
						<Select.Item value="applied">Applied</Select.Item>
						<Select.Item value="interviewing">Interviewing</Select.Item>
						<Select.Item value="offered">Offered</Select.Item>
						<Select.Item value="rejected">Rejected</Select.Item>
						<Select.Item value="withdrawn">Withdrawn</Select.Item>
					</Select.Content>
				</Select.Root>

				<div class="flex flex-1 gap-2">
					<Button
						onclick={generateOptimizedResume}
						disabled={generateResumeLoading}
						class="flex-1 gap-2 sm:flex-initial"
					>
						{#if generateResumeLoading}
							<Loader2 class="h-4 w-4 animate-spin" />
							Generating...
						{:else}
							<Sparkles class="h-4 w-4" />
							Generate Resume
						{/if}
					</Button>
					<Button
						onclick={generateCoverLetter}
						disabled={generateCoverLoading}
						variant="outline"
						class="flex-1 gap-2 sm:flex-initial"
					>
						{#if generateCoverLoading}
							<Loader2 class="h-4 w-4 animate-spin" />
							Generating...
						{:else}
							<FileText class="h-4 w-4" />
							Generate Cover Letter
						{/if}
					</Button>
					<Button
						onclick={generateResearch}
						disabled={generateResearchLoading}
						variant="outline"
						class="flex-1 gap-2 sm:flex-initial"
					>
						{#if generateResearchLoading}
							<Loader2 class="h-4 w-4 animate-spin" />
							Generating...
						{:else}
							<Building class="h-4 w-4" />
							Company Research
						{/if}
					</Button>
				</div>

				{#if job.link}
					<Button onclick={() => window.open(job.link, '_blank')} variant="outline" class="gap-2">
						<ExternalLink class="h-4 w-4" />
						View Posting
					</Button>
				{/if}
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Tabs Content -->
	<Tabs.Root bind:value={activeTab} class="w-full">
		<Tabs.List class="grid w-full grid-cols-4">
			<Tabs.Trigger value="overview">Overview</Tabs.Trigger>
			<Tabs.Trigger value="documents">Documents</Tabs.Trigger>
			<Tabs.Trigger value="activity">Activity</Tabs.Trigger>
			<Tabs.Trigger value="notes">Notes</Tabs.Trigger>
		</Tabs.List>

		<Tabs.Content value="overview" class="mt-6 space-y-6">
			<Card.Root>
				<Card.Header>
					<Card.Title>Job Description</Card.Title>
				</Card.Header>
				<Card.Content>
					<div class="prose prose-sm max-w-none">
						{#each job.description.split('\n') as paragraph}
							{#if paragraph.startsWith('###')}
								<h3 class="mb-2 mt-4 text-lg font-semibold">{paragraph.replace('### ', '')}</h3>
							{:else if paragraph.trim()}
								<p class="mb-4">{paragraph}</p>
							{/if}
						{/each}
					</div>
				</Card.Content>
			</Card.Root>

			{#if job.responsibilities && job.responsibilities.length > 0}
				<Card.Root>
					<Card.Header>
						<Card.Title>Responsibilities</Card.Title>
					</Card.Header>
					<Card.Content>
						<ul class="space-y-2">
							{#each job.responsibilities as item}
								<li class="flex items-start gap-2">
									<span class="text-primary mt-1">"</span>
									<span>{item}</span>
								</li>
							{/each}
						</ul>
					</Card.Content>
				</Card.Root>
			{/if}

			{#if job.qualifications && job.qualifications.length > 0}
				<Card.Root>
					<Card.Header>
						<Card.Title>Qualifications</Card.Title>
					</Card.Header>
					<Card.Content>
						<ul class="space-y-2">
							{#each job.qualifications as item}
								<li class="flex items-start gap-2">
									<span class="text-primary mt-1">"</span>
									<span>{item}</span>
								</li>
							{/each}
						</ul>
					</Card.Content>
				</Card.Root>
			{/if}

			{#if job.logistics && job.logistics.length > 0}
				<Card.Root>
					<Card.Header>
						<Card.Title>Benefits & Logistics</Card.Title>
					</Card.Header>
					<Card.Content>
						<ul class="space-y-2">
							{#each job.logistics as item}
								<li class="flex items-start gap-2">
									<span class="text-primary mt-1">"</span>
									<span>{item}</span>
								</li>
							{/each}
						</ul>
					</Card.Content>
				</Card.Root>
			{/if}
		</Tabs.Content>

		<Tabs.Content value="documents" class="mt-6">
			<Card.Root>
				<Card.Header>
					<Card.Title>Generated Documents</Card.Title>
					<Card.Description>AI-optimized documents for this position</Card.Description>
				</Card.Header>
				<Card.Content>
					{#if documents.length === 0}
						<p class="text-muted-foreground py-8 text-center">
							No documents generated yet. Use the buttons above to generate an optimized resume or
							cover letter.
						</p>
					{:else}
						<div class="space-y-4">
							{#each documents as doc}
								<div
									class="hover:bg-muted/50 flex items-center justify-between rounded-lg border p-4"
								>
									<div class="flex items-center gap-4">
										<div class="bg-primary/10 rounded-lg p-2">
											<FileCheck class="text-primary h-5 w-5" />
										</div>
										<div>
											<p class="font-medium">{getDocumentTypeLabel(doc.type)}</p>
											<p class="text-muted-foreground text-sm">
												Version {doc.version} • Created {formatDate(doc.createdAt)}
											</p>
											{#if doc.metadata?.atsScore}
												<p class="text-primary mt-1 text-sm">
													ATS Score: {doc.metadata.atsScore}%
												</p>
											{/if}
										</div>
									</div>
									<div class="flex gap-2">
										<Button variant="outline" size="sm" class="gap-2">
											<Eye class="h-4 w-4" />
											View
										</Button>
										<Button variant="outline" size="sm" class="gap-2">
											<Download class="h-4 w-4" />
											Download
										</Button>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</Card.Content>
			</Card.Root>
		</Tabs.Content>

		<Tabs.Content value="activity" class="mt-6">
			<Card.Root>
				<Card.Header>
					<Card.Title>Activity Timeline</Card.Title>
					<Card.Description>Track all actions and updates for this application</Card.Description>
				</Card.Header>
				<Card.Content>
					<div class="space-y-4">
						{#each activities as activity, i}
							{@const Icon = getActivityIcon(activity.action)}
							<div class="flex gap-4">
								<div class="flex flex-col items-center">
									<div class="bg-primary/10 rounded-full p-2">
										<Icon class="text-primary h-4 w-4" />
									</div>
									{#if i < activities.length - 1}
										<div class="bg-border mt-2 h-16 w-0.5"></div>
									{/if}
								</div>
								<div class="flex-1 pb-8">
									<p class="font-medium">{activity.description}</p>
									<p class="text-muted-foreground text-sm">
										{formatActivityDate(activity.createdAt)}
									</p>
								</div>
							</div>
						{/each}
					</div>
				</Card.Content>
			</Card.Root>
		</Tabs.Content>

		<Tabs.Content value="notes" class="mt-6">
			<Card.Root>
				<Card.Header>
					<Card.Title>Notes</Card.Title>
					<Card.Description>
						Keep track of important details and thoughts about this position
					</Card.Description>
				</Card.Header>
				<Card.Content>
					<Textarea bind:value={notes} placeholder="Add your notes here..." class="min-h-[200px]" />
					<Button onclick={saveNotes} disabled={notesLoading} class="mt-4">
						{notesLoading ? 'Saving...' : 'Save Notes'}
					</Button>
				</Card.Content>
			</Card.Root>
		</Tabs.Content>
	</Tabs.Root>
</div>

<!-- Delete Confirmation Dialog -->
<AlertDialog.Root bind:open={deleteDialogOpen}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Delete Job Application</AlertDialog.Title>
			<AlertDialog.Description>
				Are you sure you want to delete this job application? All associated documents and data will
				be permanently removed. This action cannot be undone.
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
			<AlertDialog.Action
				onclick={handleDelete}
				disabled={deleteLoading}
				class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
			>
				{deleteLoading ? 'Deleting...' : 'Delete Application'}
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
{/if}
