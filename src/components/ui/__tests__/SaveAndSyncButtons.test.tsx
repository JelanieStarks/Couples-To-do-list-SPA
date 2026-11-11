import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Layout } from '../Layout';
const mocked = vi.hoisted(() => ({ save: vi.fn() }));
vi.mock('../../../contexts/TaskContext', () => ({ useTask: () => ({ saveAndSync: mocked.save, peerSync: { status: { state: 'idle' } }, supabaseStatus: {} }) }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { name: 'Lani', inviteCode: 'HOME' }, partner: { name: 'Partner' }, logout: vi.fn() }) }));
vi.mock('../SideDrawer', () => ({ SideDrawer: () => null }));

describe('Save & Sync receipts', () => {
  it('waits for the database result and shows a failed write instead of flashing success', async () => {
    let finish!: (value: any) => void;
    mocked.save.mockReturnValue(new Promise(resolve => { finish = resolve; }));
    render(<Layout><div>Planner</div></Layout>);
    expect(screen.getByTestId('sync-now')).toBeTruthy();
    fireEvent.click(screen.getByTestId('save-and-sync'));
    expect(screen.getByRole('status')).toHaveTextContent('Saving and receiving partner changes');
    expect(screen.getByTestId('save-and-sync')).toBeDisabled();
    await act(async () => finish({ ok: false, cloud: true, message: 'Upload denied; changes remain on this device.', count: 2 }));
    expect(screen.getByRole('status')).toHaveTextContent('Upload denied');
    expect(screen.getByRole('status')).not.toHaveTextContent('tasks confirmed');
  });
});
