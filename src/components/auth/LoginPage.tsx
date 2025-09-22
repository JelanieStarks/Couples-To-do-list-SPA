import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Heart, Users, ArrowRight, UserPlus } from 'lucide-react';

// 🔐 Login Page - Where the magic begins
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
      await login(formData.name, formData.email);
      
      // If user provided an invite code, try to link partner
      if (formData.inviteCode.trim()) {
        await linkPartner(formData.inviteCode);
      }
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-4 rounded-full inline-block mb-4">
            <Heart className="h-12 w-12 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Couples To-Do
          </h1>
          <p className="text-gray-600">
            🤖 Your AI-powered productivity partner for two
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                What should we call you? ✨
              </label>
              <input
                type="text"
                id="name"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                placeholder="Your awesome name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email (optional) 📧
              </label>
              <input
                type="email"
                id="email"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                placeholder="your.email@example.com"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>

            {/* Partner Link Section */}
            <div className="border-t pt-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-700">
                  Got a partner's invite code? 👫
                </span>
                <button
                  type="button"
                  onClick={() => setShowPartnerLink(!showPartnerLink)}
                  className="text-purple-600 hover:text-purple-700 text-sm font-medium"
                >
                  {showPartnerLink ? 'Hide' : 'Show'}
                </button>
              </div>
              
              {showPartnerLink && (
                <div className="animate-slide-up">
                  <input
                    type="text"
                    id="inviteCode"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors font-mono uppercase"
                    placeholder="ABC123"
                    maxLength={6}
                    value={formData.inviteCode}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      inviteCode: e.target.value.toUpperCase() 
                    }))}
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    🤖 Jarvis will connect you faster than you can say "couple goals"
                  </p>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || !formData.name.trim()}
              className="w-full btn-primary flex items-center justify-center space-x-2 py-3"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  <span>Let's Get Organized!</span>
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>
          </form>

          {/* Info Cards */}
          <div className="mt-8 space-y-4">
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg">
              <div className="flex items-start space-x-3">
                <div className="bg-purple-100 p-2 rounded-lg">
                  <Users className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-1">
                    Partner Collaboration
                  </h3>
                  <p className="text-sm text-gray-600">
                    Share your invite code with your partner to sync tasks and conquer life together! 💪
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg">
              <div className="flex items-start space-x-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <span className="text-blue-600 text-lg">🧠</span>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-1">
                    ADHD-Friendly Design
                  </h3>
                  <p className="text-sm text-gray-600">
                    Color-coded priorities, gentle animations, and clear visual cues to keep your brain happy.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};