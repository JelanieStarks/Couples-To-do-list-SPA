import React from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { TaskProvider } from './contexts/TaskContext';
import { LoginPage } from './components/auth/LoginPage';
import { Layout } from './components/ui/Layout';
import { PartnerManager } from './components/auth/PartnerManager';
import { TaskForm } from './components/tasks/TaskForm';
import { TodaysTasks } from './components/tasks/TodaysTasks';
import { AIImport } from './components/tasks/AIImport';
import { WeeklyCalendar } from './components/calendar/WeeklyCalendar';

// 🚀 Main App Component - Where the magic happens
function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">🤖 Jarvis is warming up the productivity engines...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <Layout>
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to Your Productivity Command Center! 🎯
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            🤖 Jarvis here! Ready to help you and your partner organize your lives with 
            the precision of a Swiss watch and the style of a superhero suit.
          </p>
        </div>

        {/* Task Creation & Import Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TaskForm />
          <AIImport />
        </div>

        {/* Partner Manager */}
        <PartnerManager />

        {/* Today's Tasks */}
        <TodaysTasks />

        {/* Weekly Calendar */}
        <WeeklyCalendar />

        {/* Footer with Jarvis Wisdom */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl p-6 text-center">
          <h3 className="text-xl font-semibold mb-2">🤖 Jarvis's Productivity Wisdom</h3>
          <p className="opacity-90">
            "Sir, I've analyzed your productivity patterns. Remember: Priority A tasks are like arc reactor maintenance - 
            critical for survival. Everything else is just Iron Man suit upgrades - important, but you won't explode without them."
          </p>
          <div className="mt-4 text-sm opacity-75">
            Pro tip: Color-code your tasks, share with your partner, and drag them around the calendar. 
            It's like having superpowers, but for organization! ⚡
          </div>
        </div>
      </div>
    </Layout>
  );
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
