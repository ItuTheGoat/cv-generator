import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs';

GlobalWorkerOptions.workerSrc = import.meta.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs');

export async function extractPdfText(
	bytes: Uint8Array
): Promise<{ text: string; pageCount: number }> {
	const loadingTask = getDocument({ data: bytes });
	const doc = await loadingTask.promise;
	const parts: string[] = [];
	for (let pageNum = 1; pageNum <= doc.numPages; pageNum += 1) {
		const page = await doc.getPage(pageNum);
		const content = await page.getTextContent();
		const pageText = content.items.map((item) => ('str' in item ? item.str : '')).join(' ');
		parts.push(pageText);
	}
	const pageCount = doc.numPages;
	await doc.cleanup();
	return { text: parts.join('\n'), pageCount };
}
