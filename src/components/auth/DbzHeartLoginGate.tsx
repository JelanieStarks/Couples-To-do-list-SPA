import React, { useState } from 'react';
import { ArrowRight, Heart, LockKeyhole, Users } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

type FormMode = 'sign-in' | 'sign-up';

export const DbzHeartLoginGate: React.FC = () => {
  const {
    authMode,
    authError,
    authNotice,
    clearAuthFeedback,
    login,
    signIn,
    signUp,
  } = useAuth();
  const [formMode, setFormMode] = useState<FormMode>('sign-in');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });

  const updateField = (field: keyof typeof form, value: string) => {
    clearAuthFeedback();
    setForm(previous => ({ ...previous, [field]: value }));
  };

  const switchMode = (next: FormMode) => {
    clearAuthFeedback();
    setFormMode(next);
  };

  const canSubmit = authMode === 'demo'
    ? Boolean(form.name.trim())
    : Boolean(
        form.email.trim()
        && form.password.length >= 8
        && (formMode === 'sign-in' || form.name.trim()),
      );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    setIsSubmitting(true);
    try {
      if (authMode === 'demo') {
        await login(form.name, form.email);
      } else if (formMode === 'sign-up') {
        await signUp(form.name, form.email, form.password);
      } else {
        await signIn(form.email, form.password);
      }
    } catch {
      // AuthContext exposes a friendly error message in the form.
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-xl">
        <div className="neon-hype-panel rainbow-crunch-border p-8 md:p-10">
          <div className="flex flex-col items-center text-center mb-8">
            <div className="h-24 w-24 mb-6 rounded-2xl flex items-center justify-center bg-gradient-to-br from-indigo-700 via-fuchsia-700 to-pink-700 shadow-lg shadow-indigo-900/40 border border-indigo-400/30">
              <Heart className="h-14 w-14 text-pink-300 drop-shadow" />
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-wide bg-gradient-to-r from-indigo-300 via-fuchsia-300 to-pink-300 bg-clip-text text-transparent mb-3">
              Couples To-Do
            </h1>
            <p className="text-slate-300 text-base md:text-lg tracking-wide">
              Plan the week. Share the load. Protect the peace. 💞
            </p>
          </div>

          {authMode === 'supabase' && (
            <div className="grid grid-cols-2 gap-2 mb-7 p-1 rounded-xl bg-slate-900/60 border border-slate-700">
              <button
                type="button"
                className="neon-action-button"
                data-variant={formMode === 'sign-in' ? undefined : 'soft'}
                onClick={() => switchMode('sign-in')}
              >
                Sign In
              </button>
              <button
                type="button"
                className="neon-action-button"
                data-variant={formMode === 'sign-up' ? undefined : 'soft'}
                onClick={() => switchMode('sign-up')}
              >
                Create Account
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {(authMode === 'demo' || formMode === 'sign-up') && (
              <div className="glow-field-stack">
                <label htmlFor="name">Your Name</label>
                <input
                  id="name"
                  type="text"
                  required
                  autoComplete="name"
                  className="glow-form-input"
                  placeholder="Player One"
                  value={form.name}
                  onChange={event => updateField('name', event.target.value)}
                />
                <div className="glow-ambient-orb" />
              </div>
            )}

            <div className="glow-field-stack">
              <label htmlFor="email">Email{authMode === 'demo' ? ' (optional)' : ''}</label>
              <input
                id="email"
                type="email"
                required={authMode === 'supabase'}
                autoComplete="email"
                className="glow-form-input"
                placeholder="you@example.com"
                value={form.email}
                onChange={event => updateField('email', event.target.value)}
              />
              <div className="glow-ambient-orb" />
            </div>

            {authMode === 'supabase' && (
              <div className="glow-field-stack">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete={formMode === 'sign-up' ? 'new-password' : 'current-password'}
                  className="glow-form-input"
                  placeholder="At least 8 characters"
                  value={form.password}
                  onChange={event => updateField('password', event.target.value)}
                />
                <div className="glow-ambient-orb" />
              </div>
            )}

            {authError && (
              <div role="alert" className="rounded-xl border border-rose-500/40 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
                {authError}
              </div>
            )}
            {authNotice && (
              <div role="status" className="rounded-xl border border-emerald-500/40 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200">
                {authNotice.message}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !canSubmit}
              className="neon-action-button w-full !text-sm md:!text-base !py-4 !rounded-2xl"
              data-size="lg"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-3">
                  <span className="h-5 w-5 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
                  Working on it…
                </span>
              ) : (
                <span className="flex items-center gap-3 tracking-wide">
                  {authMode === 'demo' ? 'Enter the Dashboard' : formMode === 'sign-up' ? 'Create Our Home' : 'Sign In'}
                  <ArrowRight className="h-5 w-5" />
                </span>
              )}
            </button>
          </form>

          <div className="mt-8 rounded-xl border border-slate-700 bg-slate-900/45 p-4 flex gap-3">
            {authMode === 'supabase'
              ? <LockKeyhole className="h-5 w-5 text-emerald-300 shrink-0" />
              : <Users className="h-5 w-5 text-amber-300 shrink-0" />}
            <div>
              <p className="text-sm font-semibold text-slate-200">
                {authMode === 'supabase' ? 'Private household account' : 'Local demo mode'}
              </p>
              <p className="text-xs leading-relaxed text-slate-400 mt-1">
                {authMode === 'supabase'
                  ? 'Your partner joins later using the invite code inside the app.'
                  : 'Supabase is not configured, so this browser keeps the demo data only on this device.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
