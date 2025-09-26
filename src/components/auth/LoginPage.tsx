import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Heart, Users, ArrowRight } from 'lucide-react';

// 🔐 Login Page - Neon Gamified Experience
export const LoginPage: React.FC = () => {
  const { login, linkPartner } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showPartnerLink, setShowPartnerLink] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    inviteCode: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    setIsLoading(true);
    try {
      await login(formData.name.trim(), formData.email.trim());
      if (formData.inviteCode.trim()) {
        await linkPartner(formData.inviteCode.trim());
      }
    } catch (err) {
      console.error('Login failed', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-xl relative">
        <div className="panel-neon panel-neon-border p-8 md:p-10">
          <div className="flex flex-col items-center text-center mb-8">
            <div className="relative mb-6">
              <div className="h-24 w-24 rounded-2xl flex items-center justify-center bg-gradient-to-br from-indigo-700 via-fuchsia-700 to-pink-700 shadow-lg shadow-indigo-900/40 border border-indigo-400/30">
                <Heart className="h-14 w-14 text-pink-300 drop-shadow" />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-wide bg-gradient-to-r from-indigo-300 via-fuchsia-300 to-pink-300 bg-clip-text text-transparent mb-3">
              Couples To-Do
            </h1>
            <p className="text-slate-300 text-base md:text-lg tracking-wide">
              🤖 Organize together. Shine brighter.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-7">
            {/* Name Field */}
            <div className="neon-field">
              <label htmlFor="name">Your Name</label>
              <input
                id="name"
                type="text"
                required
                autoComplete="name"
                className="neon-input"
                placeholder="Player One"
                value={formData.name}
                onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
              />
              <div className="neon-glow-ambient" />
            </div>

            {/* Email Field */}
            <div className="neon-field">
              <label htmlFor="email">Email (optional)</label>
              <input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                className="neon-input"
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))}
              />
              <div className="neon-glow-ambient" />
            </div>

            {/* Partner Code Toggle */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Partner Invite Code</span>
                <button
                  type="button"
                  aria-expanded={showPartnerLink}
                  aria-controls="partner-section"
                  onClick={() => setShowPartnerLink(v => !v)}
                  className="btn-neon" data-size="sm" data-variant="soft"
                >
                  {showPartnerLink ? 'Hide' : 'Add'}
                </button>
              </div>
              {showPartnerLink && (
                <div id="partner-section" className="neon-field animate-fade-in">
                  <label htmlFor="inviteCode">Invite Code</label>
                  <input
                    id="inviteCode"
                    type="text"
                    maxLength={6}
                    className="neon-input font-mono tracking-widest uppercase"
                    placeholder="ABC123"
                    value={formData.inviteCode}
                    onChange={(e) => setFormData(p => ({ ...p, inviteCode: e.target.value.toUpperCase() }))}
                  />
                  <div className="neon-glow-ambient" />
                  <p className="text-[11px] text-slate-500 mt-2 tracking-wide">Share + link = synced superpowers 💫</p>
                </div>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading || !formData.name.trim()}
              className="btn-neon w-full !text-sm md:!text-base !py-4 !rounded-2xl relative overflow-hidden"
              data-size="lg"
            >
              {isLoading ? (
                <div className="flex items-center gap-3">
                  <div className="h-5 w-5 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
                  <span>Booting Jarvis...</span>
                </div>
              ) : (
                <span className="flex items-center gap-3 tracking-wide">
                  <span>Enter The Dashboard</span>
                  <ArrowRight className="h-5 w-5" />
                </span>
              )}
            </button>
          </form>

          {/* Feature Panels */}
          <div className="mt-10 grid sm:grid-cols-2 gap-4">
            <div className="relative panel-neon !p-4 rounded-xl">
              <div className="flex items-start gap-3">
                <div className="icon-btn-neon !w-9 !h-9">
                  <Users className="h-4 w-4" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold tracking-wide text-slate-200">Sync As One</h3>
                  <p className="text-[11px] leading-relaxed text-slate-400">Link with a code & instantly share tasks.</p>
                </div>
              </div>
            </div>
            <div className="relative panel-neon !p-4 rounded-xl">
              <div className="flex items-start gap-3">
                <div className="icon-btn-neon !w-9 !h-9">
                  <span className="text-base">🧠</span>
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold tracking-wide text-slate-200">ADHD Friendly</h3>
                  <p className="text-[11px] leading-relaxed text-slate-400">Low-noise visuals & priority clarity.</p>
                </div>
              </div>
            </div>
          </div>
          <p className="mt-8 text-center text-[11px] text-slate-500 tracking-wide">
            No passwords needed. We keep it simple & local first.
          </p>
        </div>
      </div>
    </div>
  );
};
