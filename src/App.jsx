import React from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { TaskProvider } from './contexts/TaskContext';
import { LoginPage } from './components/auth/LoginPage';
import { Layout } from './components/ui/Layout';
import { PartnerManager } from './components/auth/PartnerManager';

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

        {/* Partner Manager */}
        <PartnerManager />

        {/* Placeholder for future components */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <div className="text-6xl mb-4">🚧</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            More Features Coming Soon!
          </h3>
          <p className="text-gray-600">
            🤖 Jarvis is still building the task management, calendar, and AI import features. 
            Stay tuned for the full productivity experience!
          </p>
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
