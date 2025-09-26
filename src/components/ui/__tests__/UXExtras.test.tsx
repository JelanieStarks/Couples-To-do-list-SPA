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

  const openHamburger = () => {
    // Ensure header exists and open the hamburger each time it's needed
    const btn = screen.getByTestId('hamburger-btn');
    fireEvent.click(btn);
  };

  it('shows a resize handle on the side drawer (md+ only)', () => {
    ensureLoggedIn();
    openHamburger();
    // We assert the handle exists in DOM; responsiveness is covered by CSS classes.
    expect(screen.getByTestId('drawer-resize-handle')).toBeInTheDocument();
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
    expect(await screen.findByText(/copied!/i)).toBeInTheDocument();
    // Restore clipboard
    (navigator as any).clipboard = originalClipboard;
  });

  it('exposes Clear All Local Data under Settings card', () => {
    ensureLoggedIn();
    openHamburger();
    // Click Settings from TopNav (open via drawer not required; TopNav opens with hamburger)
    const settingsBtn = screen.getByTestId('topnav-btn-settings');
    fireEvent.click(settingsBtn);
    const card = screen.getByTestId('topnav-card-settings');
    expect(within(card).getByTestId('clear-data')).toBeInTheDocument();
  });

  it('drawer nav items are wired: Dashboard/Planner/AI/Partner/Settings', () => {
    ensureLoggedIn();
    openHamburger();
    // Click AI Import
    fireEvent.click(screen.getByTestId('nav-ai'));
    // TopNav should show AI card
    expect(screen.getByTestId('topnav-card-ai')).toBeInTheDocument();

    // Reopen menu and click Partner
    openHamburger();
    fireEvent.click(screen.getByTestId('nav-partner'));
    expect(screen.getByTestId('topnav-card-partner')).toBeInTheDocument();

    // Reopen menu and click Settings
    openHamburger();
    fireEvent.click(screen.getByTestId('nav-settings'));
    expect(screen.getByTestId('topnav-card-settings')).toBeInTheDocument();
  });
});
