import React, { useEffect, useState } from 'react';
import { Brain, User2, Settings, X, Trash2 } from 'lucide-react';
import { AIImport } from '../tasks/AIImport';
import { PartnerManager } from '../auth/PartnerManager';
import ExportTasks from '../tasks/ExportTasks';
import DeletedTasks from '../tasks/DeletedTasks';
import { STORAGE_KEYS, storage } from '../../utils';

interface TopNavPanelProps {
  open: boolean;
  onClose: () => void;
  // Optional controlled active card key
  active?: null | 'ai' | 'partner' | 'settings' | 'deleted';
  onChangeActive?: (next: null | 'ai' | 'partner' | 'settings' | 'deleted') => void;
}

// Simple slide-down nav panel as a visible fallback
export const TopNavPanel: React.FC<TopNavPanelProps> = ({ open, onClose, active, onChangeActive }) => {
  const [internalActive, setInternalActive] = useState<null | 'ai' | 'partner' | 'settings' | 'deleted'>(null);
  const controlled = typeof active !== 'undefined';
  const current = controlled ? active! : internalActive;
  const setActive = (next: null | 'ai' | 'partner' | 'settings' | 'deleted') => {
    if (onChangeActive) onChangeActive(next);
    if (!controlled) setInternalActive(next);
  };

  // Text size state (shared for Settings card)
  const [textScale, setTextScale] = useState<number>(() => {
    try {
      const settings = storage.get<any>(STORAGE_KEYS.SETTINGS) || {};
      return typeof settings.textScale === 'number' ? settings.textScale : 1;
    } catch { return 1; }
  });

  const applyTextScale = (v: number) => {
    setTextScale(v);
    document.documentElement.style.setProperty('--font-scale', String(v));
    try {
      const settings = storage.get<any>(STORAGE_KEYS.SETTINGS) || {};
      storage.set(STORAGE_KEYS.SETTINGS, { ...settings, textScale: v });
    } catch {}
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
        <div className="mt-16 panel-neon panel-neon-border rounded-2xl overflow-hidden max-h-[80vh]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/60">
            <h3 className="text-sm font-semibold tracking-wider text-slate-200 uppercase">Quick Menu</h3>
            <button onClick={onClose} className="icon-btn-neon" aria-label="Close quick menu"><X className="h-4 w-4" /></button>
          </div>
          {/* Scrollable content area (keeps quick menu frame stationary) */}
          <div className="overflow-y-auto max-h-[70vh]">
            <nav className="px-2 py-3">
              <ul className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm font-semibold tracking-wide">
                {[
                  { icon: Brain, label: 'AI Import', key: 'ai' },
                  { icon: User2, label: 'Partner', key: 'partner' },
                  { icon: Settings, label: 'Settings', key: 'settings' },
                  { icon: Trash2, label: 'Deleted', key: 'deleted' },
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
                        {/* Text Size Controls */}
                        <div className="pt-3 border-t border-slate-700/60">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Text Size</div>
                              <div className="text-[10px] text-slate-500">Adjust app-wide font scale</div>
                            </div>
                            <div className="btn-row max-w-[360px]">
                              {[{label:'S',v:0.9},{label:'D',v:1},{label:'L',v:1.1},{label:'XL',v:1.2}].map(({label,v}) => (
                                <button
                                  key={label}
                                  className="btn-neon"
                                  data-size="sm"
                                  data-variant="soft"
                                  onClick={() => applyTextScale(v)}
                                  data-testid={`textsize-${label}`}
                                  title={`Set text size to ${label}`}
                                >{label}</button>
                              ))}
                            </div>
                          </div>
                          {/* Range slider for fine-grained control */}
                          <div className="mt-3">
                            <label htmlFor="text-size-range" className="block text-[10px] text-slate-400 mb-1">Scale: {textScale.toFixed(2)}x</label>
                            <input
                              id="text-size-range"
                              type="range"
                              min={0.85}
                              max={1.3}
                              step={0.05}
                              value={textScale}
                              onChange={(e) => applyTextScale(parseFloat(e.target.value))}
                              className="w-full"
                              data-testid="textsize-range"
                            />
                          </div>
                        </div>

                        <div className="pt-3 border-t border-slate-700/60">
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
                    {current === 'deleted' && (
                      <>
                        <DeletedTasks />
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
