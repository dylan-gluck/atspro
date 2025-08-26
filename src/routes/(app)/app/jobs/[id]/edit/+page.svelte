<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Card from '$lib/components/ui/card';
	import * as Select from '$lib/components/ui/select';
	import { Badge } from '$lib/components/ui/badge';
	import { toast } from 'svelte-sonner';
	import {
		ArrowLeft,
		Building,
		Briefcase,
		MapPin,
		DollarSign,
		Link,
		FileText,
		Plus,
		X,
		Loader2,
		Save
	} from 'lucide-svelte';
	import type { JobStatus } from '$lib/types/user-job';
	import { getJob, updateJob, updateJobStatus } from '$lib/services/job.remote';

	// Get job ID from URL
	let jobId = $derived(page.params.id);

	// Fetch job data
	let jobQuery = $derived(jobId ? getJob(jobId) : null);
	let originalJob = $derived(jobQuery?.current?.job);
	let jobLoading = $derived(jobQuery?.loading);
	let jobError = $derived(jobQuery?.error);

	// Form states
	let isSubmitting = $state(false);
	let hasChanges = $state(false);

	// Form fields - initialized from job data
	let company = $state('');
	let title = $state('');
	let description = $state('');
	let salary = $state('');
	let link = $state('');
	let status = $state<JobStatus>('tracked');
	let notes = $state('');

	// Array fields
	let locations = $state<string[]>([]);
	let responsibilities = $state<string[]>([]);
	let qualifications = $state<string[]>([]);
	let logistics = $state<string[]>([]);
	let additionalInfo = $state<string[]>([]);

	// New item states
	let newLocation = $state('');
	let newResponsibility = $state('');
	let newQualification = $state('');
	let newLogistic = $state('');
	let newInfo = $state('');

	// Initialize form when job loads
	$effect(() => {
		if (originalJob && !hasChanges) {
			company = originalJob.company || '';
			title = originalJob.title || '';
			description = originalJob.description || '';
			salary = originalJob.salary || '';
			link = originalJob.link || '';
			status = originalJob.status;
			notes = originalJob.notes || '';
			locations = originalJob.location ? [...originalJob.location] : [];
			responsibilities = originalJob.responsibilities ? [...originalJob.responsibilities] : [];
			qualifications = originalJob.qualifications ? [...originalJob.qualifications] : [];
			logistics = originalJob.logistics ? [...originalJob.logistics] : [];
			additionalInfo = originalJob.additionalInfo ? [...originalJob.additionalInfo] : [];
		}
	});

	// Check for changes
	$effect(() => {
		if (originalJob) {
			hasChanges =
				company !== originalJob.company ||
				title !== originalJob.title ||
				description !== originalJob.description ||
				salary !== (originalJob.salary || '') ||
				link !== (originalJob.link || '') ||
				status !== originalJob.status ||
				notes !== (originalJob.notes || '') ||
				JSON.stringify(locations) !== JSON.stringify(originalJob.location || []) ||
				JSON.stringify(responsibilities) !== JSON.stringify(originalJob.responsibilities || []) ||
				JSON.stringify(qualifications) !== JSON.stringify(originalJob.qualifications || []) ||
				JSON.stringify(logistics) !== JSON.stringify(originalJob.logistics || []) ||
				JSON.stringify(additionalInfo) !== JSON.stringify(originalJob.additionalInfo || []);
		}
	});

	// Array management functions
	function addItem(array: string[], newItem: string, clearFn: () => void) {
		if (newItem.trim() && !array.includes(newItem.trim())) {
			array.push(newItem.trim());
			clearFn();
			hasChanges = true;
		}
	}

	function removeItem(array: string[], item: string) {
		const index = array.indexOf(item);
		if (index > -1) {
			array.splice(index, 1);
			hasChanges = true;
		}
	}

	// Form validation
	function validateForm(): boolean {
		if (!company.trim()) {
			toast.error('Company name is required');
			return false;
		}
		if (!title.trim()) {
			toast.error('Job title is required');
			return false;
		}
		if (!description.trim()) {
			toast.error('Job description is required');
			return false;
		}
		return true;
	}

	// Handle save
	async function handleSave() {
		if (!validateForm() || !jobId) return;

		isSubmitting = true;
		try {
			// Prepare updates
			const updates: any = {};

			// Only include changed fields
			if (company !== originalJob?.company) updates.company = company.trim();
			if (title !== originalJob?.title) updates.title = title.trim();
			if (description !== originalJob?.description) updates.description = description.trim();
			if (salary !== (originalJob?.salary || '')) updates.salary = salary.trim() || null;
			if (link !== (originalJob?.link || '')) updates.link = link.trim() || null;
			if (JSON.stringify(locations) !== JSON.stringify(originalJob?.location || [])) {
				updates.location = locations.length > 0 ? locations : null;
			}
			if (
				JSON.stringify(responsibilities) !== JSON.stringify(originalJob?.responsibilities || [])
			) {
				updates.responsibilities = responsibilities.length > 0 ? responsibilities : null;
			}
			if (JSON.stringify(qualifications) !== JSON.stringify(originalJob?.qualifications || [])) {
				updates.qualifications = qualifications.length > 0 ? qualifications : null;
			}
			if (JSON.stringify(logistics) !== JSON.stringify(originalJob?.logistics || [])) {
				updates.logistics = logistics.length > 0 ? logistics : null;
			}
			if (JSON.stringify(additionalInfo) !== JSON.stringify(originalJob?.additionalInfo || [])) {
				updates.additionalInfo = additionalInfo.length > 0 ? additionalInfo : null;
			}

			// Update job details if there are changes
			if (Object.keys(updates).length > 0) {
				await updateJob({ jobId, ...updates });
			}

			// Update status separately if changed
			if (status !== originalJob?.status) {
				await updateJobStatus({
					jobId,
					status,
					appliedAt: status === 'applied' ? new Date().toISOString() : undefined
				});
			}

			// Update notes separately if changed
			if (notes !== (originalJob?.notes || '')) {
				const { updateJobNotes } = await import('$lib/services/job.remote');
				await updateJobNotes({ jobId, notes });
			}

			toast.success('Job updated successfully!');
			goto(`/app/jobs/${jobId}`);
		} catch (error) {
			console.error('Failed to update job:', error);
			toast.error('Failed to update job. Please try again.');
		} finally {
			isSubmitting = false;
		}
	}

	function handleCancel() {
		if (hasChanges) {
			if (!confirm('You have unsaved changes. Are you sure you want to cancel?')) {
				return;
			}
		}
		goto(`/app/jobs/${jobId}`);
	}
</script>

<svelte:head>
	<title>Edit Job - ATSPro</title>
</svelte:head>

<div class="container mx-auto max-w-4xl space-y-6 p-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-4">
			<Button
				variant="ghost"
				size="icon"
				aria-label="Go back to job details"
				onclick={() => goto(`/app/jobs/${jobId}`)}
			>
				<ArrowLeft class="h-4 w-4" />
			</Button>
			<div>
				<h1 class="text-3xl font-bold">Edit Job</h1>
				<p class="text-muted-foreground">Update job information</p>
			</div>
		</div>
	</div>

	{#if jobLoading}
		<div class="flex justify-center py-12">
			<Loader2 class="h-8 w-8 animate-spin" />
		</div>
	{:else if jobError}
		<Card.Root>
			<Card.Content class="py-12 text-center">
				<p class="text-destructive">Failed to load job details</p>
				<Button variant="outline" class="mt-4" onclick={() => goto('/app/jobs')}>
					Back to Jobs
				</Button>
			</Card.Content>
		</Card.Root>
	{:else if originalJob}
		<Card.Root>
			<Card.Header>
				<Card.Title>Job Details</Card.Title>
				<Card.Description>Edit the job information below</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-6">
				<!-- Company & Title -->
				<div class="grid gap-4 sm:grid-cols-2">
					<div class="space-y-2">
						<Label for="company">
							Company <span class="text-destructive">*</span>
						</Label>
						<div class="relative">
							<Building
								class="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
							/>
							<Input
								id="company"
								placeholder="e.g., Google"
								bind:value={company}
								class="pl-10"
								disabled={isSubmitting}
							/>
						</div>
					</div>
					<div class="space-y-2">
						<Label for="title">
							Job Title <span class="text-destructive">*</span>
						</Label>
						<div class="relative">
							<Briefcase
								class="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
							/>
							<Input
								id="title"
								placeholder="e.g., Senior Software Engineer"
								bind:value={title}
								class="pl-10"
								disabled={isSubmitting}
							/>
						</div>
					</div>
				</div>

				<!-- Description -->
				<div class="space-y-2">
					<Label for="description">
						Description <span class="text-destructive">*</span>
					</Label>
					<Textarea
						id="description"
						placeholder="Enter the job description..."
						bind:value={description}
						rows={6}
						disabled={isSubmitting}
					/>
				</div>

				<!-- Salary & Link -->
				<div class="grid gap-4 sm:grid-cols-2">
					<div class="space-y-2">
						<Label for="salary">Salary Range</Label>
						<div class="relative">
							<DollarSign
								class="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
							/>
							<Input
								id="salary"
								placeholder="e.g., $120k-$180k"
								bind:value={salary}
								class="pl-10"
								disabled={isSubmitting}
							/>
						</div>
					</div>
					<div class="space-y-2">
						<Label for="link">Job Link</Label>
						<div class="relative">
							<Link
								class="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
							/>
							<Input
								id="link"
								type="url"
								placeholder="https://..."
								bind:value={link}
								class="pl-10"
								disabled={isSubmitting}
							/>
						</div>
					</div>
				</div>

				<!-- Location -->
				<div class="space-y-2">
					<Label>Location(s)</Label>
					<div class="flex gap-2">
						<Input
							placeholder="e.g., San Francisco, CA"
							bind:value={newLocation}
							disabled={isSubmitting}
							onkeydown={(e) => {
								if (e.key === 'Enter') {
									e.preventDefault();
									addItem(locations, newLocation, () => (newLocation = ''));
								}
							}}
						/>
						<Button
							onclick={() => addItem(locations, newLocation, () => (newLocation = ''))}
							variant="outline"
							aria-label="Add location"
							disabled={isSubmitting}
						>
							<Plus class="h-4 w-4" />
						</Button>
					</div>
					{#if locations.length > 0}
						<div class="flex flex-wrap gap-2 pt-2">
							{#each locations as location}
								<Badge variant="secondary" class="gap-1">
									{location}
									<button
										onclick={() => removeItem(locations, location)}
										class="hover:text-destructive ml-1"
										aria-label={`Remove location ${location}`}
										disabled={isSubmitting}
									>
										<X class="h-3 w-3" />
									</button>
								</Badge>
							{/each}
						</div>
					{/if}
				</div>

				<!-- Responsibilities -->
				<div class="space-y-2">
					<Label>Responsibilities</Label>
					<div class="flex gap-2">
						<Input
							placeholder="Add a responsibility..."
							bind:value={newResponsibility}
							disabled={isSubmitting}
							onkeydown={(e) => {
								if (e.key === 'Enter') {
									e.preventDefault();
									addItem(responsibilities, newResponsibility, () => (newResponsibility = ''));
								}
							}}
						/>
						<Button
							onclick={() =>
								addItem(responsibilities, newResponsibility, () => (newResponsibility = ''))}
							variant="outline"
							aria-label="Add responsibility"
							disabled={isSubmitting}
						>
							<Plus class="h-4 w-4" />
						</Button>
					</div>
					{#if responsibilities.length > 0}
						<div class="space-y-2 pt-2">
							{#each responsibilities as resp}
								<div class="flex items-center gap-2">
									<span class="text-sm">• {resp}</span>
									<button
										onclick={() => removeItem(responsibilities, resp)}
										class="hover:text-destructive"
										aria-label="Remove responsibility"
										disabled={isSubmitting}
									>
										<X class="h-3 w-3" />
									</button>
								</div>
							{/each}
						</div>
					{/if}
				</div>

				<!-- Status -->
				<div class="space-y-2">
					<Label for="status">Status</Label>
					<Select.Root
						type="single"
						value={status}
						onValueChange={(v) => {
							if (v) status = v as JobStatus;
						}}
						disabled={isSubmitting}
					>
						<Select.Trigger id="status">
							<span>{status}</span>
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
				</div>

				<!-- Notes -->
				<div class="space-y-2">
					<Label for="notes">Notes</Label>
					<Textarea
						id="notes"
						placeholder="Any additional notes..."
						bind:value={notes}
						rows={3}
						disabled={isSubmitting}
					/>
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Action Buttons -->
		<div class="flex justify-end gap-3">
			<Button variant="outline" onclick={handleCancel} disabled={isSubmitting}>Cancel</Button>
			<Button onclick={handleSave} disabled={isSubmitting || !hasChanges}>
				{#if isSubmitting}
					<Loader2 class="mr-2 h-4 w-4 animate-spin" />
					Saving...
				{:else}
					<Save class="mr-2 h-4 w-4" />
					Save Changes
				{/if}
			</Button>
		</div>
	{/if}
</div>
