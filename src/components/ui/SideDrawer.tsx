import React, { useState } from 'react';
import { useTask } from '../../contexts/TaskContext';
import { CheckCircle2, Trash2, RotateCcw, XCircle, Inbox } from 'lucide-react';
import { TaskItem } from '../tasks/TaskItem';

interface SideDrawerProps {
  open: boolean;
  onClose: () => void;
}

// 🛠 Side Drawer - Archive & Deleted Tasks Management
export const SideDrawer: React.FC<SideDrawerProps> = ({ open, onClose }) => {
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

  return (
    <div className={`fixed inset-0 z-50 transition-pointer-events ${open ? 'pointer-events-auto' : 'pointer-events-none'}`} aria-hidden={!open}>
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-slate-900/70 backdrop-blur-sm transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      {/* Drawer */}
      <aside
        className={`absolute top-0 left-0 h-full w-[320px] max-w-[80%] transform transition-transform duration-400 ease-out flex flex-col panel-neon panel-neon-border rounded-none !border-0 shadow-2xl ${open ? 'translate-x-0' : '-translate-x-full'}`}
        role="dialog"
        aria-modal="true"
        aria-label="Task archives"
      >
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-700/60">
          <h2 className="text-sm font-semibold tracking-wider text-slate-200 uppercase">Archives</h2>
          <button className="icon-btn-neon" onClick={onClose} aria-label="Close drawer">✕</button>
        </div>

        {/* Completed Tasks Section */}
        <div className="mb-6">
          <button
            onClick={() => setShowCompleted(v => !v)}
            className="w-full flex items-center justify-between text-left mb-2 btn-neon" data-variant="soft" data-size="sm"
            aria-expanded={showCompleted}
          >
            <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Completed ({completed.length})</span>
            <span className="text-[10px] opacity-70">{showCompleted ? 'Hide' : 'Show'}</span>
          </button>
          {showCompleted && (
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1 scroll-thin">
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
        <div className="mb-2">
          <button
            onClick={() => setShowDeleted(v => !v)}
            className="w-full flex items-center justify-between text-left mb-2 btn-neon" data-variant="soft" data-size="sm"
            aria-expanded={showDeleted}
          >
            <span className="flex items-center gap-2"><Trash2 className="h-4 w-4" /> Deleted ({deleted.length})</span>
            <span className="text-[10px] opacity-70">{showDeleted ? 'Hide' : 'Show'}</span>
          </button>
          {showDeleted && (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1 scroll-thin">
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
            </div>
          )}
        </div>

        <div className="mt-auto pt-4 text-[10px] text-slate-500 border-t border-slate-700/60">
          <p>⚠️ Deleted tasks are retained locally until permanently removed.</p>
        </div>
      </aside>
    </div>
  );
};
