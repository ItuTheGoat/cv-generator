<script lang="ts">
	import type { Cv } from '#lib/cv/schema.js';
	import {
		addEducation,
		addExperience,
		removeById,
		reorderEducation,
		reorderExperience,
		reorderSkills
	} from '#lib/cv/form.js';
	import { createEntryId } from '#lib/cv/ids.js';

	let { cv = $bindable<Cv>(), onedit }: { cv: Cv; onedit?: () => void } = $props();

	function notifyEdit() {
		onedit?.();
	}

	function updateSummary(value: string) {
		cv = { ...cv, summary: value };
	}

	function updateEducationDetails(eduId: string, text: string) {
		const details = text
			.split('\n')
			.map((line) => line.trim())
			.filter(Boolean);
		cv = {
			...cv,
			education: cv.education.map((edu) => (edu.id === eduId ? { ...edu, details } : edu))
		};
		notifyEdit();
	}

	function addLink() {
		cv = {
			...cv,
			basics: {
				...cv.basics,
				links: [...cv.basics.links, { id: createEntryId(), label: '', url: '' }]
			}
		};
		notifyEdit();
	}
</script>

<div class="form">
	<fieldset>
		<legend>Basics</legend>
		<label>
			Name
			<input
				data-testid="basics-name"
				value={cv.basics.name ?? ''}
				oninput={(e) => {
					cv.basics.name = e.currentTarget.value;
					notifyEdit();
				}}
			/>
		</label>
		<label>
			Title
			<input
				value={cv.basics.title ?? ''}
				oninput={(e) => {
					cv.basics.title = e.currentTarget.value;
					notifyEdit();
				}}
			/>
		</label>
		<label>
			Email
			<input
				value={cv.basics.email ?? ''}
				oninput={(e) => {
					cv.basics.email = e.currentTarget.value;
					notifyEdit();
				}}
			/>
		</label>
		<label>
			Phone
			<input
				value={cv.basics.phone ?? ''}
				oninput={(e) => {
					cv.basics.phone = e.currentTarget.value;
					notifyEdit();
				}}
			/>
		</label>
		<label>
			Location
			<input
				value={cv.basics.location ?? ''}
				oninput={(e) => {
					cv.basics.location = e.currentTarget.value;
					notifyEdit();
				}}
			/>
		</label>
		<label>
			Website
			<input
				value={cv.basics.website ?? ''}
				oninput={(e) => {
					cv.basics.website = e.currentTarget.value;
					notifyEdit();
				}}
			/>
		</label>
		<div class="links-block">
			<div class="section-head">
				<span>Links</span>
				<button type="button" onclick={addLink}>Add link</button>
			</div>
			{#each cv.basics.links as link (link.id)}
				<div class="repeatable links-row">
					<label>
						Label
						<input
							value={link.label ?? ''}
							oninput={(e) => {
								link.label = e.currentTarget.value;
								notifyEdit();
							}}
						/>
					</label>
					<label>URL <input bind:value={link.url} oninput={notifyEdit} /></label>
					<button
						type="button"
						onclick={() =>
							(cv = {
								...cv,
								basics: {
									...cv.basics,
									links: removeById(cv.basics.links, link.id)
								}
							})}
					>
						Remove
					</button>
				</div>
			{/each}
		</div>
	</fieldset>

	<label>
		Summary
		<textarea
			rows="4"
			value={cv.summary ?? ''}
			oninput={(e) => updateSummary(e.currentTarget.value)}></textarea>
	</label>

	<section>
		<div class="section-head">
			<h3>Experience</h3>
			<button type="button" onclick={() => (cv = addExperience(cv))}>Add role</button>
		</div>
		{#each cv.experience as job, index (job.id)}
			<div class="repeatable">
				<label>Role <input bind:value={job.role} oninput={notifyEdit} /></label>
				<label>Company <input bind:value={job.company} oninput={notifyEdit} /></label>
				<label>
					Start
					<input
						value={job.startDate ?? ''}
						oninput={(e) => {
							job.startDate = e.currentTarget.value;
							notifyEdit();
						}}
					/>
				</label>
				<label>
					Current
					<input type="checkbox" bind:checked={job.current} onchange={notifyEdit} />
				</label>
				{#if !job.current}
					<label>
						End
						<input
							value={job.endDate ?? ''}
							oninput={(e) => {
								job.endDate = e.currentTarget.value;
								notifyEdit();
							}}
						/>
					</label>
				{/if}
				<div class="row-actions">
					<button type="button" onclick={() => (cv = reorderExperience(cv, index, -1))}>Up</button>
					<button type="button" onclick={() => (cv = reorderExperience(cv, index, 1))}>Down</button>
					<button
						type="button"
						onclick={() => (cv = { ...cv, experience: removeById(cv.experience, job.id) })}
						>Remove</button
					>
				</div>
			</div>
		{/each}
	</section>

	<section>
		<div class="section-head">
			<h3>Education</h3>
			<button type="button" data-testid="add-education-btn" onclick={() => (cv = addEducation(cv))}>
				Add education
			</button>
		</div>
		{#each cv.education as edu, index (edu.id)}
			<div class="repeatable" data-testid="education-entry">
				<label>Degree <input bind:value={edu.degree} oninput={notifyEdit} /></label>
				<label>Institution <input bind:value={edu.institution} oninput={notifyEdit} /></label>
				<label>
					Location
					<input
						value={edu.location ?? ''}
						oninput={(e) => {
							edu.location = e.currentTarget.value;
							notifyEdit();
						}}
					/>
				</label>
				<label>
					Start
					<input
						value={edu.startDate ?? ''}
						oninput={(e) => {
							edu.startDate = e.currentTarget.value;
							notifyEdit();
						}}
					/>
				</label>
				<label>
					End
					<input
						value={edu.endDate ?? ''}
						oninput={(e) => {
							edu.endDate = e.currentTarget.value;
							notifyEdit();
						}}
					/>
				</label>
				<label>
					Details (one per line)
					<textarea
						rows="3"
						value={edu.details.join('\n')}
						oninput={(e) => updateEducationDetails(edu.id, e.currentTarget.value)}></textarea>
				</label>
				<div class="row-actions">
					<button type="button" onclick={() => (cv = reorderEducation(cv, index, -1))}>Up</button>
					<button type="button" onclick={() => (cv = reorderEducation(cv, index, 1))}>Down</button>
					<button
						type="button"
						onclick={() => (cv = { ...cv, education: removeById(cv.education, edu.id) })}
						>Remove</button
					>
				</div>
			</div>
		{/each}
	</section>

	<section>
		<div class="section-head">
			<h3>Skills</h3>
			<button
				type="button"
				onclick={() =>
					(cv = {
						...cv,
						skills: [...cv.skills, { id: createEntryId(), name: '', keywords: [] }]
					})}
			>
				Add skill
			</button>
		</div>
		{#each cv.skills as skill, index (skill.id)}
			<div class="repeatable">
				<label>Name <input bind:value={skill.name} oninput={notifyEdit} /></label>
				<div class="row-actions">
					<button type="button" onclick={() => (cv = reorderSkills(cv, index, -1))}>Up</button>
					<button type="button" onclick={() => (cv = reorderSkills(cv, index, 1))}>Down</button>
					<button
						type="button"
						onclick={() => (cv = { ...cv, skills: removeById(cv.skills, skill.id) })}>Remove</button
					>
				</div>
			</div>
		{/each}
	</section>
</div>

<style>
	.form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	fieldset {
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		padding: 1rem;
		display: grid;
		gap: 0.75rem;
	}

	label {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		font-size: 0.9rem;
	}

	input,
	textarea {
		font: inherit;
		padding: 0.4rem 0.5rem;
		border: 1px solid #cbd5e1;
		border-radius: 6px;
	}

	.section-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.links-block {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.links-row {
		margin-bottom: 0;
	}

	.repeatable {
		border: 1px dashed #cbd5e1;
		padding: 0.75rem;
		border-radius: 8px;
		margin-bottom: 0.75rem;
		display: grid;
		gap: 0.5rem;
	}

	.row-actions {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	button {
		font: inherit;
		cursor: pointer;
	}
</style>
