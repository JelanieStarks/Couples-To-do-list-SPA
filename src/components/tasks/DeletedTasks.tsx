import React from 'react';
import { useTask } from '../../contexts/TaskContext';
import type { Task } from '../../types';
import { Trash2, RotateCcw } from 'lucide-react';

export const DeletedTasks: React.FC = () => {
  const { getDeletedTasks, restoreTask, hardDeleteTask } = useTask() as any;
  const deleted: Task[] = getDeletedTasks();

  const emptyTrash = () => {
    if (deleted.length === 0) return;
    if (confirm(`Permanently delete ${deleted.length} item(s)? This cannot be undone.`)) {
      deleted.forEach((t: Task) => hardDeleteTask(t.id));
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-slate-300 text-sm">
          <Trash2 className="h-4 w-4 text-rose-400" />
          <span>Deleted items</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-700/80">{deleted.length}</span>
        </div>
        <button
          type="button"
          className="btn-neon"
          data-variant="outline"
          data-size="sm"
          onClick={emptyTrash}
          disabled={deleted.length === 0}
          data-testid="empty-trash"
        >
          Empty Trash
        </button>
      </div>

      {deleted.length === 0 ? (
        <div className="text-[12px] text-slate-400">No deleted tasks.</div>
      ) : (
        <ul className="divide-y divide-slate-700/60" data-testid="deleted-list">
          {deleted.map((t: Task) => (
            <li key={t.id} className="py-2 flex items-center justify-between">
              <div>
                <h3 className="font-medium text-slate-100 leading-tight text-[12px] ">{t.title}</h3>
                {t.description && <p className="text-[11px] text-slate-400">{t.description}</p>}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="btn-neon"
                  data-size="sm"
                  onClick={() => restoreTask(t.id)}
                  data-testid={`restore-${t.id}`}
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Restore
                </button>
                <button
                  type="button"
                  className="btn-neon"
                  data-variant="destructive"
                  data-size="sm"
                  onClick={() => hardDeleteTask(t.id)}
                  data-testid={`delete-forever-${t.id}`}
                >
                  Delete forever
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default DeletedTasks;
