import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Bookmark, LockKeyhole, Pencil, Plus, X } from 'lucide-react';
import { useNoteMovement } from '../components/links/use-note-movement';
import { TagFields, paperStyle, newTag, type Tag } from '../components/links/tag-fields';
import { printNote } from '../components/links/print-note';
import '../components/links/PaperCrumple.css';
import './links.css';

function PaperFallback({ onError }: { onError: () => void }) {
  useEffect(onError, []);
  return null;
}
const PaperCrumple = lazy(() => import('../components/links/PaperCrumple.jsx')
  .catch(() => ({ default: PaperFallback })));
type Note = { id: string; seq: number; revision: number; tagId: string | null; title: string; url: string; description: string };
type Playback = { id: string; kind: 'gesture' | 'crumple' | 'unfold' };
type Draft = Pick<Note, 'id' | 'title' | 'url' | 'description' | 'tagId'> & { revision?: number };
const newDraft = (): Draft => ({ id: crypto.randomUUID(), title: '', url: '', description: '', tagId: null });

class BoardError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

async function request(action?: string, values: object = {}): Promise<{ notes: Note[]; tags: Tag[]; canWrite: boolean }> {
  const res = await fetch('/links/api.php', action ? {
    method: 'POST', credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', 'X-Links-Board': '1' },
    body: JSON.stringify({ action, ...values }),
  } : { cache: 'no-store' });
  if (!res.headers.get('Content-Type')?.includes('application/json')) {
    throw new Error('The links server is unavailable. Try again in a moment.');
  }
  const result = await res.json();
  if (!res.ok) throw new BoardError(result.error || 'Could not open the board.', res.status);
  return result;
}
const message = (error: unknown) => error instanceof Error ? error.message : 'Could not reach the board.';
function hostname(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, ''); }
  catch { return 'Saved link'; }
}

function PostIt({ note, tag, index, playback, play, stop, edit }: {
  note: Note; tag?: Tag; index: number; playback?: Playback; play: (kind: 'gesture' | 'crumple') => void; stop: () => void; edit?: () => void;
}) {
  const sheet = useRef<HTMLDivElement>(null);
  const paperUnavailable = useRef(false);
  const movement = useNoteMovement(note.id, index, () => {
    if (!paperUnavailable.current && playback?.kind !== 'gesture') play('gesture');
  });
  const [print, setPrint] = useState<ReturnType<typeof printNote> | null>(null);
  useEffect(() => {
    if (!playback) { setPrint(null); return; }
    if (paperUnavailable.current || matchMedia('(prefers-reduced-motion: reduce)').matches) { stop(); return; }
    let current = true;
    document.fonts.ready.then(() => {
      if (!current || !sheet.current) return;
      try { setPrint(printNote(sheet.current)); } catch { stop(); }
    });
    return () => { current = false; };
  }, [playback]);
  return <li ref={movement.slot} {...movement.events} className="note-slot" style={paperStyle(tag?.colour)} data-tone={(note.seq - 1) % 4} data-enter={playback?.kind === 'unfold' || undefined}>
    <div className="note-sheet" ref={sheet}>
      <div className="note-top"><span className="note-host" data-print>{hostname(note.url)}</span>
        {edit && <button className="icon-btn" type="button" aria-label={'Edit ' + note.title} onClick={edit}><Pencil size={15}/></button>}
      </div>
      {tag && <div className="note-tag"><span aria-hidden="true" data-print>{tag.icon}</span> <span data-print>{tag.name}</span></div>}
      <a className="note-link" href={note.url} target="_blank" rel="noopener noreferrer">
        <span data-print>{note.title}</span><span className="note-arrow" aria-hidden="true" data-print>↗</span>
      </a>
      {note.description && <p className="note-description" data-print>{note.description}</p>}
      <button className="paper-corner" type="button" title="Drag to move. Arrow keys move, Home resets." aria-label={'Move ' + note.title + '. Arrow keys to move, Home to reset.'} onKeyDown={movement.keyboard} onClick={() => play('crumple')} />
    </div>
    {playback && print && <div className="note-motion" aria-hidden="true"><Suspense fallback={null}>
      <PaperCrumple {...print} alt="" sceneHeight={print.height} detail={32} releaseDuration={0.77}
        disabled gesture={movement.gesture.current} playback={playback.kind} onPlaybackEnd={stop} onError={() => { paperUnavailable.current = true; stop(); }} />
    </Suspense></div>}
  </li>;
}

function Editor({ initial, tags, tagOnly, createTag, canWrite, unlock, busy, error, close, save, remove }: {
  canWrite: boolean; unlock: (password: string) => void;
  tags: Tag[]; tagOnly: boolean; createTag: (tag: Tag) => Promise<boolean>;
  initial: Draft; busy: boolean; error: string; close: () => void;
  save: (draft: Draft) => void; remove: (draft: Draft) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState(initial);
  const [creatingTag, setCreatingTag] = useState(tagOnly);
  const [tag, setTag] = useState(newTag);
  const selectedTag = tags.find(item => item.id === draft.tagId);
  const [confirm, setConfirm] = useState(false);
  const password = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const element = dialog.current!;
    element.showModal();
    return () => element.close();
  }, []);
  async function saveTag() {
    if (!await createTag(tag)) return;
    if (tagOnly) { close(); return; }
    setDraft(previous => ({ ...previous, tagId: tag.id }));
    setCreatingTag(false);
  }
  return <dialog style={paperStyle(canWrite && !creatingTag ? selectedTag?.colour : undefined)} ref={dialog} className="note-editor" aria-labelledby="editor-title" onCancel={e => { e.preventDefault(); if (!busy) close(); }}>
    <form onSubmit={e => { e.preventDefault(); if (!canWrite) unlock(password.current!.value); else if (creatingTag) void saveTag(); else if (confirm) remove(draft); else save(draft); }}>
      <div className="editor-top"><h2 id="editor-title">{!canWrite ? 'Unlock editing' : creatingTag ? 'New tag' : confirm ? 'Remove this note?' : draft.revision ? 'Edit note' : 'New note'}</h2>
        <button type="button" className="icon-btn" aria-label="Close editor" disabled={busy} onClick={close}><X size={19}/></button></div>
      {!canWrite ? <label>Password<input autoFocus ref={password} type="password" autoComplete="current-password" required maxLength={256}/></label>
        : creatingTag ? <TagFields tag={tag} change={setTag}/> : confirm ? <p className="remove-copy">{draft.title} will be removed from the board.</p> : <>
        <label>Title<input autoFocus required maxLength={100} value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })}/></label>
        <label>URL<input type="url" required maxLength={2048} placeholder="https://" value={draft.url} onChange={e => setDraft({ ...draft, url: e.target.value })}/></label>
        <div className="note-tag-field"><label>Tag<select value={draft.tagId ?? ''} onChange={e => setDraft({ ...draft, tagId: e.target.value || null })}>
          <option value="">No tag</option>
          {tags.map(item => <option key={item.id} value={item.id}>{item.icon} {item.name}</option>)}
        </select></label><button type="button" className="text-btn" onClick={() => {
          setTag(newTag()); setCreatingTag(true);
        }}>New tag</button></div>
        <label>Description <small>(optional)</small><textarea rows={3} maxLength={600} value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })}/></label>
      </>}
      {error && <p className="board-error" role="alert">{error}</p>}
      <div className="editor-actions">
        {canWrite && creatingTag && !tagOnly && <button type="button" className="text-btn" disabled={busy} onClick={() => setCreatingTag(false)}>Back to note</button>}
        {canWrite && !creatingTag && (confirm ? <button type="button" className="text-btn" disabled={busy} onClick={() => setConfirm(false)}>Keep note</button>
          : draft.revision && <button type="button" className="text-btn" disabled={busy} onClick={() => setConfirm(true)}>Remove…</button>)}
        <button className="ink-btn" disabled={busy}>{!canWrite ? (busy ? 'Unlocking…' : 'Unlock editing') : busy ? 'Saving…' : creatingTag ? 'Save tag' : confirm ? 'Remove note' : 'Save note'}</button>
      </div>
    </form>
  </dialog>;
}

type InitialBoard = { notes: Note[] | null; tags?: Tag[]; canWrite: boolean; error?: string };
const initialElement = document.getElementById('initial-links');
const initial: InitialBoard | null = initialElement ? JSON.parse(initialElement.textContent!) : null;

function LinksBoard() {
  const [notes, setNotes] = useState<Note[] | null>(initial?.notes ?? null);
  const [tags, setTags] = useState<Tag[]>(initial?.tags ?? []);
  const [tagOnly, setTagOnly] = useState(false);
  const [loading, setLoading] = useState(initial === null);
  const [canWrite, setCanWrite] = useState(initial?.canWrite ?? false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initial?.error ?? '');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [playback, setPlayback] = useState<Playback>();
  const [status, setStatus] = useState('');
  const version = useRef(0);
  const createButton = useRef<HTMLButtonElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  function forget() { setTags([]); setCanWrite(false); setNotes(null); setDraft(null); setPlayback(undefined); setStatus(''); }
  async function refresh() {
    const token = ++version.current;
    try {
      const result = await request();
      if (token === version.current) { setNotes(result.notes); setTags(result.tags ?? []); setCanWrite(result.canWrite); }
    } catch (e) {
      if (token !== version.current) return;
      forget();
      setError(message(e));
    } finally { if (token === version.current) setLoading(false); }
  }
  useEffect(() => {
    if (!initial) void refresh();
    const restored = (event: PageTransitionEvent) => { if (event.persisted) { forget(); setLoading(true); void refresh(); } };
    window.addEventListener('pageshow', restored);
    return () => window.removeEventListener('pageshow', restored);
  }, []);
  async function submit(action: string, values: object = {}) {
    if (busy) return false;
    ++version.current;
    setBusy(true); setError('');
    try {
      const result = await request(action, values);
      setNotes(result.notes); setTags(result.tags ?? []);
      setCanWrite(result.canWrite);
      if (action === 'create') setPlayback({ id: (values as Draft).id, kind: 'unfold' });
      if (action === 'createTag') setStatus('Tag saved.');
      else if (action !== 'unlock' && action !== 'lock') {
        closeEditor();
        setStatus(action === 'delete' ? 'Note removed.' : 'Note saved.');
      }
      return true;
    } catch (e) {
      if (e instanceof BoardError && e.status === 401) {
        setCanWrite(false);
      }
      if (e instanceof BoardError && e.status === 409 && action !== 'createTag') {
        setDraft(null); await refresh();
      }
      setError(message(e));
      return false;
    } finally { setBusy(false); }
  }
  function openEditor(value: Draft, onlyTag = false) {
    setTagOnly(onlyTag);
    opener.current = document.activeElement as HTMLElement;
    setError(''); setDraft(value);
  }
  function closeEditor() {
    setDraft(null); setError('');
    requestAnimationFrame(() => (opener.current?.isConnected ? opener.current : createButton.current)?.focus());
  }
  if (loading) return <p className="board-loading" role="status">Opening links…</p>;
  if (!notes) return <div className="board-loading"><p role="alert">{error}</p>
    <button className="text-btn" onClick={() => { setError(''); setLoading(true); void refresh(); }}>Try again</button></div>;
  return <section className="board-desk">
    <header className="board-head"><div><div className="board-counter"><Bookmark size={13}/> {notes.length} {notes.length === 1 ? 'note' : 'notes'}</div><h1>Saved links</h1></div>
      <div className="board-actions">{canWrite && <button className="text-btn" onClick={() => submit('lock')} disabled={busy}><LockKeyhole size={15}/> Lock editing</button>}
      {canWrite && <button className="text-btn" onClick={() => openEditor(newDraft(), true)}>New tag</button>}
      <button ref={createButton} className="ink-btn" onClick={() => openEditor(newDraft())}><Plus size={17}/> New note</button></div></header>
    {!draft && error && <p className="board-error" role="alert">{error}</p>}
    <span role="status" className="sr-only">{status}</span>
    {notes.length === 0 && <p className="empty-board">Save your first link with “New note”.</p>}
    <ul className="note-grid">{notes.map((note, index) => <PostIt key={note.id} note={note} tag={tags.find(tag => tag.id === note.tagId)} index={index}
      playback={playback?.id === note.id ? playback : undefined}
      stop={() => setPlayback(active => active?.id === note.id ? undefined : active)}
      play={kind => setPlayback(active => active?.id === note.id && active.kind === kind ? active : { id: note.id, kind })}
      edit={canWrite ? () => openEditor(note) : undefined}/>)}</ul>
    {draft && <Editor key={draft.id} initial={draft} tags={tags} tagOnly={tagOnly} createTag={tag => submit('createTag', tag)} canWrite={canWrite} unlock={password => submit('unlock', { password })} busy={busy} error={error} close={closeEditor}
      save={value => submit(value.revision ? 'edit' : 'create', value)} remove={value => submit('delete', value)}/>}
  </section>;
}
createRoot(document.getElementById('links-board')!).render(<LinksBoard/>);
