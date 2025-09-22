import React, { useState } from 'react';
import { useTask } from '../../contexts/TaskContext';
import { Brain, Upload, FileText, Zap, Info } from 'lucide-react';

// 🧠 AI Import Component - Turn raw text into organized tasks
export const AIImport: React.FC = () => {
  const { importTasksFromText } = useTask();
  const [isOpen, setIsOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [lastImportCount, setLastImportCount] = useState(0);

  const handleImport = async () => {
    if (!importText.trim()) return;

    setIsImporting(true);
    try {
      const importedTasks = importTasksFromText(importText);
      setLastImportCount(importedTasks.length);
      setImportText('');
      
      // Show success message for a moment
      setTimeout(() => {
        setIsOpen(false);
        setLastImportCount(0);
      }, 2000);
    } catch (error) {
      console.error('Import failed:', error);
    } finally {
      setIsImporting(false);
    }
  };

  const exampleText = `--- Daily Tasks ---
[A] Review project proposal: Need to finish before 2 PM meeting
[B] Buy groceries
[C] Call mom
Priority D: Clean garage

--- Work Items ---
- Schedule team meeting
- Update documentation  
- Test new feature (Priority: A)

--- Weekend Plans ---
1. Meal prep for next week
2. Go for a run
3. Read new book chapter`;

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center space-x-3 group"
      >
        <div className="bg-white/20 p-2 rounded-lg group-hover:scale-110 transition-transform">
          <Brain className="h-6 w-6" />
        </div>
        <div className="text-left">
          <p className="font-semibold">AI Task Import</p>
          <p className="text-sm opacity-90">🤖 Paste text, get organized tasks!</p>
        </div>
      </button>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 animate-slide-up">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="bg-gradient-to-r from-indigo-100 to-purple-100 p-2 rounded-lg">
            <Brain className="h-6 w-6 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">AI Task Import</h3>
            <p className="text-sm text-gray-500">🤖 Jarvis will parse your text into tasks</p>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100"
        >
          ✕
        </button>
      </div>

      {lastImportCount > 0 && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <Zap className="h-5 w-5 text-green-600" />
            <p className="text-green-800 font-medium">
              🎉 Successfully imported {lastImportCount} tasks!
            </p>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Instructions */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900 mb-2">🤖 How Jarvis Parses Your Text:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Use <code className="bg-blue-100 px-1 rounded">---</code> to separate sections</li>
                <li>• Format: <code className="bg-blue-100 px-1 rounded">[A] Task title: description</code></li>
                <li>• Or: <code className="bg-blue-100 px-1 rounded">Priority B: Task name</code></li>
                <li>• Or: <code className="bg-blue-100 px-1 rounded">Task (Priority: C)</code></li>
                <li>• Bullet points and numbers work too!</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Text Input */}
        <div>
          <label htmlFor="importText" className="block text-sm font-medium text-gray-700 mb-2">
            Paste your text here 📝
          </label>
          <textarea
            id="importText"
            rows={10}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none font-mono text-sm"
            placeholder={exampleText}
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
          />
          <p className="text-xs text-gray-500 mt-2">
            🤖 Tip: Copy/paste from anywhere - meeting notes, emails, brain dumps, etc.
          </p>
        </div>

        {/* Example */}
        <div className="border-t pt-6">
          <h4 className="font-medium text-gray-900 mb-3">📖 Example Format:</h4>
          <div className="bg-gray-50 rounded-lg p-4">
            <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">
              {exampleText}
            </pre>
          </div>
        </div>

        {/* Actions */}
        <div className="flex space-x-3 pt-4">
          <button
            onClick={handleImport}
            disabled={isImporting || !importText.trim()}
            className="flex-1 btn-primary flex items-center justify-center space-x-2"
          >
            {isImporting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Processing...</span>
              </>
            ) : (
              <>
                <Upload className="h-5 w-5" />
                <span>Import Tasks</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="btn-secondary"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};