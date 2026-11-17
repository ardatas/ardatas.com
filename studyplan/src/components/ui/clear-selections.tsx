import {useEffect, useState} from 'react';
import {clearSelections, type ClearScope} from '../../clear-plan';
import {addDays, monday, validDate, type Plan, type Slot} from '../../model';
import {formatDate} from './event-manager';

export function ClearSelections({slots, plan, visited, today, shared, onClear, onCancel}: {
 slots: Slot[]; plan: Plan; visited: string[]; today: string; shared: boolean;
 onClear: (result: ReturnType<typeof clearSelections>) => void; onCancel: () => void;
}) {
 const [scope, setScope] = useState<ClearScope>('daily');
 const [date, setDate] = useState(today);
 const [confirm, setConfirm] = useState(false);
 // A changed plan must be reviewed again before it can be cleared.
 useEffect(() => setConfirm(false), [plan, visited]);
 const result = clearSelections(slots, plan, visited, scope, date);
 const period = scope === 'all' ? 'your entire plan' : !validDate(date) ? 'the selected period' : scope === 'daily'
  ? formatDate(date, {weekday:'long', day:'numeric', month:'long', year:'numeric'})
  : `${formatDate(monday(date))} – ${formatDate(addDays(monday(date), 6), {day:'numeric', month:'short', year:'numeric'})}`;
 return <div className="clear-selections">
  {confirm ? <>
   <p role="status">Clear {result.count} {scope === 'all' ? 'selections' : 'sessions'} from {period}?</p>
   <p className="muted">{scope === 'all' ? 'Recurring slots and single visits will be removed. Your filters and schedule dates will stay the same.' : 'Recurring sessions in this period will be skipped. Other dates will stay in your plan. Single visits in this period will be removed.'}</p>
   <div className="clear-actions"><button autoFocus onClick={onCancel}>Keep selections</button><button className="reset-confirm" disabled={!result.count} onClick={() => onClear(result)}>Confirm deletion</button></div>
   <button className="text-button" onClick={() => setConfirm(false)}>Change options</button>
  </> : <>
   <label className="field-label">Clear scope<select aria-label="Clear scope" value={scope} onChange={e => setScope(e.target.value as ClearScope)}><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="all">All selections</option></select></label>
   {scope !== 'all' && <label className="field-label">{scope === 'weekly' ? 'Week containing' : 'Date'}<input aria-label="Clear date" type="date" value={date} min="2026-10-12" max="2027-02-28" onChange={e => setDate(e.target.value)}/></label>}
   <p>{period}</p>
   <p className="muted">{scope === 'all' ? 'Clear every recurring slot and single visit added to your plan.' : 'Clear only sessions added to your plan, across all courses. Weekly runs Monday–Sunday.'}</p>
   <p role="status">{result.count ? `${result.count} ${scope === 'all' ? 'selections' : 'sessions'} to clear.` : 'No selections to clear in this scope.'}</p>
   <div className="clear-actions"><button onClick={onCancel}>Cancel</button><button disabled={!result.count} onClick={() => setConfirm(true)}>Review deletion</button></div>
  </>}
  {shared && <p className="muted">Only this shared preview will change. Your saved plan and private visits stay unchanged until you save a copy.</p>}
 </div>;
}
