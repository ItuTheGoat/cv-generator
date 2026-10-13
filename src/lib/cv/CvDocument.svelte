<script lang="ts">
	import type { Cv } from './schema.js';
	import {
		formatExperienceDates,
		formatOptionalRange,
		isCalendarDate,
		visibleLines,
		visibleText
	} from './format.js';
	import './cv.css';

	let { cv, mode = 'screen' }: { cv: Cv; mode?: 'screen' | 'print' } = $props();

	const contactItems = $derived.by(() => {
		const items: { id: string; text: string }[] = [];
		const email = cv.basics.email?.trim();
		const phone = cv.basics.phone?.trim();
		const location = cv.basics.location?.trim();
		const website = cv.basics.website?.trim();

		if (email) items.push({ id: 'email', text: email });
		if (phone) items.push({ id: 'phone', text: phone });
		if (location) items.push({ id: 'location', text: location });
		if (website) items.push({ id: 'website', text: website });

		for (const link of cv.basics.links) {
			const label = visibleText(link.label);
			const url = visibleText(link.url);
			const text = label && url ? `${label}: ${url}` : label || url;
			if (text) items.push({ id: link.id, text });
		}

		return items;
	});
</script>

<article class="cv-document" data-cv-root data-cv-mode={mode}>
	<header class="cv-header" data-cv-block>
		<h1 class="cv-name" data-testid="cv-preview-name">
			{cv.basics.name?.trim() || 'Untitled candidate'}
		</h1>
		{#if visibleText(cv.basics.title)}
			<p class="cv-title">{visibleText(cv.basics.title)}</p>
		{/if}
		{#if contactItems.length}
			<ul class="cv-contact">
				{#each contactItems as item (item.id)}
					<li>{item.text}</li>
				{/each}
			</ul>
		{/if}
	</header>

	{#if visibleText(cv.summary)}
		<section class="cv-section" data-cv-block>
			<h2 class="cv-section-title">Summary</h2>
			<p>{visibleText(cv.summary)}</p>
		</section>
	{/if}

	{#if cv.experience.length}
		<section class="cv-section">
			<h2 class="cv-section-title">Experience</h2>
			{#each cv.experience as job (job.id)}
				{@const dates = formatExperienceDates(job)}
				{@const achievements = visibleLines(job.achievements)}
				<div class="cv-entry" data-cv-block>
					<div class="cv-entry-head">
						<div>
							<h3 class="cv-entry-title">{job.role}</h3>
							<p class="cv-entry-sub">
								{job.company}{visibleText(job.location) ? ` · ${visibleText(job.location)}` : ''}
							</p>
						</div>
						{#if dates}
							<div class="cv-entry-meta">{dates}</div>
						{/if}
					</div>
					{#if achievements.length}
						<ul class="cv-list">
							{#each achievements as item, index (index)}
								<li>{item}</li>
							{/each}
						</ul>
					{/if}
				</div>
			{/each}
		</section>
	{/if}

	{#if cv.education.length}
		<section class="cv-section">
			<h2 class="cv-section-title">Education</h2>
			{#each cv.education as edu (edu.id)}
				{@const dates = formatOptionalRange(edu.startDate, edu.endDate)}
				{@const details = visibleLines(edu.details)}
				<div class="cv-entry" data-cv-block>
					<div class="cv-entry-head">
						<div>
							<h3 class="cv-entry-title">{edu.degree}</h3>
							<p class="cv-entry-sub">
								{edu.institution}{visibleText(edu.location) ? ` · ${visibleText(edu.location)}` : ''}
							</p>
						</div>
						{#if dates}
							<div class="cv-entry-meta">{dates}</div>
						{/if}
					</div>
					{#if details.length}
						<ul class="cv-list">
							{#each details as detail, index (index)}
								<li>{detail}</li>
							{/each}
						</ul>
					{/if}
				</div>
			{/each}
		</section>
	{/if}

	{#if cv.skills.length}
		<section class="cv-section">
			<h2 class="cv-section-title">Skills</h2>
			<div class="cv-skills-grid">
				{#each cv.skills as skill (skill.id)}
					{@const keywords = visibleLines(skill.keywords)}
					<div class="cv-skill-row" data-cv-block>
						<strong>{skill.name}</strong>
						{#if keywords.length}
							<span> — {keywords.join(', ')}</span>
						{/if}
					</div>
				{/each}
			</div>
		</section>
	{/if}

	{#if cv.projects.length}
		<section class="cv-section">
			<h2 class="cv-section-title">Projects</h2>
			{#each cv.projects as project (project.id)}
				{@const highlights = visibleLines(project.highlights)}
				<div class="cv-entry" data-cv-block>
					<h3 class="cv-entry-title">{project.name}</h3>
					{#if visibleText(project.description)}<p>{visibleText(project.description)}</p>{/if}
					{#if highlights.length}
						<ul class="cv-list">
							{#each highlights as highlight, index (index)}
								<li>{highlight}</li>
							{/each}
						</ul>
					{/if}
				</div>
			{/each}
		</section>
	{/if}

	{#if cv.certifications.length}
		<section class="cv-section">
			<h2 class="cv-section-title">Certifications</h2>
			{#each cv.certifications as cert (cert.id)}
				{@const issuer = visibleText(cert.issuer)}
				{@const when = isCalendarDate(cert.date) ? cert.date : ''}
				<div class="cv-entry" data-cv-block>
					<h3 class="cv-entry-title">{cert.name}</h3>
					{#if issuer || when}
						<p class="cv-entry-sub">
							{issuer}{issuer && when ? ` · ${when}` : when}
						</p>
					{/if}
				</div>
			{/each}
		</section>
	{/if}

	{#if cv.languages.length}
		<section class="cv-section">
			<h2 class="cv-section-title">Languages</h2>
			<ul class="cv-list" data-cv-block>
				{#each cv.languages as lang (lang.id)}
					<li>{lang.language}{visibleText(lang.fluency) ? ` — ${visibleText(lang.fluency)}` : ''}</li>
				{/each}
			</ul>
		</section>
	{/if}

	{#each cv.customSections as section (section.id)}
		<section class="cv-section">
			<h2 class="cv-section-title">{section.title}</h2>
			{#each visibleLines(section.content) as paragraph, index (index)}
				<p data-cv-block>{paragraph}</p>
			{/each}
		</section>
	{/each}
</article>
