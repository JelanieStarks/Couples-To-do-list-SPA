const FLUSH_EVENT = 'couples:flush-drafts';
type FlushDetail = { waitUntil: (work: Promise<unknown>) => void };

export const registerDraftFlusher = (flush: () => void | Promise<unknown>) => {
  const listener = (event: Event) => {
    (event as CustomEvent<FlushDetail>).detail.waitUntil(Promise.resolve().then(flush));
  };
  window.addEventListener(FLUSH_EVENT, listener);
  return () => window.removeEventListener(FLUSH_EVENT, listener);
};

export const flushDrafts = async () => {
  const pending: Promise<unknown>[] = [];
  window.dispatchEvent(new CustomEvent<FlushDetail>(FLUSH_EVENT, { detail: { waitUntil: work => pending.push(work) } }));
  const results = await Promise.allSettled(pending);
  const failure = results.find((result): result is PromiseRejectedResult => result.status === 'rejected');
  if (failure) throw failure.reason;
};
