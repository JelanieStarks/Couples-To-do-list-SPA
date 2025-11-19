/**
 * BuddyLinkGarage
 * Pit-stop control room for invite codes, partner linking, and color picks.
 * Lives inside AuthProvider land so partner state stays synced.
 */
import React, { useState } from 'react';
import { Users, Copy, Check, UserPlus, Unlink, Share } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { SyncPanel } from '../sync/SyncPanel';

export const BuddyLinkGarage: React.FC = () => {
  const { user, partner, linkPartner, unlinkPartner, updateUser } = useAuth();
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
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="bg-gradient-to-r from-purple-100 to-pink-100 p-2 rounded-lg">
          <Users className="h-6 w-6 text-purple-600" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Partner Connection</h2>
          <p className="text-sm text-gray-500">🤖 Because teamwork makes the dream work!</p>
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

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Your invite code:</p>
                <p className="font-mono text-lg font-bold text-gray-900 bg-white px-3 py-1 rounded border">{user?.inviteCode}</p>
              </div>
              <button
                onClick={copyInviteToClipboard}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                  isCopied ? 'bg-green-100 text-green-700' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
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
            <p className="text-xs text-gray-500 mt-2">💡 Share this code with friends so they can connect with you!</p>
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
            <p className="font-mono text-xl font-bold text-blue-900 bg-white px-4 py-2 rounded border text-center">{user?.inviteCode}</p>
            <p className="text-sm text-blue-700 mt-2">📱 Share this code with your partner to start collaborating!</p>
          </div>

          <div className="border-t pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-900">Connect with Partner</h3>
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
                <div className="flex space-x-3">
                  <input
                    type="text"
                    placeholder="ABC123"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono uppercase"
                    maxLength={6}
                    value={inviteCodeEntry}
                    onChange={(event) => setInviteCodeEntry(event.target.value.toUpperCase())}
                  />
                  <button
                    type="submit"
                    disabled={isLinkingPartner || !inviteCodeEntry.trim()}
                    className="neon-action-button !py-2"
                  >
                    {isLinkingPartner ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    ) : (
                      'Connect'
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">🤖 Enter your partner's 6-character invite code to link your accounts</p>
              </form>
            )}
          </div>
        </div>
      )}

      <div className="border-t pt-6 mt-6">
        <h3 className="font-medium text-gray-900 mb-4">🎨 Color Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Your color (for "Me" tasks)</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Partner's color</label>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg border-2 border-gray-300" style={{ backgroundColor: partner.color || '#3b82f6' }} />
                <span className="text-sm text-gray-600">{partner.name}'s chosen color</span>
              </div>
            </div>
          )}

          {partner && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">"Both" tasks preview</label>
              <div
                className="h-8 rounded-lg border-2 border-gray-200"
                style={{ background: `linear-gradient(to right, ${user?.color || '#ec4899'}, ${partner.color || '#3b82f6'})` }}
              />
              <p className="text-xs text-gray-500 mt-1">Tasks assigned to "Both" will use this gradient</p>
            </div>
          )}
        </div>
      </div>

      <div className="border-t pt-6 mt-8">
        <h3 className="font-medium text-gray-900 mb-4">🔗 Local Sync &amp; LAN</h3>
        <SyncPanel variant="inline" />
      </div>
    </div>
  );
};
