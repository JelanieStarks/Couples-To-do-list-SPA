import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { PartnerManager } from '../../auth/PartnerManager';
import { renderWithProviders } from '../../../test-utils/renderWithProviders';

// 🧪 PartnerManager tests: relationships are complex, the component shouldn't be.

describe('PartnerManager', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows invite code and link form toggle', () => {
    renderWithProviders(<PartnerManager />);
    expect(screen.getByText(/your invite code/i)).toBeInTheDocument();
    const toggle = screen.getByRole('button', { name: /enter code/i });
    fireEvent.click(toggle);
    expect(screen.getByPlaceholderText(/abc123/i)).toBeInTheDocument();
  });
});
