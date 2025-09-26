import React, { useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { LogOut, Heart, Users, Menu } from 'lucide-react';
import { SideDrawer } from './SideDrawer';
import { TopNavPanel } from './TopNavPanel';

interface LayoutProps {
  children: React.ReactNode;
}

// 🏠 Main Layout - Your digital home base with style
export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, partner, logout } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [topNavActive, setTopNavActive] = useState<null | 'ai' | 'partner' | 'settings'>(null);

  const mainRef = useRef<HTMLDivElement | null>(null);
  const scrollToMain = () => mainRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const [copied, setCopied] = useState(false);
  const copyInvite = async () => {
    if (!user?.inviteCode) return;
    try {
      // Fallback for environments without clipboard API
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(user.inviteCode);
      } else {
        const ta = document.createElement('textarea');
        ta.value = user.inviteCode;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  const toggleDrawer = () => setDrawerOpen(o => !o);

  return (
  <div className="min-h-screen flex flex-col items-center bg-transparent">
      {/* Fixed App Header (contains hamburger + app title + user block) */}
      <header className="fixed top-0 left-0 right-0 z-[60] w-full flex justify-center" data-tag="app-header">
        {/* Corner controls with safe-area padding (do not overlap central content) */}
        <div className="absolute inset-x-0 top-0 h-16 pointer-events-none z-[65]">
          <button
            onClick={toggleDrawer}
            className="icon-btn-neon pointer-events-auto absolute"
            aria-label={drawerOpen ? 'Close menu' : 'Open menu'}
            data-testid="hamburger-btn"
            data-tag="hamburger"
            style={{
              top: 'calc(env(safe-area-inset-top, 0px) + 8px)',
              left: 'calc(env(safe-area-inset-left, 0px) + 12px)'
            }}
          >
            <Menu className="h-5 w-5 sm:h-5 sm:w-5" />
          </button>
          {/** Logout button moved back into the right user block below */}
        </div>
        <div className="w-full max-w-[80vw] px-4 sm:px-6">
          <div className="flex justify-between items-center h-16">
            {/* Left: App identity (hamburger moved to absolute rail) */}
            <div className="flex items-center space-x-3" data-tag="header-left">
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold text-slate-100 tracking-wide">
                  Couples To-Do
                </h1>
                <p className="text-[10px] text-slate-400 tracking-wide">
                  🤖 Jarvis-level organization
                </p>
              </div>
            </div>

            {/* Right: Partner pill (if any) + User name + invite code (logout moved to absolute rail) */}
            <div className="flex items-center space-x-4" data-tag="header-right">
              {partner && (
                <div className="hidden md:flex items-center space-x-2 bg-slate-800/70 px-3 py-1 rounded-full border border-slate-600">
                  <Users className="h-4 w-4 text-indigo-400" />
                  <span className="text-xs text-slate-300 font-medium tracking-wide">
                    {partner.name}
                  </span>
                </div>
              )}
              <div className="flex items-center space-x-3" data-tag="user-block">
                {/* User identity + invite code */}
                <div className="text-right" data-tag="user-identifiers">
                  <p className="text-sm font-medium text-slate-100">{user?.name}</p>
                  <p className="text-[10px] text-slate-500 flex items-center gap-2">
                    Code: <span className="font-mono bg-slate-800 px-1 rounded border border-slate-600">{user?.inviteCode}</span>
                    <button
                      type="button"
                      onClick={copyInvite}
                      className="px-2 py-[2px] rounded border border-slate-600 text-slate-300 hover:border-indigo-400 hover:text-white transition"
                      title="Copy invite code"
                      data-testid="copy-invite"
                    >Copy</button>
                    {copied && <span className="text-emerald-400">Copied!</span>}
                  </p>
                </div>
                {/* Logout button inside user block */}
                <button
                  onClick={logout}
                  className="icon-btn-neon"
                  title="Logout"
                  data-tag="logout-button"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

  {/* Top slide-down fallback panel (very visible) */}
  <TopNavPanel open={drawerOpen} onClose={() => setDrawerOpen(false)} active={topNavActive} onChangeActive={setTopNavActive} />

  {/* Spacer to offset fixed header height (16 = 64px) plus a tiny buffer for corner buttons on very small screens */}
  <div className="h-16 sm:h-16 w-full" aria-hidden="true" style={{ paddingTop: '4px' }} />

      {/* Main Content */}
      <main ref={mainRef} className="w-full flex justify-center py-8 px-4 sm:px-6">
        <div className="w-full max-w-[80vw] space-y-8">
          {children}
        </div>
      </main>

      {/* Global Footer */}
      <footer className="mt-auto w-full flex justify-center pb-8 px-4 sm:px-6">
        <div className="w-full max-w-[80vw] text-center text-slate-400 text-xs leading-relaxed">
          <div>
            © {new Date().getFullYear()} StarkServices&Systems
          </div>
          <div className="mt-1 text-slate-500">
            Made lovingly by Jelani Starks for his beautiful wife Tachyana, a free way to help couples stay organized with ADHD
          </div>
        </div>
      </footer>

      {/* Jarvis-style Help Bubble */}
      <div className="fixed bottom-6 right-6 z-40" data-tag="help-bubble">
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
  <SideDrawer
    open={drawerOpen}
    onClose={() => setDrawerOpen(false)}
    variant="drawer"
    onOpenTopCard={(k) => { setTopNavActive(k); }}
    onGoToSection={(k) => {
      // Smooth scroll to main sections (top of main for dashboard; bottom for planner hint)
      scrollToMain();
    }}
  />
    </div>
  );
};
