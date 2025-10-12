import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { screen, render, fireEvent } from '@testing-library/react';
import { WeeklyCalendar } from '../../calendar/WeeklyCalendar';
import { AuthProvider } from '../../../contexts/AuthContext';
import { TaskProvider } from '../../../contexts/TaskContext';
import { toLocalDateString } from '../../../utils';

// 🧪 Hover should NOT open quick-add anymore; only click does

describe('WeeklyCalendar quick-add is click-only', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('hovering over a day does not open quick-add', async () => {
    const user = { id: 'u1', name: 'Tester', inviteCode: 'ABCDEF', color: '#ec4899', createdAt: new Date().toISOString() } as any;

    render(
      <AuthProvider initialUser={user}>
        <TaskProvider>
          <WeeklyCalendar />
        </TaskProvider>
      </AuthProvider>
    );

    const today = new Date();
    const dateStr = toLocalDateString(today);
    const dayCol = screen.getByTestId(`day-col-${dateStr}`);

    // Simulate hover
    fireEvent.mouseEnter(dayCol);

    // Assert quick-add is not auto-opened
    expect(screen.queryByTestId(`quick-add-${dateStr}`)).toBeNull();

    // Click header to open still works
    const dateBtn = screen.getByTestId(`date-btn-${dateStr}`);
    fireEvent.click(dateBtn);
    expect(await screen.findByTestId(`quick-add-${dateStr}`)).toBeInTheDocument();
  });
});
