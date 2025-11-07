import React from 'react';
import { describe, it, expect } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import { renderWithProviders } from '../../../test-utils/renderWithProviders';
import { Layout } from '../Layout';

// Tests for SideDrawer navigation replacing TopNav quick menu

describe('SideDrawer navigation', () => {
  const setup = () => renderWithProviders(
    <Layout>
      <div>Child</div>
    </Layout>
  );

  it('opens when hamburger clicked and shows neon buttons (AI/Partner/Settings)', () => {
    setup();
    fireEvent.click(screen.getByTestId('hamburger-btn'));
    const drawer = screen.getByTestId('side-drawer');
    expect(drawer).toBeTruthy();
    // Primary nav buttons exist in drawer
    expect(screen.getByTestId('nav-ai')).toBeTruthy();
    expect(screen.getByTestId('nav-partner')).toBeTruthy();
    expect(screen.getByTestId('nav-settings')).toBeTruthy();
  });

  it('shows a card when a nav button is clicked', () => {
    setup();
    fireEvent.click(screen.getByTestId('hamburger-btn'));
    fireEvent.click(screen.getByTestId('nav-ai'));
    const aiSection = screen.getByTestId('drawer-ai');
    expect(aiSection).toBeTruthy();
  expect(within(aiSection).getByText(/AI Task Import/i)).toBeTruthy();
  });

  it('shows partner and settings cards as expected', () => {
    setup();
    fireEvent.click(screen.getByTestId('hamburger-btn'));
    fireEvent.click(screen.getByTestId('nav-partner'));
    expect(within(screen.getByTestId('drawer-partner')).getByText(/Partner & Colors/i)).toBeTruthy();
    fireEvent.click(screen.getByTestId('nav-settings'));
    expect(within(screen.getByTestId('drawer-settings')).getByTestId('drawer-clear-data')).toBeTruthy();
  });
});
