'use client';
import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import { backend, result } from '../lib/supabase';
import { useLoad, useTask } from '../lib/hooks';
import { finalizeUpload, reserveUpload, uploadFile } from '../lib/media';
import {
  imageDeliveryUrl,
  MEDIA_LIMITS,
  type MediaAsset,
} from '../../../../shared/media';
import { Confirm, Loading, Notice } from './ui';
export function MediaLibrary({ userId }: { userId: string }) {
  const [page, setPage] = useState(0),
    [title, setTitle] = useState(''),
    [kind, setKind] = useState<'image' | 'video'>('image'),
    [file, setFile] = useState<File | null>(null),
    [progress, setProgress] = useState(0),
    [message, setMessage] = useState(''),
    [ticket, setTicket] = useState(''),
    [recovery, setRecovery] = useState(''),
    [inputKey, setInputKey] = useState(0);
  const [selected, setSelected] = useState<MediaAsset | null>(null),
    [reason, setReason] = useState('');
  const storageKey = `orbit-roll:media-ticket:${userId}`;
  const data = useLoad(
    `${userId}:${page}`,
    useCallback(
      () =>
        result(backend().rpc('admin_media_library', { p_offset: page * 24 })),
      [page],
    ),
  );
  const task = useTask();
  useEffect(() => {
    const saved = sessionStorage.getItem(storageKey);
    if (saved && /^[a-f0-9-]{36}$/.test(saved)) {
      queueMicrotask(() => setTicket(saved));
    }
  }, [storageKey]);
  const verified = async (id: string) => {
    await finalizeUpload(id);
    sessionStorage.removeItem(storageKey);
    setTicket('');
    setFile(null);
    setTitle('');
    setInputKey((value) => value + 1);
    setMessage(
      'Upload verified and saved as a draft. Review it below before publishing.',
    );
    data.reload();
  };
  return (
    <>
      <Notice>{message}</Notice>
      <Notice error>{task.error}</Notice>
      <section className="panel">
        <div className="row">
          <h2>Upload to Cloudinary</h2>
          <span className="badge">Admin uploads only</span>
        </div>
        <p className="muted">
          Images: JPG, PNG, WebP up to 2 MB. Videos: MP4 or WebM up to 10 MB and
          30 seconds. Maximum dimensions: 4096 × 4096.
        </p>
        <form
          className="stack"
          onSubmit={(event) => {
            event.preventDefault();
            void task.run(async () => {
              if (!file) throw new Error('Choose a file.');
              if (file.size > MEDIA_LIMITS[kind] || file.size === 0)
                throw new Error(
                  'The file exceeds this media type’s size limit.',
                );
              const allowed =
                kind === 'image'
                  ? ['image/jpeg', 'image/png', 'image/webp']
                  : ['video/mp4', 'video/webm'];
              if (!allowed.includes(file.type))
                throw new Error('Choose a supported file format.');
              setMessage('');
              setProgress(0);
              const signed = await reserveUpload(kind, title.trim());
              setTicket(signed.ticketId);
              sessionStorage.setItem(storageKey, signed.ticketId);
              await uploadFile(signed, file, setProgress);
              await verified(signed.ticketId);
            });
          }}
        >
          <div className="form-grid">
            <label>
              Title
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={80}
                required
                disabled={task.busy}
              />
            </label>
            <label>
              Media type
              <select
                value={kind}
                onChange={(event) => {
                  setKind(event.target.value as 'image' | 'video');
                  setFile(null);
                  setInputKey((value) => value + 1);
                }}
                disabled={task.busy}
              >
                <option value="image">Image</option>
                <option value="video">Short video</option>
              </select>
            </label>
          </div>
          <label>
            File
            <input
              key={inputKey}
              type="file"
              accept={
                kind === 'image'
                  ? 'image/jpeg,image/png,image/webp'
                  : 'video/mp4,video/webm'
              }
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              disabled={task.busy}
              required
            />
          </label>
          {task.busy && (
            <label>
              Upload progress: {progress}%
              <progress value={progress} max={100} />
            </label>
          )}
          <button className="primary" disabled={task.busy || !file || !!ticket}>
            {task.busy ? 'Uploading / verifying…' : 'Upload as draft'}
          </button>
        </form>
        {!!ticket && (
          <div className="stack budget">
            <p>
              Upload ticket: <code>{ticket}</code>
            </p>
            <p className="muted">
              If the upload finished but verification was interrupted, retry
              verification. The same file will not be uploaded twice.
            </p>
            <div className="row">
              <button
                disabled={task.busy}
                onClick={() => void task.run(() => verified(ticket))}
              >
                Retry verification
              </button>
              <button
                disabled={task.busy}
                onClick={() => {
                  sessionStorage.removeItem(storageKey);
                  setTicket('');
                  setMessage(
                    'Ticket dismissed. Check Cloudinary for an orphaned file before uploading again; dismissing does not delete cloud storage.',
                  );
                }}
              >
                Dismiss ticket
              </button>
            </div>
          </div>
        )}
        <details>
          <summary>Recover an upload from another session</summary>
          <div className="stack">
            <label>
              Upload ticket ID
              <input
                value={recovery}
                onChange={(event) => setRecovery(event.target.value.trim())}
                maxLength={36}
              />
            </label>
            <button
              disabled={task.busy || !/^[a-f0-9-]{36}$/.test(recovery)}
              onClick={() => void task.run(() => verified(recovery))}
            >
              Verify existing upload
            </button>
            <p className="muted">
              Tickets belong to the uploading admin and expire after 24 hours.
            </p>
          </div>
        </details>
      </section>
      <Loading {...data} />
      {data.data && (
        <>
          <div className="row">
            <h2>Library</h2>
            <button onClick={data.reload}>Refresh library</button>
          </div>
          {!data.data.length && (
            <div className="panel">
              <p className="muted">
                No media on this page. New uploads appear as drafts.
              </p>
            </div>
          )}
          <div className="media-grid">
            {data.data.map((asset) => {
              const url = imageDeliveryUrl(asset, 320);
              return (
                <article key={asset.id} className="media-card">
                  {url &&
                    (asset.kind === 'image' ? (
                      <Image
                        className="media-preview"
                        src={url}
                        alt={asset.title}
                        loading="lazy"
                        width={640}
                        height={360}
                      />
                    ) : (
                      <video
                        className="media-preview"
                        src={url}
                        controls
                        preload="none"
                        aria-label={asset.title}
                      />
                    ))}
                  <div className="media-details">
                    <div className="row">
                      <h3>{asset.title}</h3>
                      <span className="badge">
                        {asset.published ? 'Published' : 'Draft'}
                      </span>
                    </div>
                    <p className="muted">
                      {asset.kind} · {(asset.bytes / 1048576).toFixed(2)} MB
                      {asset.duration
                        ? ` · ${Math.round(asset.duration)}s`
                        : ''}
                    </p>
                    <button
                      disabled={task.busy}
                      onClick={() => {
                        setSelected(asset);
                        setReason('');
                      }}
                    >
                      {asset.published ? 'Unpublish' : 'Review & publish'}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
          <div className="row">
            <button
              disabled={!page}
              onClick={() => setPage((value) => value - 1)}
            >
              Previous
            </button>
            <button
              disabled={data.data.length < 24 || page >= 100}
              onClick={() => setPage((value) => value + 1)}
            >
              Next
            </button>
          </div>
        </>
      )}
      {selected && (
        <Confirm
          title={
            selected.published ? 'Unpublish this media?' : 'Publish this media?'
          }
          onCancel={() => {
            if (!task.busy) setSelected(null);
          }}
        >
          <p>{selected.title}</p>
          <p className="muted">
            Published files appear in the app’s media gallery. Unpublishing
            removes the listing; Cloudinary delivery URLs remain public and the
            file still consumes storage.
          </p>
          <form
            className="stack"
            onSubmit={(event) => {
              event.preventDefault();
              void task.run(async () => {
                if (reason.trim().length < 5)
                  throw new Error('Give a reason of at least 5 characters.');
                await result(
                  backend().rpc('admin_publish_media', {
                    p_id: selected.id,
                    p_published: !selected.published,
                    p_reason: reason.trim(),
                  }),
                );
                setSelected(null);
                data.reload();
              });
            }}
          >
            <label>
              Publication note
              <textarea
                minLength={5}
                maxLength={500}
                required
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={3}
              />
            </label>
            <Notice error>{task.error}</Notice>
            <div className="row">
              <button
                type="button"
                disabled={task.busy}
                onClick={() => setSelected(null)}
              >
                Cancel
              </button>
              <button className="primary" disabled={task.busy}>
                Confirm
              </button>
            </div>
          </form>
        </Confirm>
      )}
    </>
  );
}
