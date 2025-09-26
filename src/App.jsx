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
import { ExportTasks } from './components/tasks/ExportTasks';

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
            🤖 Jarvis here! Ready to help you and your partner organize your lives with the
            precision of a Swiss watch and the style of a superhero suit.
          </p>
        </div>

        {/* Task Creation & Import Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TaskForm />
          <AIImport />
        </div>

        {/* Export & Share */}
        <ExportTasks />

        {/* Partner Manager */}
        <PartnerManager />

        {/* Today's Tasks */}
        <TodaysTasks />

        {/* Weekly Calendar */}
        <WeeklyCalendar />

        {/* AI Prompt Display */}
        <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            🤖 AI Prompt for External Use
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Copy this prompt and use it with any AI assistant to process your task notes:
          </p>
          <textarea
            readOnly
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
            className="w-full h-48 p-4 border border-gray-300 rounded-lg bg-white font-mono text-sm resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              💡 Use this prompt with ChatGPT, Claude, or any AI assistant to convert your messy
              notes into organized tasks
            </p>
            <button
              onClick={() => {
                const textarea = document.querySelector('textarea[readonly]');
                textarea.select();
                document.execCommand('copy');
                // Show a brief success message
                const button = event.target;
                const originalText = button.textContent;
                button.textContent = 'Copied!';
                setTimeout(() => {
                  button.textContent = originalText;
                }, 1000);
              }}
              className="text-sm text-purple-600 hover:text-purple-700 font-medium"
            >
              📋 Copy Prompt
            </button>
          </div>
        </div>

        {/* Footer with Jarvis Wisdom */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl p-6 text-center">
          <h3 className="text-xl font-semibold mb-2">🤖 Jarvis's Productivity Wisdom</h3>
          <p className="opacity-90">
            "Sir, I've analyzed your productivity patterns. Remember: Priority A tasks are like arc
            reactor maintenance - critical for survival. Everything else is just Iron Man suit
            upgrades - important, but you won't explode without them."
          </p>
          <div className="mt-4 text-sm opacity-75">
            Pro tip: Color-code your tasks, share with your partner, and drag them around the
            calendar. It's like having superpowers, but for organization! ⚡
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
