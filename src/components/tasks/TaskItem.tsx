import React, { useState } from 'react';
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
}

// 📋 Task Item Component - Individual task with all the bells and whistles
export const TaskItem: React.FC<TaskItemProps> = ({ task, showDate = false, isDragging = false, onTaskClick, compact = false, forceActions = false }) => {
  const { updateTask, softDeleteTask, toggleTaskComplete } = useTask() as any;
  const { user, partner } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    title: task.title,
    description: task.description || '',
    priority: task.priority,
    color: task.color,
    scheduledDate: task.scheduledDate || '',
    scheduledTime: task.scheduledTime || '',
  });

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

  const priorityConfig = {
    A1: { bg: 'bg-red-200', border: 'border-red-400', text: 'text-red-900', emoji: '🚨' },
    A2: { bg: 'bg-red-100', border: 'border-red-300', text: 'text-red-800', emoji: '🔥' },
    A3: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', emoji: '🟥' },
    B1: { bg: 'bg-orange-200', border: 'border-orange-400', text: 'text-orange-900', emoji: '🟠' },
    B2: { bg: 'bg-orange-100', border: 'border-orange-300', text: 'text-orange-800', emoji: '🟧' },
    B3: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', emoji: '🟨' },
    C1: { bg: 'bg-yellow-200', border: 'border-yellow-400', text: 'text-yellow-900', emoji: '🟡' },
    C2: { bg: 'bg-yellow-100', border: 'border-yellow-300', text: 'text-yellow-800', emoji: '🟤' },
    C3: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', emoji: '🟫' },
    D: { bg: 'bg-green-100', border: 'border-green-300', text: 'text-green-800', emoji: '🟢' },
  };

  const priority = priorityConfig[task.priority] || priorityConfig['C1']; // Fallback to C1 if priority is invalid

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
    setEditData({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      color: task.color,
      scheduledDate: task.scheduledDate || '',
      scheduledTime: task.scheduledTime || '',
    });
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

  if (isEditing) {
    return (
      <div className={`panel-neon panel-neon-border p-3 ${isDragging ? 'opacity-50' : ''}`}>
        <div className="space-y-3">
          <div className="neon-field">
            <label htmlFor={`edit-title-${task.id}`}>Task title</label>
            <div className="neon-glow-ambient" />
            <input
              id={`edit-title-${task.id}`}
              type="text"
              value={editData.title}
              onChange={(e) => setEditData(prev => ({ ...prev, title: e.target.value }))}
              className="neon-input"
              placeholder="Task title..."
            />
          </div>

          <div className="neon-field">
            <label htmlFor={`edit-desc-${task.id}`}>Description</label>
            <div className="neon-glow-ambient" />
            <textarea
              id={`edit-desc-${task.id}`}
              value={editData.description}
              onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
              className="neon-textarea"
              rows={2}
              placeholder="Optional description..."
            />
          </div>

          {/* Date & time editors */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor={`edit-date-${task.id}`} className="block text-[11px] font-semibold tracking-wide text-slate-300 mb-1 uppercase">Date</label>
              <input
                type="date"
                id={`edit-date-${task.id}`}
                value={editData.scheduledDate}
                onChange={(e) => setEditData(prev => ({ ...prev, scheduledDate: e.target.value }))}
                className="neon-input"
              />
            </div>
            <div>
              <label htmlFor={`edit-time-${task.id}`} className="block text-[11px] font-semibold tracking-wide text-slate-300 mb-1 uppercase">Time</label>
              <input
                type="time"
                id={`edit-time-${task.id}`}
                value={editData.scheduledTime}
                onChange={(e) => setEditData(prev => ({ ...prev, scheduledTime: e.target.value }))}
                className="neon-input"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 flex-wrap">
              {['A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'C1', 'C2', 'C3', 'D'].map((p) => (
                <button
                  key={p}
                  onClick={() => setEditData(prev => ({ ...prev, priority: p as Priority }))}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                    editData.priority === p
                      ? `${priorityConfig[p as Priority].bg} ${priorityConfig[p as Priority].text}`
                      : 'bg-slate-800/60 text-slate-300 hover:bg-slate-700/60'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button onClick={handleSaveEdit} className="btn-neon" data-size="sm">Save</button>
              <button onClick={handleCancelEdit} className="btn-neon" data-variant="outline" data-size="sm">Cancel</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`group task-card-neon ${compact ? 'px-2 py-2' : ''} ${task.assignment === 'both' ? 'shared' : ''} ${task.completed ? 'opacity-60' : ''} ${isDragging ? 'opacity-40 scale-[0.98]' : ''} ${isOverdue ? 'ring-1 ring-rose-400 border-rose-400' : ''}`}
      data-task-id={task.id}
      data-overdue={isOverdue ? 'true' : 'false'}
      data-priority={task.priority}
      onClick={() => onTaskClick?.(task.id)}
    >
      {/* Left accent bar to improve visibility */}
      <span className="task-accent" style={{ background: task.priority.startsWith('A') ? '#ef4444' : task.priority.startsWith('B') ? '#f59e0b' : task.priority.startsWith('C') ? '#eab308' : '#22c55e' }} aria-hidden />
      <div className="flex items-start space-x-2">
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
          <div className={`flex ${compact ? 'items-center' : 'items-start'} justify-between`}>
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
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center space-x-3 text-[10px] text-slate-400">
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
              <div className={`flex items-center space-x-1 ${forceActions ? '' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
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
  );
};
