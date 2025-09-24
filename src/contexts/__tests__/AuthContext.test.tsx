import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';

const Harness: React.FC<{onReady:(api:any)=>void}> = ({ onReady }) => {
  const api = useAuth();
  React.useEffect(()=>{ onReady(api); },[api,onReady]);
  return <div data-testid="auth-harness">ready</div>;
};

describe('AuthContext', () => {
  let ctx: any;
  beforeEach(() => {
    localStorage.clear();
    ctx = null;
    render(
      <AuthProvider>
        <Harness onReady={(api)=> ctx = api} />
      </AuthProvider>
    );
    expect(screen.getByTestId('auth-harness')).toBeInTheDocument();
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
    render(
      <AuthProvider>
        <Harness onReady={(api)=> ctx = api} />
      </AuthProvider>
    );
    // allow effect flush
    expect(ctx.user).toBeTruthy();
    expect(ctx.user.inviteCode).toBe(storedInvite);
  });
});
