/**
 * SideDrawer
 * Slide-out hub for completed tasks, trash, partner linking, sync status, and advanced settings.
 * Supports drawer and full-screen variants with the same neon treatment.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTask } from '../../contexts/TaskContext';
import { CheckCircle2, Trash2, RotateCcw, XCircle, Inbox, LayoutGrid, CalendarDays, User2, Brain, Settings, ChevronDown, RadioTower } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import ExportTasks from '../tasks/ExportTasks';
import { BuddyLinkGarage } from '../auth/BuddyLinkGarage';
import { SyncPanel } from '../sync/SyncPanel';
import { AIImport } from '../tasks/AIImport';
import { STORAGE_KEYS, storage } from '../../utils';
import { emitSettingsEvent } from '../../utils/settings';
import { checkForUpdates } from '../../utils/updates';
import pkg from '../../../package.json';
import { startGoogleConnect } from '../../utils/googleAuth';

const readSettings = () => {
  try {
    return storage.get<any>(STORAGE_KEYS.SETTINGS) || {};
  } catch {
    return {};
  }
};

interface SideDrawerProps {
  open: boolean;
  onClose: () => void;
  // drawer: right-side panel; full: full-screen overlay
  variant?: 'drawer' | 'full';
  onGoToSection?: (key: 'dashboard' | 'planner') => void;
}

// 🛠 Side Drawer - Archive & Deleted Tasks Management
export const SideDrawer: React.FC<SideDrawerProps> = ({ open, onClose, variant = 'drawer', onGoToSection }) => {
  const { getCompletedTasks, getDeletedTasks, restoreTask, hardDeleteTask, toggleTaskComplete } = useTask() as any;
  const completed = getCompletedTasks()
    .slice()
    .sort((a:any,b:any) => {
      if (a.completedAt && b.completedAt) return new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime();
      if (a.completedAt) return -1;
      if (b.completedAt) return 1;
      return 0;
    });
  const deleted = getDeletedTasks()
    .slice()
    .sort((a:any,b:any) => {
      if (a.deletedAt && b.deletedAt) return new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime();
      if (a.deletedAt) return -1;
      if (b.deletedAt) return 1;
      return 0;
    });
  const [showCompleted, setShowCompleted] = useState(true);
  const [showDeleted, setShowDeleted] = useState(true);

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && open) onClose();
  }, [open, onClose]);

  const firstNavItemRef = useRef<HTMLButtonElement | null>(null);
  const resizingRef = useRef(false);
  const dragStateRef = useRef<{ startX: number; startWidth: number }>({ startX: 0, startWidth: 0 });
  const [widthPx, setWidthPx] = useState<number | null>(null);

  type DrawerSectionKey = 'export' | 'ai' | 'partner' | 'sync' | 'settings';
  const sectionRefs: Record<DrawerSectionKey, React.RefObject<HTMLDivElement | null>> = {
    export: useRef<HTMLDivElement | null>(null),
    ai: useRef<HTMLDivElement | null>(null),
    partner: useRef<HTMLDivElement | null>(null),
    sync: useRef<HTMLDivElement | null>(null),
    settings: useRef<HTMLDivElement | null>(null),
  };

  const scrollToSection = (key: DrawerSectionKey) => {
    const ref = sectionRefs[key];
    const el = ref.current;
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const initialSettings = React.useMemo(() => readSettings(), []);
  const [textScale, setTextScale] = useState<number>(() => {
    const saved = initialSettings.textScale;
    return typeof saved === 'number' ? saved : 1;
  });
  const [googleEmbedEnabled, setGoogleEmbedEnabled] = useState<boolean>(() => Boolean(initialSettings.googleCalendar?.enabled));
  const [googleEmbedUrl, setGoogleEmbedUrl] = useState<string>(() => (initialSettings.googleCalendar?.embedUrl as string | undefined) || '');
  const [googleSavedFlash, setGoogleSavedFlash] = useState<'idle' | 'saved'>('idle');
  const [googleConnectStatus, setGoogleConnectStatus] = useState<'disconnected' | 'ready' | 'error'>(() => (initialSettings.googleCalendar?.connectStatus as 'disconnected' | 'ready' | 'error') || 'disconnected');
  const [googleAccountHint, setGoogleAccountHint] = useState<string>(() => (initialSettings.googleCalendar?.accountEmail as string | undefined) || '');
  const [googleSyncEnabled, setGoogleSyncEnabled] = useState<boolean>(() => Boolean(initialSettings.googleCalendar?.syncEnabled));
  const [googleBusy, setGoogleBusy] = useState(false);
  const googleSaveTimeoutRef = useRef<number | null>(null);

  const persistSettings = useCallback((mutator: (prev: Record<string, any>) => Record<string, any>) => {
    const next = mutator(readSettings());
    storage.set(STORAGE_KEYS.SETTINGS, next);
    emitSettingsEvent();
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--font-scale', String(textScale));
    }
  }, [textScale]);

  useEffect(() => {
    return () => {
      if (googleSaveTimeoutRef.current) {
        window.clearTimeout(googleSaveTimeoutRef.current);
      }
    };
  }, []);

  const applyTextScale = useCallback((v: number) => {
    setTextScale(v);
    persistSettings(prev => ({ ...prev, textScale: v }));
  }, [persistSettings]);

  const toggleGoogleEmbed = useCallback(() => {
    setGoogleEmbedEnabled(prev => {
      const next = !prev;
      const trimmed = googleEmbedUrl.trim();
      persistSettings(prevSettings => {
        const currentUrl = (prevSettings.googleCalendar?.embedUrl as string | undefined) || trimmed || undefined;
        return {
          ...prevSettings,
          googleCalendar: {
            ...(prevSettings.googleCalendar || {}),
            enabled: next,
            embedUrl: currentUrl,
          },
        };
      });
      return next;
    });
    setGoogleSavedFlash('idle');
  }, [persistSettings, googleEmbedUrl]);

  const markGoogleConnected = useCallback(() => {
    const email = googleAccountHint.trim() || 'you@example.com';
    setGoogleConnectStatus('ready');
    setGoogleAccountHint(email);
    persistSettings(prev => ({
      ...prev,
      googleCalendar: {
        ...(prev.googleCalendar || {}),
        connectStatus: 'ready',
        accountEmail: email,
        syncEnabled: googleSyncEnabled,
      },
    }));
  }, [googleAccountHint, googleSyncEnabled, persistSettings]);

  const markGoogleDisconnected = useCallback(() => {
    setGoogleConnectStatus('disconnected');
    persistSettings(prev => ({
      ...prev,
      googleCalendar: {
        ...(prev.googleCalendar || {}),
        connectStatus: 'disconnected',
        accountEmail: prev.googleCalendar?.accountEmail,
        syncEnabled: false,
      },
    }));
    setGoogleSyncEnabled(false);
  }, [persistSettings]);

  const toggleGoogleSync = useCallback(() => {
    setGoogleSyncEnabled(prev => {
      const next = !prev;
      persistSettings(prevSettings => ({
        ...prevSettings,
        googleCalendar: {
          ...(prevSettings.googleCalendar || {}),
          syncEnabled: next,
        },
      }));
      return next;
    });
  }, [persistSettings]);

  const handleGoogleConnect = useCallback(async () => {
    try {
      setGoogleBusy(true);
      await startGoogleConnect();
      markGoogleConnected();
    } catch (err) {
      console.warn('google connect failed (stub)', err);
      setGoogleConnectStatus('error');
    } finally {
      setGoogleBusy(false);
    }
  }, [markGoogleConnected]);

  const saveGoogleEmbedUrl = useCallback(() => {
    const trimmed = googleEmbedUrl.trim();
    setGoogleEmbedUrl(trimmed);
    persistSettings(prev => ({
      ...prev,
      googleCalendar: {
        ...(prev.googleCalendar || {}),
        enabled: googleEmbedEnabled,
        embedUrl: trimmed || undefined,
      },
    }));
    setGoogleSavedFlash('saved');
    if (googleSaveTimeoutRef.current) window.clearTimeout(googleSaveTimeoutRef.current);
    googleSaveTimeoutRef.current = window.setTimeout(() => setGoogleSavedFlash('idle'), 1500);
  }, [googleEmbedUrl, googleEmbedEnabled, persistSettings]);

  const [updateStatus, setUpdateStatus] = useState<{
    loading: boolean;
    error?: string;
    latestTag?: string;
    releaseUrl?: string;
    windowsExeUrl?: string;
    androidApkUrl?: string;
    isNewer?: boolean;
  }>({ loading: false });

  const doCheckUpdates = useCallback(async () => {
    try {
      setUpdateStatus({ loading: true });
      const info = await checkForUpdates(pkg.version);
      setUpdateStatus({ loading: false, ...info });
    } catch (e: any) {
      setUpdateStatus({ loading: false, error: e?.message || 'Failed to check updates' });
    }
  }, []);

  type NavItem = {
    icon: LucideIcon;
    label: string;
    testId: string;
    action?: () => void;
    targetSection?: DrawerSectionKey;
    closeAfter?: boolean;
  };

  const navItems: NavItem[] = [
    { icon: LayoutGrid, label: 'Dashboard', testId: 'nav-dashboard', action: () => onGoToSection?.('dashboard'), closeAfter: true },
    { icon: CalendarDays, label: 'Weekly Planner', testId: 'nav-planner', action: () => onGoToSection?.('planner'), closeAfter: true },
    { icon: Brain, label: 'AI Import', testId: 'nav-ai', targetSection: 'ai' },
    { icon: User2, label: 'Partner', testId: 'nav-partner', targetSection: 'partner' },
    { icon: RadioTower, label: 'Sync', testId: 'nav-sync', targetSection: 'sync' },
    { icon: Settings, label: 'Settings', testId: 'nav-settings', targetSection: 'settings' },
  ];

  const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));
  const computeDefaultWidth = () => {
    if (typeof window === 'undefined') return 720;
    const vw = window.innerWidth;
    // targets by breakpoint, capped by viewport
    const target = vw >= 1280 ? 1040 : vw >= 1024 ? 880 : vw >= 768 ? 720 : vw;
    return clamp(target, Math.min(320, vw), Math.floor(vw * 0.95));
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    queueMicrotask(() => firstNavItemRef.current?.focus());
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Initialize width for drawer variant and keep it within current viewport
  useEffect(() => {
    if (variant !== 'drawer') return;
    const updateWidth = () => {
      setWidthPx((prev) => {
        const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
        const maxW = Math.floor(vw * 0.95);
        const minW = Math.min(320, vw);
        if (prev == null) return computeDefaultWidth();
        return clamp(prev, minW, Math.min(1040, maxW));
      });
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, [variant]);

  const onResizeMouseDown = (e: React.MouseEvent) => {
    if (variant !== 'drawer') return;
    e.preventDefault();
    const startX = e.clientX;
    // if widthPx not set yet, compute from element width
    const panel = document.querySelector('[data-tag="drawer-panel"]') as HTMLElement | null;
    const rectWidth = panel ? panel.getBoundingClientRect().width : computeDefaultWidth();
    dragStateRef.current = { startX, startWidth: widthPx ?? rectWidth };
    resizingRef.current = true;
    const onMove = (ev: MouseEvent) => {
      if (!resizingRef.current) return;
      const delta = ev.clientX - dragStateRef.current.startX; // moving right increases width
      const vw = window.innerWidth;
      const maxW = Math.min(1040, Math.floor(vw * 0.95));
      const minW = Math.min(320, vw);
      setWidthPx(clamp(dragStateRef.current.startWidth + delta, minW, maxW));
    };
    const onUp = () => {
      resizingRef.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const portalTarget = typeof document !== 'undefined' ? document.body : null;

  const content = (
    <div
      className={`fixed inset-0 ${variant === 'full' ? 'z-[9999]' : 'z-[80]'} ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}
      aria-hidden={!open}
      data-testid="drawer-root"
      data-tag="drawer-root"
    >
      {/* Backdrop only for full-screen variant */}
      {variant === 'full' && (
        <div
          className={`absolute inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`}
          onClick={onClose}
          data-testid="drawer-backdrop"
        />
      )}
      {/* Drawer / Full-screen Panel */}
      <aside
        className={[
          'transform transition-transform duration-500 ease-[cubic-bezier(.18,.89,.32,1.05)] flex flex-col rounded-none shadow-2xl',
          variant === 'full'
            ? `${open ? 'translate-x-0' : '-translate-x-full'} fixed inset-0 w-screen h-screen bg-slate-900 text-slate-100`
            : `${open ? 'translate-x-0' : '-translate-x-full'} absolute top-0 left-0 h-full w-full max-w-none md:max-w-[720px] lg:max-w-[880px] xl:max-w-[1040px] neon-hype-panel rainbow-crunch-border !border-slate-700/60 overflow-hidden`
        ].join(' ')}
        role="dialog"
        aria-modal="true"
        aria-label="Menu and archives"
        data-testid="side-drawer"
        data-open={open || undefined}
        data-tag="drawer-panel"
        onClick={(e) => e.stopPropagation()}
        style={{ pointerEvents: 'auto', width: variant === 'drawer' ? widthPx ?? undefined : undefined }}
      >
  {/* Resize handle (right edge) for drawer variant on md+ screens */}
        {variant === 'drawer' && (
          <>
            <div
              onMouseDown={onResizeMouseDown}
              role="separator"
              aria-orientation="vertical"
              title="Drag to resize"
              data-testid="drawer-resize-handle"
              className="hidden md:block absolute right-0 top-0 h-full w-2 cursor-ew-resize hover:bg-slate-500/10"
            />
            <div
              onMouseDown={onResizeMouseDown}
              title="Drag to resize"
              className="hidden md:flex absolute right-0 bottom-0 h-4 w-4 items-end justify-end cursor-nwse-resize"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" className="opacity-60">
                <path d="M10 10H7M10 7H4M10 4H1" stroke="currentColor" strokeWidth="1" />
              </svg>
            </div>
          </>
        )}
        <div className={`flex items-center justify-between mb-4 pb-2 border-b border-slate-700/60 ${variant === 'full' ? 'px-3' : 'px-1'}`} data-testid="drawer-header" data-tag="drawer-header">
          <h2 className="text-sm font-semibold tracking-wider text-slate-200 uppercase">Menu</h2>
          <button className="neon-icon-button" onClick={onClose} aria-label="Close drawer">✕</button>
        </div>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto">
          {/* Primary Nav */}
          <nav className={`mb-4 ${variant === 'full' ? 'px-3' : 'px-1'}`} aria-label="Primary" data-tag="drawer-nav">
            <ul className="space-y-1 text-sm font-medium tracking-wide" data-testid="nav-list">
              {navItems.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <li key={item.label} style={{ animationDelay: `${idx * 55}ms` }} className="opacity-0 animate-fade-slide-in">
                    <button
                      ref={idx === 0 ? firstNavItemRef : undefined}
                      onClick={() => {
                        if (item.action) {
                          item.action();
                        }
                        if (item.targetSection) {
                          scrollToSection(item.targetSection);
                        }
                        if (item.closeAfter) onClose();
                      }}
                      data-testid={item.testId}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-slate-200 border border-slate-700/40 hover:border-slate-500/50 ${variant === 'full' ? 'bg-slate-800/60 hover:bg-slate-700/60' : 'bg-slate-800/40 hover:bg-slate-700/50'} shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500/60 focus:ring-offset-2 focus:ring-offset-slate-900`}>
                      <Icon className="h-4 w-4 opacity-80" /> {item.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* AI Import */}
          <section ref={sectionRefs.ai} className={`${variant === 'full' ? 'px-3' : 'px-1'} mb-4 scroll-mt-6`} data-testid="drawer-ai">
            <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-3 space-y-3">
              <h3 className="text-sm font-semibold text-slate-200">AI Import</h3>
              <AIImport />
            </div>
          </section>

          {/* Export & Share */}
          <section ref={sectionRefs.export} className={`${variant === 'full' ? 'px-3' : 'px-1'} mb-4 scroll-mt-6`} data-testid="drawer-export">
            <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-2">
              <h3 className="text-sm font-semibold text-slate-200 mb-2">Export & Share</h3>
              <div className="bg-white rounded-lg">
                <ExportTasks />
              </div>
            </div>
          </section>

          {/* Partner Manager (Invite code, connect form, color settings) */}
          <section ref={sectionRefs.partner} className={`${variant === 'full' ? 'px-3' : 'px-1'} mb-6 scroll-mt-6`} data-testid="drawer-partner">
            <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-2">
              <h3 className="text-sm font-semibold text-slate-200 mb-2">Partner & Colors</h3>
              <div className="bg-white rounded-lg">
                <BuddyLinkGarage />
              </div>
            </div>
          </section>

          <section ref={sectionRefs.sync} className={`${variant === 'full' ? 'px-3' : 'px-1'} mb-6 scroll-mt-6`} data-testid="drawer-sync">
            <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-2">
              <h3 className="text-sm font-semibold text-slate-200 mb-2">Peer Sync</h3>
              <div className="bg-white rounded-lg">
                <SyncPanel />
              </div>
            </div>
          </section>

          {/* Settings */}
          <section ref={sectionRefs.settings} className={`${variant === 'full' ? 'px-3' : 'px-1'} mb-6 scroll-mt-6`} data-testid="drawer-settings">
            <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-3">
              <h3 className="text-sm font-semibold text-slate-200 mb-3">Settings</h3>
              <div className="space-y-5">
                <div className="neon-hype-panel rainbow-crunch-border p-4 space-y-4">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <div className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Text Size</div>
                      <div className="text-[10px] text-slate-500">Adjust app-wide font scale</div>
                    </div>
                    <div className="btn-row max-w-[360px]">
                      {[{ label: 'S', v: 0.9 }, { label: 'D', v: 1 }, { label: 'L', v: 1.1 }, { label: 'XL', v: 1.2 }].map(({ label, v }) => (
                        <button
                          key={label}
                          className="neon-action-button"
                          data-size="sm"
                          data-variant="soft"
                          onClick={() => applyTextScale(v)}
                          data-testid={`drawer-textsize-${label}`}
                          title={`Set text size to ${label}`}
                        >{label}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label htmlFor="drawer-text-size-range" className="block text-[10px] text-slate-400 mb-1">Scale: {textScale.toFixed(2)}x</label>
                    <input
                      id="drawer-text-size-range"
                      type="range"
                      min={0.85}
                      max={1.3}
                      step={0.05}
                      value={textScale}
                      onChange={(e) => applyTextScale(parseFloat(e.target.value))}
                      className="w-full"
                      data-testid="drawer-textsize-range"
                    />
                  </div>
                </div>

                <div className="neon-hype-panel rainbow-crunch-border p-4 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <div className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Updates</div>
                      <div className="text-[10px] text-slate-500">Current version: {pkg.version}</div>
                    </div>
                    <div className="btn-row">
                      <button
                        className="neon-action-button"
                        data-size="sm"
                        onClick={doCheckUpdates}
                        disabled={updateStatus.loading}
                        data-testid="drawer-check-updates"
                      >
                        {updateStatus.loading ? 'Checking…' : 'Check for Updates'}
                      </button>
                    </div>
                  </div>
                  {updateStatus.error && (
                    <div className="text-[11px] text-rose-300">{updateStatus.error}</div>
                  )}
                  {!updateStatus.error && updateStatus.latestTag && (
                    <div className="text-[11px] text-slate-300 space-y-2">
                      <div>
                        Latest: <span className="font-semibold">{updateStatus.latestTag}</span>
                        {typeof updateStatus.isNewer !== 'undefined' && (
                          <span className={`ml-1 ${updateStatus.isNewer ? 'text-emerald-300 font-medium' : 'text-slate-400'}`}>
                            {updateStatus.isNewer ? '(Newer available)' : '(Up to date)'}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                          {updateStatus.windowsExeUrl && (
                          <a className="neon-action-button" data-size="sm" href={updateStatus.windowsExeUrl} target="_blank" rel="noreferrer">
                            Download Windows (.exe)
                          </a>
                        )}
                          {updateStatus.androidApkUrl && (
                          <a className="neon-action-button" data-variant="outline" data-size="sm" href={updateStatus.androidApkUrl} target="_blank" rel="noreferrer">
                            Download Android (.apk)
                          </a>
                        )}
                          {updateStatus.releaseUrl && !updateStatus.windowsExeUrl && !updateStatus.androidApkUrl && (
                          <a className="neon-action-button" data-variant="soft" data-size="sm" href={updateStatus.releaseUrl} target="_blank" rel="noreferrer">
                            View Release
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="neon-hype-panel rainbow-crunch-border p-4 space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <div className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Google Calendar Connect</div>
                      <div className="text-[10px] text-slate-500">Scaffold for OAuth + sync. No live calls yet.</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] ${googleConnectStatus === 'ready' ? 'text-emerald-300' : 'text-slate-400'}`} data-testid="drawer-google-status">
                        {googleConnectStatus === 'ready' ? 'Connected (stub)' : 'Not connected'}
                      </span>
                      <button
                        type="button"
                        className="neon-action-button"
                        data-size="sm"
                        data-variant={googleConnectStatus === 'ready' ? 'outline' : undefined}
                        onClick={googleConnectStatus === 'ready' ? markGoogleDisconnected : handleGoogleConnect}
                        disabled={googleBusy}
                        data-testid="drawer-google-connect-toggle"
                      >
                        {googleConnectStatus === 'ready' ? 'Disconnect' : googleBusy ? 'Connecting…' : 'Connect Google'}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] uppercase tracking-[0.14em] text-slate-400">Account email (for display only)</label>
                      <input
                        type="email"
                        className="glow-form-input mt-1"
                        placeholder="couple@gmail.com"
                        value={googleAccountHint}
                        onChange={(e) => setGoogleAccountHint(e.target.value)}
                        data-testid="drawer-google-account"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="block text-[10px] uppercase tracking-[0.14em] text-slate-400">Sync tasks to Google</label>
                      <button
                        type="button"
                        className="neon-action-button"
                        data-size="sm"
                        data-variant={googleSyncEnabled ? undefined : 'outline'}
                        onClick={toggleGoogleSync}
                        disabled={googleConnectStatus !== 'ready'}
                        data-testid="drawer-google-sync-toggle"
                      >
                        {googleSyncEnabled ? 'Disable Sync' : 'Enable Sync'}
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-500">Real OAuth flow will land here; this keeps UI stable while we wire the backend.</p>
                  </div>
                </div>

                <div className="neon-hype-panel rainbow-crunch-border p-4 space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <div className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Google Calendar Embed</div>
                      <div className="text-[10px] text-slate-500">Show your Google events next to the mega planner.</div>
                    </div>
                    <button
                      type="button"
                      className="neon-action-button"
                      data-size="sm"
                      data-variant={googleEmbedEnabled ? undefined : 'outline'}
                      onClick={toggleGoogleEmbed}
                      data-testid="drawer-google-toggle"
                    >
                      {googleEmbedEnabled ? 'Disable' : 'Enable'}
                    </button>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] uppercase tracking-[0.14em] text-slate-400">Embed URL</label>
                      <input
                        type="url"
                        className="glow-form-input mt-1"
                        placeholder="https://calendar.google.com/calendar/embed?..."
                        value={googleEmbedUrl}
                        onChange={(e) => setGoogleEmbedUrl(e.target.value)}
                        disabled={!googleEmbedEnabled}
                        data-testid="drawer-google-url"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[10px] text-slate-500">Grab the public embed link from Google Calendar → Settings › Integrate calendar.</p>
                      <div className="flex items-center gap-2">
                        {googleSavedFlash === 'saved' && <span className="text-[10px] text-emerald-300" data-testid="drawer-google-saved">Saved!</span>}
                        <button
                          type="button"
                          className="neon-action-button"
                          data-size="sm"
                          onClick={saveGoogleEmbedUrl}
                          disabled={!googleEmbedEnabled}
                          data-testid="drawer-google-save"
                        >
                          Save Link
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="neon-hype-panel rainbow-crunch-border p-4 space-y-3">
                  <div className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Danger Zone</div>
                  <p className="text-[11px] text-slate-400">Clear all locally stored data, including partner links and tasks.</p>
                  <button
                    className="neon-action-button"
                    data-variant="outline"
                    data-size="sm"
                    onClick={() => {
                      if (confirm('Clear all local data? This will remove users, partner link, and tasks.')) {
                        storage.clearAll();
                        window.location.reload();
                      }
                    }}
                    data-testid="drawer-clear-data"
                  >
                    🧹 Clear All Local Data
                  </button>
                </div>
              </div>
            </div>
          </section>

          <div className={`mt-1 mb-4 text-[10px] uppercase tracking-wider text-slate-500 font-semibold ${variant === 'full' ? 'px-3' : 'px-1'}`}>Archives</div>

          {/* Completed Tasks Section */}
          <div className={`mb-6 ${variant === 'full' ? 'px-3' : 'px-1'}`}>
            <button
              onClick={() => setShowCompleted(v => !v)}
              className="w-full flex items-center justify-between text-left mb-2 neon-action-button group" data-variant="soft" data-size="sm"
              aria-expanded={showCompleted}
              data-testid="toggle-completed"
            >
              <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Completed ({completed.length})</span>
              <span className="flex items-center gap-1 text-[10px] opacity-70">
                {showCompleted ? 'Hide' : 'Show'}
                <ChevronDown className={`h-3 w-3 transition-transform duration-300 ${showCompleted ? 'rotate-180' : 'rotate-0'}`} />
              </span>
            </button>
            {showCompleted && (
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1 scroll-thin" data-testid="completed-section">
                {completed.length === 0 && (
                  <div className="text-[11px] text-slate-500 flex items-center gap-2"><Inbox className="h-4 w-4" /> None yet</div>
                )}
                {completed.map((task: any) => (
                  <div key={task.id} className="group relative p-2 rounded bg-slate-800/60 border border-slate-700/70">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-medium text-slate-200 line-through opacity-70 break-words">{task.title}</p>
                        {task.completedAt && <p className="text-[9px] text-slate-500 mt-1">Done {new Date(task.completedAt).toLocaleString()}</p>}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => toggleTaskComplete(task.id)}
                          className="neon-icon-button" aria-label="Mark incomplete"
                          title="Mark incomplete"
                        >↺</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Deleted Tasks Section */}
          <div className={`mb-2 ${variant === 'full' ? 'px-3' : 'px-1'}`}>
            <button
              onClick={() => setShowDeleted(v => !v)}
              className="w-full flex items-center justify-between text-left mb-2 neon-action-button group" data-variant="soft" data-size="sm"
              aria-expanded={showDeleted}
              data-testid="toggle-deleted"
            >
              <span className="flex items-center gap-2"><Trash2 className="h-4 w-4" /> Deleted ({deleted.length})</span>
              <span className="flex items-center gap-1 text-[10px] opacity-70">
                {showDeleted ? 'Hide' : 'Show'}
                <ChevronDown className={`h-3 w-3 transition-transform duration-300 ${showDeleted ? 'rotate-180' : 'rotate-0'}`} />
              </span>
            </button>
            {showDeleted && (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1 scroll-thin" data-testid="deleted-section">
                {deleted.length === 0 && (
                  <div className="text-[11px] text-slate-500 flex items-center gap-2"><Inbox className="h-4 w-4" /> Trash empty</div>
                )}
                {deleted.map((task: any) => (
                  <div key={task.id} className="group relative p-2 rounded bg-slate-900/60 border border-slate-700/70">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-medium text-slate-300 break-words">{task.title}</p>
                        {task.deletedAt && <p className="text-[9px] text-slate-500 mt-1">Deleted {new Date(task.deletedAt).toLocaleString()}</p>}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => restoreTask(task.id)}
                          className="neon-icon-button" aria-label="Restore task"
                          title="Restore"
                        ><RotateCcw className="h-4 w-4" /></button>
                        <button
                          onClick={() => { if (confirm('Permanently delete this task? This cannot be undone.')) hardDeleteTask(task.id); }}
                          className="neon-icon-button" aria-label="Permanently delete task" title="Delete forever"
                        ><XCircle className="h-4 w-4 text-rose-400" /></button>
                      </div>
                    </div>
                  </div>
                ))}
                {deleted.length > 0 && (
                  <button
                    onClick={() => { if (confirm('Empty trash? This permanently deletes all trashed tasks.')) { deleted.forEach((t:any)=> hardDeleteTask(t.id)); } }}
                    className="w-full mt-2 neon-action-button" data-variant="outline" data-size="xs"
                    data-testid="empty-trash"
                  >🗑️ Empty Trash</button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer (fixed at bottom of drawer) */}
        <div className={`mt-auto pt-4 border-t border-slate-700/60 space-y-3 ${variant === 'full' ? 'px-3' : 'px-1'}`}>
          <p className="text-[10px] text-slate-500">⚠️ Deleted tasks are retained locally until permanently removed.</p>
          <p className="text-[10px] text-slate-600">v0.1.0 • Local First</p>
        </div>
      </aside>
    </div>
  );

  if (!portalTarget) return content;
  return createPortal(content, portalTarget);
};
