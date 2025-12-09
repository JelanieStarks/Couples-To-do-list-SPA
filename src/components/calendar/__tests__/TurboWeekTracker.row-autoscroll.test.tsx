import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { TurboWeekTracker } from '../../calendar/TurboWeekTracker';
import { renderWithProviders } from '../../../test-utils/renderWithProviders';

// 🧪 Turbo layout auto-scrolls to today when horizontal overflow is present

describe('TurboWeekTracker auto-scroll', () => {
  beforeEach(() => localStorage.clear());

  it('calls scrollIntoView for today when the grid overflows horizontally', async () => {
    vi.useFakeTimers();
    renderWithProviders(<TurboWeekTracker />);

    const container = screen.getByTestId('calendar-turbo') as HTMLElement;
    Object.defineProperty(container, 'scrollWidth', { value: 2000, configurable: true });
    Object.defineProperty(container, 'clientWidth', { value: 320, configurable: true });

    const todayIdx = new Date().getDay();
    const todayCol = container.querySelector(`[data-day-index="${todayIdx}"]`) as HTMLElement;
    const spy = vi.fn();
    todayCol.scrollIntoView = spy;

    vi.runAllTimers();

    expect(spy).toHaveBeenCalled();
    vi.useRealTimers();
  });
});
