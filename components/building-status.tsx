import LoadingState from "@/components/ui/loading-state";

export default function BuildingStatus() {
  return (
    <section aria-label="Always a work in progress" className="building-status border-t border-[var(--notebook-border)] mt-5 pt-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="font-mono text-sm font-medium">Still building<span className="text-[var(--notebook-muted)]">.</span></p>
        <p className="text-xs text-[var(--notebook-muted)]">A personal website is never really finished.</p>
      </div>
      <div className="mt-4 flex flex-wrap gap-x-8 gap-y-3">
        <LoadingState label="Turning ideas into things" variant="Drive" showElapsed={false} />
        <LoadingState label="Overthinking the details" variant="Dots" showElapsed={false} />
        <LoadingState label="Following another rabbit hole" variant="Orbit" showElapsed={false} />
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <LoadingState label="You've been here for" variant="Orbit" />
        <a href="#projects" className="social-link font-mono text-xs">See what made it out of localhost ↗</a>
      </div>
    </section>
  );
}
