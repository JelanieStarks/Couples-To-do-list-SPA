// Print only the supplied document, without opening arbitrary renderer popups.
export const createPrintHandler = ({ BrowserWindow, getMainWindow }) => async (event, html) => {
  const owner = getMainWindow();
  if (!owner || owner.isDestroyed() || event.sender !== owner.webContents
    || event.senderFrame !== owner.webContents.mainFrame) {
    return { ok: false, message: 'Printing is only available from the app window.' };
  }
  if (typeof html !== 'string' || !html.trim() || html.length > 2_000_000) {
    return { ok: false, message: 'The document is empty or too large to print.' };
  }

  const printWindow = new BrowserWindow({
    show: false,
    parent: owner,
    webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false, javascript: false },
  });
  printWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  printWindow.webContents.on('will-navigate', event => event.preventDefault());
  // Printed notes cannot run scripts or load remote content.
  const policy = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'">`;
  try {
    await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(policy + html)}`);
    return await new Promise(resolve => {
      printWindow.webContents.print({ silent: false, printBackground: true }, (success, reason) => {
        resolve(success ? { ok: true } : {
          ok: false,
          canceled: /cancel/i.test(reason || ''),
          message: reason || 'Unable to print this document.',
        });
      });
    });
  } catch (error) {
    return { ok: false, message: error?.message || 'Unable to print this document.' };
  } finally {
    if (!printWindow.isDestroyed()) printWindow.destroy();
  }
};
