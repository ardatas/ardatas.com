import { useEffect, useRef, useState } from "react";
import { execute, initialShell, promptFor, type DocumentFile, type HomeEntry } from "@/lib/macbook-shell";

export function Terminal({ files, visible, onHide, onOpen }: {
  files: HomeEntry[]; visible: boolean; onHide: () => void; onOpen: (file: DocumentFile) => void;
}) {
  const [state, setState] = useState(initialShell);
  const [lines, setLines] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const draft = useRef("");
  const field = useRef<HTMLInputElement>(null);
  const scroll = useRef<HTMLDivElement>(null);

  useEffect(() => { if (visible) field.current?.focus({ preventScroll: true }); }, [visible]);
  useEffect(() => { if (scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight; }, [lines, visible]);

  function submit(command: string) {
    const result = execute(files, state, command);
    setLines(previous => result.clear ? [] : [...previous, [promptFor(state.cwd) + " " + command, result.output].filter(Boolean).join("\n")]);
    setState({ cwd: result.cwd, previous: result.previous });
    if (command.trim()) {
      setHistory(previous => [...previous, command]);
      setHistoryIndex(history.length + 1);
    } else setHistoryIndex(history.length);
    draft.current = "";
    setInput("");
    if (result.document) onOpen(result.document);
  }

  return <section className="mac-terminal" aria-label="Terminal" hidden={!visible}>
    <header className="mac-terminal-title">
      <span className="mac-lights"><button aria-label="Hide Terminal" onClick={onHide} /><i /><i /></span>
      <span>{state.cwd === "/" ? "~" : state.cwd.split("/").pop()} — zsh</span>
    </header>
    <div className="mac-terminal-scroll" ref={scroll}>
      <div className="mac-terminal-hint">Type <b>ls</b> to list files or <b>help</b> for commands.</div>
      <div role="log" aria-label="Terminal history">{lines.map((line, i) => <pre key={i}>{line}</pre>)}</div>
      <form onSubmit={event => { event.preventDefault(); submit(input); }}>
        <label htmlFor="mac-command">{promptFor(state.cwd)}</label>{" "}
        <input id="mac-command" ref={field} aria-label="Terminal command" autoCapitalize="none" autoCorrect="off" autoComplete="off" spellCheck={false}
          enterKeyHint="go" value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
            e.preventDefault();
            if (historyIndex === history.length) draft.current = input;
            const index = Math.max(0, Math.min(history.length, historyIndex + (e.key === "ArrowUp" ? -1 : 1)));
            setHistoryIndex(index); setInput(history[index] ?? draft.current);
          }} />
      </form>
    </div>
  </section>;
}
