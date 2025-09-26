import React from 'react';
import { describe, it, expect } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '../../../test-utils/renderWithProviders';
import { Layout } from '../Layout';

// Integration tests for clicking nav buttons and seeing the card content mount

describe('TopNav integration', () => {
  const setup = () => renderWithProviders(
    <Layout>
      <div>Child</div>
    </Layout>
  );

  // Dashboard and Planner are on the main page now; TopNav shows AI/Partner/Settings only

  it('opens AI import card', () => {
    setup();
    fireEvent.click(screen.getByTestId('hamburger-btn'));
    fireEvent.click(screen.getByTestId('topnav-btn-ai'));
    const card = screen.getByTestId('topnav-card-ai');
    expect(card).toBeTruthy();
  });

  it('opens partner card', () => {
    setup();
    fireEvent.click(screen.getByTestId('hamburger-btn'));
    fireEvent.click(screen.getByTestId('topnav-btn-partner'));
    const card = screen.getByTestId('topnav-card-partner');
    expect(card).toBeTruthy();
  });

  it('opens settings card (export tasks)', () => {
    setup();
    fireEvent.click(screen.getByTestId('hamburger-btn'));
    fireEvent.click(screen.getByTestId('topnav-btn-settings'));
    const card = screen.getByTestId('topnav-card-settings');
    expect(card).toBeTruthy();
  });
});
