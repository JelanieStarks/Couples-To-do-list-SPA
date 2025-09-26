import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TaskProvider } from '../../../contexts/TaskContext';
import { AuthProvider } from '../../../contexts/AuthContext';
import { Layout } from '../Layout';

// This test verifies overlay click-to-close and presence of drawer sections

describe('Drawer overlay and sections', () => {
  it('opens on hamburger click and closes on overlay click', () => {
    render(
      <AuthProvider>
        <TaskProvider>
          <Layout>
            <div>Child</div>
          </Layout>
        </TaskProvider>
      </AuthProvider>
    );

    // Open
    const btn = screen.getByTestId('hamburger-btn');
    fireEvent.click(btn);
    const drawer = screen.getByTestId('side-drawer');
    expect(drawer).toBeTruthy();

    // Overlay click closes (drawer remains in DOM but data-open attribute should be removed and root becomes non-interactive)
    const backdrop = screen.getByTestId('drawer-backdrop');
    fireEvent.click(backdrop);

    // Drawer should still be in DOM for animation but flagged as closed
    const drawerAfter = screen.getByTestId('side-drawer');
    expect(drawerAfter.getAttribute('data-open')).toBeNull();
    const root = screen.getByTestId('drawer-root');
    expect(root.className).toMatch(/pointer-events-none/);
  });

  it('renders Export & Partner sections when open', () => {
    render(
      <AuthProvider>
        <TaskProvider>
          <Layout>
            <div>Child</div>
          </Layout>
        </TaskProvider>
      </AuthProvider>
    );

    fireEvent.click(screen.getByTestId('hamburger-btn'));

    // Export
    expect(screen.getByTestId('drawer-export')).toBeTruthy();
    // Partner area
    expect(screen.getByTestId('drawer-partner')).toBeTruthy();
  });
});
