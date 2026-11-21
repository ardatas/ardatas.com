# Git workflow

Whenever a task changes this repository, commit the task’s changes and push the commit to the current branch’s remote before reporting completion. Keep unrelated edits out of the commit.

## Homepage MacBook

Edit the ordered `apps` list in `components/macbook-desktop.tsx` to add, remove, or reorder Dock items. Each ID uses a matching `public/macbook/icons/<id>.webp`. The same list sets the initial running dots, badges, and separator before utilities.

The frame lives in `components/ui/macbook-pro.tsx`, Dock interactions in `components/ui/mac-os-dock.tsx`, and sizing in `src/macbook.css`. Replace `public/macbook/wallpaper.webp` to change the desktop. Run `pnpm build` to refresh the checked-in site.

For Terminal content, place public-facing PDFs in `macbook-home/`. Its directories become the folders under `~`. Empty folders can contain a `.gitkeep`. The build uses Poppler to index the tree and render each PDF page for the zoomable viewer. Hidden entries and symbolic links are skipped. Rebuild after adding or removing files.

The command interpreter is `lib/macbook-shell.ts`. The lock screen lives in `components/macbook-desktop.tsx`. The Terminal, session menu, and page-level document viewer live in `components/ui/terminal.tsx`, `mac-os-menu-bar.tsx`, and `safari-01.tsx`.
