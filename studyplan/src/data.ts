import gbs from './gbs.json';
import {courseColors} from './course-colors';
import gdb from './gdb.json';
import { weekly } from './weekly';
import { numprog } from './numprog';
import { applyAssemblyException } from './exceptions';
export {termSource} from './exceptions';
import type { Slot } from './model';
export const courses=[
 {id:'gdb',short:'GDB',name:'Grundlagen: Datenbanken',code:'IN0008',color:courseColors.gdb,coverage:'32 weekly tutorial groups · dates provisional',source:'https://erdbtutor.db.in.tum.de/schedule?course_id=19'},
 {id:'gbs',short:'GBS',name:'Betriebssysteme & Systemsoftware',code:'IN0009',color:courseColors.gbs,coverage:'26 tutorial groups + published lecture dates',source:'https://gbs.cm.in.tum.de/tutorials/'},
 {id:'its',short:'IT Security',name:'IT Sicherheit',code:'IN0042',color:courseColors.its,coverage:'28 active tutorial groups + lecture exceptions',source:'https://www.moodle.tum.de/course/view.php?id=121396'},
 {id:'num',short:'NumProg',name:'Numerisches Programmieren',code:'IN0019',color:courseColors.num,coverage:'18 active tutorial options, including online sessions',source:'https://www.moodle.tum.de/course/view.php?id=121375'},
 {id:'ana',short:'Analysis',name:'Analysis für Informatik',code:'MA0902',color:courseColors.ana,coverage:'16 tutorial groups + homework help',source:'https://www.moodle.tum.de/course/view.php?id=123567&section=2'}
];
const checkedAt='2026-10-28T00:25:00Z';
const lectureSource='https://www.moodle.tum.de/course/view.php?id=121267';
const mondayDates=['2026-10-19','2026-10-26','2026-11-02','2026-11-09','2026-11-16','2026-11-23','2026-11-30','2026-12-07','2026-12-14','2027-01-11','2027-01-18','2027-01-25'];
const wedDates=['2026-10-14','2026-10-21','2026-10-28','2026-11-04','2026-11-11','2026-11-25','2026-12-02','2026-12-16','2027-01-13','2027-01-20','2027-01-27'];
const lectures:Slot[]=[{id:'gbs-lecture-mon',course:'gbs',kind:'Lecture',label:'Monday lecture',source:lectureSource,checkedAt,note:'Moodle lecture plan, published subject to change. Online on 16 November and 25 January. No lecture on 21 December or 1 February.',occurrences:mondayDates.map(date=>({id:'gbs-lecture-'+date,date,start:'13:45',end:'15:15',room:['2026-11-16','2027-01-25'].includes(date)?'Online':'MW 2001',tutor:'See course page',status:'scheduled',source:lectureSource}))},
{id:'gbs-lecture-wed',course:'gbs',kind:'Lecture',label:'Wednesday lecture',source:lectureSource,checkedAt,note:'Moodle lecture plan, published subject to change. No lecture on 18 November, 9 or 23 December, or 3 February.',occurrences:wedDates.map(date=>({id:'gbs-lecture-'+date,date,start:'13:00',end:'14:00',room:'MW 0001',tutor:'See course page',status:'scheduled',source:lectureSource}))}];
export const slots:Slot[]=[...gbs,...gdb,...lectures,...weekly,...numprog].map(slot=>({...slot,occurrences:slot.occurrences.map(applyAssemblyException)}));
