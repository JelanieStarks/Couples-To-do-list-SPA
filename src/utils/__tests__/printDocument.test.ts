import { afterEach, describe, expect, it, vi } from 'vitest';
import { printDocument } from '../printDocument';

afterEach(() => {
  delete window.appDocuments;
  document.querySelectorAll('iframe').forEach(frame => frame.remove());
  vi.restoreAllMocks();
});

describe('printDocument', () => {
  it('uses the desktop bridge without opening a browser popup', async () => {
    const print = vi.fn().mockResolvedValue({ ok: true });
    window.appDocuments = { print };
    const open = vi.spyOn(window, 'open');
    await printDocument('<html>Our meeting</html>');
    expect(print).toHaveBeenCalledWith('<html>Our meeting</html>');
    expect(open).not.toHaveBeenCalled();
    expect(document.querySelector('iframe')).toBeNull();
  });

  it('treats cancellation as normal and surfaces printing failures', async () => {
    window.appDocuments = { print: vi.fn().mockResolvedValue({ ok: false, canceled: true }) };
    await expect(printDocument('<html>Notes</html>')).resolves.toBeUndefined();
    window.appDocuments.print = vi.fn().mockResolvedValue({ ok: false, message: 'Printer unavailable' });
    await expect(printDocument('<html>Notes</html>')).rejects.toThrow('Printer unavailable');
  });

  it('prints a dedicated browser document and removes it after printing', async () => {
    const pending = printDocument('<html><body>Our meeting</body></html>');
    const frame = document.querySelector('iframe')!;
    const target = frame.contentWindow!;
    vi.spyOn(target, 'focus').mockImplementation(() => {});
    const print = vi.spyOn(target, 'print').mockImplementation(() => {});
    expect(frame.srcdoc).toContain('Our meeting');
    frame.dispatchEvent(new Event('load'));
    await pending;
    expect(print).toHaveBeenCalledOnce();
    target.dispatchEvent(new Event('afterprint'));
    expect(document.querySelector('iframe')).toBeNull();
  });
});
