<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import {
		Card,
		CardContent,
		CardDescription,
		CardFooter,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Separator } from '$lib/components/ui/separator';
	import GithubIcon from '@lucide/svelte/icons/github';
	import MailIcon from '@lucide/svelte/icons/mail';
	import { authClient } from '$lib/auth-client';

	// Get the auth method from the URL parameter
	let method = $derived(page.params.method);

	// Form state
	let email = $state('');
	let password = $state('');
	let name = $state('');
	let rememberMe = $state(false);
	let loading = $state(false);
	let error = $state<string | null>(null);

	// Derive form configuration based on method
	let formConfig = $derived(() => {
		switch (method) {
			case 'sign-in':
				return {
					title: 'Welcome back',
					description: 'Sign in to your account to continue',
					submitText: 'Sign In',
					altText: "Don't have an account?",
					altLinkText: 'Sign up',
					altLinkHref: '/auth/sign-up',
					showName: false,
					showPassword: true,
					showRememberMe: true,
					showForgotPassword: true,
					showSocial: true
				};
			case 'sign-up':
				return {
					title: 'Create an account',
					description: 'Enter your details to get started',
					submitText: 'Sign Up',
					altText: 'Already have an account?',
					altLinkText: 'Sign in',
					altLinkHref: '/auth/sign-in',
					showName: true,
					showPassword: true,
					showRememberMe: false,
					showForgotPassword: false,
					showSocial: true
				};
			case 'forgot-password':
				return {
					title: 'Reset your password',
					description: "Enter your email and we'll send you a reset link",
					submitText: 'Send Reset Link',
					altText: 'Remember your password?',
					altLinkText: 'Sign in',
					altLinkHref: '/auth/sign-in',
					showName: false,
					showPassword: false,
					showRememberMe: false,
					showForgotPassword: false,
					showSocial: false
				};
			default:
				return {
					title: 'Page not found',
					description: 'The auth method you requested does not exist',
					submitText: '',
					altText: '',
					altLinkText: 'Go to sign in',
					altLinkHref: '/auth/sign-in',
					showName: false,
					showPassword: false,
					showRememberMe: false,
					showForgotPassword: false,
					showSocial: false
				};
		}
	});

	let config = $derived(formConfig());

	// Form submission handler
	async function handleSubmit(e: Event) {
		e.preventDefault();
		error = null;
		loading = true;

		try {
			if (method === 'sign-in') {
				await authClient.signIn.email({
					email,
					password,
					rememberMe
				});
				goto('/app');
			} else if (method === 'sign-up') {
				await authClient.signUp.email({
					email,
					password,
					name
				});
				// Sign in after successful signup
				await authClient.signIn.email({
					email,
					password
				});
				goto('/onboarding');
			} else if (method === 'forgot-password') {
				// TODO: Implement password reset
				error = 'Password reset is not yet implemented';
			}
		} catch (err: any) {
			console.error('Auth error:', err);
			error = err?.message || 'An error occurred during authentication';
		} finally {
			loading = false;
		}
	}

	// Social login handlers
	async function handleGoogleLogin() {
		loading = true;
		try {
			// TODO: Implement Google OAuth
			error = 'Google login is not yet configured';
		} catch (err: any) {
			error = err?.message || 'Failed to login with Google';
		} finally {
			loading = false;
		}
	}

	async function handleGithubLogin() {
		loading = true;
		try {
			// TODO: Implement GitHub OAuth  
			error = 'GitHub login is not yet configured';
		} catch (err: any) {
			error = err?.message || 'Failed to login with GitHub';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title
		>{method === 'sign-in' ? 'Sign In' : method === 'sign-up' ? 'Sign Up' : 'Forgot Password'} - ATSPro</title
	>
</svelte:head>

<div class="flex min-h-screen items-center justify-center px-4 py-12">
	<div class="w-full max-w-md space-y-6">
		<!-- Auth Card -->
		<Card>
			<CardHeader class="space-y-1">
				<CardTitle class="text-2xl">{config.title}</CardTitle>
				<CardDescription>{config.description}</CardDescription>
			</CardHeader>

			{#if method === 'sign-in' || method === 'sign-up' || method === 'forgot-password'}
				<form onsubmit={handleSubmit}>
					<CardContent class="space-y-4">
						<!-- Error message -->
						{#if error}
							<div
								class="border-destructive/20 bg-destructive/5 text-destructive rounded-md border px-3 py-2 text-sm"
							>
								{error}
							</div>
						{/if}

						<!-- Name field (sign-up only) -->
						{#if config.showName}
							<div class="space-y-2">
								<Label for="name">Full Name</Label>
								<Input id="name" type="text" placeholder="John Doe" bind:value={name} required />
							</div>
						{/if}

						<!-- Email field -->
						<div class="space-y-2">
							<Label for="email">Email</Label>
							<Input
								id="email"
								type="email"
								placeholder="name@example.com"
								bind:value={email}
								required
							/>
						</div>

						<!-- Password field -->
						{#if config.showPassword}
							<div class="space-y-2">
								<div class="flex items-center justify-between">
									<Label for="password">Password</Label>
									{#if config.showForgotPassword}
										<a
											href="/auth/forgot-password"
											class="text-muted-foreground hover:text-primary text-sm"
										>
											Forgot password?
										</a>
									{/if}
								</div>
								<Input
									id="password"
									type="password"
									placeholder="Enter your password"
									bind:value={password}
									required
								/>
							</div>
						{/if}

						<!-- Remember me checkbox -->
						{#if config.showRememberMe}
							<div class="flex items-center space-x-2">
								<Checkbox id="remember" bind:checked={rememberMe} />
								<Label for="remember" class="cursor-pointer text-sm font-normal">Remember me</Label>
							</div>
						{/if}

						<!-- Submit button -->
						<Button type="submit" class="w-full" disabled={loading}>
							{loading ? 'Please wait...' : config.submitText}
						</Button>

						<!-- Social login section -->
						{#if config.showSocial}
							<div class="relative">
								<div class="absolute inset-0 flex items-center">
									<Separator class="w-full" />
								</div>
								<div class="relative flex justify-center text-xs uppercase">
									<span class="bg-background text-muted-foreground px-2"> Or continue with </span>
								</div>
							</div>

							<div class="grid grid-cols-2 gap-4">
								<Button type="button" variant="outline" onclick={handleGoogleLogin}>
									<MailIcon class="mr-2 h-4 w-4" />
									Google
								</Button>
								<Button type="button" variant="outline" onclick={handleGithubLogin}>
									<GithubIcon class="mr-2 h-4 w-4" />
									GitHub
								</Button>
							</div>
						{/if}
					</CardContent>
				</form>
			{:else}
				<CardContent>
					<p class="text-muted-foreground text-center">Invalid authentication method</p>
				</CardContent>
			{/if}

			<CardFooter>
				<p class="text-muted-foreground w-full text-center text-sm">
					{config.altText}
					{' '}
					<a href={config.altLinkHref} class="text-primary font-medium hover:underline">
						{config.altLinkText}
					</a>
				</p>
			</CardFooter>
		</Card>

		<!-- Terms and Privacy -->
		<p class="text-muted-foreground text-center text-xs">
			By continuing, you agree to our{' '}
			<a href="/terms" class="hover:text-primary underline"> Terms of Service </a>{' '}
			and{' '}
			<a href="/privacy" class="hover:text-primary underline"> Privacy Policy </a>
		</p>
	</div>
</div>
