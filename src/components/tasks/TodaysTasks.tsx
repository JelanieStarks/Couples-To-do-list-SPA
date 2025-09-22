import React from 'react';
import { useTask } from '../../contexts/TaskContext';
import { TaskItem } from './TaskItem';
import { Clock, Star, CheckCircle, AlertCircle } from 'lucide-react';

// 📅 Today's Tasks - Your daily command center
export const TodaysTasks: React.FC = () => {
  const { getTodaysTasks } = useTask();
  const todaysTasks = getTodaysTasks();

  const completedTasks = todaysTasks.filter(task => task.completed);
  const incompleteTasks = todaysTasks.filter(task => !task.completed);
  const priorityATasks = incompleteTasks.filter(task => task.priority.startsWith('A'));
  const otherTasks = incompleteTasks.filter(task => !task.priority.startsWith('A'));

  const completionRate = todaysTasks.length > 0 
    ? Math.round((completedTasks.length / todaysTasks.length) * 100) 
    : 0;

  // Handle task click to scroll to calendar position
  const handleTaskClick = (taskId: string) => {
    // Find the task element in the calendar and scroll to it
    const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
    if (taskElement) {
      taskElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
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

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="bg-gradient-to-r from-blue-100 to-indigo-100 p-2 rounded-lg">
            <Clock className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Today's Tasks</h2>
            <p className="text-sm text-gray-500">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
        </div>

        {/* Progress Badge */}
        {todaysTasks.length > 0 && (
          <div className="text-right">
            <div className={`text-2xl font-bold ${
              completionRate === 100 ? 'text-green-600' : 
              completionRate >= 50 ? 'text-blue-600' : 'text-gray-600'
            }`}>
              {completionRate}%
            </div>
            <div className="text-xs text-gray-500">
              {completedTasks.length} of {todaysTasks.length} done
            </div>
          </div>
        )}
      </div>

      {/* Jarvis Commentary */}
      <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-800 font-medium">
          {getJarvisEncouragement()}
        </p>
      </div>

      {/* Progress Bar */}
      {todaysTasks.length > 0 && (
        <div className="mb-6">
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className={`h-3 rounded-full transition-all duration-500 ${
                completionRate === 100 ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                completionRate >= 50 ? 'bg-gradient-to-r from-blue-500 to-indigo-500' :
                'bg-gradient-to-r from-gray-400 to-gray-500'
              }`}
              style={{ width: `${completionRate}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Priority A Tasks (Critical) */}
      {priorityATasks.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center space-x-2 mb-3">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <h3 className="font-semibold text-red-800">🔥 URGENT - Do These NOW!</h3>
            <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
              {priorityATasks.length}
            </span>
          </div>
          <div className="space-y-3">
            {priorityATasks.map(task => (
              <TaskItem key={task.id} task={task} onTaskClick={handleTaskClick} />
            ))}
          </div>
        </div>
      )}

      {/* Other Incomplete Tasks */}
      {otherTasks.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center space-x-2 mb-3">
            <Star className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-gray-800">📋 Other Tasks</h3>
            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
              {otherTasks.length}
            </span>
          </div>
          <div className="space-y-3">
            {otherTasks.map(task => (
              <TaskItem key={task.id} task={task} onTaskClick={handleTaskClick} />
            ))}
          </div>
        </div>
      )}

      {/* Completed Tasks */}
      {completedTasks.length > 0 && (
        <div>
          <div className="flex items-center space-x-2 mb-3">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <h3 className="font-semibold text-green-800">✅ Completed</h3>
            <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
              {completedTasks.length}
            </span>
          </div>
          <div className="space-y-3">
            {completedTasks.map(task => (
              <TaskItem key={task.id} task={task} onTaskClick={handleTaskClick} />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {todaysTasks.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🌅</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No tasks scheduled for today
          </h3>
          <p className="text-gray-600 max-w-md mx-auto">
            🤖 Looks like you have a free day! Add some tasks above or enjoy the calm before the storm.
          </p>
        </div>
      )}
    </div>
  );
};