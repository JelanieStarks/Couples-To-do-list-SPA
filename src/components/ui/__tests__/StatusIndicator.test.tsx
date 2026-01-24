import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Layout } from '../Layout';

vi.mock('../SideDrawer', () => ({
  SideDrawer: () => null,
}));

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { name: 'Jess', inviteCode: 'ABC123' },
    partner: { name: 'Family' },
    logout: vi.fn(),
    magicLinkNotice: { message: 'Magic link sent', sentAt: new Date().toISOString() },
  }),
}));

vi.mock('../../../contexts/TaskContext', () => ({
  useTask: () => ({
    syncNow: vi.fn(),
    peerSync: { status: { state: 'connected' } },
  }),
}));

describe('Status indicators', () => {
  it('shows magic link sent and partner connection status', () => {
    render(
      <Layout>
        <div>Child</div>
      </Layout>
    );

    expect(screen.getByText('Magic link sent')).toBeInTheDocument();
    expect(screen.getByText('Partner connected')).toBeInTheDocument();
  });
});
