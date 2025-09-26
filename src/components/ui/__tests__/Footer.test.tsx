import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TaskProvider } from '../../../contexts/TaskContext';
import { AuthProvider } from '../../../contexts/AuthContext';
import { Layout } from '../Layout';

// Yes, we test the footer — because pixels matter and love deserves proof.
describe('Layout Footer', () => {
  it('renders copyright and the love note', () => {
    render(
      <AuthProvider>
        <TaskProvider>
          <Layout>
            <div>Content</div>
          </Layout>
        </TaskProvider>
      </AuthProvider>
    );

    // Current year should appear next to StarkServices&Systems
    const year = new Date().getFullYear().toString();
    expect(screen.getByText((t) => t.includes('StarkServices&Systems') && t.includes(year))).toBeTruthy();

    // The lovingly made footer line
    expect(
      screen.getByText(/Made lovingly by Jelani Starks for his beautiful wife Tachyana/i)
    ).toBeInTheDocument();
  });
});
