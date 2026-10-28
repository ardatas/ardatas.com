import {test} from 'node:test';
import assert from 'node:assert/strict';
import ICAL from 'ical.js';
import {applyAssemblyException} from '../src/exceptions.ts';
import {slots} from '../src/data.ts';
import {exportICS,berlinUTC,foldLine,escapeICS} from '../src/calendar.ts';
import {DEFAULT_PLAN,parsePlan,encodePlan,activeOccurrences,conflicts,layout,monday,berlinNow} from '../src/model.ts';
const plan=(selected,extra={})=>({...DEFAULT_PLAN,selected,...extra});
test('all 125 sourced slots have valid, unique dated occurrences',()=>{
 assert.equal(slots.length,125);const ids=new Set();
 for(const s of slots){assert.match(s.source,/^https:\/\//);assert.ok(s.checkedAt);assert.ok(s.occurrences.length);for(const e of s.occurrences){assert.ok(!ids.has(e.id),e.id);ids.add(e.id);assert.ok(e.start<e.end);assert.match(e.date,/^202[67]-\d\d-\d\d$/);assert.ok(e.room);assert.ok(e.tutor);}}
});
test('Berlin times stay correct across DST and independent of host timezone',()=>{
 assert.equal(berlinUTC('2026-10-23','10:00'),'20261023T080000Z');assert.equal(berlinUTC('2026-10-28','10:00'),'20261028T090000Z');assert.equal(berlinUTC('2027-03-29','10:00'),'20270329T080000Z');assert.deepEqual(berlinNow(new Date('2026-10-27T23:30:00Z')),{date:'2026-10-28',time:'00:30'});assert.equal(monday('2026-10-28'),'2026-10-26');
});
test('GBS online lectures, missing Wednesdays, and last lecture are exact',()=>{
 const mon=slots.find(s=>s.id==='gbs-lecture-mon'),wed=slots.find(s=>s.id==='gbs-lecture-wed');assert.equal(mon.occurrences.find(e=>e.date==='2026-11-16').room,'Online');assert.equal(mon.occurrences.find(e=>e.date==='2027-01-25').room,'Online');assert.ok(!wed.occurrences.some(e=>['2026-11-18','2026-12-09','2026-12-23','2027-02-03'].includes(e.date)));assert.equal(wed.occurrences.at(-1).date,'2027-01-27');
});
test('IT replacement Friday only, cancelled group and published times preserved',()=>{
 const lecture=slots.find(s=>s.id==='its-lectures');assert.ok(!lecture.occurrences.some(e=>e.date==='2026-11-10'));assert.equal(lecture.occurrences.find(e=>e.date==='2026-11-20').start,'08:00');assert.ok(lecture.occurrences.some(e=>e.date==='2026-11-17'));assert.equal(lecture.occurrences.filter(e=>new Date(e.date).getUTCDay()===5).length,1);assert.equal(activeOccurrences(slots.find(s=>s.id==='its-13'),plan(['its-13'])).length,0);assert.equal(slots.find(s=>s.id==='ana-11').occurrences[0].start,'15:15');
});
test('holiday source conflicts never exported, even with provisional opted in',()=>{
 const all=plan(slots.map(s=>s.id));const ics=exportICS(slots,all,true);assert.ok(!ics.includes('DTSTART:20261203'));for(const s of slots)for(const e of activeOccurrences(s,all)){assert.ok(e.date<'2026-12-24'||e.date>'2027-01-06');}
});
test('date bounds, exclusions, stable UIDs and provisional opt-in',()=>{
 const s=slots.find(s=>s.id==='gdb-03');assert.equal(activeOccurrences(s,plan([s.id]),false).length,0);assert.ok(activeOccurrences(s,plan([s.id]),true).length>0);
 const p=plan([s.id],{from:'2026-10-28',to:'2026-11-04',excluded:['gdb-03-2026-11-04']});const parsed=new ICAL.Component(ICAL.parse(exportICS(slots,p,true)));const events=parsed.getAllSubcomponents('vevent');assert.equal(events.length,1);assert.equal(events[0].getFirstPropertyValue('uid'),'gdb-03-2026-10-28@studyplan.ardatas.com');assert.equal(events[0].getFirstPropertyValue('dtstart').toString(),'2026-10-28T07:00:00Z');
});
test('ICS round-trips Unicode, escaping, UTF8 byte folding and CRLF',()=>{
 const slot={...slots[0],id:'fixture',label:'Ä'.repeat(90)+', ; \\ \n text',occurrences:[{...slots[0].occurrences[0],id:'fixture-event',date:'2026-10-28',room:'Room, 1; Ä\\B\nNext'}]};const ics=exportICS([slot],plan(['fixture']));assert.ok(!/(.)(?<!\r)\n/.test(ics));for(const line of ics.split('\r\n'))assert.ok(Buffer.byteLength(line)<=75);const event=new ICAL.Component(ICAL.parse(ics)).getFirstSubcomponent('vevent');assert.equal(event.getFirstPropertyValue('location'),slot.occurrences[0].room);assert.equal(event.getFirstPropertyValue('summary'),slot.course.toUpperCase()+' · '+slot.label);assert.equal(escapeICS('a,b;c\\d\ne'),'a\\,b\\;c\\\\d\\ne');assert.ok(foldLine('😀'.repeat(80)).includes('\r\n '));
});
test('overlaps use actual dates, not just weekdays, and exclude skipped sessions',()=>{
 const a=slots.find(s=>s.id==='its-16'),b=slots.find(s=>s.id==='its-17');const p=plan([a.id,b.id]);assert.ok(conflicts(slots,p).length>0);const excluded=b.occurrences.map(e=>e.id);assert.equal(conflicts(slots,{...p,excluded}).length,0);
});
test('interval lane layout handles partial and transitive overlaps',()=>{
 const events=layout([{start:'10:00',end:'11:00'},{start:'10:30',end:'12:00'},{start:'11:00',end:'11:30'},{start:'12:00',end:'13:00'}]);assert.deepEqual(events.map(e=>e.lanes),[2,2,2,1]);assert.deepEqual(events.map(e=>e.lane),[0,1,0,0]);
});
test('share roundtrip preserves skipped dates and rejects malformed/unbounded content',()=>{
 const p=plan(['its-16'],{excluded:['its-16-2026-10-28']});assert.deepEqual(parsePlan(decodeURIComponent(encodePlan(p).slice(6)),slots),p);for(const bad of ['{}','{"version":1}',JSON.stringify({...p,to:'2027-02-30'}),JSON.stringify({...p,selected:['<script>']}),JSON.stringify({...p,from:'2020-01-01'}),'a'.repeat(20001)])assert.throws(()=>parsePlan(bad,slots));
});

test('assembly suspension excludes only overlapping known Garching sessions, retaining source facts',()=>{
 const conflict=slots.find(s=>s.id==='its-16').occurrences.find(e=>e.date==='2026-10-28');
 assert.equal(conflict.status,'source-conflict');assert.equal(conflict.sourceStatus,'scheduled');assert.equal(conflict.start,'10:00');assert.match(conflict.conflictReason,/FVV/);
 const all=plan(slots.map(s=>s.id));const ics=exportICS(slots,all,true);
 assert.ok(!ics.includes('UID:its-16-2026-10-28@'));
 for(const slot of slots.filter(s=>s.course==='gdb'))for(const e of slot.occurrences.filter(e=>e.date==='2026-11-10'&&e.start<'11:30'&&e.end>'10:00')){assert.equal(e.status,'source-conflict');assert.ok(!ics.includes('UID:'+e.id+'@'));}
 for(const unchanged of [{...conflict,status:'scheduled',room:'Unknown campus'}, {...conflict,status:'scheduled',start:'11:30',end:'12:30'}, {...conflict,status:'scheduled',start:'08:30',end:'10:00'}, {...conflict,status:'scheduled',date:'2026-11-04'}, {...conflict,status:'cancelled'}])assert.strictEqual(applyAssemblyException(unchanged),unchanged);
});

test('overlap groups retain every option and split adjacent sessions',async()=>{
 const {groupOverlapping}=await import('../src/model.ts');
 const events=[{id:'a',start:'10:00',end:'11:00'},{id:'b',start:'10:30',end:'12:00'},{id:'c',start:'11:00',end:'11:30'},{id:'d',start:'12:00',end:'13:00'}];
 const grouped=groupOverlapping(events);assert.deepEqual(grouped.map(g=>g.events.map(e=>e.id)),[['a','b','c'],['d']]);assert.equal(grouped[0].end,'12:00');assert.equal(grouped.flatMap(g=>g.events).length,events.length);
});


test('NumProg uses Moodle corrections, split groups and online options without cancelled groups',()=>{
 const num=slots.filter(s=>s.course==='num');assert.equal(num.length,18);
 const first=num.find(s=>s.id==='num-01').occurrences[0];
 assert.equal(first.start,'10:00');assert.equal(first.room,'00.13.054');
 assert.equal(num.find(s=>s.id==='num-02').occurrences[0].room,'03.09.012');
 for(const id of ['num-04b','num-10','num-17'])assert.ok(!num.some(s=>s.id===id));
 assert.equal(num.find(s=>s.id==='num-18a').occurrences[0].room,'Online');
 assert.equal(num.find(s=>s.id==='num-18b').occurrences[0].room,'00.08.055');
 assert.equal(num.find(s=>s.id==='num-online-16').occurrences[0].start,'16:00');
 for(const s of num)for(const e of s.occurrences)assert.equal(Number(e.end.slice(0,2))-Number(e.start.slice(0,2)),2);
 assert.equal(num.find(s=>s.id==='num-09').occurrences.find(e=>e.date==='2026-10-28').status,'source-conflict');
 const p=plan(['num-04a','num-18a','num-09','its-16']);assert.deepEqual(parsePlan(decodeURIComponent(encodePlan(p).slice(6)),slots),p);
 const ics=exportICS(slots,p);assert.match(ics,/NUM · Group 04a/);assert.match(ics,/LOCATION:Online/);assert.ok(!ics.includes('UID:num-09-2026-10-28@'));
});
