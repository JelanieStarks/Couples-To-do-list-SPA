import React from 'react';
import { describe, it, expect } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '../../../test-utils/renderWithProviders';
import { Layout } from '../Layout';

// Verify text size slider updates CSS var

describe('TopNavPanel Text Size Range', () => {
  const setup = () => renderWithProviders(
    <Layout>
      <div>Child</div>
    </Layout>
  );

  it('moves slider and updates --font-scale', () => {
    setup();
    fireEvent.click(screen.getByTestId('hamburger-btn'));
    fireEvent.click(screen.getByTestId('topnav-btn-settings'));
    const range = screen.getByTestId('textsize-range') as HTMLInputElement;
    fireEvent.change(range, { target: { value: '1.15' } });
    const val = document.documentElement.style.getPropertyValue('--font-scale');
    expect(val).toBe('1.15');
  });
});
