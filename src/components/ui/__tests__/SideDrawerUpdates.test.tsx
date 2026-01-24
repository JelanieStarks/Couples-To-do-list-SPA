import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '../../../test-utils/renderWithProviders';
import { Layout } from '../Layout';
import { checkForUpdates } from '../../../utils/updates';

vi.mock('../../../utils/updates', () => ({
  checkForUpdates: vi.fn(),
}));

describe('SideDrawer updates', () => {
  const setup = () => renderWithProviders(
    <Layout>
      <div>Child</div>
    </Layout>
  );

  beforeEach(() => {
    (checkForUpdates as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      current: '1.0.12',
      latestTag: 'v1.0.13',
      isNewer: true,
      windowsExeUrl: 'https://example.com/app.exe',
      androidApkUrl: 'https://example.com/app.apk',
      releaseUrl: 'https://example.com/release',
    });
    window.appUpdates = {
      check: vi.fn().mockResolvedValue({ ok: true }),
      download: vi.fn().mockResolvedValue({ ok: true }),
      install: vi.fn().mockResolvedValue({ ok: true }),
      onStatus: vi.fn(),
      onProgress: vi.fn(),
      clearListeners: vi.fn(),
    } as any;
  });

  afterEach(() => {
    delete (window as any).appUpdates;
  });

  it('shows in-app update buttons after checking', async () => {
    setup();
    fireEvent.click(screen.getByTestId('hamburger-btn'));
    fireEvent.click(screen.getByTestId('nav-settings'));

    fireEvent.click(screen.getByTestId('drawer-check-updates'));

    expect(await screen.findByTestId('drawer-windows-update')).toBeTruthy();
    expect(await screen.findByTestId('drawer-android-update')).toBeTruthy();
  });
});
