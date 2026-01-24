/**
 * RoutineBlock
 * What: small placeholder panel for daily routines.
 * How: drop inside the dashboard to reserve space for routine blocks.
 */
import React, { useMemo, useState } from 'react';
import { CalendarCheck, Pencil } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useRoutines } from '../../hooks/useRoutines';
import type { RoutineBlock as RoutineBlockType } from '../../types';

// 🧩 Routine Block - Reserve space for daily routines
export const RoutineBlock: React.FC = () => {
  const { user } = useAuth();
  const { members, getRoutine, saveRoutine } = useRoutines();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [draftBlocks, setDraftBlocks] = useState<RoutineBlockType[]>([]);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [scrollUnlocked, setScrollUnlocked] = useState(false);
  const [startX, setStartX] = useState<number | null>(null);

  const activeMember = members[activeIndex] ?? user;
  const routine = activeMember ? getRoutine(activeMember.id) : null;
  const blocks = routine?.blocks ?? [];

  const canSwipe = members.length > 1;

  const memberLabel = useMemo(() => {
    if (!activeMember) return 'Routine';
    return activeMember.id === user?.id ? 'My Routine' : `${activeMember.name}'s Routine`;
  }, [activeMember, user?.id]);

  const openEditor = () => {
    if (!activeMember) return;
    setDraftBlocks(blocks.map(block => ({ ...block })));
    setDraftError(null);
    setIsEditing(true);
  };

  const addBlock = () => {
    setDraftBlocks(prev => ([
      ...prev,
      { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, title: '', startTime: '00:00', endTime: '00:00', notes: '', tasks: [] },
    ]));
  };

  const updateBlock = (id: string, updates: Partial<RoutineBlockType>) => {
    setDraftBlocks(prev => prev.map(block => (block.id === id ? { ...block, ...updates } : block)));
  };

  const removeBlock = (id: string) => {
    setDraftBlocks(prev => prev.filter(block => block.id !== id));
  };

  const saveBlocks = () => {
    if (!activeMember) return;
    const result = saveRoutine(activeMember, draftBlocks);
    if (!result.ok) {
      setDraftError(result.error);
      return;
    }
    setDraftError(null);
    setIsEditing(false);
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!canSwipe) return;
    setStartX(event.clientX);
  };

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!canSwipe || startX === null) return;
    const delta = event.clientX - startX;
    if (Math.abs(delta) < 40) {
      setStartX(null);
      return;
    }
    const direction = delta > 0 ? -1 : 1;
    setActiveIndex(prev => {
      const next = prev + direction;
      if (next < 0) return members.length - 1;
      if (next >= members.length) return 0;
      return next;
    });
    setStartX(null);
  };

  return (
    <section className="neon-hype-panel rainbow-crunch-border">
      <div
        className="flex items-center gap-3 mb-3 cursor-pointer"
        onClick={openEditor}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') openEditor();
        }}
      >
        <div className="p-2 rounded-lg bg-slate-800 border border-slate-600">
          <CalendarCheck className="h-5 w-5 text-emerald-300" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-100 tracking-wide">{memberLabel}</h3>
          <p className="text-[10px] text-slate-400 tracking-wide">Tap to edit • Swipe to switch</p>
        </div>
        <button
          className="ml-auto neon-icon-button"
          aria-label="Edit routine"
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            openEditor();
          }}
        >
          <Pencil className="h-4 w-4" />
        </button>
      </div>

      <div
        className="rounded-lg border border-slate-700/60 bg-slate-900/50 p-3 space-y-3"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
      >
        <p className="text-[11px] text-slate-400">
          {members.length > 1 ? 'Swipe left/right to switch family routines.' : 'Build a simple routine in blocks.'}
        </p>
        <div
          className={[
            'space-y-2 rounded-lg border border-slate-700/60 bg-slate-900/70 px-2 py-2',
            scrollUnlocked ? 'max-h-64 overflow-y-auto' : 'max-h-64 overflow-hidden',
          ].join(' ')}
          onClick={() => setScrollUnlocked(true)}
        >
          {blocks.length === 0 && (
            <div className="text-[11px] text-slate-500">No blocks yet. Tap the header to add.</div>
          )}
          {blocks.map(block => (
            <div key={block.id} className="rounded-lg border border-slate-700/60 bg-slate-950/70 px-3 py-2">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-200">
                <span>{block.title}</span>
                <span className="text-slate-400">{block.startTime}–{block.endTime}</span>
              </div>
              {block.notes && <div className="text-[10px] text-slate-400 mt-1">{block.notes}</div>}
              {block.tasks && block.tasks.length > 0 && (
                <ul className="mt-1 text-[10px] text-slate-400 list-disc list-inside">
                  {block.tasks.map((task, index) => (
                    <li key={`${block.id}-task-${index}`}>{task}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
        {!scrollUnlocked && blocks.length > 3 && (
          <div className="text-[10px] text-slate-500">Tap inside to scroll through blocks.</div>
        )}
      </div>

      {isEditing && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-xl rounded-2xl border border-slate-700/60 bg-slate-950 p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-sm font-semibold text-slate-100">Edit Routine Blocks</h4>
                <p className="text-[10px] text-slate-400">Blocks should cover the full 24 hours. Free time auto-fills.</p>
              </div>
              <button className="neon-icon-button" onClick={() => setIsEditing(false)} aria-label="Close routine editor">✕</button>
            </div>

            {draftError && (
              <div className="mb-3 rounded-lg border border-rose-500/40 bg-rose-500/10 p-2 text-[11px] text-rose-200">
                {draftError}
              </div>
            )}

            <div className="space-y-3 max-h-[50vh] overflow-y-auto">
              {draftBlocks.map(block => (
                <div key={block.id} className="rounded-lg border border-slate-800 bg-slate-900/70 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <input
                      className="glow-form-input !text-xs"
                      value={block.title}
                      onChange={(event) => updateBlock(block.id, { title: event.target.value })}
                      placeholder="Block title"
                    />
                    <button
                      className="neon-action-button"
                      data-size="xs"
                      data-variant="outline"
                      type="button"
                      onClick={() => removeBlock(block.id)}
                    >
                      Remove
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-[10px] text-slate-400">
                      Start
                      <input
                        type="text"
                        inputMode="numeric"
                        className="glow-form-input !text-xs mt-1"
                        value={block.startTime}
                        onChange={(event) => updateBlock(block.id, { startTime: event.target.value })}
                        placeholder="HH:MM"
                      />
                    </label>
                    <label className="text-[10px] text-slate-400">
                      End
                      <input
                        type="text"
                        inputMode="numeric"
                        className="glow-form-input !text-xs mt-1"
                        value={block.endTime}
                        onChange={(event) => updateBlock(block.id, { endTime: event.target.value })}
                        placeholder="HH:MM"
                      />
                    </label>
                  </div>
                  <textarea
                    className="neon-textarea !text-xs"
                    rows={2}
                    placeholder="Notes (optional)"
                    value={block.notes || ''}
                    onChange={(event) => updateBlock(block.id, { notes: event.target.value })}
                  />
                  <input
                    className="glow-form-input !text-xs"
                    value={(block.tasks || []).join(', ')}
                    onChange={(event) => updateBlock(block.id, { tasks: event.target.value.split(',').map(task => task.trim()).filter(Boolean) })}
                    placeholder="Tasks (comma separated)"
                  />
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between">
              <button className="neon-action-button" data-size="sm" type="button" onClick={addBlock}>Add block</button>
              <div className="flex items-center gap-2">
                <button className="neon-action-button" data-size="sm" data-variant="outline" type="button" onClick={() => setIsEditing(false)}>
                  Cancel
                </button>
                <button className="neon-action-button" data-size="sm" type="button" onClick={saveBlocks}>
                  Save routine
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
