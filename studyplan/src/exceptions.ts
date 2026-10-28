import type { Occurrence } from './model';
export const termSource='https://www.tum.de/fileadmin/w00bfo/www/Studium/Im_Studium/Termine_Fristen/251118__Rundschreiben__Termine_und_Feiertage_2026-2027_final.pdf';
// Rooms from the verified Garching course tables that overlap these assembly dates.
// Do not infer a campus for unknown, online, or unrelated rooms.
const garchingRooms=new Set(['00.13.008','00.08.036','02.07.023','02.11.018','02.13.010','01.13.007','01.06.020','00.13.054','03.09.012']);
export function applyAssemblyException(event:Occurrence):Occurrence {
 const assembly=event.date==='2026-10-28'?'FVV':event.date==='2026-11-10'?'SVV':null;
 if(!assembly||!garchingRooms.has(event.room)||event.start>='11:30'||event.end<='10:00'||!['scheduled','provisional'].includes(event.status))return event;
 return {...event,status:'source-conflict',sourceStatus:event.status,conflictReason:`${assembly}: teaching is suspended in Garching from 10:00 to 11:30. This source session overlaps; verify any replacement or shortened session with the course.`,conflictSource:termSource};
}
