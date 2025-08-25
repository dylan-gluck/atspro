<script lang="ts">
	import '$lib/app.css';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { ModeWatcher } from 'mode-watcher';
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

	let { children } = $props();

	// Navigation items with their routes
	const navItems = [
		{ title: 'Dashboard', href: '/app', icon: House },
		{ title: 'Resume', href: '/app/resume', icon: FileText },
		{ title: 'Jobs', href: '/app/jobs', icon: Briefcase },
		{ title: 'Settings', href: '/app/settings', icon: Settings }
	];

	// Placeholder user data
	const user = {
		name: 'John Doe',
		email: 'john.doe@example.com',
		avatar: 'JD'
	};
</script>

<ModeWatcher />
<Sidebar.Provider>
	<div class="flex h-screen w-full">
		<!-- Sidebar -->
		<Sidebar.Sidebar collapsible="icon">
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
									>
										<item.icon class="size-4" />
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
										<ChevronUp class="ml-auto" />
									</Sidebar.MenuButton>
								{/snippet}
							</DropdownMenu.Trigger>
							<DropdownMenu.Content class="w-56 rounded-lg" align="end" side="top" sideOffset={4}>
								<DropdownMenu.Label>My Account</DropdownMenu.Label>
								<DropdownMenu.Separator />
								<DropdownMenu.Item>
									<User class="mr-2 size-4" />
									<span>Profile</span>
								</DropdownMenu.Item>
								<DropdownMenu.Item>
									<Settings class="mr-2 size-4" />
									<span>Settings</span>
								</DropdownMenu.Item>
								<DropdownMenu.Separator />
								<DropdownMenu.Item>
									<LogOut class="mr-2 size-4" />
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
					<Sidebar.Trigger class="md:hidden">
						<Menu class="size-5" />
						<span class="sr-only">Toggle Sidebar</span>
					</Sidebar.Trigger>
					<h1 class="text-lg font-semibold">ATSPro</h1>
				</div>

				<div class="flex items-center gap-2">
					<!-- Light/Dark Mode Toggle -->
					<ModeToggle />

					<!-- Notifications -->
					<Button variant="ghost" size="icon" class="relative">
						<Bell class="size-5" />
						<span class="sr-only">Notifications</span>
						<span
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
									<Button variant="ghost" size="icon" {...props}>
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
									<User class="mr-2 size-4" />
									<span>Profile</span>
								</DropdownMenu.Item>
								<DropdownMenu.Item>
									<Settings class="mr-2 size-4" />
									<span>Settings</span>
								</DropdownMenu.Item>
								<DropdownMenu.Separator />
								<DropdownMenu.Item>
									<LogOut class="mr-2 size-4" />
									<span>Log out</span>
								</DropdownMenu.Item>
							</DropdownMenu.Content>
						</DropdownMenu.Root>
					</div>
				</div>
			</header>

			<!-- Page Content -->
			<main class="bg-muted/40 flex-1 overflow-y-auto">
				{@render children()}
			</main>
		</div>
	</div>
</Sidebar.Provider>
