import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AuthProvider } from '../../../contexts/AuthContext';
import { TaskProvider } from '../../../contexts/TaskContext';
import { ExportTasks, buildEmailBody } from '../ExportTasks';
import type { Task, User } from '../../../types';

const user: User = {
  id: 'u1',
  name: 'Alice',
  email: 'alice@example.com',
  inviteCode: 'ABC123',
  color: '#ec4899',
  createdAt: new Date().toISOString(),
};

const mkTask = (over: Partial<Task>): Task => ({
  id: over.id || Math.random().toString(36).slice(2),
  title: over.title || 'Task',
  priority: over.priority || 'C1',
  assignment: over.assignment || 'me',
  color: over.color || '#ec4899',
  completed: !!over.completed,
  createdBy: over.createdBy || user.id,
  createdAt: over.createdAt || new Date().toISOString(),
  updatedAt: over.updatedAt || new Date().toISOString(),
  scheduledDate: over.scheduledDate,
  scheduledTime: over.scheduledTime,
});

const tasks: Task[] = [
  mkTask({ title: 'Finish report', priority: 'A1', scheduledDate: '2025-09-25', scheduledTime: '09:00' }),
  mkTask({ title: 'Call plumber', priority: 'B2', scheduledDate: '2025-09-26' }),
  mkTask({ title: 'Organize bookshelf', priority: 'D' }),
];

const renderExport = () =>
  render(
    <AuthProvider initialUser={user}>
      <TaskProvider initialTasks={tasks}>
        <ExportTasks />
      </TaskProvider>
    </AuthProvider>
  );

// 🧪 buildEmailBody: like poetry, but with checkboxes
describe('ExportTasks', () => {
  it('builds a grouped email body', () => {
    const body = buildEmailBody(tasks);
    expect(body).toMatch(/Thursday, September/); // date line exists (locale dependent month)
    expect(body).toMatch(/\[A1\] Finish report @ 09:00/);
    expect(body).toMatch(/\[B2\] Call plumber/);
  });

  it('copies email body and calls window.open for print', async () => {
    renderExport();

    // Mock clipboard
    const writeText = vi.fn().mockResolvedValue(undefined);
    // @ts-ignore
    global.navigator.clipboard = { writeText } as any;

    // Silence jsdom's Not implemented: window.alert
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    fireEvent.click(screen.getByText(/copy email body/i));
    expect(writeText).toHaveBeenCalled();

    const openSpy = vi.spyOn(window, 'open').mockReturnValue({
      document: {
        open: vi.fn(),
        write: vi.fn(),
        close: vi.fn(),
      },
      focus: vi.fn(),
      print: vi.fn(),
    } as unknown as Window);

    fireEvent.click(screen.getByText(/print tasks/i));
    expect(openSpy).toHaveBeenCalled();
  });
});
