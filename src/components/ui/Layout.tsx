import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { LogOut, Heart, Users, Settings } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

// 🏠 Main Layout - Your digital home base with style
export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, partner, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-purple-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Title */}
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-2 rounded-lg">
                <Heart className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Couples To-Do
                </h1>
                <p className="text-xs text-gray-500">
                  🤖 Powered by Jarvis-level organization
                </p>
              </div>
            </div>

            {/* User Info and Actions */}
            <div className="flex items-center space-x-4">
              {partner && (
                <div className="flex items-center space-x-2 bg-purple-100 px-3 py-1 rounded-full">
                  <Users className="h-4 w-4 text-purple-600" />
                  <span className="text-sm text-purple-800 font-medium">
                    Connected with {partner.name}
                  </span>
                </div>
              )}
              
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                  <p className="text-xs text-gray-500">
                    Code: <span className="font-mono bg-gray-100 px-1 rounded">{user?.inviteCode}</span>
                  </p>
                </div>
                
                <button
                  onClick={logout}
                  className="btn-secondary !p-2"
                  title="Logout"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Jarvis-style Help Bubble */}
      <div className="fixed bottom-6 right-6 z-40">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-3 rounded-full shadow-lg hover:shadow-xl transition-shadow cursor-pointer group">
          <div className="h-6 w-6 flex items-center justify-center">
            🤖
          </div>
          
          {/* Tooltip */}
          <div className="absolute bottom-full right-0 mb-2 w-64 bg-gray-900 text-white text-sm rounded-lg p-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <div className="absolute bottom-0 right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900 transform translate-y-full"></div>
            <p className="font-medium mb-1">🧠 ADHD-Friendly Tips:</p>
            <ul className="text-xs space-y-1">
              <li>• Priority A = "Do this NOW or face chaos" 🔥</li>
              <li>• Drag tasks between days like a productivity wizard 🧙‍♀️</li>
              <li>• Share tasks with your partner for ultimate teamwork 💪</li>
              <li>• Color-code everything because pretty = productive ✨</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};