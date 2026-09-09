'use client';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import { backend, client, result } from '../lib/supabase';
import { useLoad, useTask } from '../lib/hooks';
import { Loading, Notice } from './ui';
import { Moderation } from './Moderation';
import { MediaLibrary } from './MediaLibrary';
import { useAdminTools } from '../lib/webmcp';

function Login() {
  const [email, setEmail] = useState(''),
    [sent, setSent] = useState(''),
    [code, setCode] = useState(''),
    [cooldown, setCooldown] = useState(0);
  const task = useTask();
  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);
  const send = () =>
    task.run(async () => {
      const address = email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address))
        throw new Error('Enter a valid email address.');
      const { error } = await backend().auth.signInWithOtp({
        email: address,
        options: { shouldCreateUser: false },
      });
      if (error)
        throw new Error(
          'Could not send a code. Check that this account exists, then retry shortly.',
        );
      setSent(address);
      setCooldown(60);
      setCode('');
    });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!sent) {
      void send();
      return;
    }
    void task.run(async () => {
      const { error } = await backend().auth.verifyOtp({
        email: sent,
        token: code,
        type: 'email',
      });
      if (error)
        throw new Error('This code is invalid or expired. Request a new code.');
    });
  };
  return (
    <main className="login">
      <form className="panel" onSubmit={submit}>
        <div className="brand">
          orbit roll<span>.</span>
        </div>
        <div>
          <p className="eyebrow">Administration</p>
          <h1>Mission control</h1>
        </div>
        <p className="muted">
          Sign in with your administrator account. Access is checked against
          your Supabase role.
        </p>
        {!client ? (
          <Notice error>
            Supabase is not configured for this admin build. Add the two
            NEXT_PUBLIC_SUPABASE variables and rebuild.
          </Notice>
        ) : (
          <>
            {sent ? (
              <>
                <p className="muted">Code sent to {sent}</p>
                <label>
                  Email code
                  <input
                    value={code}
                    onChange={(event) =>
                      setCode(event.target.value.replace(/\D/g, ''))
                    }
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6,8}"
                    maxLength={8}
                    required
                    disabled={task.busy}
                  />
                </label>
              </>
            ) : (
              <label>
                Email
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  maxLength={254}
                  required
                  disabled={task.busy}
                />
              </label>
            )}
            <Notice error>{task.error}</Notice>
            <button className="primary" disabled={task.busy}>
              {task.busy
                ? 'Please wait…'
                : sent
                  ? 'Verify code'
                  : 'Send sign-in code'}
            </button>
            {sent && (
              <>
                <button
                  type="button"
                  disabled={task.busy || cooldown > 0}
                  onClick={() => void send()}
                >
                  {cooldown ? `Resend in ${cooldown}s` : 'Resend code'}
                </button>
                <button
                  type="button"
                  className="text-link"
                  onClick={() => setSent('')}
                >
                  Use another email
                </button>
              </>
            )}
          </>
        )}
      </form>
    </main>
  );
}
function AuthorizedApp({ session }: { session: Session }) {
  const [tab, setTab] = useState<'runs' | 'media' | 'budget'>('runs');
  const access = useLoad(
    session.user.id,
    useCallback(() => result(backend().rpc('is_admin')), []),
  );
  useAdminTools(access.data === true);
  const task = useTask();
  const signOut = () =>
    void task.run(async () => {
      const { error } = await backend().auth.signOut({ scope: 'local' });
      if (error) throw new Error('Could not sign out. Try again.');
    });
  if (access.loading || access.error || !access.data)
    return (
      <main className="login">
        <div className="panel">
          <div className="brand">
            orbit roll<span>.</span>
          </div>
          <Loading {...access} />
          {!access.loading && !access.error && (
            <>
              <h1>Admin access required</h1>
              <p className="muted">
                This account has not been assigned an administrator role. Ask
                the project owner to provision it in Supabase.
              </p>
              <button onClick={access.reload}>Check access again</button>
            </>
          )}
          <Notice error>{task.error}</Notice>
          <button disabled={task.busy} onClick={signOut}>
            Sign out
          </button>
        </div>
      </main>
    );
  return (
    <div className="shell">
      <aside className="sidebar">
        <div>
          <div className="brand">
            orbit roll<span>.</span>
          </div>
          <p className="eyebrow">Mission control</p>
        </div>
        <nav aria-label="Admin sections">
          {(
            [
              ['runs', 'Players & runs'],
              ['media', 'Media library'],
              ['budget', 'Launch budget'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              aria-current={tab === id ? 'page' : undefined}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </nav>
        <footer>
          <span>{session.user.email}</span>
          <span>Administrator</span>
          <button disabled={task.busy} onClick={signOut}>
            Sign out
          </button>
        </footer>
      </aside>
      <main className="workspace">
        <header className="row">
          <div>
            <p className="eyebrow">Orbit Roll / administration</p>
            <h1>
              {tab === 'runs'
                ? 'Players & runs'
                : tab === 'media'
                  ? 'Media library'
                  : 'Launch budget'}
            </h1>
          </div>
          <button disabled={task.busy} onClick={signOut}>
            Sign out
          </button>
        </header>
        <Notice error>{task.error}</Notice>
        {tab === 'runs' ? (
          <Moderation />
        ) : tab === 'media' ? (
          <MediaLibrary userId={session.user.id} />
        ) : (
          <Budget />
        )}
      </main>
    </div>
  );
}
function Budget() {
  return (
    <>
      <div className="panel">
        <h2>Start small. Measure the usage.</h2>
        <p className="muted">
          Downloads are a growth milestone. Database size, active players, media
          storage, and delivery bandwidth determine when the free plans stop
          fitting.
        </p>
        <div className="split">
          <div className="stack">
            <h3>Controls in this build</h3>
            <ul>
              <li>Images: 2 MB maximum.</li>
              <li>Videos: 10 MB and 30 seconds maximum.</li>
              <li>
                5 upload reservations per admin per hour; 20 globally per day.
              </li>
              <li>
                200 MB registered media budget before new reservations stop.
              </li>
              <li>Drafts require explicit publication.</li>
              <li>
                Images use two bounded delivery sizes. Videos never autoplay.
              </li>
            </ul>
          </div>
          <div className="stack">
            <h3>Check weekly</h3>
            <p className="muted">
              Review actual usage in Supabase and Cloudinary dashboards. Aim to
              review your plan at 70–80% of any quota, before players hit the
              limit.
            </p>
            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noreferrer"
            >
              Open Supabase usage ↗
            </a>
            <a
              href="https://console.cloudinary.com/"
              target="_blank"
              rel="noreferrer"
            >
              Open Cloudinary usage ↗
            </a>
          </div>
        </div>
      </div>
      <div className="panel">
        <h2>Keep gameplay offline-friendly</h2>
        <p className="muted">
          The cube, paths, backgrounds, and Lottie celebrations stay bundled
          with the Expo game. Cloudinary is for optional published artwork and
          short clips. Upload limits help control ingestion; they cannot cap
          public CDN views or guarantee a zero bill.
        </p>
      </div>
    </>
  );
}
export function AdminApp() {
  const [auth, setAuth] = useState<{ ready: boolean; session: Session | null }>(
    { ready: !client, session: null },
  );
  useEffect(() => {
    if (!client) return;
    let alive = true,
      received = false;
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      received = true;
      if (alive) setAuth({ ready: true, session });
    });
    void client.auth
      .getSession()
      .then(({ data }) => {
        if (alive && !received) setAuth({ ready: true, session: data.session });
      })
      .catch(() => {
        if (alive && !received) setAuth({ ready: true, session: null });
      });
    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, []);
  if (!auth.ready)
    return (
      <main className="login">
        <p role="status">Opening mission control…</p>
      </main>
    );
  return auth.session ? (
    <AuthorizedApp key={auth.session.user.id} session={auth.session} />
  ) : (
    <Login />
  );
}
