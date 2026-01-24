// Electron main process entry (ESM)
import { app, BrowserWindow, shell, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Single instance lock to avoid multiple windows on Windows installers
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

let mainWindow;

autoUpdater.autoDownload = false;

const sendUpdateStatus = (payload) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('updates:status', payload);
  }
};

const sendUpdateProgress = (payload) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('updates:progress', payload);
  }
};

const createWindow = async () => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#111827',
    show: false,
    icon: path.join(__dirname, '../src/assets/HeartICON.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      // Enable in dev tools in development only
      devTools: !!(globalThis?.process?.env?.VITE_DEV_SERVER_URL),
    },
  });

  mainWindow.once('ready-to-show', () => mainWindow?.show());

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  const devServerUrl = (globalThis?.process?.env?.VITE_DEV_SERVER_URL) || (globalThis?.process?.env?.ELECTRON_START_URL);
  if (devServerUrl) {
    await mainWindow.loadURL(devServerUrl);
  } else {
    // Load built index.html from Vite build output
    const indexHtml = path.join(__dirname, '../dist/index.html');
    await mainWindow.loadFile(indexHtml);
  }
};

autoUpdater.on('update-available', (info) => {
  sendUpdateStatus({ state: 'available', version: info?.version });
});

autoUpdater.on('update-not-available', () => {
  sendUpdateStatus({ state: 'none' });
});

autoUpdater.on('download-progress', (progress) => {
  sendUpdateProgress({
    percent: progress.percent,
    transferred: progress.transferred,
    total: progress.total,
    bytesPerSecond: progress.bytesPerSecond,
  });
});

autoUpdater.on('update-downloaded', () => {
  sendUpdateStatus({ state: 'downloaded' });
});

autoUpdater.on('error', (error) => {
  sendUpdateStatus({ state: 'error', message: error?.message || 'Update error' });
});

ipcMain.handle('updates:check', async () => {
  try {
    await autoUpdater.checkForUpdates();
    return { ok: true };
  } catch (error) {
    return { ok: false, message: error?.message || 'Failed to check updates' };
  }
});

ipcMain.handle('updates:download', async () => {
  try {
    await autoUpdater.downloadUpdate();
    return { ok: true };
  } catch (error) {
    return { ok: false, message: error?.message || 'Failed to download update' };
  }
});

ipcMain.handle('updates:install', async () => {
  try {
    autoUpdater.quitAndInstall();
    return { ok: true };
  } catch (error) {
    return { ok: false, message: error?.message || 'Failed to install update' };
  }
});

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.on('window-all-closed', () => {
  if ((globalThis?.process?.platform) !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.whenReady().then(createWindow);
