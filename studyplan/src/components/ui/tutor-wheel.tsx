import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './dialog';
import { courses, slots } from '../../data';
import { courseColors } from '../../course-colors';
import { upcomingTutors, visitedModules } from '../../tutor-week';
import type { TutorChoice, TutorWeek } from '../../tutor-week';
import type { berlinNow } from '../../model';

export function TutorWheel({ now, state, onChange, onChoose }: {
  now: ReturnType<typeof berlinNow>; state: TutorWeek;
  onChange: (state: TutorWeek) => void; onChoose: (choice: TutorChoice) => void;
}) {
  const [open, setOpen] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<{ choice: TutorChoice; signature: string } | null>(null);
  const visited = visitedModules(slots, state);
  const upcoming = upcomingTutors(slots, now);
  const excluded = (id: string) => state.hidden.includes(id) || (visited.has(id) && !state.restored.includes(id));
  const eligible = upcoming.filter(g => !excluded(g.course));
  const signature = eligible.map(g => g.choices.map(c => c.event.id).join(',')).join('|');
  const winner = result?.signature === signature ? result.choice : null;
  const name = (id: string) => courses.find(c => c.id === id)!.short;
  function spin() {
    // Resolve against the latest rendered clock; every module has equal odds.
    if (!eligible.length) return;
    const index = Math.floor(Math.random() * eligible.length);
    const choices = eligible[index].choices;
    setResult({ choice: choices[Math.floor(Math.random() * choices.length)], signature });
    const target = 360 - (index + .5) * 360 / eligible.length;
    setRotation(previous => previous + 1080 + (target - previous % 360 + 360) % 360);
  }
  function toggle(course: string) {
    const restore = excluded(course);
    onChange({ ...state, hidden: restore ? state.hidden.filter(c => c !== course) : [...state.hidden, course],
      restored: restore ? [...new Set([...state.restored, course])] : state.restored.filter(c => c !== course) });
    setResult(null);
  }
  const background = eligible.length ? `conic-gradient(${eligible.map((g,i) => `${courseColors[g.course]} ${i*100/eligible.length}% ${(i+1)*100/eligible.length}%`).join(',')})` : 'var(--panel)';
  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><button className="wheel-trigger" aria-label="Open tutor spin wheel" title="Tutors Now">🎡</button></DialogTrigger>
    <DialogContent className="utility-dialog tutor-wheel-dialog">
      <DialogHeader className="wheel-heading"><DialogTitle>Tutors Now</DialogTitle><DialogDescription>Spin for a module’s next tutorial today. {now.time} · Europe/Berlin</DialogDescription></DialogHeader>
      <p className="muted">Equal chance per module. Visited modules stay out unless you add them back. Only sessions that haven’t started are included.</p>
      <div className="wheel-stage" aria-hidden="true"><span className="wheel-pointer">▼</span><div className="tutor-wheel" style={{background, transform:`rotate(${rotation}deg)`}}>{eligible.map((g,i) => <span key={g.course} style={{transform:`translate(-50%, -50%) rotate(${(i+.5)*360/eligible.length}deg) translateY(-82px) rotate(90deg)`}}>{name(g.course)}</span>)}</div><span className="wheel-hub">🎡</span></div>
      <button className="primary" disabled={!eligible.length} onClick={spin}>Spin for Tutors Now</button>
      {!eligible.length && <p role="status">No eligible tutorials left today. Restore a module below, or try again another day.</p>}
      <div aria-live="polite">{winner && <div className="wheel-result"><strong>{name(winner.slot.course)} · {winner.slot.label}</strong><p>{winner.event.start}–{winner.event.end} · {winner.event.tutor}</p><p>{winner.event.room}</p><button onClick={() => { setOpen(false); onChoose(winner); }}>View chosen session</button></div>}</div>
      <div className="wheel-modules" aria-label="Wheel modules">{courses.map(c => <div className="wheel-module" key={c.id}><div><strong>{c.short}</strong><small>{visited.has(c.id) ? 'Visited this week · ' : ''}{upcoming.find(g => g.course === c.id)?.choices[0].event.start || 'No upcoming tutorial today'}</small></div><button aria-label={`${excluded(c.id) ? 'Restore' : 'Remove'} ${c.short} ${excluded(c.id) ? 'to' : 'from'} wheel`} onClick={() => toggle(c.id)}>{excluded(c.id) ? 'Add back' : 'Remove'}</button></div>)}</div>
      <p className="muted">Visits and wheel choices are private to this browser and reset each Monday.</p>
    </DialogContent>
  </Dialog>;
}
