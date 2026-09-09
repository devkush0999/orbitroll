import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { AppState, Modal, Platform, View } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { mergeCloudResults, store, switchProgressOwner } from '@/store';
import { LoadingScreen } from '@/components/LoadingScreen';
import { flushRuns, queueRun } from './runQueue';
import type { Profile } from './types';
import type { Direction } from '../game/types';

type Community = {
  ready: boolean;
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  notice: string;
  refresh: () => Promise<void>;
  recordRun: (
    owner: string,
    level: number,
    directions: Direction[],
  ) => Promise<void>;
};
const Context = createContext<Community | null>(null);
export function useCommunity() {
  const context = useContext(Context);
  if (!context) throw new Error('CommunityProvider is missing');
  return context;
}
export function CommunityProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setAdmin] = useState(false);
  const [ready, setReady] = useState(!supabase);
  const [booted, setBooted] = useState(!supabase);
  const [notice, setNotice] = useState('');
  const owner = useRef<string | null>(null);
  const sequence = useRef(0);
  const initialized = useRef(false);
  const refresh = useCallback(async () => {
    const user = owner.current;
    if (!supabase || !user) return;
    const [profileResult, admin, results] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user).single(),
      supabase.rpc('is_admin'),
      supabase.rpc('my_results'),
    ]);
    if (owner.current !== user) return;
    if (profileResult.error || admin.error || results.error) {
      setNotice('Cloud data is unavailable. Check your connection and retry.');
      return;
    }
    setProfile(profileResult.data);
    setAdmin(admin.data === true);
    store.dispatch(mergeCloudResults(results.data ?? []));
  }, []);
  const sync = useCallback(
    async (user: string) => {
      try {
        const result = await flushRuns(user);
        if (owner.current !== user) return;
        setNotice(
          result.error ??
            (result.uploaded ? 'Your ranked runs are synced.' : ''),
        );
        await refresh();
      } catch {
        if (owner.current === user)
          setNotice('Could not sync runs. Retry from your pilot profile.');
      }
    },
    [refresh],
  );
  useEffect(() => {
    const client = supabase;
    if (!client) return;
    let alive = true;
    let authEventReceived = false;
    async function applySession(next: Session | null) {
      if (!alive) return;
      const user = next?.user.id ?? null;
      setSession(next);
      if (user === owner.current && initialized.current) return;
      initialized.current = true;
      const token = ++sequence.current;
      owner.current = user;
      setReady(false);
      setProfile(null);
      setAdmin(false);
      setNotice('');
      try {
        await switchProgressOwner(user);
      } catch {
        if (alive) setNotice('Local account records could not be loaded.');
      }
      if (!alive || token !== sequence.current) return;
      setReady(true);
      setBooted(true);
      if (user) {
        void refresh();
        void sync(user);
      }
    }
    // Defer work outside the auth callback: SDK methods can hold the auth lock.
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, next) => {
      authEventReceived = true;
      setTimeout(() => {
        void applySession(next);
      }, 0);
    });
    void client.auth
      .getSession()
      .then(({ data, error }) => {
        if (!authEventReceived) void applySession(data.session);
        if (error && alive)
          setNotice('Sign in again to reconnect your account.');
      })
      .catch(() => {
        if (!authEventReceived) void applySession(null);
      });
    const appState = AppState.addEventListener('change', (state) => {
      if (Platform.OS !== 'web') {
        if (state === 'active') client.auth.startAutoRefresh();
        else client.auth.stopAutoRefresh();
      }
      if (state === 'active' && owner.current) void sync(owner.current);
    });
    if (Platform.OS !== 'web' && AppState.currentState === 'active')
      client.auth.startAutoRefresh();
    return () => {
      alive = false;
      subscription.unsubscribe();
      appState.remove();
      if (Platform.OS !== 'web') client.auth.stopAutoRefresh();
    };
  }, [refresh, sync]);
  const recordRun = useCallback(
    async (user: string, level: number, directions: Direction[]) => {
      if (owner.current !== user) return;
      try {
        await queueRun(user, level, directions);
        if (owner.current === user) {
          setNotice('Run saved. Uploading your score…');
          void sync(user);
        }
      } catch (error) {
        if (owner.current === user)
          setNotice(
            error instanceof Error
              ? error.message
              : 'Could not save your ranked run.',
          );
      }
    },
    [sync],
  );
  return (
    <Context.Provider
      value={{ ready, session, profile, isAdmin, notice, refresh, recordRun }}
    >
      {booted ? (
        <View style={{ flex: 1 }}>
          {children}
          <Modal
            visible={!ready}
            animationType="none"
            onRequestClose={() => {}}
          >
            <LoadingScreen message="Opening your pilot profile…" />
          </Modal>
        </View>
      ) : (
        <LoadingScreen message="Opening your pilot profile…" />
      )}
    </Context.Provider>
  );
}
