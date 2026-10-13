import * as z from 'zod';

import { CV_DATE_PATTERN } from './format.js';

export const CV_SCHEMA_VERSION = 1 as const;
export const DEFAULT_TEMPLATE_ID = 'single-column-a4';

const DATE_MESSAGE = 'Date must be YYYY, YYYY-MM, YYYY-MM-DD, "-", or null';

/** A calendar date, or an omission (`null`, `""`, or `"-"`). The key may also be absent. */
const cvDate = z
	.union([z.string(), z.null()])
	.refine(
		(value) => value === null || value === '' || value === '-' || CV_DATE_PATTERN.test(value),
		DATE_MESSAGE
	)
	.optional();

/** Optional text the author may leave off with `null` or `""`. */
const optionalText = z.string().nullish();

const linkSchema = z.strictObject({
	id: z.string().min(1),
	label: optionalText,
	url: z.string().min(1)
});

const basicsSchema = z.strictObject({
	name: optionalText,
	title: optionalText,
	email: optionalText,
	phone: optionalText,
	location: optionalText,
	website: optionalText,
	links: z.array(linkSchema).default([])
});

const experienceSchema = z.strictObject({
	id: z.string().min(1),
	company: z.string().min(1),
	role: z.string().min(1),
	location: optionalText,
	startDate: cvDate,
	endDate: cvDate,
	current: z.boolean().default(false),
	achievements: z.array(z.string()).default([])
});

const educationSchema = z.strictObject({
	id: z.string().min(1),
	institution: z.string().min(1),
	degree: z.string().min(1),
	location: optionalText,
	startDate: cvDate,
	endDate: cvDate,
	details: z.array(z.string()).default([])
});

const skillSchema = z.strictObject({
	id: z.string().min(1),
	name: z.string().min(1),
	level: optionalText,
	keywords: z.array(z.string()).default([])
});

const projectSchema = z.strictObject({
	id: z.string().min(1),
	name: z.string().min(1),
	url: optionalText,
	startDate: cvDate,
	endDate: cvDate,
	description: optionalText,
	highlights: z.array(z.string()).default([])
});

const certificationSchema = z.strictObject({
	id: z.string().min(1),
	name: z.string().min(1),
	issuer: optionalText,
	date: cvDate,
	url: optionalText
});

const languageSchema = z.strictObject({
	id: z.string().min(1),
	language: z.string().min(1),
	fluency: optionalText
});

const customSectionSchema = z.strictObject({
	id: z.string().min(1),
	title: z.string().min(1),
	content: z.array(z.string()).default([])
});

export const cvSchema = z.strictObject({
	schemaVersion: z.literal(CV_SCHEMA_VERSION),
	basics: basicsSchema,
	summary: optionalText,
	experience: z.array(experienceSchema).default([]),
	education: z.array(educationSchema).default([]),
	skills: z.array(skillSchema).default([]),
	projects: z.array(projectSchema).default([]),
	certifications: z.array(certificationSchema).default([]),
	languages: z.array(languageSchema).default([]),
	customSections: z.array(customSectionSchema).default([])
});

export type Cv = z.infer<typeof cvSchema>;
export type CvBasics = z.infer<typeof basicsSchema>;
export type CvExperience = z.infer<typeof experienceSchema>;
export type CvEducation = z.infer<typeof educationSchema>;

export function parseCv(value: unknown): z.ZodSafeParseResult<Cv> {
	return cvSchema.safeParse(value);
}

export function formatZodIssues(error: z.ZodError): string[] {
	return error.issues.map((issue) => {
		const path = issue.path.length ? issue.path.join('.') : '(root)';
		return `${path}: ${issue.message}`;
	});
}
