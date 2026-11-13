import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canVisit, normalizeTutorWeek, upcomingTutors, emptyTutorWeek } from '../src/tutor-week.ts';
import { calendarEvents } from '../src/calendar-events.ts';
import { DEFAULT_PLAN, berlinNow } from '../src/model.ts';
const event=(id,date,start='12:00',status='scheduled')=>({id,date,start,end:'14:00',status});
const slot={id:'a',course:'gbs',kind:'Tutorial',occurrences:[event('past','2026-10-28'),event('current','2026-11-04'),event('future','2026-11-11')]};
test('only this Berlin week can be visited, and stale or malformed storage is pruned',()=>{
 const date='2026-11-04';
 assert.equal(canVisit(slot,slot.occurrences[0],date),false);
 assert.equal(canVisit(slot,slot.occurrences[1],date),true);
 assert.equal(canVisit(slot,slot.occurrences[2],date),false);
 const state={...emptyTutorWeek(date),visited:['past','current','current','future','unknown'],hidden:['gbs','bad'],restored:['gbs']};
 assert.deepEqual(normalizeTutorWeek(state,[slot],date),{week:'2026-11-02',visited:['current'],hidden:['gbs'],restored:['gbs']});
 assert.deepEqual(normalizeTutorWeek(state,[slot],berlinNow(new Date('2026-11-08T23:00:00Z')).date),emptyTutorWeek('2026-11-09'));
 assert.deepEqual(normalizeTutorWeek({week:'2026-11-02',visited:12},[slot],date),emptyTutorWeek(date));
});
test('one visit renders once in my plan without adding future occurrences; recurrence deduplicates',()=>{
 const events=calendarEvents([slot],[],DEFAULT_PLAN,false,['current']);
 assert.deepEqual(events.map(e=>[e.id,e.visited,e.selected]),[['current',true,true]]);
 const recurring=calendarEvents([slot],[slot],{...DEFAULT_PLAN,selected:['a']},true,['current']);
 assert.equal(recurring.filter(e=>e.id==='current').length,1);
 assert.equal(recurring.filter(e=>e.visited).length,1);
});
test('wheel takes each module’s next start today, includes tied tutors, and moves on with time',()=>{
 const slots=[{...slot,occurrences:[event('a','2026-11-04','12:00'),event('b','2026-11-04','15:00'),event('cancel','2026-11-04','11:00','cancelled')]},
 {...slot,id:'b',occurrences:[event('tie','2026-11-04','12:00')]},
 {...slot,id:'lecture',kind:'Lecture',occurrences:[event('lecture','2026-11-04','11:00')]},
 {...slot,id:'other',course:'its',occurrences:[event('tomorrow','2026-11-05','12:00')]}];
 assert.deepEqual(upcomingTutors(slots,{date:'2026-11-04',time:'12:00'})[0].choices.map(c=>c.event.id),['a','tie']);
 assert.deepEqual(upcomingTutors(slots,{date:'2026-11-04',time:'12:01'})[0].choices.map(c=>c.event.id),['b']);
 assert.deepEqual(upcomingTutors(slots,{date:'2026-11-04',time:'15:01'}),[]);
});
