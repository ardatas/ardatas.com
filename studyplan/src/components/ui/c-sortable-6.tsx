import type { ReactNode } from 'react';
import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

export interface SidebarNavItem {
  id: string;
  label: string;
  icon: ReactNode;
  active?: boolean;
  count?: number;
  className?: string;
  onSelect: () => void;
}

function NavigationRow({ item }: { item: SidebarNavItem }) {
  const { setNodeRef, setActivatorNodeRef, transform, transition, attributes, listeners, isDragging } = useSortable({ id: item.id });
  return (
    <div ref={setNodeRef} className="sidebar-nav-row" data-dragging={isDragging}
      style={{ transform: CSS.Transform.toString(transform), transition }}>
      <button type="button" className={`sidebar-nav-link ${item.className || ''}`} aria-pressed={item.active} onClick={item.onSelect}>
        {item.icon}<span>{item.label}</span>
        {item.count !== undefined && <span className="sidebar-count">{item.count}</span>}
      </button>
      <button ref={setActivatorNodeRef} type="button" className="sidebar-grip" {...attributes} {...listeners} aria-label={`Reorder ${item.label}`}>
        <GripVertical size={15} aria-hidden="true" />
      </button>
    </div>
  );
}

/** Adapts the supplied sortable navigation scaffold to real planner actions. */
export default function SortableSidebarNav({ items, order, onOrderChange }: {
  items: SidebarNavItem[];
  order: string[];
  onOrderChange: (order: string[]) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  return (
    <nav aria-label="Planner sections" className="sidebar-navigation">
      <h2 className="sidebar-section-title">Navigation</h2>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={({ active, over }) => {
        if (over && active.id !== over.id) onOrderChange(arrayMove(order, order.indexOf(String(active.id)), order.indexOf(String(over.id))));
      }}>
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          {order.map(id => { const item = items.find(item => item.id === id); return item && <NavigationRow key={id} item={item} />; })}
        </SortableContext>
      </DndContext>
    </nav>
  );
}
