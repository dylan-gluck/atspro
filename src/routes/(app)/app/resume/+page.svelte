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
	import { Skeleton } from '$lib/components/ui/skeleton';
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
		Loader2
	} from 'lucide-svelte';
	import type { Resume, WorkExperience, Education, Certification, Link } from '$lib/types/resume';
	import { getResume, updateResume } from '$lib/services/resume.remote';

	// Fetch resume data using remote function
	let resumeQuery = getResume();
	let loading = $derived(resumeQuery.loading);
	let error = $derived(resumeQuery.error);
	let originalResume = $derived(resumeQuery.data);
	
	// Initialize with fetched data or empty structure
	let resume = $state<Resume>(originalResume || {
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
	
	// Update local state when data is fetched
	$effect(() => {
		if (originalResume) {
			resume = { ...originalResume };
		}
	});
	
	let saving = $state(false);
	let hasChanges = $derived(
		JSON.stringify(resume) !== JSON.stringify(originalResume)
	);

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
	function addWorkExperience() {
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
	}

	function removeWorkExperience(index: number) {
		resume.workExperience = resume.workExperience.filter((_, i) => i !== index);
	}

	function addEducation() {
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
	}

	function removeEducation(index: number) {
		resume.education = resume.education.filter((_, i) => i !== index);
	}

	function addCertification() {
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
	}

	function removeCertification(index: number) {
		resume.certifications = resume.certifications.filter((_, i) => i !== index);
	}

	function addLink() {
		resume.contactInfo.links = [...resume.contactInfo.links, { name: '', url: '' }];
	}

	function removeLink(index: number) {
		resume.contactInfo.links = resume.contactInfo.links.filter((_, i) => i !== index);
	}

	function addSkill() {
		if (newSkill && !resume.skills.includes(newSkill)) {
			resume.skills = [...resume.skills, newSkill];
			newSkill = '';
		}
	}

	function removeSkill(skill: string) {
		resume.skills = resume.skills.filter((s) => s !== skill);
	}

	function addResponsibility(expIndex: number, responsibility: string) {
		if (responsibility) {
			resume.workExperience[expIndex].responsibilities = [
				...resume.workExperience[expIndex].responsibilities,
				responsibility
			];
		}
	}

	function removeResponsibility(expIndex: number, respIndex: number) {
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
		if (!hasChanges) {
			toast.info('No changes to save');
			return;
		}
		
		saving = true;
		try {
			await updateResume(resume);
			toast.success('Resume saved successfully!');
			// Refresh data to update originalResume
			await resumeQuery.refresh();
		} catch (error) {
			toast.error('Failed to save resume');
			console.error(error);
		} finally {
			saving = false;
		}
	}

	function handleCancel() {
		if (hasChanges) {
			// Reset to original data
			resume = originalResume ? { ...originalResume } : {
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
			};
			toast.info('Changes discarded');
		}
	}
</script>

<svelte:head>
	<title>Resume Editor - ATSPro</title>
</svelte:head>

<div class="container mx-auto p-6">
	{#if loading}
		<div class="space-y-4">
			<Skeleton class="h-8 w-48" />
			<Skeleton class="h-6 w-64" />
			<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
				<Skeleton class="h-96" />
				<Skeleton class="h-96" />
			</div>
		</div>
	{:else if error}
		<Card>
			<CardContent class="pt-6">
				<div class="text-center">
					<p class="text-muted-foreground mb-4">Failed to load resume</p>
					<p class="text-destructive mb-4 text-sm">{error}</p>
					<Button onclick={() => resumeQuery.refresh()}>Retry</Button>
				</div>
			</CardContent>
		</Card>
	{:else}
	<!-- Header with action buttons -->
	<div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="text-3xl font-bold">Resume Editor</h1>
			<p class="text-muted-foreground">Edit your resume information below</p>
		</div>
		<div class="flex gap-2">
			<Button variant="outline" onclick={() => (showPreview = !showPreview)} class="sm:hidden">
				{#if showPreview}
					<EyeOff class="mr-2 h-4 w-4" />
					Hide Preview
				{:else}
					<Eye class="mr-2 h-4 w-4" />
					Show Preview
				{/if}
			</Button>
			<Button variant="outline" onclick={handleCancel} disabled={saving || !hasChanges}>
				<X class="mr-2 h-4 w-4" />
				Cancel
			</Button>
			<Button onclick={handleSave} disabled={saving || !hasChanges}>
				{#if saving}
					<Loader2 class="mr-2 h-4 w-4 animate-spin" />
					Saving...
				{:else}
					<Save class="mr-2 h-4 w-4" />
					Save Changes
				{/if}
			</Button>
		</div>
	</div>

	<div class="grid gap-6 lg:grid-cols-2">
		<!-- Editor Column -->
		<div class="space-y-4">
			<Accordion.Root bind:value={accordionValue} multiple>
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
							<CardContent class="space-y-4 pt-6">
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
										{#each resume.contactInfo.links as link, i}
											<div class="flex gap-2">
												<Input placeholder="Name" bind:value={link.name} />
												<Input placeholder="URL" bind:value={link.url} />
												<Button variant="ghost" size="icon" onclick={() => removeLink(i)}>
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
							<CardContent class="pt-6">
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
							<CardContent class="space-y-4 pt-6">
								<Button variant="outline" onclick={addWorkExperience} class="w-full">
									<Plus class="mr-2 h-4 w-4" />
									Add Work Experience
								</Button>
								{#each resume.workExperience as experience, expIndex}
									<Card>
										<CardHeader>
											<div class="flex items-start justify-between">
												<CardTitle class="text-lg">Experience {expIndex + 1}</CardTitle>
												<Button
													variant="ghost"
													size="icon"
													onclick={() => removeWorkExperience(expIndex)}
												>
													<Trash2 class="h-4 w-4" />
												</Button>
											</div>
										</CardHeader>
										<CardContent class="space-y-4">
											<div class="grid gap-4 sm:grid-cols-2">
												<div>
													<Label>Company</Label>
													<Input bind:value={experience.company} />
												</div>
												<div>
													<Label>Position</Label>
													<Input bind:value={experience.position} />
												</div>
											</div>
											<div class="grid gap-4 sm:grid-cols-2">
												<div>
													<Label>Start Date</Label>
													<Input type="month" bind:value={experience.startDate} />
												</div>
												<div>
													<Label>End Date</Label>
													<Input
														type="month"
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
												<Label>Description</Label>
												<Textarea bind:value={experience.description} rows={2} />
											</div>
											<div>
												<Label>Responsibilities</Label>
												<div class="mt-2 space-y-2">
													{#each experience.responsibilities as resp, respIndex}
														<div class="flex gap-2">
															<Input bind:value={experience.responsibilities[respIndex]} />
															<Button
																variant="ghost"
																size="icon"
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
							<CardContent class="space-y-4 pt-6">
								<Button variant="outline" onclick={addEducation} class="w-full">
									<Plus class="mr-2 h-4 w-4" />
									Add Education
								</Button>
								{#each resume.education as edu, eduIndex}
									<Card>
										<CardHeader>
											<div class="flex items-start justify-between">
												<CardTitle class="text-lg">Education {eduIndex + 1}</CardTitle>
												<Button
													variant="ghost"
													size="icon"
													onclick={() => removeEducation(eduIndex)}
												>
													<Trash2 class="h-4 w-4" />
												</Button>
											</div>
										</CardHeader>
										<CardContent class="space-y-4">
											<div>
												<Label>Institution</Label>
												<Input bind:value={edu.institution} />
											</div>
											<div class="grid gap-4 sm:grid-cols-2">
												<div>
													<Label>Degree</Label>
													<Input bind:value={edu.degree} />
												</div>
												<div>
													<Label>Field of Study</Label>
													<Input bind:value={edu.fieldOfStudy} />
												</div>
											</div>
											<div class="grid gap-4 sm:grid-cols-2">
												<div>
													<Label>Graduation Date</Label>
													<Input type="month" bind:value={edu.graduationDate} />
												</div>
												<div>
													<Label>GPA</Label>
													<Input type="number" step="0.1" bind:value={edu.gpa} />
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
							<CardContent class="space-y-4 pt-6">
								<Button variant="outline" onclick={addCertification} class="w-full">
									<Plus class="mr-2 h-4 w-4" />
									Add Certification
								</Button>
								{#each resume.certifications as cert, certIndex}
									<Card>
										<CardHeader>
											<div class="flex items-start justify-between">
												<CardTitle class="text-lg">Certification {certIndex + 1}</CardTitle>
												<Button
													variant="ghost"
													size="icon"
													onclick={() => removeCertification(certIndex)}
												>
													<Trash2 class="h-4 w-4" />
												</Button>
											</div>
										</CardHeader>
										<CardContent class="space-y-4">
											<div>
												<Label>Certification Name</Label>
												<Input bind:value={cert.name} />
											</div>
											<div>
												<Label>Issuer</Label>
												<Input bind:value={cert.issuer} />
											</div>
											<div class="grid gap-4 sm:grid-cols-2">
												<div>
													<Label>Date Obtained</Label>
													<Input type="month" bind:value={cert.dateObtained} />
												</div>
												<div>
													<Label>Expiration Date</Label>
													<Input type="month" bind:value={cert.expirationDate} />
												</div>
											</div>
											<div>
												<Label>Credential ID</Label>
												<Input bind:value={cert.credentialId} />
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
							<CardContent class="space-y-4 pt-6">
								<div class="flex gap-2">
									<Input
										placeholder="Add a skill..."
										bind:value={newSkill}
										onkeydown={(e) => {
											if (e.key === 'Enter') {
												e.preventDefault();
												addSkill();
											}
										}}
									/>
									<Button onclick={addSkill}>
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
														{new Date(exp.startDate).toLocaleDateString('en-US', {
															month: 'short',
															year: 'numeric'
														})}
													{/if}
													{#if exp.startDate && (exp.endDate || exp.isCurrent)}
														-
													{/if}
													{#if exp.isCurrent}
														Present
													{:else if exp.endDate}
														{new Date(exp.endDate).toLocaleDateString('en-US', {
															month: 'short',
															year: 'numeric'
														})}
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
														{new Date(edu.graduationDate).toLocaleDateString('en-US', {
															month: 'short',
															year: 'numeric'
														})}
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
														{new Date(cert.dateObtained).toLocaleDateString('en-US', {
															month: 'short',
															year: 'numeric'
														})}
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
	{/if}
</div>
