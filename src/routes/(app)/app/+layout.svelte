<script lang="ts">
	import '$lib/app.css';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import * as Sidebar from '$lib/components/ui/sidebar';
	import { Button } from '$lib/components/ui/button';
	import * as Avatar from '$lib/components/ui/avatar';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import {
		House,
		FileText,
		Briefcase,
		Settings,
		Bell,
		ChevronUp,
		LogOut,
		User,
		Menu
	} from 'lucide-svelte';
	import ModeToggle from '@/components/mode-toggle.svelte';
	import { authClient } from '$lib/auth-client';
	import type { LayoutData } from './$types';
	import KeyboardShortcuts from '$lib/components/keyboard-shortcuts.svelte';
	import { Toaster } from '$lib/components/ui/sonner';

	let { children, data }: { children: any; data: LayoutData } = $props();

	// Navigation items with their routes
	const navItems = [
		{ title: 'Dashboard', href: '/app', icon: House },
		{ title: 'Resume', href: '/app/resume', icon: FileText },
		{ title: 'Jobs', href: '/app/jobs', icon: Briefcase },
		{ title: 'Settings', href: '/app/settings', icon: Settings }
	];

	// Get user data from server
	const user = $derived({
		name: data.user?.name || 'User',
		email: data.user?.email || '',
		avatar: data.user?.name?.slice(0, 2).toUpperCase() || 'U'
	});

	// Handle logout
	async function handleLogout() {
		await authClient.signOut();
		goto('/auth/sign-in');
	}
</script>

<KeyboardShortcuts />
<Toaster position="bottom-right" />

<Sidebar.Provider>
	<!-- Skip to main content link for keyboard navigation -->
	<a href="#app-main-content" class="skip-link" tabindex="0"> Skip to main content </a>

	<div class="flex h-screen w-full">
		<!-- Sidebar -->
		<Sidebar.Sidebar collapsible="icon" role="navigation" aria-label="Application navigation">
			<!-- Sidebar Header -->
			<Sidebar.Header>
				<Sidebar.Menu>
					<Sidebar.MenuItem>
						<Sidebar.MenuButton size="lg" class="md:h-8 md:p-0">
							<div
								class="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg"
							>
								<span class="text-sm font-semibold">AT</span>
							</div>
							<div class="grid flex-1 text-left text-sm leading-tight">
								<span class="truncate font-semibold">ATSPro</span>
								<span class="text-muted-foreground truncate text-xs">Resume Optimizer</span>
							</div>
						</Sidebar.MenuButton>
					</Sidebar.MenuItem>
				</Sidebar.Menu>
			</Sidebar.Header>

			<!-- Sidebar Content -->
			<Sidebar.Content>
				<Sidebar.Group>
					<Sidebar.GroupLabel>Main Menu</Sidebar.GroupLabel>
					<Sidebar.GroupContent>
						<Sidebar.Menu>
							{#each navItems as item}
								<Sidebar.MenuItem>
									<Sidebar.MenuButton
										onclick={() => goto(item.href)}
										class={page.url.pathname === item.href ? 'bg-accent' : ''}
										aria-current={page.url.pathname === item.href ? 'page' : undefined}
									>
										<item.icon class="size-4" aria-hidden="true" />
										<span>{item.title}</span>
									</Sidebar.MenuButton>
								</Sidebar.MenuItem>
							{/each}
						</Sidebar.Menu>
					</Sidebar.GroupContent>
				</Sidebar.Group>
			</Sidebar.Content>

			<!-- Sidebar Footer -->
			<Sidebar.Footer>
				<Sidebar.Menu>
					<Sidebar.MenuItem>
						<DropdownMenu.Root>
							<DropdownMenu.Trigger>
								{#snippet child({ props })}
									<Sidebar.MenuButton
										size="lg"
										class="data-[state=open]:bg-accent data-[state=open]:text-accent-foreground md:h-8 md:p-0"
										{...props}
									>
										<Avatar.Root class="size-8 rounded-lg">
											<Avatar.Fallback class="rounded-lg">{user.avatar}</Avatar.Fallback>
										</Avatar.Root>
										<div class="grid flex-1 text-left text-sm leading-tight">
											<span class="truncate font-semibold">{user.name}</span>
											<span class="text-muted-foreground truncate text-xs">{user.email}</span>
										</div>
										<ChevronUp class="ml-auto" aria-hidden="true" />
									</Sidebar.MenuButton>
								{/snippet}
							</DropdownMenu.Trigger>
							<DropdownMenu.Content class="w-56 rounded-lg" align="end" side="top" sideOffset={4}>
								<DropdownMenu.Label>My Account</DropdownMenu.Label>
								<DropdownMenu.Separator />
								<DropdownMenu.Item>
									<User class="mr-2 size-4" aria-hidden="true" />
									<span>Profile</span>
								</DropdownMenu.Item>
								<DropdownMenu.Item>
									<Settings class="mr-2 size-4" aria-hidden="true" />
									<span>Settings</span>
								</DropdownMenu.Item>
								<DropdownMenu.Separator />
								<DropdownMenu.Item onclick={handleLogout}>
									<LogOut class="mr-2 size-4" aria-hidden="true" />
									<span>Log out</span>
								</DropdownMenu.Item>
							</DropdownMenu.Content>
						</DropdownMenu.Root>
					</Sidebar.MenuItem>
				</Sidebar.Menu>
			</Sidebar.Footer>

			<Sidebar.Rail />
		</Sidebar.Sidebar>

		<!-- Main Content Area -->
		<div class="flex flex-1 flex-col overflow-hidden">
			<!-- Top Header -->
			<header class="bg-background flex h-14 items-center justify-between border-b px-4 lg:px-6">
				<div class="flex items-center gap-4">
					<Sidebar.Trigger class="md:hidden" aria-label="Toggle navigation menu">
						<Menu class="size-5" aria-hidden="true" />
						<span class="sr-only">Toggle navigation menu</span>
					</Sidebar.Trigger>
					<h1 class="text-lg font-semibold">ATSPro</h1>
				</div>

				<div class="flex items-center gap-2">
					<!-- Light/Dark Mode Toggle -->
					<ModeToggle />

					<!-- Notifications -->
					<Button
						variant="ghost"
						size="icon"
						class="relative"
						aria-label="View notifications (3 unread)"
					>
						<Bell class="size-5" aria-hidden="true" />
						<span class="sr-only">View notifications (3 unread)</span>
						<span
							aria-hidden="true"
							class="bg-destructive text-destructive-foreground absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full text-[10px] font-bold"
						>
							3
						</span>
					</Button>

					<!-- User Avatar (Mobile) -->
					<div class="md:hidden">
						<DropdownMenu.Root>
							<DropdownMenu.Trigger>
								{#snippet child({ props })}
									<Button variant="ghost" size="icon" aria-label="User menu" {...props}>
										<Avatar.Root class="size-8">
											<Avatar.Fallback>{user.avatar}</Avatar.Fallback>
										</Avatar.Root>
									</Button>
								{/snippet}
							</DropdownMenu.Trigger>
							<DropdownMenu.Content align="end" class="w-56">
								<DropdownMenu.Label>My Account</DropdownMenu.Label>
								<DropdownMenu.Separator />
								<DropdownMenu.Item>
									<User class="mr-2 size-4" aria-hidden="true" />
									<span>Profile</span>
								</DropdownMenu.Item>
								<DropdownMenu.Item>
									<Settings class="mr-2 size-4" aria-hidden="true" />
									<span>Settings</span>
								</DropdownMenu.Item>
								<DropdownMenu.Separator />
								<DropdownMenu.Item onclick={handleLogout}>
									<LogOut class="mr-2 size-4" aria-hidden="true" />
									<span>Log out</span>
								</DropdownMenu.Item>
							</DropdownMenu.Content>
						</DropdownMenu.Root>
					</div>
				</div>
			</header>

			<!-- Page Content -->
			<main id="app-main-content" class="bg-muted/40 flex-1 overflow-y-auto">
				{@render children()}
			</main>
		</div>
	</div>
</Sidebar.Provider>
