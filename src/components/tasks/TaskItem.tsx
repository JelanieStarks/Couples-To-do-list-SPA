/**
 * TaskItem
 * Renders a single task card with completion controls, edit form, and optional modal editor.
 * Operates in compact and full modes so calendar and lists share the same component.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTask } from '../../contexts/TaskContext';
import { useAuth } from '../../contexts/AuthContext';
import { Check, Edit, Trash2, Calendar, User, Users, Clock, AlarmClockCheck } from 'lucide-react';
import type { Task, Priority, Assignment } from '../../types';
import { formatDate, toLocalDateString } from '../../utils';

interface TaskItemProps {
  task: Task;
  showDate?: boolean;
  isDragging?: boolean;
  onTaskClick?: (taskId: string) => void;
  compact?: boolean; // compact card variant for calendar grid
  forceActions?: boolean; // force show actions even in compact mode
  editInModal?: boolean; // render edit form inside modal overlay (used by planner)
}

// 📋 Task Item Component - Individual task with all the bells and whistles
export const TaskItem: React.FC<TaskItemProps> = ({ task, showDate = false, isDragging = false, onTaskClick, compact = false, forceActions = false, editInModal = false }) => {
  const { updateTask, softDeleteTask, toggleTaskComplete } = useTask() as any;
  const { user, partner } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const baseEditState = useMemo(() => ({
    title: task.title,
    description: task.description || '',
    priority: task.priority,
    color: task.color,
    scheduledDate: task.scheduledDate || '',
    scheduledTime: task.scheduledTime || '',
  }), [task.title, task.description, task.priority, task.color, task.scheduledDate, task.scheduledTime]);

  const [editData, setEditData] = useState(baseEditState);
  const priorityOptions = useMemo<Priority[]>(() => ['A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'C1', 'C2', 'C3', 'D'], []);

  useEffect(() => {
    setEditData(baseEditState);
  }, [baseEditState]);

  useEffect(() => {
    if (!editInModal || !isEditing) return;
    if (typeof document === 'undefined') return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [editInModal, isEditing]);

  const isShared = task.assignment === 'both';
  const isOwner = task.createdBy === user?.id;
  const createdByPartner = task.createdBy === partner?.id;

  // Get assignment display info
  const getAssignmentInfo = () => {
    switch (task.assignment) {
      case 'me':
        return { icon: '👤', label: 'Me', color: user?.color || '#ec4899' };
      case 'partner':
        return { icon: '👥', label: 'Partner', color: '#3b82f6' };
      case 'both':
        return { icon: '💕', label: 'Both', color: 'gradient' };
      default:
        return { icon: '👤', label: 'Me', color: task.color };
    }
  };

  const assignmentInfo = getAssignmentInfo();

  type PriorityFamily = 'A' | 'B' | 'C' | 'D';
  const priorityStyles: Record<PriorityFamily, string> = {
    A: 'bg-rose-500/90 border-rose-300 text-rose-50 shadow-[0_0_16px_rgba(244,114,182,0.35)]',
    B: 'bg-amber-500/90 border-amber-300 text-amber-50 shadow-[0_0_16px_rgba(251,191,36,0.35)]',
    C: 'bg-cyan-500/90 border-cyan-300 text-cyan-50 shadow-[0_0_16px_rgba(56,189,248,0.35)]',
    D: 'bg-emerald-500/90 border-emerald-300 text-emerald-50 shadow-[0_0_16px_rgba(52,211,153,0.35)]',
  };

  const getPriorityFamily = (value: Priority): PriorityFamily => {
    if (value.startsWith('A')) return 'A';
    if (value.startsWith('B')) return 'B';
    if (value.startsWith('C')) return 'C';
    return 'D';
  };

  const handleSaveEdit = () => {
    if (!editData.title.trim()) return;

    updateTask(task.id, {
      title: editData.title.trim(),
      description: editData.description.trim() || undefined,
      priority: editData.priority,
      color: editData.color,
      scheduledDate: editData.scheduledDate || undefined,
      scheduledTime: editData.scheduledTime || undefined,
    });

    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditData(baseEditState);
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (confirm('🤖 Soft delete this task? You can restore it from the menu.')) {
      softDeleteTask(task.id);
    }
  };

  const handleToggleShare = () => {
    if (!partner) return;
    // Toggle between owner-specific assignment and 'both' to reflect shared state in UI
    if (task.assignment === 'both') {
      // Revert to the likely owner
      const nextAssignment: Assignment = createdByPartner ? 'partner' : 'me';
      updateTask(task.id, { assignment: nextAssignment, sharedWith: undefined });
    } else {
      updateTask(task.id, { assignment: 'both', sharedWith: partner.id });
    }
  };

  // Overdue detection (scheduled date strictly before today and not completed)
  const todayStr = toLocalDateString(new Date());
  const isOverdue = !!task.scheduledDate && !task.completed && task.scheduledDate < todayStr;

  const snoozeToTomorrow = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    updateTask(task.id, { scheduledDate: toLocalDateString(tomorrow) });
  };

  const canSave = editData.title.trim().length > 0;

  const renderEditFields = () => (
    <div className="space-y-5">
      <div className="glow-field-stack">
        <label htmlFor={`edit-title-${task.id}`}>Task title</label>
        <div className="glow-ambient-orb" />
        <input
          id={`edit-title-${task.id}`}
          type="text"
          value={editData.title}
          onChange={(e) => setEditData(prev => ({ ...prev, title: e.target.value }))}
          className="glow-form-input"
          placeholder="Task title..."
        />
      </div>

      <div className="glow-field-stack">
        <label htmlFor={`edit-desc-${task.id}`}>Description</label>
        <div className="glow-ambient-orb" />
        <textarea
          id={`edit-desc-${task.id}`}
          value={editData.description}
          onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
          className="neon-textarea min-h-[140px]"
          rows={4}
          placeholder="Optional description..."
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="glow-field-stack">
          <label htmlFor={`edit-date-${task.id}`}>Date</label>
          <div className="glow-ambient-orb" />
          <input
            type="date"
            id={`edit-date-${task.id}`}
            value={editData.scheduledDate}
            onChange={(e) => setEditData(prev => ({ ...prev, scheduledDate: e.target.value }))}
            className="glow-form-input"
          />
        </div>
        <div className="glow-field-stack">
          <label htmlFor={`edit-time-${task.id}`}>Time</label>
          <div className="glow-ambient-orb" />
          <input
            type="time"
            id={`edit-time-${task.id}`}
            value={editData.scheduledTime}
            onChange={(e) => setEditData(prev => ({ ...prev, scheduledTime: e.target.value }))}
            className="glow-form-input"
          />
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-slate-400">Priority</p>
        <div className="flex flex-wrap gap-2">
          {priorityOptions.map((p) => {
            const family = getPriorityFamily(p);
            const isActive = editData.priority === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => setEditData(prev => ({ ...prev, priority: p }))}
                className={`px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wide transition-all border ${
                  isActive
                    ? `${priorityStyles[family]}`
                    : 'bg-slate-900/60 border-slate-700 text-slate-300 hover:border-indigo-400/60 hover:text-white'
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  if (!editInModal && isEditing) {
    return (
  <div className={`neon-hype-panel rainbow-crunch-border p-4 space-y-5 ${isDragging ? 'opacity-50' : ''}`}>
        {renderEditFields()}
        <div className="flex flex-wrap justify-end gap-2">
          <button onClick={handleCancelEdit} className="neon-action-button" data-variant="outline" data-size="sm">Cancel</button>
          <button onClick={handleSaveEdit} className="neon-action-button disabled:opacity-60 disabled:cursor-not-allowed" data-size="sm" disabled={!canSave}>Save</button>
        </div>
      </div>
    );
  }

  const portalTarget = typeof document !== 'undefined' ? document.body : null;

  const modal = editInModal && isEditing && portalTarget
    ? createPortal(
        <div className="fixed inset-0 z-[120] flex items-center justify-center px-4 py-8">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={handleCancelEdit} role="presentation" />
          <div className="relative w-full max-w-2xl neon-hype-panel rainbow-crunch-border overflow-hidden shadow-2xl" role="dialog" aria-modal="true" aria-label="Edit task">
            <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-slate-700/60 bg-slate-900/40">
              <div>
                <h3 className="text-sm font-semibold tracking-[0.2em] uppercase text-slate-200">Edit Task</h3>
                <p className="text-[11px] text-slate-400">Tweak the details, update the schedule, stay on track.</p>
              </div>
              <button className="neon-icon-button" onClick={handleCancelEdit} aria-label="Close edit modal">✕</button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto px-6 py-5 space-y-5">
              {renderEditFields()}
            </div>
            <div className="flex flex-wrap justify-end gap-3 px-6 py-4 border-t border-slate-700/60 bg-slate-900/40">
              <button onClick={handleCancelEdit} className="neon-action-button" data-variant="outline" data-size="sm">Cancel</button>
              <button onClick={handleSaveEdit} className="neon-action-button disabled:opacity-60 disabled:cursor-not-allowed" data-size="sm" disabled={!canSave}>Save Changes</button>
            </div>
          </div>
        </div>,
        portalTarget
      )
    : null;

  return (
    <>
      <div 
        className={`group mission-card ${task.assignment === 'both' ? 'shared' : ''} ${task.completed ? 'opacity-60' : ''} ${isDragging ? 'opacity-40 scale-[0.98]' : ''} ${isOverdue ? 'ring-1 ring-rose-400 border-rose-400' : ''}`}
        data-task-id={task.id}
        data-overdue={isOverdue ? 'true' : 'false'}
        data-priority={task.priority}
        onClick={() => onTaskClick?.(task.id)}
      >
        {/* Left accent bar to improve visibility */}
  <span className="mission-glow-bar" style={{ background: task.priority.startsWith('A') ? '#ef4444' : task.priority.startsWith('B') ? '#f59e0b' : task.priority.startsWith('C') ? '#eab308' : '#22c55e' }} aria-hidden />
        <div className="flex items-start gap-3">
        <button
          onClick={(e) => { e.stopPropagation(); toggleTaskComplete(task.id); }}
          aria-label={task.completed ? 'Mark task incomplete' : 'Mark task complete'}
          className={`flex-shrink-0 w-5 h-5 rounded-full border flex items-center justify-center text-[9px] font-bold transition-colors ${
            task.completed
              ? 'bg-emerald-500 border-emerald-500 text-white shadow'
              : 'border-slate-500/70 text-slate-300 hover:border-emerald-400'
          }`}
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {task.completed && <Check className="h-4 w-4" />}
        </button>

        <div className="flex-1 min-w-0 text-[0.95rem]">
          <div className={`flex ${compact ? 'items-center' : 'items-start'} justify-between gap-3`}>
            <div className="flex-1 min-w-0">
              <h3 className={`font-medium text-slate-100 leading-tight text-[0.95rem] ${task.completed ? 'line-through opacity-70' : ''}`}
                  onPointerDown={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}>
                {task.title}
              </h3>
              {!compact && task.description && (
                <p className={`text-[0.8rem] leading-snug text-slate-300 mt-1 ${task.completed ? 'line-through opacity-60' : ''}`}>
                  {task.description}
                </p>
              )}
            </div>

            <div className="flex-shrink-0 ml-2 flex items-center space-x-1 task-priority-badge">
              <span className="text-[10px]">{task.priority}</span>
              {task.repeat === 'daily' && (
                <span className="ml-1 inline-flex items-center px-2 py-[2px] rounded-full bg-indigo-900/60 text-indigo-200 border border-indigo-400/40 text-[9px]">Daily</span>
              )}
            </div>
          </div>

          {(!compact || forceActions) && (
            <div className="flex flex-col gap-3 mt-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] text-slate-400">
                <div className="flex items-center space-x-1">
                  <span>{assignmentInfo.icon}</span>
                  <span>{assignmentInfo.label}</span>
                </div>
                {isOverdue && (
                  <span data-testid="overdue-badge" className="inline-flex items-center px-2 py-[2px] rounded-full bg-rose-900/60 text-rose-200 border border-rose-400/40 text-[9px]">Overdue</span>
                )}
                {task.scheduledTime && (
                  <div className="flex items-center space-x-1">
                    <Clock className="h-3 w-3" />
                    <span>{task.scheduledTime}</span>
                  </div>
                )}
                {(showDate || task.scheduledDate) && (
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {task.scheduledDate 
                        ? formatDate(task.scheduledDate) 
                        : formatDate(task.createdAt)
                      }
                    </span>
                  </div>
                )}
              </div>
              <div className={`flex items-center gap-2 ${forceActions ? '' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                {!task.completed && (
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleTaskComplete(task.id); }}
                    className="p-1 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded transition-colors"
                    title="Complete task"
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <Check className="h-4 w-4" />
                  </button>
                )}
                {isOverdue && (
                  <button
                    onClick={(e) => { e.stopPropagation(); snoozeToTomorrow(); }}
                    className="p-1 text-rose-300 hover:text-rose-200 hover:bg-rose-500/10 rounded transition-colors"
                    title="Snooze to tomorrow"
                    data-testid="snooze-btn"
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <AlarmClockCheck className="h-4 w-4" />
                  </button>
                )}
                {partner && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleToggleShare(); }}
                    className={`p-1 rounded transition-colors ${
                      isShared 
                        ? 'text-purple-400 hover:text-purple-300 hover:bg-purple-500/10' 
                        : 'text-gray-400 hover:text-purple-400 hover:bg-purple-500/10'
                    }`}
                    title={isShared ? 'Unshare task' : 'Share with partner'}
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <Users className="h-4 w-4" />
                  </button>
                )}
                {isOwner && (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
                      className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="Edit task"
                      onPointerDown={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(); }}
                      className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Delete task"
                      onPointerDown={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {!compact && task.priority.startsWith('A') && !task.completed && (
        <div className="mt-3 p-2 rounded-lg bg-gradient-to-r from-indigo-900/70 to-fuchsia-900/60 border border-rose-400">
          <p className="text-[11px] text-rose-200 tracking-wide font-medium">
            🤖 Priority {task.priority}! {task.priority === 'A1' ? 'Handle immediately.' : 'High importance - schedule soon.'}
          </p>
        </div>
      )}
      </div>
      {modal}
    </>
  );
};
