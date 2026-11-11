import React, { useState } from 'react';
import { Plus, Target } from 'lucide-react';
import type { MeetingGoal } from '../../types';
import { generateUuid } from '../../utils';

function AddGoalText({ label, onAdd }: { label: string; onAdd: (text: string) => void }) {
  const [text, setText] = useState('');
  return (
    <form className="flex items-center gap-2" onSubmit={event => {
      event.preventDefault();
      if (!text.trim()) return;
      onAdd(text.trim());
      setText('');
    }}>
      <input className="glow-form-input min-w-0 flex-1" aria-label={label} placeholder={label}
        value={text} onChange={event => setText(event.target.value)} />
      <button type="submit" className="neon-action-button" data-size="sm" data-variant="outline"
        aria-label={label} disabled={!text.trim()}><Plus className="h-4 w-4" /></button>
    </form>
  );
}

interface Props {
  goals: MeetingGoal[];
  onChange: (goal: MeetingGoal) => void;
}

export function MeetingGoals({ goals, onChange }: Props) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {(['short', 'long'] as const).map(term => (
        <section key={term} className="space-y-3 rounded-xl border border-slate-700/60 bg-slate-900/40 p-4"
          aria-label={term === 'short' ? 'Short-term goals' : 'Long-term goals'}>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-100">
            <Target className="h-4 w-4 text-violet-300" />
            {term === 'short' ? 'Short-term goals' : 'Long-term goals'}
          </h3>
          <AddGoalText label={term === 'short' ? 'Add a short-term goal' : 'Add a long-term goal'}
            onAdd={title => onChange({ id: generateUuid(), term, title, steps: [] })} />
          {goals.filter(goal => goal.term === term).map(goal => (
            <article key={goal.id} className="space-y-2 rounded-lg border border-slate-700/50 bg-slate-950/30 p-3">
              <h4 className="whitespace-pre-wrap break-words text-sm font-semibold text-slate-100">{goal.title}</h4>
              {goal.steps.length > 0 && <ul className="space-y-1">
                {goal.steps.map(step => (
                  <li key={step.id}>
                    <label className="flex items-start gap-2 text-sm text-slate-200">
                      <input type="checkbox" className="mt-1 accent-violet-400" checked={step.done}
                        onChange={event => {
                          const done = event.target.checked;
                          onChange({ ...goal, steps: goal.steps.map(item => item.id === step.id ? { ...item, done } : item) });
                        }} />
                      <span className={`whitespace-pre-wrap break-words ${step.done ? 'text-slate-400 line-through' : ''}`}>{step.text}</span>
                    </label>
                  </li>
                ))}
              </ul>}
              <AddGoalText label="Add a baby step"
                onAdd={text => onChange({ ...goal, steps: [...goal.steps, { id: generateUuid(), text, done: false }] })} />
            </article>
          ))}
        </section>
      ))}
    </div>
  );
}
