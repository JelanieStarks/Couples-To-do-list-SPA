import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TaskProvider } from '../../../contexts/TaskContext';
import { AuthProvider } from '../../../contexts/AuthContext';
import { Layout } from '../Layout';

// Simple wrapper rendering layout with minimal child
const setup = () => {
  render(
    <AuthProvider>
      <TaskProvider>
        <Layout>
          <div>Child</div>
        </Layout>
      </TaskProvider>
    </AuthProvider>
  );
};

describe('Layout + SideDrawer integration', () => {
  it('opens drawer with nav items when hamburger clicked', () => {
    setup();
    const btn = screen.getByTestId('hamburger-btn');
    fireEvent.click(btn);
    const drawer = screen.getByTestId('side-drawer');
    expect(drawer).toBeTruthy();
    const navList = screen.getByTestId('nav-list');
    expect(navList.querySelectorAll('li').length >= 5).toBe(true);
  });
});
