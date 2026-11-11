import { afterEach, describe, expect, it, vi } from 'vitest';
import { checkForUpdates } from '../updates';
import { compareVersions, selectPlatformRelease } from '../../../electron/releaseCatalog.js';

const base = 'https://github.com/JelanieStarks/Couples-To-do-list-SPA/releases/download/';
const release = (tag: string, assets: string[], published_at = '2026-11-10T23:00:00Z') => ({ tag_name: tag, html_url: `https://github.com/JelanieStarks/Couples-To-do-list-SPA/releases/tag/${tag}`, published_at, assets: assets.map(name => ({ name, state: 'uploaded', browser_download_url: `${base}${tag}/${name}` })) });
afterEach(() => vi.unstubAllGlobals());

describe('platform update catalogs', () => {
  it('finds Windows and Android beta assets from separate releases', async () => {
    const windows = release('windows-beta-v1.0.18-r38', ['Couples2Do-Setup-1.0.18.exe', 'latest.yml']);
    const android = release('android-test-v1.0.18-r11', ['Couples2Do-Test.apk']);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [android, windows, release('v1.0.12', ['old.exe'])] }));
    const result = await checkForUpdates('1.0.17-test', 'android');
    expect(result.isNewer).toBe(true);
    expect(result.androidApkUrl).toContain('android-test-v1.0.18-r11');
    expect(result.windowsExeUrl).toContain('windows-beta-v1.0.18-r38');
    expect(result.latestTag).toBe(android.tag_name);
  });
  it('compares prefixed beta versions and does not offer a downgrade', () => {
    expect(compareVersions('windows-beta-v1.0.18-r38', '1.0.17')).toBe(1);
    expect(compareVersions('android-test-v1.0.17-r10', '1.0.18-test')).toBe(-1);
    expect(compareVersions('1.0.18-test', 'v1.0.18')).toBe(0);
  });
  it('requires a matching Windows manifest for the native updater and rejects foreign downloads', () => {
    const broken = release('windows-beta-v1.0.19-r40', ['update.exe']);
    const good = release('windows-beta-v1.0.18-r38', ['update.exe', 'latest.yml']);
    const foreign = { ...release('v9.0.0', []), assets: [{ name: 'bad.apk', browser_download_url: 'https://example.com/bad.apk' }] };
    expect(selectPlatformRelease([broken, good], 'windows', true)?.version).toBe('1.0.18');
    expect(selectPlatformRelease([foreign], 'android')).toBeNull();
  });
  it('shows update errors instead of falsely saying the app is current', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403 }));
    expect((await checkForUpdates('1.0.18')).error).toContain('403');
  });
});
