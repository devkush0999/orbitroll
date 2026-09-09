'use client';
import { useCallback, useState } from 'react';
import { backend, result } from '../lib/supabase';
import { useLoad, useTask } from '../lib/hooks';
import { Confirm, Loading, Notice } from './ui';
type Action =
  | { kind: 'run'; id: string; hidden: boolean }
  | { kind: 'player'; username: string; excluded: boolean };
export function Moderation() {
  const [page, setPage] = useState(0),
    [username, setUsername] = useState(''),
    [action, setAction] = useState<Action | null>(null),
    [reason, setReason] = useState('');
  const data = useLoad(
    String(page),
    useCallback(
      () => result(backend().rpc('admin_overview', { p_offset: page * 25 })),
      [page],
    ),
  );
  const task = useTask();
  const choose = (next: Action) => {
    setAction(next);
    setReason('');
  };
  const valid = /^[a-z0-9_]{3,24}$/.test(username);
  return (
    <>
      <Loading {...data} />
      {data.data && (
        <>
          <div className="stats">
            <div className="panel stat">
              <strong>{data.data.players.toLocaleString()}</strong>
              <span>Registered pilots</span>
            </div>
            <div className="panel stat">
              <strong>{data.data.runs.toLocaleString()}</strong>
              <span>Verified runs</span>
            </div>
            <div className="panel stat">
              <strong>18</strong>
              <span>Ranked trails</span>
            </div>
          </div>
          <section className="panel">
            <div className="row">
              <h2>Player moderation</h2>
              <button onClick={data.reload}>Refresh records</button>
            </div>
            <label>
              Exact username
              <input
                value={username}
                onChange={(event) =>
                  setUsername(event.target.value.toLowerCase())
                }
                placeholder="pilot_username"
                maxLength={24}
              />
            </label>
            <div className="row">
              <p className="muted">
                Exclusion removes public rankings and blocks new ranked runs and
                invites.
              </p>
              <div className="row">
                <button
                  className="danger"
                  disabled={!valid}
                  onClick={() =>
                    choose({ kind: 'player', username, excluded: true })
                  }
                >
                  Review exclusion
                </button>
                <button
                  disabled={!valid}
                  onClick={() =>
                    choose({ kind: 'player', username, excluded: false })
                  }
                >
                  Review restoration
                </button>
              </div>
            </div>
          </section>
          <section className="stack">
            <div className="row">
              <h2>Recent verified runs</h2>
              <span className="muted">Page {page + 1}</span>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Pilot</th>
                    <th>Trail</th>
                    <th>Points</th>
                    <th>Moves / stars</th>
                    <th>Status</th>
                    <th>Review</th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.recent.map((run) => (
                    <tr key={run.id}>
                      <td>
                        {run.display_name}
                        <small>@{run.username}</small>
                      </td>
                      <td>{String(run.level_id).padStart(2, '0')}</td>
                      <td>{run.points.toLocaleString()}</td>
                      <td>
                        {run.moves} / {run.stars} ★
                      </td>
                      <td>
                        <span
                          className={`badge ${run.hidden || run.excluded ? 'hidden' : ''}`}
                        >
                          {run.hidden
                            ? 'Hidden'
                            : run.excluded
                              ? 'Player excluded'
                              : 'Verified'}
                        </span>
                      </td>
                      <td>
                        <button
                          onClick={() =>
                            choose({
                              kind: 'run',
                              id: run.id,
                              hidden: !run.hidden,
                            })
                          }
                        >
                          {run.hidden ? 'Restore' : 'Hide run'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!data.data.recent.length && (
                    <tr>
                      <td colSpan={6}>No runs on this page yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="row">
              <button
                disabled={!page}
                onClick={() => setPage((value) => value - 1)}
              >
                Previous
              </button>
              <button
                disabled={data.data.recent.length < 25 || page >= 400}
                onClick={() => setPage((value) => value + 1)}
              >
                Next
              </button>
            </div>
          </section>
          <section className="panel">
            <h2>Recent audit history</h2>
            {!data.data.audit.length && (
              <p className="muted">No moderation actions yet.</p>
            )}
            {data.data.audit.map((entry, index) => (
              <div className="audit" key={`${entry.created_at}:${index}`}>
                <div className="row">
                  <strong>{entry.action.replaceAll('_', ' ')}</strong>
                  <span className="muted">
                    {new Date(entry.created_at).toLocaleString()}
                  </span>
                </div>
                <code>{entry.target}</code>
                <p>{entry.reason}</p>
              </div>
            ))}
          </section>
        </>
      )}
      {action && (
        <Confirm
          title={
            action.kind === 'run'
              ? `${action.hidden ? 'Hide' : 'Restore'} this run?`
              : `${action.excluded ? 'Exclude' : 'Restore'} @${action.username}?`
          }
          onCancel={() => {
            if (!task.busy) setAction(null);
          }}
        >
          <p className="muted">
            This changes public rankings. The reason is saved in audit history.
          </p>
          <form
            className="stack"
            onSubmit={(event) => {
              event.preventDefault();
              void task.run(async () => {
                if (reason.trim().length < 5)
                  throw new Error('Give a reason of at least 5 characters.');
                if (action.kind === 'run')
                  await result(
                    backend().rpc('admin_moderate_run', {
                      p_run: action.id,
                      p_hidden: action.hidden,
                      p_reason: reason.trim(),
                    }),
                  );
                else
                  await result(
                    backend().rpc('admin_moderate_player', {
                      p_username: action.username,
                      p_excluded: action.excluded,
                      p_reason: reason.trim(),
                    }),
                  );
                setAction(null);
                data.reload();
              });
            }}
          >
            <label>
              Reason
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                minLength={5}
                maxLength={500}
                required
                rows={3}
              />
            </label>
            <Notice error>{task.error}</Notice>
            <div className="row">
              <button
                type="button"
                disabled={task.busy}
                onClick={() => setAction(null)}
              >
                Cancel
              </button>
              <button className="primary" disabled={task.busy}>
                {task.busy ? 'Applying…' : 'Confirm action'}
              </button>
            </div>
          </form>
        </Confirm>
      )}
    </>
  );
}
