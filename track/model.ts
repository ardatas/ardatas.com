export type Tag = { id: string; name: string; color: string; emoji: string };
export type Interval = { start: number; end: number | null };
export type Session = {
  id: string;
  tag_id: string;
  started_at: number;
  ended_at: number | null;
  timezone: string;
  intervals: Interval[];
  rating: number | null;
  revision: number;
};
export type Notebook = { tags: Tag[]; sessions: Session[] };

export const colors = [
  "#537bc4",
  "#42816e",
  "#9268ab",
  "#bf8250",
  "#bd637c",
  "#467e96",
  "#868044",
  "#637189",
];
export const starterTags: Tag[] = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    name: "Reading",
    color: colors[0],
    emoji: "📖",
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    name: "Coursework",
    color: colors[1],
    emoji: "🎓",
  },
  {
    id: "00000000-0000-4000-8000-000000000003",
    name: "Practice",
    color: colors[2],
    emoji: "✏️",
  },
];

export function newSession(tag: Tag, now: number): Session {
  return {
    id: crypto.randomUUID(),
    tag_id: tag.id,
    started_at: now,
    ended_at: null,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    intervals: [{ start: now, end: null }],
    rating: null,
    revision: 0,
  };
}
export function running(s: Session) {
  return s.intervals.at(-1)?.end === null;
}

export function transition(
  s: Session,
  action: "pause" | "resume" | "stop",
  now: number,
): Session {
  const last = s.intervals.at(-1)!;
  if (
    s.ended_at !== null ||
    (action === "pause" && !running(s)) ||
    (action === "resume" && running(s))
  ) {
    throw new Error("This session has already changed.");
  }
  const at = Math.max(now, last.end ?? last.start);
  const intervals =
    action === "resume"
      ? [...s.intervals, { start: at, end: null }]
      : s.intervals.map((i) => (i.end === null ? { ...i, end: at } : i));
  return {
    ...s,
    intervals,
    ended_at: action === "stop" ? at : null,
    revision: s.revision + 1,
  };
}

export function elapsed(
  s: Session,
  now: number,
  from = -Infinity,
  until = Infinity,
) {
  return s.intervals.reduce(
    (sum, i) =>
      sum +
      Math.max(0, Math.min(i.end ?? now, until) - Math.max(i.start, from)),
    0,
  );
}
export function dayStart(t: number) {
  const d = new Date(t);
  return d.setHours(0, 0, 0, 0);
}
export function shiftDay(t: number, offset: number) {
  const d = new Date(dayStart(t));
  return d.setDate(d.getDate() + offset);
}
export const clockTime = (t: number) =>
  new Date(t).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
export function duration(ms: number) {
  const minutes = Math.floor(ms / 60000);
  return minutes >= 60
    ? Math.floor(minutes / 60) + "h " + (minutes % 60) + "m"
    : minutes
      ? minutes + "m"
      : Math.floor(ms / 1000) + "s";
}
