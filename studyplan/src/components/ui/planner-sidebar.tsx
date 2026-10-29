import { useEffect, useState, type ReactNode } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './dialog';

export function PlannerSidebar({ open, onOpenChange, children }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  const [mobile, setMobile] = useState(() => window.matchMedia('(max-width: 1000px)').matches);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 1000px)');
    const update = () => { setMobile(media.matches); onOpenChange(false); };
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [onOpenChange]);

  if (!mobile) return <aside className="planner-sidebar" aria-label="Planner controls">{children}</aside>;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent id="planner-controls" className="planner-sidebar sidebar-drawer" onCloseAutoFocus={event => {
        event.preventDefault();
        if (!document.querySelector('.utility-dialog')) document.getElementById('planner-controls-toggle')?.focus();
      }}>
        <DialogHeader className="sidebar-drawer-heading">
          <DialogTitle>Planner controls</DialogTitle>
          <DialogDescription>Views, filters and calendar export.</DialogDescription>
        </DialogHeader>
        <div className="sidebar-drawer-content">{children}</div>
      </DialogContent>
    </Dialog>
  );
}
