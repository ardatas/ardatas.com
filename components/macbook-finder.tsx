import { useEffect, useRef, useState } from "react";
import type { DocumentFile, HomeEntry } from "@/lib/macbook-shell";

export type FinderLocation = { path: string; searching?: boolean };

export function MacbookFinder({ location, files, icons, go, open, close }: {
  location: FinderLocation; files: HomeEntry[]; icons: boolean;
  go: (path: string) => void; open: (file: DocumentFile) => void; close: () => void;
}) {
  const [query, setQuery] = useState("");
  const search = useRef<HTMLInputElement>(null);
  useEffect(() => { if (location.searching) search.current?.focus({ preventScroll: true }); }, [location]);
  const prefix = location.path === "/" ? "/" : location.path + "/";
  const entries = files.filter(entry => location.searching
    ? entry.path.toLowerCase().includes(query.trim().toLowerCase())
    : entry.path.startsWith(prefix) && !entry.path.slice(prefix.length).includes("/"));
  return <section className="mac-finder-window" aria-label={location.searching ? "Spotlight search" : "Finder window"}>
    <header>
      <button className="mac-finder-close" onClick={close} aria-label="Close Finder">×</button>
      {!location.searching && <button disabled={location.path === "/"} aria-label="Enclosing folder" onClick={() => go(location.path.slice(0, location.path.lastIndexOf("/")) || "/")}>‹</button>}
      <strong>{location.searching ? "Spotlight" : location.path.split("/").pop() || "ardatas"}</strong>
    </header>
    {location.searching && <input ref={search} aria-label="Search files and folders" placeholder="Search files and folders" value={query} onChange={e => setQuery(e.target.value)} />}
    <div className="mac-finder-files" data-icons={icons && !location.searching}>
      {entries.map(entry => <button key={entry.path} title={entry.path} onClick={() => entry.kind === "pdf" ? open(entry) : go(entry.path)}>
        {entry.kind === "directory" ? <img alt="" src="/macbook/icons/folder.webp" /> : <span className="mac-file-icon" aria-hidden="true">PDF</span>}
        {entry.path.split("/").pop()}
      </button>)}
      {!entries.length && <small>{location.searching ? "No matching files" : "Empty folder"}</small>}
    </div>
  </section>;
}
