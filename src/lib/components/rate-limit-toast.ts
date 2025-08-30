import { toast } from 'svelte-sonner';
import { goto } from '$app/navigation';

export function showRateLimitError(error: any) {
	// Check if it's a rate limit error
	if (error?.status === 429 || error?.message?.toLowerCase().includes('limit')) {
		// Show toast with upgrade action
		toast.error(error.message || 'Rate limit exceeded', {
			action: {
				label: 'Upgrade',
				onClick: () => goto('/app/settings?tab=billing')
			},
			duration: 5000
		});
	} else if (error?.status === 403 && error?.message?.toLowerCase().includes('upgrade')) {
		// Show toast for feature restrictions
		toast.error(error.message, {
			action: {
				label: 'Upgrade Plan',
				onClick: () => goto('/app/settings?tab=billing')
			},
			duration: 5000
		});
	} else {
		// Show generic error
		toast.error(error?.message || 'An error occurred. Please try again.');
	}
}

// Helper to handle subscription-based errors
export function handleSubscriptionError(error: any) {
	const message = error?.message || error?.body?.message || 'An error occurred';

	// Check for subscription-related keywords
	const subscriptionKeywords = [
		'limit',
		'upgrade',
		'tier',
		'subscription',
		'executive',
		'candidate'
	];
	const isSubscriptionError = subscriptionKeywords.some((keyword) =>
		message.toLowerCase().includes(keyword)
	);

	if (isSubscriptionError) {
		toast.error(message, {
			action: {
				label: 'View Plans',
				onClick: () => goto('/app/settings?tab=billing')
			},
			duration: 6000
		});
	} else {
		toast.error(message);
	}
}
