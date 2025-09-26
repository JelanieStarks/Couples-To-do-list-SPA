import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { WeeklyCalendar } from '../../calendar/WeeklyCalendar';
import { renderWithProviders } from '../../../test-utils/renderWithProviders';
import { useTask } from '../../../contexts/TaskContext';

// 🧪 WeeklyCalendar tests: making sure the temporal canvas renders days and tasks.

const Seed: React.FC = () => {
  const { createTask } = useTask() as any;
  React.useEffect(() => {
    createTask({ title: 'Calendar Task', priority: 'B1', assignment: 'me', color: '#fff' });
  }, [createTask]);
  return null;
};

describe('WeeklyCalendar', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders 7 day columns', () => {
    renderWithProviders(<><Seed /><WeeklyCalendar /></>);
    // Day headers contain weekday names; we check for Monday & Sunday existence as proxy
    expect(screen.getByText(/monday/i)).toBeInTheDocument();
    expect(screen.getByText(/sunday/i)).toBeInTheDocument();
  });
});
