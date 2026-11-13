import { berlinNow, monday } from './model';
import type { Occurrence, Slot } from './model';

export const tutorWeekKey = 'studyplan:tutor-week:v1';
export type TutorWeek = { week: string; visited: string[]; hidden: string[]; restored: string[] };
export const emptyTutorWeek = (date: string): TutorWeek => ({ week: monday(date), visited: [], hidden: [], restored: [] });
export function canVisit(slot: Slot, event: Occurrence, date: string) {
  return slot.kind === 'Tutorial' && monday(event.date) === monday(date) && ['scheduled', 'provisional'].includes(event.status);
}
export function normalizeTutorWeek(value: unknown, slots: Slot[], date: string): TutorWeek {
  const empty = emptyTutorWeek(date);
  if (!value || typeof value !== 'object' || !('week' in value) || value.week !== empty.week) return empty;
  const state = value as Partial<TutorWeek>;
  const validIds = new Set(slots.flatMap(s => s.occurrences.filter(o => canVisit(s, o, date)).map(o => o.id)));
  const modules = new Set(slots.filter(s => s.kind === 'Tutorial').map(s => s.course));
  const clean = (input: unknown, allowed: Set<string>) => Array.isArray(input) ? [...new Set(input.filter((v): v is string => typeof v === 'string' && allowed.has(v)))] : [];
  return { week: empty.week, visited: clean(state.visited, validIds), hidden: clean(state.hidden, modules), restored: clean(state.restored, modules) };
}
export type TutorChoice = { slot: Slot; event: Occurrence };
/** One equal slice per module, containing its earliest remaining start time today. */
export function upcomingTutors(slots: Slot[], now = berlinNow()): { course: string; choices: TutorChoice[] }[] {
  const groups = new Map<string, TutorChoice[]>();
  for (const slot of slots.filter(s => s.kind === 'Tutorial')) {
    for (const event of slot.occurrences.filter(o => o.date === now.date && o.start >= now.time && o.status === 'scheduled')) {
      const existing = groups.get(slot.course);
      if (!existing || event.start < existing[0].event.start) groups.set(slot.course, [{ slot, event }]);
      else if (event.start === existing[0].event.start) existing.push({ slot, event });
    }
  }
  return [...groups].map(([course, choices]) => ({ course, choices })).sort((a,b) => a.choices[0].event.start.localeCompare(b.choices[0].event.start) || a.course.localeCompare(b.course));
}
export function visitedModules(slots: Slot[], state: TutorWeek) {
  return new Set(slots.filter(s => s.occurrences.some(o => state.visited.includes(o.id))).map(s => s.course));
}
