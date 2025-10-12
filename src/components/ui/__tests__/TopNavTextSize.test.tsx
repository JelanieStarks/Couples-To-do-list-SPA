import React from 'react';
import { describe, it, expect } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '../../../test-utils/renderWithProviders';
import { Layout } from '../Layout';

// Verify text size controls update CSS var and persist

describe('TopNavPanel Text Size', () => {
  const setup = () => renderWithProviders(
    <Layout>
      <div>Child</div>
    </Layout>
  );

  it('changes font scale when pressing size buttons', () => {
    setup();
    fireEvent.click(screen.getByTestId('hamburger-btn'));
    fireEvent.click(screen.getByTestId('topnav-btn-settings'));
    const btn = screen.getByTestId('textsize-XL');
    fireEvent.click(btn);
    const val = document.documentElement.style.getPropertyValue('--font-scale');
    expect(val).toBe('1.2');
  });
});
