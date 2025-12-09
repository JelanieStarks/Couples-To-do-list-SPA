/**
 * Ensures the mega calendar renders without requiring Google config.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { TaskProvider } from '../../../contexts/TaskContext';
import { AuthProvider } from '../../../contexts/AuthContext';
import { TurboWeekFullCalendarModal } from '../TurboWeekFullCalendarModal';

// Helper to render with providers and modal open
const renderModal = () => {
  return render(
    <AuthProvider>
      <TaskProvider>
        <TurboWeekFullCalendarModal open onClose={() => {}} />
      </TaskProvider>
    </AuthProvider>
  );
};

describe('TurboWeekFullCalendarModal google optional', () => {
  it('renders header and calendar even when google config is absent', () => {
    renderModal();
    expect(screen.getByText(/Full Calendar/i)).toBeTruthy();
    expect(screen.getByText(/Google not connected/i)).toBeTruthy();
  });
});
