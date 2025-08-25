<script lang="ts">
	import '$lib/app.css';
	import favicon from '$lib/assets/favicon.svg';
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
		Mail
	} from 'lucide-svelte';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="flex min-h-screen flex-col">
	<!-- Header Navigation -->
	<header
		class="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full border-b backdrop-blur"
	>
		<div class="container mx-auto px-4">
			<div class="flex h-16 items-center justify-between">
				<!-- Logo -->
				<div class="flex items-center gap-2">
					<a href="/" class="flex items-center gap-2 text-xl font-bold">
						<BrainCircuit class="text-primary h-8 w-8" />
						<span>ATSPro</span>
					</a>
				</div>

				<!-- Navigation Links -->
				<nav class="hidden items-center gap-6 md:flex">
					<a
						href="#features"
						class="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
					>
						Features
					</a>
					<a
						href="#how-it-works"
						class="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
					>
						How It Works
					</a>
					<a
						href="#pricing"
						class="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
					>
						Pricing
					</a>
					<a
						href="#about"
						class="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
					>
						About
					</a>
				</nav>

				<!-- Auth Buttons -->
				<div class="flex items-center gap-2">
					<Button variant="ghost" href="/auth/signin">Sign In</Button>
					<Button href="/auth/signup">
						<Sparkles class="mr-2 h-4 w-4" />
						Get Started
					</Button>
				</div>
			</div>
		</div>
	</header>

	<!-- Main Content -->
	<main class="flex-1">
		{@render children?.()}
	</main>

	<!-- Footer -->
	<footer class="bg-background w-full border-t">
		<div class="container mx-auto px-4 py-8">
			<div class="grid grid-cols-1 gap-8 md:grid-cols-4">
				<!-- Brand -->
				<div class="space-y-4">
					<div class="flex items-center gap-2">
						<BrainCircuit class="text-primary h-6 w-6" />
						<span class="text-lg font-bold">ATSPro</span>
					</div>
					<p class="text-muted-foreground text-sm">
						AI-powered resume optimization for modern job seekers.
					</p>
					<div class="flex gap-2">
						<Button variant="ghost" size="icon" aria-label="GitHub">
							<Github class="h-4 w-4" />
						</Button>
						<Button variant="ghost" size="icon" aria-label="Twitter">
							<Twitter class="h-4 w-4" />
						</Button>
						<Button variant="ghost" size="icon" aria-label="LinkedIn">
							<Linkedin class="h-4 w-4" />
						</Button>
					</div>
				</div>

				<!-- Product -->
				<div class="space-y-4">
					<h3 class="font-semibold">Product</h3>
					<ul class="text-muted-foreground space-y-2 text-sm">
						<li>
							<a href="#features" class="hover:text-foreground transition-colors">Features</a>
						</li>
						<li><a href="#pricing" class="hover:text-foreground transition-colors">Pricing</a></li>
						<li>
							<a href="#" class="hover:text-foreground transition-colors">API Documentation</a>
						</li>
						<li><a href="#" class="hover:text-foreground transition-colors">Integrations</a></li>
					</ul>
				</div>

				<!-- Company -->
				<div class="space-y-4">
					<h3 class="font-semibold">Company</h3>
					<ul class="text-muted-foreground space-y-2 text-sm">
						<li><a href="#about" class="hover:text-foreground transition-colors">About Us</a></li>
						<li><a href="#" class="hover:text-foreground transition-colors">Blog</a></li>
						<li><a href="#" class="hover:text-foreground transition-colors">Careers</a></li>
						<li><a href="#" class="hover:text-foreground transition-colors">Contact</a></li>
					</ul>
				</div>

				<!-- Legal -->
				<div class="space-y-4">
					<h3 class="font-semibold">Legal</h3>
					<ul class="text-muted-foreground space-y-2 text-sm">
						<li><a href="#" class="hover:text-foreground transition-colors">Privacy Policy</a></li>
						<li>
							<a href="#" class="hover:text-foreground transition-colors">Terms of Service</a>
						</li>
						<li><a href="#" class="hover:text-foreground transition-colors">Cookie Policy</a></li>
						<li><a href="#" class="hover:text-foreground transition-colors">GDPR</a></li>
					</ul>
				</div>
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
