import {test} from 'node:test';
import assert from 'node:assert/strict';
import {clearSelections} from '../src/clear-plan.ts';
import {DEFAULT_PLAN, activeOccurrences} from '../src/model.ts';
import {slots} from '../src/data.ts';
const slot=slots.find(s=>s.id==='its-16');
const first=slot.occurrences.find(o=>o.date==='2026-11-04');
const next=slot.occurrences.find(o=>o.date==='2026-11-11');
const plan={...DEFAULT_PLAN,selected:[slot.id],excluded:[]};
test('daily clear skips only selected occurrences on that date and removes a duplicate visit once',()=>{
 const result=clearSelections(slots,plan,[first.id,next.id],'daily',first.date);
 assert.equal(result.count,1);
 assert.deepEqual(result.plan.selected,[slot.id]);
 assert.deepEqual(result.plan.excluded,[first.id]);
 assert.deepEqual(result.visited,[next.id]);
 assert.ok(activeOccurrences(slot,result.plan).some(o=>o.id===next.id));
 assert.deepEqual(plan.excluded,[]);
});
test('weekly clear uses Monday to Sunday and preserves other weeks and existing skips',()=>{
 const dated={...plan,excluded:[next.id]};
 const result=clearSelections(slots,dated,[],'weekly','2026-11-08');
 assert.ok(result.plan.excluded.includes(first.id));
 assert.ok(result.plan.excluded.includes(next.id));
 assert.equal(clearSelections(slots,result.plan,[],'weekly','2026-11-02').count,0);
});
test('whole clear includes out-of-range slots and visits but preserves the configured range',()=>{
 const result=clearSelections(slots,{...plan,from:'2027-02-06',to:'2027-02-28'},[first.id],'all','');
 assert.equal(result.count,2);
 assert.deepEqual(result.plan.selected,[]);
 assert.deepEqual(result.visited,[]);
 assert.equal(result.plan.from,'2027-02-06');
});
test('invalid dates and empty plans are safe no-ops',()=>{
 assert.equal(clearSelections(slots,plan,[],'daily','').count,0);
 assert.equal(clearSelections(slots,DEFAULT_PLAN,[],'all','').count,0);
});
