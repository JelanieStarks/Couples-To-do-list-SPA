import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';

interface AndroidUpdatePlugin {
  getInfo(): Promise<{ version: string; ready: boolean }>;
  download(options: { url: string }): Promise<{ ready: boolean; version: string }>;
  install(): Promise<{ permissionRequired: boolean }>;
  addListener(event: 'downloadProgress', callback: (event: { percent: number }) => void): Promise<PluginListenerHandle>;
}

export const androidUpdates = registerPlugin<AndroidUpdatePlugin>('AppUpdater');
export const isAndroidApp = () => Capacitor.getPlatform() === 'android';
