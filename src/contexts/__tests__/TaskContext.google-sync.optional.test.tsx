/**
 * Ensures syncNow does not call Google sync when disabled, but does when enabled.
 */
import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { TaskProvider, useTask } from '../TaskContext';
import { STORAGE_KEYS } from '../../utils';

// Minimal AuthContext mock
const AuthContext = React.createContext<any>(null);
const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => (
  <AuthContext.Provider value={{ user: { id: 'user-1', name: 'Tester', inviteCode: 'CODE', color: '#ff00aa' } }}>
    {children}
  </AuthContext.Provider>
);

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => React.useContext(AuthContext)
}));

const Harness: React.FC<{ onReady: (api: ReturnType<typeof useTask>) => void }> = ({ onReady }) => {
  const api = useTask();
  React.useEffect(() => { onReady(api); }, [api, onReady]);
  return <button data-testid="sync" onClick={api.syncNow}>sync</button>;
};

describe('TaskContext google sync gating', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('does not call google sync when disabled', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch' as any).mockRejectedValue(new Error('should not call'));
    render(
      <AuthProvider>
        <TaskProvider>
          <Harness onReady={() => {}} />
        </TaskProvider>
      </AuthProvider>
    );
    await act(async () => {
      fireEvent.click(screen.getByTestId('sync'));
    });
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('calls google sync when enabled and connected', async () => {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify({
      googleCalendar: { syncEnabled: true, connectStatus: 'ready', accountEmail: 'a@b.com' }
    }));
    const fetchSpy = vi.spyOn(global, 'fetch' as any).mockResolvedValue({ ok: true, json: async () => ({ events: [] }) });
    render(
      <AuthProvider>
        <TaskProvider>
          <Harness onReady={() => {}} />
        </TaskProvider>
      </AuthProvider>
    );
    await act(async () => {
      fireEvent.click(screen.getByTestId('sync'));
    });
    expect(fetchSpy).toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
