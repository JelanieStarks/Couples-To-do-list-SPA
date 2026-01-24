// Preload runs in isolated world; expose minimal safe APIs if needed.
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('appUpdates', {
	check: () => ipcRenderer.invoke('updates:check'),
	download: () => ipcRenderer.invoke('updates:download'),
	install: () => ipcRenderer.invoke('updates:install'),
	onStatus: (callback) => ipcRenderer.on('updates:status', (_event, payload) => callback(payload)),
	onProgress: (callback) => ipcRenderer.on('updates:progress', (_event, payload) => callback(payload)),
	clearListeners: () => {
		ipcRenderer.removeAllListeners('updates:status');
		ipcRenderer.removeAllListeners('updates:progress');
	},
});
