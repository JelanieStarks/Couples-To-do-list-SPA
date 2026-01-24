import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RoutineBlock } from '../RoutineBlock';
import { AuthProvider } from '../../../contexts/AuthContext';

describe('RoutineBlock', () => {
  it('renders placeholder copy', () => {
    render(
      <AuthProvider initialUser={{
        id: 'user-1',
        name: 'Tester',
        inviteCode: 'ABC123',
        color: '#ec4899',
        createdAt: new Date().toISOString(),
      }}>
        <RoutineBlock />
      </AuthProvider>
    );
    expect(screen.getByText(/My Routine/i)).toBeInTheDocument();
    expect(screen.getByText(/Tap to edit/i)).toBeInTheDocument();
  });

  it('opens editor when header is clicked', () => {
    render(
      <AuthProvider initialUser={{
        id: 'user-1',
        name: 'Tester',
        inviteCode: 'ABC123',
        color: '#ec4899',
        createdAt: new Date().toISOString(),
      }}>
        <RoutineBlock />
      </AuthProvider>
    );
    fireEvent.click(screen.getByLabelText('Routine header'));
    expect(screen.getByText(/Edit Routine Blocks/i)).toBeInTheDocument();
  });
});
