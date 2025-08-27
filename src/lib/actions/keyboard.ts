/**
 * Svelte actions for keyboard accessibility
 */

import { KEYS, setupArrowNavigation, setupTypeAhead, announce } from '$lib/utils/keyboard';

/**
 * Enhanced focus action - adds visible focus styles and keyboard navigation
 */
export function enhancedFocus(node: HTMLElement, options: { focusClass?: string } = {}) {
	const focusClass = options.focusClass || 'ring-2 ring-primary ring-offset-2';

	function handleFocus() {
		node.classList.add(...focusClass.split(' '));
		// Ensure element is scrolled into view
		node.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
	}

	function handleBlur() {
		node.classList.remove(...focusClass.split(' '));
	}

	// Ensure element is focusable
	if (!node.hasAttribute('tabindex') && !node.matches('button, a, input, textarea, select')) {
		node.setAttribute('tabindex', '0');
	}

	// Add ARIA role if not present
	if (!node.getAttribute('role') && node.hasAttribute('tabindex')) {
		node.setAttribute('role', 'button');
	}

	node.addEventListener('focus', handleFocus);
	node.addEventListener('blur', handleBlur);

	return {
		destroy() {
			node.removeEventListener('focus', handleFocus);
			node.removeEventListener('blur', handleBlur);
		}
	};
}

/**
 * Keyboard navigation action for lists and menus
 */
export function keyboardNav(
	node: HTMLElement,
	options: {
		orientation?: 'vertical' | 'horizontal' | 'both';
		loop?: boolean;
		itemSelector?: string;
		onSelect?: (item: HTMLElement, index: number) => void;
		typeAhead?: boolean;
	} = {}
) {
	const cleanupArrows = setupArrowNavigation(node, {
		orientation: options.orientation || 'vertical',
		loop: options.loop !== false,
		itemSelector: options.itemSelector,
		onSelect: options.onSelect
	});

	let cleanupTypeAhead: (() => void) | null = null;

	if (options.typeAhead !== false) {
		cleanupTypeAhead = setupTypeAhead(node, {
			itemSelector: options.itemSelector,
			onSelect: options.onSelect
		});
	}

	return {
		destroy() {
			cleanupArrows();
			cleanupTypeAhead?.();
		}
	};
}

/**
 * Skip to content link action
 */
export function skipLink(node: HTMLElement, targetId: string) {
	function handleClick(event: Event) {
		event.preventDefault();
		const target = document.getElementById(targetId);
		if (target) {
			target.focus();
			target.scrollIntoView();
			announce('Navigated to main content');
		}
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === KEYS.ENTER || event.key === KEYS.SPACE) {
			handleClick(event);
		}
	}

	node.addEventListener('click', handleClick);
	node.addEventListener('keydown', handleKeyDown);

	// Add appropriate ARIA attributes
	node.setAttribute('aria-label', 'Skip to main content');

	return {
		destroy() {
			node.removeEventListener('click', handleClick);
			node.removeEventListener('keydown', handleKeyDown);
		}
	};
}

/**
 * Escape key action - useful for closing modals, dropdowns, etc.
 */
export function escapeKey(node: HTMLElement, onEscape: () => void) {
	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === KEYS.ESCAPE) {
			event.preventDefault();
			event.stopPropagation();
			onEscape();
		}
	}

	// Use capture phase to intercept before other handlers
	node.addEventListener('keydown', handleKeyDown, true);

	return {
		destroy() {
			node.removeEventListener('keydown', handleKeyDown, true);
		}
	};
}

/**
 * Click outside action with keyboard support
 */
export function clickOutside(
	node: HTMLElement,
	{
		onClickOutside,
		excludeElements = []
	}: { onClickOutside: () => void; excludeElements?: HTMLElement[] }
) {
	function handleClick(event: MouseEvent) {
		const target = event.target as HTMLElement;

		// Check if click is inside the node
		if (node.contains(target)) return;

		// Check if click is on an excluded element
		if (excludeElements.some((el) => el.contains(target))) return;

		onClickOutside();
	}

	function handleEscape(event: KeyboardEvent) {
		if (event.key === KEYS.ESCAPE) {
			onClickOutside();
		}
	}

	// Small delay to avoid immediate triggering
	setTimeout(() => {
		document.addEventListener('click', handleClick, true);
		document.addEventListener('keydown', handleEscape);
	}, 0);

	return {
		update({ excludeElements: newExcludeElements = [] }: { excludeElements?: HTMLElement[] }) {
			excludeElements = newExcludeElements;
		},
		destroy() {
			document.removeEventListener('click', handleClick, true);
			document.removeEventListener('keydown', handleEscape);
		}
	};
}

/**
 * Trap focus within a container (useful for modals, sidebars, etc.)
 */
export function trapFocus(node: HTMLElement, enabled = true) {
	if (!enabled) return { destroy: () => {} };

	let firstFocusable: HTMLElement | null = null;
	let lastFocusable: HTMLElement | null = null;

	function updateFocusableElements() {
		const focusables = node.querySelectorAll<HTMLElement>(
			'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
		);

		const visibleFocusables: HTMLElement[] = Array.from(focusables).filter(
			(el): el is HTMLElement => el.offsetWidth > 0 && el.offsetHeight > 0
		);

		firstFocusable = visibleFocusables[0] || null;
		lastFocusable = visibleFocusables[visibleFocusables.length - 1] || null;
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key !== KEYS.TAB) return;

		updateFocusableElements();

		if (!firstFocusable || !lastFocusable) return;

		if (event.shiftKey) {
			if (document.activeElement === firstFocusable) {
				event.preventDefault();
				lastFocusable.focus();
			}
		} else {
			if (document.activeElement === lastFocusable) {
				event.preventDefault();
				firstFocusable.focus();
			}
		}
	}

	// Set initial focus
	updateFocusableElements();
	(firstFocusable as HTMLElement | null)?.focus();

	node.addEventListener('keydown', handleKeyDown);

	return {
		update(newEnabled: boolean) {
			enabled = newEnabled;
			if (enabled) {
				node.addEventListener('keydown', handleKeyDown);
				updateFocusableElements();
				(firstFocusable as HTMLElement | null)?.focus();
			} else {
				node.removeEventListener('keydown', handleKeyDown);
			}
		},
		destroy() {
			node.removeEventListener('keydown', handleKeyDown);
		}
	};
}
