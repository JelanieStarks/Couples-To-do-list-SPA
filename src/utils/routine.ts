/**
 * Routine helpers
 * What: normalize routine blocks into a 24h day with auto-filled rest blocks.
 * How: validate time ranges, sort, detect overlap, and fill gaps.
 */
import type { RoutineBlock } from '../types';
import { generateId } from './index';

const MINUTES_IN_DAY = 24 * 60;

const toMinutes = (time: string): number | null => {
  if (!time) return null;
  if (time === '24:00') return MINUTES_IN_DAY;
  if (!/^[0-2]\d:[0-5]\d$/.test(time)) return null;
  const [h, m] = time.split(':').map(Number);
  if (h > 23 || m > 59) return null;
  return h * 60 + m;
};

const toTime = (minutes: number): string => {
  const clamped = Math.max(0, Math.min(MINUTES_IN_DAY, minutes));
  if (clamped === MINUTES_IN_DAY) return '24:00';
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

export const createDefaultRoutineBlocks = (): RoutineBlock[] => ([
  { id: generateId(), title: 'Morning', startTime: '06:00', endTime: '12:00', notes: 'Wake, hydrate, and focus.', tasks: [] },
  { id: generateId(), title: 'Afternoon', startTime: '12:00', endTime: '18:00', notes: 'Midday reset and momentum.', tasks: [] },
  { id: generateId(), title: 'Evening', startTime: '18:00', endTime: '24:00', notes: 'Wind down and prep for tomorrow.', tasks: [] },
]);

export const normalizeRoutineBlocks = (blocks: RoutineBlock[]): { ok: true; blocks: RoutineBlock[] } | { ok: false; error: string } => {
  const filtered = blocks
    .filter(block => block.title.trim())
    .map(block => ({ ...block, title: block.title.trim() }));

  const parsed = filtered.map(block => {
    const start = toMinutes(block.startTime);
    const end = toMinutes(block.endTime);
    return { block, start, end };
  });

  if (parsed.some(entry => entry.start === null || entry.end === null)) {
    return { ok: false, error: 'Every block needs a valid start and end time.' };
  }

  if (parsed.some(entry => (entry.start as number) >= (entry.end as number))) {
    return { ok: false, error: 'Each block must end after it starts.' };
  }

  const sorted = parsed.sort((a, b) => (a.start as number) - (b.start as number));
  const normalized: RoutineBlock[] = [];

  let cursor = 0;
  for (const entry of sorted) {
    const start = entry.start as number;
    const end = entry.end as number;
    if (start < cursor) {
      return { ok: false, error: 'Blocks cannot overlap.' };
    }
    if (start > cursor) {
      normalized.push({
        id: generateId(),
        title: 'Rest',
        startTime: toTime(cursor),
        endTime: toTime(start),
        notes: 'Auto-filled free time.',
        tasks: [],
      });
    }
    normalized.push(entry.block);
    cursor = end;
  }

  if (cursor < MINUTES_IN_DAY) {
    normalized.push({
      id: generateId(),
      title: 'Rest',
      startTime: toTime(cursor),
      endTime: '24:00',
      notes: 'Auto-filled free time.',
      tasks: [],
    });
  }

  if (cursor > MINUTES_IN_DAY) {
    return { ok: false, error: 'Total time cannot exceed 24 hours.' };
  }

  return { ok: true, blocks: normalized };
};
