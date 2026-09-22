import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, HeartHandshake, Plus, Printer, Save } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTask } from '../../contexts/TaskContext';
import { useLifeMeetings } from '../../hooks/useLifeMeetings';
import type {
  Assignment,
  LifeMeeting,
  MeetingActionItem,
  MeetingEnergy,
  MeetingEntry,
  MeetingCheckIn,
  MeetingMood,
  MeetingStatus,
  Priority,
} from '../../types';
import { generateUuid } from '../../utils';

const moods: MeetingMood[] = ['🙂', '😐', '😣'];
const energies: MeetingEnergy[] = ['low', 'medium', 'high'];

const entriesToText = (entries: MeetingEntry[]) => entries.map(entry => entry.text).join('\n');

const textToEntries = (text: string, existing: MeetingEntry[], authorId: string): MeetingEntry[] => (
  text.split('\n').map(line => line.trim()).filter(Boolean).map((line, index) => ({
    id: existing[index]?.id ?? generateUuid(),
    text: line,
    authorId: existing[index]?.authorId ?? authorId,
  }))
);

const getMeetingTitle = (meeting: LifeMeeting) => meeting.title?.trim() || `Life Meeting · ${meeting.meetingDate}`;

const escapeHtml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const formatEntries = (entries: MeetingEntry[]) => entries.length
  ? `<ul>${entries.map(entry => `<li>${escapeHtml(entry.text)}</li>`).join('')}</ul>`
  : '<p class="muted">None recorded.</p>';

export const LifeMeetingPanel: React.FC = () => {
  const { user, partner } = useAuth();
  const { createTask } = useTask();
  const { meetings, isLoading, error, createMeeting, saveMeeting, remoteEnabled } = useLifeMeetings();
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState<LifeMeeting | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    if (!draft && meetings[0]) setDraft(meetings[0]);
  }, [draft, meetings]);

  useEffect(() => {
    if (!draft || dirty) return;
    const refreshed = meetings.find(meeting => meeting.id === draft.id);
    if (refreshed && refreshed.updatedAt !== draft.updatedAt) setDraft(refreshed);
  }, [dirty, draft, meetings]);

  const myCheckIn = useMemo<MeetingCheckIn>(() => {
    const fallback: MeetingCheckIn = { mood: '😐', energy: 'medium', supportNeed: '' };
    if (!user) return fallback;
    return draft?.checkIn[user.id] ?? fallback;
  }, [draft, user]);

  const updateDraft = (updates: Partial<LifeMeeting>) => {
    setDraft(current => current ? { ...current, ...updates } : current);
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

  const startMeeting = () => {
    const meeting = createMeeting();
    if (!meeting) return;
    setDraft(meeting);
    setDirty(true);
    setIsOpen(true);
  };

  const selectMeeting = (id: string) => {
    const selected = meetings.find(meeting => meeting.id === id);
    if (!selected) return;
    setDraft(selected);
    setDirty(false);
    setSavedFlash(false);
  };

  const printMeeting = () => {
    if (!draft) return;
    const printWindow = window.open('', '_blank', 'noopener,noreferrer');
    if (!printWindow) return;
    const actionItems = draft.actionItems.length
      ? `<ul>${draft.actionItems.map(item => `<li><strong>${escapeHtml(item.title || 'Untitled task')}</strong> · ${escapeHtml(item.assignment)} · ${escapeHtml(item.priority)}${item.convertedAt ? ' · Added to planner' : ''}</li>`).join('')}</ul>`
      : '<p class="muted">No associated tasks.</p>';
    const checkIns = Object.entries(draft.checkIn).map(([authorId, checkIn]) => (
      `<li><strong>${escapeHtml(authorId === user.id ? user.name : partner?.name || 'Partner')}</strong>: ${escapeHtml(checkIn.mood)} · ${escapeHtml(checkIn.energy)}${checkIn.supportNeed ? ` · ${escapeHtml(checkIn.supportNeed)}` : ''}</li>`
    )).join('');
    printWindow.document.write(`<!doctype html><html><head><title>${escapeHtml(getMeetingTitle(draft))}</title><style>
      :root{color-scheme:light}*{box-sizing:border-box}body{margin:0;background:#f4f7fb;color:#182235;font:15px/1.6 Georgia,serif}main{max-width:820px;margin:0 auto;background:#fff;padding:48px 56px;min-height:100vh}h1{margin:0 0 4px;font:700 32px/1.15 Georgia,serif;color:#172554}h2{margin:28px 0 8px;padding-bottom:4px;border-bottom:1px solid #dbe3ef;font:700 18px/1.3 Georgia,serif;color:#334155}.meta{color:#64748b;font:14px/1.5 Arial,sans-serif}.muted{color:#64748b;font-style:italic}ul{padding-left:24px}li{margin:4px 0}.intro{margin:24px 0;padding:14px 18px;border-left:4px solid #ec4899;background:#fdf2f8}@media print{body{background:#fff}main{max-width:none;padding:0;min-height:auto}h2{break-after:avoid}.section{break-inside:avoid}}@media(max-width:600px){main{padding:28px 22px}h1{font-size:26px}}
    </style></head><body><main><h1>${escapeHtml(getMeetingTitle(draft))}</h1><div class="meta">${escapeHtml(draft.meetingDate)} · ${escapeHtml(draft.status)}</div><div class="intro">Life Meeting notes and next steps</div><section class="section"><h2>Check-ins</h2>${checkIns ? `<ul>${checkIns}</ul>` : '<p class="muted">None recorded.</p>'}</section><section class="section"><h2>Gratitude</h2>${formatEntries(draft.gratitude)}</section><section class="section"><h2>Agenda</h2>${formatEntries(draft.agenda)}</section><section class="section"><h2>Decisions</h2>${formatEntries(draft.decisions)}</section><section class="section"><h2>Associated Tasks</h2>${actionItems}</section><section class="section"><h2>Shared Notes</h2><p>${escapeHtml(draft.notes || 'None recorded.').replace(/\n/g, '<br>')}</p></section></main></body></html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.setTimeout(() => printWindow.print(), 250);
  };

  const save = async (nextDraft = draft) => {
    if (!nextDraft) return;
    setSaving(true);
    try {
      const saved = await saveMeeting(nextDraft);
      setDraft(saved);
      setDirty(false);
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 1600);
    } finally {
      setSaving(false);
    }
  };

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

  const convertActionItem = async (item: MeetingActionItem) => {
    if (!draft || !user || !item.title.trim() || item.convertedAt) return;
    createTask({
      title: item.title.trim(),
      description: `Created from Life Meeting on ${draft.meetingDate}`,
      priority: item.priority,
      assignment: item.assignment,
      color: item.assignment === 'me' ? user.color : item.assignment === 'partner' ? (partner?.color ?? '#3b82f6') : '#8b5cf6',
      completed: false,
      scheduledDate: draft.meetingDate,
    });
    const updated = {
      ...draft,
      actionItems: draft.actionItems.map(action => action.id === item.id
        ? { ...action, convertedAt: new Date().toISOString() }
        : action),
    };
    setDraft(updated);
    setDirty(true);
    await save(updated);
  };

  if (!user) return null;

  return (
    <section className="neon-hype-panel rainbow-crunch-border" data-testid="life-meeting-panel">
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
          <button type="button" className="neon-action-button" data-size="sm" onClick={startMeeting}>
            <Plus className="h-4 w-4" /> New
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="mt-5 space-y-5" data-testid="life-meeting-editor">
          {error && <div className="rounded-lg border border-rose-500/40 bg-rose-950/40 p-3 text-xs text-rose-200">{error}</div>}
          {isLoading && <div className="text-sm text-slate-400">Loading your meetings…</div>}

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
                  <select
                    aria-label="Select another Life Meeting"
                    className="absolute right-1 top-1/2 h-9 w-10 -translate-y-1/2 cursor-pointer appearance-none bg-transparent text-slate-300"
                    value=""
                    onChange={event => selectMeeting(event.target.value)}
                    data-testid="life-meeting-selector"
                  >
                    <option value="">⌄</option>
                    {meetings.filter(meeting => meeting.id !== draft?.id).map(meeting => (
                      <option key={meeting.id} value={meeting.id}>{getMeetingTitle(meeting)} · {meeting.meetingDate}</option>
                    ))}
                  </select>
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
            <button type="button" className="neon-action-button" onClick={startMeeting}>Start our first meeting</button>
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
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                {([
                  ['gratitude', 'What I am thankful for'],
                  ['agenda', 'What we should discuss'],
                  ['decisions', 'What we decided'],
                ] as const).map(([key, label]) => (
                  <label key={key} className="text-xs text-slate-300">
                    {label}
                    <textarea
                      className="neon-textarea mt-1"
                      rows={6}
                      placeholder="One item per line"
                      value={entriesToText(draft[key])}
                      onChange={event => updateDraft({ [key]: textToEntries(event.target.value, draft[key], user.id) })}
                    />
                  </label>
                ))}
              </div>

              <div className="rounded-xl border border-slate-700/60 bg-slate-900/40 p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-100">Action items</h3>
                    <p className="text-[10px] text-slate-400">Turn decisions into planner tasks before the meeting ends.</p>
                  </div>
                  <button type="button" className="neon-action-button" data-size="sm" onClick={addActionItem}><Plus className="h-4 w-4" /> Add</button>
                </div>
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
                    <button type="button" className="neon-action-button" data-size="sm" disabled={!item.title.trim() || Boolean(item.convertedAt)} onClick={() => void convertActionItem(item)}>
                      {item.convertedAt ? <><CheckCircle2 className="h-4 w-4" /> Added</> : 'Make task'}
                    </button>
                  </div>
                ))}
                {!draft.actionItems.length && <p className="text-xs text-slate-500">No action items yet.</p>}
              </div>

              <label className="text-xs text-slate-300 block">
                Shared notes
                <textarea className="neon-textarea mt-1" rows={5} value={draft.notes} onChange={event => updateDraft({ notes: event.target.value })} />
              </label>

              <div className="flex items-center justify-end gap-3 flex-wrap">
                {savedFlash && <span className="text-xs text-emerald-300">Saved and synced.</span>}
                <button type="button" className="neon-action-button" data-size="sm" onClick={printMeeting} data-testid="print-life-meeting">
                  <Printer className="h-4 w-4" /> Print / Export
                </button>
                <button type="button" className="neon-action-button" disabled={saving || !dirty} onClick={() => void save()}>
                  <Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save meeting'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
};
