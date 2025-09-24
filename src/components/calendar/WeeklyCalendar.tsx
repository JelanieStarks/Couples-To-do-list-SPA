import React, { useState } from 'react';
import { useTask } from '../../contexts/TaskContext';
import { TaskItem } from '../tasks/TaskItem';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { getWeekDates, formatDate } from '../../utils';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

// 📅 Weekly Calendar - Drag and drop task scheduler
export const WeeklyCalendar: React.FC = () => {
  const { getTasksByDate, moveTaskToDate, tasks } = useTask();
  const [currentWeek, setCurrentWeek] = useState(new Date());
  
  const weekDates = getWeekDates(currentWeek);
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    const taskId = active.id as string;
    const newDate = over.id as string;

    if (newDate.startsWith('day-')) {
      const dateStr = newDate.replace('day-', '');
      moveTaskToDate(taskId, dateStr);
    }
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeek = new Date(currentWeek);
    newWeek.setDate(newWeek.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeek(newWeek);
  };

  const goToToday = () => {
    setCurrentWeek(new Date());
  };

  return (
    <div className="panel-neon panel-neon-border">
      {/* Header */}
  <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-slate-800 border border-slate-600">
            <CalendarIcon className="h-6 w-6 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-100 tracking-wide">Weekly Planner</h2>
            <p className="text-xs text-slate-400">🤖 Drag & drop tasks across your week</p>
          </div>
        </div>

        {/* Navigation */}
  <div className="flex items-center space-x-3">
          <button
            onClick={() => navigateWeek('prev')}
            className="p-2 rounded-lg bg-slate-800/70 border border-slate-600 text-slate-300 hover:text-white hover:border-indigo-400 hover:shadow-md transition"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          
          <button
            onClick={goToToday}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-gradient-to-r from-indigo-600 to-fuchsia-600 text-white shadow hover:shadow-lg tracking-wide"
          >Today</button>
          
          <button
            onClick={() => navigateWeek('next')}
            className="p-2 rounded-lg bg-slate-800/70 border border-slate-600 text-slate-300 hover:text-white hover:border-indigo-400 hover:shadow-md transition"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Week Display */}
      <div className="mb-4 text-center">
        <h3 className="text-lg font-medium text-slate-100">
          {weekDates[0].toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </h3>
        <p className="text-xs text-slate-400 tracking-wide">
          {weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </p>
      </div>

      {/* Calendar Grid */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
  <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
          {weekDates.map((date, index) => {
            const dateStr = date.toISOString().split('T')[0];
            const dayTasks = getTasksByDate(dateStr);
            const isToday = date.toDateString() === new Date().toDateString();
            const isPast = date < new Date() && !isToday;

            return (
              <DayColumn
                key={dateStr}
                date={date}
                dateStr={dateStr}
                dayName={dayNames[index]}
                tasks={dayTasks}
                isToday={isToday}
                isPast={isPast}
              />
            );
          })}
        </div>
      </DndContext>

      {/* Jarvis Tips */}
      <div className="mt-6 p-4 rounded-lg bg-slate-800/60 border border-slate-700 text-xs text-slate-300 leading-relaxed">
        <h4 className="font-semibold text-indigo-300 mb-2 tracking-wide">🤖 Jarvis Calendar Tips</h4>
        <ul className="space-y-1">
          <li><span className="text-indigo-400">•</span> Drag any task to a different day to reschedule it</li>
          <li><span className="text-indigo-400">•</span> Today is outlined in neon glow</li>
          <li><span className="text-indigo-400">•</span> Past days are slightly dimmed</li>
          <li><span className="text-indigo-400">•</span> No date? It appears in Today's list</li>
        </ul>
      </div>
    </div>
  );
};

// Individual day column component
interface DayColumnProps {
  date: Date;
  dateStr: string;
  dayName: string;
  tasks: any[];
  isToday: boolean;
  isPast: boolean;
}

const DayColumn: React.FC<DayColumnProps> = ({ date, dateStr, dayName, tasks, isToday, isPast }) => {
  const { setNodeRef, isOver } = useDroppable({ id: `day-${dateStr}` });

  return (
    <div ref={setNodeRef} className={`day-square ${isToday ? 'today' : ''} ${isPast ? 'day-square-past' : ''} ${isOver ? 'ring-2 ring-indigo-400 ring-offset-0' : ''}`}>
      <div className="day-square-header">
        <div>{dayName}</div>
        <div className="text-[10px] font-normal opacity-70">{date.getDate()}</div>
      </div>
      <div className="day-tasks-scroll scroll-thin grid gap-2 grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-5 auto-rows-max">
        {tasks
          .slice()
          .sort((a,b) => {
            // Incomplete first
            if (a.completed && !b.completed) return 1;
            if (!a.completed && b.completed) return -1;
            // Both incomplete: optional priority or created ordering (keep original for now)
            if (!a.completed && !b.completed) return 0;
            // Both completed: most recently completed first using completedAt
            if (a.completedAt && b.completedAt) {
              return new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime();
            }
            if (a.completedAt) return -1; // a has timestamp b not -> a first
            if (b.completedAt) return 1;
            return 0;
          })
          .map(task => (
          <DraggableTask key={task.id} task={task} />
        ))}
        {tasks.length === 0 && (
          <div className="col-span-full text-center py-6 text-[11px] text-slate-500">
            {isToday ? 'No tasks today' : 'Drag tasks here'}
          </div>
        )}
      </div>
    </div>
  );
};

// Draggable task wrapper
interface DraggableTaskProps {
  task: any;
}

const DraggableTask: React.FC<DraggableTaskProps> = ({ task }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="cursor-grab active:cursor-grabbing"
      data-task-id={task.id}
    >
      <TaskItem task={task} showDate={false} isDragging={isDragging} compact forceActions />
    </div>
  );
};
