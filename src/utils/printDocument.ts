// Use the native desktop dialog or a temporary frame in the web app.
export async function printDocument(html: string): Promise<void> {
  if (window.appDocuments) {
    const result = await window.appDocuments.print(html);
    if (!result.ok && !result.canceled) throw new Error(result.message || 'Unable to print this document.');
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const frame = document.createElement('iframe');
    frame.title = 'Life Meeting print document';
    frame.setAttribute('aria-hidden', 'true');
    frame.style.cssText = 'position:fixed;bottom:0;left:0;width:1px;height:1px;border:0;';
    let cleanupTimer: ReturnType<typeof setTimeout>;
    const cleanup = () => {
      clearTimeout(cleanupTimer);
      frame.remove();
    };
    frame.onload = () => {
      try {
        const target = frame.contentWindow;
        if (!target) throw new Error('Unable to open the print document.');
        target.addEventListener('afterprint', cleanup, { once: true });
        // Some mobile browsers do not emit afterprint.
        cleanupTimer = setTimeout(cleanup, 60_000);
        target.focus();
        target.print();
        resolve();
      } catch (error) {
        cleanup();
        reject(error);
      }
    };
    frame.srcdoc = html;
    document.body.appendChild(frame);
  });
}
