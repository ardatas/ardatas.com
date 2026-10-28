/** Adapted from the user-supplied EventManager reference: source events are read-only. */
import { useEffect, useState } from 'react';
import {courseStyle} from '../../course-colors';
import { ChevronLeft, ChevronRight, CalendarDays, Clock3, List, Rows3 } from 'lucide-react';
import { addDays, days, groupOverlapping, layout, minutes, monday, weekday } from '../../model';
import type { Slot } from '../../model';
import type { CalendarEvent } from '../../calendar-events';
const DAY_START=7*60;
const DAY_END=20*60;
const dayPosition=(minute:number)=>`${(minute-DAY_START)/(DAY_END-DAY_START)*100}%`;
export type View='month'|'week'|'day'|'list';
export function formatDate(date:string,opts:Intl.DateTimeFormatOptions={day:'numeric',month:'short'}) {return new Date(date+'T12:00:00Z').toLocaleDateString('en-GB',{...opts,timeZone:'UTC'});}
const compactSlotLabel=(slot:Slot)=>slot.kind==='Lecture'?'Lec':slot.label.match(/^(?:Group|Gruppe) (\d+[a-z]?)/)?.[1]||(slot.id==='num-online-16'?'Online':null)||slot.label.match(/-\d{4}-(.+)$/)?.[1]||slot.label;
export function EventCard({event,onClick,compact=false}:{event:CalendarEvent;onClick:(e:CalendarEvent,returnTarget?:HTMLElement)=>void;compact?:boolean}) {
 const context=event.context?' · Selected in my plan':'';
 const conflict=event.conflictLabels.length?` · Overlaps my plan: ${event.conflictLabels.join('; ')}`:'';
 return <button className={`event-card ${event.selected?'chosen':''} ${event.context?'selected-context':''} ${conflict?'plan-overlap':''} ${event.status==='provisional'?'provisional':''} ${compact?'compact':''}`} data-kind={event.slot.kind} data-slot-id={event.slot.id} style={courseStyle(event.slot.course,event.slot.kind)} onClick={click=>onClick(event,click.currentTarget)} title={`${event.slot.course.toUpperCase()} · ${event.slot.label} · ${event.start}–${event.end} · ${event.tutor} · ${event.room}${context}${conflict}`} aria-label={`${event.slot.course.toUpperCase()} ${event.slot.label}, ${event.date}, ${event.start}–${event.end}, ${event.tutor}, ${event.room}${context}${conflict}`}>
  <span className="event-time">{event.start}–{event.end}{event.selected?' ✓':''}</span><strong>{conflict&&<span className="overlap-mark" aria-hidden="true">!</span>}<span className="card-course">{event.slot.course.toUpperCase()}</span><span className="card-tiny-course">{({gdb:'DB',gbs:'OS',its:'IT',ana:'AN',num:'NP'} as Record<string,string>)[event.slot.course]}</span><span className="card-full-label"> · {event.slot.label}</span><span className="card-short-label">{compactSlotLabel(event.slot)}{event.selected?' ✓':''}</span></strong>{!compact&&<><span>{event.tutor}</span><span className="event-room">{event.room}</span></>}{event.status==='provisional'&&<small>Provisional dates</small>}
 </button>;
}
export function EventManager({events,browsing=false,today,now,onEventClick,initialDate,rangeFrom,rangeTo}:{events:CalendarEvent[];browsing?:boolean;today:string;now:string;onEventClick:(e:CalendarEvent,returnTarget?:HTMLElement)=>void;initialDate:string;rangeFrom:string;rangeTo:string}){
 const [date,setDate]=useState(initialDate);const [view,setView]=useState<View>(()=>window.matchMedia('(max-width: 700px)').matches?'day':'week');
 useEffect(()=>{setDate(current=>current<rangeFrom?rangeFrom:current>rangeTo?rangeTo:current);},[rangeFrom,rangeTo]);
 const start=monday(date);const dateList=Array.from({length:view==='day'?1:view==='week'?5:7},(_,i)=>view==='day'?date:addDays(start,i));
 const navigate=(direction:number)=>{if(view==='month'){const d=new Date(date.slice(0,7)+'-01T12:00:00Z');d.setUTCMonth(d.getUTCMonth()+direction);setDate(d.toISOString().slice(0,10));}else setDate(addDays(date,direction*(view==='day'?1:7)));};
 const within=events.filter(e=>view==='day'?e.date===date:e.date>=start&&e.date<=addDays(start,6));
 const title=view==='month'?formatDate(date,{month:'long',year:'numeric'}):view==='day'?formatDate(date,{weekday:'long',day:'numeric',month:'long'}):`${formatDate(start)} – ${formatDate(addDays(start,6),{day:'numeric',month:'short',year:'numeric'})}`;
 const monthStart=monday(date.slice(0,7)+'-01');
 const gridDays=dateList.map(d=>({date:d,groups:groupOverlapping(events.filter(e=>e.date===d))}));
 return <><section className="calendar-panel" aria-label="Study timetable">
 <div className="calendar-toolbar"><div className="date-controls"><div className="date-nav"><button aria-label="Previous period" onClick={()=>navigate(-1)}><ChevronLeft size={18}/></button><button onClick={()=>setDate(today)}>Today</button><button aria-label="Next period" onClick={()=>navigate(1)}><ChevronRight size={18}/></button></div><h2>{title}</h2></div><div className="view-switch" aria-label="Calendar view">{([['month',CalendarDays],['week',Rows3],['day',Clock3],['list',List]] as const).map(([v,Icon])=><button key={v} aria-pressed={view===v} onClick={()=>setView(v)}><Icon size={15}/>{v[0].toUpperCase()+v.slice(1)}</button>)}</div><span className="timezone">Europe/Berlin</span></div>
 {browsing&&events.some(e=>e.context)&&<div className="selection-key"><span><i aria-hidden="true">✓</i> Shaded = in my plan</span><span><b aria-hidden="true">!</b> Overlaps my plan · tap for details</span></div>}
 {within.length===0&&view!=='month'&&<div className="calendar-empty">No sessions in this period. Choose a course, add a slot, or move to another week.</div>}
 {(view==='week'||view==='day')&&<><p className={`week-scroll-hint ${view==='week'?'visible':''}`}>Swipe sideways for all weekdays · Tap a date for Day view</p><div className={`time-scroll ${view==='week'?'week-scroll':''}`} tabIndex={0} aria-label="Full-day timetable, 07:00 to 20:00"><div className="time-grid" style={{gridTemplateColumns:`52px repeat(${dateList.length},minmax(0,1fr))`}}>
 <div className="time-heading">TIME</div>{dateList.map(d=><button key={d} className={`day-heading ${d===today?'today':''}`} onClick={()=>{setDate(d);setView('day');}}><span>{days[weekday(d)]}</span><strong>{d.slice(8)}</strong><small>{formatDate(d,{month:'short'})}</small></button>)}
 <div className="hours">{Array.from({length:14},(_,i)=><span key={i} style={{top:`${i/13*100}%`}}>{String(i+7).padStart(2,'0')}:00</span>)}</div>
 {gridDays.map(d=><div key={d.date} className={`day-column ${d.date===today?'today-column':''}`}>
 {d.groups.map(group=><div key={group.events[0].id} className="positioned-event" style={{top:dayPosition(minutes(group.start)),height:`calc(${(minutes(group.end)-minutes(group.start))/(DAY_END-DAY_START)*100}% - 3px)`}}>{group.events.length===1?<EventCard event={group.events[0]} onClick={onEventClick}/>:<div className="event-group overlap-lanes" role="group" aria-label={`${group.events.length} overlapping sessions, ${d.date}, ${group.start}–${group.end}`}>{layout(group.events).map(event=><div key={event.id} className="lane-event" style={{left:`${event.lane/event.lanes*100}%`,width:`${100/event.lanes}%`,top:`${(minutes(event.start)-minutes(group.start))/(minutes(group.end)-minutes(group.start))*100}%`,height:`${(minutes(event.end)-minutes(event.start))/(minutes(group.end)-minutes(group.start))*100}%`}}><EventCard event={event} onClick={onEventClick}/></div>)}</div>}</div>)}
 {d.date===today&&minutes(now)>=420&&minutes(now)<1200&&<div className="now-line" data-testid="now-line" style={{top:dayPosition(minutes(now))}}><span>{now}</span></div>}
 </div>)}
 </div></div></>}
 {view==='list'&&<div className="agenda">{dateList.map(d=><section key={d}><h3 className={d===today?'today-text':''}>{formatDate(d,{weekday:'long',day:'numeric',month:'short'})}</h3><div className="agenda-cards">{events.filter(e=>e.date===d).sort((a,b)=>a.start.localeCompare(b.start)).map(e=><EventCard key={e.id} event={e} onClick={onEventClick}/>)}{!events.some(e=>e.date===d)&&<p className="muted">No sessions</p>}</div></section>)}</div>}
 {view==='month'&&<div className="month-scroll"><div className="month-grid">{days.map(d=><div className="month-heading" key={d}>{d}</div>)}{Array.from({length:42},(_,i)=>{const d=addDays(monthStart,i);const es=events.filter(e=>e.date===d).sort((a,b)=>Number(a.context)-Number(b.context)||a.start.localeCompare(b.start));return <div key={d} className={`month-cell ${d.slice(0,7)!==date.slice(0,7)?'other-month':''}`}><button className={`month-date ${d===today?'today-text':''}`} onClick={()=>{setDate(d);setView('day');}}>{Number(d.slice(8))}</button>{es.slice(0,2).map(e=><EventCard key={e.id} event={e} onClick={onEventClick} compact/>)}{es.length>2&&<button className="more" onClick={()=>{setDate(d);setView('day');}}>+{es.length-2} more · view day</button>}</div>;})}</div></div>}
 </section></>;
}
