<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import {
		Card,
		CardContent,
		CardDescription,
		CardFooter,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import { Progress } from '$lib/components/ui/progress';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import {
		CheckCircle,
		Upload,
		FileText,
		User,
		Sparkles,
		ChevronLeft,
		ChevronRight,
		Info,
		Loader2
	} from 'lucide-svelte';
	import type { Resume } from '$lib/types/resume';
	import { extractResume, updateResume } from '$lib/services/resume.remote';
	import { goto } from '$app/navigation';

	// State management using Svelte 5 runes
	let currentStep = $state(1);
	const totalSteps = 5;

	// File upload state
	let dragActive = $state(false);
	let uploadedFile = $state<File | null>(null);
	let fileError = $state<string | null>(null);
	let isExtracting = $state(false);
	let isSaving = $state(false);

	// Resume data state (will be populated when we integrate with API)
	let resumeData = $state<Partial<Resume>>({
		contactInfo: {
			fullName: '',
			email: '',
			phone: '',
			address: '',
			links: []
		},
		summary: '',
		workExperience: [],
		education: [],
		certifications: [],
		skills: []
	});

	// User preferences state
	let preferences = $state({
		jobAlerts: true,
		weeklyTips: false,
		targetRole: '',
		experienceLevel: 'mid'
	});

	// Computed values using $derived
	let progressValue = $derived((currentStep / totalSteps) * 100);
	let canGoNext = $derived(() => {
		switch (currentStep) {
			case 1:
				return true; // Welcome step
			case 2:
				return uploadedFile !== null && !isExtracting; // File upload step
			case 3:
				return resumeData.contactInfo?.fullName !== ''; // Resume review step
			case 4:
				return true; // Profile preferences (optional)
			case 5:
				return false; // Success step (no next)
			default:
				return false;
		}
	});

	// Step navigation functions
	async function nextStep() {
		if (!canGoNext()) return;

		// When moving from upload step to review step, extract the resume
		if (currentStep === 2 && uploadedFile) {
			await handleFileUpload();
			// Only advance if extraction was successful
			if (resumeData.contactInfo?.fullName) {
				currentStep++;
			}
		} else if (currentStep === 4) {
			// When finishing preferences step, save the resume
			await saveResume();
		} else if (currentStep < totalSteps) {
			currentStep++;
		}
	}

	function previousStep() {
		if (currentStep > 1) {
			currentStep--;
		}
	}

	async function skipStep() {
		// Only allow skipping on optional steps (step 4)
		if (currentStep === 4) {
			await saveResume();
		}
	}

	// Save resume to database
	async function saveResume() {
		if (isSaving) return;
		
		try {
			isSaving = true;
			fileError = null;

			// Update the resume with the edited data
			await updateResume({
				contactInfo: resumeData.contactInfo,
				summary: resumeData.summary,
				workExperience: resumeData.workExperience,
				education: resumeData.education,
				certifications: resumeData.certifications,
				skills: resumeData.skills
			});

			// Move to success step
			currentStep = 5;
		} catch (err) {
			fileError = err instanceof Error ? err.message : 'Failed to save resume';
			console.error('Failed to save resume:', err);
		} finally {
			isSaving = false;
		}
	}

	// File upload handlers
	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		dragActive = true;
	}

	function handleDragLeave(e: DragEvent) {
		e.preventDefault();
		dragActive = false;
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		dragActive = false;

		const files = e.dataTransfer?.files;
		if (files && files.length > 0) {
			handleFileSelect(files[0]);
		}
	}

	function handleFileSelect(file: File) {
		// Validate file type (note: the backend only accepts PDF, markdown, and plain text)
		const validTypes = [
			'application/pdf',
			'text/plain',
			'text/markdown'
		];
		
		// Map DOCX to plain text for now (user will need to convert)
		if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
			file.type === 'application/msword') {
			fileError = 'Please convert your document to PDF or TXT format first';
			return;
		}

		if (!validTypes.includes(file.type)) {
			fileError = 'Please upload a PDF, TXT, or Markdown file';
			return;
		}

		// Validate file size (max 10MB as per backend)
		if (file.size > 10 * 1024 * 1024) {
			fileError = 'File size must be less than 10MB';
			return;
		}

		fileError = null;
		uploadedFile = file;
	}

	async function handleFileUpload() {
		if (!uploadedFile || isExtracting) return;

		try {
			isExtracting = true;
			fileError = null;

			// Create FormData with the file
			const formData = new FormData();
			formData.append('document', uploadedFile);

			// Extract resume using the remote function
			const result = await extractResume(formData);

			// Update resumeData with extracted fields
			if (result.extractedFields) {
				resumeData = result.extractedFields;
			}
		} catch (err) {
			fileError = err instanceof Error ? err.message : 'Failed to extract resume';
			console.error('Failed to extract resume:', err);
		} finally {
			isExtracting = false;
		}
	}

	function handleFileInput(e: Event) {
		const target = e.target as HTMLInputElement;
		const files = target.files;
		if (files && files.length > 0) {
			handleFileSelect(files[0]);
		}
	}

	// Function to finish onboarding and go to dashboard
	async function finishOnboarding() {
		await goto('/app');
	}
</script>

<svelte:head>
	<title>Get Started - ATSPro</title>
</svelte:head>

<!-- Step content snippets -->
{#snippet stepIndicator()}
	<div class="mb-8 flex items-center justify-center gap-2">
		{#each Array(totalSteps) as _, i}
			{@const stepNum = i + 1}
			{@const isActive = stepNum === currentStep}
			{@const isCompleted = stepNum < currentStep}
			<div class="flex items-center">
				<div
					class="flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium transition-all duration-200 {isActive
						? 'bg-primary text-primary-foreground'
						: isCompleted
							? 'bg-primary/20 text-primary'
							: 'bg-muted text-muted-foreground'}"
				>
					{#if isCompleted}
						<CheckCircle class="h-5 w-5" />
					{:else}
						{stepNum}
					{/if}
				</div>
				{#if stepNum < totalSteps}
					<div class="h-0.5 w-12 {isCompleted ? 'bg-primary/20' : 'bg-muted'}"></div>
				{/if}
			</div>
		{/each}
	</div>
{/snippet}

{#snippet welcomeStep()}
	<div class="space-y-6 text-center">
		<div class="bg-primary/10 mx-auto flex h-20 w-20 items-center justify-center rounded-full">
			<Sparkles class="text-primary h-10 w-10" />
		</div>
		<div class="space-y-2">
			<h2 class="text-3xl font-bold">Welcome to ATSPro!</h2>
			<p class="text-muted-foreground text-lg">
				Let's optimize your resume for ATS systems and land your dream job
			</p>
		</div>
		<div class="mx-auto max-w-md space-y-4 text-left">
			<div class="flex gap-3">
				<CheckCircle class="text-primary mt-0.5 h-5 w-5 flex-shrink-0" />
				<div>
					<p class="font-medium">AI-Powered Resume Optimization</p>
					<p class="text-muted-foreground text-sm">Tailor your resume for each job application</p>
				</div>
			</div>
			<div class="flex gap-3">
				<CheckCircle class="text-primary mt-0.5 h-5 w-5 flex-shrink-0" />
				<div>
					<p class="font-medium">Beat ATS Filters</p>
					<p class="text-muted-foreground text-sm">Ensure your resume passes automated screening</p>
				</div>
			</div>
			<div class="flex gap-3">
				<CheckCircle class="text-primary mt-0.5 h-5 w-5 flex-shrink-0" />
				<div>
					<p class="font-medium">Track Applications</p>
					<p class="text-muted-foreground text-sm">Manage all your job applications in one place</p>
				</div>
			</div>
		</div>
	</div>
{/snippet}

{#snippet uploadStep()}
	<div class="space-y-6">
		<div class="space-y-2 text-center">
			<h2 class="text-2xl font-bold">Upload Your Resume</h2>
			<p class="text-muted-foreground">We'll extract your information and help you optimize it</p>
		</div>

		<div
			class="rounded-lg border-2 border-dashed p-8 text-center transition-colors {dragActive
				? 'border-primary bg-primary/5'
				: 'border-muted-foreground/25 hover:border-muted-foreground/50'}"
			ondragover={handleDragOver}
			ondragleave={handleDragLeave}
			ondrop={handleDrop}
		>
			{#if isExtracting}
				<div class="space-y-4">
					<div
						class="bg-primary/10 mx-auto flex h-16 w-16 items-center justify-center rounded-full animate-pulse"
					>
						<Loader2 class="text-primary h-8 w-8 animate-spin" />
					</div>
					<div>
						<p class="font-medium">Extracting Resume Data...</p>
						<p class="text-muted-foreground text-sm">
							This may take a few moments
						</p>
					</div>
				</div>
			{:else if uploadedFile}
				<div class="space-y-4">
					<div
						class="bg-primary/10 mx-auto flex h-16 w-16 items-center justify-center rounded-full"
					>
						<FileText class="text-primary h-8 w-8" />
					</div>
					<div>
						<p class="font-medium">{uploadedFile.name}</p>
						<p class="text-muted-foreground text-sm">
							{(uploadedFile.size / 1024).toFixed(1)} KB
						</p>
					</div>
					<Button
						variant="outline"
						size="sm"
						onclick={() => {
							uploadedFile = null;
							fileError = null;
						}}
						disabled={isExtracting}
					>
						Remove File
					</Button>
				</div>
			{:else}
				<div class="space-y-4">
					<div class="bg-muted mx-auto flex h-16 w-16 items-center justify-center rounded-full">
						<Upload class="text-muted-foreground h-8 w-8" />
					</div>
					<div>
						<p class="font-medium">Drop your resume here</p>
						<p class="text-muted-foreground text-sm">or click to browse</p>
					</div>
					<p class="text-muted-foreground text-xs">Supports PDF, TXT, and Markdown (max 10MB)</p>
					<input
						type="file"
						accept=".pdf,.txt,.md"
						onchange={handleFileInput}
						class="hidden"
						id="file-upload"
					/>
					<label for="file-upload">
						<Button variant="outline" as="span" class="cursor-pointer">Choose File</Button>
					</label>
				</div>
			{/if}
		</div>

		{#if fileError}
			<Alert variant="destructive">
				<AlertDescription>{fileError}</AlertDescription>
			</Alert>
		{/if}

		<Alert>
			<Info class="h-4 w-4" />
			<AlertDescription>
				Your resume data is encrypted and stored securely. We never share your information without
				your consent.
			</AlertDescription>
		</Alert>
	</div>
{/snippet}

{#snippet reviewStep()}
	<div class="space-y-6">
		<div class="space-y-2 text-center">
			<h2 class="text-2xl font-bold">Review Your Information</h2>
			<p class="text-muted-foreground">Make sure everything looks correct</p>
		</div>

		<div class="space-y-4">
			<div class="space-y-2">
				<Label for="fullName">Full Name</Label>
				<Input
					id="fullName"
					bind:value={resumeData.contactInfo.fullName}
					placeholder="Enter your full name"
				/>
			</div>

			<div class="grid grid-cols-2 gap-4">
				<div class="space-y-2">
					<Label for="email">Email</Label>
					<Input
						id="email"
						type="email"
						bind:value={resumeData.contactInfo.email}
						placeholder="your@email.com"
					/>
				</div>
				<div class="space-y-2">
					<Label for="phone">Phone</Label>
					<Input
						id="phone"
						type="tel"
						bind:value={resumeData.contactInfo.phone}
						placeholder="+1 (555) 123-4567"
					/>
				</div>
			</div>

			<div class="space-y-2">
				<Label for="address">Location</Label>
				<Input id="address" bind:value={resumeData.contactInfo.address} placeholder="City, State" />
			</div>

			<div class="space-y-2">
				<Label for="summary">Professional Summary</Label>
				<Textarea
					id="summary"
					bind:value={resumeData.summary}
					placeholder="Brief overview of your experience and goals"
					rows={4}
				/>
			</div>

			{#if resumeData.skills && resumeData.skills.length > 0}
				<div class="space-y-2">
					<Label>Skills</Label>
					<div class="flex flex-wrap gap-2">
						{#each resumeData.skills as skill}
							<span class="bg-primary/10 text-primary rounded-full px-3 py-1 text-sm">
								{skill}
							</span>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	</div>
{/snippet}

{#snippet preferencesStep()}
	<div class="space-y-6">
		<div class="space-y-2 text-center">
			<h2 class="text-2xl font-bold">Complete Your Profile</h2>
			<p class="text-muted-foreground">Help us personalize your experience (optional)</p>
		</div>

		<div class="space-y-4">
			<div class="space-y-2">
				<Label for="targetRole">Target Job Role</Label>
				<Input
					id="targetRole"
					bind:value={preferences.targetRole}
					placeholder="e.g., Senior Software Engineer"
				/>
			</div>

			<div class="space-y-2">
				<Label for="experienceLevel">Experience Level</Label>
				<select
					id="experienceLevel"
					bind:value={preferences.experienceLevel}
					class="border-input bg-background ring-offset-background focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
				>
					<option value="entry">Entry Level (0-2 years)</option>
					<option value="mid">Mid Level (2-5 years)</option>
					<option value="senior">Senior Level (5-10 years)</option>
					<option value="executive">Executive (10+ years)</option>
				</select>
			</div>

			<div class="space-y-3 pt-4">
				<p class="text-sm font-medium">Email Notifications</p>
				<label class="flex cursor-pointer items-center space-x-3">
					<input
						type="checkbox"
						bind:checked={preferences.jobAlerts}
						class="border-input text-primary h-4 w-4 rounded"
					/>
					<div>
						<p class="text-sm font-medium">Job Match Alerts</p>
						<p class="text-muted-foreground text-xs">
							Get notified when new jobs match your profile
						</p>
					</div>
				</label>
				<label class="flex cursor-pointer items-center space-x-3">
					<input
						type="checkbox"
						bind:checked={preferences.weeklyTips}
						class="border-input text-primary h-4 w-4 rounded"
					/>
					<div>
						<p class="text-sm font-medium">Weekly Career Tips</p>
						<p class="text-muted-foreground text-xs">
							Receive resume and interview tips every week
						</p>
					</div>
				</label>
			</div>
		</div>
	</div>
{/snippet}

{#snippet successStep()}
	<div class="space-y-6 text-center">
		<div
			class="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20"
		>
			<CheckCircle class="h-10 w-10 text-green-600 dark:text-green-400" />
		</div>
		<div class="space-y-2">
			<h2 class="text-3xl font-bold">You're All Set!</h2>
			<p class="text-muted-foreground text-lg">
				Your profile is ready. Let's start optimizing your resume!
			</p>
		</div>
		<div class="mx-auto max-w-md space-y-4 text-left">
			<h3 class="font-semibold">What's Next?</h3>
			<div class="space-y-3">
				<div class="flex gap-3">
					<div
						class="bg-primary/10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full"
					>
						<span class="text-sm font-medium">1</span>
					</div>
					<div>
						<p class="font-medium">Find a Job Posting</p>
						<p class="text-muted-foreground text-sm">
							Paste a job URL or description to get started
						</p>
					</div>
				</div>
				<div class="flex gap-3">
					<div
						class="bg-primary/10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full"
					>
						<span class="text-sm font-medium">2</span>
					</div>
					<div>
						<p class="font-medium">Generate Optimized Resume</p>
						<p class="text-muted-foreground text-sm">
							AI tailors your resume for the specific role
						</p>
					</div>
				</div>
				<div class="flex gap-3">
					<div
						class="bg-primary/10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full"
					>
						<span class="text-sm font-medium">3</span>
					</div>
					<div>
						<p class="font-medium">Apply with Confidence</p>
						<p class="text-muted-foreground text-sm">
							Download your ATS-optimized resume and apply
						</p>
					</div>
				</div>
			</div>
		</div>
		<div class="pt-4">
			<Button size="lg" onclick={finishOnboarding}>Go to Dashboard</Button>
		</div>
	</div>
{/snippet}

<div class="bg-background flex min-h-screen items-center justify-center p-6">
	<div class="w-full max-w-2xl">
		<!-- Progress bar -->
		<div class="mb-8">
			<Progress value={progressValue} class="h-2" />
		</div>

		<!-- Step indicator -->
		{@render stepIndicator()}

		<!-- Main card -->
		<Card class="w-full">
			<CardContent class="pt-6">
				{#if currentStep === 1}
					{@render welcomeStep()}
				{:else if currentStep === 2}
					{@render uploadStep()}
				{:else if currentStep === 3}
					{@render reviewStep()}
				{:else if currentStep === 4}
					{@render preferencesStep()}
				{:else if currentStep === 5}
					{@render successStep()}
				{/if}
			</CardContent>

			{#if currentStep < 5}
				<CardFooter class="flex justify-between">
					<Button variant="outline" onclick={previousStep} disabled={currentStep === 1 || isExtracting || isSaving}>
						<ChevronLeft class="mr-2 h-4 w-4" />
						Previous
					</Button>

					<div class="flex gap-2">
						{#if currentStep === 4}
							<Button variant="ghost" onclick={skipStep} disabled={isSaving}>
								{#if isSaving}
									<Loader2 class="mr-2 h-4 w-4 animate-spin" />
									Saving...
								{:else}
									Skip
								{/if}
							</Button>
						{/if}

						<Button onclick={nextStep} disabled={!canGoNext() || isExtracting || isSaving}>
							{#if currentStep === 2 && isExtracting}
								<Loader2 class="mr-2 h-4 w-4 animate-spin" />
								Extracting...
							{:else if currentStep === 4 && isSaving}
								<Loader2 class="mr-2 h-4 w-4 animate-spin" />
								Saving...
							{:else if currentStep === 4}
								Finish
								<CheckCircle class="ml-2 h-4 w-4" />
							{:else}
								Next
								<ChevronRight class="ml-2 h-4 w-4" />
							{/if}
						</Button>
					</div>
				</CardFooter>
			{/if}
		</Card>
	</div>
</div>
