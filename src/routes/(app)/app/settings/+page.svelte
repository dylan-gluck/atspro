<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import { Switch } from '$lib/components/ui/switch';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Separator } from '$lib/components/ui/separator';
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
						<Input id="name" placeholder="Enter your name" />
					</div>
					<div class="space-y-2">
						<Label for="email">Email</Label>
						<Input id="email" type="email" placeholder="Enter your email" />
					</div>
				</Card.Content>
				<Card.Footer>
					<Button>Save Changes</Button>
				</Card.Footer>
			</Card.Root>
		</Tabs.Content>

		<Tabs.Content value="notifications" class="mt-6 space-y-4">
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
						<Switch />
					</div>
					<Separator />
					<div class="flex items-center justify-between">
						<div>
							<p class="font-medium">Application Updates</p>
							<p class="text-muted-foreground text-sm">
								Get notified about job application status changes
							</p>
						</div>
						<Switch checked />
					</div>
				</Card.Content>
			</Card.Root>
		</Tabs.Content>

		<Tabs.Content value="billing" class="mt-6 space-y-4">
			<Card.Root>
				<Card.Header>
					<Card.Title>Billing Information</Card.Title>
					<Card.Description>Manage your subscription and billing details</Card.Description>
				</Card.Header>
				<Card.Content>
					<p class="text-muted-foreground">Billing features coming soon...</p>
				</Card.Content>
			</Card.Root>
		</Tabs.Content>
	</Tabs.Root>
</div>
