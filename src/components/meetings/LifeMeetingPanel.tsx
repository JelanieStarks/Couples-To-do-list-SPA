import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, ChevronDown, HeartHandshake, Plus, Printer, Save } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTask } from '../../contexts/TaskContext';
import { useLifeMeetings } from '../../hooks/useLifeMeetings';
import { mergeLifeMeeting } from '../../data/mergeLifeMeeting';
import type {
  Assignment,
  LifeMeeting,
  MeetingActionItem,
  MeetingEnergy,
  MeetingEntry,
  MeetingGoal,
  MeetingCheckIn,
  MeetingMood,
  MeetingStatus,
  Priority,
} from '../../types';
import { generateUuid } from '../../utils';
import { printDocument } from '../../utils/printDocument';
import { MeetingEntryList } from './MeetingEntryList';
import { MeetingGoals } from './MeetingGoals';
import { registerDraftFlusher } from '../../utils/draftPersistence';
import { storage } from '../../utils';

const moods: MeetingMood[] = ['??', '??', '??'];
const energies: MeetingEnergy[] = ['low', 'medium', 'high'];

const getMeetingTitle = (meeting: LifeMeeting) => meeting.title?.trim() || `Life Meeting � ${meeting.meetingDate}`;

const escapeHtml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const formatEntries = (entries: MeetingEntry[]) => entries.length
  ? `<ul>${entries.map(entry => `<li>${escapeHtml(entry.text)}</li>`).join('')}</ul>`
  : '<p class="muted">None recorded.</p>';

const formatGoals = (goals: MeetingGoal[]) => goals.length
  ? `<ul>${goals.map(goal => `<li><strong>${escapeHtml(goal.title)}</strong>${goal.steps.length
    ? `<ul>${goal.steps.map(step => `<li>${step.done ? '� ' : ''}${escapeHtml(step.text)}</li>`).join('')}</ul>`
    : ''}</li>`).join('')}</ul>`
  : '<p class="muted">None recorded.</p>';

interface DraftBackup {
  draft: LifeMeeting;
  base: LifeMeeting | null;
}

export const LifeMeetingPanel: React.FC = () => {
  const { user, partner } = useAuth();
  const { createTask, tasks } = useTask();
  const converting = useRef(new Set<string>());
  const { meetings, isLoading, error, createMeeting, saveMeeting, remoteEnabled } = useLifeMeetings();
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState<LifeMeeting | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [printError, setPrintError] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const draftRef = useRef(draft);
  const baseRef = useRef<LifeMeeting | null>(null);
  const dirtyRef = useRef(dirty);
  const revision = useRef(0);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const saveRef = useRef<() => Promise<void>>(async () => {});
  draftRef.current = draft;
  dirtyRef.current = dirty;
  const backupKey = `couples-meeting-draft:${user?.householdId || 'local'}:${user?.id || 'guest'}`;

  useEffect(() => {
    const pending = storage.get<LifeMeeting | DraftBackup>(backupKey);
    if (pending && user && !draftRef.current) {
      const recovered = 'draft' in pending ? pending : { draft: pending, base: null };
      revision.current++;
      baseRef.current = recovered.base;
      draftRef.current = recovered.draft;
      dirtyRef.current = true;
      setDraft(recovered.draft);
      setDirty(true);
    }
  }, [backupKey, user?.id]);

  useEffect(() => {
    if (!draft || !dirty) return;
    const timer = window.setTimeout(() => { void saveRef.current().catch(() => {}); }, 1000);
    return () => window.clearTimeout(timer);
  }, [draft, dirty]);

  useEffect(() => registerDraftFlusher(() => dirtyRef.current ? saveRef.current() : undefined), []);
  useEffect(() => {
    const retry = () => { if (dirtyRef.current) void saveRef.current().catch(() => {}); };
    const retryTimer = window.setInterval(retry, 15000);
    window.addEventListener('online', retry);
    window.addEventListener('focus', retry);
    return () => { window.clearInterval(retryTimer); window.removeEventListener('online', retry); window.removeEventListener('focus', retry); };
  }, []);


  useEffect(() => {
    if (!draft && meetings[0]) {
      baseRef.current = meetings[0];
      setDraft(meetings[0]);
    }
  }, [draft, meetings]);

  useEffect(() => {
    if (!draft || dirty) return;
    const refreshed = meetings.find(meeting => meeting.id === draft.id);
    if (refreshed && (refreshed.updatedAt !== draft.updatedAt || refreshed.syncRevision !== draft.syncRevision)) {
      baseRef.current = refreshed;
      setDraft(refreshed);
    }
  }, [dirty, draft, meetings]);

  const myCheckIn = useMemo<MeetingCheckIn>(() => {
    const fallback: MeetingCheckIn = { mood: '??', energy: 'medium', supportNeed: '' };
    if (!user) return fallback;
    return draft?.checkIn[user.id] ?? fallback;
  }, [draft, user]);

  const updateDraft = (updates: Partial<LifeMeeting>) => {
    const current = draftRef.current;
    if (!current) return;
    const next = { ...current, ...updates };
    draftRef.current = next;
    dirtyRef.current = true;
    revision.current++;
    storage.set(backupKey, { draft: next, base: baseRef.current });
    setDraft(next);
    setDirty(true);
    setSavedFlash(false);
  };

  const updateMyCheckIn = (updates: Partial<typeof myCheckIn>) => {
    if (!draft || !user) return;
    updateDraft({
      checkIn: {
        ...draft.checkIn,
        [user.id]: { ...myCheckIn, ...updates },
      },
    });
  };

  const finishPendingMeeting = async () => {
    if (!dirtyRef.current) return true;
    try {
      await saveRef.current();
      return !dirtyRef.current;
    } catch {
      return false;
    }
  };

  const startMeeting = async () => {
    if (!await finishPendingMeeting()) return;
    const meeting = createMeeting();
    if (!meeting) return;
    revision.current++;
    baseRef.current = null;
    draftRef.current = meeting;
    dirtyRef.current = true;
    storage.set(backupKey, { draft: meeting, base: null });
    setDraft(meeting);
    setDirty(true);
    setIsOpen(true);
  };

  const selectMeeting = async (id: string) => {
    const selected = meetings.find(meeting => meeting.id === id);
    if (!selected || !await finishPendingMeeting()) return;
    revision.current++;
    baseRef.current = selected;
    draftRef.current = selected;
    setDraft(selected);
    setDirty(false);
    setSavedFlash(false);
  };

  const printMeeting = async () => {
    if (!draft || !user || printing) return;
    setPrintError(null);
    setPrinting(true);
    const actionItems = draft.actionItems.length
      ? `<ul>${draft.actionItems.map(item => `<li><strong>${escapeHtml(item.title || 'Untitled task')}</strong> � ${escapeHtml(item.assignment)} � ${escapeHtml(item.priority)}${item.convertedAt ? ' � Added to planner' : ''}</li>`).join('')}</ul>`
      : '<p class="muted">No associated tasks.</p>';
    const checkIns = Object.entries(draft.checkIn).map(([authorId, checkIn]) => (
      `<li><strong>${escapeHtml(authorId === user.id ? user.name : partner?.name || 'Partner')}</strong>: ${escapeHtml(checkIn.mood)} � ${escapeHtml(checkIn.energy)}${checkIn.supportNeed ? ` � ${escapeHtml(checkIn.supportNeed)}` : ''}</li>`
    )).join('');
    const html = `<!doctype html><html><head><title>${escapeHtml(getMeetingTitle(draft))}</title><style>
      :root{color-scheme:light}*{box-sizing:border-box}body{margin:0;background:#f4f7fb;color:#182235;font:15px/1.6 Georgia,serif}main{max-width:820px;margin:0 auto;background:#fff;padding:48px 56px;min-height:100vh}h1{margin:0 0 4px;font:700 32px/1.15 Georgia,serif;color:#172554}h2{margin:28px 0 8px;padding-bottom:4px;border-bottom:1px solid #dbe3ef;font:700 18px/1.3 Georgia,serif;color:#334155}.meta{color:#64748b;font:14px/1.5 Arial,sans-serif}.muted{color:#64748b;font-style:italic}ul{padding-left:24px}li{margin:4px 0}.intro{margin:24px 0;padding:14px 18px;border-left:4px solid #ec4899;background:#fdf2f8}@media print{body{background:#fff}main{max-width:none;padding:0;min-height:auto}h2{break-after:avoid}.section{break-inside:avoid}}@media(max-width:600px){main{padding:28px 22px}h1{font-size:26px}}
    </style></head><body><main><h1>${escapeHtml(getMeetingTitle(draft))}</h1><div class="meta">${escapeHtml(draft.meetingDate)} � ${escapeHtml(draft.status)}</div><div class="intro">Life Meeting notes and next steps</div><section class="section"><h2>Check-ins</h2>${checkIns ? `<ul>${checkIns}</ul>` : '<p class="muted">None recorded.</p>'}</section><section class="section"><h2>Gratitude</h2>${formatEntries(draft.gratitude)}</section><section class="section"><h2>Agenda</h2>${formatEntries(draft.agenda)}</section><section class="section"><h2>Decisions</h2>${formatEntries(draft.decisions)}</section><section class="section"><h2>Associated Tasks</h2>${actionItems}</section><section class="section"><h2>Shared Notes</h2><p>${escapeHtml(draft.notes || 'None recorded.').replace(/\n/g, '<br>')}</p></section></main></body></html>`;
    try {
      const goals = draft.goals ?? [];
      const goalSections = `<section class="section"><h2>Short-term Goals</h2>${formatGoals(goals.filter(goal => goal.term === 'short'))}</section><section class="section"><h2>Long-term Goals</h2>${formatGoals(goals.filter(goal => goal.term === 'long'))}</section>`;
      await printDocument(html.replace('<section class="section"><h2>Shared Notes</h2>', goalSections + '<section class="section"><h2>Shared Notes</h2>'));
    } catch (error) {
      setPrintError((error as Error).message);
    } finally {
      setPrinting(false);
    }
  };

  const save = (): Promise<void> => {
    const operation = saveQueue.current.then(async () => {
      const nextDraft = draftRef.current;
      if (!nextDraft || !dirtyRef.current) return;
      const savedRevision = revision.current;
      setSaving(true);
      setActionError(null);
      try {
        const saved = await saveMeeting(nextDraft, baseRef.current);
        const latest = draftRef.current;
        if (latest?.id === nextDraft.id) {
          baseRef.current = saved;
          if (revision.current === savedRevision) {
            draftRef.current = saved;
            dirtyRef.current = false;
            setDraft(saved);
            setDirty(false);
            storage.remove(backupKey);
          } else {
            const rebased = mergeLifeMeeting(nextDraft, latest, saved);
            draftRef.current = rebased;
            storage.set(backupKey, { draft: rebased, base: saved });
            setDraft(rebased);
          }
        }
        setSavedFlash(true);
        window.setTimeout(() => setSavedFlash(false), 1600);
      } catch (error) {
        setActionError(`Meeting changes are pending: ${(error as Error).message}`);
        throw error;
      } finally { setSaving(false); }
    });
    saveQueue.current = operation.catch(() => {});
    return operation;
  };
  saveRef.current = save;

  const addActionItem = () => {
    if (!draft) return;
    const action: MeetingActionItem = {
      id: generateUuid(),
      title: '',
      assignment: 'both',
      priority: 'B2',
    };
    updateDraft({ actionItems: [...draft.actionItems, action] });
  };

  const updateActionItem = (id: string, updates: Partial<MeetingActionItem>) => {
    if (!draft) return;
    updateDraft({
      actionItems: draft.actionItems.map(item => item.id === id ? { ...item, ...updates } : item),
    });
  };

  const updateGoal = (goal: MeetingGoal) => {
    const goals = draftRef.current?.goals ?? [];
    updateDraft({
      goals: goals.some(item => item.id === goal.id)
        ? goals.map(item => item.id === goal.id ? goal : item)
        : [...goals, goal],
    });
  };

  const plannerTaskId = (item: MeetingActionItem) => `meeting-${draft?.id}-${item.id}`;

  const convertActionItem = async (item: MeetingActionItem, meeting = draft) => {
    if (!meeting || !user || !item.title.trim() || item.convertedAt || converting.current.has(item.id)) return;
    converting.current.add(item.id);
    setActionError(null);
    try {
      const taskId = `meeting-${meeting.id}-${item.id}`;
      // A stable ID makes retries (including a failed meeting save) idempotent.
      if (!tasks.some(task => task.id === taskId)) createTask({
        title: item.title.trim(),
        description: `Created from Life Meeting on ${meeting.meetingDate}`,
        priority: item.priority,
        assignment: item.assignment,
        color: item.assignment === 'me' ? user.color : item.assignment === 'partner' ? (partner?.color ?? '#3b82f6') : '#8b5cf6',
        completed: false,
        scheduledDate: meeting.meetingDate,
      }, taskId);
      const current = draftRef.current;
      if (current?.id !== meeting.id) return;
      updateDraft({
        actionItems: current.actionItems.map(action => action.id === item.id
          ? { ...action, convertedAt: new Date().toISOString() }
          : action),
      });
      await save();
    } catch (error) {
      setActionError((error as Error).message);
    } finally {
      converting.current.delete(item.id);
    }
  };

  const entryActionId = (section: 'agenda' | 'decisions', entry: MeetingEntry) => `${section}-${entry.id}`;
  const sendEntryToAction = async (section: 'agenda' | 'decisions', entry: MeetingEntry, makeTask: boolean) => {
    const current = draftRef.current;
    if (!current || !entry.text.trim()) return;
    const id = entryActionId(section, entry);
    const existing = current.actionItems.find(item => item.id === id);
    const item = existing ?? { id, title: entry.text.trim(), assignment: 'both' as const, priority: 'B2' as const };
    if (!existing) updateDraft({ actionItems: [...current.actionItems, item] });
    if (makeTask) await convertActionItem(item, current);
  };

  if (!user) return null;

  const partnerCheckIn = partner && draft
    ? (meetings.find(meeting => meeting.id === draft.id)?.checkIn[partner.id] ?? draft.checkIn[partner.id])
    : undefined;

  return (
    <section className="neon-hype-panel rainbow-crunch-border" data-testid="life-meeting-panel"
      onBlurCapture={() => { if (dirtyRef.current) void saveRef.current().catch(() => {}); }}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
          type="button"
          className="flex items-center gap-3 text-left"
          onClick={() => setIsOpen(open => !open)}
          aria-expanded={isOpen}
        >
          <HeartHandshake className="h-6 w-6 text-pink-400" />
          <span>
            <span className="block text-lg font-semibold text-slate-100">Life Meeting</span>
            <span className="block text-xs text-slate-400">Check in, make decisions, and leave with clear next steps.</span>
          </span>
        </button>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] ${remoteEnabled ? 'text-emerald-300' : 'text-amber-300'}`}>
            {remoteEnabled ? 'Household sync on' : 'Saved on this device'}
          </span>
          <button type="button" className="neon-action-button" data-size="sm" onClick={() => void startMeeting()}>
            <Plus className="h-4 w-4" /> New
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="mt-5 space-y-5" data-testid="life-meeting-editor">
          {error && <div className="rounded-lg border border-rose-500/40 bg-rose-950/40 p-3 text-xs text-rose-200">{error}</div>}
          {printError && <div role="alert" className="text-sm text-rose-200">{printError}</div>}
          {isLoading && <div className="text-sm text-slate-400">Loading your meetings.</div>}

          <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
            <label className="text-xs text-slate-300">
              Meeting
              <div className="relative mt-1">
                <input
                  className={`glow-form-input ${meetings.filter(meeting => meeting.id !== draft?.id).length ? 'pr-12' : ''}`}
                  value={draft ? getMeetingTitle(draft) : ''}
                  placeholder="Life Meeting name"
                  onChange={event => updateDraft({ title: event.target.value })}
                  disabled={!draft}
                  data-testid="life-meeting-title"
                />
                {meetings.filter(meeting => meeting.id !== draft?.id).length > 0 && (
                  <>
                    <select
                      aria-label="Select another Life Meeting"
                      className="life-meeting-selector select-neon absolute right-1 top-1/2 h-9 w-10 -translate-y-1/2 cursor-pointer appearance-none border-0 bg-transparent !p-0 text-transparent shadow-none"
                      value=""
                      onChange={event => void selectMeeting(event.target.value)}
                      data-testid="life-meeting-selector"
                    >
                      <option value="">Select meeting</option>
                      {meetings.filter(meeting => meeting.id !== draft?.id).map(meeting => (
                        <option key={meeting.id} value={meeting.id}>{getMeetingTitle(meeting)} � {meeting.meetingDate}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300" aria-hidden="true" />
                  </>
                )}
              </div>
            </label>
            <label className="text-xs text-slate-300">
              Date
              <input
                type="date"
                className="glow-form-input mt-1"
                value={draft?.meetingDate ?? ''}
                onChange={event => updateDraft({ meetingDate: event.target.value })}
                disabled={!draft}
              />
            </label>
            <label className="text-xs text-slate-300">
              Status
              <select
                className="glow-form-input mt-1"
                value={draft?.status ?? 'draft'}
                onChange={event => updateDraft({ status: event.target.value as MeetingStatus })}
                disabled={!draft}
              >
                <option value="draft">Draft</option>
                <option value="active">In progress</option>
                <option value="completed">Completed</option>
              </select>
            </label>
          </div>

          {!draft ? (
            <button type="button" className="neon-action-button" onClick={() => void startMeeting()}>Start our first meeting</button>
          ) : (
            <>
              <div className="rounded-xl border border-slate-700/60 bg-slate-900/40 p-4 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">{user.name}&apos;s check in</h3>
                  {partner && <p className="text-[10px] text-slate-400">{partner.name} can add their own check in from their account.</p>}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <div className="text-xs text-slate-300 mb-2">Mood</div>
                    <div className="flex gap-2">
                      {moods.map(mood => (
                        <button key={mood} type="button" className="neon-action-button" data-size="sm" data-variant={myCheckIn.mood === mood ? undefined : 'outline'} onClick={() => updateMyCheckIn({ mood })}>{mood}</button>
                      ))}
                    </div>
                  </div>
                  <label className="text-xs text-slate-300">
                    Energy
                    <select className="glow-form-input mt-1" value={myCheckIn.energy} onChange={event => updateMyCheckIn({ energy: event.target.value as MeetingEnergy })}>
                      {energies.map(energy => <option key={energy} value={energy}>{energy[0].toUpperCase() + energy.slice(1)}</option>)}
                    </select>
                  </label>
                </div>
                <label className="text-xs text-slate-300 block">
                  How can my spouse serve me this week?
                  <textarea className="neon-textarea mt-1" rows={2} value={myCheckIn.supportNeed} onChange={event => updateMyCheckIn({ supportNeed: event.target.value })} />
                </label>
                {partner && (
                  <aside className="rounded-xl border border-pink-400/25 bg-gradient-to-br from-pink-500/15 via-violet-500/10 to-slate-950/50 p-4 sm:p-5"
                    aria-label="Your spouse's check-in request">
                    <div className="flex items-center gap-2 text-sm font-semibold text-pink-200">
                      <HeartHandshake className="h-5 w-5" aria-hidden="true" />
                      How you can show up for {partner.name || 'your spouse'} this week
                    </div>
                    <p className="mt-2 whitespace-pre-wrap break-words text-base leading-relaxed text-slate-100" aria-live="polite">
                      {partnerCheckIn?.supportNeed?.trim() || 'Their request will appear here when they add it.'}
                    </p>
                  </aside>
                )}
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                {([
                  ['gratitude', 'What I am thankful for'],
                  ['agenda', 'What we should discuss'],
                  ['decisions', 'What we decided'],
                ] as const).map(([key, label]) => (
                  <MeetingEntryList key={`${draft.id}-${key}`}
                    label={label} entries={draft[key]} authorId={user.id}
                    onChange={entries => updateDraft({ [key]: entries })}
                    onAction={key === 'gratitude' ? undefined : (entry, makeTask) => void sendEntryToAction(key, entry, makeTask)}
                    actionState={key === 'gratitude' ? undefined : entry => {
                      const action = draft.actionItems.find(item => item.id === entryActionId(key, entry));
                      return action?.convertedAt || (action && tasks.some(task => task.id === plannerTaskId(action))) ? 'task' : action ? 'added' : undefined;
                    }}
                  />
                ))}
              </div>

              <div id="life-meeting-actions" className="rounded-xl border border-slate-700/60 bg-slate-900/40 p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-100">Action items</h3>
                    <p className="text-[10px] text-slate-400">Turn decisions into planner tasks before the meeting ends.</p>
                  </div>
                  <button type="button" className="neon-action-button" data-size="sm" onClick={addActionItem}><Plus className="h-4 w-4" /> Add</button>
                </div>
                {actionError && <p role="alert" className="text-sm text-rose-200">{actionError}</p>}
                {draft.actionItems.map(item => (
                  <div key={item.id} className="grid gap-2 md:grid-cols-[1fr_120px_90px_auto]">
                    <input className="glow-form-input" placeholder="Next step" value={item.title} onChange={event => updateActionItem(item.id, { title: event.target.value })} />
                    <select className="glow-form-input" value={item.assignment} onChange={event => updateActionItem(item.id, { assignment: event.target.value as Assignment })}>
                      <option value="me">Me</option>
                      <option value="partner">Partner</option>
                      <option value="both">Both</option>
                    </select>
                    <select className="glow-form-input" value={item.priority} onChange={event => updateActionItem(item.id, { priority: event.target.value as Priority })}>
                      {['A1','A2','A3','B1','B2','B3','C1','C2','C3','D'].map(priority => <option key={priority}>{priority}</option>)}
                    </select>
                    <button type="button" className="neon-action-button" data-size="sm" disabled={saving || !item.title.trim() || Boolean(item.convertedAt) || tasks.some(task => task.id === plannerTaskId(item))} onClick={() => void convertActionItem(item)}>
                      {item.convertedAt || tasks.some(task => task.id === plannerTaskId(item)) ? <><CheckCircle2 className="h-4 w-4" /> Added</> : 'Make task'}
                    </button>
                  </div>
                ))}
                {!draft.actionItems.length && <p className="text-xs text-slate-500">No action items yet.</p>}
              </div>

              <MeetingGoals key={draft.id} goals={draft.goals ?? []} onChange={updateGoal} />

              <label className="text-xs text-slate-300 block">
                Shared notes
                <textarea className="neon-textarea mt-1" rows={5} value={draft.notes} onChange={event => updateDraft({ notes: event.target.value })} />
              </label>

              <p className="text-[11px] text-slate-400">{saving ? 'Saving meeting.' : dirty ? 'Changes are saved automatically after you finish typing.' : 'Autosave on'}</p>
              <div className="flex items-center justify-end gap-3 flex-wrap">
                {savedFlash && <span className="text-xs text-emerald-300">{remoteEnabled ? "Meeting saved to database." : "Meeting saved on this device."}</span>}
                <button type="button" className="neon-action-button" data-size="sm" disabled={printing} onClick={() => void printMeeting()} data-testid="print-life-meeting">
                  <Printer className="h-4 w-4" /> Print / Export
                </button>
                <button type="button" className="neon-action-button" disabled={saving || !dirty} onClick={() => { void save().catch(() => {}); }}>
                  <Save className="h-4 w-4" /> {saving ? 'Saving.' : 'Save meeting'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
};

