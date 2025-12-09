/**
 * TurboWeekFullCalendarModal
 * Neon garage bay that pops over the app with a FullCalendar grid and optional Google Calendar embed.
 * Use alongside TurboWeekTracker to unlock a big-picture view of tasks.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import FullCalendar from '@fullcalendar/react';
import type { EventContentArg, EventDropArg, DateSelectArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import '@fullcalendar/core/index.css';
import '@fullcalendar/daygrid/index.css';
import '@fullcalendar/timegrid/index.css';
import type { Task, Priority } from '../../types';
import { useTask } from '../../contexts/TaskContext';
import { applyTaskFilter, useTaskFilter } from '../../hooks/useTaskFilter';
import { STORAGE_KEYS, storage, toLocalDateString } from '../../utils';
import { SETTINGS_EVENT_NAME } from '../../utils/settings';
import { TaskItem } from '../tasks/TaskItem';
import { useAuth } from '../../contexts/AuthContext';

interface TurboWeekFullCalendarModalProps {
  open: boolean;
  onClose: () => void;
}

type CalendarSettings = {
  googleCalendar?: {
    enabled?: boolean;
    embedUrl?: string;
    connectStatus?: 'disconnected' | 'ready' | 'error';
    accountEmail?: string;
  };
};

const readGoogleCalendarConfig = (): NonNullable<CalendarSettings['googleCalendar']> => {
  const settings = (storage.get<CalendarSettings>(STORAGE_KEYS.SETTINGS) || {}) as CalendarSettings;
  return settings.googleCalendar || {};
};

// 🔮 Full-screen turbo view of everything scheduled
export const TurboWeekFullCalendarModal: React.FC<TurboWeekFullCalendarModalProps> = ({ open, onClose }) => {
  const portalTarget = typeof document !== 'undefined' ? document.body : null;
  const { tasks, moveTaskToDate, createTask } = useTask();
  const { user } = useAuth();
  const { filter } = useTaskFilter();

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [creatingDate, setCreatingDate] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>('C1');
  const [googleConfig, setGoogleConfig] = useState<NonNullable<CalendarSettings['googleCalendar']>>(() => readGoogleCalendarConfig());

  useEffect(() => {
    if (!open || typeof window === 'undefined') return;
    const applySettings = () => {
      setGoogleConfig(readGoogleCalendarConfig());
    };
    applySettings();
    const handler = () => applySettings();
    window.addEventListener(SETTINGS_EVENT_NAME, handler as EventListener);
    return () => {
      window.removeEventListener(SETTINGS_EVENT_NAME, handler as EventListener);
    };
  }, [open]);

  useEffect(() => {
    if (open) return;
    setSelectedTask(null);
    setCreatingDate(null);
    setNewTaskTitle('');
    setNewTaskPriority('C1');
  }, [open]);

  const filteredTasks = useMemo(() => applyTaskFilter(tasks, filter), [tasks, filter]);

  const events = useMemo(() => (
    filteredTasks
      .filter(task => !!task.scheduledDate)
      .map(task => ({
        id: task.id,
        title: task.title,
        start: task.scheduledDate,
        allDay: true,
        extendedProps: { task },
        classNames: task.completed ? ['fc-event-complete'] : ['fc-event-active'],
      }))
  ), [filteredTasks]);

  const formatEventContent = (arg: EventContentArg) => {
    const task = arg.event.extendedProps?.task as Task | undefined;
    const completionBadge = task?.completed ? '✅ ' : '';
    return (
      <div className="text-[11px] leading-tight">
        <div className="font-semibold">{completionBadge}{arg.event.title}</div>
        {task?.priority && <div className="opacity-70">Priority {task.priority}</div>}
      </div>
    );
  };

  const handleEventDrop = (info: EventDropArg) => {
    const task = info.event.extendedProps?.task as Task | undefined;
    if (!task) return;
    const newDate = toLocalDateString(info.event.start ?? new Date());
    moveTaskToDate(task.id, newDate);
  };

  const handleSelect = (slot: DateSelectArg) => {
    setCreatingDate(toLocalDateString(slot.start));
    slot.view.calendar.unselect();
  };

  const handleCreate = () => {
    if (!creatingDate || !newTaskTitle.trim()) return;
    createTask({
      title: newTaskTitle.trim(),
      description: undefined,
      priority: newTaskPriority,
      assignment: 'me',
      color: user?.color || '#ec4899',
      scheduledDate: creatingDate,
      scheduledTime: undefined,
      repeat: undefined,
      completed: false,
    });
    setCreatingDate(null);
    setNewTaskTitle('');
    setNewTaskPriority('C1');
  };

  const cancelCreate = () => {
    setCreatingDate(null);
    setNewTaskTitle('');
    setNewTaskPriority('C1');
  };

  const handleCloseTask = () => setSelectedTask(null);

  if (!open || !portalTarget) return null;

  return createPortal(
    <div className="fixed inset-0 z-[120] pointer-events-auto">
      <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" onClick={onClose} aria-hidden />
      <div className="relative mx-auto my-6 flex h-[calc(100%-3rem)] w-[min(1280px,95vw)] flex-col overflow-hidden neon-hype-panel rainbow-crunch-border">
        <header className="flex items-center justify-between gap-4 border-b border-slate-700/60 bg-slate-900/60 px-6 py-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Turbo Week Master View</p>
            <h2 className="text-xl font-semibold text-slate-100 tracking-wide">Full Calendar</h2>
          </div>
          <div className="flex items-center gap-3">
            {googleConfig.enabled && (
              <span className="text-[11px] uppercase tracking-[0.14em] text-emerald-300">Google embed active</span>
            )}
            <span className="text-[11px] uppercase tracking-[0.14em] text-slate-400">
              {googleConfig.connectStatus === 'ready'
                ? `Google connected (stub${googleConfig.accountEmail ? `: ${googleConfig.accountEmail}` : ''})`
                : 'Google not connected'}
            </span>
            <button type="button" onClick={onClose} className="neon-icon-button" aria-label="Close calendar">✕</button>
          </div>
        </header>

        <div className="flex flex-1 flex-col lg:flex-row">
          <div className="flex-1 border-b border-slate-800 bg-slate-900/40 lg:border-b-0 lg:border-r relative z-[1]">
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              headerToolbar={{
                left: 'title',
                center: '',
                right: 'prev,next today dayGridMonth,timeGridWeek'
              }}
              events={events}
              selectable
              selectMirror
              editable
              eventContent={formatEventContent}
              select={handleSelect}
              eventClick={(arg) => {
                const task = arg.event.extendedProps?.task as Task | undefined;
                if (task) setSelectedTask(task);
              }}
              eventDrop={handleEventDrop}
              height="100%"
            />
          </div>

          {googleConfig.enabled && (
            <aside className="flex w-full max-w-full flex-col gap-4 overflow-y-auto bg-slate-900/30 p-4 lg:w-[420px] relative z-[1]">
              <h3 className="text-sm font-semibold text-slate-100 tracking-wide">Google Calendar</h3>
              {googleConfig.embedUrl ? (
                <iframe
                  key={googleConfig.embedUrl}
                  src={googleConfig.embedUrl}
                  title="Google Calendar"
                  className="h-[420px] w-full rounded-xl border border-slate-700"
                  allowFullScreen
                />
              ) : (
                <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-4 text-[11px] leading-relaxed text-slate-400">
                  Drop your Google calendar embed link in Settings to light this up.
                </div>
              )}
            </aside>
          )}
        </div>

        {(selectedTask || creatingDate) && (
          <div className="absolute inset-x-0 bottom-0 z-[5] border-t border-slate-800 bg-slate-950/96 p-6 shadow-[0_-12px_32px_rgba(0,0,0,0.45)] pointer-events-auto">
            {selectedTask && (
              <div className="mx-auto max-w-xl">
                <TaskItem task={selectedTask} compact={false} forceActions editInModal showDate />
                <div className="mt-3 text-right">
                  <button type="button" className="neon-action-button" data-size="sm" onClick={handleCloseTask}>Done</button>
                </div>
              </div>
            )}
            {!selectedTask && creatingDate && (
              <div className="mx-auto max-w-xl">
                <div className="neon-hype-panel rainbow-crunch-border">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-slate-100 tracking-wide">Add task on {creatingDate}</h3>
                      <p className="text-[11px] text-slate-400">Jarvis tip: keep titles short and punchy.</p>
                    </div>
                    <button type="button" className="neon-icon-button" onClick={cancelCreate} aria-label="Cancel new task">✕</button>
                  </div>
                  <div className="space-y-4">
                    <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">Task title</label>
                    <input
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      className="glow-form-input"
                      placeholder="Plan date night, fold laundry, etc."
                      autoFocus
                    />
                    <div>
                      <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">Priority</span>
                      <div className="flex gap-2">
                        {(['A1', 'B1', 'C1'] as const).map(option => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => setNewTaskPriority(option as Priority)}
                            className="neon-action-button"
                            data-size="sm"
                            data-variant={newTaskPriority === option ? undefined : 'outline'}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button type="button" className="neon-action-button" data-size="sm" data-variant="outline" onClick={cancelCreate}>Cancel</button>
                      <button type="button" className="neon-action-button" data-size="sm" onClick={handleCreate} disabled={!newTaskTitle.trim()}>Create task</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>,
    portalTarget
  );
};
