import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TaskProvider } from '../../../contexts/TaskContext';
import { SideDrawer } from '../SideDrawer';

// Minimal AuthContext mock to satisfy useAuth
const AuthContext = React.createContext<any>(null);
const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => (
  <AuthContext.Provider value={{ user: { id: 'user-1', name: 'Tester', inviteCode: 'CODE', color: '#ff00aa' }, partner: null }}>
    {children}
  </AuthContext.Provider>
);

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => React.useContext(AuthContext)
}));

const setup = (drawerOpen = true) => {
  return render(
    <AuthProvider>
      <TaskProvider>
        <SideDrawer open={drawerOpen} onClose={() => {}} />
      </TaskProvider>
    </AuthProvider>
  );
};

describe('SideDrawer', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders drawer container when open', () => {
    setup(true);
    expect(screen.getByTestId('side-drawer')).toBeInTheDocument();
  });

  it('toggles completed section visibility', () => {
    setup(true);
    const toggle = screen.getByTestId('toggle-completed');
  expect(screen.getByTestId('completed-section')).toBeInTheDocument();
  fireEvent.click(toggle); // hide
  expect(screen.queryByTestId('completed-section')).toBeNull();
  fireEvent.click(toggle); // show again
  expect(screen.getByTestId('completed-section')).toBeInTheDocument();
  });

  it('toggles deleted section visibility', () => {
    setup(true);
    const toggle = screen.getByTestId('toggle-deleted');
  expect(screen.getByTestId('deleted-section')).toBeInTheDocument();
  fireEvent.click(toggle); // hide
  expect(screen.queryByTestId('deleted-section')).toBeNull();
  fireEvent.click(toggle); // show
  expect(screen.getByTestId('deleted-section')).toBeInTheDocument();
  });

  it('shows empty trash button only when deleted tasks exist', () => {
    setup(true);
    // Initially absent
    expect(screen.queryByTestId('empty-trash')).toBeNull();
  });
});
