import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { screen, fireEvent, render } from '@testing-library/react';
import { WeeklyCalendar } from '../../calendar/WeeklyCalendar';
import { AuthProvider } from '../../../contexts/AuthContext';
import { TaskProvider } from '../../../contexts/TaskContext';
import { toLocalDateString } from '../../../utils';

// 🧪 Clicking a date number opens quick-add and creates a task on that date

describe('WeeklyCalendar quick-add by date click', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('opens quick-add for a day and creates a task on that date', async () => {
    const user = { id: 'u1', name: 'Tester', inviteCode: 'ABCDEF', color: '#ec4899', createdAt: new Date().toISOString() } as any;
    
    // Render with an authenticated user so createTask succeeds
    const ui = (
      <AuthProvider initialUser={user}>
        <TaskProvider>
          <WeeklyCalendar />
        </TaskProvider>
      </AuthProvider>
    );
    
    const { container } = render(ui);

    const today = new Date();
    const dateStr = toLocalDateString(today);

    // Find the date button for today's column
    const dateBtn = screen.getByTestId(`date-btn-${dateStr}`);
    fireEvent.click(dateBtn);

    // Quick add input appears
    const qa = await screen.findByTestId(`quick-add-${dateStr}`);
    const input = qa.querySelector('input') as HTMLInputElement;
    expect(input).toBeTruthy();

    // Type and add
    fireEvent.change(input, { target: { value: 'Quick Task' } });
  const addBtn = screen.getByTestId(`quick-add-submit-${dateStr}`);
  fireEvent.click(addBtn);

    // Task should now be rendered in the grid
    expect(await screen.findByText(/quick task/i)).toBeInTheDocument();
  });
});
