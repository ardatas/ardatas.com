import { addDays } from './model';
import type { Slot } from './model';
const checkedAt='2026-10-28T00:33:36Z';
const analysisSource='https://www.moodle.tum.de/course/view.php?id=123567&section=2';
const securitySource='https://www.moodle.tum.de/course/view.php?id=121396';
type Row=[number,number,string,string,string,string,string?];
const analysis:Row[]=[
[9,0,'10:15','11:45','02.08.011','Philipp'],[6,0,'12:15','13:45','00.13.036','Diana'],
[5,1,'16:15','17:45','MW 2050','Diana'],[19,1,'16:15','17:45','00.13.008','Tobias'],[20,1,'16:15','17:45','MW 0350','Antoine'],
[7,2,'08:30','10:00','02.13.010','Philipp'],[23,2,'08:30','10:00','00.13.008','Diana'],[8,2,'14:15','15:45','MW 0337','Antoine'],[11,2,'15:15','16:45','CH 27401','Matei'],
[13,3,'10:15','11:45','0001, ZEI (5414.EG.001)','Jules','English'],[14,3,'12:15','13:45','02.5901.021','Pascal'],[15,3,'12:15','13:45','1701 (5507.01.701)','Jules','English'],
[28,4,'10:15','11:45','00.08.059','Filip'],[30,4,'10:15','11:45','02.5901.021','Tom'],[32,4,'12:15','13:45','00.08.059','Filip'],[26,4,'14:15','15:45','00.13.036','Tom'],
[4,1,'12:15','13:45','MW 2001','Diana, Matei, Pascal, Tobias','Help session; no registration']];
const security:Row[]=[
[1,0,'09:00','11:00','01.13.007','Not published'],[2,0,'10:00','12:00','00.08.059','Jakob Stuhler'],[3,0,'10:00','12:00','01.07.014','Not published'],[4,0,'12:00','14:00','00.08.059','Thuy-Vy Nghiem'],[5,0,'12:00','14:00','01.11.018','Not published'],[6,0,'13:00','15:00','01.13.007','Thorben Höhne'],[7,0,'14:00','16:00','00.08.059','Jana Blankenberg'],[8,0,'16:00','18:00','01.07.014','Bjarne Hansen'],[9,0,'16:00','18:00','00.08.059','Mattis Gentner'],
[10,1,'12:00','14:00','02.13.010','Bernd Erdmann'],[11,1,'12:00','14:00','01.07.014','Not published'],[12,1,'14:00','16:00','01.11.018','Not published'],[13,0,'14:00','16:00','Taurus 1','ÜL','Cancelled'],[14,1,'16:00','18:00','02.07.023','Bernd Erdmann'],[15,1,'17:00','19:00','00.08.059','Not published'],
[16,2,'10:00','12:00','01.13.007','Andreas Wilhelmer'],[17,2,'10:00','12:00','01.06.020','Bjarne Hansen'],[18,2,'14:00','16:00','01.13.007','Andreas Wilhelmer'],[19,2,'14:00','16:00','01.06.020','Thuy-Vy Nghiem'],[20,2,'14:00','16:00','00.08.059','Jan Eichenauer'],
[21,3,'10:00','12:00','01.11.018','Jana Blankenberg'],[22,3,'10:00','12:00','00.08.038','Lea Noehte'],[23,3,'10:00','12:00','01.13.007','Philip Zimmer'],[24,3,'12:00','14:00','01.13.007','Philip Zimmer'],[25,3,'14:00','16:00','01.11.018','Thorben Höhne'],[26,3,'16:00','18:00','01.11.018','Mattis Gentner'],[27,3,'16:00','18:00','02.07.023','Jakob Stuhler'],[28,4,'10:00','12:00','00.13.036','Lea Noehte'],[29,4,'11:00','13:00','00.13.008','Jan Eichenauer']];
export const weekly:Slot[]=[];
for(const [course,rows,source] of [['ana',analysis,analysisSource],['its',security,securitySource]] as const){for(const [group,day,start,end,room,tutor,note] of rows){const id=`${course}-${group}`;const occurrences=[];
 for(let date=addDays('2026-10-19',day);date<='2027-02-05';date=addDays(date,7)){
 if((date>='2026-12-24'&&date<='2027-01-06')||date==='2026-12-03')continue;
 occurrences.push({id:id+'-'+date,date,start,end,room,tutor,status:note==='Cancelled'?'cancelled':'scheduled',source});}
 weekly.push({id,course,kind:course==='ana'&&group===4?'Help session':'Tutorial',label:`Group ${group}${note==='English'?' · English':''}`,source,checkedAt,note:`${note?note+'. ':''}Weekly from 19 October. Exact times from the detailed Moodle table. Expanded through the published TUM teaching period; holidays excluded. Check Moodle for later changes.`,occurrences});}}
const itsDates=[];
for(let date='2026-10-13';date<='2027-02-05';date=addDays(date,7)){if(date==='2026-11-10'||(date>='2026-12-24'&&date<='2027-01-06'))continue;itsDates.push(date);}
weekly.push({id:'its-lectures',course:'its',kind:'Lecture',label:'Lecture + replacement date',source:securitySource,checkedAt,note:'Tuesdays 10:00–12:00. No lecture 10 November; replacement Friday 20 November 08:00–10:00, MI HS 1. Other Fridays are not regular lectures.',occurrences:[...itsDates,'2026-11-20'].sort().map(date=>({id:'its-lecture-'+date,date,start:date==='2026-11-20'?'08:00':'10:00',end:date==='2026-11-20'?'10:00':'12:00',room:date==='2026-11-20'?'MI HS 1':'Audimax im Galileo',tutor:'Claudia Eckert / Manuel Andreas',status:'scheduled',source:securitySource}))});
