<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Card from '$lib/components/ui/card';
	import * as Select from '$lib/components/ui/select';
	import * as Tabs from '$lib/components/ui/tabs';
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
		Sparkles
	} from 'lucide-svelte';
	import type { JobStatus } from '$lib/types/user-job';
	import { extractJob, createJob } from '$lib/services/job.remote';

	// Form states
	let mode = $state<'manual' | 'ai'>('manual');
	let isSubmitting = $state(false);

	// AI extraction state
	let jobUrl = $state('');
	let jobDescription = $state('');

	// Manual form fields
	let company = $state('');
	let title = $state('');
	let description = $state('');
	let salary = $state('');
	let link = $state('');
	let status = $state<JobStatus>('tracked');
	let notes = $state('');

	// Location array management
	let locations = $state<string[]>([]);
	let newLocation = $state('');

	// Hidden form element for AI extraction
	let extractJobForm: HTMLFormElement;

	function addLocation() {
		if (newLocation.trim() && !locations.includes(newLocation.trim())) {
			locations = [...locations, newLocation.trim()];
			newLocation = '';
		}
	}

	function removeLocation(location: string) {
		locations = locations.filter((l) => l !== location);
	}

	// Form validation
	function validateManualForm(): boolean {
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

	function validateAiForm(): boolean {
		if (!jobUrl.trim() && !jobDescription.trim()) {
			toast.error('Please provide either a job URL or job description');
			return false;
		}
		return true;
	}

	// Handle AI extraction
	async function handleAiExtraction() {
		if (!validateAiForm()) return;

		// Submit the hidden form programmatically
		if (extractJobForm) {
			extractJobForm.requestSubmit();
		}
	}

	// Handle manual creation
	async function handleManualCreation() {
		if (!validateManualForm()) return;

		isSubmitting = true;
		try {
			const jobData = {
				company: company.trim(),
				title: title.trim(),
				description: description.trim(),
				salary: salary.trim() || null,
				location: locations.length > 0 ? locations : null,
				link: link.trim() || null,
				status,
				notes: notes.trim() || null
			};

			const result = await createJob(jobData);

			if (result.jobId) {
				toast.success('Job added successfully!');
				goto(`/app/jobs/${result.jobId}`);
			}
		} catch (error) {
			console.error('Failed to create job:', error);
			toast.error('Failed to add job. Please try again.');
		} finally {
			isSubmitting = false;
		}
	}

	function handleSubmit() {
		if (mode === 'ai') {
			handleAiExtraction();
		} else {
			handleManualCreation();
		}
	}

	function handleCancel() {
		goto('/app/jobs');
	}
</script>

<svelte:head>
	<title>Add New Job - ATSPro</title>
</svelte:head>

<div class="container mx-auto max-w-4xl space-y-6 p-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-4">
			<Button variant="ghost" size="icon" onclick={() => goto('/app/jobs')}>
				<ArrowLeft class="h-4 w-4" />
			</Button>
			<div>
				<h1 class="text-3xl font-bold">Add New Job</h1>
				<p class="text-muted-foreground">Track a new job opportunity</p>
			</div>
		</div>
	</div>

	<!-- Mode Selector Tabs -->
	<Tabs.Root
		value={mode}
		onValueChange={(v) => {
			if (v === 'manual' || v === 'ai') {
				mode = v;
			}
		}}
	>
		<Tabs.List class="grid w-full grid-cols-2">
			<Tabs.Trigger value="manual" disabled={isSubmitting}>
				<FileText class="mr-2 h-4 w-4" />
				Manual Entry
			</Tabs.Trigger>
			<Tabs.Trigger value="ai" disabled={isSubmitting}>
				<Sparkles class="mr-2 h-4 w-4" />
				AI Extract
			</Tabs.Trigger>
		</Tabs.List>

		<!-- Manual Entry Tab -->
		<Tabs.Content value="manual" class="space-y-6">
			<Card.Root>
				<Card.Header>
					<Card.Title>Job Details</Card.Title>
					<Card.Description>Enter the job information manually</Card.Description>
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
							<div class="relative flex-1">
								<MapPin
									class="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
								/>
								<Input
									placeholder="e.g., San Francisco, CA"
									bind:value={newLocation}
									class="pl-10"
									disabled={isSubmitting}
									onkeydown={(e) => {
										if (e.key === 'Enter') {
											e.preventDefault();
											addLocation();
										}
									}}
								/>
							</div>
							<Button onclick={addLocation} variant="outline" disabled={isSubmitting}>
								<Plus class="h-4 w-4" />
							</Button>
						</div>
						{#if locations.length > 0}
							<div class="flex flex-wrap gap-2 pt-2">
								{#each locations as location}
									<Badge variant="secondary" class="gap-1">
										<MapPin class="h-3 w-3" />
										{location}
										<button
											onclick={() => removeLocation(location)}
											class="hover:text-destructive ml-1"
											disabled={isSubmitting}
										>
											<X class="h-3 w-3" />
										</button>
									</Badge>
								{/each}
							</div>
						{/if}
					</div>

					<!-- Status -->
					<div class="space-y-2">
						<Label for="status">Initial Status</Label>
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
		</Tabs.Content>

		<!-- AI Extract Tab -->
		<Tabs.Content value="ai" class="space-y-6">
			<Card.Root>
				<Card.Header>
					<Card.Title>Extract Job Details</Card.Title>
					<Card.Description>Let AI extract job details from a URL or description</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-6">
					<div class="space-y-4">
						<div class="space-y-2">
							<Label for="jobUrl">Job URL</Label>
							<Input
								id="jobUrl"
								type="url"
								placeholder="https://example.com/careers/job-posting"
								bind:value={jobUrl}
								disabled={isSubmitting}
							/>
							<p class="text-muted-foreground text-sm">
								Paste the URL of the job posting to automatically extract details
							</p>
						</div>

						<div class="relative">
							<div class="absolute inset-0 flex items-center">
								<span class="w-full border-t"></span>
							</div>
							<div class="relative flex justify-center text-xs uppercase">
								<span class="bg-background text-muted-foreground px-2">Or</span>
							</div>
						</div>

						<div class="space-y-2">
							<Label for="jobDescription">Job Description</Label>
							<Textarea
								id="jobDescription"
								placeholder="Paste the job description here..."
								bind:value={jobDescription}
								rows={10}
								disabled={isSubmitting}
							/>
							<p class="text-muted-foreground text-sm">
								Copy and paste the job description to extract structured information
							</p>
						</div>
					</div>
				</Card.Content>
			</Card.Root>
		</Tabs.Content>
	</Tabs.Root>

	<!-- Action Buttons -->
	<div class="flex justify-end gap-3">
		<Button variant="outline" onclick={handleCancel} disabled={isSubmitting}>Cancel</Button>
		<Button onclick={handleSubmit} disabled={isSubmitting}>
			{#if isSubmitting}
				<Loader2 class="mr-2 h-4 w-4 animate-spin" />
				{mode === 'ai' ? 'Extracting...' : 'Adding...'}
			{:else}
				<Plus class="mr-2 h-4 w-4" />
				{mode === 'ai' ? 'Extract & Add Job' : 'Add Job'}
			{/if}
		</Button>
	</div>
</div>

<!-- Hidden form for AI extraction -->
<form
	bind:this={extractJobForm}
	class="hidden"
	{...extractJob.enhance(async ({ form, data, submit }) => {
		isSubmitting = true;

		try {
			// Submit the form
			await submit();

			// The form submission was successful and returned data
			toast.success('Job extracted and added successfully!');

			// Navigate to the newly created job page
			// The result is available via extractJob.result after submission
			if (extractJob.result?.jobId) {
				goto(`/app/jobs/${extractJob.result.jobId}`);
			}
		} catch (error) {
			// An actual error occurred during extraction
			console.error('Failed to extract job:', error);

			// Show appropriate error message
			if (error instanceof Error) {
				toast.error(error.message || 'Failed to extract job details. Please try manual entry.');
			} else {
				toast.error('Failed to extract job details. Please try manual entry.');
			}
		} finally {
			isSubmitting = false;
		}

		// Return nothing to prevent the default form behavior
		return;
	})}
>
	<input type="hidden" name="jobUrl" value={jobUrl} />
	<input type="hidden" name="jobDescription" value={jobDescription} />
</form>
