<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import * as Accordion from '$lib/components/ui/accordion';
	import { toast } from 'svelte-sonner';
	import {
		Plus,
		Trash2,
		GripVertical,
		Save,
		X,
		Eye,
		EyeOff,
		ChevronUp,
		ChevronDown,
		Loader2,
		Upload
	} from 'lucide-svelte';
	import type { Resume, WorkExperience, Education, Certification, Link } from '$lib/types/resume';
	import type { UserResume } from '$lib/types/user-resume';
	import {
		updateResume,
		getResume,
		replaceResume,
		extractResume
	} from '$lib/services/resume.remote';
	import { goto } from '$app/navigation';
	import ResumeSkeleton from '$lib/components/resume/resume-skeleton.svelte';

	// Fetch resume data using remote function
	let resumePromise = $state(getResume());
	let originalResume = $state<UserResume | null>(null);
	let resume = $state<UserResume | null>(null);
	let loading = $state(true);
	let uploadFormRef = $state<HTMLFormElement | null>(null);
	let uploadInputRef = $state<HTMLInputElement | null>(null);
	let uploadLoading = $state(false);

	// Handle file upload
	async function handleFileUpload(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];

		if (!file) return;

		// Submit the form programmatically
		if (uploadFormRef) {
			uploadFormRef.requestSubmit();
		}
	}

	// Load resume data on mount
	$effect(() => {
		(async () => {
			try {
				const resumeData = await resumePromise;
				if (!resumeData) {
					// No resume found, show upload option
					loading = false;
					return;
				}
				originalResume = resumeData;
				resume = { ...resumeData };
				loading = false;
			} catch (error) {
				console.error('Failed to load resume:', error);
				loading = false;
			}
		})();
	});

	let saving = $state(false);
	let dynamicLoading = $state<{ [key: string]: boolean }>({});
	let hasChanges = $derived(
		resume && originalResume ? JSON.stringify(resume) !== JSON.stringify(originalResume) : false
	);
	let statusMessage = $state<string | null>(null);

	let showPreview = $state(true);
	let newSkill = $state('');
	let accordionValue = $state([
		'contact',
		'summary',
		'experience',
		'education',
		'certifications',
		'skills'
	]);

	// Helper functions for managing dynamic lists
	async function addWorkExperience() {
		if (!resume) return;
		dynamicLoading['addExperience'] = true;
		// Simulate slight delay for better UX
		await new Promise((resolve) => setTimeout(resolve, 100));
		resume.workExperience = [
			...resume.workExperience,
			{
				company: '',
				position: '',
				startDate: null,
				endDate: null,
				isCurrent: false,
				description: null,
				responsibilities: [],
				skills: []
			}
		];
		dynamicLoading['addExperience'] = false;
	}

	async function removeWorkExperience(index: number) {
		if (!resume) return;
		dynamicLoading[`removeExperience-${index}`] = true;
		await new Promise((resolve) => setTimeout(resolve, 100));
		resume.workExperience = resume.workExperience.filter((_, i) => i !== index);
		dynamicLoading[`removeExperience-${index}`] = false;
	}

	async function addEducation() {
		if (!resume) return;
		dynamicLoading['addEducation'] = true;
		await new Promise((resolve) => setTimeout(resolve, 100));
		resume.education = [
			...resume.education,
			{
				institution: '',
				degree: '',
				fieldOfStudy: null,
				graduationDate: null,
				gpa: null,
				honors: [],
				relevantCourses: [],
				skills: []
			}
		];
		dynamicLoading['addEducation'] = false;
	}

	async function removeEducation(index: number) {
		if (!resume) return;
		dynamicLoading[`removeEducation-${index}`] = true;
		await new Promise((resolve) => setTimeout(resolve, 100));
		resume.education = resume.education.filter((_, i) => i !== index);
		dynamicLoading[`removeEducation-${index}`] = false;
	}

	async function addCertification() {
		if (!resume) return;
		dynamicLoading['addCertification'] = true;
		await new Promise((resolve) => setTimeout(resolve, 100));
		resume.certifications = [
			...resume.certifications,
			{
				name: '',
				issuer: '',
				dateObtained: null,
				expirationDate: null,
				credentialId: null
			}
		];
		dynamicLoading['addCertification'] = false;
	}

	async function removeCertification(index: number) {
		if (!resume) return;
		dynamicLoading[`removeCertification-${index}`] = true;
		await new Promise((resolve) => setTimeout(resolve, 100));
		resume.certifications = resume.certifications.filter((_, i) => i !== index);
		dynamicLoading[`removeCertification-${index}`] = false;
	}

	function addLink() {
		if (!resume) return;
		resume.contactInfo.links = [...resume.contactInfo.links, { name: '', url: '' }];
	}

	function removeLink(index: number) {
		if (!resume) return;
		resume.contactInfo.links = resume.contactInfo.links.filter((_, i) => i !== index);
	}

	function addSkill() {
		if (!resume) return;
		if (newSkill && !resume.skills.includes(newSkill)) {
			resume.skills = [...resume.skills, newSkill];
			newSkill = '';
		}
	}

	function removeSkill(skill: string) {
		if (!resume) return;
		resume.skills = resume.skills.filter((s) => s !== skill);
	}

	function addResponsibility(expIndex: number, responsibility: string) {
		if (!resume) return;
		if (responsibility) {
			resume.workExperience[expIndex].responsibilities = [
				...resume.workExperience[expIndex].responsibilities,
				responsibility
			];
		}
	}

	function removeResponsibility(expIndex: number, respIndex: number) {
		if (!resume) return;
		resume.workExperience[expIndex].responsibilities = resume.workExperience[
			expIndex
		].responsibilities.filter((_, i) => i !== respIndex);
	}

	function moveSection(section: string, direction: 'up' | 'down') {
		const currentIndex = accordionValue.indexOf(section);
		if (currentIndex === -1) return;

		const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
		if (newIndex < 0 || newIndex >= accordionValue.length) return;

		const newOrder = [...accordionValue];
		[newOrder[currentIndex], newOrder[newIndex]] = [newOrder[newIndex], newOrder[currentIndex]];
		accordionValue = newOrder;
	}

	async function handleSave() {
		if (!hasChanges || !resume) {
			toast.info('No changes to save');
			return;
		}

		saving = true;
		try {
			// Extract only the resume fields (not id, userId, etc.)
			const resumeData = {
				contactInfo: resume.contactInfo,
				summary: resume.summary || '',
				workExperience: resume.workExperience,
				education: resume.education,
				certifications: resume.certifications,
				skills: resume.skills
			};
			await updateResume(resumeData);
			statusMessage = 'Resume saved successfully';
			toast.success('Resume saved successfully!');
			// Update originalResume to reflect saved state
			originalResume = { ...resume };
			// Clear status message after 3 seconds
			setTimeout(() => {
				statusMessage = null;
			}, 3000);
		} catch (error) {
			statusMessage = 'Failed to save resume. Please try again.';
			toast.error('Failed to save resume');
			console.error(error);
			// Clear error message after 5 seconds
			setTimeout(() => {
				statusMessage = null;
			}, 5000);
		} finally {
			saving = false;
		}
	}

	function handleCancel() {
		if (hasChanges && originalResume) {
			// Reset to original data
			resume = { ...originalResume };
			statusMessage = 'Changes discarded';
			toast.info('Changes discarded');
			// Clear status message after 3 seconds
			setTimeout(() => {
				statusMessage = null;
			}, 3000);
		}
	}
</script>

<svelte:head>
	<title>Resume Editor - ATSPro</title>
</svelte:head>

<!-- Screen reader announcements -->
<div class="sr-only" aria-live="polite" aria-atomic="true">
	{#if statusMessage}
		{statusMessage}
	{/if}
</div>

{#if loading}
	<div aria-busy="true" aria-label="Loading resume data">
		<ResumeSkeleton />
	</div>
{:else if !resume}
	<!-- No resume found - show upload option -->
	<div class="container mx-auto p-6">
		<Card class="mx-auto max-w-2xl">
			<CardHeader class="text-center">
				<CardTitle>No Resume Found</CardTitle>
				<CardDescription>Upload your resume to get started with ATS optimization</CardDescription>
			</CardHeader>
			<CardContent class="flex flex-col items-center gap-4">
				<div class="text-center">
					<p class="text-muted-foreground mb-4">
						Upload your existing resume and we'll help you optimize it for ATS systems
					</p>
				</div>
				<!-- Upload form for first resume -->
				<form
					enctype="multipart/form-data"
					{...extractResume.enhance(async ({ form, data, submit }) => {
						uploadLoading = true;
						try {
							await submit();
							if (extractResume.result) {
								toast.success('Resume uploaded successfully!');
								// Refresh the page to load the new resume
								resumePromise = getResume();
								const newResumeData = await resumePromise;
								if (newResumeData) {
									resume = structuredClone(newResumeData);
									originalResume = structuredClone(newResumeData);
								}
							}
						} catch (error) {
							toast.error('Failed to upload resume');
							console.error(error);
						} finally {
							uploadLoading = false;
						}
					})}
				>
					<input
						type="file"
						name="document"
						accept=".pdf,.docx,.doc,.txt"
						required
						class="hidden"
						id="resume-upload-input"
						onchange={(e) => {
							const input = e.target as HTMLInputElement;
							if (input.files?.[0]) {
								input.form?.requestSubmit();
							}
						}}
					/>
					<Button
						type="button"
						size="lg"
						onclick={() => document.getElementById('resume-upload-input')?.click()}
						disabled={uploadLoading}
					>
						{#if uploadLoading}
							<Loader2 class="mr-2 h-4 w-4 animate-spin" />
							Uploading...
						{:else}
							<Upload class="mr-2 h-4 w-4" />
							Upload Resume
						{/if}
					</Button>
				</form>
				<div class="text-muted-foreground text-sm">Supported formats: PDF, DOCX, DOC, TXT</div>
			</CardContent>
		</Card>
	</div>
{:else if resume}
	<div class="container mx-auto p-6">
		<!-- Header with action buttons -->
		<div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
			<div>
				<h1 class="text-3xl font-bold">Resume Editor</h1>
				<p class="text-muted-foreground">Edit your resume information below</p>
			</div>
			<div class="flex gap-2">
				<!-- Hidden form for resume upload -->
				<form
					bind:this={uploadFormRef}
					class="hidden"
					enctype="multipart/form-data"
					{...replaceResume.enhance(async ({ form, data, submit }) => {
						uploadLoading = true;

						try {
							// Let the form submit normally
							await submit();

							// Handle the result
							if (replaceResume.result) {
								toast.success('Resume uploaded and processed successfully!');

								// Refresh the resume data
								resumePromise = getResume();
								const newResumeData = await resumePromise;
								if (newResumeData) {
									resume = structuredClone(newResumeData);
									originalResume = structuredClone(newResumeData);
								}
							}
						} catch (error) {
							toast.error('Failed to upload resume. Please try again.');
							console.error('Upload error:', error);
						} finally {
							uploadLoading = false;
							// Reset the input
							if (uploadInputRef) {
								uploadInputRef.value = '';
							}
						}
					})}
				>
					<input
						bind:this={uploadInputRef}
						type="file"
						name="resume"
						accept=".pdf,.docx,.doc,.txt"
						onchange={handleFileUpload}
					/>
				</form>
				<Button
					variant="outline"
					onclick={() => uploadInputRef?.click()}
					disabled={uploadLoading || saving}
					class="gap-2"
				>
					{#if uploadLoading}
						<Loader2 class="h-4 w-4 animate-spin" />
						Uploading...
					{:else}
						<Upload class="h-4 w-4" />
						Upload New Resume
					{/if}
				</Button>
				<Button
					variant="outline"
					onclick={() => {
						showPreview = !showPreview;
					}}
					class="sm:hidden"
				>
					{#if showPreview}
						<EyeOff class="mr-2 h-4 w-4" />
						Hide Preview
					{:else}
						<Eye class="mr-2 h-4 w-4" />
						Show Preview
					{/if}
				</Button>
				<Button variant="outline" onclick={() => handleCancel()} disabled={saving || !hasChanges}>
					<X class="mr-2 h-4 w-4" />
					Cancel
				</Button>
				<Button onclick={() => handleSave()} disabled={saving || !hasChanges} aria-busy={saving}>
					{#if saving}
						<Loader2 class="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
						<span aria-live="assertive">Saving...</span>
					{:else}
						<Save class="mr-2 h-4 w-4" aria-hidden="true" />
						Save Changes
					{/if}
				</Button>
			</div>
		</div>

		<div class="grid gap-6 lg:grid-cols-2">
			<!-- Editor Column -->
			<div class="space-y-4">
				<Accordion.Root bind:value={accordionValue} type="multiple">
					<!-- Contact Information -->
					<Accordion.Item value="contact">
						<Accordion.Trigger class="flex items-center justify-between">
							<div class="flex items-center gap-2">
								<GripVertical class="text-muted-foreground h-4 w-4" />
								Contact Information
							</div>
							<div class="flex gap-1">
								<Button
									variant="ghost"
									size="icon"
									class="h-6 w-6"
									aria-label="Move Contact Information section up"
									onclick={(e: Event) => {
										e.stopPropagation();
										moveSection('contact', 'up');
									}}
								>
									<ChevronUp class="h-3 w-3" />
								</Button>
								<Button
									variant="ghost"
									size="icon"
									class="h-6 w-6"
									aria-label="Move Contact Information section down"
									onclick={(e: Event) => {
										e.stopPropagation();
										moveSection('contact', 'down');
									}}
								>
									<ChevronDown class="h-3 w-3" />
								</Button>
							</div>
						</Accordion.Trigger>
						<Accordion.Content>
							<Card>
								<CardContent class="space-y-4">
									<div>
										<Label for="fullName">Full Name</Label>
										<Input id="fullName" bind:value={resume.contactInfo.fullName} />
									</div>
									<div class="grid gap-4 sm:grid-cols-2">
										<div>
											<Label for="email">Email</Label>
											<Input id="email" type="email" bind:value={resume.contactInfo.email} />
										</div>
										<div>
											<Label for="phone">Phone</Label>
											<Input id="phone" type="tel" bind:value={resume.contactInfo.phone} />
										</div>
									</div>
									<div>
										<Label for="address">Address</Label>
										<Input id="address" bind:value={resume.contactInfo.address} />
									</div>
									<div>
										<div class="mb-2 flex items-center justify-between">
											<Label>Links</Label>
											<Button variant="outline" size="sm" onclick={addLink}>
												<Plus class="mr-1 h-3 w-3" />
												Add Link
											</Button>
										</div>
										<div class="space-y-2">
											{#each resume.contactInfo?.links || [] as link, i}
												<div class="flex gap-2">
													<Input
														placeholder="Name"
														aria-label={`Link ${i + 1} name`}
														bind:value={link.name}
													/>
													<Input
														placeholder="URL"
														aria-label={`Link ${i + 1} URL`}
														bind:value={link.url}
													/>
													<Button
														variant="ghost"
														size="icon"
														aria-label={`Remove link ${link.name || 'item'}`}
														onclick={() => removeLink(i)}
													>
														<Trash2 class="h-4 w-4" />
													</Button>
												</div>
											{/each}
										</div>
									</div>
								</CardContent>
							</Card>
						</Accordion.Content>
					</Accordion.Item>

					<!-- Professional Summary -->
					<Accordion.Item value="summary">
						<Accordion.Trigger class="flex items-center justify-between">
							<div class="flex items-center gap-2">
								<GripVertical class="text-muted-foreground h-4 w-4" />
								Professional Summary
							</div>
							<div class="flex gap-1">
								<Button
									variant="ghost"
									size="icon"
									class="h-6 w-6"
									aria-label="Move Professional Summary section up"
									onclick={(e: Event) => {
										e.stopPropagation();
										moveSection('summary', 'up');
									}}
								>
									<ChevronUp class="h-3 w-3" />
								</Button>
								<Button
									variant="ghost"
									size="icon"
									class="h-6 w-6"
									aria-label="Move Professional Summary section down"
									onclick={(e: Event) => {
										e.stopPropagation();
										moveSection('summary', 'down');
									}}
								>
									<ChevronDown class="h-3 w-3" />
								</Button>
							</div>
						</Accordion.Trigger>
						<Accordion.Content>
							<Card>
								<CardContent>
									<Textarea
										placeholder="Write a brief professional summary..."
										bind:value={resume.summary}
										rows={4}
									/>
								</CardContent>
							</Card>
						</Accordion.Content>
					</Accordion.Item>

					<!-- Work Experience -->
					<Accordion.Item value="experience">
						<Accordion.Trigger class="flex items-center justify-between">
							<div class="flex items-center gap-2">
								<GripVertical class="text-muted-foreground h-4 w-4" />
								Work Experience
							</div>
							<div class="flex gap-1">
								<Button
									variant="ghost"
									size="icon"
									class="h-6 w-6"
									aria-label="Move Work Experience section up"
									onclick={(e: Event) => {
										e.stopPropagation();
										moveSection('experience', 'up');
									}}
								>
									<ChevronUp class="h-3 w-3" />
								</Button>
								<Button
									variant="ghost"
									size="icon"
									class="h-6 w-6"
									aria-label="Move Work Experience section down"
									onclick={(e: Event) => {
										e.stopPropagation();
										moveSection('experience', 'down');
									}}
								>
									<ChevronDown class="h-3 w-3" />
								</Button>
							</div>
						</Accordion.Trigger>
						<Accordion.Content>
							<Card>
								<CardContent class="space-y-4">
									<Button
										variant="outline"
										onclick={addWorkExperience}
										class="w-full"
										disabled={dynamicLoading['addExperience']}
										aria-busy={dynamicLoading['addExperience']}
										aria-label="Add a new work experience entry"
									>
										{#if dynamicLoading['addExperience']}
											<Loader2 class="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
											<span aria-live="polite">Adding work experience...</span>
										{:else}
											<Plus class="mr-2 h-4 w-4" aria-hidden="true" />
											Add Work Experience
										{/if}
									</Button>
									{#each resume.workExperience as experience, expIndex}
										<Card>
											<CardHeader>
												<div class="flex items-start justify-between">
													<CardTitle class="text-lg">
														{#if experience.position && experience.company}
															{experience.position} - {experience.company}
														{:else if experience.position}
															{experience.position}
														{:else if experience.company}
															{experience.company}
														{:else}
															New Experience
														{/if}
													</CardTitle>
													<Button
														variant="ghost"
														size="icon"
														aria-label="Remove work experience"
														onclick={() => removeWorkExperience(expIndex)}
														disabled={dynamicLoading[`removeExperience-${expIndex}`]}
													>
														{#if dynamicLoading[`removeExperience-${expIndex}`]}
															<Loader2 class="h-4 w-4 animate-spin" />
														{:else}
															<Trash2 class="h-4 w-4" />
														{/if}
													</Button>
												</div>
											</CardHeader>
											<CardContent class="space-y-4">
												<div class="grid gap-4 sm:grid-cols-2">
													<div>
														<Label for={`company-${expIndex}`}>Company</Label>
														<Input id={`company-${expIndex}`} bind:value={experience.company} />
													</div>
													<div>
														<Label for={`position-${expIndex}`}>Position</Label>
														<Input id={`position-${expIndex}`} bind:value={experience.position} />
													</div>
												</div>
												<div class="grid gap-4 sm:grid-cols-2">
													<div>
														<Label for={`start-date-${expIndex}`}>Start Date</Label>
														<Input
															id={`start-date-${expIndex}`}
															type="text"
															placeholder="e.g., Jan 2020"
															bind:value={experience.startDate}
														/>
													</div>
													<div>
														<Label for={`end-date-${expIndex}`}>End Date</Label>
														<Input
															id={`end-date-${expIndex}`}
															type="text"
															placeholder="e.g., Dec 2023"
															bind:value={experience.endDate}
															disabled={experience.isCurrent}
														/>
													</div>
												</div>
												<div class="flex items-center gap-2">
													<input
														type="checkbox"
														id={`current-${expIndex}`}
														bind:checked={experience.isCurrent}
														class="h-4 w-4"
													/>
													<Label for={`current-${expIndex}`}>Currently working here</Label>
												</div>
												<div>
													<Label for={`description-${expIndex}`}>Description</Label>
													<Textarea
														id={`description-${expIndex}`}
														bind:value={experience.description}
														rows={2}
													/>
												</div>
												<div>
													<Label>Responsibilities</Label>
													<div class="mt-2 space-y-2">
														{#each experience.responsibilities as resp, respIndex}
															<div class="flex gap-2">
																<Input
																	aria-label={`Responsibility ${respIndex + 1}`}
																	bind:value={experience.responsibilities[respIndex]}
																/>
																<Button
																	variant="ghost"
																	size="icon"
																	aria-label={`Remove responsibility ${respIndex + 1}`}
																	onclick={() => removeResponsibility(expIndex, respIndex)}
																>
																	<Trash2 class="h-4 w-4" />
																</Button>
															</div>
														{/each}
														<Button
															variant="outline"
															size="sm"
															onclick={() => addResponsibility(expIndex, '')}
														>
															<Plus class="mr-1 h-3 w-3" />
															Add Responsibility
														</Button>
													</div>
												</div>
											</CardContent>
										</Card>
									{/each}
								</CardContent>
							</Card>
						</Accordion.Content>
					</Accordion.Item>

					<!-- Education -->
					<Accordion.Item value="education">
						<Accordion.Trigger class="flex items-center justify-between">
							<div class="flex items-center gap-2">
								<GripVertical class="text-muted-foreground h-4 w-4" />
								Education
							</div>
							<div class="flex gap-1">
								<Button
									variant="ghost"
									size="icon"
									class="h-6 w-6"
									aria-label="Move Education section up"
									onclick={(e: Event) => {
										e.stopPropagation();
										moveSection('education', 'up');
									}}
								>
									<ChevronUp class="h-3 w-3" />
								</Button>
								<Button
									variant="ghost"
									size="icon"
									class="h-6 w-6"
									aria-label="Move Education section down"
									onclick={(e: Event) => {
										e.stopPropagation();
										moveSection('education', 'down');
									}}
								>
									<ChevronDown class="h-3 w-3" />
								</Button>
							</div>
						</Accordion.Trigger>
						<Accordion.Content>
							<Card>
								<CardContent class="space-y-4">
									<Button
										variant="outline"
										onclick={addEducation}
										class="w-full"
										disabled={dynamicLoading['addEducation']}
									>
										{#if dynamicLoading['addEducation']}
											<Loader2 class="mr-2 h-4 w-4 animate-spin" />
											Adding...
										{:else}
											<Plus class="mr-2 h-4 w-4" />
											Add Education
										{/if}
									</Button>
									{#each resume.education as edu, eduIndex}
										<Card>
											<CardHeader>
												<div class="flex items-start justify-between">
													<CardTitle class="text-lg">
														{#if edu.degree && edu.institution}
															{edu.degree} - {edu.institution}
														{:else if edu.degree}
															{edu.degree}
														{:else if edu.institution}
															{edu.institution}
														{:else}
															New Education
														{/if}
													</CardTitle>
													<Button
														variant="ghost"
														size="icon"
														aria-label="Remove education"
														onclick={() => removeEducation(eduIndex)}
														disabled={dynamicLoading[`removeEducation-${eduIndex}`]}
													>
														{#if dynamicLoading[`removeEducation-${eduIndex}`]}
															<Loader2 class="h-4 w-4 animate-spin" />
														{:else}
															<Trash2 class="h-4 w-4" />
														{/if}
													</Button>
												</div>
											</CardHeader>
											<CardContent class="space-y-4">
												<div>
													<Label for={`institution-${eduIndex}`}>Institution</Label>
													<Input id={`institution-${eduIndex}`} bind:value={edu.institution} />
												</div>
												<div class="grid gap-4 sm:grid-cols-2">
													<div>
														<Label for={`degree-${eduIndex}`}>Degree</Label>
														<Input id={`degree-${eduIndex}`} bind:value={edu.degree} />
													</div>
													<div>
														<Label for={`field-${eduIndex}`}>Field of Study</Label>
														<Input id={`field-${eduIndex}`} bind:value={edu.fieldOfStudy} />
													</div>
												</div>
												<div class="grid gap-4 sm:grid-cols-2">
													<div>
														<Label for={`grad-date-${eduIndex}`}>Graduation Date</Label>
														<Input
															id={`grad-date-${eduIndex}`}
															type="text"
															placeholder="e.g., May 2024"
															bind:value={edu.graduationDate}
														/>
													</div>
													<div>
														<Label for={`gpa-${eduIndex}`}>GPA</Label>
														<Input
															id={`gpa-${eduIndex}`}
															type="number"
															step="0.1"
															bind:value={edu.gpa}
														/>
													</div>
												</div>
											</CardContent>
										</Card>
									{/each}
								</CardContent>
							</Card>
						</Accordion.Content>
					</Accordion.Item>

					<!-- Certifications -->
					<Accordion.Item value="certifications">
						<Accordion.Trigger class="flex items-center justify-between">
							<div class="flex items-center gap-2">
								<GripVertical class="text-muted-foreground h-4 w-4" />
								Certifications
							</div>
							<div class="flex gap-1">
								<Button
									variant="ghost"
									size="icon"
									class="h-6 w-6"
									aria-label="Move Certifications section up"
									onclick={(e: Event) => {
										e.stopPropagation();
										moveSection('certifications', 'up');
									}}
								>
									<ChevronUp class="h-3 w-3" />
								</Button>
								<Button
									variant="ghost"
									size="icon"
									class="h-6 w-6"
									aria-label="Move Certifications section down"
									onclick={(e: Event) => {
										e.stopPropagation();
										moveSection('certifications', 'down');
									}}
								>
									<ChevronDown class="h-3 w-3" />
								</Button>
							</div>
						</Accordion.Trigger>
						<Accordion.Content>
							<Card>
								<CardContent class="space-y-4">
									<Button
										variant="outline"
										onclick={addCertification}
										class="w-full"
										disabled={dynamicLoading['addCertification']}
									>
										{#if dynamicLoading['addCertification']}
											<Loader2 class="mr-2 h-4 w-4 animate-spin" />
											Adding...
										{:else}
											<Plus class="mr-2 h-4 w-4" />
											Add Certification
										{/if}
									</Button>
									{#each resume.certifications as cert, certIndex}
										<Card>
											<CardHeader>
												<div class="flex items-start justify-between">
													<CardTitle class="text-lg">
														{#if cert.name && cert.issuer}
															{cert.name} - {cert.issuer}
														{:else if cert.name}
															{cert.name}
														{:else if cert.issuer}
															{cert.issuer}
														{:else}
															New Certification
														{/if}
													</CardTitle>
													<Button
														variant="ghost"
														size="icon"
														aria-label="Remove certification"
														onclick={() => removeCertification(certIndex)}
														disabled={dynamicLoading[`removeCertification-${certIndex}`]}
													>
														{#if dynamicLoading[`removeCertification-${certIndex}`]}
															<Loader2 class="h-4 w-4 animate-spin" />
														{:else}
															<Trash2 class="h-4 w-4" />
														{/if}
													</Button>
												</div>
											</CardHeader>
											<CardContent class="space-y-4">
												<div>
													<Label for={`cert-name-${certIndex}`}>Certification Name</Label>
													<Input id={`cert-name-${certIndex}`} bind:value={cert.name} />
												</div>
												<div>
													<Label for={`cert-issuer-${certIndex}`}>Issuer</Label>
													<Input id={`cert-issuer-${certIndex}`} bind:value={cert.issuer} />
												</div>
												<div class="grid gap-4 sm:grid-cols-2">
													<div>
														<Label for={`cert-date-${certIndex}`}>Date Obtained</Label>
														<Input
															id={`cert-date-${certIndex}`}
															type="text"
															placeholder="e.g., Jan 2023"
															bind:value={cert.dateObtained}
														/>
													</div>
													<div>
														<Label for={`cert-exp-${certIndex}`}>Expiration Date</Label>
														<Input
															id={`cert-exp-${certIndex}`}
															type="text"
															placeholder="e.g., Jan 2026"
															bind:value={cert.expirationDate}
														/>
													</div>
												</div>
												<div>
													<Label for={`cert-cred-${certIndex}`}>Credential ID</Label>
													<Input id={`cert-cred-${certIndex}`} bind:value={cert.credentialId} />
												</div>
											</CardContent>
										</Card>
									{/each}
								</CardContent>
							</Card>
						</Accordion.Content>
					</Accordion.Item>

					<!-- Skills -->
					<Accordion.Item value="skills">
						<Accordion.Trigger class="flex items-center justify-between">
							<div class="flex items-center gap-2">
								<GripVertical class="text-muted-foreground h-4 w-4" />
								Skills
							</div>
							<div class="flex gap-1">
								<Button
									variant="ghost"
									size="icon"
									class="h-6 w-6"
									aria-label="Move Skills section up"
									onclick={(e: Event) => {
										e.stopPropagation();
										moveSection('skills', 'up');
									}}
								>
									<ChevronUp class="h-3 w-3" />
								</Button>
								<Button
									variant="ghost"
									size="icon"
									class="h-6 w-6"
									aria-label="Move Skills section down"
									onclick={(e: Event) => {
										e.stopPropagation();
										moveSection('skills', 'down');
									}}
								>
									<ChevronDown class="h-3 w-3" />
								</Button>
							</div>
						</Accordion.Trigger>
						<Accordion.Content>
							<Card>
								<CardContent class="space-y-4">
									<div class="flex gap-2">
										<Input
											id="new-skill"
											placeholder="Add a skill..."
											aria-label="New skill"
											bind:value={newSkill}
											onkeydown={(e) => {
												if (e.key === 'Enter') {
													e.preventDefault();
													addSkill();
												}
											}}
										/>
										<Button onclick={() => addSkill()}>
											<Plus class="mr-1 h-4 w-4" />
											Add
										</Button>
									</div>
									<div class="flex flex-wrap gap-2">
										{#each resume.skills as skill}
											<Badge variant="secondary" class="px-3 py-1">
												{skill}
												<button
													onclick={() => removeSkill(skill)}
													class="hover:text-destructive ml-2"
													aria-label={`Remove skill ${skill}`}
												>
													<X class="h-3 w-3" />
												</button>
											</Badge>
										{/each}
									</div>
								</CardContent>
							</Card>
						</Accordion.Content>
					</Accordion.Item>
				</Accordion.Root>
			</div>

			<!-- Preview Column (Desktop only by default) -->
			<div class="hidden lg:block">
				<div class="sticky top-4">
					<Card class="h-[calc(100vh-8rem)] overflow-auto">
						<CardHeader>
							<CardTitle>Resume Preview</CardTitle>
							<CardDescription>This is how your resume will appear</CardDescription>
						</CardHeader>
						<CardContent>
							<!-- Contact Info Preview -->
							<div class="mb-6 text-center">
								<h1 class="text-2xl font-bold">{resume.contactInfo.fullName}</h1>
								<div class="text-muted-foreground mt-2 flex flex-wrap justify-center gap-3 text-sm">
									{#if resume.contactInfo.email}
										<span>{resume.contactInfo.email}</span>
									{/if}
									{#if resume.contactInfo.phone}
										<span>"</span>
										<span>{resume.contactInfo.phone}</span>
									{/if}
									{#if resume.contactInfo.address}
										<span>"</span>
										<span>{resume.contactInfo.address}</span>
									{/if}
								</div>
								{#if resume.contactInfo.links.length > 0}
									<div class="mt-2 flex flex-wrap justify-center gap-3 text-sm">
										{#each resume.contactInfo.links as link}
											{#if link.name && link.url}
												<a href={link.url} class="text-primary hover:underline">
													{link.name}
												</a>
											{/if}
										{/each}
									</div>
								{/if}
							</div>

							<Separator class="mb-6" />

							<!-- Summary Preview -->
							{#if resume.summary}
								<div class="mb-6">
									<h2 class="mb-2 text-lg font-semibold">Professional Summary</h2>
									<p class="text-sm">{resume.summary}</p>
								</div>
								<Separator class="mb-6" />
							{/if}

							<!-- Work Experience Preview -->
							{#if resume.workExperience.length > 0}
								<div class="mb-6">
									<h2 class="mb-3 text-lg font-semibold">Work Experience</h2>
									{#each resume.workExperience as exp}
										{#if exp.company || exp.position}
											<div class="mb-4">
												<div class="flex justify-between">
													<div>
														<h3 class="font-semibold">{exp.position}</h3>
														<p class="text-muted-foreground text-sm">{exp.company}</p>
													</div>
													<div class="text-muted-foreground text-right text-sm">
														{#if exp.startDate}
															{exp.startDate}
														{/if}
														{#if exp.startDate && (exp.endDate || exp.isCurrent)}
															-
														{/if}
														{#if exp.isCurrent}
															Present
														{:else if exp.endDate}
															{exp.endDate}
														{/if}
													</div>
												</div>
												{#if exp.description}
													<p class="mt-1 text-sm">{exp.description}</p>
												{/if}
												{#if exp.responsibilities.length > 0}
													<ul class="mt-2 list-inside list-disc text-sm">
														{#each exp.responsibilities as resp}
															{#if resp}
																<li>{resp}</li>
															{/if}
														{/each}
													</ul>
												{/if}
											</div>
										{/if}
									{/each}
								</div>
								<Separator class="mb-6" />
							{/if}

							<!-- Education Preview -->
							{#if resume.education.length > 0}
								<div class="mb-6">
									<h2 class="mb-3 text-lg font-semibold">Education</h2>
									{#each resume.education as edu}
										{#if edu.institution || edu.degree}
											<div class="mb-3">
												<div class="flex justify-between">
													<div>
														<h3 class="font-semibold">{edu.degree}</h3>
														<p class="text-muted-foreground text-sm">
															{edu.institution}
															{#if edu.fieldOfStudy}
																" {edu.fieldOfStudy}
															{/if}
														</p>
													</div>
													<div class="text-muted-foreground text-right text-sm">
														{#if edu.graduationDate}
															{edu.graduationDate}
														{/if}
														{#if edu.gpa}
															<div>GPA: {edu.gpa}</div>
														{/if}
													</div>
												</div>
											</div>
										{/if}
									{/each}
								</div>
								<Separator class="mb-6" />
							{/if}

							<!-- Certifications Preview -->
							{#if resume.certifications.length > 0}
								<div class="mb-6">
									<h2 class="mb-3 text-lg font-semibold">Certifications</h2>
									{#each resume.certifications as cert}
										{#if cert.name}
											<div class="mb-2">
												<div class="flex justify-between">
													<div>
														<h3 class="text-sm font-semibold">{cert.name}</h3>
														<p class="text-muted-foreground text-sm">{cert.issuer}</p>
													</div>
													<div class="text-muted-foreground text-right text-sm">
														{#if cert.dateObtained}
															{cert.dateObtained}
														{/if}
													</div>
												</div>
											</div>
										{/if}
									{/each}
								</div>
								<Separator class="mb-6" />
							{/if}

							<!-- Skills Preview -->
							{#if resume.skills.length > 0}
								<div>
									<h2 class="mb-3 text-lg font-semibold">Skills</h2>
									<div class="flex flex-wrap gap-2">
										{#each resume.skills as skill}
											<Badge variant="outline">{skill}</Badge>
										{/each}
									</div>
								</div>
							{/if}
						</CardContent>
					</Card>
				</div>
			</div>

			<!-- Mobile Preview (shown when toggled) -->
			{#if showPreview}
				<div class="lg:hidden">
					<Card>
						<CardHeader>
							<CardTitle>Resume Preview</CardTitle>
							<CardDescription>This is how your resume will appear</CardDescription>
						</CardHeader>
						<CardContent>
							<!-- Same preview content as desktop -->
							<div class="mb-6 text-center">
								<h1 class="text-2xl font-bold">{resume.contactInfo.fullName}</h1>
								<div class="text-muted-foreground mt-2 flex flex-wrap justify-center gap-3 text-sm">
									{#if resume.contactInfo.email}
										<span>{resume.contactInfo.email}</span>
									{/if}
									{#if resume.contactInfo.phone}
										<span>"</span>
										<span>{resume.contactInfo.phone}</span>
									{/if}
									{#if resume.contactInfo.address}
										<span>"</span>
										<span>{resume.contactInfo.address}</span>
									{/if}
								</div>
							</div>

							{#if resume.summary}
								<Separator class="mb-6" />
								<div class="mb-6">
									<h2 class="mb-2 text-lg font-semibold">Professional Summary</h2>
									<p class="text-sm">{resume.summary}</p>
								</div>
							{/if}

							<!-- Additional preview sections follow same pattern... -->
						</CardContent>
					</Card>
				</div>
			{/if}
		</div>
	</div>
{/if}
