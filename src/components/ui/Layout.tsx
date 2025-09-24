import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { LogOut, Heart, Users, Menu } from 'lucide-react';
import { SideDrawer } from './SideDrawer';

interface LayoutProps {
  children: React.ReactNode;
}

// 🏠 Main Layout - Your digital home base with style
export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, partner, logout } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
  <div className="min-h-screen flex flex-col items-center bg-transparent">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full flex justify-center">
        <div className="w-full max-w-[80vw] px-4 sm:px-6">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Title */}
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setDrawerOpen(true)}
                className="icon-btn-neon"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="p-2 rounded-lg bg-slate-800 border border-slate-600">
                <Heart className="h-6 w-6 text-indigo-400" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold text-slate-100 tracking-wide">
                  Couples To-Do
                </h1>
                <p className="text-[10px] text-slate-400 tracking-wide">
                  🤖 Jarvis-level organization
                </p>
              </div>
            </div>

            {/* User Info and Actions */}
            <div className="flex items-center space-x-4">
              {partner && (
                <div className="hidden md:flex items-center space-x-2 bg-slate-800/70 px-3 py-1 rounded-full border border-slate-600">
                  <Users className="h-4 w-4 text-indigo-400" />
                  <span className="text-xs text-slate-300 font-medium tracking-wide">
                    {partner.name}
                  </span>
                </div>
              )}
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-slate-100">{user?.name}</p>
                  <p className="text-[10px] text-slate-500">
                    Code: <span className="font-mono bg-slate-800 px-1 rounded border border-slate-600">{user?.inviteCode}</span>
                  </p>
                </div>
                <button
                  onClick={logout}
                  className="icon-btn-neon"
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
      <main className="w-full flex justify-center py-8 px-4 sm:px-6">
        <div className="w-full max-w-[80vw] space-y-8">
          {children}
        </div>
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
      <SideDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
};
