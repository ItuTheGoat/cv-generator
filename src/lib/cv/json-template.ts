import type { Cv } from './schema.js';
import { CV_SCHEMA_VERSION } from './schema.js';

/**
 * Fill-in CV document served as a downloadable JSON template.
 * Placeholder values are schema-valid so the file can be validated before editing.
 */
export const cvJsonTemplate: Cv = {
	schemaVersion: CV_SCHEMA_VERSION,
	basics: {
		name: 'Your Name',
		title: 'Professional title',
		email: 'you@example.com',
		phone: '',
		location: 'City, Country',
		website: 'https://example.com',
		links: [
			{
				id: 'link-1',
				label: 'Link label',
				url: 'https://example.com'
			}
		]
	},
	summary: 'A short professional summary.',
	experience: [
		{
			id: 'exp-1',
			company: 'Company name',
			role: 'Job title',
			location: 'City',
			startDate: '2020-01',
			endDate: '2024-01',
			current: false,
			achievements: ['Describe a result you delivered.']
		}
	],
	education: [
		{
			id: 'edu-1',
			institution: 'Institution',
			degree: 'Degree',
			location: 'City',
			startDate: '2016',
			endDate: '2020',
			details: ['Optional detail']
		}
	],
	skills: [
		{
			id: 'skill-1',
			name: 'Skill name',
			level: 'Proficient',
			keywords: ['Keyword']
		}
	],
	projects: [
		{
			id: 'proj-1',
			name: 'Project name',
			url: 'https://example.com/project',
			startDate: '2024-01',
			endDate: '2024-06',
			description: 'What the project is.',
			highlights: ['A highlight']
		}
	],
	certifications: [
		{
			id: 'cert-1',
			name: 'Certification name',
			issuer: 'Issuer',
			date: '2024-01',
			url: 'https://example.com/certification'
		}
	],
	languages: [
		{
			id: 'lang-1',
			language: 'Language',
			fluency: 'Fluent'
		}
	],
	customSections: [
		{
			id: 'custom-1',
			title: 'Section title',
			content: ['A line of content']
		}
	]
};
