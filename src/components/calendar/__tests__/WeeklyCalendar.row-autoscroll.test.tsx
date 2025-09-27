import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { WeeklyCalendar } from '../../calendar/WeeklyCalendar';
import { renderWithProviders } from '../../../test-utils/renderWithProviders';

describe('WeeklyCalendar row view auto-scroll scaffold', () => {
  beforeEach(() => localStorage.clear());

  it('renders row view container with day index markers', () => {
    renderWithProviders(<WeeklyCalendar />);
    // Switch to row
    fireEvent.click(screen.getByTestId('calendar-view-row'));
    const container = screen.getByTestId('calendar-row');
    expect(container).toBeInTheDocument();
    // Ensure day index attributes exist for seven columns
    const cols = container.querySelectorAll('[data-day-index]');
    expect(cols.length).toBe(7);
  });
});
