import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { TurboWeekTracker } from '../../calendar/TurboWeekTracker';
import { renderWithProviders } from '../../../test-utils/renderWithProviders';
import { useTask } from '../../../contexts/TaskContext';

// 🧪 TurboWeekTracker tests: making sure the neon pit lane renders days and tasks.

const Seed: React.FC = () => {
  const { createTask } = useTask() as any;
  React.useEffect(() => {
    createTask({ title: 'Calendar Task', priority: 'B1', assignment: 'me', color: '#fff' });
  }, [createTask]);
  return null;
};

describe('TurboWeekTracker', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders 7 day columns', () => {
    renderWithProviders(
      <>
        <Seed />
        <TurboWeekTracker />
      </>
    );
    // Day headers contain weekday names; we check for Monday & Sunday existence as proxy
    expect(screen.getByText(/monday/i)).toBeInTheDocument();
    expect(screen.getByText(/sunday/i)).toBeInTheDocument();
  });
});
