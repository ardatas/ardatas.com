export interface Occurrence { id: string; date: string; start: string; end: string; room: string; tutor: string; status: string; source: string; sourceStatus?: string; conflictReason?: string; conflictSource?: string }
export interface Slot { id: string; course: string; kind: string; label: string; source: string; checkedAt: string; note: string; occurrences: Occurrence[] }
export interface Plan { version: 1; selected: string[]; from: string; to: string; excluded: string[] }
export const DEFAULT_PLAN: Plan = { version: 1, selected: [], from: '2026-10-28', to: '2027-02-05', excluded: [] };
export const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const minutes = (time: string) => Number(time.slice(0,2))*60+Number(time.slice(3,5));
export function addDays(date: string, amount: number) { const d = new Date(date+'T12:00:00Z'); d.setUTCDate(d.getUTCDate()+amount); return d.toISOString().slice(0,10); }
export function weekday(date: string) { return (new Date(date+'T12:00:00Z').getUTCDay()+6)%7; }
export function monday(date: string) { return addDays(date, -weekday(date)); }
export function berlinNow(now = new Date()) {
 const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Berlin',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now).map(p=>[p.type,p.value]));
 return {date:`${parts.year}-${parts.month}-${parts.day}`,time:`${parts.hour}:${parts.minute}`};
}
export function validDate(value: unknown): value is string { return typeof value==='string' && /^20\d\d-\d\d-\d\d$/.test(value) && !isNaN(Date.parse(value)) && new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value; }
export function parsePlan(raw: string, slots: Slot[]): Plan {
 if(raw.length>20000) throw new Error('Schedule link is too long.');
 const p = JSON.parse(raw); const ids = new Set(slots.map(s=>s.id)); const occurrences = new Set(slots.flatMap(s=>s.occurrences.map(o=>o.id)));
 if(p.version!==1 || !Array.isArray(p.selected) || !Array.isArray(p.excluded) || !validDate(p.from) || !validDate(p.to) || p.from>p.to || p.from<'2026-10-12' || p.to>'2027-02-28') throw new Error('Invalid schedule. Use dates between 12 October 2026 and 28 February 2027.');
 if(p.selected.some((id:unknown)=>typeof id!=='string'||!ids.has(id)) || p.excluded.some((id:unknown)=>typeof id!=='string'||!occurrences.has(id))) throw new Error('This schedule contains slots from a different data version.');
 return {version:1,selected:[...new Set<string>(p.selected)],from:p.from,to:p.to,excluded:[...new Set<string>(p.excluded)]};
}
export function encodePlan(plan:Plan) { return '#plan='+encodeURIComponent(JSON.stringify(plan)); }
export function activeOccurrences(slot: Slot, plan:Plan, provisional=true) { return slot.occurrences.filter(o=>o.date>=plan.from&&o.date<=plan.to&&(o.status==='scheduled'||(provisional&&o.status==='provisional'))&&!plan.excluded.includes(o.id)); }
export function conflicts(slots:Slot[],plan:Plan) {
 const entries=slots.filter(s=>plan.selected.includes(s.id)).flatMap(slot=>activeOccurrences(slot,plan).map(event=>({slot,event})));
 const pairs:{a:typeof entries[number];b:typeof entries[number]}[]=[];
 for(let i=0;i<entries.length;i++) for(let j=i+1;j<entries.length;j++) { const a=entries[i],b=entries[j]; if(a.event.date===b.event.date&&a.event.start<b.event.end&&b.event.start<a.event.end) pairs.push({a,b}); }
 return pairs;
}
/** Assign interval lanes per connected overlap cluster, including transitive overlaps. */
export function layout<T extends {start:string;end:string}>(events:T[]):(T&{lane:number;lanes:number})[] {
 const sorted=[...events].sort((a,b)=>a.start.localeCompare(b.start)||b.end.localeCompare(a.end)); const result:(T&{lane:number;lanes:number})[]=[]; let cluster:(T&{lane:number;lanes:number})[]=[]; let end=''; let laneEnds:string[]=[];
 const flush=()=>{for(const e of cluster) e.lanes=laneEnds.length; result.push(...cluster);cluster=[];laneEnds=[];};
 for(const event of sorted) {if(cluster.length&&event.start>=end)flush();let lane=laneEnds.findIndex(e=>e<=event.start);if(lane<0)lane=laneEnds.length;laneEnds[lane]=event.end;cluster.push({...event,lane,lanes:1});end=cluster.length===1?event.end:(end>event.end?end:event.end);}
 flush();return result;
}

/** Connected overlap clusters keep desktop weekdays fixed-width without hiding options. */
export function groupOverlapping<T extends {start:string;end:string}>(events:T[]) {
 const groups:{start:string;end:string;events:T[]}[]=[];
 for(const event of [...events].sort((a,b)=>a.start.localeCompare(b.start)||a.end.localeCompare(b.end))){
  const last=groups.at(-1);
  if(last&&event.start<last.end){last.events.push(event);if(event.end>last.end)last.end=event.end;}
  else groups.push({start:event.start,end:event.end,events:[event]});
 }
 return groups;
}
