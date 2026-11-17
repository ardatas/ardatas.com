import {activeOccurrences, addDays, monday, validDate} from './model';
import type {Plan, Slot} from './model';

export type ClearScope = 'daily' | 'weekly' | 'all';

/** Clear dated selections with exclusions so other weeks keep their recurring slots. */
export function clearSelections(slots: Slot[], plan: Plan, visited: string[], scope: ClearScope, date: string) {
 if (scope === 'all') return {plan: {...plan, selected: [], excluded: []}, visited: [], count: plan.selected.length + visited.length};
 if (!validDate(date)) return {plan, visited, count: 0};
 const from = scope === 'weekly' ? monday(date) : date;
 const to = scope === 'weekly' ? addDays(from, 6) : date;
 const inRange = (day: string) => day >= from && day <= to;
 const recurring = slots.filter(s => plan.selected.includes(s.id)).flatMap(s => activeOccurrences(s, plan)).filter(o => inRange(o.date)).map(o => o.id);
 const visits = slots.flatMap(s => s.occurrences).filter(o => visited.includes(o.id) && inRange(o.date)).map(o => o.id);
 const removed = new Set([...recurring, ...visits]);
 return {
  plan: {...plan, excluded: [...new Set([...plan.excluded, ...recurring])]},
  visited: visited.filter(id => !removed.has(id)),
  count: removed.size,
 };
}
