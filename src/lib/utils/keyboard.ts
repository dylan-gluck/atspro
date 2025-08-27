/**
 * Keyboard utilities for improved accessibility
 */

import { tick } from 'svelte';

/**
 * Common keyboard codes
 */
export const KEYS = {
	ESCAPE: 'Escape',
	ENTER: 'Enter',
	SPACE: ' ',
	TAB: 'Tab',
	ARROW_UP: 'ArrowUp',
	ARROW_DOWN: 'ArrowDown',
	ARROW_LEFT: 'ArrowLeft',
	ARROW_RIGHT: 'ArrowRight',
	HOME: 'Home',
	END: 'End',
	PAGE_UP: 'PageUp',
	PAGE_DOWN: 'PageDown'
} as const;

/**
 * Check if an element is focusable
 */
export function isFocusable(element: HTMLElement): boolean {
	if (element.tabIndex < 0) return false;
	if (element.hasAttribute('disabled')) return false;
	if (element.getAttribute('aria-disabled') === 'true') return false;

	const focusableSelectors = [
		'a[href]',
		'button:not([disabled])',
		'input:not([disabled])',
		'textarea:not([disabled])',
		'select:not([disabled])',
		'[tabindex]:not([tabindex="-1"])',
		'[contenteditable="true"]',
		'audio[controls]',
		'video[controls]',
		'details > summary',
		'iframe'
	];

	return focusableSelectors.some((selector) => element.matches(selector));
}

/**
 * Get all focusable elements within a container
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
	const elements = container.querySelectorAll<HTMLElement>(
		'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"], audio[controls], video[controls], details > summary, iframe'
	);

	return Array.from(elements).filter(
		(el) => el.offsetWidth > 0 && el.offsetHeight > 0 && !el.hasAttribute('aria-hidden')
	);
}

/**
 * Focus trap implementation
 */
export class FocusTrap {
	private container: HTMLElement;
	private firstFocusable: HTMLElement | null = null;
	private lastFocusable: HTMLElement | null = null;
	private previouslyFocused: HTMLElement | null = null;
	private handleKeyDown: (event: KeyboardEvent) => void;
	private handleFocusIn: (event: FocusEvent) => void;

	constructor(container: HTMLElement, options: { initialFocus?: HTMLElement } = {}) {
		this.container = container;

		// Store previously focused element
		this.previouslyFocused = document.activeElement as HTMLElement;

		// Bind event handlers
		this.handleKeyDown = this.onKeyDown.bind(this);
		this.handleFocusIn = this.onFocusIn.bind(this);

		// Initialize trap
		this.updateFocusableElements();

		// Set initial focus
		if (options.initialFocus) {
			options.initialFocus.focus();
		} else if (this.firstFocusable) {
			this.firstFocusable.focus();
		}

		// Add event listeners
		document.addEventListener('keydown', this.handleKeyDown);
		document.addEventListener('focusin', this.handleFocusIn);
	}

	private updateFocusableElements() {
		const focusables = getFocusableElements(this.container);
		this.firstFocusable = focusables[0] || null;
		this.lastFocusable = focusables[focusables.length - 1] || null;
	}

	private onKeyDown(event: KeyboardEvent) {
		if (event.key !== KEYS.TAB) return;

		this.updateFocusableElements();

		if (!this.firstFocusable || !this.lastFocusable) return;

		if (event.shiftKey) {
			// Shift + Tab
			if (document.activeElement === this.firstFocusable) {
				event.preventDefault();
				this.lastFocusable.focus();
			}
		} else {
			// Tab
			if (document.activeElement === this.lastFocusable) {
				event.preventDefault();
				this.firstFocusable.focus();
			}
		}
	}

	private onFocusIn(event: FocusEvent) {
		const target = event.target as HTMLElement;
		if (!this.container.contains(target)) {
			event.preventDefault();
			event.stopPropagation();
			this.firstFocusable?.focus();
		}
	}

	public destroy() {
		document.removeEventListener('keydown', this.handleKeyDown);
		document.removeEventListener('focusin', this.handleFocusIn);

		// Restore focus to previously focused element
		if (this.previouslyFocused && document.body.contains(this.previouslyFocused)) {
			this.previouslyFocused.focus();
		}
	}
}

/**
 * Arrow key navigation for lists and menus
 */
export function setupArrowNavigation(
	container: HTMLElement,
	options: {
		itemSelector?: string;
		orientation?: 'vertical' | 'horizontal' | 'both';
		loop?: boolean;
		onSelect?: (item: HTMLElement, index: number) => void;
	} = {}
) {
	const {
		itemSelector = '[role="menuitem"], [role="option"], [role="tab"]',
		orientation = 'vertical',
		loop = true,
		onSelect
	} = options;

	let currentIndex = -1;

	function getItems(): HTMLElement[] {
		return Array.from(container.querySelectorAll<HTMLElement>(itemSelector)).filter(
			(el) => !el.hasAttribute('disabled') && !el.hasAttribute('aria-disabled')
		);
	}

	function focusItem(index: number) {
		const items = getItems();
		if (items.length === 0) return;

		if (index < 0) {
			currentIndex = loop ? items.length - 1 : 0;
		} else if (index >= items.length) {
			currentIndex = loop ? 0 : items.length - 1;
		} else {
			currentIndex = index;
		}

		items[currentIndex]?.focus();
	}

	function handleKeyDown(event: KeyboardEvent) {
		const items = getItems();
		if (items.length === 0) return;

		// Find current focused item
		const activeElement = document.activeElement as HTMLElement;
		const activeIndex = items.indexOf(activeElement);
		if (activeIndex !== -1) {
			currentIndex = activeIndex;
		}

		let handled = false;

		switch (event.key) {
			case KEYS.ARROW_UP:
				if (orientation === 'vertical' || orientation === 'both') {
					event.preventDefault();
					focusItem(currentIndex - 1);
					handled = true;
				}
				break;

			case KEYS.ARROW_DOWN:
				if (orientation === 'vertical' || orientation === 'both') {
					event.preventDefault();
					focusItem(currentIndex + 1);
					handled = true;
				}
				break;

			case KEYS.ARROW_LEFT:
				if (orientation === 'horizontal' || orientation === 'both') {
					event.preventDefault();
					focusItem(currentIndex - 1);
					handled = true;
				}
				break;

			case KEYS.ARROW_RIGHT:
				if (orientation === 'horizontal' || orientation === 'both') {
					event.preventDefault();
					focusItem(currentIndex + 1);
					handled = true;
				}
				break;

			case KEYS.HOME:
				event.preventDefault();
				focusItem(0);
				handled = true;
				break;

			case KEYS.END:
				event.preventDefault();
				focusItem(items.length - 1);
				handled = true;
				break;

			case KEYS.ENTER:
			case KEYS.SPACE:
				if (onSelect && currentIndex >= 0 && currentIndex < items.length) {
					event.preventDefault();
					onSelect(items[currentIndex], currentIndex);
					handled = true;
				}
				break;
		}

		if (handled) {
			event.stopPropagation();
		}
	}

	container.addEventListener('keydown', handleKeyDown);

	// Return cleanup function
	return () => {
		container.removeEventListener('keydown', handleKeyDown);
	};
}

/**
 * Type-ahead search for lists
 */
export function setupTypeAhead(
	container: HTMLElement,
	options: {
		itemSelector?: string;
		getItemText?: (item: HTMLElement) => string;
		onSelect?: (item: HTMLElement, index: number) => void;
		timeout?: number;
	} = {}
) {
	const {
		itemSelector = '[role="menuitem"], [role="option"]',
		getItemText = (item) => item.textContent?.trim() || '',
		onSelect,
		timeout = 500
	} = options;

	let searchString = '';
	let searchTimeout: ReturnType<typeof setTimeout>;

	function getItems(): HTMLElement[] {
		return Array.from(container.querySelectorAll<HTMLElement>(itemSelector));
	}

	function handleKeyPress(event: KeyboardEvent) {
		// Ignore special keys
		if (event.ctrlKey || event.altKey || event.metaKey) return;
		if (event.key.length !== 1) return;

		clearTimeout(searchTimeout);
		searchString += event.key.toLowerCase();

		const items = getItems();
		const matchingItem = items.find((item) => {
			const text = getItemText(item).toLowerCase();
			return text.startsWith(searchString);
		});

		if (matchingItem) {
			matchingItem.focus();
			if (onSelect) {
				const index = items.indexOf(matchingItem);
				onSelect(matchingItem, index);
			}
		}

		// Clear search string after timeout
		searchTimeout = setTimeout(() => {
			searchString = '';
		}, timeout);
	}

	container.addEventListener('keypress', handleKeyPress);

	// Return cleanup function
	return () => {
		container.removeEventListener('keypress', handleKeyPress);
		clearTimeout(searchTimeout);
	};
}

/**
 * Roving tabindex for complex navigation
 */
export function setupRovingTabIndex(
	container: HTMLElement,
	options: {
		itemSelector?: string;
		initialIndex?: number;
	} = {}
) {
	const { itemSelector = '[role="tab"], [role="menuitem"]', initialIndex = 0 } = options;

	function getItems(): HTMLElement[] {
		return Array.from(container.querySelectorAll<HTMLElement>(itemSelector));
	}

	function setTabIndex(index: number) {
		const items = getItems();
		items.forEach((item, i) => {
			item.setAttribute('tabindex', i === index ? '0' : '-1');
		});
	}

	function handleFocus(event: FocusEvent) {
		const target = event.target as HTMLElement;
		const items = getItems();
		const index = items.indexOf(target);

		if (index >= 0) {
			setTabIndex(index);
		}
	}

	// Initialize
	setTabIndex(initialIndex);

	// Add event listeners
	const items = getItems();
	items.forEach((item) => {
		item.addEventListener('focus', handleFocus);
	});

	// Return cleanup function
	return () => {
		const items = getItems();
		items.forEach((item) => {
			item.removeEventListener('focus', handleFocus);
		});
	};
}

/**
 * Announce text to screen readers
 */
export function announce(message: string, priority: 'polite' | 'assertive' = 'polite') {
	const announcement = document.createElement('div');
	announcement.setAttribute('role', 'status');
	announcement.setAttribute('aria-live', priority);
	announcement.setAttribute('aria-atomic', 'true');
	announcement.style.position = 'absolute';
	announcement.style.left = '-10000px';
	announcement.style.width = '1px';
	announcement.style.height = '1px';
	announcement.style.overflow = 'hidden';
	announcement.textContent = message;

	document.body.appendChild(announcement);

	// Remove after announcement
	setTimeout(() => {
		document.body.removeChild(announcement);
	}, 1000);
}

/**
 * Keyboard shortcut manager
 */
export class KeyboardShortcuts {
	private shortcuts = new Map<string, () => void>();
	private handleKeyDown: (event: KeyboardEvent) => void;

	constructor() {
		this.handleKeyDown = this.onKeyDown.bind(this);
		document.addEventListener('keydown', this.handleKeyDown);
	}

	private getShortcutKey(event: KeyboardEvent): string {
		const keys = [];
		if (event.ctrlKey) keys.push('ctrl');
		if (event.altKey) keys.push('alt');
		if (event.shiftKey) keys.push('shift');
		if (event.metaKey) keys.push('meta');
		keys.push(event.key.toLowerCase());
		return keys.join('+');
	}

	private onKeyDown(event: KeyboardEvent) {
		// Don't trigger shortcuts when typing in inputs
		const target = event.target as HTMLElement;
		if (
			target.tagName === 'INPUT' ||
			target.tagName === 'TEXTAREA' ||
			target.contentEditable === 'true'
		) {
			return;
		}

		const key = this.getShortcutKey(event);
		const handler = this.shortcuts.get(key);

		if (handler) {
			event.preventDefault();
			handler();
		}
	}

	public register(shortcut: string, handler: () => void) {
		this.shortcuts.set(shortcut.toLowerCase(), handler);
	}

	public unregister(shortcut: string) {
		this.shortcuts.delete(shortcut.toLowerCase());
	}

	public destroy() {
		document.removeEventListener('keydown', this.handleKeyDown);
		this.shortcuts.clear();
	}
}
