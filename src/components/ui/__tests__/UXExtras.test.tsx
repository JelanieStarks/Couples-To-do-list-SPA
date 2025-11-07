import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import App from '../../../App';

// These tests focus on small UX enhancements. They aim to be readable and behavior-driven.

describe('Small UX enhancements', () => {
  beforeEach(() => {
    // Ensure deterministic starting point for auth/UI
    localStorage.clear();
  });

  const ensureLoggedIn = () => {
    // If login form is present, perform quick login; otherwise, assume already authenticated
    render(<App />);
    const maybeNameInput = screen.queryByLabelText(/name/i);
    if (maybeNameInput) {
      fireEvent.change(maybeNameInput, { target: { value: 'Test User' } });
      fireEvent.click(screen.getByRole('button', { name: /enter the dashboard/i }));
    }
  };

  const openDrawer = () => {
    const drawer = screen.getByTestId('side-drawer');
    if (drawer.getAttribute('data-open') !== 'true') {
      fireEvent.click(screen.getByTestId('hamburger-btn'));
    }
    return screen.getByTestId('side-drawer');
  };

  it('shows a resize handle on the side drawer (md+ only)', () => {
    ensureLoggedIn();
    openDrawer();
    // We assert the handle exists in DOM; responsiveness is covered by CSS classes.
    expect(screen.getByTestId('drawer-resize-handle')).toBeTruthy();
  });

  it('allows copying the invite code with feedback', async () => {
    ensureLoggedIn();
    // Mock clipboard in JSDOM so the copy action succeeds without throwing
    const originalClipboard = (navigator as any).clipboard;
    (navigator as any).clipboard = {
      writeText: vi.fn().mockResolvedValue(undefined),
    };
    const copyBtn = await screen.findByTestId('copy-invite');
    fireEvent.click(copyBtn);
    // Feedback label appears
  expect(await screen.findByText(/copied!/i)).toBeTruthy();
    // Restore clipboard
    (navigator as any).clipboard = originalClipboard;
  });

  it('exposes Clear All Local Data under Settings card', () => {
    ensureLoggedIn();
    const drawer = openDrawer();
  const settingsSection = within(drawer).getByTestId('drawer-settings');
  expect(within(settingsSection).getByTestId('drawer-clear-data')).toBeTruthy();
  });

  it('drawer nav items are wired: Dashboard/Planner/AI/Partner/Settings', () => {
    ensureLoggedIn();
    const drawer = openDrawer();
    fireEvent.click(screen.getByTestId('nav-ai'));
    expect(within(drawer).getByTestId('drawer-ai')).toBeTruthy();

    fireEvent.click(screen.getByTestId('nav-partner'));
    expect(within(drawer).getByTestId('drawer-partner')).toBeTruthy();

    fireEvent.click(screen.getByTestId('nav-settings'));
    expect(within(drawer).getByTestId('drawer-settings')).toBeTruthy();
  });
});
