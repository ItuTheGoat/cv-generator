import type { Content, List, ListItem, Paragraph, Root, Yaml } from 'mdast';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { parse as parseYaml } from 'yaml';

import { createEntryId } from './ids.js';
import type { Cv } from './schema.js';
import { CV_SCHEMA_VERSION, cvSchema } from './schema.js';
import { MAX_IMPORT_BYTES } from './json-import.js';

export type MarkdownImportSuccess = {
	ok: true;
	cv: Cv;
	warnings: string[];
	unmapped: UnmappedBlock[];
	strippedHtml: string[];
};

export type MarkdownImportFailure = {
	ok: false;
	kind: 'size' | 'parse' | 'schema';
	messages: string[];
};

export type MarkdownImportResult = MarkdownImportSuccess | MarkdownImportFailure;

export type UnmappedBlock = {
	heading: string;
	body: string;
};

const SECTION_ALIASES: Record<
	string,
	keyof Pick<
		Cv,
		'summary' | 'experience' | 'education' | 'skills' | 'projects' | 'certifications' | 'languages'
	>
> = {
	summary: 'summary',
	'professional summary': 'summary',
	profile: 'summary',
	experience: 'experience',
	'work experience': 'experience',
	employment: 'experience',
	education: 'education',
	skills: 'skills',
	projects: 'projects',
	certifications: 'certifications',
	languages: 'languages'
};

function byteLength(text: string): number {
	return new TextEncoder().encode(text).byteLength;
}

function textFromNodes(nodes: Content[]): string {
	return nodes
		.map((node) => {
			if (node.type === 'text') return node.value;
			if (node.type === 'inlineCode') return node.value;
			if ('children' in node && Array.isArray(node.children)) {
				return textFromNodes(node.children as Content[]);
			}
			return '';
		})
		.join('')
		.trim();
}

function collectHtml(nodes: Content[], found: string[]): void {
	for (const node of nodes) {
		if (node.type === 'html') {
			found.push(node.value);
		}
		if ('children' in node && Array.isArray(node.children)) {
			collectHtml(node.children as Content[], found);
		}
	}
}

function parseFrontmatter(root: Root): { data: Record<string, unknown>; warnings: string[] } {
	const yamlNode = root.children.find((c): c is Yaml => c.type === 'yaml');
	if (!yamlNode) {
		return { data: {}, warnings: ['No YAML frontmatter found; basics may be incomplete.'] };
	}
	try {
		const data = parseYaml(yamlNode.value);
		if (typeof data !== 'object' || data === null) {
			return { data: {}, warnings: ['Frontmatter must be a YAML object.'] };
		}
		return { data: data as Record<string, unknown>, warnings: [] };
	} catch {
		return { data: {}, warnings: ['Frontmatter YAML could not be parsed.'] };
	}
}

type Section = { title: string; nodes: Content[] };

function splitSections(root: Root): Section[] {
	const sections: Section[] = [];
	let current: Section = { title: '', nodes: [] };

	for (const child of root.children) {
		if (child.type === 'yaml') continue;
		if (child.type === 'heading' && child.depth === 2) {
			if (current.title || current.nodes.length) sections.push(current);
			current = { title: textFromNodes([child]), nodes: [] };
			continue;
		}
		current.nodes.push(child as Content);
	}
	if (current.title || current.nodes.length) sections.push(current);
	return sections;
}

function listItems(list: List): string[] {
	return list.children.map((item) => textFromNodes((item as ListItem).children as Content[]));
}

function parseLabeledLines(text: string): Record<string, string> {
	const out: Record<string, string> = {};
	for (const line of text.split('\n')) {
		const match = line.match(/^([A-Za-z ]+):\s*(.+)$/);
		if (match) out[match[1].toLowerCase()] = match[2].trim();
	}
	return out;
}

function subsectionBlocks(nodes: Content[]): { title: string; body: Content[] }[] {
	const blocks: { title: string; body: Content[] }[] = [];
	let current = { title: '', body: [] as Content[] };
	for (const node of nodes) {
		if (node.type === 'heading' && node.depth === 3) {
			if (current.title || current.body.length) blocks.push(current);
			current = { title: textFromNodes([node]), body: [] };
			continue;
		}
		current.body.push(node);
	}
	if (current.title || current.body.length) blocks.push(current);
	return blocks;
}

function buildCvFromMarkdown(text: string): MarkdownImportResult {
	if (byteLength(text) > MAX_IMPORT_BYTES) {
		return {
			ok: false,
			kind: 'size',
			messages: [`Import exceeds ${MAX_IMPORT_BYTES} bytes.`]
		};
	}

	const strippedHtml: string[] = [];
	let tree: Root;
	try {
		const processor = unified().use(remarkParse).use(remarkFrontmatter).use(remarkGfm);
		tree = processor.parse(text) as Root;
		collectHtml(tree.children, strippedHtml);
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Markdown parse failed';
		return { ok: false, kind: 'parse', messages: [message] };
	}

	const { data: frontmatter, warnings: fmWarnings } = parseFrontmatter(tree);
	const warnings = [...fmWarnings];
	const unmapped: UnmappedBlock[] = [];

	const basicsFromFm =
		typeof frontmatter.basics === 'object' && frontmatter.basics !== null
			? (frontmatter.basics as Record<string, unknown>)
			: frontmatter;

	const draft: Cv = {
		schemaVersion: CV_SCHEMA_VERSION,
		basics: {
			name: typeof basicsFromFm.name === 'string' ? basicsFromFm.name : undefined,
			title: typeof basicsFromFm.title === 'string' ? basicsFromFm.title : undefined,
			email: typeof basicsFromFm.email === 'string' ? basicsFromFm.email : undefined,
			phone: typeof basicsFromFm.phone === 'string' ? basicsFromFm.phone : undefined,
			location: typeof basicsFromFm.location === 'string' ? basicsFromFm.location : undefined,
			website: typeof basicsFromFm.website === 'string' ? basicsFromFm.website : undefined,
			links: []
		},
		summary: undefined,
		experience: [],
		education: [],
		skills: [],
		projects: [],
		certifications: [],
		languages: [],
		customSections: []
	};

	if (frontmatter.schemaVersion !== undefined && frontmatter.schemaVersion !== CV_SCHEMA_VERSION) {
		return {
			ok: false,
			kind: 'schema',
			messages: [
				`Unsupported schemaVersion "${String(frontmatter.schemaVersion)}". Supported version is ${CV_SCHEMA_VERSION}.`
			]
		};
	}

	for (const section of splitSections(tree)) {
		const key = SECTION_ALIASES[section.title.toLowerCase()];
		if (!key) {
			if (section.title.toLowerCase().startsWith('custom:')) {
				const title = section.title.replace(/^custom:\s*/i, '').trim() || 'Custom section';
				const lines: string[] = [];
				for (const node of section.nodes) {
					if (node.type === 'paragraph') lines.push(textFromNodes([node]));
					if (node.type === 'list') lines.push(...listItems(node));
				}
				draft.customSections.push({
					id: createEntryId(),
					title,
					content: lines.filter(Boolean)
				});
				continue;
			}
			unmapped.push({
				heading: section.title || '(preamble)',
				body: section.nodes
					.map((n) => textFromNodes([n]))
					.filter(Boolean)
					.join('\n')
			});
			continue;
		}

		if (key === 'summary') {
			draft.summary = section.nodes
				.filter((n): n is Paragraph => n.type === 'paragraph')
				.map((p) => textFromNodes([p]))
				.join('\n');
			continue;
		}

		if (key === 'skills' || key === 'languages') {
			for (const node of section.nodes) {
				if (node.type === 'list') {
					for (const item of listItems(node)) {
						if (key === 'skills') {
							draft.skills.push({ id: createEntryId(), name: item, keywords: [] });
						} else {
							const [language, fluency] = item.split('—').map((s) => s.trim());
							draft.languages.push({
								id: createEntryId(),
								language: language || item,
								fluency: fluency || undefined
							});
						}
					}
				}
			}
			continue;
		}

		const blocks = subsectionBlocks(section.nodes);
		if (!blocks.length && section.nodes.length) {
			warnings.push(
				`Section "${section.title}" has no ### entries; content preserved as unmapped.`
			);
			unmapped.push({
				heading: section.title,
				body: section.nodes.map((n) => textFromNodes([n])).join('\n')
			});
			continue;
		}

		for (const block of blocks) {
			const bodyText = block.body.map((n) => textFromNodes([n])).join('\n');
			const labels = parseLabeledLines(bodyText);
			const bullets = block.body
				.filter((n): n is List => n.type === 'list')
				.flatMap((list) => listItems(list));

			if (key === 'experience') {
				draft.experience.push({
					id: createEntryId(),
					company: labels.company || block.title,
					role: labels.role || labels.title || 'Role',
					location: labels.location,
					startDate: labels.start || labels['start date'] || '2000-01',
					endDate: labels.end || labels['end date'],
					current: /^(true|yes|current)$/i.test(labels.current ?? ''),
					achievements: bullets
				});
			} else if (key === 'education') {
				draft.education.push({
					id: createEntryId(),
					institution: labels.institution || block.title,
					degree: labels.degree || 'Degree',
					location: labels.location,
					startDate: labels.start,
					endDate: labels.end,
					details: bullets
				});
			} else if (key === 'projects') {
				draft.projects.push({
					id: createEntryId(),
					name: block.title,
					url: labels.url,
					startDate: labels.start,
					endDate: labels.end,
					description: block.body.find((n) => n.type === 'paragraph')
						? textFromNodes(block.body.filter((n) => n.type === 'paragraph') as Content[])
						: undefined,
					highlights: bullets
				});
			} else if (key === 'certifications') {
				draft.certifications.push({
					id: createEntryId(),
					name: block.title,
					issuer: labels.issuer,
					date: labels.date,
					url: labels.url
				});
			}
		}
	}

	const parsed = cvSchema.safeParse(draft);
	if (!parsed.success) {
		return {
			ok: false,
			kind: 'schema',
			messages: parsed.error.issues.map((i) => i.message)
		};
	}

	if (strippedHtml.length) {
		warnings.push(`Removed ${strippedHtml.length} HTML fragment(s); HTML is not rendered.`);
	}

	return { ok: true, cv: parsed.data, warnings, unmapped, strippedHtml };
}

export function importMarkdown(text: string): MarkdownImportResult {
	return buildCvFromMarkdown(text);
}
