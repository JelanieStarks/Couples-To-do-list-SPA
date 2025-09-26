import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor, render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AIImport } from '../../tasks/AIImport';
import { AuthProvider, useAuth } from '../../../contexts/AuthContext';
import { TaskProvider } from '../../../contexts/TaskContext';
import { useTask } from '../../../contexts/TaskContext';

// 🧪 AIImport tests: making sure Jarvis parses text instead of hallucinating chores.

// Helper provider that ensures we have a logged-in user before rendering children
const LoggedInProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <AuthProvider>
      <EnsureLogin>
        <TaskProvider>{children}</TaskProvider>
      </EnsureLogin>
    </AuthProvider>
  );
};

const EnsureLogin: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, login } = useAuth();
  React.useEffect(() => {
    if (!user) login('Test User');
  }, [user, login]);
  if (!user) return <div data-testid="auth-loading" />; // suspense shim
  return <>{children}</>; 
};

describe('AIImport', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('imports tasks from mixed formatted text', async () => {
    const Capture: React.FC = () => {
      const { tasks } = useTask() as any;
      return <div data-testid="task-count">{tasks.length}</div>;
    };
    // Render with guaranteed logged-in user so importTasksFromText doesn't early-return like a shy raccoon.
    const Wrapper: React.FC = () => (
      <LoggedInProviders>
        <AIImport />
        <Capture />
      </LoggedInProviders>
    );
    render(<Wrapper />);

    // Wait for login to settle
    await screen.findByTestId('task-count');

    fireEvent.click(screen.getByRole('button', { name: /ai task import/i }));
    const textarea = await screen.findByLabelText(/paste your text here/i);
    const sample = `[A1] Launch rocket: With extra glitter\nPriority B2: Bake cookies\nRead book (Priority: C3)\nRandom plain task\nA2 Schedule adventure (assigned to: Both) [Friday, 14:00]`;
    fireEvent.change(textarea, { target: { value: sample } });
    const importBtn = screen.getByRole('button', { name: /import tasks/i });
    fireEvent.click(importBtn);
    await waitFor(() => {
      expect(Number(screen.getByTestId('task-count').textContent)).toBeGreaterThanOrEqual(5);
    });
  });
});
