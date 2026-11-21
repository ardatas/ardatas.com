import { useLayoutEffect, useRef, useState } from "react";
import GlassFolder, { type ArtPreset, type FolderFile } from "@/components/ui/glass-folder-cards";

type Project = { name: string; description: string; highlights: boolean };
const artwork: ArtPreset[] = ["aurora", "ember", "glacier", "verdant", "dusk"];

type ProjectFoldersProps = {
  projects: Project[];
  initiallyOpen: boolean;
  initialProject: number | null;
};

export function ProjectFolders({ projects, initiallyOpen, initialProject }: ProjectFoldersProps) {
  const [open, setOpen] = useState(initiallyOpen);
  const [active, setActive] = useState(initialProject);
  const container = useRef<HTMLDivElement>(null);
  const articles = useRef<(HTMLElement | null)[]>([]);
  const [width, setWidth] = useState(280);

  useLayoutEffect(() => {
    const node = container.current!;
    const measure = () => setWidth(node.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  function read(index: number, highlights = false) {
    setActive(index);
    requestAnimationFrame(() => {
      const article = articles.current[index];
      if (!article) return;
      const notes = article.querySelector("details");
      if (notes && highlights) notes.open = true;
      article.focus({ preventScroll: true });
      article.scrollIntoView({ block: "nearest", behavior: "instant" });
    });
  }

  const files = projects.map((project, index) => ({ name: project.name, art: artwork[index % artwork.length] }));
  return (
    <div ref={container} className="project-glass-catalog">
      <GlassFolder
        label="Projects" meta={projects.length + " projects"} action="none"
        art="aurora" width={Math.min(410, width * .8)} files={files} open={open}
        dismissOnOutsidePress={false}
        onOpenChange={next => { setOpen(next); if (!next) setActive(null); }}
        onFileSelect={(_, index) => read(index)}
      />
      {open && (
        <ul className="project-glass-grid" aria-label="Projects">
          {projects.map((project, index) => {
            const art = artwork[index % artwork.length];
            const sheets: FolderFile[] = [{ name: "Overview", art }];
            if (project.highlights) sheets.push({ name: "Highlights", art: "glacier" });
            return (
              <li key={project.name}>
                <GlassFolder
                  label={project.name} art={art} files={sheets} action="none" tone={index % 3 === 1 ? "dark" : "light"}
                  width={Math.min(265, width * .8)} className="project-glass-entry"
                  open={active === index} dismissOnOutsidePress={false}
                  onOpenChange={next => setActive(next ? index : null)}
                  onFileSelect={(_, sheet) => read(index, sheet === 1)}
                />
                {active === index && (
                  <article className="project-description" aria-label={project.name} tabIndex={-1}
                    ref={node => { articles.current[index] = node; }}
                    dangerouslySetInnerHTML={{ __html: project.description }} />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// The build renders the Markdown and a native disclosure list. Enhance that same
// content so links, highlights and the no-JavaScript version stay in sync.
export function readProjects(catalog: HTMLElement): Project[] {
  return Array.from(catalog.querySelectorAll(".project-entry"), entry => {
    const article = entry.querySelector("article")!;
    return {
      name: entry.querySelector("summary")!.textContent!.trim(),
      description: article.innerHTML,
      highlights: !!article.querySelector(".project-highlights"),
    };
  });
}
