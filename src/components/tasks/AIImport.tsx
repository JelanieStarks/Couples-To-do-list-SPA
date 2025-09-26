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
        className="w-full btn-neon" data-size="lg"
      >
        <Brain className="h-5 w-5" />
        <span className="flex flex-col items-start leading-tight">
          <span className="font-semibold tracking-wide">AI Task Import</span>
          <span className="text-[10px] opacity-80 normal-case font-normal">🤖 Paste text, get organized tasks!</span>
        </span>
      </button>
    );
  }

  return (
    <div className="panel-neon panel-neon-border animate-slide-up">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-slate-800 border border-slate-600">
            <Brain className="h-6 w-6 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-100 tracking-wide">AI Task Import</h3>
            <p className="text-xs text-slate-400 tracking-wide">🤖 Jarvis will parse your text into tasks</p>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="icon-btn-neon"
          aria-label="Close AI import panel"
        >
          ✕
        </button>
      </div>

      {lastImportCount > 0 && (
        <div className="mb-4 p-3 rounded-lg bg-emerald-900/30 border border-emerald-600/40">
          <div className="flex items-center space-x-2">
            <Zap className="h-4 w-4 text-emerald-300" />
            <p className="text-emerald-200 text-xs font-medium tracking-wide">
              🎉 Imported {lastImportCount} tasks successfully!
            </p>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Instructions */}
        <div className="p-4 rounded-lg bg-slate-800/60 border border-slate-700/70">
          <div className="flex items-start space-x-3">
            <Info className="h-5 w-5 text-indigo-300 mt-0.5" />
            <div>
              <h4 className="font-medium text-indigo-300 mb-2 text-sm tracking-wide">🤖 How Jarvis Parses Your Text:</h4>
              <ul className="text-[11px] text-slate-300 space-y-1 leading-relaxed tracking-wide">
                <li><span className="text-indigo-400">•</span> Use <code className="px-1 rounded bg-slate-900/60 border border-slate-600/60">---</code> to separate sections</li>
                <li><span className="text-indigo-400">•</span> Format: <code className="px-1 rounded bg-slate-900/60 border border-slate-600/60">[A] Task title: description</code></li>
                <li><span className="text-indigo-400">•</span> Or: <code className="px-1 rounded bg-slate-900/60 border border-slate-600/60">Priority B: Task name</code></li>
                <li><span className="text-indigo-400">•</span> Or: <code className="px-1 rounded bg-slate-900/60 border border-slate-600/60">Task (Priority: C)</code></li>
                <li><span className="text-indigo-400">•</span> Bullet points & numbers work too</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Text Input */}
        <div>
          <label htmlFor="importText" className="block text-[11px] font-semibold tracking-wide text-slate-300 mb-2 uppercase">
            Paste your text here 📝
          </label>
          <textarea
            id="importText"
            rows={10}
            className="neon-textarea font-mono text-xs min-h-[200px]"
            placeholder={exampleText}
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
          />
          <p className="text-[10px] text-slate-500 mt-2 tracking-wide">
            🤖 Tip: Copy/paste from anywhere - meeting notes, emails, brain dumps, etc.
          </p>
        </div>

        {/* Example */}
        <div className="border-t border-slate-700/70 pt-5">
          <h4 className="font-medium text-slate-200 mb-3 text-sm tracking-wide">📖 Example Format:</h4>
          <div className="rounded-lg p-4 bg-slate-800/60 border border-slate-700/70">
            <pre className="text-[11px] text-slate-300 whitespace-pre-wrap font-mono leading-relaxed">
              {exampleText}
            </pre>
          </div>
        </div>

        {/* Actions */}
        <div className="btn-row pt-3">
          <button
            onClick={handleImport}
            disabled={isImporting || !importText.trim()}
            className="btn-neon" data-size="sm"
          >
            {isImporting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-indigo-300 border-t-transparent"></div>
                <span>Processing...</span>
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                <span>Import Tasks</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="btn-neon" data-variant="outline" data-size="sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
