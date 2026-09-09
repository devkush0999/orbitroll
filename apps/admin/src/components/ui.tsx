'use client';
import { useEffect, useRef, type ReactNode } from 'react';
export function Notice({
  children,
  error = false,
}: {
  children: ReactNode;
  error?: boolean;
}) {
  return children ? (
    <div
      className={`notice ${error ? 'error' : ''}`}
      role={error ? 'alert' : 'status'}
    >
      {children}
    </div>
  ) : null;
}
export function Loading({
  loading,
  error,
  reload,
}: {
  loading: boolean;
  error: string;
  reload: () => void;
}) {
  return loading ? (
    <p role="status" className="muted">
      Loading…
    </p>
  ) : error ? (
    <div className="stack">
      <Notice error>{error}</Notice>
      <button onClick={reload}>Retry</button>
    </div>
  ) : null;
}
export function Confirm({
  title,
  children,
  onCancel,
}: {
  title: string;
  children: ReactNode;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className="panel dialog"
      onCancel={onCancel}
      aria-labelledby="confirmation-title"
    >
      <h2 id="confirmation-title">{title}</h2>
      {children}
    </dialog>
  );
}
