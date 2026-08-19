import { describe, it, expect } from 'vitest';
import { normalizeRoutineBlocks } from '../routine';

const baseBlock = (overrides: Partial<any> = {}) => ({
  id: 'b1',
  title: 'Focus',
  startTime: '08:00',
  endTime: '10:00',
  notes: '',
  tasks: [],
  ...overrides,
});

describe('normalizeRoutineBlocks', () => {
  it('fills gaps with rest blocks', () => {
    const result = normalizeRoutineBlocks([
      baseBlock({ startTime: '08:00', endTime: '10:00' }),
      baseBlock({ id: 'b2', title: 'Work', startTime: '12:00', endTime: '13:00' }),
    ]);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.blocks.some(block => block.title === 'Rest')).toBe(true);
      expect(result.blocks[0].startTime).toBe('00:00');
      expect(result.blocks[result.blocks.length - 1].endTime).toBe('24:00');
    }
  });

  it('rejects overlapping blocks', () => {
    const result = normalizeRoutineBlocks([
      baseBlock({ startTime: '08:00', endTime: '10:00' }),
      baseBlock({ id: 'b2', title: 'Overlap', startTime: '09:30', endTime: '11:00' }),
    ]);

    expect(result.ok).toBe(false);
    if ('error' in result) {
      expect(result.error).toMatch(/overlap/i);
    }
  });
});
