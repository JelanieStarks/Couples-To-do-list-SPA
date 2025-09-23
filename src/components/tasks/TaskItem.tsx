import React, { useState } from 'react';
import { useTask } from '../../contexts/TaskContext';
import { useAuth } from '../../contexts/AuthContext';
import { Check, Edit, Trash2, Calendar, User, Users, Clock } from 'lucide-react';
import type { Task, Priority, Assignment } from '../../types';
import { formatDate } from '../../utils';

interface TaskItemProps {
  task: Task;
  showDate?: boolean;
  isDragging?: boolean;
  onTaskClick?: (taskId: string) => void;
}

// 📋 Task Item Component - Individual task with all the bells and whistles
export const TaskItem: React.FC<TaskItemProps> = ({ task, showDate = false, isDragging = false, onTaskClick }) => {
  const { updateTask, deleteTask, toggleTaskComplete } = useTask();
  const { user, partner } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    title: task.title,
    description: task.description || '',
    priority: task.priority,
    color: task.color,
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

  const priority = priorityConfig[task.priority];

  const handleSaveEdit = () => {
    if (!editData.title.trim()) return;

    updateTask(task.id, {
      title: editData.title.trim(),
      description: editData.description.trim() || undefined,
      priority: editData.priority,
      color: editData.color,
    });

    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditData({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      color: task.color,
    });
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (confirm('🤖 Are you sure you want to delete this task? Jarvis will miss it!')) {
      deleteTask(task.id);
    }
  };

  const handleToggleShare = () => {
    if (!partner) return;
    
    updateTask(task.id, {
      sharedWith: task.sharedWith ? undefined : partner.id,
    });
  };

  if (isEditing) {
    return (
      <div className={`bg-white rounded-lg border-2 border-purple-300 p-4 shadow-lg ${isDragging ? 'opacity-50' : ''}`}>
        <div className="space-y-3">
          <input
            type="text"
            value={editData.title}
            onChange={(e) => setEditData(prev => ({ ...prev, title: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-medium"
            placeholder="Task title..."
          />
          
          <textarea
            value={editData.description}
            onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm resize-none"
            rows={2}
            placeholder="Optional description..."
          />

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1 flex-wrap">
              {['A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'C1', 'C2', 'C3', 'D'].map((p) => (
                <button
                  key={p}
                  onClick={() => setEditData(prev => ({ ...prev, priority: p as Priority }))}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                    editData.priority === p
                      ? `${priorityConfig[p as Priority].bg} ${priorityConfig[p as Priority].text}`
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <div className="flex space-x-2">
              <button
                onClick={handleSaveEdit}
                className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
              >
                Save
              </button>
              <button
                onClick={handleCancelEdit}
                className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`group bg-white rounded-lg border-2 p-4 transition-all duration-200 hover:shadow-md cursor-pointer ${
        task.assignment === 'both'
          ? 'border-purple-200 bg-gradient-to-r from-purple-50 via-pink-50 to-blue-50' 
          : 'border-gray-200 hover:border-gray-300'
      } ${task.completed ? 'opacity-75' : ''} ${isDragging ? 'opacity-50 rotate-3' : ''}`}
      style={{ 
        borderLeftColor: assignmentInfo.color === 'gradient' ? '#8b5cf6' : assignmentInfo.color, 
        borderLeftWidth: '4px' 
      }}
      onClick={() => onTaskClick?.(task.id)}
    >
      <div className="flex items-start space-x-3">
        {/* Checkbox */}
        <button
          onClick={() => toggleTaskComplete(task.id)}
          className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
            task.completed
              ? 'bg-green-500 border-green-500 text-white'
              : 'border-gray-300 hover:border-green-400'
          }`}
        >
          {task.completed && <Check className="h-4 w-4" />}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className={`font-medium text-gray-900 ${task.completed ? 'line-through' : ''}`}>
                {task.title}
              </h3>
              {task.description && (
                <p className={`text-sm text-gray-600 mt-1 ${task.completed ? 'line-through' : ''}`}>
                  {task.description}
                </p>
              )}
            </div>

            {/* Priority Badge */}
            <div className={`flex-shrink-0 ml-3 px-2 py-1 rounded-full text-xs font-medium ${priority.bg} ${priority.text} flex items-center space-x-1`}>
              <span>{priority.emoji}</span>
              <span>{task.priority}</span>
            </div>
          </div>

          {/* Metadata */}
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center space-x-3 text-xs text-gray-500">
              {/* Assignment Info */}
              <div className="flex items-center space-x-1">
                <span>{assignmentInfo.icon}</span>
                <span>{assignmentInfo.label}</span>
              </div>

              {/* Time Info */}
              {task.scheduledTime && (
                <div className="flex items-center space-x-1">
                  <Clock className="h-3 w-3" />
                  <span>{task.scheduledTime}</span>
                </div>
              )}

              {/* Date Info */}
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

            {/* Action Buttons */}
            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {partner && (
                <button
                  onClick={handleToggleShare}
                  className={`p-1 rounded transition-colors ${
                    isShared 
                      ? 'text-purple-600 hover:bg-purple-100' 
                      : 'text-gray-400 hover:text-purple-600 hover:bg-purple-50'
                  }`}
                  title={isShared ? 'Unshare task' : 'Share with partner'}
                >
                  <Users className="h-4 w-4" />
                </button>
              )}

              {isOwner && (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    title="Edit task"
                  >
                    <Edit className="h-4 w-4" />
                  </button>

                  <button
                    onClick={handleDelete}
                    className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Delete task"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Jarvis Commentary */}
      {task.priority.startsWith('A') && !task.completed && (
        <div className="mt-3 p-2 bg-red-50 border-l-4 border-red-400 rounded">
          <p className="text-xs text-red-700">
            🤖 <strong>Jarvis says:</strong> This is Priority {task.priority}! {task.priority === 'A1' ? 'URGENT ALERT! Handle this NOW!' : 'High priority - handle this before it becomes critical!'} 🚨
          </p>
        </div>
      )}
    </div>
  );
};