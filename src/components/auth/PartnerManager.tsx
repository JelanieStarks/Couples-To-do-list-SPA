import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Users, Copy, Check, UserPlus, Unlink, Share } from 'lucide-react';

// 👫 Partner Management - Connection status and controls
export const PartnerManager: React.FC = () => {
  const { user, partner, linkPartner, unlinkPartner } = useAuth();
  const [inviteCode, setInviteCode] = useState('');
  const [isLinking, setIsLinking] = useState(false);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyInviteCode = async () => {
    if (!user?.inviteCode) return;
    
    try {
      await navigator.clipboard.writeText(user.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy invite code:', error);
    }
  };

  const handleLinkPartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;

    setIsLinking(true);
    try {
      const success = await linkPartner(inviteCode);
      if (success) {
        setInviteCode('');
        setShowLinkForm(false);
      } else {
        alert('🤖 Oops! That invite code seems to be playing hide and seek. Double-check it and try again!');
      }
    } catch (error) {
      console.error('Failed to link partner:', error);
      alert('🤖 Houston, we have a problem! Try again in a moment.');
    } finally {
      setIsLinking(false);
    }
  };

  const handleUnlinkPartner = () => {
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
          <p className="text-sm text-gray-500">
            🤖 Because teamwork makes the dream work!
          </p>
        </div>
      </div>

      {partner ? (
        /* Connected State */
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-green-100 p-2 rounded-full">
                  <Check className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-green-900">
                    Connected with {partner.name}
                  </p>
                  <p className="text-sm text-green-700">
                    🎉 You're now sharing tasks and conquering life together!
                  </p>
                </div>
              </div>
              <button
                onClick={handleUnlinkPartner}
                className="text-red-600 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors"
                title="Disconnect partner"
              >
                <Unlink className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Your Invite Code */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">
                  Your invite code:
                </p>
                <p className="font-mono text-lg font-bold text-gray-900 bg-white px-3 py-1 rounded border">
                  {user?.inviteCode}
                </p>
              </div>
              <button
                onClick={handleCopyInviteCode}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                  copied 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                {copied ? (
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
            <p className="text-xs text-gray-500 mt-2">
              💡 Share this code with friends so they can connect with you!
            </p>
          </div>
        </div>
      ) : (
        /* Not Connected State */
        <div className="space-y-6">
          {/* Your Invite Code */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Share className="h-5 w-5 text-blue-600" />
                <h3 className="font-medium text-blue-900">Your Invite Code</h3>
              </div>
              <button
                onClick={handleCopyInviteCode}
                className={`flex items-center space-x-2 px-3 py-1 rounded-lg transition-colors ${
                  copied 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-blue-100 hover:bg-blue-200 text-blue-700'
                }`}
              >
                {copied ? (
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
            <p className="font-mono text-xl font-bold text-blue-900 bg-white px-4 py-2 rounded border text-center">
              {user?.inviteCode}
            </p>
            <p className="text-sm text-blue-700 mt-2">
              📱 Share this code with your partner to start collaborating!
            </p>
          </div>

          {/* Connect Form */}
          <div className="border-t pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-900">Connect with Partner</h3>
              <button
                onClick={() => setShowLinkForm(!showLinkForm)}
                className="flex items-center space-x-2 text-purple-600 hover:text-purple-700 font-medium"
              >
                <UserPlus className="h-4 w-4" />
                <span>{showLinkForm ? 'Cancel' : 'Enter Code'}</span>
              </button>
            </div>

            {showLinkForm && (
              <form onSubmit={handleLinkPartner} className="animate-slide-up">
                <div className="flex space-x-3">
                  <input
                    type="text"
                    placeholder="ABC123"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono uppercase"
                    maxLength={6}
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  />
                  <button
                    type="submit"
                    disabled={isLinking || !inviteCode.trim()}
                    className="btn-primary !py-2"
                  >
                    {isLinking ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      'Connect'
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  🤖 Enter your partner's 6-character invite code to link your accounts
                </p>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};