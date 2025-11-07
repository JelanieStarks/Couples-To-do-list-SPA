import React, { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { Copy, Check, RadioTower, Power, Wifi, Link2, Loader2, RefreshCw } from 'lucide-react';
import { useTask } from '../../contexts/TaskContext';

interface SyncPanelProps {
  variant?: 'card' | 'inline';
}

const friendlyState = (state: string): string => {
  switch (state) {
    case 'idle':
      return 'Not connected';
    case 'waiting-offer':
      return 'Waiting for host code';
    case 'waiting-answer':
      return 'Share this code';
    case 'connecting':
      return 'Connecting…';
    case 'connected':
      return 'Connected';
    case 'closed':
      return 'Session closed';
    case 'error':
      return 'Connection error';
    default:
      return state;
  }
};

const useQrCode = (value: string | null) => {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!value) {
      setDataUrl(null);
      return;
    }
    let active = true;
    QRCode.toDataURL(value, { margin: 1, scale: 4, errorCorrectionLevel: 'M' })
      .then((url) => {
        if (active) setDataUrl(url);
      })
      .catch(() => {
        if (active) setDataUrl(null);
      });
    return () => {
      active = false;
    };
  }, [value]);

  return dataUrl;
};

const chipClass = 'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium';

export const SyncPanel: React.FC<SyncPanelProps> = ({ variant = 'card' }) => {
  const { peerSync, syncNow } = useTask();
  const {
    status,
    lan,
    startHosting,
    joinSession,
    submitRemoteSignal,
    endSession,
    enableLan,
    disableLan,
    resetError,
  } = peerSync;

  const [hostCodeInput, setHostCodeInput] = useState('');
  const [answerInput, setAnswerInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [lanCopied, setLanCopied] = useState(false);

  const localSignalValue = status.localSignal?.payload ?? null;
  const localSignalKind = status.localSignal?.kind ?? null;
  const qrCode = useQrCode(localSignalValue);
  const lanAvailable = !!lan.serverUrl;

  const friendlyRole = status.role ? (status.role === 'host' ? 'Hosting' : 'Joining') : 'Standby';
  const friendlyLanStatus = useMemo(() => {
    if (!lan.enabled) return 'Disabled';
    switch (lan.status) {
      case 'idle':
        return 'Waiting';
      case 'connecting':
        return 'Connecting…';
      case 'connected':
        return 'Live';
      case 'error':
        return 'Error';
      default:
        return lan.status;
    }
  }, [lan.enabled, lan.status]);

  const handleCopySignal = async () => {
    if (!localSignalValue) return;
    try {
      await navigator.clipboard.writeText(localSignalValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleCopyLanUrl = async () => {
    if (!lan.serverUrl) return;
    try {
      await navigator.clipboard.writeText(lan.serverUrl);
      setLanCopied(true);
      setTimeout(() => setLanCopied(false), 2000);
    } catch {}
  };

  const onStartHosting = () => {
    startHosting({ enableLan: lan.enabled });
    setAnswerInput('');
  };

  const onJoinWithCode = () => {
    const trimmed = hostCodeInput.trim();
    if (!trimmed) return;
    joinSession(trimmed, { enableLan: lan.enabled });
    setHostCodeInput('');
  };

  const onSubmitAnswer = () => {
    const trimmed = answerInput.trim();
    if (!trimmed) return;
    submitRemoteSignal(trimmed);
    setAnswerInput('');
  };

  const toggleLan = () => {
    if (lan.enabled) {
      disableLan();
    } else {
      enableLan();
    }
  };

  const containerClass = variant === 'card'
    ? 'bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6'
    : 'space-y-6';

  const showAnswerInput = status.role === 'host' && status.expectedRemote === 'answer';
  const showLocalSignal = !!localSignalValue;

  const showLanHint = lan.enabled && lan.status === 'connected' && status.role !== 'connected';

  return (
    <div className={containerClass}>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-600 p-2 rounded-lg">
            <RadioTower className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Peer Sync</h3>
            <p className="text-sm text-gray-500">Share tasks instantly over QR, codes, or LAN.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`${chipClass} bg-blue-50 text-blue-700 border border-blue-200`}>
            <Wifi className="h-3 w-3" /> {friendlyLanStatus}
          </span>
          <span className={`${chipClass} bg-purple-50 text-purple-700 border border-purple-200`}>
            <Link2 className="h-3 w-3" /> {friendlyRole}
          </span>
          <span className={`${chipClass} bg-gray-100 text-gray-600 border border-gray-200`}>
            {friendlyState(status.state)}
          </span>
        </div>
      </header>

      {(status.lastError || lan.lastError) && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-lg p-3 text-sm flex items-start gap-3">
          <div className="font-semibold">Heads up:</div>
          <div className="flex-1">
            {status.lastError && <div>{status.lastError}</div>}
            {lan.lastError && <div>{lan.lastError}</div>}
            <div className="mt-2 flex gap-2">
              <button className="btn-neon" data-size="xs" onClick={resetError}>Clear notice</button>
              <button className="btn-neon" data-size="xs" data-variant="outline" onClick={() => syncNow()}>Refresh tasks</button>
            </div>
          </div>
        </div>
      )}

      <section className="grid gap-5 md:grid-cols-2">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-900">Host a session</h4>
            <button className="btn-neon" data-size="sm" onClick={onStartHosting}>
              <Power className="h-4 w-4" />
              {status.role === 'host' ? 'Restart Hosting' : 'Start Hosting'}
            </button>
          </div>
          <p className="text-xs text-gray-500">
            Share the pairing string or QR with your partner. Once they respond, the session connects automatically.
          </p>

          {showLocalSignal && status.role === 'host' && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
              <div className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Share this host code</div>
              <div className="font-mono text-sm break-all bg-white border border-gray-200 rounded-lg px-3 py-2">
                {localSignalValue}
              </div>
              <div className="flex items-center gap-2">
                <button className="btn-neon" data-size="sm" onClick={handleCopySignal}>
                  <Copy className="h-4 w-4" /> {copied ? 'Copied!' : 'Copy code'}
                </button>
                {qrCode && (
                  <a className="btn-neon" data-size="sm" data-variant="soft" href={qrCode} download="couples-sync-host.png">
                    Download QR
                  </a>
                )}
              </div>
              {qrCode && (
                <div className="mt-2 flex justify-center">
                  <img src={qrCode} alt="Host QR" className="w-32 h-32 border border-gray-200 rounded-lg" />
                </div>
              )}
            </div>
          )}

          {showAnswerInput && (
            <div className="space-y-3">
              <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Paste your partner's reply</label>
              <div className="flex gap-3">
                <textarea
                  value={answerInput}
                  onChange={(e) => setAnswerInput(e.target.value)}
                  placeholder="Paste answer code here"
                  className="flex-1 min-h-[80px] text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500"
                />
                <button className="btn-neon" data-size="sm" onClick={onSubmitAnswer} disabled={!answerInput.trim()}>
                  <RefreshCw className="h-4 w-4" /> Apply
                </button>
              </div>
            </div>
          )}

          {status.role === 'host' && (
            <button className="btn-neon" data-variant="outline" data-size="sm" onClick={endSession}>
              End Hosting
            </button>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-900">Join a session</h4>
            <button className="btn-neon" data-size="sm" data-variant="soft" onClick={() => joinSession(undefined, { enableLan: lan.enabled })}>
              <Loader2 className="h-4 w-4" /> Listen on LAN
            </button>
          </div>
          <p className="text-xs text-gray-500">
            Paste the host code, or switch on LAN to auto-detect and respond when the host is nearby.
          </p>

          <div className="space-y-3">
            <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Host code</label>
            <div className="flex gap-3">
              <textarea
                value={hostCodeInput}
                onChange={(e) => setHostCodeInput(e.target.value)}
                placeholder="Paste host code here"
                className="flex-1 min-h-[80px] text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
              />
              <button className="btn-neon" data-size="sm" onClick={onJoinWithCode} disabled={!hostCodeInput.trim()}>
                Join
              </button>
            </div>
          </div>

          {showLocalSignal && status.role === 'guest' && localSignalKind === 'answer' && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
              <div className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Send this back to the host</div>
              <div className="font-mono text-sm break-all bg-white border border-gray-200 rounded-lg px-3 py-2">
                {localSignalValue}
              </div>
              <div className="flex items-center gap-2">
                <button className="btn-neon" data-size="sm" onClick={handleCopySignal}>
                  <Copy className="h-4 w-4" /> {copied ? 'Copied!' : 'Copy reply'}
                </button>
                {qrCode && (
                  <a className="btn-neon" data-size="sm" data-variant="soft" href={qrCode} download="couples-sync-guest.png">
                    Download QR
                  </a>
                )}
              </div>
              {qrCode && (
                <div className="mt-2 flex justify-center">
                  <img src={qrCode} alt="Guest QR" className="w-32 h-32 border border-gray-200 rounded-lg" />
                </div>
              )}
            </div>
          )}

          {status.role === 'guest' && (
            <button className="btn-neon" data-variant="outline" data-size="sm" onClick={endSession}>
              Leave Session
            </button>
          )}
        </div>
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <button
            className={`btn-neon ${lan.enabled ? '' : '!bg-gray-100 !text-gray-600 !border-gray-200'}`}
            data-size="sm"
            onClick={toggleLan}
            disabled={!lanAvailable}
          >
            <Wifi className="h-4 w-4" />
            {lan.enabled ? 'Disable LAN Auto' : 'Enable LAN Auto'}
          </button>
          {lanAvailable && (
            <button className="btn-neon" data-size="sm" data-variant="soft" onClick={handleCopyLanUrl}>
              <Copy className="h-4 w-4" />
              {lanCopied ? 'URL copied!' : 'Copy LAN URL'}
            </button>
          )}
        </div>
        {showLanHint && (
          <div className="text-emerald-600 flex items-center gap-2">
            <Wifi className="h-4 w-4" /> Listening for nearby devices…
          </div>
        )}
        {!lanAvailable && (
          <div className="text-amber-600 flex items-center gap-1">
            <Wifi className="h-4 w-4" /> Start the local signaling server to unlock LAN auto-connect.
          </div>
        )}
      </footer>
    </div>
  );
};
