import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';
import { getSupabaseClient, isSupabaseAuthEnabled } from '../../utils/supabaseClient';

vi.mock('../../utils/supabaseClient', () => ({
  getSupabaseClient: vi.fn(),
  isSupabaseAuthEnabled: vi.fn(),
}));

const Harness: React.FC<{onReady:(api:any)=>void}> = ({ onReady }) => {
  const api = useAuth();
  React.useEffect(()=>{ onReady(api); },[api,onReady]);
  return <div data-testid="auth-harness">ready</div>;
};

const renderWithAuth = (onReady: (api: any) => void) => {
  const utils = render(
    <AuthProvider>
      <Harness onReady={onReady} />
    </AuthProvider>
  );
  expect(screen.getByTestId('auth-harness')).toBeInTheDocument();
  return utils;
};

describe('AuthContext', () => {
  let ctx: any;
  let renderUtils: ReturnType<typeof renderWithAuth> | null = null;
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.useRealTimers();
    (getSupabaseClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue(null);
    (isSupabaseAuthEnabled as unknown as ReturnType<typeof vi.fn>).mockReturnValue(false);
    ctx = null;
    renderUtils = renderWithAuth((api) => { ctx = api; });
  });

  it('logs in user and sets invite code', async () => {
    await act(async () => {
      await ctx.login('Alice', 'alice@example.com');
    });
    expect(ctx.user).toBeTruthy();
    expect(ctx.user.name).toBe('Alice');
    expect(ctx.user.inviteCode).toHaveLength(6);
    expect(ctx.isAuthenticated).toBe(true);
  });

  it('links a partner with valid code', async () => {
    await act(async () => { await ctx.login('Alice'); });
    const code = 'ABC123';
    let result: boolean = false;
    await act(async () => { result = await ctx.linkPartner(code); });
    expect(result).toBe(true);
    expect(ctx.partner).toBeTruthy();
    expect(ctx.user.partnerId).toBe(ctx.partner.id);
  });

  it('rejects invalid partner code', async () => {
    await act(async () => { await ctx.login('Alice'); });
    let result = true;
    await act(async () => { result = await ctx.linkPartner('BAD'); });
    expect(result).toBe(false);
    expect(ctx.partner).toBeNull();
  });

  it('logout clears user and partner', async () => {
    await act(async () => { await ctx.login('Alice'); });
    await act(async () => { await ctx.linkPartner('ABC123'); });
    act(() => ctx.logout());
    expect(ctx.user).toBeNull();
    expect(ctx.partner).toBeNull();
    expect(ctx.isAuthenticated).toBe(false);
  });

  it('persists user across re-mount', async () => {
    await act(async () => { await ctx.login('Persist'); });
    const storedInvite = ctx.user.inviteCode;
    // Re-mount
    renderUtils?.unmount();
    renderWithAuth((api) => { ctx = api; });
    // allow effect flush
    expect(ctx.user).toBeTruthy();
    expect(ctx.user.inviteCode).toBe(storedInvite);
  });

  it('does not use the retired magic-link sync flow', async () => {
    let result = true;
    await act(async () => {
      result = await ctx.requestMagicLinkForSync();
    });
    expect(result).toBe(false);
    expect(ctx.magicLinkNotice).toBeNull();
  });
});
