import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { AuthProvider } from '../../../contexts/AuthContext';
import { LoginPage } from '../LoginPage';

// Helper to access context indirectly by inspecting localStorage changes
// NOTE: Storage keys use hyphens (see STORAGE_KEYS in utils) not underscores
const getStoredUser = () => JSON.parse(localStorage.getItem('couples-todo-user') || 'null');
const getStoredPartner = () => JSON.parse(localStorage.getItem('couples-todo-partner') || 'null');

describe('LoginPage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('disables submit without name', () => {
    render(<AuthProvider><LoginPage /></AuthProvider>);
    const submit = screen.getByRole('button', { name: /enter the dashboard/i });
    expect(submit).toBeDisabled();
  });

  it('logs in with name only', async () => {
    render(<AuthProvider><LoginPage /></AuthProvider>);
    fireEvent.change(screen.getByLabelText(/your name/i), { target: { value: 'Alice' } });
    const submit = screen.getByRole('button', { name: /enter the dashboard/i });
    expect(submit).not.toBeDisabled();
    await act(async () => { fireEvent.click(submit); });
    const user = getStoredUser();
    expect(user).toBeTruthy();
    expect(user.name).toBe('Alice');
  });

  it('links partner when invite code provided', async () => {
    render(<AuthProvider><LoginPage /></AuthProvider>);
    fireEvent.change(screen.getByLabelText(/your name/i), { target: { value: 'Bob' } });
    const submit = screen.getByRole('button', { name: /enter the dashboard/i });
    await act(async () => { fireEvent.click(submit); });

    // Ensure user persisted
    await waitFor(() => {
      const user = getStoredUser();
      expect(user).toBeTruthy();
    });

    // Now open partner linking and submit again (will call linkPartner after login already done)
    fireEvent.click(screen.getByRole('button', { name: /add/i }));
    fireEvent.change(screen.getByLabelText(/invite code/i), { target: { value: 'abc123' } });
    await act(async () => { fireEvent.click(submit); });

    await waitFor(() => {
      const partner = getStoredPartner();
      expect(partner).toBeTruthy();
      expect(partner.inviteCode).toBe('ABC123');
      const user = getStoredUser();
      expect(user?.partnerId).toBe(partner.id);
    });
  });
});
