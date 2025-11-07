import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Filter, X } from 'lucide-react';
import { applyTaskFilter, useTaskFilter, type PriorityGroup, type TaskViewFilter } from '../../hooks/useTaskFilter';

interface TaskFilterMenuProps {
  className?: string;
}

// Accessible dropdown filter with roving tab index and proper labeling
export const TaskFilterMenu: React.FC<TaskFilterMenuProps> = ({ className }) => {
  const { filter, setFilter } = useTaskFilter();
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const menuId = useId();
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 320,
  });

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        btnRef.current?.focus();
      }
    };
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node) && !btnRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [open]);

  useEffect(() => {
    if (!open || typeof window === 'undefined' || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const gutter = 12;
    const preferredWidth = 360;
    const maxWidth = Math.min(preferredWidth, window.innerWidth - gutter * 2);
    const left = Math.min(
      Math.max(rect.left + rect.width - maxWidth, gutter),
      window.innerWidth - maxWidth - gutter,
    );
    const top = Math.min(rect.bottom + gutter, window.innerHeight - gutter);
    setMenuPosition({ top, left, width: maxWidth });
  }, [open]);

  const update = (patch: Partial<TaskViewFilter>) => setFilter(patch);
  const hasActiveFilters =
    !!filter.query || filter.assignment !== 'any' || filter.priorityGroup !== 'all' || filter.hideCompleted;

  return (
    <div className={className || ''}>
      <button
        ref={btnRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen(v => !v)}
        className="btn-neon inline-flex items-center gap-2 px-3 py-2 text-xs"
        data-testid="filter-button"
        data-variant={hasActiveFilters ? 'primary' : 'soft'}
        data-size="sm"
        aria-label="Filter button"
        title="Filter button"
      >
        <Filter className="h-4 w-4" />
        Filter
        {hasActiveFilters && (
          <span className="ml-1 inline-flex items-center justify-center text-[10px] rounded-full bg-indigo-600 text-white px-1.5 py-0.5">
            •
          </span>
        )}
      </button>

      {open && typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={panelRef}
            id={menuId}
            role="dialog"
            aria-label="Task filters"
            className="fixed z-[120] rounded-2xl border border-slate-700/60 bg-slate-950/95 backdrop-blur-md shadow-[0_20px_60px_rgba(76,29,149,0.35)] p-4 space-y-4 max-h-[70vh] overflow-y-auto"
            style={{ top: menuPosition.top, left: menuPosition.left, width: menuPosition.width }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="uppercase text-[10px] tracking-[0.3em] text-indigo-300 mb-1">Filters</p>
                <h3 className="text-sm font-semibold text-slate-100">Tune your task view</h3>
              </div>
              <button
                type="button"
                className="icon-btn-neon"
                onClick={() => setOpen(false)}
                aria-label="Close filters"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-4">
              <div className="space-y-2">
                <label htmlFor={`${menuId}-query`} className="block text-[11px] uppercase tracking-wide text-slate-400">Search</label>
                <input
                  id={`${menuId}-query`}
                  type="text"
                  className="neon-input w-full"
                  placeholder="Search title or description..."
                  value={filter.query}
                  onChange={(e) => update({ query: e.target.value })}
                  data-testid="task-filter-query"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label htmlFor={`${menuId}-priority`} className="block text-[11px] uppercase tracking-wide text-slate-400">Priority</label>
                  <select
                    id={`${menuId}-priority`}
                    className="neon-input w-full"
                    value={filter.priorityGroup}
                    onChange={(e) => update({ priorityGroup: e.target.value as PriorityGroup })}
                    data-testid="task-filter-priority"
                  >
                    <option value="all">All</option>
                    <option value="A">A (Urgent)</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                    <option value="D">D</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label htmlFor={`${menuId}-assn`} className="block text-[11px] uppercase tracking-wide text-slate-400">Assignment</label>
                  <select
                    id={`${menuId}-assn`}
                    className="neon-input w-full"
                    value={filter.assignment}
                    onChange={(e) => update({ assignment: e.target.value as any })}
                    data-testid="task-filter-assignment"
                  >
                    <option value="any">Any</option>
                    <option value="me">Me</option>
                    <option value="partner">Partner</option>
                    <option value="both">Both</option>
                  </select>
                </div>
              </div>

              <div className="flex items-start justify-between gap-3 rounded-xl border border-slate-700/60 bg-slate-900/70 px-3 py-2">
                <div>
                  <p className="text-xs font-medium text-slate-100">Hide completed tasks</p>
                  <p className="text-[10px] text-slate-400">Keep your focus on what remains.</p>
                </div>
                <label className="inline-flex items-center gap-2">
                  <input
                    id={`${menuId}-hide-completed`}
                    type="checkbox"
                    className="neon-checkbox"
                    checked={filter.hideCompleted}
                    onChange={(e) => update({ hideCompleted: e.target.checked })}
                    data-testid="task-filter-hide-completed"
                  />
                  <span className="text-xs text-slate-200">Hide</span>
                </label>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};

export default TaskFilterMenu;
