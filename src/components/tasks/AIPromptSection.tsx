import React from 'react';
import { Brain } from 'lucide-react';

// 🧠 AI Prompt Section - The exact prompt specification for AI task organization
export const AIPromptSection: React.FC = () => {
  const aiPrompt = `You are an assistant helping two partners with ADHD organize their weekly tasks.
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
Only output the tasks in the exact format above, with \`---\` as the delimiter between them.`;

  return (
    <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl border border-indigo-200 p-6 mt-8">
      <div className="flex items-center space-x-3 mb-4">
        <div className="bg-indigo-100 p-2 rounded-lg">
          <Brain className="h-6 w-6 text-indigo-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">AI Task Organization Prompt</h3>
          <p className="text-sm text-gray-600">🤖 Copy this prompt to your AI assistant for task organization</p>
        </div>
      </div>
      
      <textarea
        value={aiPrompt}
        readOnly
        rows={20}
        className="w-full px-4 py-3 bg-white border border-indigo-200 rounded-lg font-mono text-sm text-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
        onClick={(e) => e.currentTarget.select()}
      />
      
      <div className="mt-3 text-xs text-gray-600 bg-white/50 rounded-lg p-3 border border-indigo-100">
        <p className="font-medium mb-2">🤖 How to use this prompt:</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>Copy this entire prompt to your AI assistant (ChatGPT, Claude, etc.)</li>
          <li>Add your messy notes/thoughts after the prompt</li>
          <li>The AI will format them into organized tasks</li>
          <li>Copy the AI output and paste it in the "AI Task Import" section above</li>
        </ol>
      </div>
    </div>
  );
};