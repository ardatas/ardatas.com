import { useEffect, useState } from "react";
import ActivityHeatmap, { type ActivityDay } from "@/components/ui/activity-heatmap";
import snapshot from "@/src/data/github-contributions.json";

const feed = "https://github-contributions-api.jogruber.de/v4/ardatas?y=last";
const dayMs = 86_400_000;
const dateFormat = new Intl.DateTimeFormat("en-US", {
  month: "short", day: "numeric", year: "numeric", timeZone: "UTC",
});

function isCalendar(value: unknown): value is (ActivityDay & { level: number })[] {
  if (!Array.isArray(value) || value.length < 365 || value.length > 372) return false;
  let previous: number | undefined;
  return value.every(day => {
    if (!day || typeof day.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(day.date)
      || !Number.isSafeInteger(day.count) || day.count < 0
      || !Number.isInteger(day.level) || day.level < 0 || day.level > 4) return false;
    const time = Date.parse(day.date + "T00:00:00Z");
    const valid = Number.isFinite(time) && (previous === undefined || time === previous + dayMs);
    previous = time;
    return valid;
  });
}

export default function GitHubActivity() {
  const [days, setDays] = useState(snapshot);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function refresh() {
      try {
        const response = await fetch(feed, { signal: controller.signal, credentials: "omit" });
        if (!response.ok) return;
        const { contributions } = await response.json();
        if (isCalendar(contributions) && !controller.signal.aborted) {
          setDays(current => contributions.at(-1)!.date >= current.at(-1)!.date ? contributions : current);
        }
      } catch {
        // Keep the last complete calendar, including its visible end date.
      }
    }
    void refresh();
    const interval = window.setInterval(() => {
      if (!document.hidden) void refresh();
    }, 15 * 60_000);
    return () => {
      controller.abort();
      window.clearInterval(interval);
    };
  }, []);

  const endDate = dateFormat.format(new Date(days.at(-1)!.date + "T00:00:00Z"));
  const period = `the year ending ${endDate}`;
  return (
    <ActivityHeatmap
      days={days}
      label={`GitHub contributions by @ardatas in ${period}`}
      period={period}
      selectedDate={selected}
      onSelectDate={setSelected}
      actions={<a className="social-link font-mono text-xs" href="https://github.com/ardatas">
        @ardatas <svg className="ui-icon" width="1em" height="1em" aria-hidden="true" focusable="false"><use href="/assets/hugeicons.svg#arrow-up-right-01" /></svg>
      </a>}
    />
  );
}
