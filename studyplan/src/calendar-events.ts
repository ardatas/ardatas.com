import { activeOccurrences } from './model';
import type { Occurrence, Plan, Slot } from './model';

export type CalendarEvent = Occurrence & {
  slot: Slot;
  selected: boolean;
  visited?: boolean;
  context: boolean;
  conflictLabels: string[];
};

/** Keep the user's active selections beside filtered options, without duplicating them. */
export function calendarEvents(all: Slot[], shown: Slot[], plan: Plan, browsing: boolean, visits: string[] = []): CalendarEvent[] {
  const selected = new Set(plan.selected);
  const visited = new Set(visits);
  const occurrences = (slot: Slot) => {
    const events = new Map(activeOccurrences(slot, plan).map(o => [o.id, o]));
    for (const o of slot.occurrences) if (visited.has(o.id)) events.set(o.id, o);
    return [...events.values()];
  };
  const selectedEvents = all.flatMap(slot => occurrences(slot).filter(o => selected.has(slot.id) || visited.has(o.id)).map(event => ({ ...event, slot })));
  const shownIds = new Set(shown.map(slot => slot.id));
  const visible = new Map(shown.map(slot => [slot.id, slot]));
  if (browsing) for (const slot of all) if (selected.has(slot.id)) visible.set(slot.id, slot);
  for (const slot of all) if (slot.occurrences.some(o => visited.has(o.id))) visible.set(slot.id, slot);
  return [...visible.values()].flatMap(slot => occurrences(slot).filter(event =>
    (browsing && shownIds.has(slot.id)) || selected.has(slot.id) || visited.has(event.id)
  ).map(event => ({
    ...event,
    slot,
    selected: selected.has(slot.id) || visited.has(event.id),
    visited: visited.has(event.id),
    context: browsing && (selected.has(slot.id) || visited.has(event.id)),
    conflictLabels: selectedEvents.filter(other => other.slot.id !== slot.id &&
      other.date === event.date && other.start < event.end && event.start < other.end)
      .map(other => `${other.slot.course.toUpperCase()} · ${other.slot.label} (${other.start}–${other.end})`),
  })));
}
