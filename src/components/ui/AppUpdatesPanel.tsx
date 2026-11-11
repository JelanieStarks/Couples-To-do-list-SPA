import React, { useEffect, useState } from 'react';
import pkg from '../../../package.json';
import { useTask } from '../../contexts/TaskContext';
import { checkForUpdates, type UpdateInfo } from '../../utils/updates';
import { androidUpdates, isAndroidApp } from '../../utils/androidUpdates';

type Stage = 'idle' | 'checking' | 'downloading' | 'ready' | 'error';
export const AppUpdatesPanel: React.FC = () => {
  const { saveAndSync } = useTask();
  const desktop = typeof window !== 'undefined' ? window.appUpdates : undefined;
  const android = isAndroidApp();
  const [version, setVersion] = useState(pkg.version);
  const [info, setInfo] = useState<UpdateInfo | null>(null);
  const [stage, setStage] = useState<Stage>('idle');
  const [percent, setPercent] = useState(0);
  const [message, setMessage] = useState('Check for updates to find the latest Windows and Android downloads.');
  const busy = stage === 'checking' || stage === 'downloading';

  useEffect(() => {
    if (!desktop) return;
    desktop.onStatus(event => {
      if (event.state === 'downloaded') { setStage('ready'); setMessage('Windows update downloaded. Install when you are ready.'); }
      if (event.state === 'none') setStage('idle');
      if (event.state === 'error') { setStage('error'); setMessage(event.message || 'The Windows update failed.'); }
    });
    desktop.onProgress(event => { setStage('downloading'); setPercent(event.percent || 0); });
    return () => desktop.clearListeners();
  }, [desktop]);

  useEffect(() => {
    if (!android) return;
    let active = true;
    void androidUpdates.getInfo().then(result => {
      if (!active) return;
      setVersion(result.version);
      if (result.ready) { setStage('ready'); setMessage('Android update downloaded. Tap Install Android update.'); }
    }).catch(error => { if (active) setMessage((error as Error).message); });
    const listener = androidUpdates.addListener('downloadProgress', event => { if (active) { setStage('downloading'); setPercent(event.percent); } });
    return () => { active = false; void listener.then(handle => handle.remove()).catch(() => {}); };
  }, [android]);

  const check = async () => {
    setStage('checking');
    setMessage('Checking the latest releases…');
    try {
      const result = await checkForUpdates(version, android ? 'android' : desktop ? 'windows' : 'web');
      setInfo(result);
      if (result.error) throw new Error(result.error);
      if (desktop) {
        const native = await desktop.check();
        if (!native.ok) throw new Error(native.message || 'Windows could not check the update feed.');
      }
      setStage('idle');
      setMessage(result.isNewer ? 'An update is available.' : 'You have the latest version for this device.');
    } catch (error) { setStage('error'); setMessage((error as Error).message); }
  };

  const downloadWindows = async () => {
    if (!info?.windowsExeUrl) return;
    if (!desktop) { window.open(info.windowsExeUrl, '_blank', 'noopener,noreferrer'); return; }
    try {
      setStage('downloading'); setPercent(0); setMessage('Downloading Windows update…');
      const checked = await desktop.check();
      if (!checked.ok) throw new Error(checked.message || 'Update check failed.');
      const result = await desktop.download();
      if (!result.ok) throw new Error(result.message || 'Update download failed.');
      setStage('ready'); setMessage('Windows update downloaded. Tap Install Windows update.');
    } catch (error) { setStage('error'); setMessage((error as Error).message); }
  };

  const downloadAndroid = async () => {
    if (!info?.androidApkUrl) return;
    if (!android) { window.open(info.androidApkUrl, '_blank', 'noopener,noreferrer'); return; }
    try {
      setStage('downloading'); setPercent(0); setMessage('Downloading and verifying Android update…');
      await androidUpdates.download({ url: info.androidApkUrl });
      setStage('ready'); setMessage('Android update verified. Tap Install Android update.');
    } catch (error) { setStage('error'); setMessage((error as Error).message); }
  };

  const install = async () => {
    try {
      setMessage('Saving your work before the update…');
      const saved = await saveAndSync();
      if (!saved.ok) setMessage(`${saved.message} The update will keep your local app data.`);
      if (android) {
        const result = await androidUpdates.install();
        setMessage(result.permissionRequired
          ? 'Allow updates from Couples 2Do on the Android screen, then return and tap Install Android update again.'
          : 'Confirm the update in the Android installer. Your tasks and sign-in will be kept.');
      } else if (desktop) {
        const result = await desktop.install();
        if (!result.ok) throw new Error(result.message || 'The installer could not be opened.');
      }
    } catch (error) { setStage('error'); setMessage((error as Error).message); }
  };

  return (
    <div className="neon-hype-panel rainbow-crunch-border p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><div className="text-xs font-semibold text-slate-300 uppercase tracking-wide">App updates</div>
          <div className="text-[11px] text-slate-400">Current version: {version}</div></div>
        <button type="button" className="neon-action-button" data-size="sm" data-testid="drawer-check-updates" disabled={busy} onClick={() => void check()}>
          {stage === 'checking' ? 'Checking…' : 'Check for Updates'}
        </button>
      </div>
      {info?.latestTag && <p className="text-[11px] text-slate-300">Latest for this device: {info.latestTag}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="button" className="neon-action-button" data-size="sm" data-testid="drawer-windows-update"
          disabled={busy || (!desktop || stage !== 'ready') && (!info?.windowsExeUrl || (desktop && !(info.windowsNewer ?? info.isNewer)))}
          onClick={() => void (desktop && stage === 'ready' ? install() : downloadWindows())}>
          {desktop && stage === 'ready' ? 'Install Windows update' : 'Download Windows update'}
        </button>
        <button type="button" className="neon-action-button" data-size="sm" data-variant="outline" data-testid="drawer-android-update"
          disabled={busy || (!android || stage !== 'ready') && (!info?.androidApkUrl || (android && !(info.androidNewer ?? info.isNewer)))}
          onClick={() => void (android && stage === 'ready' ? install() : downloadAndroid())}>
          {android && stage === 'ready' ? 'Install Android update' : 'Download Android update'}
        </button>
      </div>
      {stage === 'downloading' && <progress className="w-full" max={100} value={percent} aria-label="Update download progress" />}
      <p role={stage === 'error' ? 'alert' : 'status'} className={`text-[11px] ${stage === 'error' ? 'text-rose-300' : 'text-slate-400'}`}>{message}</p>
      {info?.releaseUrl && <a className="text-xs text-indigo-300 underline" href={info.releaseUrl} target="_blank" rel="noreferrer">Open release page</a>}
    </div>
  );
};
