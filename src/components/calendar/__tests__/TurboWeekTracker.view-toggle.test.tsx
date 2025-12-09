import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { TurboWeekTracker } from '../../calendar/TurboWeekTracker';
import { renderWithProviders } from '../../../test-utils/renderWithProviders';

// 🧪 Turbo layout: single responsive grid with day markers

describe('TurboWeekTracker unified layout', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders the turbo week grid with seven day columns', () => {
    renderWithProviders(<TurboWeekTracker />);

    const container = screen.getByTestId('calendar-turbo');
    expect(container).toBeInTheDocument();
    const cols = container.querySelectorAll('[data-day-index]');
    expect(cols.length).toBe(7);
  });
});
