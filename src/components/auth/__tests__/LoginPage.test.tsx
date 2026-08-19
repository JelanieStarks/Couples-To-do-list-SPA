import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { AuthProvider } from '../../../contexts/AuthContext';
import { DbzHeartLoginGate } from '../DbzHeartLoginGate';

// Helper to access context indirectly by inspecting localStorage changes
// NOTE: Storage keys use hyphens (see STORAGE_KEYS in utils) not underscores
const getStoredUser = () => JSON.parse(localStorage.getItem('couples-todo-user') || 'null');

describe('DbzHeartLoginGate', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('disables submit without name', () => {
  render(<AuthProvider><DbzHeartLoginGate /></AuthProvider>);
    const submit = screen.getByRole('button', { name: /enter the dashboard/i });
    expect(submit).toBeDisabled();
  });

  it('logs in with name only', async () => {
  render(<AuthProvider><DbzHeartLoginGate /></AuthProvider>);
    fireEvent.change(screen.getByLabelText(/your name/i), { target: { value: 'Alice' } });
    const submit = screen.getByRole('button', { name: /enter the dashboard/i });
    expect(submit).not.toBeDisabled();
    await act(async () => { fireEvent.click(submit); });
    const user = getStoredUser();
    expect(user).toBeTruthy();
    expect(user.name).toBe('Alice');
  });

  it('clearly labels local demo mode', () => {
  render(<AuthProvider><DbzHeartLoginGate /></AuthProvider>);
    expect(screen.getByText(/local demo mode/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument();
  });
});
