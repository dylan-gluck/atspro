<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import { Switch } from '$lib/components/ui/switch';
	import * as Select from '$lib/components/ui/select';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Separator } from '$lib/components/ui/separator';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { toast } from 'svelte-sonner';
	import {
		getUserSettings,
		updateUserSettings,
		updateUserProfile
	} from '$lib/services/settings.remote';
	import { getSubscriptionInfo, updateSubscriptionDebug } from '$lib/services/subscription.remote';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { Loader2 } from 'lucide-svelte';

	// Fetch settings and user data
	let settingsQuery = getUserSettings();
	let settings = $derived(settingsQuery.current);
	let settingsLoading = $derived(settingsQuery.loading);

	// Fetch subscription data
	let subscriptionQuery = getSubscriptionInfo();
	let subscription = $derived(subscriptionQuery.current);

	// Get user data from page
	let user = $derived(page.data.user);

	// Form state
	let saving = $state(false);
	let profileName = $state('');
	let profileEmail = $state('');

	// Initialize profile data when user loads
	$effect(() => {
		if (user) {
			profileName = user.name || '';
			profileEmail = user.email || '';
		}
	});

	// Settings form state
	let emailNotifications = $state(true);
	let applicationUpdates = $state(true);
	let weeklyReports = $state(false);
	let jobRecommendations = $state(true);
	let resumeTips = $state(true);
	let defaultJobStatus = $state<{ value: string; label: string }>({
		value: 'saved',
		label: 'Saved'
	});

	// Initialize settings when they load
	$effect(() => {
		if (settings) {
			emailNotifications = settings.emailNotifications;
			applicationUpdates = settings.applicationUpdates;
			weeklyReports = settings.weeklyReports;
			jobRecommendations = settings.jobRecommendations;
			resumeTips = settings.resumeTips;
			defaultJobStatus = {
				value: settings.defaultJobStatus,
				label:
					settings.defaultJobStatus === 'saved'
						? 'Saved'
						: settings.defaultJobStatus === 'applied'
							? 'Applied'
							: 'Interviewing'
			};
		}
	});

	// Save profile changes
	async function saveProfile() {
		saving = true;
		try {
			await updateUserProfile({
				name: profileName,
				email: profileEmail
			});
			toast.success('Profile updated successfully');
		} catch (error) {
			toast.error('Failed to update profile');
			console.error(error);
		} finally {
			saving = false;
		}
	}

	// Save notification settings
	async function saveNotifications() {
		saving = true;
		try {
			await updateUserSettings({
				emailNotifications,
				applicationUpdates,
				weeklyReports,
				jobRecommendations,
				resumeTips,
				defaultJobStatus: defaultJobStatus.value as 'saved' | 'applied' | 'interviewing'
			});
			toast.success('Settings updated successfully');
		} catch (error) {
			toast.error('Failed to update settings');
			console.error(error);
		} finally {
			saving = false;
		}
	}

	// Status options for select
	const statusOptions = [
		{ value: 'saved', label: 'Saved' },
		{ value: 'applied', label: 'Applied' },
		{ value: 'interviewing', label: 'Interviewing' }
	];
</script>

<svelte:head>
	<title>Settings - ATSPro</title>
</svelte:head>

<div class="container mx-auto space-y-6 p-6">
	<div>
		<h1 class="text-3xl font-bold">Settings</h1>
		<p class="text-muted-foreground mt-1">Manage your account and preferences</p>
	</div>

	<Tabs.Root value="profile">
		<Tabs.List>
			<Tabs.Trigger value="profile">Profile</Tabs.Trigger>
			<Tabs.Trigger value="notifications">Notifications</Tabs.Trigger>
			<Tabs.Trigger value="preferences">Preferences</Tabs.Trigger>
			<Tabs.Trigger value="billing">Billing</Tabs.Trigger>
		</Tabs.List>

		<Tabs.Content value="profile" class="mt-6 space-y-4">
			<Card.Root>
				<Card.Header>
					<Card.Title>Profile Information</Card.Title>
					<Card.Description>Update your profile details</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-4">
					<div class="space-y-2">
						<Label for="name">Name</Label>
						<Input
							id="name"
							bind:value={profileName}
							placeholder="Enter your name"
							disabled={saving}
						/>
					</div>
					<div class="space-y-2">
						<Label for="email">Email</Label>
						<Input
							id="email"
							type="email"
							bind:value={profileEmail}
							placeholder="Enter your email"
							disabled={saving}
						/>
					</div>
				</Card.Content>
				<Card.Footer>
					<Button onclick={saveProfile} disabled={saving}>
						{#if saving}
							<Loader2 class="mr-2 h-4 w-4 animate-spin" />
							Saving...
						{:else}
							Save Changes
						{/if}
					</Button>
				</Card.Footer>
			</Card.Root>
		</Tabs.Content>

		<Tabs.Content value="notifications" class="mt-6 space-y-4">
			{#if settingsLoading}
				<Card.Root>
					<Card.Header>
						<Skeleton class="h-6 w-40" />
						<Skeleton class="h-4 w-60" />
					</Card.Header>
					<Card.Content class="space-y-4">
						{#each Array(5) as _}
							<div class="flex items-center justify-between">
								<div>
									<Skeleton class="h-5 w-32" />
									<Skeleton class="mt-1 h-3 w-48" />
								</div>
								<Skeleton class="h-6 w-11 rounded-full" />
							</div>
							<Separator />
						{/each}
					</Card.Content>
				</Card.Root>
			{:else}
				<Card.Root>
					<Card.Header>
						<Card.Title>Notification Preferences</Card.Title>
						<Card.Description>Configure how you receive notifications</Card.Description>
					</Card.Header>
					<Card.Content class="space-y-4">
						<div class="flex items-center justify-between">
							<div>
								<p class="font-medium">Email Notifications</p>
								<p class="text-muted-foreground text-sm">Receive updates via email</p>
							</div>
							<Switch bind:checked={emailNotifications} disabled={saving} />
						</div>
						<Separator />
						<div class="flex items-center justify-between">
							<div>
								<p class="font-medium">Application Updates</p>
								<p class="text-muted-foreground text-sm">
									Get notified about job application status changes
								</p>
							</div>
							<Switch bind:checked={applicationUpdates} disabled={saving} />
						</div>
						<Separator />
						<div class="flex items-center justify-between">
							<div>
								<p class="font-medium">Weekly Reports</p>
								<p class="text-muted-foreground text-sm">
									Receive weekly summaries of your job search activity
								</p>
							</div>
							<Switch bind:checked={weeklyReports} disabled={saving} />
						</div>
						<Separator />
						<div class="flex items-center justify-between">
							<div>
								<p class="font-medium">Job Recommendations</p>
								<p class="text-muted-foreground text-sm">
									Get personalized job recommendations based on your profile
								</p>
							</div>
							<Switch bind:checked={jobRecommendations} disabled={saving} />
						</div>
						<Separator />
						<div class="flex items-center justify-between">
							<div>
								<p class="font-medium">Resume Tips</p>
								<p class="text-muted-foreground text-sm">
									Receive tips to improve your resume's ATS score
								</p>
							</div>
							<Switch bind:checked={resumeTips} disabled={saving} />
						</div>
					</Card.Content>
					<Card.Footer>
						<Button onclick={saveNotifications} disabled={saving}>
							{#if saving}
								<Loader2 class="mr-2 h-4 w-4 animate-spin" />
								Saving...
							{:else}
								Save Preferences
							{/if}
						</Button>
					</Card.Footer>
				</Card.Root>
			{/if}
		</Tabs.Content>

		<Tabs.Content value="preferences" class="mt-6 space-y-4">
			{#if settingsLoading}
				<Card.Root>
					<Card.Header>
						<Skeleton class="h-6 w-40" />
						<Skeleton class="h-4 w-60" />
					</Card.Header>
					<Card.Content class="space-y-4">
						<div>
							<Skeleton class="h-4 w-32" />
							<Skeleton class="mt-2 h-10 w-full" />
						</div>
					</Card.Content>
				</Card.Root>
			{:else}
				<Card.Root>
					<Card.Header>
						<Card.Title>Application Preferences</Card.Title>
						<Card.Description>Configure default settings for your job applications</Card.Description
						>
					</Card.Header>
					<Card.Content class="space-y-4">
						<div class="space-y-2">
							<Label for="defaultStatus">Default Job Status</Label>
							<Select.Root
								type="single"
								value={defaultJobStatus.value}
								onValueChange={(v: string | undefined) => {
									if (v) {
										const option = statusOptions.find((o) => o.value === v);
										if (option) defaultJobStatus = option;
									}
								}}
								disabled={saving}
							>
								<Select.Trigger class="w-full">
									<span>{defaultJobStatus.label}</span>
								</Select.Trigger>
								<Select.Content>
									{#each statusOptions as option}
										<Select.Item value={option.value}>
											{option.label}
										</Select.Item>
									{/each}
								</Select.Content>
							</Select.Root>
							<p class="text-muted-foreground text-sm">
								New jobs will be created with this status by default
							</p>
						</div>
					</Card.Content>
					<Card.Footer>
						<Button onclick={saveNotifications} disabled={saving}>
							{#if saving}
								<Loader2 class="mr-2 h-4 w-4 animate-spin" />
								Saving...
							{:else}
								Save Preferences
							{/if}
						</Button>
					</Card.Footer>
				</Card.Root>
			{/if}
		</Tabs.Content>

		<Tabs.Content value="billing" class="mt-6 space-y-4">
			<Card.Root>
				<Card.Header>
					<Card.Title>Subscription & Usage</Card.Title>
					<Card.Description>Manage your subscription and track usage</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-6">
					{#if subscription}
						<!-- Current Plan -->
						<div class="bg-muted/50 rounded-lg p-4">
							<h3 class="mb-2 font-semibold">
								Current Plan: {subscription.tier === 'applicant'
									? 'Applicant'
									: subscription.tier === 'candidate'
										? 'Candidate'
										: 'Executive'}
							</h3>

							{#if subscription.tier === 'applicant'}
								<p class="text-muted-foreground">Free Plan</p>
								<ul class="text-muted-foreground mt-3 space-y-2 text-sm">
									<li>✅ Resume Editor</li>
									<li>
										✅ Application Tracking ({10 - subscription.usage.activeJobs.used}/10 active
										jobs)
									</li>
									<li>✅ Basic ATS compatibility score</li>
									<li>✅ Basic Company Info</li>
								</ul>
							{:else if subscription.tier === 'candidate'}
								<p class="text-muted-foreground">$20/month</p>
								<ul class="text-muted-foreground mt-3 space-y-2 text-sm">
									<li>✅ Everything in Applicant +</li>
									<li>
										✅ Resume Optimization ({subscription.usage.optimizations.limit -
											subscription.usage.optimizations.used}/{subscription.usage.optimizations
											.limit} remaining)
									</li>
									<li>
										✅ ATS Reports ({subscription.usage.atsReports.limit -
											subscription.usage.atsReports.used}/{subscription.usage.atsReports.limit} remaining)
									</li>
									<li>✅ Unlimited Applications</li>
									<li>✅ Interview Question DB</li>
								</ul>
							{:else if subscription.tier === 'executive'}
								<p class="text-muted-foreground">$50/month</p>
								<ul class="text-muted-foreground mt-3 space-y-2 text-sm">
									<li>✅ Everything in Candidate +</li>
									<li>✅ Unlimited Optimizations & Reports</li>
									<li>✅ Cover Letters</li>
									<li>✅ In-depth Company Research</li>
									<li>✅ Salary Negotiation Toolkit</li>
									<li>✅ Interview Prep</li>
									<li>✅ Career Coach</li>
								</ul>
							{/if}

							{#if subscription.resetAt}
								<p class="text-muted-foreground mt-4 text-xs">
									Usage resets: {new Date(subscription.resetAt).toLocaleDateString()}
								</p>
							{/if}
						</div>

						<!-- Debug Controls (Development Only) -->
						{#if import.meta.env.DEV}
							<div class="rounded-lg border-2 border-dashed border-yellow-500 p-4">
								<h4 class="mb-3 font-semibold text-yellow-600">Debug Controls</h4>
								<div class="space-y-3">
									<Select.Root
										type="single"
										value={subscription.tier}
										onValueChange={async (tier: string | undefined) => {
											if (tier) {
												await updateSubscriptionDebug({
													tier: tier as 'applicant' | 'candidate' | 'executive'
												});
												toast.success('Tier updated to ' + tier);
											}
										}}
									>
										<Select.Trigger>
											<span>Set Tier: {subscription.tier}</span>
										</Select.Trigger>
										<Select.Content>
											<Select.Item value="applicant">Applicant (Free)</Select.Item>
											<Select.Item value="candidate">Candidate ($20)</Select.Item>
											<Select.Item value="executive">Executive ($50)</Select.Item>
										</Select.Content>
									</Select.Root>

									<div class="flex gap-2">
										<Button
											variant="outline"
											size="sm"
											onclick={async () => {
												await updateSubscriptionDebug({ resetUsage: true });
												toast.success('Usage reset successfully');
											}}
										>
											Reset Usage
										</Button>
										<Button
											variant="outline"
											size="sm"
											onclick={async () => {
												await updateSubscriptionDebug({ maxOutUsage: true });
												toast.success('Usage maxed out');
											}}
										>
											Max Out Usage
										</Button>
									</div>
								</div>
							</div>
						{/if}

						<!-- Upgrade Button -->
						{#if subscription.tier !== 'executive'}
							<div class="pt-4">
								<Button onclick={() => goto('/pricing')}>Upgrade Plan</Button>
							</div>
						{/if}
					{:else}
						<!-- Loading state -->
						<Skeleton class="h-48 w-full" />
					{/if}
				</Card.Content>
			</Card.Root>
		</Tabs.Content>
	</Tabs.Root>
</div>
