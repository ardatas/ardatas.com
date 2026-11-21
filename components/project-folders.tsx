import { useId, useRef, useState } from "react";
import GlassFolder, { type FolderFile } from "@/components/ui/glass-folder-cards";

type Project = { name: string; description: string; highlights: boolean };

type ProjectFoldersProps = {
  projects: Project[];
  initiallyOpen: boolean;
  initialProject: number | null;
};

export function ProjectFolders({ projects, initiallyOpen, initialProject }: ProjectFoldersProps) {
  const [open, setOpen] = useState(initiallyOpen);
  const [active, setActive] = useState(initialProject);
  const catalogId = useId();
  const articles = useRef<(HTMLElement | null)[]>([]);
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

  const files = projects.map(({ name }) => ({ name }));
  return (
    <div className="project-glass-catalog">
      <GlassFolder
        label="Projects" meta={projects.length + " projects"} action="none"
        art="none" width={192} files={files} open={open}
        dismissOnOutsidePress={false}
        onOpenChange={next => { setOpen(next); if (!next) setActive(null); }}
        onFileSelect={(_, index) => read(index)}
      />
      {open && (
        <ul className="project-glass-grid" aria-label="Projects">
          {projects.map((project, index) => {
            const buttonId = catalogId + "-project-" + index;
            const sheets: FolderFile[] = [{ name: "Overview" }];
            if (project.highlights) sheets.push({ name: "Highlights" });
            return (
              <li key={project.name}>
                <div className="project-folder-row">
                  <GlassFolder
                    buttonId={buttonId} label={project.name} art="none" files={sheets} action="none"
                    width={72} className="project-glass-entry"
                    open={active === index} dismissOnOutsidePress={false}
                    onOpenChange={next => setActive(next ? index : null)}
                    onFileSelect={(_, sheet) => read(index, sheet === 1)}
                  />
                  <label className="project-row-name" htmlFor={buttonId}>{project.name}</label>
                </div>
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
