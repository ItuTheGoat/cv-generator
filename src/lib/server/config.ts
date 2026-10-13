export function getOrigin(fallbackHost = '127.0.0.1:5173'): string {
	const fromEnv = process.env.ORIGIN?.trim();
	if (fromEnv) return fromEnv.replace(/\/$/, '');
	return `http://${fallbackHost}`;
}

export function getPageWarningLimit(): number {
	const raw = process.env.CV_PAGE_WARNING_LIMIT;
	const parsed = raw ? Number(raw) : 2;
	return Number.isFinite(parsed) && parsed > 0 ? parsed : 2;
}
