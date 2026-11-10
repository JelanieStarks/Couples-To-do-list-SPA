import React, { useRef } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { MeetingEntry } from '../../types';
import { generateUuid } from '../../utils';

interface Props {
  label: string;
  entries: MeetingEntry[];
  authorId: string;
  onChange: (entries: MeetingEntry[]) => void;
  onAction?: (entry: MeetingEntry, makeTask: boolean) => void;
  actionState?: (entry: MeetingEntry) => 'added' | 'task' | undefined;
  disabled?: boolean;
}

export const MeetingEntryList: React.FC<Props> = ({ label, entries, authorId, onChange, onAction, actionState, disabled }) => {
  const emptyId = useRef(generateUuid());
  const fields = useRef(new Map<string, HTMLTextAreaElement>());
  const displayed = entries.length ? entries : [{ id: emptyId.current, text: '', authorId }];
  const addAfter = (index: number) => {
    const entry = { id: generateUuid(), text: '', authorId };
    const next = [...displayed];
    next.splice(index + 1, 0, entry);
    onChange(next);
    // Focus after React commits the new row; existing rows keep their identity.
    requestAnimationFrame(() => fields.current.get(entry.id)?.focus());
  };

  return (
    <section className="rounded-xl border border-slate-700/60 bg-slate-900/40 p-4 space-y-3" aria-label={label}>
      <h3 className="text-sm font-semibold text-slate-100">{label}</h3>
      <ul className="list-disc pl-5 space-y-3 marker:text-pink-300">
        {displayed.map((entry, index) => {
          const state = actionState?.(entry);
          return (
            <li key={entry.id}>
              <textarea
                ref={element => { if (element) fields.current.set(entry.id, element); else fields.current.delete(entry.id); }}
                className="neon-textarea w-full" rows={2}
                aria-label={`${label} item ${index + 1}`} placeholder="Write a bullet point…"
                value={entry.text} disabled={disabled}
                onChange={event => onChange(displayed.map(item => item.id === entry.id ? { ...item, text: event.target.value } : item))}
                onKeyDown={event => {
                  if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                    event.preventDefault();
                    addAfter(index);
                  }
                }}
              />
              <div className="mt-1 flex flex-wrap gap-2">
                {onAction && <>
                  <button type="button" className="neon-action-button" data-size="sm"
                    disabled={disabled || !entry.text.trim() || Boolean(state)}
                    onClick={() => onAction(entry, false)}>{state ? 'In action items' : 'Add to action items'}</button>
                  <button type="button" className="neon-action-button" data-size="sm"
                    disabled={disabled || !entry.text.trim() || state === 'task'}
                    onClick={() => onAction(entry, true)}>{state === 'task' ? 'Task added' : 'Make task now'}</button>
                </>}
                <button type="button" className="neon-action-button" data-size="sm" data-variant="outline"
                  aria-label={`Remove ${label} item ${index + 1}`} disabled={disabled}
                  onClick={() => onChange(displayed.filter(item => item.id !== entry.id))}><Trash2 className="h-3 w-3" /></button>
              </div>
            </li>
          );
        })}
      </ul>
      <button type="button" className="neon-action-button" data-size="sm" disabled={disabled}
        onClick={() => addAfter(displayed.length - 1)}><Plus className="h-3 w-3" /> Add bullet</button>
      <p className="text-[10px] text-slate-400">Enter adds a bullet. Shift + Enter adds a line within it.</p>
    </section>
  );
};
