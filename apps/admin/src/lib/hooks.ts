'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
export function useTask() {
  const lock = useRef(false),
    mounted = useRef(true);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const run = async (action: () => Promise<void>) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (error) {
      if (mounted.current)
        setError(
          error instanceof Error
            ? error.message
            : 'Request failed. Please retry.',
        );
    } finally {
      lock.current = false;
      if (mounted.current) setBusy(false);
    }
  };
  return { busy, error, run };
}
export function useLoad<T>(key: string, loader: () => Promise<T>) {
  const [version, setVersion] = useState(0);
  const [state, setState] = useState<{
    key: string;
    version: number;
    data: T | null;
    error: string;
  }>({ key: '', version: -1, data: null, error: '' });
  useEffect(() => {
    let alive = true;
    void loader().then(
      (data) => {
        if (alive) setState({ key, version, data, error: '' });
      },
      (error) => {
        if (alive)
          setState({
            key,
            version,
            data: null,
            error:
              error instanceof Error ? error.message : 'Could not load data.',
          });
      },
    );
    return () => {
      alive = false;
    };
  }, [key, version, loader]);
  const current = state.key === key && state.version === version;
  return {
    data: current ? state.data : null,
    error: current ? state.error : '',
    loading: !current,
    reload: useCallback(() => setVersion((value) => value + 1), []),
  };
}
