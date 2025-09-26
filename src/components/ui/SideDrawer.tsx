import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTask } from '../../contexts/TaskContext';
import { CheckCircle2, Trash2, RotateCcw, XCircle, Inbox, LayoutGrid, CalendarDays, User2, Brain, Settings, ChevronDown } from 'lucide-react';
import ExportTasks from '../tasks/ExportTasks';
import { PartnerManager } from '../auth/PartnerManager';

interface SideDrawerProps {
  open: boolean;
  onClose: () => void;
  // drawer: right-side panel; full: full-screen overlay
  variant?: 'drawer' | 'full';
}

// 🛠 Side Drawer - Archive & Deleted Tasks Management
export const SideDrawer: React.FC<SideDrawerProps> = ({ open, onClose, variant = 'drawer' }) => {
  const { getCompletedTasks, getDeletedTasks, restoreTask, hardDeleteTask, toggleTaskComplete } = useTask() as any;
  const completed = getCompletedTasks()
    .slice()
    .sort((a:any,b:any) => {
      if (a.completedAt && b.completedAt) return new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime();
      if (a.completedAt) return -1;
      if (b.completedAt) return 1;
      return 0;
    });
  const deleted = getDeletedTasks()
    .slice()
    .sort((a:any,b:any) => {
      if (a.deletedAt && b.deletedAt) return new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime();
      if (a.deletedAt) return -1;
      if (b.deletedAt) return 1;
      return 0;
    });
  const [showCompleted, setShowCompleted] = useState(true);
  const [showDeleted, setShowDeleted] = useState(true);

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && open) onClose();
  }, [open, onClose]);

  const firstNavItemRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    queueMicrotask(() => firstNavItemRef.current?.focus());
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  const portalTarget = typeof document !== 'undefined' ? document.body : null;

  const content = (
    <div className={`fixed inset-0 z-[100] ${open ? '' : 'pointer-events-none'} `} aria-hidden={!open} data-testid="drawer-root" data-tag="drawer-root">
      {/* Backdrop with slight delay for smoother entrance */}
      <div
        className={`absolute inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
        data-testid="drawer-backdrop"
      />
      {/* Drawer / Full-screen Panel */}
      <aside
        className={[
          'transform transition-transform duration-500 ease-[cubic-bezier(.18,.89,.32,1.05)] flex flex-col rounded-none shadow-2xl',
          variant === 'full'
            ? `${open ? 'translate-x-0' : 'translate-x-full'} fixed inset-0 w-screen h-screen bg-slate-900 text-slate-100`
            : `${open ? 'translate-x-0' : 'translate-x-full'} absolute top-0 right-0 h-full w-full max-w-none md:max-w-[520px] lg:max-w-[640px] panel-neon panel-neon-border !border-slate-700/60`
        ].join(' ')}
        role="dialog"
        aria-modal="true"
        aria-label="Menu and archives"
        data-testid="side-drawer"
        data-open={open || undefined}
        data-tag="drawer-panel"
        onClick={(e) => e.stopPropagation()}
        style={{ pointerEvents: 'auto' }}
      >
        <div className={`flex items-center justify-between mb-4 pb-2 border-b border-slate-700/60 ${variant === 'full' ? 'px-3' : 'px-1'}`} data-testid="drawer-header" data-tag="drawer-header">
          <h2 className="text-sm font-semibold tracking-wider text-slate-200 uppercase">Menu</h2>
          <button className="icon-btn-neon" onClick={onClose} aria-label="Close drawer">✕</button>
        </div>

        {/* Primary Nav */}
        <nav className={`mb-4 ${variant === 'full' ? 'px-3' : 'px-1'}`} aria-label="Primary" data-tag="drawer-nav">
          <ul className="space-y-1 text-sm font-medium tracking-wide" data-testid="nav-list">
            {[
              { icon: LayoutGrid, label: 'Dashboard' },
              { icon: CalendarDays, label: 'Weekly Planner' },
              { icon: Brain, label: 'AI Import' },
              { icon: User2, label: 'Partner' },
              { icon: Settings, label: 'Settings' },
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <li key={item.label} style={{ animationDelay: `${idx * 55}ms` }} className="opacity-0 animate-fade-slide-in">
                  <button
                    ref={idx === 0 ? firstNavItemRef : undefined}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-slate-200 border border-slate-700/40 hover:border-slate-500/50 ${variant === 'full' ? 'bg-slate-800/60 hover:bg-slate-700/60' : 'bg-slate-800/40 hover:bg-slate-700/50'} shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500/60 focus:ring-offset-2 focus:ring-offset-slate-900`}> 
                    <Icon className="h-4 w-4 opacity-80" /> {item.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Export & Share */}
        <section className={`${variant === 'full' ? 'px-3' : 'px-1'} mb-4`} data-testid="drawer-export">
          <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-2">
            <h3 className="text-sm font-semibold text-slate-200 mb-2">Export & Share</h3>
            <div className="bg-white rounded-lg">
              <ExportTasks />
            </div>
          </div>
        </section>

        {/* Partner Manager (Invite code, connect form, color settings) */}
        <section className={`${variant === 'full' ? 'px-3' : 'px-1'} mb-6`} data-testid="drawer-partner">
          <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-2">
            <h3 className="text-sm font-semibold text-slate-200 mb-2">Partner & Colors</h3>
            <div className="bg-white rounded-lg">
              <PartnerManager />
            </div>
          </div>
        </section>

        <div className={`mt-1 mb-4 text-[10px] uppercase tracking-wider text-slate-500 font-semibold ${variant === 'full' ? 'px-3' : 'px-1'}`}>Archives</div>

        {/* Completed Tasks Section */}
        <div className={`mb-6 ${variant === 'full' ? 'px-3' : 'px-1'}`}>
          <button
            onClick={() => setShowCompleted(v => !v)}
            className="w-full flex items-center justify-between text-left mb-2 btn-neon group" data-variant="soft" data-size="sm"
            aria-expanded={showCompleted}
            data-testid="toggle-completed"
          >
            <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Completed ({completed.length})</span>
            <span className="flex items-center gap-1 text-[10px] opacity-70">
              {showCompleted ? 'Hide' : 'Show'}
              <ChevronDown className={`h-3 w-3 transition-transform duration-300 ${showCompleted ? 'rotate-180' : 'rotate-0'}`} />
            </span>
          </button>
          {showCompleted && (
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1 scroll-thin" data-testid="completed-section">
              {completed.length === 0 && (
                <div className="text-[11px] text-slate-500 flex items-center gap-2"><Inbox className="h-4 w-4" /> None yet</div>
              )}
              {completed.map((task: any) => (
                <div key={task.id} className="group relative p-2 rounded bg-slate-800/60 border border-slate-700/70">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium text-slate-200 line-through opacity-70 break-words">{task.title}</p>
                      {task.completedAt && <p className="text-[9px] text-slate-500 mt-1">Done {new Date(task.completedAt).toLocaleString()}</p>}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => toggleTaskComplete(task.id)}
                        className="icon-btn-neon" aria-label="Mark incomplete"
                        title="Mark incomplete"
                      >↺</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Deleted Tasks Section */}
        <div className={`mb-2 ${variant === 'full' ? 'px-3' : 'px-1'}`}>
          <button
            onClick={() => setShowDeleted(v => !v)}
            className="w-full flex items-center justify-between text-left mb-2 btn-neon group" data-variant="soft" data-size="sm"
            aria-expanded={showDeleted}
            data-testid="toggle-deleted"
          >
            <span className="flex items-center gap-2"><Trash2 className="h-4 w-4" /> Deleted ({deleted.length})</span>
            <span className="flex items-center gap-1 text-[10px] opacity-70">
              {showDeleted ? 'Hide' : 'Show'}
              <ChevronDown className={`h-3 w-3 transition-transform duration-300 ${showDeleted ? 'rotate-180' : 'rotate-0'}`} />
            </span>
          </button>
          {showDeleted && (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1 scroll-thin" data-testid="deleted-section">
              {deleted.length === 0 && (
                <div className="text-[11px] text-slate-500 flex items-center gap-2"><Inbox className="h-4 w-4" /> Trash empty</div>
              )}
              {deleted.map((task: any) => (
                <div key={task.id} className="group relative p-2 rounded bg-slate-900/60 border border-slate-700/70">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium text-slate-300 break-words">{task.title}</p>
                      {task.deletedAt && <p className="text-[9px] text-slate-500 mt-1">Deleted {new Date(task.deletedAt).toLocaleString()}</p>}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => restoreTask(task.id)}
                        className="icon-btn-neon" aria-label="Restore task"
                        title="Restore"
                      ><RotateCcw className="h-4 w-4" /></button>
                      <button
                        onClick={() => { if (confirm('Permanently delete this task? This cannot be undone.')) hardDeleteTask(task.id); }}
                        className="icon-btn-neon" aria-label="Permanently delete task" title="Delete forever"
                      ><XCircle className="h-4 w-4 text-rose-400" /></button>
                    </div>
                  </div>
                </div>
              ))}
              {deleted.length > 0 && (
                <button
                  onClick={() => { if (confirm('Empty trash? This permanently deletes all trashed tasks.')) { deleted.forEach((t:any)=> hardDeleteTask(t.id)); } }}
                  className="w-full mt-2 btn-neon" data-variant="outline" data-size="xs"
                  data-testid="empty-trash"
                >🗑️ Empty Trash</button>
              )}
            </div>
          )}
        </div>

        <div className={`mt-auto pt-4 border-t border-slate-700/60 space-y-3 ${variant === 'full' ? 'px-3' : 'px-1'}`}>
          <p className="text-[10px] text-slate-500">⚠️ Deleted tasks are retained locally until permanently removed.</p>
          <p className="text-[10px] text-slate-600">v0.1.0 • Local First</p>
        </div>
      </aside>
    </div>
  );

  if (!portalTarget) return content;
  return createPortal(content, portalTarget);
};
