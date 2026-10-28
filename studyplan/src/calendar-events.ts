import { activeOccurrences } from './model';
import type { Occurrence, Plan, Slot } from './model';

export type CalendarEvent = Occurrence & {
  slot: Slot;
  selected: boolean;
  context: boolean;
  conflictLabels: string[];
};

/** Keep the user's active selections beside filtered options, without duplicating them. */
export function calendarEvents(all: Slot[], shown: Slot[], plan: Plan, browsing: boolean): CalendarEvent[] {
  const selected = new Set(plan.selected);
  const selectedEvents = all.filter(s => selected.has(s.id)).flatMap(slot =>
    activeOccurrences(slot, plan).map(event => ({ ...event, slot })));
  const visible = new Map(shown.map(slot => [slot.id, slot]));
  if (browsing) for (const slot of all) if (selected.has(slot.id)) visible.set(slot.id, slot);
  return [...visible.values()].flatMap(slot => activeOccurrences(slot, plan).map(event => ({
    ...event,
    slot,
    selected: selected.has(slot.id),
    context: browsing && selected.has(slot.id),
    conflictLabels: selectedEvents.filter(other => other.slot.id !== slot.id &&
      other.date === event.date && other.start < event.end && event.start < other.end)
      .map(other => `${other.slot.course.toUpperCase()} · ${other.slot.label} (${other.start}–${other.end})`),
  })));
}
