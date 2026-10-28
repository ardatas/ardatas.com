import { addDays } from './model';
import type { Slot } from './model';
const source='https://www.moodle.tum.de/course/view.php?id=121375';
// Moodle explicitly takes precedence over TUMonline room reservation windows.
// No tutor is assigned to 04b, 10 or 17: Moodle says these do not take place.
// The second online session has no group number; preserve that distinction.
type Row=[string,number,string,string,string,string,string];
const rows:Row[]=[
 ['01',0,'10:00','12:00','00.13.054','Cihan Demirci','German'],
 ['02',0,'08:00','10:00','03.09.012','Danylo Katrechko','German'],
 ['03',0,'14:00','16:00','03.09.012','Anian Schleyer','German'],
 ['04a',0,'14:00','16:00','00.13.054','Cihan Demirci','English'],
 ['15',1,'08:00','10:00','02.07.023','Danylo Katrechko','German'],
 ['05',1,'10:00','12:00','03.09.012','Luka Köhne','German'],
 ['06',1,'13:00','15:00','00.13.036','Luka Köhne','German'],
 ['08',1,'12:00','14:00','02.07.014','Anian Schleyer','German'],
 ['07',1,'14:00','16:00','02.09.023','Kai Feng','English'],
 ['09',2,'10:00','12:00','00.13.054','Julia Hahn','German'],
 ['11',2,'12:00','14:00','00.13.054','Julia Hahn','German'],
 ['16',3,'10:00','12:00','03.09.012','Luka Piljic','German'],
 ['12',3,'12:00','14:00','00.13.008','Kai Feng','English'],
 ['13',3,'12:00','14:00','03.09.012','Luka Piljic','German'],
 ['18a',3,'14:00','16:00','Online','Mohamed Aziz Issaoui','English'],
 ['18b',3,'14:00','16:00','00.08.055','Vladyslav Fediukov','English'],
 ['14',3,'14:00','16:00','00.13.008','Luis Gall','German'],
 ['online-16',3,'16:00','18:00','Online','Mohamed Aziz Issaoui','English'],
];
export const numprog:Slot[]=rows.map(([group,day,start,end,room,tutor,language])=>{
 const id=`num-${group}`;
 const occurrences:Slot['occurrences']=[];
 for(let date=addDays('2026-10-19',day);date<='2027-02-05';date=addDays(date,7)){
  if((date>='2026-12-24'&&date<='2027-01-06')||date==='2026-12-03')continue;
  occurrences.push({id:`${id}-${date}`,date,start,end,room,tutor,status:'scheduled',source});
 }
 return {id,course:'num',kind:'Tutorial',label:`${group==='online-16'?'Online 16:00 (no group number)':`Group ${group}`} · ${language}`,source,checkedAt:'2026-10-28',note:`${language}. Full two-hour tutorial. Moodle's timetable overrides TUMonline times and rooms. Weekly dates expanded from the first exercise week, 19 October, through the teaching period; university holidays excluded. Check Moodle for later cancellations.${room==='Online'?' Join via the link on Moodle.':''}`,occurrences};
});
