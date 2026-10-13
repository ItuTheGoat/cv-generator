import { PDFDocument } from 'pdf-lib';
import { chromium, type Browser } from 'playwright';

import { getOrigin } from './config.js';
import { extractPdfText } from './pdf-text.js';
import type { Snapshot } from './snapshots.js';

export type PdfRenderSuccess = {
	ok: true;
	bytes: Uint8Array;
	pageCount: number;
	extractedText: string;
	fontsReady: boolean;
	horizontalOverflow: boolean;
};

export type PdfRenderFailure = {
	ok: false;
	message: string;
};

export type PdfRenderResult = PdfRenderSuccess | PdfRenderFailure;

const PDF_TIMEOUT_MS = 45_000;

export async function renderSnapshotPdf(
	snapshot: Snapshot,
	requestOrigin?: string
): Promise<PdfRenderResult> {
	const origin = requestOrigin ?? getOrigin();
	const url = `${origin}/print/${snapshot.id}`;
	let browser: Browser | undefined;

	try {
		browser = await chromium.launch({ headless: true });
		const context = await browser.newContext();
		const page = await context.newPage();

		const allowedHost = new URL(origin).host;
		await page.route('**/*', (route) => {
			const host = new URL(route.request().url()).host;
			if (host !== allowedHost) {
				return route.abort();
			}
			return route.continue();
		});

		await page.goto(url, { waitUntil: 'domcontentloaded', timeout: PDF_TIMEOUT_MS });
		await page.waitForFunction(
			async () => {
				await document.fonts.ready;
				return document.querySelector('[data-cv-root]') !== null;
			},
			undefined,
			{ timeout: PDF_TIMEOUT_MS }
		);

		const layout = await page.evaluate(() => {
			const root = document.querySelector('[data-cv-root]');
			if (!root) {
				return { fontsReady: false, horizontalOverflow: true };
			}
			const el = root as HTMLElement;
			return {
				fontsReady: document.fonts.status === 'loaded',
				horizontalOverflow: el.scrollWidth > el.clientWidth + 1
			};
		});

		const pdfBuffer = await page.pdf({
			format: 'A4',
			printBackground: true,
			preferCSSPageSize: true,
			margin: { top: '0', bottom: '0', left: '0', right: '0' }
		});

		await context.close();

		if (!pdfBuffer.byteLength) {
			return { ok: false, message: 'PDF buffer is empty.' };
		}

		let bytes = new Uint8Array(pdfBuffer);
		const pdfDoc = await PDFDocument.load(bytes);
		const title = snapshot.cv.basics.name?.trim() || 'CV';
		pdfDoc.setTitle(title);
		pdfDoc.setAuthor(title);
		bytes = new Uint8Array(await pdfDoc.save());

		const outputBytes = Uint8Array.from(bytes);
		const { text, pageCount } = await extractPdfText(Uint8Array.from(outputBytes));

		return {
			ok: true,
			bytes: outputBytes,
			pageCount,
			extractedText: text,
			fontsReady: layout.fontsReady,
			horizontalOverflow: layout.horizontalOverflow
		};
	} catch (error) {
		let message = error instanceof Error ? error.message : 'PDF rendering failed';
		if (/Executable doesn't exist|playwright install/i.test(message)) {
			message =
				'Chromium is not installed for Playwright. Run: bunx playwright install chromium';
		}
		return { ok: false, message };
	} finally {
		if (browser) await browser.close();
	}
}
