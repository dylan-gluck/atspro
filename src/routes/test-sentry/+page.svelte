<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Card, CardHeader, CardTitle, CardContent } from '$lib/components/ui/card';
	import * as Sentry from '@sentry/sveltekit';

	function triggerClientError() {
		try {
			// This will throw an error
			// @ts-ignore
			nonExistentFunction();
		} catch (e) {
			console.error('Client error caught:', e);
			Sentry.captureException(e);
			alert('Client error sent to Sentry!');
		}
	}

	function triggerUnhandledError() {
		// This will trigger an unhandled error
		throw new Error('Test unhandled client error for Sentry');
	}

	async function triggerServerError() {
		try {
			const response = await fetch('/test-sentry/api-error');
			if (!response.ok) {
				throw new Error(`Server error: ${response.status}`);
			}
		} catch (e) {
			console.error('Server error:', e);
			alert('Server error triggered - check Sentry dashboard!');
		}
	}

	function sendCustomEvent() {
		Sentry.captureMessage('Custom test message from ATSPro', 'info');
		alert('Custom message sent to Sentry!');
	}

	function sendEventWithContext() {
		Sentry.withScope((scope) => {
			scope.setTag('test', true);
			scope.setLevel('warning');
			scope.setContext('test_context', {
				timestamp: new Date().toISOString(),
				page: 'test-sentry',
				action: 'manual_test'
			});
			Sentry.captureMessage('Test message with custom context');
		});
		alert('Message with context sent to Sentry!');
	}
</script>

<div class="container mx-auto max-w-4xl py-8">
	<Card>
		<CardHeader>
			<CardTitle>Sentry Integration Test Page</CardTitle>
		</CardHeader>
		<CardContent class="space-y-4">
			<div class="grid gap-4">
				<div>
					<h3 class="mb-2 text-lg font-semibold">Client-Side Errors</h3>
					<div class="flex flex-wrap gap-2">
						<Button onclick={triggerClientError} variant="destructive">
							Trigger Handled Error
						</Button>
						<Button onclick={triggerUnhandledError} variant="destructive">
							Trigger Unhandled Error
						</Button>
					</div>
				</div>

				<div>
					<h3 class="mb-2 text-lg font-semibold">Server-Side Errors</h3>
					<div class="flex flex-wrap gap-2">
						<Button onclick={triggerServerError} variant="destructive">Trigger Server Error</Button>
					</div>
				</div>

				<div>
					<h3 class="mb-2 text-lg font-semibold">Custom Events</h3>
					<div class="flex flex-wrap gap-2">
						<Button onclick={sendCustomEvent} variant="secondary">Send Custom Message</Button>
						<Button onclick={sendEventWithContext} variant="secondary">
							Send Message with Context
						</Button>
					</div>
				</div>
			</div>

			<div class="bg-muted mt-6 rounded-lg p-4">
				<p class="text-muted-foreground text-sm">
					After triggering errors, check your Sentry dashboard at:
					<br />
					<a
						href="https://sentry.io/organizations/your-org/projects/"
						target="_blank"
						rel="noopener noreferrer"
						class="text-primary underline"
					>
						Sentry Dashboard →
					</a>
				</p>
			</div>
		</CardContent>
	</Card>
</div>
