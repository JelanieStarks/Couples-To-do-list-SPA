import React, { useCallback } from 'react';
import { useTask } from '../../contexts/TaskContext';
import { TaskItem } from './TaskItem';
import type { Task } from '../../types';
import { Clock, Star, CheckCircle, AlertCircle } from 'lucide-react';
import { TaskFilterMenu } from './TaskFilterMenu';
import { applyTaskFilter, useTaskFilter } from '../../hooks/useTaskFilter';
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// 📅 Today's Tasks - Your daily command center
export const TodaysTasks: React.FC = () => {
  const { getTodaysTasks, reorderTasksWithinPriority } = useTask() as any;
  const todaysTasksRaw = getTodaysTasks();
  const { filter } = useTaskFilter();
  const todaysTasks = applyTaskFilter(todaysTasksRaw, filter);

  const completedTasks: Task[] = todaysTasks
    .filter((task: Task) => task.completed)
    .slice()
    .sort((a: Task, b: Task) => {
      if (a.completedAt && b.completedAt) {
        return new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime();
      }
      if (a.completedAt) return -1;
      if (b.completedAt) return 1;
      return 0;
    });
  const incompleteTasks: Task[] = todaysTasks.filter((task: Task) => !task.completed);
  const priorityATasks: Task[] = incompleteTasks.filter((task: Task) => task.priority.startsWith('A'));
  const otherTasks: Task[] = incompleteTasks.filter((task: Task) => !task.priority.startsWith('A'));

  const completionRate = todaysTasks.length > 0 
    ? Math.round((completedTasks.length / todaysTasks.length) * 100) 
    : 0;

  // Handle task click to scroll to calendar position
  const handleTaskClick = (taskId: string) => {
    // Find the task element in the calendar and scroll to it
    const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
    if (taskElement) {
      // In tests (jsdom), scrollIntoView may be missing; guard it
      try {
        if ('scrollIntoView' in taskElement && typeof (taskElement as any).scrollIntoView === 'function') {
          (taskElement as any).scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      } catch {}
      // Add a brief highlight effect
      taskElement.classList.add('ring-2', 'ring-purple-400', 'ring-opacity-75');
      setTimeout(() => {
        taskElement.classList.remove('ring-2', 'ring-purple-400', 'ring-opacity-75');
      }, 2000);
    }
  };

  const getJarvisEncouragement = () => {
    if (todaysTasks.length === 0) {
      return "🤖 No tasks for today? Time to add some goals and conquer the world!";
    }
    
    if (completionRate === 100) {
      return "🤖 Outstanding! You've completed everything! Time for a victory dance! 🎉";
    }
    
    if (completionRate >= 75) {
      return "🤖 Excellent progress! You're in the productivity zone! Keep it up! 💪";
    }
    
    if (completionRate >= 50) {
      return "🤖 Good work! You're halfway there. Momentum is building! 🚀";
    }
    
    if (priorityATasks.length > 0) {
      return "🤖 Priority A tasks detected! These need your immediate attention! 🔥";
    }
    
    return "🤖 Ready to tackle today's challenges? Let's make things happen! ⚡";
  };

  // Sensors for minimal drag constraint inside urgent list
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
  const currentOrder = priorityATasks.map((t: Task) => t.id);
    const oldIndex = currentOrder.indexOf(active.id as string);
    const newIndex = currentOrder.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = [...currentOrder];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);
    reorderTasksWithinPriority('A', reordered);
  }, [priorityATasks, reorderTasksWithinPriority]);

  return (
  <div className="panel-neon panel-neon-border">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-slate-800 border border-slate-600">
              <Clock className="h-6 w-6 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-100 tracking-wide">Today's Tasks</h2>
              <p className="text-xs text-slate-400 tracking-wide">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <TaskFilterMenu />
          {/* Progress Badge */}
          {todaysTasks.length > 0 && (
            <div className="text-right">
              <div className={`text-2xl font-bold ${
                completionRate === 100 ? 'text-emerald-400' : 
                completionRate >= 50 ? 'text-indigo-300' : 'text-slate-500'
              }`}>
                {completionRate}%
              </div>
              <div className="text-[10px] text-slate-500">
                {completedTasks.length} of {todaysTasks.length} done
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Jarvis Commentary */}
      <div className="mb-6 p-4 rounded-lg bg-slate-800/60 border border-slate-700">
        <p className="text-xs text-slate-300 font-medium">
          {getJarvisEncouragement()}
        </p>
      </div>

      {/* Progress Bar */}
      {todaysTasks.length > 0 && (
        <div className="mb-6">
          <div className="w-full h-2 rounded-full bg-slate-700 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 bg-gradient-to-r ${
                completionRate === 100 ? 'from-emerald-400 to-green-500' :
                completionRate >= 50 ? 'from-indigo-400 to-fuchsia-500' : 'from-slate-500 to-slate-400'
              }`}
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>
      )}

      {/* Priority A Tasks (Critical) */}
      {priorityATasks.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center space-x-2 mb-3">
            <AlertCircle className="h-5 w-5 text-rose-400" />
            <h3 className="font-semibold text-rose-300 tracking-wide text-sm">🔥 URGENT</h3>
            <span className="bg-rose-500/20 text-rose-300 text-[10px] px-2 py-1 rounded-full">
              {priorityATasks.length}
            </span>
            <span className="ml-2 text-[10px] text-slate-500">(Drag to reorder)</span>
          </div>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={priorityATasks.map((t: Task) => t.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {priorityATasks.map((task: Task) => (
                  <SortableTaskRow key={task.id} id={task.id} task={task} onTaskClick={handleTaskClick} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}

      {/* Other Incomplete Tasks */}
      {otherTasks.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center space-x-2 mb-3">
            <Star className="h-5 w-5 text-indigo-300" />
            <h3 className="font-semibold text-slate-200 text-sm">📋 Other Tasks</h3>
            <span className="bg-indigo-500/20 text-indigo-300 text-[10px] px-2 py-1 rounded-full">
              {otherTasks.length}
            </span>
          </div>
          <div className="space-y-3">
            {otherTasks.map((task: Task) => (
              <TaskItem key={task.id} task={task} onTaskClick={handleTaskClick} />
            ))}
          </div>
        </div>
      )}

      {/* Completed Tasks */}
      {completedTasks.length > 0 && (
        <div>
          <div className="flex items-center space-x-2 mb-3">
            <CheckCircle className="h-5 w-5 text-emerald-300" />
            <h3 className="font-semibold text-emerald-300 text-sm">✅ Completed</h3>
            <span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-2 py-1 rounded-full">
              {completedTasks.length}
            </span>
          </div>
          <div className="space-y-3">
            {completedTasks.map((task: Task) => (
              <TaskItem key={task.id} task={task} onTaskClick={handleTaskClick} />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {todaysTasks.length === 0 && (
        <div className="text-center py-10">
          <div className="text-5xl mb-3">🌅</div>
          <h3 className="text-base font-semibold text-slate-100 mb-2 tracking-wide">No tasks today</h3>
          <p className="text-slate-400 max-w-md mx-auto text-xs">🤖 Free day detected! Add tasks or savor the calm.</p>
        </div>
      )}
    </div>
  );
};

// Sortable row wrapper for Urgent (priority A) tasks
interface SortableTaskRowProps {
  id: string;
  task: Task;
  onTaskClick?: (id: string) => void;
}

const SortableTaskRow: React.FC<SortableTaskRowProps> = ({ id, task, onTaskClick }) => {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} className="group/row" data-task-id={task.id}>
      <div className="flex items-start gap-2">
        {/* Drag handle: only this control starts drag */}
        <button
          type="button"
          ref={setActivatorNodeRef as any}
          {...listeners}
          aria-label="Drag to reorder"
          title="Drag to reorder"
          className="mt-1 h-5 w-5 flex items-center justify-center text-slate-500 hover:text-slate-300 cursor-grab active:cursor-grabbing focus:outline-none"
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* Simple grip icon using dots */}
          <span className="block h-3 w-3 grid grid-cols-2 gap-[2px]">
            <span className="h-[3px] w-[3px] bg-slate-500 rounded" />
            <span className="h-[3px] w-[3px] bg-slate-500 rounded" />
            <span className="h-[3px] w-[3px] bg-slate-500 rounded" />
            <span className="h-[3px] w-[3px] bg-slate-500 rounded" />
          </span>
        </button>
        <div className="flex-1">
          <TaskItem task={task} onTaskClick={onTaskClick} isDragging={isDragging} />
        </div>
      </div>
    </div>
  );
};
