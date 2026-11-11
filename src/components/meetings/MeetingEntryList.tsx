import React, { useRef, useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import type { MeetingEntry } from '../../types';
import { generateUuid } from '../../utils';

interface Props {
  label: string;
  entries: MeetingEntry[];
  authorId: string;
  onChange: (entries: MeetingEntry[]) => void;
  onAction?: (entry: MeetingEntry, makeTask: boolean) => void;
  actionState?: (entry: MeetingEntry) => 'added' | 'task' | undefined;
}

export const MeetingEntryList: React.FC<Props> = ({ label, entries, authorId, onChange, onAction, actionState }) => {
  const [newId, setNewId] = useState(generateUuid);
  const [editingId, setEditingId] = useState<string>();
  const [cleared, setCleared] = useState(false);
  const input = useRef<HTMLTextAreaElement>(null);
  const activeId = editingId ?? newId;
  const active = entries.find(entry => entry.id === activeId);

  const finish = () => {
    if (cleared || !active?.text.trim()) return;
    if (editingId) setEditingId(undefined);
    else setNewId(generateUuid());
    input.current?.focus();
  };

  const changeText = (text: string) => {
    if (editingId && !text.trim()) {
      setCleared(true);
      return;
    }
    setCleared(false);
    if (active) onChange(entries.map(entry => entry.id === activeId ? { ...entry, text } : entry));
    else if (text) onChange([...entries, { id: activeId, text, authorId }]);
  };

  return (
    <section className="space-y-3 rounded-xl border border-slate-700/60 bg-slate-900/40 p-4" aria-label={label}>
      <h3 className="text-sm font-semibold text-slate-100">{label}</h3>
      <textarea
        ref={input}
        className="neon-textarea w-full"
        rows={2}
        aria-label={`${label} bullet`}
        placeholder="Write a bullet point"
        value={cleared ? '' : active?.text ?? ''}
        onChange={event => changeText(event.target.value)}
        onKeyDown={event => {
          if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault();
            finish();
          }
        }}
      />
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="neon-action-button" data-size="sm" disabled={cleared || !active?.text.trim()} onClick={finish}>
          {!editingId && <Plus className="h-3 w-3" />} {editingId ? 'Done editing' : 'Add bullet'}
        </button>
      </div>
      <ul className="list-disc space-y-2 pl-5 marker:text-pink-300">
        {entries.filter(entry => entry.id !== newId && entry.text.trim()).map(entry => {
          const state = actionState?.(entry);
          return (
            <li key={entry.id} className="border-b border-slate-700/40 pb-2 last:border-0">
              <div className="flex items-start gap-2">
                <span className="min-w-0 flex-1 whitespace-pre-wrap break-words text-sm text-slate-100">{entry.text}</span>
                <button type="button" className="rounded-md p-2 text-violet-200 hover:bg-violet-400/15 focus-visible:outline focus-visible:outline-violet-300"
                  aria-label={`Edit bullet: ${entry.text}`} onClick={() => {
                    if (entries.some(item => item.id === newId && item.text.trim())) setNewId(generateUuid());
                    setCleared(false);
                    setEditingId(entry.id);
                    input.current?.focus();
                  }}><Pencil className="h-4 w-4" /></button>
              </div>
              {onAction && <div className="flex flex-wrap gap-2">
                <button type="button" className="neon-action-button" data-size="sm" data-variant="outline"
                  disabled={Boolean(state)} onClick={() => onAction(entry, false)}>{state ? 'In action items' : 'Add to action items'}</button>
                <button type="button" className="neon-action-button" data-size="sm" data-variant="outline"
                  disabled={state === 'task'} onClick={() => onAction(entry, true)}>{state === 'task' ? 'Task added' : 'Make task now'}</button>
              </div>}
            </li>
          );
        })}
      </ul>
    </section>
  );
};
