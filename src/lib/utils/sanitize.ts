import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitize HTML content to prevent XSS attacks
 * @param html - The HTML string to sanitize
 * @param options - Additional DOMPurify configuration options
 * @returns Sanitized HTML string safe for rendering
 */
export function sanitizeHtml(html: string, options?: any): string {
	if (!html) return '';

	// Configure DOMPurify with secure defaults
	const config = {
		// Allow basic HTML tags
		ALLOWED_TAGS: [
			'p',
			'br',
			'span',
			'div',
			'h1',
			'h2',
			'h3',
			'h4',
			'h5',
			'h6',
			'ul',
			'ol',
			'li',
			'blockquote',
			'a',
			'em',
			'strong',
			'del',
			'ins',
			'b',
			'i',
			'u',
			'code',
			'pre',
			'sup',
			'sub',
			'hr',
			'table',
			'thead',
			'tbody',
			'tr',
			'th',
			'td',
			'img',
			'figure',
			'figcaption'
		],
		// Allow safe attributes
		ALLOWED_ATTR: [
			'href',
			'title',
			'target',
			'rel',
			'class',
			'id',
			'alt',
			'src',
			'width',
			'height',
			'colspan',
			'rowspan',
			'scope'
		],
		// Prevent any JavaScript execution
		FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form'],
		FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
		// Force external links to open in new tab with secure rel
		ADD_ATTR: ['target', 'rel'],
		// Merge with user-provided options
		...options
	};

	// Sanitize the HTML
	const clean = String(DOMPurify.sanitize(html, config));

	// Additional post-processing for external links
	if (typeof window !== 'undefined') {
		const div = document.createElement('div');
		div.innerHTML = clean;

		// Secure all external links
		const links = div.querySelectorAll('a[href]');
		links.forEach((link) => {
			const href = link.getAttribute('href');
			if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
				link.setAttribute('target', '_blank');
				link.setAttribute('rel', 'noopener noreferrer');
			}
		});

		return div.innerHTML;
	}

	return clean;
}

/**
 * Sanitize markdown-generated HTML with more permissive settings
 * @param html - The markdown-generated HTML to sanitize
 * @returns Sanitized HTML string
 */
export function sanitizeMarkdownHtml(html: string): string {
	return sanitizeHtml(html, {
		// Allow additional tags commonly used in markdown
		ALLOWED_TAGS: [
			'p',
			'br',
			'span',
			'div',
			'h1',
			'h2',
			'h3',
			'h4',
			'h5',
			'h6',
			'ul',
			'ol',
			'li',
			'blockquote',
			'a',
			'em',
			'strong',
			'del',
			'ins',
			'b',
			'i',
			'u',
			'code',
			'pre',
			'sup',
			'sub',
			'hr',
			'table',
			'thead',
			'tbody',
			'tr',
			'th',
			'td',
			'img',
			'figure',
			'figcaption',
			'details',
			'summary',
			'mark',
			'kbd',
			'samp',
			'var',
			'abbr',
			'cite',
			'q'
		],
		// Allow data attributes for syntax highlighting
		ALLOWED_ATTR: [
			'href',
			'title',
			'target',
			'rel',
			'class',
			'id',
			'alt',
			'src',
			'width',
			'height',
			'colspan',
			'rowspan',
			'scope',
			'data-language',
			'data-line-numbers',
			'data-highlight'
		]
	});
}

/**
 * Sanitize user-generated content with strict settings
 * @param html - The user-generated HTML to sanitize
 * @returns Strictly sanitized HTML string
 */
export function sanitizeUserContent(html: string): string {
	return sanitizeHtml(html, {
		// Very limited tags for user content
		ALLOWED_TAGS: ['p', 'br', 'span', 'em', 'strong', 'b', 'i', 'u', 'a'],
		// Minimal attributes
		ALLOWED_ATTR: ['href', 'target', 'rel'],
		// No images or complex elements from user content
		FORBID_TAGS: ['img', 'video', 'audio', 'iframe', 'object', 'embed', 'script', 'style']
	});
}
