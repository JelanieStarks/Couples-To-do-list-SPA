import React, { useState } from 'react';
import { useTask } from '../../contexts/TaskContext';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Calendar, Clock, Star, Palette, Users } from 'lucide-react';
import type { Priority } from '../../types';

// 📝 Task Creation Form - Where great ideas become actionable tasks
export const TaskForm: React.FC = () => {
  const { createTask } = useTask();
  const { user, partner } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'C1' as Priority,
    assignedTo: 'Me' as 'Me' | 'Partner' | 'Both',
    color: '#3b82f6', // Default blue
    scheduledDate: '',
    scheduledTime: '',
  });

  const priorityOptions = [
    { value: 'A1' as Priority, label: 'Priority A1', description: 'URGENT - Do this NOW! 🚨', color: 'red' },
    { value: 'A2' as Priority, label: 'Priority A2', description: 'Very urgent & important 🔥', color: 'red' },
    { value: 'A3' as Priority, label: 'Priority A3', description: 'Urgent but manageable 🟠', color: 'orange' },
    { value: 'B1' as Priority, label: 'Priority B1', description: 'Important, not urgent 📋', color: 'blue' },
    { value: 'B2' as Priority, label: 'Priority B2', description: 'Important but can wait 📝', color: 'blue' },
    { value: 'B3' as Priority, label: 'Priority B3', description: 'Important, lower priority 🟡', color: 'yellow' },
    { value: 'C1' as Priority, label: 'Priority C1', description: 'Nice to do, moderate urgency 🟢', color: 'green' },
    { value: 'C2' as Priority, label: 'Priority C2', description: 'Nice to do, low urgency 🟢', color: 'green' },
    { value: 'C3' as Priority, label: 'Priority C3', description: 'Nice to do, very low urgency 🟢', color: 'green' },
    { value: 'D' as Priority, label: 'Priority D', description: 'Someday, maybe ⚫', color: 'gray' },
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
      assignedTo: formData.assignedTo,
      color: formData.color,
      completed: false,
      scheduledDate: formData.scheduledDate || undefined,
      scheduledTime: formData.scheduledTime || undefined,
    });

    // Reset form
    setFormData({
      title: '',
      description: '',
      priority: 'C1',
      assignedTo: 'Me',
      color: '#3b82f6',
      scheduledDate: '',
      scheduledTime: '',
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

        {/* Assigned To Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Who's responsible? 👥
          </label>
          <div className="grid grid-cols-3 gap-3">
            {['Me', 'Partner', 'Both'].map((option) => (
              <label
                key={option}
                className={`relative flex items-center justify-center p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                  formData.assignedTo === option
                    ? 'border-purple-300 bg-purple-50 text-purple-800'
                    : 'border-gray-200 hover:border-gray-300'
                } ${option === 'Partner' && !partner ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <input
                  type="radio"
                  name="assignedTo"
                  value={option}
                  checked={formData.assignedTo === option}
                  disabled={option === 'Partner' && !partner}
                  onChange={(e) => setFormData(prev => ({ ...prev, assignedTo: e.target.value as 'Me' | 'Partner' | 'Both' }))}
                  className="sr-only"
                />
                <div className="flex items-center space-x-2">
                  {option === 'Me' && <span>🙋‍♀️</span>}
                  {option === 'Partner' && <span>🙋‍♂️</span>}
                  {option === 'Both' && <span>👫</span>}
                  <span className="font-medium">{option}</span>
                </div>
              </label>
            ))}
          </div>
          {!partner && (
            <p className="text-xs text-gray-500 mt-2">
              🤖 Connect with a partner to assign tasks to them!
            </p>
          )}
        </div>

        {/* Priority Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            How urgent is this? 🚨
          </label>
          <div className="space-y-2">
            {/* Group A priorities */}
            <div>
              <p className="text-xs font-medium text-red-600 mb-2">🚨 URGENT & IMPORTANT</p>
              <div className="grid grid-cols-3 gap-2">
                {priorityOptions.filter(p => p.value.startsWith('A')).map((option) => (
                  <label
                    key={option.value}
                    className={`relative flex items-center justify-center p-2 rounded-lg border-2 cursor-pointer transition-colors ${
                      formData.priority === option.value
                        ? 'border-red-300 bg-red-50 text-red-800'
                        : 'border-gray-200 hover:border-red-200'
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
                    <div className="text-center">
                      <p className="font-medium text-sm">{option.value}</p>
                      <p className="text-xs">{option.description.split(' ')[0]}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            
            {/* Group B priorities */}
            <div>
              <p className="text-xs font-medium text-blue-600 mb-2">📋 IMPORTANT, LESS URGENT</p>
              <div className="grid grid-cols-3 gap-2">
                {priorityOptions.filter(p => p.value.startsWith('B')).map((option) => (
                  <label
                    key={option.value}
                    className={`relative flex items-center justify-center p-2 rounded-lg border-2 cursor-pointer transition-colors ${
                      formData.priority === option.value
                        ? 'border-blue-300 bg-blue-50 text-blue-800'
                        : 'border-gray-200 hover:border-blue-200'
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
                    <div className="text-center">
                      <p className="font-medium text-sm">{option.value}</p>
                      <p className="text-xs">{option.description.split(' ')[0]}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            
            {/* Group C priorities */}
            <div>
              <p className="text-xs font-medium text-green-600 mb-2">🟢 NICE TO DO</p>
              <div className="grid grid-cols-3 gap-2">
                {priorityOptions.filter(p => p.value.startsWith('C')).map((option) => (
                  <label
                    key={option.value}
                    className={`relative flex items-center justify-center p-2 rounded-lg border-2 cursor-pointer transition-colors ${
                      formData.priority === option.value
                        ? 'border-green-300 bg-green-50 text-green-800'
                        : 'border-gray-200 hover:border-green-200'
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
                    <div className="text-center">
                      <p className="font-medium text-sm">{option.value}</p>
                      <p className="text-xs">{option.description.split(' ')[0]}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            
            {/* Group D priority */}
            <div>
              <p className="text-xs font-medium text-gray-600 mb-2">⚫ SOMEDAY MAYBE</p>
              <div className="grid grid-cols-1 gap-2">
                {priorityOptions.filter(p => p.value === 'D').map((option) => (
                  <label
                    key={option.value}
                    className={`relative flex items-center justify-center p-2 rounded-lg border-2 cursor-pointer transition-colors ${
                      formData.priority === option.value
                        ? 'border-gray-300 bg-gray-50 text-gray-800'
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
                    <div className="text-center">
                      <p className="font-medium text-sm">{option.value}</p>
                      <p className="text-xs">{option.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
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
        </div>

        {/* Scheduled Date */}
        <div>
          <label htmlFor="scheduledDate" className="block text-sm font-medium text-gray-700 mb-2">
            When should this be done? 📅
          </label>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="date"
              id="scheduledDate"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              value={formData.scheduledDate}
              onChange={(e) => setFormData(prev => ({ ...prev, scheduledDate: e.target.value }))}
            />
            <input
              type="time"
              id="scheduledTime"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              value={formData.scheduledTime}
              onChange={(e) => setFormData(prev => ({ ...prev, scheduledTime: e.target.value }))}
              placeholder="Optional time"
            />
          </div>
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