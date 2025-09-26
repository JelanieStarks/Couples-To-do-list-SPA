import React, { useState } from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TaskProvider } from '../../../contexts/TaskContext';
import { AuthProvider } from '../../../contexts/AuthContext';
import { Layout } from '../Layout';
import { SideDrawer } from '../SideDrawer';

// This test verifies overlay click-to-close and presence of drawer sections

describe('Drawer overlay and sections', () => {
  it('overlay click closes full-screen variant', () => {
    const Wrapper = () => {
      const [open, setOpen] = useState(true);
      return (
        <AuthProvider>
          <TaskProvider>
            <SideDrawer open={open} onClose={() => setOpen(false)} variant="full" />
          </TaskProvider>
        </AuthProvider>
      );
    };

    render(<Wrapper />);

    // Ensure initially open
    const drawer = screen.getByTestId('side-drawer');
    expect(drawer.getAttribute('data-open')).toBe('true');

    // Click backdrop to close
    const backdrop = screen.getByTestId('drawer-backdrop');
    fireEvent.click(backdrop);

    // Drawer should remain mounted but closed
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
