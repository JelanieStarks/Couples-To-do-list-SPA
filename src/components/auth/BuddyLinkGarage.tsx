/**
 * BuddyLinkGarage
 * Pit-stop control room for invite codes, partner linking, and color picks.
 * Lives inside AuthProvider land so partner state stays synced.
 */
import React, { useState } from 'react';
import { Users, Copy, Check, UserPlus, Unlink, Share } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export const BuddyLinkGarage: React.FC = () => {
  const { user, partner, authMode, authError, authNotice, linkPartner, unlinkPartner, updateUser } = useAuth();
  const [inviteCodeEntry, setInviteCodeEntry] = useState('');
  const [isLinkingPartner, setIsLinkingPartner] = useState(false);
  const [isLinkFormVisible, setIsLinkFormVisible] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const copyInviteToClipboard = async () => {
    if (!user?.inviteCode) return;
    try {
      await navigator.clipboard.writeText(user.inviteCode);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy invite code:', error);
    }
  };

  const linkPartnerByCode = async (event: React.FormEvent) => {
    event.preventDefault();
    const code = inviteCodeEntry.trim();
    if (!code) return;

    setIsLinkingPartner(true);
    try {
      const success = await linkPartner(code);
      if (success) {
        setInviteCodeEntry('');
        setIsLinkFormVisible(false);
      } else {
        alert('🤖 Oops! That invite code seems to be playing hide and seek. Double-check it and try again!');
      }
    } catch (error) {
      console.error('Failed to link partner:', error);
      alert('🤖 Houston, we have a problem! Try again in a moment.');
    } finally {
      setIsLinkingPartner(false);
    }
  };

  const unlinkPartnerWithConfirm = () => {
    if (confirm('Are you sure you want to disconnect from your partner? This will stop sharing tasks between you.')) {
      unlinkPartner();
    }
  };

  return (
    <div className="neon-hype-panel rainbow-crunch-border rounded-xl p-4 sm:p-6 text-slate-100">
      <div className="flex items-center space-x-3 mb-6">
        <div className="bg-gradient-to-r from-purple-100 to-pink-100 p-2 rounded-lg">
          <Users className="h-6 w-6 text-purple-600" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-slate-100">Partner Connection</h2>
          <p className="text-sm text-slate-400">🤖 Because teamwork makes the dream work!</p>
        </div>
      </div>

      {partner ? (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-green-100 p-2 rounded-full">
                  <Check className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-green-900">Connected with {partner.name}</p>
                  <p className="text-sm text-green-700">🎉 You're now sharing tasks and conquering life together!</p>
                </div>
              </div>
              <button
                onClick={unlinkPartnerWithConfirm}
                className="text-red-600 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors"
                title="Disconnect partner"
              >
                <Unlink className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-slate-700/60 bg-slate-900/50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-300 mb-1">Your invite code:</p>
                <p className="font-mono text-lg font-bold text-pink-200 bg-slate-950/80 px-3 py-1 rounded border border-slate-600">{user?.inviteCode}</p>
              </div>
              <button
                onClick={copyInviteToClipboard}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                  isCopied ? 'bg-emerald-950 text-emerald-300' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }`}
              >
                {isCopied ? (
                  <>
                    <Check className="h-4 w-4" />
                    <span className="text-sm">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    <span className="text-sm">Copy</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-2">💡 Share this code only with the partner joining your household.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Share className="h-5 w-5 text-blue-600" />
                <h3 className="font-medium text-blue-900">Your Invite Code</h3>
              </div>
              <button
                onClick={copyInviteToClipboard}
                className={`flex items-center space-x-2 px-3 py-1 rounded-lg transition-colors ${
                  isCopied ? 'bg-green-100 text-green-700' : 'bg-blue-100 hover:bg-blue-200 text-blue-700'
                }`}
              >
                {isCopied ? (
                  <>
                    <Check className="h-4 w-4" />
                    <span className="text-sm">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    <span className="text-sm">Copy</span>
                  </>
                )}
              </button>
            </div>
            <p className="font-mono text-xl font-bold text-cyan-200 bg-slate-950/80 px-4 py-2 rounded border border-slate-600 text-center">{user?.inviteCode}</p>
            <p className="text-sm text-cyan-200/80 mt-2">📱 Share this code with your partner to start collaborating!</p>
          </div>

          <div className="border-t pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-slate-200">Connect with Partner</h3>
              <button
                onClick={() => setIsLinkFormVisible(!isLinkFormVisible)}
                className="flex items-center space-x-2 text-purple-600 hover:text-purple-700 font-medium"
              >
                <UserPlus className="h-4 w-4" />
                <span>{isLinkFormVisible ? 'Cancel' : 'Enter Code'}</span>
              </button>
            </div>

            {isLinkFormVisible && (
              <form onSubmit={linkPartnerByCode} className="animate-slide-up">
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    placeholder={authMode === 'supabase' ? 'ABCD2345' : 'ABC123'}
                    className="min-w-0 w-full flex-1 px-4 py-2 border border-slate-600 bg-slate-950/80 text-slate-100 placeholder:text-slate-500 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent font-mono uppercase"
                    maxLength={authMode === 'supabase' ? 8 : 6}
                    value={inviteCodeEntry}
                    onChange={(event) => setInviteCodeEntry(event.target.value.toUpperCase())}
                  />
                  <button
                    type="submit"
                    disabled={isLinkingPartner || !inviteCodeEntry.trim()}
                    className="neon-action-button !py-2 w-full sm:w-auto shrink-0"
                  >
                    {isLinkingPartner ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    ) : (
                      'Connect'
                    )}
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Enter your partner&apos;s {authMode === 'supabase' ? '8' : '6'}-character invite code to link your accounts.
                </p>
                {authError && <p role="alert" className="text-xs text-red-600 mt-2">{authError}</p>}
                {authNotice && <p role="status" className="text-xs text-green-700 mt-2">{authNotice.message}</p>}
              </form>
            )}
          </div>
        </div>
      )}

      <div className="border-t pt-6 mt-6">
        <h3 className="font-medium text-slate-200 mb-4">🎨 Color Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Your color (for "Me" tasks)</label>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg border-2 border-gray-300" style={{ backgroundColor: user?.color || '#ec4899' }} />
              <div className="flex flex-wrap gap-2">
                {['#ec4899', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ef4444', '#06b6d4'].map((color) => (
                  <button
                    key={color}
                    onClick={() => updateUser({ color })}
                    className={`w-6 h-6 rounded border-2 transition-transform hover:scale-110 ${
                      user?.color === color ? 'border-gray-400 scale-110' : 'border-gray-200'
                    }`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>
          </div>

          {partner && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Partner's color</label>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg border-2 border-gray-300" style={{ backgroundColor: partner.color || '#3b82f6' }} />
                <span className="text-sm text-slate-400">{partner.name}'s chosen color</span>
              </div>
            </div>
          )}

          {partner && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-300 mb-2">"Both" tasks preview</label>
              <div
                className="h-8 rounded-lg border-2 border-gray-200"
                style={{ background: `linear-gradient(to right, ${user?.color || '#ec4899'}, ${partner.color || '#3b82f6'})` }}
              />
              <p className="text-xs text-slate-400 mt-1">Tasks assigned to "Both" will use this gradient</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};
