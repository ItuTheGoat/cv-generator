import { createEntryId } from './ids.js';
import type { Cv, CvEducation, CvExperience } from './schema.js';
import { CV_SCHEMA_VERSION, cvSchema } from './schema.js';

export type FormDraft = Cv;

export function createEmptyDraft(): FormDraft {
	return cvSchema.parse({
		schemaVersion: CV_SCHEMA_VERSION,
		basics: {
			name: '',
			title: '',
			email: '',
			phone: '',
			location: '',
			website: '',
			links: []
		},
		experience: [],
		education: [],
		skills: [],
		projects: [],
		certifications: [],
		languages: [],
		customSections: []
	});
}

export function draftToCanonical(draft: FormDraft): Cv {
	return cvSchema.parse(draft);
}

export function addExperience(draft: FormDraft): FormDraft {
	const entry: CvExperience = {
		id: createEntryId(),
		company: '',
		role: '',
		startDate: '2020-01',
		current: false,
		achievements: []
	};
	return { ...draft, experience: [...draft.experience, entry] };
}

export function addEducation(draft: FormDraft): FormDraft {
	const entry: CvEducation = {
		id: createEntryId(),
		institution: '',
		degree: '',
		details: []
	};
	return { ...draft, education: [...draft.education, entry] };
}

export function removeById<T extends { id: string }>(items: T[], id: string): T[] {
	return items.filter((item) => item.id !== id);
}

export function moveItem<T>(items: T[], index: number, direction: -1 | 1): T[] {
	const target = index + direction;
	if (target < 0 || target >= items.length) return items;
	const copy = [...items];
	const [item] = copy.splice(index, 1);
	copy.splice(target, 0, item);
	return copy;
}

export function reorderExperience(draft: FormDraft, index: number, direction: -1 | 1): FormDraft {
	return { ...draft, experience: moveItem(draft.experience, index, direction) };
}

export function reorderEducation(draft: FormDraft, index: number, direction: -1 | 1): FormDraft {
	return { ...draft, education: moveItem(draft.education, index, direction) };
}

export function reorderSkills(draft: FormDraft, index: number, direction: -1 | 1): FormDraft {
	return { ...draft, skills: moveItem(draft.skills, index, direction) };
}

export function reorderProjects(draft: FormDraft, index: number, direction: -1 | 1): FormDraft {
	return { ...draft, projects: moveItem(draft.projects, index, direction) };
}
