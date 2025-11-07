import React from 'react';
import { describe, it, expect } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../../test-utils/renderWithProviders';
import { Layout } from '../Layout';

// Verify text size slider updates CSS var

describe('Drawer Text Size range', () => {
  const setup = () => renderWithProviders(
    <Layout>
      <div>Child</div>
    </Layout>
  );

  it('moves slider and updates --font-scale', async () => {
    setup();
    fireEvent.click(screen.getByTestId('hamburger-btn'));
    const range = screen.getByTestId('drawer-textsize-range') as HTMLInputElement;
    fireEvent.change(range, { target: { value: '1.15' } });
    await waitFor(() => {
      expect(document.documentElement.style.getPropertyValue('--font-scale')).toBe('1.15');
    });
  });
});
