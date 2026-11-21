import { useLayoutEffect, useRef, type CSSProperties } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import {
  clockTime,
  dayStart,
  shiftDay,
  type Notebook,
  type Session,
} from "./model";

const hour = 3600000;
const row = 64;
export function DailyCalendar({
  data,
  day,
  now,
  onDay,
  onSession,
}: {
  data: Notebook;
  day: number;
  now: number;
  onDay: (t: number) => void;
  onSession: (s: Session) => void;
}) {
  const tomorrow = shiftDay(day, 1);
  const monday = shiftDay(day, -((new Date(day).getDay() + 6) % 7));
  const today = dayStart(now);
  const scroll = useRef<HTMLDivElement>(null);
  const blocks = data.sessions
    .flatMap((s) =>
      s.intervals.flatMap((i) => {
        const end = i.end ?? now;
        if (i.start >= tomorrow || end < day || (end === day && i.start < day))
          return [];
        const start = Math.max(day, i.start);
        return [
          {
            s,
            start,
            end: Math.min(tomorrow, end),
            tag: data.tags.find((t) => t.id === s.tag_id)!,
          },
        ];
      }),
    )
    .sort((a, b) => a.start - b.start);
  const first = blocks[0]?.start;
  const pastAnchor = day === today ? null : (first ?? day + 9 * hour);
  useLayoutEffect(() => {
    const anchor = pastAnchor ?? Date.now();
    if (scroll.current)
      scroll.current.scrollTop = Math.max(
        0,
        ((anchor - day) / hour) * row - row * 1.45,
      );
  }, [day, today, pastAnchor]);
  return (
    <section className="panel calendar">
      <div className="panel-heading">
        <h2>
          <CalendarDays />
          Daily calendar
        </h2>
        <div className="day-nav">
          <button
            aria-label="Previous day"
            onClick={() => onDay(shiftDay(day, -1))}
          >
            <ChevronLeft />
          </button>
          <button onClick={() => onDay(today)}>Today</button>
          <button aria-label="Next day" onClick={() => onDay(tomorrow)}>
            <ChevronRight />
          </button>
        </div>
      </div>
      <div className="week-strip">
        {Array.from({ length: 7 }, (_, i) => {
          const d = shiftDay(monday, i);
          return (
            <button
              key={d}
              aria-pressed={d === day}
              aria-label={new Date(d).toDateString()}
              onClick={() => onDay(d)}
            >
              <span>
                {new Date(d).toLocaleDateString("en-GB", { weekday: "short" })}
              </span>
              <b>{new Date(d).getDate()}</b>
              {d === today && <i />}
            </button>
          );
        })}
      </div>
      <div className="day-label">
        <b>
          {new Date(day).toLocaleDateString("en-GB", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </b>
        <span>
          {Intl.DateTimeFormat()
            .resolvedOptions()
            .timeZone.replaceAll("_", " ")}
        </span>
      </div>
      <div
        ref={scroll}
        tabIndex={0}
        role="region"
        aria-label="Daily study timeline"
        className="timeline-scroll"
      >
        <div
          className="timeline"
          style={{ height: ((tomorrow - day) / hour) * row }}
        >
          {Array.from(
            { length: Math.ceil((tomorrow - day) / hour) },
            (_, i) => (
              <div key={i} className="hour" style={{ top: i * row }}>
                <span>{clockTime(day + i * hour)}</span>
              </div>
            ),
          )}
          {blocks.map(({ s, start, end, tag }, i) => (
            <button
              key={s.id + "-" + i}
              className="study-block"
              style={
                {
                  "--tag": tag.color,
                  top: ((start - day) / hour) * row,
                  height: Math.max(21, ((end - start) / hour) * row),
                } as CSSProperties
              }
              aria-label={
                tag.name + ", " + clockTime(start) + " to " + clockTime(end)
              }
              onClick={() => onSession(s)}
            >
              <span>
                {tag.emoji} {tag.name} · {clockTime(start)}–{clockTime(end)}
              </span>
            </button>
          ))}
          {day === today && (
            <div
              className="now-line"
              style={{ top: ((now - day) / hour) * row }}
            >
              <span>{clockTime(now)}</span>
            </div>
          )}
        </div>
      </div>
      <div className="calendar-foot">
        <span>
          <i />
          Current time
        </span>
        <span>{new Set(blocks.map((b) => b.s.id)).size} sessions</span>
      </div>
    </section>
  );
}
