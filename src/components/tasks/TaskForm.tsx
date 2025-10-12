import React, { useState } from 'react';
import { useTask } from '../../contexts/TaskContext';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Calendar, Clock, Star, Palette } from 'lucide-react';
import type { Priority, Assignment } from '../../types';

// 📝 Task Creation Form - Where great ideas become actionable tasks
export const TaskForm: React.FC = () => {
  const { createTask } = useTask();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'C1' as Priority,
    assignment: 'me' as Assignment,
    color: '#3b82f6', // Default blue
    dueDate: '',
    scheduledDate: '',
    scheduledTime: '',
    dayOfWeek: '',
    repeat: '' as '' | 'daily',
  });

  const priorityOptions = [
    { value: 'A1' as Priority, label: 'A1', description: 'URGENT! Do this NOW! 🚨', color: 'red' },
    { value: 'A2' as Priority, label: 'A2', description: 'Very urgent & important 🔥', color: 'red' },
    { value: 'A3' as Priority, label: 'A3', description: 'Urgent but manageable 🟥', color: 'red' },
    { value: 'B1' as Priority, label: 'B1', description: 'Important, not urgent 🟠', color: 'orange' },
    { value: 'B2' as Priority, label: 'B2', description: 'Important but can wait 🟧', color: 'orange' },
    { value: 'B3' as Priority, label: 'B3', description: 'Somewhat important 🟨', color: 'orange' },
    { value: 'C1' as Priority, label: 'C1', description: 'Nice to have done 🟡', color: 'yellow' },
    { value: 'C2' as Priority, label: 'C2', description: 'Would be good to do 🟤', color: 'yellow' },
    { value: 'C3' as Priority, label: 'C3', description: 'Low priority task 🟫', color: 'yellow' },
    { value: 'D' as Priority, label: 'D', description: 'Someday / optional 🟢', color: 'green' },
  ];

  const assignmentOptions = [
    { value: 'me' as Assignment, label: 'Me', description: 'I will handle this task', icon: '👤' },
    { value: 'partner' as Assignment, label: 'Partner', description: 'My partner will handle this', icon: '👥' },
    { value: 'both' as Assignment, label: 'Both', description: 'We\'ll do this together', icon: '💕' },
  ];

  const dayOptions = [
    { value: '', label: 'Any day' },
    { value: 'Monday', label: 'Monday' },
    { value: 'Tuesday', label: 'Tuesday' },
    { value: 'Wednesday', label: 'Wednesday' },
    { value: 'Thursday', label: 'Thursday' },
    { value: 'Friday', label: 'Friday' },
    { value: 'Saturday', label: 'Saturday' },
    { value: 'Sunday', label: 'Sunday' },
  ];

  const colorOptions = [
    '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', 
    '#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#f59e0b'
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    createTask({
      title: formData.title.trim(),
      description: formData.description.trim() || undefined,
      priority: formData.priority,
      assignment: formData.assignment,
      color: getTaskColor(),
      completed: false,
      scheduledDate: formData.scheduledDate || undefined,
      scheduledTime: formData.scheduledTime || undefined,
      dayOfWeek: formData.dayOfWeek || undefined,
      repeat: formData.repeat || undefined,
    });

    // Reset form
    setFormData({
      title: '',
      description: '',
      priority: 'C1',
      assignment: 'me',
      color: '#3b82f6',
      dueDate: '',
      scheduledDate: '',
      scheduledTime: '',
      dayOfWeek: '',
      repeat: '',
    });
    setIsOpen(false);
  };

  // Get task color based on assignment
  const getTaskColor = () => {
    switch (formData.assignment) {
      case 'me':
        return user?.color || '#ec4899'; // Pink for me
      case 'partner':
        return '#3b82f6'; // Blue for partner
      case 'both':
        return '#8b5cf6'; // Purple for both (gradient will be applied in UI)
      default:
        return formData.color;
    }
  };

  if (!isOpen) {
    return (
      <button onClick={() => setIsOpen(true)} className="w-full btn-neon" data-size="lg">
        <Plus className="h-5 w-5" />
        <span className="flex flex-col items-start leading-tight">
          <span className="font-semibold tracking-wide">Add New Task</span>
          <span className="text-[10px] opacity-80 normal-case font-normal">🤖 Tell Jarvis what needs doing!</span>
        </span>
      </button>
    );
  }

  return (
  <div className="panel-neon panel-neon-border animate-slide-up">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center space-x-3">
        <div className="p-2 rounded-lg bg-slate-800 border border-slate-600">
          <Star className="h-6 w-6 text-indigo-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-100 tracking-wide">Create New Task</h3>
          <p className="text-xs text-slate-400 tracking-wide">🤖 Let's turn that idea into action!</p>
        </div>
      </div>
      <button onClick={() => setIsOpen(false)} className="icon-btn-neon" aria-label="Close task form">✕</button>
    </div>

  <form onSubmit={handleSubmit} className="space-y-5">
        {/* Task Title */}
        <div className="neon-field">
          <label htmlFor="title">What needs to be done? ✨</label>
          <div className="neon-glow-ambient" />
          <input
            type="text"
            id="title"
            required
            className="neon-input"
            placeholder="Buy groceries, save the world, etc..."
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
          />
        </div>

        {/* Description */}
        <div className="neon-field">
          <label htmlFor="description">Any additional details? 📝</label>
          <div className="neon-glow-ambient" />
          <textarea
            id="description"
            rows={3}
            className="neon-textarea"
            placeholder="Optional details, notes, or instructions..."
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          />
        </div>

        {/* Priority Selection */}
        <div>
          <label className="block text-[11px] font-semibold tracking-wide text-slate-300 mb-2 uppercase">Priority (A1 highest → D lowest)</label>
          <div className="w-full grid gap-2" style={{gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))'}}>
            {priorityOptions.map(opt => {
              const active = formData.priority === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, priority: opt.value }))}
                  aria-pressed={active}
                  className={`btn-neon w-full text-left flex flex-col items-start gap-1 ${active ? '' : ''}`}
                  data-variant="soft"
                  data-size="sm"
                  title={`Set priority ${opt.label}`}
                >
                  <span className="text-xs font-semibold tracking-wide">{opt.label}</span>
                  <span className="text-xs opacity-90">{opt.description}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Assignment Selection */}
        <div>
          <label className="block text-[11px] font-semibold tracking-wide text-slate-300 mb-3 uppercase">
            Who will handle this? 👥
          </label>
          <div className="grid grid-cols-3 gap-3">
            {assignmentOptions.map((option) => (
              <label
                key={option.value}
                className={`relative flex flex-col items-center p-4 rounded-lg border-2 cursor-pointer transition-colors text-center ${
                  formData.assignment === option.value
                    ? 'border-indigo-400/70 bg-slate-800/80'
                    : 'border-slate-600/40 bg-slate-900/40 hover:border-slate-500/70'
                }`}
              >
                <input
                  type="radio"
                  name="assignment"
                  value={option.value}
                  checked={formData.assignment === option.value}
                  onChange={(e) => setFormData(prev => ({ ...prev, assignment: e.target.value as Assignment }))}
                  className="sr-only"
                />
                <div className="text-2xl mb-2">{option.icon}</div>
                <div className={`text-center ${formData.assignment === option.value ? 'text-indigo-300' : 'text-slate-300'}`}>
                  <p className="font-medium text-xs tracking-wide uppercase">{option.label}</p>
                  <p className="text-[10px] leading-snug opacity-80">{option.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Color Picker - Hidden when assignment determines color */}
        {formData.assignment === 'me' && (
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-3">
              Pick your color 🎨
            </label>
            <div className="flex flex-wrap gap-3">
              {colorOptions.map((color) => {
                const selected = formData.color === color;
                return (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, color }))}
                    data-testid={`color-btn-${color}`}
                    className={`w-12 h-12 rounded-xl border-2 transition-all ${
                      selected
                        ? 'border-indigo-300 ring-2 ring-indigo-400 shadow-lg scale-105'
                        : 'border-slate-500/50 hover:border-slate-300 hover:scale-105'
                    }`}
                    style={{ backgroundColor: color }}
                    title={color}
                    aria-pressed={selected}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Day and Time Selection */}
  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label htmlFor="dayOfWeek" className="block text-[11px] font-semibold tracking-wide text-slate-300 mb-2 uppercase">
              Day of the week 📅
            </label>
            <select
              id="dayOfWeek"
              className="select-neon"
              value={formData.dayOfWeek}
              onChange={(e) => setFormData(prev => ({ ...prev, dayOfWeek: e.target.value }))}
            >
              {dayOptions.map((day) => (
                <option key={day.value} value={day.value}>
                  {day.label}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="scheduledTime" className="block text-[11px] font-semibold tracking-wide text-slate-300 mb-2 uppercase">
              Time (optional) ⏰
            </label>
            <input
              type="time"
              id="scheduledTime"
              className="time-neon"
              value={formData.scheduledTime}
              onChange={(e) => setFormData(prev => ({ ...prev, scheduledTime: e.target.value }))}
            />
          </div>
        </div>

        {/* Repeat selection (Google Calendar style simple toggle) */}
        <div>
          <label className="block text-[11px] font-semibold tracking-wide text-slate-300 mb-2 uppercase">
            Repeats 🔁
          </label>
          <div className="flex items-center gap-3">
            <label className={`flex items-center gap-2 text-sm ${formData.repeat === 'daily' ? 'text-indigo-300' : 'text-slate-300'}`}>
              <input
                type="checkbox"
                checked={formData.repeat === 'daily'}
                onChange={(e) => setFormData(prev => ({ ...prev, repeat: e.target.checked ? 'daily' : '' }))}
              />
              This task repeats daily
            </label>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Appears every day starting from the selected date (or today if none).</p>
        </div>

        {/* Color Picker */}
        <div style={{ display: 'none' }}>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Pick a color 🎨
          </label>
          <div className="flex flex-wrap gap-3">
            {colorOptions.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, color }))}
                className={`w-10 h-10 rounded-lg border-2 transition-transform hover:scale-110 ${
                  formData.color === color ? 'border-gray-400 scale-110' : 'border-gray-200'
                }`}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        </div>

        {/* Scheduled Date */}
        <div>
          <label htmlFor="scheduledDate" className="block text-[11px] font-semibold tracking-wide text-slate-300 mb-1 uppercase">
            When should this be done? 📅
          </label>
          <input
            type="date"
            id="scheduledDate"
            className="date-neon"
            value={formData.scheduledDate}
            onChange={(e) => setFormData(prev => ({ ...prev, scheduledDate: e.target.value }))}
          />
          <p className="text-[10px] text-slate-400 mt-2 tracking-wide">
            🤖 Leave blank for "whenever" tasks (they'll show up in Today's Tasks)
          </p>
        </div>

        {/* Submit Button */}
        <div className="btn-row pt-3">
          <button type="submit" disabled={!formData.title.trim()} className="btn-neon" data-size="sm">
            <Plus className="h-4 w-4" />
            <span>Create Task</span>
          </button>
          <button type="button" onClick={() => setIsOpen(false)} className="btn-neon" data-variant="outline" data-size="sm">Cancel</button>
        </div>
      </form>
    </div>
  );
};
