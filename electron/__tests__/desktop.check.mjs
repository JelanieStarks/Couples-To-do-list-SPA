import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createPrintHandler } from '../printing.js';

const setupPrinter = ({ success = true, reason, loadError } = {}) => {
  const owner = { isDestroyed: () => false, webContents: { mainFrame: {} } };
  const windows = [];
  class PrintWindow {
    constructor(options) {
      this.options = options;
      this.destroyed = false;
      this.webContents = {
        setWindowOpenHandler: handler => { this.openHandler = handler; },
        on: () => {},
        print: (options, callback) => { this.printOptions = options; callback(success, reason); },
      };
      windows.push(this);
    }
    async loadURL(url) {
      this.url = url;
      if (loadError) throw new Error(loadError);
    }
    isDestroyed() { return this.destroyed; }
    destroy() { this.destroyed = true; }
  }
  return {
    windows,
    event: { sender: owner.webContents, senderFrame: owner.webContents.mainFrame },
    print: createPrintHandler({ BrowserWindow: PrintWindow, getMainWindow: () => owner }),
  };
};

test('sandboxed preload exposes callable update and printing APIs', async () => {
  const exposed = {};
  const calls = [];
  const listeners = {};
  const electron = {
    contextBridge: { exposeInMainWorld: (name, value) => { exposed[name] = value; } },
    ipcRenderer: {
      invoke: (...args) => { calls.push(args); return Promise.resolve({ ok: true }); },
      on: (name, listener) => { listeners[name] = listener; },
      removeAllListeners: name => { delete listeners[name]; },
    },
  };
  // Sandboxed preloads have require('electron'), but no ESM import context.
  vm.runInNewContext(readFileSync(new URL('../preload.cjs', import.meta.url), 'utf8'), {
    require: name => { assert.equal(name, 'electron'); return electron; },
  });
  await exposed.appUpdates.check();
  await exposed.appUpdates.download();
  await exposed.appUpdates.install();
  await exposed.appDocuments.print('<html>Our meeting</html>');
  assert.deepEqual(calls.map(args => Array.from(args)), [
    ['updates:check'], ['updates:download'], ['updates:install'],
    ['documents:print', '<html>Our meeting</html>'],
  ]);
  let received;
  exposed.appUpdates.onStatus(payload => { received = payload; });
  listeners['updates:status']({ sender: 'must stay private' }, { state: 'available' });
  assert.deepEqual(received, { state: 'available' });
  exposed.appUpdates.clearListeners();
  assert.equal(Object.keys(listeners).length, 0);
});

test('printing opens an isolated document and disposes it after the dialog', async () => {
  const { print, event, windows } = setupPrinter();
  assert.deepEqual(await print(event, '<html><body>Meeting notes</body></html>'), { ok: true });
  assert.equal(windows.length, 1);
  assert.equal(windows[0].options.webPreferences.javascript, false);
  assert.equal(windows[0].options.webPreferences.sandbox, true);
  assert.match(decodeURIComponent(windows[0].url), /default-src 'none'/);
  assert.match(decodeURIComponent(windows[0].url), /Meeting notes/);
  assert.deepEqual(windows[0].openHandler(), { action: 'deny' });
  assert.equal(windows[0].printOptions.silent, false);
  assert.equal(windows[0].destroyed, true);
});

test('printing rejects a different window, a subframe, or an invalid document', async () => {
  const { print, event, windows } = setupPrinter();
  for (const [caller, html] of [
    [{ ...event, sender: {} }, '<html>Notes</html>'],
    [{ ...event, senderFrame: {} }, '<html>Notes</html>'],
    [event, null], [event, ''], [event, 'x'.repeat(2_000_001)],
  ]) {
    assert.equal((await print(caller, html)).ok, false);
  }
  assert.equal(windows.length, 0);
});

test('a cancelled print is reported without leaking the hidden window', async () => {
  const { print, event, windows } = setupPrinter({ success: false, reason: 'Print job canceled' });
  assert.equal((await print(event, '<html>Notes</html>')).canceled, true);
  assert.equal(windows[0].destroyed, true);
});

test('a failed document load reports the error and cleans up', async () => {
  const { print, event, windows } = setupPrinter({ loadError: 'Unable to load notes' });
  assert.deepEqual(await print(event, '<html>Notes</html>'), { ok: false, message: 'Unable to load notes' });
  assert.equal(windows[0].destroyed, true);
});
