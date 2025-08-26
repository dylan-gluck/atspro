import { command } from '$app/server';
import * as v from 'valibot';
import { error } from '@sveltejs/kit';
import { db } from '$lib/db';
import { requireAuth } from './utils';
import puppeteer from 'puppeteer';
import { marked } from 'marked';

// Export document schema
const exportDocumentSchema = v.object({
	documentId: v.pipe(v.string(), v.uuid()),
	format: v.picklist(['pdf', 'docx', 'txt', 'markdown'])
});

export const exportDocument = command(exportDocumentSchema, async ({ documentId, format }) => {
	const userId = requireAuth();

	// Get document and verify ownership
	const doc = await db.getDocument(documentId);
	if (!doc) {
		error(404, 'Document not found');
	}

	// Verify ownership through job
	const job = await db.getJob(doc.jobId);
	if (!job || job.userId !== userId) {
		error(403, 'Access denied');
	}

	// Export based on format
	switch (format) {
		case 'pdf':
			return await exportToPDF(doc);
		case 'markdown':
			return await exportToMarkdown(doc);
		case 'txt':
			return await exportToText(doc);
		case 'docx':
			error(501, 'DOCX export not yet implemented');
		default:
			error(400, 'Invalid export format');
	}
});

// Export resume/document to PDF
async function exportToPDF(document: any): Promise<{ url: string; filename: string }> {
	let browser: any = null;

	try {
		// Launch headless browser
		browser = await puppeteer.launch({
			headless: true,
			args: ['--no-sandbox', '--disable-setuid-sandbox']
		});

		const page = await browser.newPage();

		// Get content and convert markdown if needed
		let htmlContent = document.content;

		// Check for markdown content in the dedicated column first
		if (document.contentMarkdown) {
			htmlContent = await convertMarkdownToStyledHTML(document.contentMarkdown, document.type);
		}
		// Fall back to metadata.markdown if it exists and looks like actual resume content
		else if (document.metadata?.markdown && document.metadata.markdown.includes('#')) {
			htmlContent = await convertMarkdownToStyledHTML(document.metadata.markdown, document.type);
		}
		// If content is already HTML, use it directly
		else if (document.content && document.content.includes('<')) {
			htmlContent = document.content;
		}
		// If content appears to be markdown
		else if (document.content && document.content.startsWith('#')) {
			htmlContent = await convertMarkdownToStyledHTML(document.content, document.type);
		}

		// Create full HTML document with styling
		const fullHTML = generatePDFHTML(htmlContent, document.type);

		// Set content
		await page.setContent(fullHTML, {
			waitUntil: 'networkidle0'
		});

		// Generate PDF
		const pdfBuffer = await page.pdf({
			format: 'A4',
			printBackground: true,
			margin: {
				top: '0.75in',
				right: '0.75in',
				bottom: '0.75in',
				left: '0.75in'
			}
		});

		// Create filename
		const timestamp = new Date().toISOString().slice(0, 10);
		const filename = `${document.type}-${timestamp}.pdf`;

		// Convert buffer to base64 data URL
		const base64 = Buffer.from(pdfBuffer).toString('base64');
		const dataUrl = `data:application/pdf;base64,${base64}`;

		return {
			url: dataUrl,
			filename
		};
	} catch (err) {
		console.error('PDF generation error:', err);
		throw error(500, 'Failed to generate PDF');
	} finally {
		if (browser) {
			await browser.close();
		}
	}
}

// Export to Markdown format
async function exportToMarkdown(document: any): Promise<{ content: string; filename: string }> {
	// Check if markdown is stored in metadata
	let markdownContent = document.metadata?.markdown || document.content;

	// If content is HTML, we need to convert it back
	if (markdownContent.includes('<') && !markdownContent.startsWith('#')) {
		// This is HTML, convert to markdown (simplified conversion)
		markdownContent = htmlToMarkdown(markdownContent);
	}

	const timestamp = new Date().toISOString().slice(0, 10);
	const filename = `${document.type}-${timestamp}.md`;

	return {
		content: markdownContent,
		filename
	};
}

// Export to plain text
async function exportToText(document: any): Promise<{ content: string; filename: string }> {
	// Strip all HTML tags and markdown formatting
	let textContent = document.metadata?.markdown || document.content;

	// Remove HTML tags
	textContent = textContent.replace(/<[^>]*>/g, '');

	// Remove markdown formatting
	textContent = textContent
		.replace(/#{1,6}\s+/g, '') // Headers
		.replace(/\*\*([^*]+)\*\*/g, '$1') // Bold
		.replace(/\*([^*]+)\*/g, '$1') // Italic
		.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links
		.replace(/^[-*+]\s+/gm, '• ') // List items
		.replace(/^\d+\.\s+/gm, '') // Numbered lists
		.replace(/```[^`]*```/g, '') // Code blocks
		.replace(/`([^`]+)`/g, '$1'); // Inline code

	const timestamp = new Date().toISOString().slice(0, 10);
	const filename = `${document.type}-${timestamp}.txt`;

	return {
		content: textContent,
		filename
	};
}

// Convert markdown to styled HTML for PDF
async function convertMarkdownToStyledHTML(markdown: string, docType: string): Promise<string> {
	// Configure marked for better formatting
	marked.setOptions({
		breaks: true,
		gfm: true
	});

	// Convert markdown to HTML
	const html = await marked(markdown);

	return html;
}

// Generate complete HTML document for PDF
function generatePDFHTML(content: string, docType: string): string {
	return `<!DOCTYPE html>
<html>
<head>
	<meta charset="UTF-8">
	<style>
		@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
		
		* {
			margin: 0;
			padding: 0;
			box-sizing: border-box;
		}
		
		body {
			font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
			line-height: 1.6;
			color: #1a1a1a;
			font-size: 11pt;
		}
		
		h1 {
			font-size: 24pt;
			font-weight: 600;
			margin-bottom: 8px;
			color: #0a0a0a;
		}
		
		h2 {
			font-size: 14pt;
			font-weight: 600;
			margin-top: 20px;
			margin-bottom: 10px;
			padding-bottom: 4px;
			border-bottom: 2px solid #e0e0e0;
			color: #0a0a0a;
		}
		
		h3 {
			font-size: 12pt;
			font-weight: 600;
			margin-top: 16px;
			margin-bottom: 8px;
			color: #2a2a2a;
		}
		
		p {
			margin-bottom: 10px;
			text-align: justify;
		}
		
		ul, ol {
			margin-left: 20px;
			margin-bottom: 10px;
		}
		
		li {
			margin-bottom: 4px;
		}
		
		a {
			color: #0066cc;
			text-decoration: none;
		}
		
		.contact-info {
			margin-bottom: 10px;
			color: #555;
		}
		
		.contact-info span {
			margin-right: 15px;
		}
		
		.dates {
			color: #666;
			font-style: italic;
			font-size: 10pt;
		}
		
		.resume-header {
			margin-bottom: 20px;
			padding-bottom: 10px;
			border-bottom: 3px solid #0066cc;
		}
		
		.resume-section {
			margin-bottom: 20px;
		}
		
		.experience-item, .education-item {
			margin-bottom: 16px;
		}
		
		.links {
			margin-top: 8px;
		}
		
		.links a {
			margin-right: 10px;
		}
		
		strong {
			font-weight: 600;
		}
		
		/* Cover letter specific styles */
		.cover-letter {
			line-height: 1.8;
		}
		
		.cover-letter p {
			margin-bottom: 14px;
		}
		
		/* Research document styles */
		.research {
			line-height: 1.7;
		}
		
		.research h2 {
			color: #0066cc;
		}
		
		/* Print-specific adjustments */
		@media print {
			body {
				font-size: 10.5pt;
			}
			
			h1 {
				font-size: 22pt;
			}
			
			h2 {
				font-size: 13pt;
				page-break-after: avoid;
			}
			
			h3 {
				font-size: 11pt;
				page-break-after: avoid;
			}
			
			.experience-item, .education-item {
				page-break-inside: avoid;
			}
		}
	</style>
</head>
<body>
	<div class="${docType}">
		${content}
	</div>
</body>
</html>`;
}

// Simple HTML to Markdown converter (basic implementation)
function htmlToMarkdown(html: string): string {
	return (
		html
			// Headers
			.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
			.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
			.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
			// Bold and italic
			.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
			.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
			.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
			.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
			// Links
			.replace(/<a[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/gi, '[$2]($1)')
			// Lists
			.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
			.replace(/<ul[^>]*>|<\/ul>/gi, '')
			.replace(/<ol[^>]*>|<\/ol>/gi, '')
			// Paragraphs and breaks
			.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
			.replace(/<br[^>]*>/gi, '\n')
			// Remove remaining tags
			.replace(/<[^>]*>/g, '')
			// Clean up extra whitespace
			.replace(/\n{3,}/g, '\n\n')
			.trim()
	);
}
