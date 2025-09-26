import React, { useEffect, useState } from 'react';
import { Brain, User2, Settings, X } from 'lucide-react';
import { AIImport } from '../tasks/AIImport';
import { PartnerManager } from '../auth/PartnerManager';
import ExportTasks from '../tasks/ExportTasks';
import { storage } from '../../utils';

interface TopNavPanelProps {
  open: boolean;
  onClose: () => void;
  // Optional controlled active card key
  active?: null | 'ai' | 'partner' | 'settings';
  onChangeActive?: (next: null | 'ai' | 'partner' | 'settings') => void;
}

// Simple slide-down nav panel as a visible fallback
export const TopNavPanel: React.FC<TopNavPanelProps> = ({ open, onClose, active, onChangeActive }) => {
  const [internalActive, setInternalActive] = useState<null | 'ai' | 'partner' | 'settings'>(null);
  const controlled = typeof active !== 'undefined';
  const current = controlled ? active! : internalActive;
  const setActive = (next: null | 'ai' | 'partner' | 'settings') => {
    if (onChangeActive) onChangeActive(next);
    if (!controlled) setInternalActive(next);
  };

  return (
    <div
      data-testid="top-nav-panel"
      className={[
        'fixed left-0 right-0 z-[85] flex justify-center',
        'transition-transform duration-300 ease-out',
        open ? 'translate-y-0' : '-translate-y-full',
      ].join(' ')}
      aria-hidden={!open}
    >
      <div className="w-full max-w-[80vw] mx-auto px-4 sm:px-6">
        <div className="mt-16 panel-neon panel-neon-border rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/60">
            <h3 className="text-sm font-semibold tracking-wider text-slate-200 uppercase">Quick Menu</h3>
            <button onClick={onClose} className="icon-btn-neon" aria-label="Close quick menu"><X className="h-4 w-4" /></button>
          </div>
          <nav className="px-2 py-3">
            <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm font-semibold tracking-wide">
              {[
                { icon: Brain, label: 'AI Import', key: 'ai' },
                { icon: User2, label: 'Partner', key: 'partner' },
                { icon: Settings, label: 'Settings', key: 'settings' },
              ].map(({ icon: Icon, label, key }) => (
                <li key={label}>
                  <button
                    className="w-full btn-neon"
                    data-variant="soft"
                    onClick={() => setActive(key as any)}
                    data-testid={`topnav-btn-${key}`}
                  >
                    <Icon className="h-4 w-4 opacity-80" /> {label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* Active content card */}
          {current && (
            <div className="px-3 pb-4">
              <div className="panel-neon panel-neon-border mt-2" data-testid={`topnav-card-${current}`}>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold tracking-wide text-slate-200 capitalize">
                    {current === 'ai' && 'AI Task Import'}
                    {current === 'partner' && 'Partner Connection'}
                    {current === 'settings' && 'Settings'}
                  </h4>
                  <button className="icon-btn-neon" onClick={() => setActive(null)} aria-label="Close card">✕</button>
                </div>
                <div className="space-y-3">
                  {current === 'ai' && (<AIImport />)}
                  {current === 'partner' && (<PartnerManager />)}
                  {current === 'settings' && (
                    <>
                      <ExportTasks />
                      <div className="pt-2 border-t border-slate-700/60">
                        <button
                          className="btn-neon"
                          data-variant="outline"
                          data-size="sm"
                          onClick={() => {
                            if (confirm('Clear all local data? This will remove users, partner link, and tasks.')) {
                              storage.clearAll();
                              // reload app to reflect cleared state
                              window.location.reload();
                            }
                          }}
                          data-testid="clear-data"
                        >
                          🧹 Clear All Local Data
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
