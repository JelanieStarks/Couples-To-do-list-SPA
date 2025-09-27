import React from 'react';
import { describe, it, beforeEach, expect } from 'vitest';
import { screen, fireEvent, render } from '@testing-library/react';
import { WeeklyCalendar } from '../../calendar/WeeklyCalendar';
import { AuthProvider } from '../../../contexts/AuthContext';
import { TaskProvider } from '../../../contexts/TaskContext';
import { toLocalDateString } from '../../../utils';

// 🧪 Clicking weekday name opens quick-add and creates a task

describe('WeeklyCalendar quick-add by weekday name click', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('opens quick-add from weekday name and creates a task', async () => {
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

    const dayBtn = screen.getByTestId(`dayname-btn-${dateStr}`);
    fireEvent.click(dayBtn);

    const qa = await screen.findByTestId(`quick-add-${dateStr}`);
    const input = qa.querySelector('input') as HTMLInputElement;

    fireEvent.change(input, { target: { value: 'From Day Name' } });
    const submit = screen.getByTestId(`quick-add-submit-${dateStr}`);
    fireEvent.click(submit);

    expect(await screen.findByText(/from day name/i)).toBeInTheDocument();
  });
});
