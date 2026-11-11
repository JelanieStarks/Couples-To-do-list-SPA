export const RELEASES_API = 'https://api.github.com/repos/JelanieStarks/Couples-To-do-list-SPA/releases?per_page=30';
const DOWNLOAD_PREFIX = 'https://github.com/JelanieStarks/Couples-To-do-list-SPA/releases/download/';

export const releaseVersion = value => String(value ?? '').match(/(?:^|[^0-9])v?(\d+\.\d+\.\d+)(?:$|[^0-9])/)?.[1] ?? '0.0.0';
export const compareVersions = (a, b) => {
  const left = releaseVersion(a).split('.').map(Number);
  const right = releaseVersion(b).split('.').map(Number);
  for (let index = 0; index < 3; index++) if (left[index] !== right[index]) return left[index] > right[index] ? 1 : -1;
  return 0;
};

export const selectPlatformRelease = (releases, platform, requireManifest = false) => {
  const extension = platform === 'android' ? '.apk' : '.exe';
  return releases.filter(release => !release.draft).map(release => {
    const assets = Array.isArray(release.assets) ? release.assets : [];
    const asset = assets.find(asset => asset.browser_download_url?.startsWith(DOWNLOAD_PREFIX)
      && asset.browser_download_url.toLowerCase().endsWith(extension)
      && (!asset.state || asset.state === 'uploaded'));
    const manifest = assets.some(asset => asset.name === 'latest.yml' && asset.browser_download_url?.startsWith(DOWNLOAD_PREFIX));
    return asset && (!requireManifest || manifest) ? { release, asset, version: releaseVersion(release.tag_name) } : null;
  }).filter(Boolean).sort((a, b) => compareVersions(b.version, a.version)
    || Date.parse(b.release.published_at || 0) - Date.parse(a.release.published_at || 0)
    || (b.release.id || 0) - (a.release.id || 0))[0] ?? null;
};

export const fetchReleaseCatalog = async (fetcher = fetch) => {
  const response = await fetcher(RELEASES_API, { headers: { Accept: 'application/vnd.github+json' }, signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`Update check failed (GitHub ${response.status}). Try again shortly.`);
  const releases = await response.json();
  if (!Array.isArray(releases)) throw new Error('The update server returned an invalid release list.');
  return releases;
};
