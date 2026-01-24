import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RoutineBlock } from '../RoutineBlock';
import { AuthProvider } from '../../../contexts/AuthContext';

describe('RoutineBlock', () => {
  it('renders placeholder copy', () => {
    render(
      <AuthProvider>
        <RoutineBlock />
      </AuthProvider>
    );
    expect(screen.getByText(/Routine/i)).toBeInTheDocument();
    expect(screen.getByText(/Tap to edit/i)).toBeInTheDocument();
  });

  it('opens editor when header is clicked', () => {
    render(
      <AuthProvider>
        <RoutineBlock />
      </AuthProvider>
    );
    fireEvent.click(screen.getByText(/Routine/i));
    expect(screen.getByText(/Edit Routine Blocks/i)).toBeInTheDocument();
  });
});
