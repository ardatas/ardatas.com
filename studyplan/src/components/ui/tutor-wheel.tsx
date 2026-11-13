import { useEffect, useState } from 'react';
import { ArrowRight, Plus, RotateCw, X } from 'lucide-react';
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
  const [pending, setPending] = useState<typeof result>(null);
  const visited = visitedModules(slots, state);
  const upcoming = upcomingTutors(slots, now);
  const excluded = (id: string) => state.hidden.includes(id) || (visited.has(id) && !state.restored.includes(id));
  const eligible = upcoming.filter(g => !excluded(g.course));
  const signature = eligible.map(g => g.choices.map(c => c.event.id).join(',')).join('|');
  const winner = !pending && result?.signature === signature ? result.choice : null;
  useEffect(() => {
    // Cancel a stale draw when the clock or another tab changes the candidates.
    setPending(null);
    setResult(null);
  }, [signature]);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const finish = () => { if (media.matches && pending) { setResult(pending); setPending(null); } };
    media.addEventListener('change', finish);
    return () => media.removeEventListener('change', finish);
  }, [pending]);
  function finishSpin() {
    if (pending?.signature === signature) setResult(pending);
    setPending(null);
  }
  const name = (id: string) => courses.find(c => c.id === id)!.short;
  function spin() {
    // Resolve against the latest rendered clock; every module has equal odds.
    if (!eligible.length || pending) return;
    const index = Math.floor(Math.random() * eligible.length);
    const choices = eligible[index].choices;
    const next = { choice: choices[Math.floor(Math.random() * choices.length)], signature };
    setResult(null);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) setResult(next);
    else setPending(next);
    const target = 360 - (index + .5) * 360 / eligible.length;
    setRotation(previous => previous + 2520 + (target - previous % 360 + 360) % 360);
  }
  function toggle(course: string) {
    const restore = excluded(course);
    onChange({ ...state, hidden: restore ? state.hidden.filter(c => c !== course) : [...state.hidden, course],
      restored: restore ? [...new Set([...state.restored, course])] : state.restored.filter(c => c !== course) });
    setResult(null);
  }
  const background = eligible.length ? `conic-gradient(${eligible.map((g,i) => `${courseColors[g.course]} ${i*100/eligible.length}% ${(i+1)*100/eligible.length}%`).join(',')})` : 'var(--panel)';
  return <Dialog open={open} onOpenChange={value => { setOpen(value); if (!value) setPending(null); }}>
    <DialogTrigger asChild><button className="wheel-trigger" aria-label="Open tutor spin wheel" title="Tutors Now"><span className="wheel-trigger-icon" aria-hidden="true">🎡</span><span className="wheel-trigger-label">Tutors Now<small>Pick a session</small></span></button></DialogTrigger>
    <DialogContent className="utility-dialog tutor-wheel-dialog">
      <DialogHeader className="wheel-heading"><span className="wheel-eyebrow">A LITTLE SPONTANEITY</span><DialogTitle>Where to next?</DialogTitle><DialogDescription>Find your next tutorial with a spin.</DialogDescription></DialogHeader>
      <div className="wheel-status"><span><i/> {eligible.length} modules in the wheel</span><span>{now.time} · Berlin</span></div><div className="wheel-layout"><section className="wheel-picker" aria-label="Random tutor picker">
      <div className={`wheel-stage ${pending ? 'is-spinning' : ''}`} aria-hidden="true"><span className="wheel-pointer">▼</span><div className="tutor-wheel" onTransitionEnd={event => { if (event.target === event.currentTarget && event.propertyName === 'transform') finishSpin(); }} style={{background, transform:`rotate(${rotation}deg)`}}>{eligible.map((g,i) => <span key={g.course} style={{transform:`translate(-50%, -50%) rotate(${(i+.5)*360/eligible.length}deg) translateY(calc(var(--wheel-size) * -.35)) rotate(90deg)`}}>{name(g.course)}</span>)}</div><span className="wheel-hub"><RotateCw size={25}/></span></div>
      <button className="primary wheel-spin" disabled={!eligible.length || !!pending} aria-label="Spin for Tutors Now" aria-busy={!!pending} onClick={spin}><RotateCw size={20}/>{pending ? 'Finding your next session…' : 'Spin for Tutors Now'}</button>
      {!eligible.length && <p role="status">No eligible tutorials left today. Restore a module below, or try again another day.</p>}
      <div aria-live="polite">{winner && <div className="wheel-result"><span className="wheel-eyebrow">YOUR NEXT SESSION</span><strong>{name(winner.slot.course)} · {winner.slot.label}</strong><p>{winner.event.start}–{winner.event.end} · {winner.event.tutor}</p><p>{winner.event.room}</p><button onClick={() => { setOpen(false); onChoose(winner); }}>View chosen session<ArrowRight size={16}/></button></div>}</div>
      </section><section className="wheel-options"><h3>Make it your own</h3><p className="muted">One slice per module. Remove any you’d like to skip.</p><div className="wheel-modules" aria-label="Wheel modules">{courses.map(c => <div className={`wheel-module ${excluded(c.id)?'is-excluded':''}`} key={c.id}><span className="wheel-course-dot" style={{background:courseColors[c.id]}}/><div><strong>{c.short}</strong><small>{visited.has(c.id) ? 'Visited this week · ' : ''}{upcoming.find(g => g.course === c.id)?.choices[0].event.start || 'No upcoming tutorial today'}</small></div><button disabled={!!pending} aria-label={`${excluded(c.id) ? 'Restore' : 'Remove'} ${c.short} ${excluded(c.id) ? 'to' : 'from'} wheel`} onClick={() => toggle(c.id)}>{excluded(c.id) ? <><Plus size={15}/>Add back</> : <X size={17}/>}</button></div>)}</div>
      <p className="wheel-hint">Visited modules are automatically skipped. You can always add them back.</p></section></div><p className="wheel-privacy">Only in this browser · Fresh start every Monday</p>
    </DialogContent>
  </Dialog>;
}
