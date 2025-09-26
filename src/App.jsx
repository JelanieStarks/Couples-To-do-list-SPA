import React from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { TaskProvider } from './contexts/TaskContext';
import { LoginPage } from './components/auth/LoginPage';
import { Layout } from './components/ui/Layout';
import { TaskForm } from './components/tasks/TaskForm';
import { TodaysTasks } from './components/tasks/TodaysTasks';
import { WeeklyCalendar } from './components/calendar/WeeklyCalendar';
// Feature components are now rendered inside TopNav cards, not directly here.

// 🚀 Main App Component - Where the magic happens
function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();

  let content = null;
  if (isLoading) {
    content = (
      <div className="min-h-[50vh] bg-transparent flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-300">🤖 Jarvis is warming up the productivity engines...</p>
        </div>
      </div>
    );
  } else if (!isAuthenticated) {
    content = <LoginPage />;
  } else {
    content = (
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-slate-100 mb-2">
            Welcome to Your Productivity Command Center! 🎯
          </h2>
          <p className="text-slate-300 max-w-2xl mx-auto">
            🤖 Use the panel below and the weekly planner to organize your day.
          </p>
        </div>

        {/* Dashboard: Task form + Today's Tasks */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TaskForm />
          <TodaysTasks />
        </div>

        {/* Weekly Planner */}
        <WeeklyCalendar />
      </div>
    );
  }

  return <Layout>{content}</Layout>;
}

function App() {
  return (
    <AuthProvider>
      <TaskProvider>
        <AppContent />
      </TaskProvider>
    </AuthProvider>
  );
}

export default App;
