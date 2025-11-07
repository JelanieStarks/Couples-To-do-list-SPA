import React from 'react';
import { describe, it, expect } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../../test-utils/renderWithProviders';
import { Layout } from '../Layout';

// Verify text size controls update CSS var and persist

describe('Drawer Text Size buttons', () => {
  const setup = () => renderWithProviders(
    <Layout>
      <div>Child</div>
    </Layout>
  );

  it('changes font scale when pressing size buttons', async () => {
    setup();
    fireEvent.click(screen.getByTestId('hamburger-btn'));
    const btn = screen.getByTestId('drawer-textsize-XL');
    fireEvent.click(btn);
    await waitFor(() => {
      expect(document.documentElement.style.getPropertyValue('--font-scale')).toBe('1.2');
    });
  });
});
