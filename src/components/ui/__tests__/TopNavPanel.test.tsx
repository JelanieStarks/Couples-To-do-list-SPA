import React from 'react';
import { describe, it, expect } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '../../../test-utils/renderWithProviders';
import { Layout } from '../Layout';

// Tests for TopNavPanel behavior and embedded cards

describe('TopNavPanel', () => {
  const setup = () => renderWithProviders(
    <Layout>
      <div>Child</div>
    </Layout>
  );

  it('opens when hamburger clicked and shows neon buttons (AI/Partner/Settings)', () => {
    setup();
    const btn = screen.getByTestId('hamburger-btn');
    fireEvent.click(btn);
    const panel = screen.getByTestId('top-nav-panel');
    expect(panel).toBeTruthy();
    // Buttons exist
    expect(screen.getByTestId('topnav-btn-ai')).toBeTruthy();
    expect(screen.getByTestId('topnav-btn-partner')).toBeTruthy();
    expect(screen.getByTestId('topnav-btn-settings')).toBeTruthy();
  });

  it('shows a card when a nav button is clicked', () => {
    setup();
    fireEvent.click(screen.getByTestId('hamburger-btn'));
    fireEvent.click(screen.getByTestId('topnav-btn-ai'));
    expect(screen.getByTestId('topnav-card-ai')).toBeTruthy();
  });

  it('shows partner and settings cards as expected', () => {
    setup();
    fireEvent.click(screen.getByTestId('hamburger-btn'));
    fireEvent.click(screen.getByTestId('topnav-btn-partner'));
    expect(screen.getByTestId('topnav-card-partner')).toBeTruthy();
    fireEvent.click(screen.getByTestId('topnav-btn-settings'));
    expect(screen.getByTestId('topnav-card-settings')).toBeTruthy();
  });
});
