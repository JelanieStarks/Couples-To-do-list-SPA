import type { LifeMeeting, MeetingCheckIn, MeetingGoal } from '../types';

const changed = <T>(base: T, draft: T, current: T): T =>
  draft === base ? current : draft;

// Keep both contributions when two people edit the same text before either save arrives.
const mergeText = (base = '', draft = '', current = ''): string => {
  if (draft === base) return current;
  if (current === base || draft === current) return draft;
  if (!draft.trim()) return current;
  if (!current.trim()) return draft;
  if (draft.startsWith(current)) return draft;
  if (current.startsWith(draft)) return current;
  const prefix = base && draft.startsWith(base) && current.startsWith(base) ? base : '';
  return [current.trimEnd(), draft.slice(prefix.length).trimStart()].join('\n\n');
};

function mergeItems<T extends { id: string }>(
  base: T[], draft: T[], current: T[], mergeItem: (base: T | undefined, draft: T, current: T) => T,
): T[] {
  const baseById = new Map(base.map(item => [item.id, item]));
  const items = new Map(current.map(item => [item.id, item]));
  for (const item of draft) {
    const original = baseById.get(item.id);
    const saved = items.get(item.id);
    if (saved) items.set(item.id, mergeItem(original, item, saved));
    else items.set(item.id, item);
  }
  return [...items.values()];
}

function mergeCheckIn(base: MeetingCheckIn | undefined, draft: MeetingCheckIn, current: MeetingCheckIn): MeetingCheckIn {
  return {
    mood: changed(base?.mood, draft.mood, current.mood) ?? current.mood,
    energy: changed(base?.energy, draft.energy, current.energy) ?? current.energy,
    supportNeed: mergeText(base?.supportNeed, draft.supportNeed, current.supportNeed),
  };
}

export function mergeLifeMeeting(base: LifeMeeting | null, draft: LifeMeeting, current: LifeMeeting): LifeMeeting {
  const checkIn = { ...current.checkIn };
  for (const [authorId, entry] of Object.entries(draft.checkIn)) {
    const saved = checkIn[authorId];
    checkIn[authorId] = saved ? mergeCheckIn(base?.checkIn[authorId], entry, saved) : entry;
  }
  const mergeEntries = (field: 'gratitude' | 'agenda' | 'decisions') =>
    mergeItems(base?.[field] ?? [], draft[field], current[field], (original, entry, saved) => ({
      ...saved, text: mergeText(original?.text, entry.text, saved.text),
    }));
  const mergeGoal = (original: MeetingGoal | undefined, goal: MeetingGoal, saved: MeetingGoal): MeetingGoal => ({
    ...saved,
    title: mergeText(original?.title, goal.title, saved.title),
    term: changed(original?.term, goal.term, saved.term) ?? saved.term,
    steps: mergeItems(original?.steps ?? [], goal.steps, saved.steps, (before, step, currentStep) => ({
      ...currentStep,
      text: mergeText(before?.text, step.text, currentStep.text),
      done: changed(before?.done, step.done, currentStep.done) ?? currentStep.done,
    })),
  });
  return {
    ...current,
    title: base ? changed(base.title, draft.title, current.title) : current.title || draft.title,
    meetingDate: base ? changed(base.meetingDate, draft.meetingDate, current.meetingDate) : current.meetingDate,
    status: base ? changed(base.status, draft.status, current.status) : current.status,
    checkIn,
    gratitude: mergeEntries('gratitude'),
    agenda: mergeEntries('agenda'),
    decisions: mergeEntries('decisions'),
    actionItems: mergeItems(base?.actionItems ?? [], draft.actionItems, current.actionItems, (original, item, saved) => ({
      ...saved,
      title: mergeText(original?.title, item.title, saved.title),
      assignment: original ? changed(original.assignment, item.assignment, saved.assignment) : saved.assignment,
      priority: original ? changed(original.priority, item.priority, saved.priority) : saved.priority,
      convertedAt: saved.convertedAt ?? item.convertedAt,
    })),
    goals: mergeItems(base?.goals ?? [], draft.goals ?? [], current.goals ?? [], mergeGoal),
    notes: mergeText(base?.notes, draft.notes, current.notes),
  };
}
