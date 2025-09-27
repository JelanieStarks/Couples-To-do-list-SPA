import React, { useEffect, useId, useRef, useState } from 'react';
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

  const update = (patch: Partial<TaskViewFilter>) => setFilter(patch);

  return (
    <div className={`relative ${className || ''}`}>
      <button
        ref={btnRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen(v => !v)}
        className="px-3 py-2 text-xs rounded-lg bg-slate-800/70 border border-slate-600 text-slate-200 hover:text-white hover:border-indigo-400 inline-flex items-center gap-2"
        data-testid="task-filter-toggle"
        title="Filter tasks"
      >
        <Filter className="h-4 w-4" />
        Filters
        {(filter.query || filter.assignment !== 'any' || filter.priorityGroup !== 'all' || filter.hideCompleted) && (
          <span className="ml-1 inline-flex items-center justify-center text-[10px] rounded-full bg-indigo-600 text-white px-1.5 py-0.5">
            •
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          id={menuId}
          role="dialog"
          aria-label="Task filters"
          className="absolute z-20 mt-2 w-72 right-0 rounded-lg border border-slate-700 bg-slate-900 shadow-xl p-3"
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-slate-200 tracking-wide">Filter Tasks</h3>
            <button
              type="button"
              className="p-1 rounded hover:bg-slate-800"
              onClick={() => setOpen(false)}
              aria-label="Close filters"
            >
              <X className="h-4 w-4 text-slate-400" />
            </button>
          </div>

          {/* Text search */}
          <div className="mb-3">
            <label htmlFor={`${menuId}-query`} className="block text-[11px] text-slate-400 mb-1">Search</label>
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

          {/* Priority group */}
          <div className="mb-3">
            <label htmlFor={`${menuId}-priority`} className="block text-[11px] text-slate-400 mb-1">Priority</label>
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

          {/* Assignment */}
          <div className="mb-3">
            <label htmlFor={`${menuId}-assn`} className="block text-[11px] text-slate-400 mb-1">Assignment</label>
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

          {/* Completed */}
          <div className="flex items-center gap-2">
            <input
              id={`${menuId}-hide-completed`}
              type="checkbox"
              className="neon-checkbox"
              checked={filter.hideCompleted}
              onChange={(e) => update({ hideCompleted: e.target.checked })}
              data-testid="task-filter-hide-completed"
            />
            <label htmlFor={`${menuId}-hide-completed`} className="text-[12px] text-slate-300">Hide completed</label>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskFilterMenu;
