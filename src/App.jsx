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

        {/* AI Prompt Integration */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">🤖 AI Assistant Prompt</h3>
            <p className="text-sm text-gray-600">
              Use this prompt with your AI assistant to organize raw notes into structured tasks:
            </p>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Copy this prompt to your AI assistant:
              </label>
              <textarea
                readOnly
                rows={20}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-sm font-mono resize-none"
                value={`You are an assistant helping two partners with ADHD organize their weekly tasks.
Rephrase and prioritize the following notes into clear, concise, past-tense, objective-style tasks.
Assign each task a priority category:
- A1–A3 = Urgent & important (A1 highest)
- B1–B3 = Important but less urgent
- C1–C3 = Nice to do, low urgency
- D = Can be postponed or ignored

Format each task exactly like this:
[PRIORITY] Task description (assigned to: Me / Partner / Both) [Day of Week, optional time]

Separate each task with three dashes on its own line, like this:
---

Example:
A1 Finish project report (assigned to: Me) [Monday, 9:00 AM]
---
B2 Call plumber about leak (assigned to: Both) [Wednesday]
---
D Organize bookshelf (assigned to: Partner)

Do not include any extra commentary or numbering.
Only output the tasks in the exact format above, with \`---\` as the delimiter between them.`}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Paste AI output here to import tasks:
              </label>
              <textarea
                rows={8}
                placeholder="Paste the AI-generated tasks here..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm font-mono resize-none"
              />
              <button
                className="mt-3 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Import AI Tasks
              </button>
            </div>
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
