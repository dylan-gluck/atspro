<script lang="ts">
	import '$lib/app.css';
	import { goto } from '$app/navigation';
	import { preventDefault } from 'svelte/legacy';
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';
	import {
		BrainCircuit,
		FileCheck,
		Target,
		Sparkles,
		Github,
		Twitter,
		Linkedin,
		Mail,
		LayoutDashboard,
		File,
		FilePlus2
	} from 'lucide-svelte';
	import type { LayoutData } from './$types';

	let { children, data }: { children: any; data: LayoutData } = $props();

	// Check if user is logged in
	const user = $derived(data.user);

	function scrollIntoView(event: Event) {
		const target = event.target as HTMLAnchorElement;
		const el = document.querySelector(target.getAttribute('href')!);
		if (!el) return;
		el.scrollIntoView({
			behavior: 'smooth'
		});
	}
</script>

<div class="flex min-h-screen flex-col">
	<!-- Skip to main content link for keyboard navigation -->
	<a
		href="#main-content"
		class="bg-primary text-primary-foreground sr-only z-50 rounded-md px-4 py-2 focus:not-sr-only focus:absolute focus:left-4 focus:top-4"
	>
		Skip to main content
	</a>

	<!-- Header Navigation -->
	<header
		class="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full border-b backdrop-blur"
	>
		<div class="container mx-auto px-4">
			<div class="flex h-16 items-center justify-between">
				<!-- Logo -->
				<div class="flex items-center gap-2">
					<a href="/" class="flex items-center gap-2 text-xl font-bold" aria-label="ATSPro">
						<FilePlus2 class="text-primary h-8 w-8" aria-hidden="true" />
						<span>ATSPro</span>
					</a>
				</div>

				<!-- Navigation Links -->
				<nav aria-label="Main navigation" class="hidden items-center gap-6 md:flex">
					<a
						href="#features"
						onclick={preventDefault(scrollIntoView)}
						class="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
					>
						Features
					</a>
					<a
						href="#how-it-works"
						onclick={preventDefault(scrollIntoView)}
						class="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
					>
						How It Works
					</a>
					<a
						href="#pricing"
						onclick={preventDefault(scrollIntoView)}
						class="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
					>
						Pricing
					</a>
					<a
						href="#about"
						onclick={preventDefault(scrollIntoView)}
						class="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
					>
						About
					</a>
				</nav>

				<!-- Auth Buttons -->
				<div class="flex items-center gap-2">
					{#if user}
						<Button onclick={() => goto('/app')}>
							<LayoutDashboard class="mr-2 h-4 w-4" aria-hidden="true" />
							Dashboard
						</Button>
					{:else}
						<Button variant="ghost" onclick={() => goto('/auth/sign-in')}>Sign In</Button>
						<Button onclick={() => goto('/auth/sign-up')}>
							<Sparkles class="mr-2 h-4 w-4" aria-hidden="true" />
							Get Started
						</Button>
					{/if}
				</div>
			</div>
		</div>
	</header>

	<!-- Main Content -->
	<main id="main-content" class="flex-1">
		{@render children?.()}
	</main>

	<!-- Footer -->
	<footer class="bg-background w-full border-t">
		<div class="container mx-auto px-4 py-8">
			<div class="grid grid-cols-1 gap-8 md:grid-cols-4">
				<!-- Brand -->
				<div class="space-y-4">
					<div class="flex items-center gap-2">
						<BrainCircuit class="text-primary h-6 w-6" aria-hidden="true" />
						<span class="text-lg font-bold">ATSPro</span>
					</div>
					<p class="text-muted-foreground text-sm">
						AI-powered resume optimization for modern job seekers.
					</p>
					<div class="flex gap-2">
						<Button variant="ghost" size="icon" aria-label="Visit our GitHub">
							<Github class="h-4 w-4" aria-hidden="true" />
						</Button>
						<Button variant="ghost" size="icon" aria-label="Follow us on Twitter">
							<Twitter class="h-4 w-4" aria-hidden="true" />
						</Button>
						<Button variant="ghost" size="icon" aria-label="Connect on LinkedIn">
							<Linkedin class="h-4 w-4" aria-hidden="true" />
						</Button>
					</div>
				</div>

				<!-- Product -->
				<nav class="space-y-4" aria-labelledby="footer-product">
					<h3 id="footer-product" class="font-semibold">Product</h3>
					<ul class="text-muted-foreground space-y-2 text-sm">
						<li>
							<a
								href="#features"
								onclick={preventDefault(scrollIntoView)}
								class="hover:text-foreground transition-colors">Features</a
							>
						</li>
						<li>
							<a
								href="#pricing"
								onclick={preventDefault(scrollIntoView)}
								class="hover:text-foreground transition-colors">Pricing</a
							>
						</li>
						<li>
							<a href="#" class="hover:text-foreground transition-colors">API Documentation</a>
						</li>
						<li><a href="#" class="hover:text-foreground transition-colors">Integrations</a></li>
					</ul>
				</nav>

				<!-- Company -->
				<nav class="space-y-4" aria-labelledby="footer-company">
					<h3 id="footer-company" class="font-semibold">Company</h3>
					<ul class="text-muted-foreground space-y-2 text-sm">
						<li>
							<a
								href="#about"
								onclick={preventDefault(scrollIntoView)}
								class="hover:text-foreground transition-colors">About Us</a
							>
						</li>
						<li><a href="#" class="hover:text-foreground transition-colors">Blog</a></li>
						<li><a href="#" class="hover:text-foreground transition-colors">Careers</a></li>
						<li><a href="#" class="hover:text-foreground transition-colors">Contact</a></li>
					</ul>
				</nav>

				<!-- Legal -->
				<nav class="space-y-4" aria-labelledby="footer-legal">
					<h3 id="footer-legal" class="font-semibold">Legal</h3>
					<ul class="text-muted-foreground space-y-2 text-sm">
						<li><a href="#" class="hover:text-foreground transition-colors">Privacy Policy</a></li>
						<li>
							<a href="#" class="hover:text-foreground transition-colors">Terms of Service</a>
						</li>
						<li><a href="#" class="hover:text-foreground transition-colors">Cookie Policy</a></li>
						<li><a href="#" class="hover:text-foreground transition-colors">GDPR</a></li>
					</ul>
				</nav>
			</div>

			<Separator class="my-8" />

			<div
				class="text-muted-foreground flex flex-col items-center justify-between gap-4 text-sm md:flex-row"
			>
				<p>© 2024 ATSPro. All rights reserved.</p>
				<div class="flex items-center gap-4">
					<a href="#" class="hover:text-foreground transition-colors">Privacy</a>
					<a href="#" class="hover:text-foreground transition-colors">Terms</a>
					<a href="#" class="hover:text-foreground transition-colors">Cookies</a>
				</div>
			</div>
		</div>
	</footer>
</div>
