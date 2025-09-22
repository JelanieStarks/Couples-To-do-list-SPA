import React, { useState } from 'react';
import { useTask } from '../../contexts/TaskContext';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Calendar, Clock, Star, Palette, Users, User } from 'lucide-react';
import type { Priority, AssignedTo } from '../../types';

// 📝 Task Creation Form - Where great ideas become actionable tasks
export const TaskForm: React.FC = () => {
  const { createTask } = useTask();
  const { user, partner } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'C' as Priority,
    color: '#3b82f6', // Default blue
    assignedTo: 'Me' as AssignedTo,
    dueDate: '',
    scheduledDate: '',
    dayOfWeek: '',
    timeOfDay: '',
  });

  const priorityOptions = [
    { value: 'A' as Priority, label: 'Priority A', description: 'Do this NOW or face chaos! 🔥', color: 'red' },
    { value: 'B' as Priority, label: 'Priority B', description: 'Important but not on fire 🟠', color: 'orange' },
    { value: 'C' as Priority, label: 'Priority C', description: 'Nice to have done 🟡', color: 'yellow' },
    { value: 'D' as Priority, label: 'Priority D', description: 'Someday, maybe 🟢', color: 'green' },
  ];

  const colorOptions = [
    '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', 
    '#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#f59e0b'
  ];

  const assignmentOptions = [
    { value: 'Me' as AssignedTo, label: 'Me', description: 'Only I will handle this', icon: User, color: 'pink' },
    { value: 'Partner' as AssignedTo, label: 'Partner', description: 'My partner will handle this', icon: User, color: 'blue' },
    { value: 'Both' as AssignedTo, label: 'Both', description: 'We\'ll work together on this', icon: Users, color: 'purple' },
  ];

  const dayOptions = [
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
  ];

  // Get appropriate color based on assignment
  const getTaskColor = () => {
    if (formData.assignedTo === 'Me') return '#ec4899'; // Pink
    if (formData.assignedTo === 'Partner') return '#3b82f6'; // Blue
    if (formData.assignedTo === 'Both') return formData.color; // User's selected color for gradient
    return formData.color;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    createTask({
      title: formData.title.trim(),
      description: formData.description.trim() || undefined,
      priority: formData.priority,
      color: getTaskColor(),
      assignedTo: formData.assignedTo,
      completed: false,
      scheduledDate: formData.scheduledDate || undefined,
      dayOfWeek: formData.dayOfWeek || undefined,
      timeOfDay: formData.timeOfDay || undefined,
    });

    // Reset form
    setFormData({
      title: '',
      description: '',
      priority: 'C',
      color: '#3b82f6',
      assignedTo: 'Me',
      dueDate: '',
      scheduledDate: '',
      dayOfWeek: '',
      timeOfDay: '',
    });
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center space-x-3 group"
      >
        <div className="bg-white/20 p-2 rounded-lg group-hover:scale-110 transition-transform">
          <Plus className="h-6 w-6" />
        </div>
        <div className="text-left">
          <p className="font-semibold">Add New Task</p>
          <p className="text-sm opacity-90">🤖 Tell Jarvis what needs doing!</p>
        </div>
      </button>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 animate-slide-up">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="bg-gradient-to-r from-purple-100 to-pink-100 p-2 rounded-lg">
            <Star className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Create New Task</h3>
            <p className="text-sm text-gray-500">🤖 Let's turn that idea into action!</p>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100"
        >
          ✕
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Task Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
            What needs to be done? ✨
          </label>
          <input
            type="text"
            id="title"
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder="Buy groceries, save the world, etc..."
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
            Any additional details? 📝
          </label>
          <textarea
            id="description"
            rows={3}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
            placeholder="Optional details, notes, or instructions..."
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          />
        </div>

        {/* Priority Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            How urgent is this? 🚨
          </label>
          <div className="grid grid-cols-2 gap-3">
            {priorityOptions.map((option) => (
              <label
                key={option.value}
                className={`relative flex items-center p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                  formData.priority === option.value
                    ? `border-${option.color}-300 bg-${option.color}-50`
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="priority"
                  value={option.value}
                  checked={formData.priority === option.value}
                  onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as Priority }))}
                  className="sr-only"
                />
                <div className={`flex-1 ${formData.priority === option.value ? `text-${option.color}-800` : 'text-gray-700'}`}>
                  <p className="font-medium">{option.label}</p>
                  <p className="text-xs">{option.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Color Picker */}
        <div>
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
          <p className="text-xs text-gray-500 mt-2">
            🤖 Note: Color will be automatically set based on assignment (Pink for Me, Blue for Partner, Gradient for Both)
          </p>
        </div>

        {/* Assignment Options */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Who's handling this? 👥
          </label>
          <div className="grid grid-cols-1 gap-3">
            {assignmentOptions.map((option) => {
              const IconComponent = option.icon;
              return (
                <label
                  key={option.value}
                  className={`relative flex items-center p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                    formData.assignedTo === option.value
                      ? `border-${option.color}-300 bg-${option.color}-50`
                      : 'border-gray-200 hover:border-gray-300'
                  } ${!partner && option.value === 'Partner' ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <input
                    type="radio"
                    name="assignedTo"
                    value={option.value}
                    checked={formData.assignedTo === option.value}
                    disabled={!partner && option.value === 'Partner'}
                    onChange={(e) => setFormData(prev => ({ ...prev, assignedTo: e.target.value as AssignedTo }))}
                    className="sr-only"
                  />
                  <div className={`flex items-center space-x-3 flex-1 ${
                    formData.assignedTo === option.value ? `text-${option.color}-800` : 'text-gray-700'
                  }`}>
                    <IconComponent className="h-5 w-5" />
                    <div>
                      <p className="font-medium">{option.label}</p>
                      <p className="text-xs">{option.description}</p>
                    </div>
                  </div>
                  {!partner && option.value === 'Partner' && (
                    <span className="text-xs text-gray-500 ml-2">
                      Connect partner first
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        </div>

        {/* Day of Week Selection */}
        <div>
          <label htmlFor="dayOfWeek" className="block text-sm font-medium text-gray-700 mb-2">
            Which day? 📅 (Optional)
          </label>
          <select
            id="dayOfWeek"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            value={formData.dayOfWeek}
            onChange={(e) => setFormData(prev => ({ ...prev, dayOfWeek: e.target.value }))}
          >
            <option value="">Select a day...</option>
            {dayOptions.map((day) => (
              <option key={day} value={day}>{day}</option>
            ))}
          </select>
        </div>

        {/* Time Selection */}
        <div>
          <label htmlFor="timeOfDay" className="block text-sm font-medium text-gray-700 mb-2">
            What time? ⏰ (Optional)
          </label>
          <input
            type="time"
            id="timeOfDay"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            value={formData.timeOfDay}
            onChange={(e) => setFormData(prev => ({ ...prev, timeOfDay: e.target.value }))}
          />
        </div>

        {/* Scheduled Date */}
        <div>
          <label htmlFor="scheduledDate" className="block text-sm font-medium text-gray-700 mb-2">
            When should this be done? 📅
          </label>
          <input
            type="date"
            id="scheduledDate"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            value={formData.scheduledDate}
            onChange={(e) => setFormData(prev => ({ ...prev, scheduledDate: e.target.value }))}
          />
          <p className="text-xs text-gray-500 mt-1">
            🤖 Leave blank for "whenever" tasks (they'll show up in Today's Tasks)
          </p>
        </div>

        {/* Submit Button */}
        <div className="flex space-x-3 pt-4">
          <button
            type="submit"
            disabled={!formData.title.trim()}
            className="flex-1 btn-primary flex items-center justify-center space-x-2"
          >
            <Plus className="h-5 w-5" />
            <span>Create Task</span>
          </button>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="btn-secondary"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};