// Sandboxed Electron preloads use CommonJS even when the app uses ESM.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('appUpdates', {
	check: () => ipcRenderer.invoke('updates:check'),
	download: () => ipcRenderer.invoke('updates:download'),
	install: () => ipcRenderer.invoke('updates:install'),
	onStatus: (callback) => { ipcRenderer.on('updates:status', (_event, payload) => callback(payload)); },
	onProgress: (callback) => { ipcRenderer.on('updates:progress', (_event, payload) => callback(payload)); },
	clearListeners: () => {
		ipcRenderer.removeAllListeners('updates:status');
		ipcRenderer.removeAllListeners('updates:progress');
	},
});

contextBridge.exposeInMainWorld('appDocuments', {
  print: (html) => ipcRenderer.invoke('documents:print', html),
});

