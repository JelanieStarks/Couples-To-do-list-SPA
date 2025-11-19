import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { TurboWeekTracker } from '../../calendar/TurboWeekTracker';
import { renderWithProviders } from '../../../test-utils/renderWithProviders';

// 🧪 View toggle should jump between classic grid and row layout on click

describe('TurboWeekTracker view toggle', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders classic view by default and toggles to row view', () => {
    renderWithProviders(<TurboWeekTracker />);

    // Default classic grid exists
    expect(screen.getByTestId('calendar-classic')).toBeInTheDocument();
    // Toggle to row
    const rowBtn = screen.getByTestId('calendar-view-row');
    fireEvent.click(rowBtn);
    expect(screen.getByTestId('calendar-row')).toBeInTheDocument();

    // And row button is pressed
    expect(rowBtn).toHaveAttribute('aria-pressed', 'true');
  });
});
