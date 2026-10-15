import { expect, test } from '@playwright/test';
import path from 'node:path';
import { readFile } from 'node:fs/promises';

async function gotoHome(page: import('@playwright/test').Page) {
	await page.goto('/');
	await page.waitForLoadState('networkidle');
}

async function loadFixtureCv(request: import('@playwright/test').APIRequestContext) {
	const fixturePath = path.join(process.cwd(), 'static/examples/alex-morgan.cv.json');
	const json = await readFile(fixturePath, 'utf8');
	const importRes = await request.post('/api/import/json', { data: json });
	expect(importRes.ok()).toBeTruthy();
	const imported = await importRes.json();
	expect(imported.ok).toBe(true);
	return imported.cv;
}

test.describe('CV Forge workflow', () => {
	test('home page renders preview and JSON dialog entry points', async ({ page }) => {
		await gotoHome(page);
		await expect(page.getByRole('heading', { name: 'CV Forge' })).toBeVisible();
		await expect(page.getByRole('heading', { name: 'Preview' })).toBeVisible();
		await expect(page.getByRole('heading', { name: 'JSON import' })).toHaveCount(0);
		await expect(page.getByTestId('view-json-btn')).toBeVisible();
		await expect(page.getByTestId('download-json-template-btn')).toBeVisible();
		await expect(page.getByTestId('render-example-preview-btn')).toBeVisible();
		await expect(page.getByRole('heading', { name: 'Edit' })).toHaveCount(0);

		await page.getByTestId('view-json-btn').click();
		await expect(page.getByRole('heading', { name: 'JSON import' })).toBeVisible();
	});

	test('accepts, generates PDF, and downloads via API workflow', async ({ request }) => {
		const cv = await loadFixtureCv(request);
		const acceptRes = await request.post('/api/acceptance', { data: { cv } });
		expect(acceptRes.ok()).toBeTruthy();
		const accepted = await acceptRes.json();

		const pdfRes = await request.post('/api/pdf', {
			data: { snapshotId: accepted.snapshotId, contentHash: accepted.contentHash }
		});
		expect(pdfRes.ok()).toBeTruthy();
		const pdfBody = await pdfRes.json();
		expect(pdfBody.downloadAllowed).toBe(true);

		const downloadRes = await request.get(`/api/pdf/${accepted.snapshotId}`);
		expect(downloadRes.ok()).toBeTruthy();
		const bytes = await downloadRes.body();
		expect(bytes.byteLength).toBeGreaterThan(0);
		expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-');
	});

	test('shows JSON syntax error for malformed import', async ({ request }) => {
		const response = await request.post('/api/import/json', {
			headers: { 'Content-Type': 'text/plain' },
			data: '{ bad json'
		});
		expect(response.status()).toBe(400);
		const body = await response.json();
		expect(body.kind).toBe('syntax');
	});

	test('blocks PDF when acceptance hash is stale', async ({ request }) => {
		const cv = await loadFixtureCv(request);
		const acceptRes = await request.post('/api/acceptance', { data: { cv } });
		const accepted = await acceptRes.json();

		const pdfRes = await request.post('/api/pdf', {
			data: { snapshotId: accepted.snapshotId, contentHash: 'deadbeef' }
		});
		expect(pdfRes.status()).toBe(409);
	});

	test('imports valid JSON fixture via API', async ({ request }) => {
		const cv = await loadFixtureCv(request);
		expect(cv.basics.name).toBe('Alex Morgan');
	});

	test('serves a schema-valid JSON template', async ({ request }) => {
		const response = await request.get('/examples/cv.template.json');
		expect(response.ok()).toBeTruthy();
		const imported = await request.post('/api/import/json', {
			data: await response.text()
		});
		expect(imported.ok()).toBeTruthy();
		const body = await imported.json();
		expect(body.cv.basics.name).toBe('Your Name');
	});

	test('render example preview loads Alex Morgan', async ({ page }) => {
		await gotoHome(page);
		const previewName = page.getByTestId('cv-preview-page').first().getByTestId('cv-preview-name');
		await page.getByTestId('render-example-preview-btn').click();
		await expect(previewName).toHaveText('Alex Morgan');
	});

	test('validates JSON before updating the preview', async ({ page }) => {
		await gotoHome(page);
		const previewName = page.getByTestId('cv-preview-page').first().getByTestId('cv-preview-name');
		await expect(previewName).toHaveText('Untitled candidate');

		await page.getByTestId('view-json-btn').click();
		await expect(page.getByTestId('json-dialog')).toBeVisible();
		await expect(page.getByTestId('json-source-editor')).toBeVisible();
		await expect(page.locator('[data-testid="json-source-editor"] .jse-main')).toBeVisible();
		const input = page.getByTestId('validate-json-input');
		await expect(input).toBeEnabled();

		await input.setInputFiles({
			name: 'invalid.cv.json',
			mimeType: 'application/json',
			buffer: Buffer.from(JSON.stringify({ schemaVersion: 1 }))
		});
		await expect(previewName).toHaveText('Untitled candidate');
		await expect(page.getByTestId('render-json-btn')).toBeDisabled();

		await page.getByTestId('validate-json-btn').click();
		const report = page.getByTestId('json-validation-report');
		await expect(report).toContainText('failed schema validation');
		await expect(page.getByTestId('render-json-btn')).toBeDisabled();

		await input.setInputFiles(path.join(process.cwd(), 'static/examples/alex-morgan.cv.json'));
		await page.getByTestId('validate-json-btn').click();
		await expect(report).toContainText('valid');
		await expect(previewName).toHaveText('Untitled candidate');
		await expect(page.getByTestId('render-json-btn')).toBeEnabled();

		await page.getByTestId('render-json-btn').click();
		await expect(previewName).toHaveText('Alex Morgan');

		await page.getByTestId('view-json-btn').click();
		await page.getByTestId('edit-json-btn').click();
		await page.locator('[data-testid="json-source-editor"] .cm-content').click();
		await page.keyboard.type(' ');
		await expect(page.getByTestId('render-json-btn')).toBeDisabled();

		await page.getByTestId('validate-json-btn').click();
		await expect(page.getByTestId('render-json-btn')).toBeEnabled();
	});
});
