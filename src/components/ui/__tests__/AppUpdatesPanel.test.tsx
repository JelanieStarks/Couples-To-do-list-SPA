import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AppUpdatesPanel } from '../AppUpdatesPanel';

const mocked = vi.hoisted(() => ({ android: false, check: vi.fn(), backup: vi.fn(), download: vi.fn(), install: vi.fn(), getInfo: vi.fn() }));
vi.mock('../../../contexts/TaskContext', () => ({ useTask: () => ({ saveAndSync: mocked.backup }) }));
vi.mock('../../../utils/updates', () => ({ checkForUpdates: mocked.check }));
vi.mock('../../../utils/androidUpdates', () => ({ isAndroidApp: () => mocked.android, androidUpdates: { getInfo: mocked.getInfo, download: mocked.download, install: mocked.install, addListener: async () => ({ remove: vi.fn() }) } }));

describe('native update controls', () => {
  beforeEach(() => {
    vi.clearAllMocks(); mocked.android = false;
    mocked.backup.mockResolvedValue({ ok: true });
    mocked.check.mockResolvedValue({ current: '1.0.18', latestTag: 'v1.0.19', windowsExeUrl: 'https://example.com/app.exe', androidApkUrl: 'https://example.com/app.apk', isNewer: true, windowsNewer: true, androidNewer: true });
    mocked.getInfo.mockResolvedValue({ version: '1.0.18-test', ready: false });
    mocked.download.mockResolvedValue({ ready: true }); mocked.install.mockResolvedValue({ permissionRequired: true });
  });
  afterEach(() => { delete window.appUpdates; });
  it('backs up work before opening the Windows installer', async () => {
    window.appUpdates = { check: vi.fn().mockResolvedValue({ ok: true }), download: vi.fn().mockResolvedValue({ ok: true }), install: vi.fn().mockResolvedValue({ ok: true }), onStatus: vi.fn(), onProgress: vi.fn(), clearListeners: vi.fn() };
    render(<AppUpdatesPanel />);
    fireEvent.click(screen.getByTestId('drawer-check-updates'));
    await waitFor(() => expect(screen.getByTestId('drawer-windows-update')).not.toBeDisabled());
    fireEvent.click(screen.getByTestId('drawer-windows-update'));
    await screen.findByText('Install Windows update');
    fireEvent.click(screen.getByTestId('drawer-windows-update'));
    await waitFor(() => expect(window.appUpdates!.install).toHaveBeenCalled());
    expect(mocked.backup).toHaveBeenCalledTimes(1);
  });
  it('downloads Android natively and explains the system install permission step', async () => {
    mocked.android = true;
    render(<AppUpdatesPanel />);
    fireEvent.click(screen.getByTestId('drawer-check-updates'));
    await waitFor(() => expect(screen.getByTestId('drawer-android-update')).not.toBeDisabled());
    fireEvent.click(screen.getByTestId('drawer-android-update'));
    await screen.findByText('Install Android update');
    fireEvent.click(screen.getByTestId('drawer-android-update'));
    await screen.findByText(/Allow updates from Couples 2Do/);
    expect(mocked.download).toHaveBeenCalledWith({ url: 'https://example.com/app.apk' });
    expect(mocked.install).toHaveBeenCalledTimes(1);
    expect(mocked.backup).toHaveBeenCalledTimes(1);
  });
});
