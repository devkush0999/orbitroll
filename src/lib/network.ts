// Bound online requests so failed connectivity cannot hold the upload worker.
export const timedFetch: typeof fetch = async (input, init) => {
  const controller = new AbortController();
  const originalSignal = init?.signal;
  const cancel = () => controller.abort();
  if (originalSignal?.aborted) cancel();
  originalSignal?.addEventListener('abort', cancel, { once: true });
  const timer = setTimeout(cancel, 20_000);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
    originalSignal?.removeEventListener('abort', cancel);
  }
};
