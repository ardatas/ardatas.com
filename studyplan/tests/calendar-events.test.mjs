import {test} from 'node:test';
import assert from 'node:assert/strict';
import {calendarEvents} from '../src/calendar-events.ts';
import {DEFAULT_PLAN,layout} from '../src/model.ts';
const slot=(id,start,end,status='scheduled',date='2026-11-04')=>({id,course:id,kind:'Tutorial',label:id,occurrences:[{id:id+'-'+date,date,start,end,status}]});
const selected=slot('saved','10:00','12:00');
const candidate=slot('other','11:00','13:00');
const adjacent=slot('adjacent','12:00','13:00');
const plan={...DEFAULT_PLAN,selected:['saved']};
test('browsing retains filtered-out selections exactly once and separates overlapping lanes',()=>{
 const events=calendarEvents([selected,candidate,adjacent],[candidate,adjacent],plan,true);
 assert.equal(events.length,3);assert.equal(events.find(e=>e.selected).context,true);
 assert.match(events.find(e=>e.slot.id==='other').conflictLabels[0],/saved.*10:00–12:00/);
 assert.deepEqual(events.find(e=>e.slot.id==='adjacent').conflictLabels,[]);
 const lanes=layout(events);assert.notEqual(lanes.find(e=>e.selected).lane,lanes.find(e=>e.slot.id==='other').lane);
 assert.equal(calendarEvents([selected,candidate],[selected,candidate],plan,true).filter(e=>e.selected).length,1);
 assert.deepEqual(calendarEvents([selected,candidate],[selected],plan,false).map(e=>[e.slot.id,e.context,e.conflictLabels]),[['saved',false,[]]]);
});
test('skipped, cancelled, source-conflict and out-of-range selections add neither context nor conflicts',()=>{
 for(const [saved,p] of [[selected,{...plan,excluded:[selected.occurrences[0].id]}],[selected,{...plan,from:'2026-11-05'}],[slot('saved','10:00','12:00','cancelled'),plan],[slot('saved','10:00','12:00','source-conflict'),plan]]){
  const events=calendarEvents([saved,candidate],[candidate],p,true);assert.ok(events.every(e=>!e.context&&e.conflictLabels.length===0));
 }
});
