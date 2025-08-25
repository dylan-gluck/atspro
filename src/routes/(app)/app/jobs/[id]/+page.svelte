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
		Eye
	} from 'lucide-svelte';
	import type { UserJob, JobStatus, JobDocument, JobActivity } from '$lib/types/user-job';

	// Get job ID from URL
	let jobId = $derived(page.params.id);

	// Placeholder job data - in real app, this would come from a load function
	let job = $state<UserJob>({
		id: jobId,
		userId: 'user1',
		company: 'OpenAI',
		title: 'Senior Frontend Engineer',
		description: `We're looking for a talented Senior Frontend Engineer to join our team and help build the next generation of AI-powered interfaces.

### About the Role
You'll be working on cutting-edge web applications that make AI accessible to millions of users worldwide. This role involves close collaboration with our AI research team to create intuitive, performant, and beautiful user experiences.

### What You'll Do
- Design and implement responsive, accessible web applications
- Collaborate with designers and researchers to bring innovative AI features to life
- Optimize application performance and user experience
- Mentor junior engineers and contribute to technical architecture decisions`,
		responsibilities: [
			'Build and maintain high-quality React applications',
			'Implement real-time features using WebSockets and streaming APIs',
			'Optimize application performance for scale',
			'Collaborate with cross-functional teams',
			'Participate in code reviews and technical discussions'
		],
		qualifications: [
			'5+ years of frontend development experience',
			'Expert knowledge of React, TypeScript, and modern web standards',
			'Experience with real-time applications and WebSocket protocols',
			'Strong understanding of web performance optimization',
			'Excellent communication and collaboration skills'
		],
		logistics: [
			'Full-time position',
			'Hybrid work model (3 days in office)',
			'Comprehensive health benefits',
			'Equity compensation',
			'401(k) matching'
		],
		location: ['San Francisco, CA', 'Remote (US)'],
		salary: '$180k - $250k + equity',
		link: 'https://openai.com/careers/senior-frontend-engineer',
		status: 'applied' as JobStatus,
		appliedAt: new Date('2024-01-15'),
		createdAt: new Date('2024-01-10'),
		updatedAt: new Date('2024-01-15')
	});

	// Placeholder documents
	let documents = $state<JobDocument[]>([
		{
			id: '1',
			jobId: jobId,
			type: 'resume',
			content: '# Optimized Resume\n\nTailored for OpenAI Senior Frontend Engineer position...',
			version: 2,
			isActive: true,
			metadata: { atsScore: 92, keywordsMatched: 15 },
			createdAt: new Date('2024-01-14'),
			updatedAt: new Date('2024-01-14')
		},
		{
			id: '2',
			jobId: jobId,
			type: 'cover',
			content: '# Cover Letter\n\nDear OpenAI Hiring Team...',
			version: 1,
			isActive: true,
			metadata: null,
			createdAt: new Date('2024-01-14'),
			updatedAt: new Date('2024-01-14')
		}
	]);

	// Placeholder activities
	let activities = $state<JobActivity[]>([
		{
			id: '1',
			jobId: jobId,
			action: 'applied',
			description: 'Applied to position',
			createdAt: new Date('2024-01-15')
		},
		{
			id: '2',
			jobId: jobId,
			action: 'document_generated',
			description: 'Generated optimized resume (v2)',
			createdAt: new Date('2024-01-14')
		},
		{
			id: '3',
			jobId: jobId,
			action: 'document_generated',
			description: 'Generated cover letter',
			createdAt: new Date('2024-01-14')
		},
		{
			id: '4',
			jobId: jobId,
			action: 'created',
			description: 'Added job to tracking',
			createdAt: new Date('2024-01-10')
		}
	]);

	// Notes state
	let notes = $state(
		'Initial thoughts: Great match for my skills. Focus on React performance optimization experience in the cover letter.'
	);

	// Dialog states
	let deleteDialogOpen = $state(false);
	let generateResumeLoading = $state(false);
	let generateCoverLoading = $state(false);

	// Tab state
	let activeTab = $state('overview');

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
		generateResumeLoading = true;
		// Simulate API call
		await new Promise((resolve) => setTimeout(resolve, 2000));
		generateResumeLoading = false;
		// In real app, would add the new document to the documents array
	}

	async function generateCoverLetter() {
		generateCoverLoading = true;
		// Simulate API call
		await new Promise((resolve) => setTimeout(resolve, 2000));
		generateCoverLoading = false;
		// In real app, would add the new document to the documents array
	}

	function updateStatus(newStatus: JobStatus) {
		job.status = newStatus;
		job.updatedAt = new Date();
		if (newStatus === 'applied' && !job.appliedAt) {
			job.appliedAt = new Date();
		}
	}

	function handleDelete() {
		// In real app, would navigate to jobs list after deletion
		deleteDialogOpen = false;
		console.log('Job deleted');
	}

	function saveNotes() {
		// In real app, would save to database
		console.log('Notes saved:', notes);
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
						<Sparkles class="h-4 w-4" />
						{generateResumeLoading ? 'Generating...' : 'Generate Resume'}
					</Button>
					<Button
						onclick={generateCoverLetter}
						disabled={generateCoverLoading}
						variant="outline"
						class="flex-1 gap-2 sm:flex-initial"
					>
						<FileText class="h-4 w-4" />
						{generateCoverLoading ? 'Generating...' : 'Generate Cover Letter'}
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
												Version {doc.version} " Created {formatDate(doc.createdAt)}
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
					<Button onclick={saveNotes} class="mt-4">Save Notes</Button>
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
				class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
			>
				Delete Application
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
