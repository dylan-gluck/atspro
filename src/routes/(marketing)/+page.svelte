<script lang="ts">
	import { goto } from '$app/navigation';
	import { preventDefault } from 'svelte/legacy';
	import { Button } from '$lib/components/ui/button';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import {
		BrainCircuit,
		FileCheck,
		Target,
		Sparkles,
		Zap,
		Shield,
		TrendingUp,
		Users,
		Award,
		Clock,
		Upload,
		ScanSearch,
		FileText,
		Send,
		CheckCircle,
		ArrowRight,
		Star,
		ChevronRight,
		Briefcase,
		MessageSquare,
		BookOpen,
		Rocket,
		BarChart3,
		LayoutDashboard
	} from 'lucide-svelte';
	import { page } from '$app/state';

	// Check if user is logged in from parent layout
	const user = $derived(page.data.user);

	function scrollIntoView(event: Event) {
		const target = event.target as HTMLElement;
		const href = target.getAttribute('href');
		if (!href) return;
		const el = document.querySelector(href);
		if (!el) return;
		el.scrollIntoView({
			behavior: 'smooth'
		});
	}
</script>

<svelte:head>
	<title>ATS Resume Optimization | Beat 99% of ATS Systems | ATSPro</title>
	<meta
		name="description"
		content="Transform your resume from invisible to irresistible. Our AI-powered ATS optimization increases interview rates by 400%+. Beat the 85% rejection rate. Try free!"
	/>
</svelte:head>

<!-- Hero Section -->
<section
	class="relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950"
>
	<div class="container mx-auto px-4 py-24 md:py-32">
		<div class="grid items-center gap-12 lg:grid-cols-2">
			<div class="space-y-8">
				<div class="inline-flex items-center gap-2">
					<Badge variant="secondary" class="px-3 py-1">
						<Shield class="mr-2 h-3 w-3" />
						99% of Fortune 500 Use ATS
					</Badge>
				</div>

				<div class="space-y-4">
					<h1 class="text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
						Stop Letting ATS Systems
						<span class="text-primary"> Ignore Your Perfect Resume</span>
					</h1>
					<p class="text-muted-foreground max-w-2xl text-lg md:text-xl">
						85% of qualified candidates never get past ATS filters. Our platform increases your ATS
						pass rate from 15% to 85%, delivering a <strong>400% increase in interview rates</strong
						>.
					</p>
				</div>

				<div class="flex flex-col gap-4 sm:flex-row">
					{#if user}
						<Button size="lg" onclick={() => goto('/app')} class="group">
							<LayoutDashboard class="mr-2 h-5 w-5" />
							Go to Dashboard
							<ArrowRight class="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
						</Button>
					{:else}
						<Button size="lg" onclick={() => goto('/auth/sign-up')} class="group">
							<Rocket class="mr-2 h-5 w-5" />
							Start Free - No Credit Card Required
							<ArrowRight class="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
						</Button>
					{/if}
					<Button
						size="lg"
						variant="outline"
						onclick={() =>
							document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
					>
						<BookOpen class="mr-2 h-5 w-5" />
						Learn More
					</Button>
				</div>

				<div class="flex items-center gap-8 pt-4">
					<div class="flex items-center gap-2">
						<div class="flex -space-x-3">
							{#each Array(5) as _, i}
								<div
									class="from-primary/20 to-primary/40 border-background flex h-8 w-8 items-center justify-center rounded-full border-2 bg-gradient-to-br"
								>
									<Star class="text-primary h-3 w-3" />
								</div>
							{/each}
						</div>
						<span class="text-muted-foreground text-sm">
							<strong class="text-foreground">4.9/5</strong> from 1,000+ users
						</span>
					</div>
				</div>
			</div>

			<div class="relative lg:pl-8">
				<div class="relative">
					<!-- Decorative background -->
					<div
						class="from-primary/10 to-primary/5 absolute inset-0 rounded-3xl bg-gradient-to-br blur-3xl"
					></div>

					<!-- Mock resume preview -->
					<div
						class="relative space-y-4 rounded-2xl border bg-white p-8 shadow-2xl dark:bg-slate-900"
					>
						<div class="flex items-start justify-between">
							<div class="space-y-2">
								<div class="h-4 w-32 rounded bg-slate-200 dark:bg-slate-700"></div>
								<div class="h-3 w-48 rounded bg-slate-100 dark:bg-slate-800"></div>
							</div>
							<Badge variant="default" class="bg-green-500">
								<CheckCircle class="mr-1 h-3 w-3" />
								ATS Score: 95%
							</Badge>
						</div>

						<Separator />

						<div class="space-y-3">
							{#each [1, 2, 3] as _}
								<div class="space-y-2">
									<div class="h-3 w-24 rounded bg-slate-200 dark:bg-slate-700"></div>
									<div class="space-y-1">
										<div class="h-2 w-full rounded bg-slate-100 dark:bg-slate-800"></div>
										<div class="h-2 w-4/5 rounded bg-slate-100 dark:bg-slate-800"></div>
										<div class="h-2 w-3/4 rounded bg-slate-100 dark:bg-slate-800"></div>
									</div>
								</div>
							{/each}
						</div>

						<!-- Floating optimization indicators -->
						<div
							class="bg-primary text-primary-foreground absolute -right-4 -top-4 rounded-full p-3 shadow-lg"
						>
							<Zap class="h-5 w-5" />
						</div>
						<div
							class="absolute -bottom-4 -left-4 rounded-full bg-green-500 p-3 text-white shadow-lg"
						>
							<Target class="h-5 w-5" />
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- Features Section -->
<section id="features" class="bg-background py-24">
	<div class="container mx-auto px-4">
		<div class="mb-16 space-y-4 text-center">
			<Badge variant="outline" class="mb-4">
				<Sparkles class="mr-2 h-3 w-3" />
				Features
			</Badge>
			<h2 class="text-3xl font-bold md:text-4xl">
				Everything You Need to <span class="text-primary">Get Hired</span>
			</h2>
			<p class="text-muted-foreground mx-auto max-w-2xl text-lg">
				Our comprehensive suite of AI-powered tools helps you create winning applications at every
				step of your job search.
			</p>
		</div>

		<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
			<!-- Feature 1 -->
			<Card
				class="border-muted hover:border-primary/50 group transition-all duration-300 hover:shadow-lg"
			>
				<CardHeader>
					<div
						class="bg-primary/10 group-hover:bg-primary/20 mb-4 w-fit rounded-lg p-3 transition-colors"
					>
						<BrainCircuit class="text-primary h-6 w-6" />
					</div>
					<CardTitle>ATS Resume Optimization</CardTitle>
					<CardDescription>
						Automatically optimize your resume for any job posting using advanced AI to match resume
						keywords and beat ATS filters. Create ATS friendly resumes that get noticed.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<ul class="text-muted-foreground space-y-2 text-sm">
						<li class="flex items-start gap-2">
							<CheckCircle class="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
							<span>Smart resume keywords matching</span>
						</li>
						<li class="flex items-start gap-2">
							<CheckCircle class="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
							<span>Format optimization</span>
						</li>
						<li class="flex items-start gap-2">
							<CheckCircle class="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
							<span>Industry-specific tailoring</span>
						</li>
					</ul>
				</CardContent>
			</Card>

			<!-- Feature 2 -->
			<Card
				class="border-muted hover:border-primary/50 group transition-all duration-300 hover:shadow-lg"
			>
				<CardHeader>
					<div
						class="bg-primary/10 group-hover:bg-primary/20 mb-4 w-fit rounded-lg p-3 transition-colors"
					>
						<Shield class="text-primary h-6 w-6" />
					</div>
					<CardTitle>ATS Resume Scanner & Checker</CardTitle>
					<CardDescription>
						Ensure your resume passes through Applicant Tracking Systems with our comprehensive
						resume scanner. Get instant ATS compatibility scores.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<ul class="text-muted-foreground space-y-2 text-sm">
						<li class="flex items-start gap-2">
							<CheckCircle class="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
							<span>Real-time ATS scoring (400% improvement rate)</span>
						</li>
						<li class="flex items-start gap-2">
							<CheckCircle class="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
							<span>Format validation</span>
						</li>
						<li class="flex items-start gap-2">
							<CheckCircle class="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
							<span>Parsing accuracy check</span>
						</li>
					</ul>
				</CardContent>
			</Card>

			<!-- Feature 3 -->
			<Card
				class="border-muted hover:border-primary/50 group transition-all duration-300 hover:shadow-lg"
			>
				<CardHeader>
					<div
						class="bg-primary/10 group-hover:bg-primary/20 mb-4 w-fit rounded-lg p-3 transition-colors"
					>
						<Briefcase class="text-primary h-6 w-6" />
					</div>
					<CardTitle>Job Matching & Tracking</CardTitle>
					<CardDescription>
						Track your applications and get personalized job recommendations based on your profile
						and preferences.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<ul class="text-muted-foreground space-y-2 text-sm">
						<li class="flex items-start gap-2">
							<CheckCircle class="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
							<span>Application tracking</span>
						</li>
						<li class="flex items-start gap-2">
							<CheckCircle class="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
							<span>Smart job matching</span>
						</li>
						<li class="flex items-start gap-2">
							<CheckCircle class="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
							<span>Status monitoring</span>
						</li>
					</ul>
				</CardContent>
			</Card>

			<!-- Feature 4 -->
			<Card
				class="border-muted hover:border-primary/50 group transition-all duration-300 hover:shadow-lg"
			>
				<CardHeader>
					<div
						class="bg-primary/10 group-hover:bg-primary/20 mb-4 w-fit rounded-lg p-3 transition-colors"
					>
						<FileText class="text-primary h-6 w-6" />
					</div>
					<CardTitle>Cover Letter Generation</CardTitle>
					<CardDescription>
						Create compelling, personalized cover letters that perfectly complement your resume for
						each application.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<ul class="text-muted-foreground space-y-2 text-sm">
						<li class="flex items-start gap-2">
							<CheckCircle class="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
							<span>AI-powered writing</span>
						</li>
						<li class="flex items-start gap-2">
							<CheckCircle class="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
							<span>Company research integration</span>
						</li>
						<li class="flex items-start gap-2">
							<CheckCircle class="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
							<span>Tone customization</span>
						</li>
					</ul>
				</CardContent>
			</Card>

			<!-- Feature 5 -->
			<Card
				class="border-muted hover:border-primary/50 group transition-all duration-300 hover:shadow-lg"
			>
				<CardHeader>
					<div
						class="bg-primary/10 group-hover:bg-primary/20 mb-4 w-fit rounded-lg p-3 transition-colors"
					>
						<MessageSquare class="text-primary h-6 w-6" />
					</div>
					<CardTitle>Interview Preparation</CardTitle>
					<CardDescription>
						Get ready for interviews with AI-generated questions, answers, and personalized
						coaching. Boost your success rate after optimizing your ATS friendly resume.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<ul class="text-muted-foreground space-y-2 text-sm">
						<li class="flex items-start gap-2">
							<CheckCircle class="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
							<span>Custom question banks</span>
						</li>
						<li class="flex items-start gap-2">
							<CheckCircle class="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
							<span>STAR method coaching</span>
						</li>
						<li class="flex items-start gap-2">
							<CheckCircle class="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
							<span>Company insights</span>
						</li>
					</ul>
				</CardContent>
			</Card>

			<!-- Feature 6 -->
			<Card
				class="border-muted hover:border-primary/50 group transition-all duration-300 hover:shadow-lg"
			>
				<CardHeader>
					<div
						class="bg-primary/10 group-hover:bg-primary/20 mb-4 w-fit rounded-lg p-3 transition-colors"
					>
						<BarChart3 class="text-primary h-6 w-6" />
					</div>
					<CardTitle>Analytics & Insights</CardTitle>
					<CardDescription>
						Track your job search progress with detailed analytics and actionable insights to
						improve your success rate.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<ul class="text-muted-foreground space-y-2 text-sm">
						<li class="flex items-start gap-2">
							<CheckCircle class="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
							<span>Application metrics</span>
						</li>
						<li class="flex items-start gap-2">
							<CheckCircle class="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
							<span>Response rate tracking</span>
						</li>
						<li class="flex items-start gap-2">
							<CheckCircle class="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
							<span>Optimization suggestions</span>
						</li>
					</ul>
				</CardContent>
			</Card>
		</div>
	</div>
</section>

<!-- How It Works Section -->
<section id="how-it-works" class="bg-slate-50 py-24 dark:bg-slate-950">
	<div class="container mx-auto px-4">
		<div class="mb-16 space-y-4 text-center">
			<Badge variant="outline" class="mb-4">
				<Zap class="mr-2 h-3 w-3" />
				How It Works
			</Badge>
			<h2 class="text-3xl font-bold md:text-4xl">
				Get Started in <span class="text-primary">4 Simple Steps</span>
			</h2>
			<p class="text-muted-foreground mx-auto max-w-2xl text-lg">
				Our streamlined process makes it easy to create optimized resumes that get results.
			</p>
		</div>

		<div class="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
			<!-- Step 1 -->
			<div class="relative">
				<div class="flex flex-col items-center space-y-4 text-center">
					<div class="relative">
						<div
							class="bg-primary text-primary-foreground flex h-16 w-16 items-center justify-center rounded-full text-xl font-bold"
						>
							1
						</div>
						<Upload
							class="text-primary bg-background absolute -bottom-1 -right-1 h-6 w-6 rounded-full p-1"
						/>
					</div>
					<h3 class="text-lg font-semibold">Upload Your Resume</h3>
					<p class="text-muted-foreground text-sm">
						Upload your existing resume or create a new one using our intuitive builder.
					</p>
				</div>
				{#if true}
					<div class="absolute left-full top-8 hidden w-full lg:block">
						<ChevronRight class="text-muted-foreground/50 h-6 w-6" />
					</div>
				{/if}
			</div>

			<!-- Step 2 -->
			<div class="relative">
				<div class="flex flex-col items-center space-y-4 text-center">
					<div class="relative">
						<div
							class="bg-primary text-primary-foreground flex h-16 w-16 items-center justify-center rounded-full text-xl font-bold"
						>
							2
						</div>
						<Target
							class="text-primary bg-background absolute -bottom-1 -right-1 h-6 w-6 rounded-full p-1"
						/>
					</div>
					<h3 class="text-lg font-semibold">Add Job Details</h3>
					<p class="text-muted-foreground text-sm">
						Paste the job posting URL or description, and we'll analyze the requirements.
					</p>
				</div>
				{#if true}
					<div class="absolute left-full top-8 hidden w-full lg:block">
						<ChevronRight class="text-muted-foreground/50 h-6 w-6" />
					</div>
				{/if}
			</div>

			<!-- Step 3 -->
			<div class="relative">
				<div class="flex flex-col items-center space-y-4 text-center">
					<div class="relative">
						<div
							class="bg-primary text-primary-foreground flex h-16 w-16 items-center justify-center rounded-full text-xl font-bold"
						>
							3
						</div>
						<ScanSearch
							class="text-primary bg-background absolute -bottom-1 -right-1 h-6 w-6 rounded-full p-1"
						/>
					</div>
					<h3 class="text-lg font-semibold">AI Optimization</h3>
					<p class="text-muted-foreground text-sm">
						Our AI optimizes your resume to match job requirements and beat ATS filters.
					</p>
				</div>
				{#if true}
					<div class="absolute left-full top-8 hidden w-full lg:block">
						<ChevronRight class="text-muted-foreground/50 h-6 w-6" />
					</div>
				{/if}
			</div>

			<!-- Step 4 -->
			<div class="relative">
				<div class="flex flex-col items-center space-y-4 text-center">
					<div class="relative">
						<div
							class="bg-primary text-primary-foreground flex h-16 w-16 items-center justify-center rounded-full text-xl font-bold"
						>
							4
						</div>
						<Send
							class="text-primary bg-background absolute -bottom-1 -right-1 h-6 w-6 rounded-full p-1"
						/>
					</div>
					<h3 class="text-lg font-semibold">Download & Apply</h3>
					<p class="text-muted-foreground text-sm">
						Download your optimized resume and cover letter, ready to submit with confidence.
					</p>
				</div>
			</div>
		</div>

		<div class="mt-16 text-center">
			<Button size="lg" onclick={() => goto('/auth/signup')} class="group">
				<Rocket class="mr-2 h-5 w-5" />
				Start Free - No Credit Card Required
				<ArrowRight class="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
			</Button>
		</div>
	</div>
</section>

<!-- Pricing Section -->
<section id="pricing" class="bg-background py-24">
	<div class="container mx-auto px-4">
		<div class="mb-16 space-y-4 text-center">
			<Badge variant="outline" class="mb-4">
				<TrendingUp class="mr-2 h-3 w-3" />
				Pricing
			</Badge>
			<h2 class="text-3xl font-bold md:text-4xl">
				Choose Your <span class="text-primary">Success Plan</span>
			</h2>
			<p class="text-muted-foreground mx-auto max-w-2xl text-lg">
				Start with our free plan or upgrade for advanced features. No credit card required.
			</p>
			<Badge variant="default" class="mt-4 bg-green-500 px-4 py-2">
				<Sparkles class="mr-2 h-4 w-4" />
				🎉 Limited Time: 50% off first 3 months for Professional/Premium plans
			</Badge>
		</div>

		<div class="mx-auto grid max-w-6xl gap-8 md:grid-cols-3">
			<!-- Starter Plan -->
			<Card class="relative border-2">
				<CardHeader>
					<CardTitle>Starter</CardTitle>
					<CardDescription>Get Your Foot in the Door</CardDescription>
					<div class="pt-4">
						<span class="text-3xl font-bold">$0</span>
						<span class="text-muted-foreground">/month</span>
					</div>
				</CardHeader>
				<CardContent class="space-y-4">
					<ul class="space-y-3 text-sm">
						<li class="flex items-start gap-2">
							<CheckCircle class="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
							<span>3 ATS resume scans per month</span>
						</li>
						<li class="flex items-start gap-2">
							<CheckCircle class="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
							<span>Basic keyword matching analysis</span>
						</li>
						<li class="flex items-start gap-2">
							<CheckCircle class="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
							<span>Application tracking (10 active jobs)</span>
						</li>
						<li class="flex items-start gap-2">
							<CheckCircle class="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
							<span>Resume formatting checker</span>
						</li>
						<li class="flex items-start gap-2">
							<CheckCircle class="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
							<span>Basic ATS compatibility score</span>
						</li>
						<li class="flex items-start gap-2">
							<CheckCircle class="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
							<span>Email support (48-hour response)</span>
						</li>
					</ul>
					<Button variant="outline" class="w-full" onclick={() => goto('/auth/signup')}
						>Get Started Free</Button
					>
				</CardContent>
			</Card>

			<!-- Professional Plan -->
			<Card class="border-primary relative border-2 shadow-lg">
				<div class="absolute -top-4 left-1/2 -translate-x-1/2">
					<Badge class="px-3 py-1">
						<Star class="mr-1 h-3 w-3" />
						Most Popular
					</Badge>
				</div>
				<CardHeader>
					<CardTitle>Professional</CardTitle>
					<CardDescription>Land Your Dream Role</CardDescription>
					<div class="pt-4">
						<span class="text-3xl font-bold">$19</span>
						<span class="text-muted-foreground">/month</span>
						<div class="text-muted-foreground mt-1 text-sm">or $190/year (save $38)</div>
					</div>
				</CardHeader>
				<CardContent class="space-y-4">
					<ul class="space-y-3 text-sm">
						<li class="flex items-start gap-2">
							<CheckCircle class="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
							<span>Unlimited ATS optimization scans</span>
						</li>
						<li class="flex items-start gap-2">
							<CheckCircle class="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
							<span>Company research reports (50+ data points)</span>
						</li>
						<li class="flex items-start gap-2">
							<CheckCircle class="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
							<span>Interview question database (10,000+ questions)</span>
						</li>
						<li class="flex items-start gap-2">
							<CheckCircle class="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
							<span>Advanced keyword suggestions</span>
						</li>
						<li class="flex items-start gap-2">
							<CheckCircle class="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
							<span>Unlimited application tracking</span>
						</li>
						<li class="flex items-start gap-2">
							<CheckCircle class="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
							<span>Email & chat support (4-hour response)</span>
						</li>
						<li class="flex items-start gap-2">
							<CheckCircle class="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
							<span>Success analytics dashboard</span>
						</li>
						<li class="flex items-start gap-2">
							<CheckCircle class="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
							<span>LinkedIn profile optimization</span>
						</li>
						<li class="flex items-start gap-2">
							<CheckCircle class="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
							<span>20+ ATS-optimized templates</span>
						</li>
					</ul>
					<div class="space-y-2">
						<p class="text-muted-foreground text-xs italic">
							"Sarah increased her interview rate by 400% with Professional"
						</p>
						<Button class="relative w-full" onclick={() => goto('/auth/signup')}>
							<Badge class="absolute -right-2 -top-2 bg-green-500">50% OFF</Badge>
							Start Professional Trial
						</Button>
					</div>
				</CardContent>
			</Card>

			<!-- Premium Plan -->
			<Card class="relative border-2">
				<CardHeader>
					<CardTitle>Premium</CardTitle>
					<CardDescription>Dominate Your Industry</CardDescription>
					<div class="pt-4">
						<span class="text-3xl font-bold">$39</span>
						<span class="text-muted-foreground">/month</span>
						<div class="text-muted-foreground mt-1 text-sm">or $390/year (save $78)</div>
					</div>
				</CardHeader>
				<CardContent class="space-y-4">
					<ul class="space-y-3 text-sm">
						<li class="flex items-start gap-2">
							<CheckCircle class="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
							<span>Everything in Professional, plus:</span>
						</li>
						<li class="flex items-start gap-2">
							<CheckCircle class="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
							<span>AI-powered interview simulation</span>
						</li>
						<li class="flex items-start gap-2">
							<CheckCircle class="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
							<span>Personal branding consultation (quarterly)</span>
						</li>
						<li class="flex items-start gap-2">
							<CheckCircle class="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
							<span>Executive resume review</span>
						</li>
						<li class="flex items-start gap-2">
							<CheckCircle class="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
							<span>Salary negotiation toolkit</span>
						</li>
						<li class="flex items-start gap-2">
							<CheckCircle class="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
							<span>Priority support (1-hour response)</span>
						</li>
						<li class="flex items-start gap-2">
							<CheckCircle class="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
							<span>White-glove job matching</span>
						</li>
						<li class="flex items-start gap-2">
							<CheckCircle class="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
							<span>Industry networking insights</span>
						</li>
						<li class="flex items-start gap-2">
							<CheckCircle class="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
							<span>Custom cover letter generation</span>
						</li>
						<li class="flex items-start gap-2">
							<CheckCircle class="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
							<span>Advanced analytics & ROI tracking</span>
						</li>
					</ul>
					<Button class="relative w-full" onclick={() => goto('/auth/signup')}>
						<Badge class="absolute -right-2 -top-2 bg-green-500">50% OFF</Badge>
						Start Premium Trial
					</Button>
				</CardContent>
			</Card>
		</div>

		<div class="mt-8 text-center">
			<Badge variant="secondary" class="px-4 py-2">
				<Sparkles class="mr-2 h-4 w-4" />
				Limited Time: 50% off first 3 months for Professional/Premium plans
			</Badge>
		</div>
	</div>
</section>

<!-- CTA Section -->
<section class="from-primary/10 via-primary/5 to-background bg-gradient-to-br py-24">
	<div class="container mx-auto px-4">
		<div class="mx-auto max-w-3xl space-y-8 text-center">
			<h2 class="text-3xl font-bold md:text-4xl">
				Ready to <span class="text-primary">Transform Your Job Search?</span>
			</h2>
			<p class="text-muted-foreground text-lg">
				Join thousands of job seekers who have successfully landed their dream jobs using ATSPro.
				Start your free trial today and see the difference AI-powered optimization can make.
			</p>
			<div class="flex flex-col justify-center gap-4 sm:flex-row">
				<Button size="lg" onclick={() => goto('/auth/signup')} class="group">
					<Rocket class="mr-2 h-5 w-5" />
					Start Free - No Credit Card Required
					<ArrowRight class="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
				</Button>
				<Button
					size="lg"
					variant="outline"
					href="#features"
					onclick={preventDefault(scrollIntoView)}>View All Features</Button
				>
			</div>
			<p class="text-muted-foreground text-sm">
				No credit card required • Free forever plan available • Cancel anytime
			</p>
		</div>
	</div>
</section>
