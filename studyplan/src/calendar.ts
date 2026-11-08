import { activeOccurrences } from './model.ts';
import type { Occurrence, Plan, Slot } from './model.ts';
export const escapeICS=(value:string)=>value.replace(/\\/g,'\\\\').replace(/\r\n|\r|\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
export function foldLine(line:string) {
 const enc=new TextEncoder();let out='',size=0;
 for(const character of line){const bytes=enc.encode(character).length;if(size+bytes>75){out+='\r\n ';size=1;}out+=character;size+=bytes;}return out;
}
/** Convert local daytime course times using IANA zone rules; never the viewer's timezone. */
export function berlinUTC(date:string,time:string) {
 const nominal=Date.parse(date+'T'+time+':00Z'); let result=nominal;
 for(let i=0;i<3;i++){const p=Object.fromEntries(new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Berlin',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date(result)).map(x=>[x.type,x.value]));const local=Date.parse(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}Z`);result+=nominal-local;}
 return new Date(result).toISOString().replace(/[-:]/g,'').replace('.000','');
}
function calendarSource(slot: Slot, event: Occurrence): string {
  if (!event.source.startsWith('https://') || /[\\\s\x00-\x1f\x7f-\x9f]/u.test(event.source)) {
    throw new Error('Invalid calendar source URL.');
  }
  const url = new URL(event.source);
  if (url.username || url.password || url.origin !== new URL(slot.source).origin) {
    throw new Error('Unexpected calendar source origin.');
  }
  const tutorial = /^gbs-([1-9][0-9]*)$/.exec(slot.id);
  if (tutorial) {
    const session = /^gbs-session-([1-9][0-9]*)$/.exec(event.id);
    if (!session || event.source !== `https://gbs.cm.in.tum.de/tutorials/sessions/${tutorial[1]}/${session[1]}`) {
      throw new Error('Invalid GBS session reference.');
    }
  }
  return url.href;
}
export function exportICS(slots: Slot[], plan: Plan, provisional=false, now=new Date()) {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Arda Tas//Studyplan//EN',
    'CALSCALE:GREGORIAN', 'X-WR-CALNAME:Studyplan', 'X-WR-TIMEZONE:Europe/Berlin'];
  const eventIds = new Set<string>();
  const timestamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  for (const slot of slots.filter(s => plan.selected.includes(s.id))) {
    for (const event of activeOccurrences(slot, plan, provisional)) {
      if (typeof event.id !== 'string' || !event.id || /[^A-Za-z0-9._-]/.test(event.id) || eventIds.has(event.id)) {
        throw new Error('Invalid or duplicate calendar event ID.');
      }
      eventIds.add(event.id);
      const source = calendarSource(slot, event);
      const description = [slot.kind, `Tutor: ${event.tutor}`, slot.note, `Source checked: ${slot.checkedAt}`, source].join('\n');
      lines.push(
        'BEGIN:VEVENT',
        `UID:${event.id}@studyplan.ardatas.com`,
        `DTSTAMP:${timestamp}`,
        `DTSTART:${berlinUTC(event.date, event.start)}`,
        `DTEND:${berlinUTC(event.date, event.end)}`,
        `SUMMARY:${escapeICS(`${slot.course.toUpperCase()} · ${slot.label}`)}`,
        `LOCATION:${escapeICS(event.room)}`,
        `DESCRIPTION:${escapeICS(description)}`,
        `URL:${source}`,
        `STATUS:${event.status === 'scheduled' ? 'CONFIRMED' : 'TENTATIVE'}`,
        'END:VEVENT',
      );
    }
  }
  return [...lines, 'END:VCALENDAR'].map(foldLine).join('\r\n')+'\r\n';
}
