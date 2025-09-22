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
import {
  useSortable,
} from '@dnd-kit/sortable';
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
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="bg-gradient-to-r from-purple-100 to-pink-100 p-2 rounded-lg">
            <CalendarIcon className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Weekly Planner</h2>
            <p className="text-sm text-gray-500">🤖 Drag tasks between days like a time wizard!</p>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigateWeek('prev')}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          
          <button
            onClick={goToToday}
            className="px-4 py-2 text-sm font-medium text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors"
          >
            Today
          </button>
          
          <button
            onClick={() => navigateWeek('next')}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Week Display */}
      <div className="mb-4 text-center">
        <h3 className="text-lg font-medium text-gray-900">
          {weekDates[0].toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </h3>
        <p className="text-sm text-gray-500">
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
      <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
        <h4 className="font-medium text-blue-900 mb-2">🤖 Jarvis Calendar Tips:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Drag any task to a different day to reschedule it</li>
          <li>• Today's column is highlighted for your convenience</li>
          <li>• Past days are dimmed but still editable (in case you're a time traveler)</li>
          <li>• Tasks without dates show up in "Today" by default</li>
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
  const {
    setNodeRef,
    isOver,
  } = useSortable({
    id: `day-${dateStr}`,
  });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[400px] border-2 border-dashed rounded-lg p-3 transition-all ${
        isOver 
          ? 'border-purple-400 bg-purple-50' 
          : 'border-gray-200 hover:border-gray-300'
      } ${isToday ? 'bg-blue-50 border-blue-200' : ''} ${isPast ? 'opacity-60' : ''}`}
    >
      {/* Day Header */}
      <div className="mb-3 text-center">
        <h3 className={`font-semibold ${isToday ? 'text-blue-900' : 'text-gray-900'}`}>
          {dayName}
        </h3>
        <p className={`text-sm ${isToday ? 'text-blue-700' : 'text-gray-600'}`}>
          {date.getDate()}
        </p>
        {isToday && (
          <div className="inline-block bg-blue-600 text-white text-xs px-2 py-1 rounded-full mt-1">
            Today
          </div>
        )}
      </div>

      {/* Tasks */}
      <div className="space-y-2">
        {tasks.map(task => (
          <DraggableTask key={task.id} task={task} />
        ))}
      </div>

      {/* Empty State */}
      {tasks.length === 0 && (
        <div className="text-center py-8">
          <div className="text-gray-400 text-2xl mb-2">📝</div>
          <p className="text-xs text-gray-500">
            {isToday ? 'No tasks today' : 'Drag tasks here'}
          </p>
        </div>
      )}
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
      <TaskItem task={task} showDate={false} isDragging={isDragging} />
    </div>
  );
};