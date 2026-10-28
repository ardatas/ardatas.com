import type { Occurrence } from './model';
import academicCalendar from './academic-calendar.json';
export const termSource=academicCalendar.source;
export function teachingFreeReason(date:string):string|undefined {
 const holiday=(academicCalendar.days as Record<string,string>)[date];
 const recess=academicCalendar.breaks.find(period=>date>=period.from&&date<=period.to);
 return recess?`${recess.name} (${recess.from}–${recess.to}, inclusive)`:holiday;
}
/** Apply the university calendar to every course, including imported dated sessions. */
export function applyHolidayException(event:Occurrence):Occurrence {
 const reason=teachingFreeReason(event.date);
 if(!reason||event.status==='cancelled')return event;
 return {...event,status:'source-conflict',sourceStatus:event.sourceStatus||event.status,conflictReason:`No teaching: ${reason}.`,conflictSource:termSource};
}
// Rooms from the verified Garching course tables that overlap these assembly dates.
// Do not infer a campus for unknown, online, or unrelated rooms.
const garchingRooms=new Set(['00.13.008','00.08.036','02.07.023','02.11.018','02.13.010','01.13.007','01.06.020','00.13.054','03.09.012']);
export function applyAssemblyException(event:Occurrence):Occurrence {
 const assembly=event.date==='2026-10-28'?'FVV':event.date==='2026-11-10'?'SVV':null;
 if(!assembly||!garchingRooms.has(event.room)||event.start>='11:30'||event.end<='10:00'||!['scheduled','provisional'].includes(event.status))return event;
 return {...event,status:'source-conflict',sourceStatus:event.status,conflictReason:`${assembly}: teaching is suspended in Garching from 10:00 to 11:30. This source session overlaps; verify any replacement or shortened session with the course.`,conflictSource:termSource};
}
