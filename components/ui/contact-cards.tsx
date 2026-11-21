'use client';

/**
 * ContactCards — the whole contact row of a personal site in one component:
 *
 *   • a copy-email button that never leaves the page (clipboard API, then a
 *     `execCommand` fallback, then it just shows the address to copy by hand),
 *   • a GitHub icon whose card carries a year of contributions, fetched in the
 *     browser or passed in,
 *   • any other links you want, each with its own card.
 *
 * Moving between the icons cross-fades the cards in the direction you travel
 * while the container morphs between their sizes and positions, so the whole
 * thing reads as one object instead of a set of popups.
 */

import {
	Fragment,
	type ReactNode,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from 'react';

export type ContributionDay = {
	/** ISO date, `YYYY-MM-DD`. */
	date: string;
	count: number;
	/** 0–4. Derived from `count` when omitted. */
	level?: number;
};

export type ContactLink = {
	label: string;
	href: string;
	icon: ReactNode;
	/** Shown above the row while this link is hovered. Give it a fixed width. */
	card: ReactNode;
};

type Props = {
	/** Adds the copy button. Copying happens in place: no mailto, no navigation. */
	email?: string;
	/** Adds the GitHub icon and its card with the contribution graph. */
	github?: {
		username: string;
		/** Defaults to github.com/<username>. */
		url?: string;
		/** Pass a year of days to skip the client-side fetch. */
		days?: ContributionDay[];
		avatar?: ReactNode;
	};
	/** Extra links, rendered after GitHub. */
	links?: ContactLink[];
	labels?: { copy?: string; copied?: string; contributions?: string };
	locale?: string;
	className?: string;
};

const API = 'https://github-contributions-api.jogruber.de/v4';

const KEYFRAMES = `
@media (prefers-reduced-motion: no-preference) {
@keyframes cc-in {
	from { opacity: 0; transform: translateX(calc(var(--cc-dir, 1) * 64px)) scale(0.97); filter: blur(6px); }
}
@keyframes cc-out {
	to { opacity: 0; transform: translateX(calc(var(--cc-dir, 1) * -64px)) scale(0.97); filter: blur(6px); }
}
}`;

export default function ContactCards({
	email,
	github,
	links = [],
	labels,
	locale,
	className = '',
}: Props) {
	const [open, setOpen] = useState(false);
	const [index, setIndex] = useState(0);
	const [direction, setDirection] = useState(1);
	/** The card being replaced, kept mounted until its exit animation ends. */
	const [outgoing, setOutgoing] = useState<{ index: number; direction: number; key: number }>();
	const [entryKey, setEntryKey] = useState(0);
	const [box, setBox] = useState({ left: 0, width: 0, height: 0 });
	/** The first card appears in place; only later ones morph from the previous size. */
	const [morphing, setMorphing] = useState(false);

	const contentRef = useRef<HTMLDivElement>(null);
	const linkRefs = useRef<(HTMLAnchorElement | null)[]>([]);

	const items: ContactLink[] = [
		...(github
			? [
					{
						label: 'GitHub',
						href: github.url ?? `https://github.com/${github.username}`,
						icon: <GithubIcon />,
						card: (
							<GithubCard
								github={github}
								locale={locale}
								contributionsLabel={labels?.contributions ?? 'contributions in the last year'}
							/>
						),
					},
				]
			: []),
		...links,
	];

	useLayoutEffect(() => {
		const content = contentRef.current;
		const link = linkRefs.current[index];
		if (!open || !content || !link) return;
		function measure() {
			if (!content || !link) return;
			const width = content.offsetWidth;
			const bounds = link.getBoundingClientRect();
			const center = Math.max(width / 2 + 8, Math.min(bounds.left + bounds.width / 2, document.documentElement.clientWidth - width / 2 - 8));
			setBox({ left: link.offsetLeft + center - bounds.left, width, height: content.offsetHeight });
		}
		measure();
		const observer = new ResizeObserver(measure);
		observer.observe(content);
		window.addEventListener('resize', measure);
		return () => { observer.disconnect(); window.removeEventListener('resize', measure); };
	}, [open, index]);

	// `animationend` never fires while the tab is hidden or motion is reduced,
	// so the leaving card is dropped on a timer as well.
	useEffect(() => {
		if (!outgoing) return;
		const timeout = setTimeout(() => setOutgoing(undefined), 400);
		return () => clearTimeout(timeout);
	}, [outgoing]);

	function handleEnter(next: number) {
		if (open && next === index) return;
		if (open) {
			setOutgoing({ index, direction: Math.sign(next - index) || 1, key: entryKey });
			setDirection(Math.sign(next - index) || 1);
		}
		setMorphing(open);
		setIndex(next);
		setEntryKey((key) => key + 1);
		setOpen(true);
	}

	return (
		<div className={`flex items-center gap-2 ${className}`}>
			<style>{KEYFRAMES}</style>

			{email && <CopyEmailButton email={email} labels={labels} />}

			<div
				className="relative z-10 flex"
				onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}
				onKeyDown={(event) => { if (event.key === 'Escape') setOpen(false); }}
				onMouseLeave={() => {
					setOpen(false);
					setOutgoing(undefined);
					setMorphing(false);
				}}
			>
				{items.map((item, itemIndex) => (
					<a
						key={item.label}
						ref={(node) => {
							linkRefs.current[itemIndex] = node;
						}}
						href={item.href}
						target="_blank"
						rel="noopener noreferrer"
						aria-label={item.label}
						onMouseEnter={() => handleEnter(itemIndex)}
						onFocus={() => handleEnter(itemIndex)}
						className="z-10 p-2 text-[var(--notebook-muted)] transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
					>
						{item.icon}
					</a>
				))}

				<div
					aria-hidden={!open}
					// `contain: paint` keeps the rounded clip on the compositor: the cards animate
					// with a blur filter, and without it Chrome lets the filtered layer paint
					// outside the rounded corners while the container is morphing.
					style={{ left: box.left, width: box.width, height: box.height, contain: 'paint' }}
					className={`absolute bottom-[calc(100%+0.5rem)] flex origin-bottom items-end overflow-hidden rounded-3xl ${github && index === 0 ? 'github-contact-surface' : 'bg-[var(--floating-surface)] dark:bg-zinc-900'} backdrop-blur-md shadow-2xl ring ring-zinc-900/10 dark:ring-zinc-100/10
						${
							morphing
								? 'transition-[left,width,height,opacity,transform] duration-[400ms] ease-[cubic-bezier(0.32,0.72,0,1)]'
								: 'transition-[opacity,transform] duration-200 ease-out'
						}
						${
							open
								? '-translate-x-1/2 scale-100 opacity-100'
								: 'pointer-events-none -translate-x-1/2 translate-y-1 scale-[0.97] opacity-0'
						}`}
				>
					{outgoing && (
						<div
							key={`out-${outgoing.key}`}
							onAnimationEnd={(event) => {
								if (event.target === event.currentTarget) setOutgoing(undefined);
							}}
							style={
								{
									'--cc-dir': outgoing.direction,
									animation: 'cc-out 0.35s cubic-bezier(0.32,0.72,0,1) forwards',
								} as React.CSSProperties
							}
							className="absolute"
						>
							{items[outgoing.index]?.card}
						</div>
					)}
					<div
						key={`in-${entryKey}`}
						ref={contentRef}
						style={
							{
								'--cc-dir': direction,
								animation: morphing
									? 'cc-in 0.4s cubic-bezier(0.32,0.72,0,1) backwards'
									: undefined,
							} as React.CSSProperties
						}
						className="absolute"
					>
						{items[index]?.card}
					</div>
				</div>

				{/* Pointer bridge, so the card stays open while moving towards it. */}
				<div className="absolute inset-0 -top-2" />
			</div>
		</div>
	);
}

/**
 * Copies without ever leaving the page: the async clipboard first, then the
 * legacy `execCommand` path (it still works where the clipboard API is blocked,
 * e.g. inside a sandboxed iframe), and if both fail the button shows the address
 * so it can be copied by hand.
 */
async function copyText(text: string): Promise<boolean> {
	try {
		await navigator.clipboard.writeText(text);
		return true;
	} catch {
		/* keep going */
	}
	try {
		const field = document.createElement('textarea');
		field.value = text;
		field.setAttribute('readonly', '');
		field.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
		document.body.append(field);
		field.select();
		const copied = document.execCommand('copy');
		field.remove();
		return copied;
	} catch {
		return false;
	}
}

export function CopyEmailButton({
	email,
	labels,
	className = '',
}: {
	email: string;
	labels?: { copy?: string; copied?: string };
	className?: string;
}) {
	const [state, setState] = useState<'idle' | 'copied' | 'manual'>('idle');
	const timeout = useRef<ReturnType<typeof setTimeout>>(undefined);

	useEffect(() => () => clearTimeout(timeout.current), []);

	async function copy() {
		const copied = await copyText(email);
		setState(copied ? 'copied' : 'manual');
		clearTimeout(timeout.current);
		timeout.current = setTimeout(() => setState('idle'), copied ? 3000 : 8000);
	}

	const label = labels?.copy ?? 'Copy my email';
	const copiedLabel = labels?.copied ?? 'Email copied!';
	if (state === 'manual') {
		return <input aria-label="Email address to copy" className="min-w-0 max-w-full rounded-md border px-2 py-1" readOnly value={email} autoFocus onFocus={event => event.currentTarget.select()} />;
	}

	return (
		<button
			type="button"
			onClick={copy}
			aria-label={label}
			className={`relative flex cursor-pointer items-center justify-center rounded-2xl bg-zinc-900 px-4 py-2 font-medium text-zinc-50 transition-all hover:bg-zinc-900/90 active:scale-95 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-100/90 ${className}`}
		>
			<span
				className={`transition-all duration-500 ${state === 'idle' ? '' : 'opacity-0 blur-[2px]'}`}
			>
				{label}
			</span>
			<span
				aria-live="polite"
				className={`absolute transition-all duration-500 ${state === 'idle' ? 'opacity-0 blur-[2px]' : ''}`}
			>
				{state === 'copied' ? copiedLabel : ''}
			</span>
		</button>
	);
}

function GithubCard({
	github,
	locale,
	contributionsLabel,
}: {
	github: NonNullable<Props['github']>;
	locale?: string;
	contributionsLabel: string;
}) {
	const [fetched, setFetched] = useState<ContributionDay[]>();

	useEffect(() => {
		if (github.days) return;
		let cancelled = false;

		fetch(`${API}/${github.username}?y=last`)
			.then((response) => (response.ok ? response.json() : Promise.reject(response.status)))
			.then((data: { contributions: ContributionDay[] }) => {
				if (!cancelled) setFetched(data.contributions);
			})
			// The graph is decorative: an empty grid beats a crash.
			.catch(() => !cancelled && setFetched([]));

		return () => {
			cancelled = true;
		};
	}, [github.days, github.username]);

	const days = github.days ?? fetched ?? [];
	const total = days.reduce((sum, day) => sum + day.count, 0);

	return (
		<div className="flex w-[min(22rem,calc(100vw-4rem))] flex-col gap-3 p-3">
			<div className="flex items-center gap-3">
				{github.avatar ?? (
					<span className="block size-10 shrink-0 rounded-full bg-gradient-to-br from-orange-300 to-red-500" />
				)}
				<div className="flex flex-col">
					<span className="font-medium">{github.username}</span>
					<span className="text-sm text-[var(--github-muted)]">
						{total.toLocaleString(locale)} {contributionsLabel}
					</span>
				</div>
			</div>
			<ContributionGraph days={days} locale={locale} />
		</div>
	);
}

/** A year of activity in a 7-row grid, with a tooltip that stays inside the card. */
export function ContributionGraph({
	days,
	locale,
	className = '',
}: {
	days: ContributionDay[];
	locale?: string;
	className?: string;
}) {
	const [hovered, setHovered] = useState<{ day: ContributionDay; left: number; top: number }>();
	const containerRef = useRef<HTMLDivElement>(null);
	const tooltipRef = useRef<HTMLDivElement>(null);

	const weeks = useMemo(() => {
		if (days.length === 0) return [];
		const result: (ContributionDay | undefined)[][] = [];
		let week: (ContributionDay | undefined)[] = Array.from({
			length: new Date(`${days[0].date}T00:00:00Z`).getUTCDay(),
		});
		for (const day of days) {
			week.push(day);
			if (week.length === 7) {
				result.push(week);
				week = [];
			}
		}
		if (week.length > 0)
			result.push([...week, ...Array.from<undefined>({ length: 7 - week.length })]);
		return result;
	}, [days]);

	const formatter = useMemo(
		() => new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', timeZone: 'UTC' }),
		[locale],
	);

	const containerWidth = containerRef.current?.clientWidth ?? 0;
	const tooltipWidth = tooltipRef.current?.clientWidth ?? 0;
	const left = hovered
		? Math.min(Math.max(hovered.left, tooltipWidth / 2), containerWidth - tooltipWidth / 2)
		: 0;

	return (
		<div
			ref={containerRef}
			onPointerOver={(event) => {
				const target = event.target as HTMLElement;
				const { date, count } = target.dataset;
				if (!date) return setHovered(undefined);
				setHovered({
					day: { date, count: Number(count) },
					left: target.offsetLeft + target.offsetWidth / 2,
					top: target.offsetTop,
				});
			}}
			onPointerLeave={() => setHovered(undefined)}
			className={`relative flex w-full flex-col gap-2 ${className}`}
		>
			<div
				className="grid grid-flow-col grid-rows-[repeat(7,minmax(0,1fr))] gap-[1.5px]"
				style={{ gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))` }}
			>
				{weeks.map((week, weekIndex) => (
					<Fragment key={weekIndex}>
						{week.map((day, dayIndex) => (
							<div
								key={dayIndex}
								data-date={day?.date}
								data-count={day?.count}
								className="aspect-square w-full rounded-[1.5px]"
								style={day ? { backgroundColor: `var(--github-level-${day.level ?? levelOf(day.count)})` } : undefined}
							/>
						))}
					</Fragment>
				))}
			</div>

			<div
				ref={tooltipRef}
				style={{ left, top: hovered?.top ?? 0 }}
				className={`pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+0.25rem)] rounded-xl bg-zinc-900 px-2 py-1 text-xs whitespace-nowrap text-zinc-100 shadow-lg transition-opacity duration-100 dark:bg-zinc-950 ${
					hovered ? 'opacity-100' : 'opacity-0'
				}`}
			>
				{hovered
					? `${hovered.day.count} contribution${hovered.day.count === 1 ? '' : 's'} · ${formatter.format(new Date(hovered.day.date))}`
					: ''}
			</div>
		</div>
	);
}

function levelOf(count: number): 0 | 1 | 2 | 3 | 4 {
	return count === 0 ? 0 : count < 3 ? 1 : count < 6 ? 2 : count < 9 ? 3 : 4;
}

function GithubIcon() {
	return (
		<svg viewBox="0 0 24 24" className="size-6 fill-current">
			<path d="M12 .5a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.3 4.7 18.3 5 18.3 5c.6 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .5Z" />
		</svg>
	);
}
