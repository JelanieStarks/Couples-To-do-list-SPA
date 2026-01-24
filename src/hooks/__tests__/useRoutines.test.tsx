import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { useRoutines } from '../useRoutines';
import { AuthProvider } from '../../contexts/AuthContext';

const Harness: React.FC<{ onReady: (api: ReturnType<typeof useRoutines>) => void }> = ({ onReady }) => {
  const api = useRoutines();
  React.useEffect(() => { onReady(api); }, [api, onReady]);
  return <div data-testid="routines-harness">ready</div>;
};

describe('useRoutines', () => {
  it('creates a default routine and saves updates', () => {
    let api: ReturnType<typeof useRoutines> | null = null;
    render(
      <AuthProvider>
        <Harness onReady={(next) => { api = next; }} />
      </AuthProvider>
    );

    expect(screen.getByTestId('routines-harness')).toBeInTheDocument();
    expect(api).toBeTruthy();

    const member = api!.members[0];
    const routine = api!.getRoutine(member.id);
    expect(routine).toBeTruthy();

    act(() => {
      api!.saveRoutine(member, [
        { id: 'b1', title: 'Focus', startTime: '08:00', endTime: '10:00', notes: '', tasks: [] },
      ]);
    });

    const updated = api!.getRoutine(member.id);
    expect(updated?.blocks.length).toBeGreaterThan(0);
  });
});
